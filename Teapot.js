/**
* @author William Sun (wsun26)
*
* Date Modified: 4/18/2017
This code was modified from the original lecture code to use 2 different
shaders for the teapot and cube respectively.
**/

var gl;
var canvas;
var shaderProgram;
var skyboxShader;

// for the skybox
var vertexPositionBuffer;
var vertexFaceBuffer;
var vertexNormalBuffer;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;
var cubeTCoordBuffer1;
var cubeTCoordBuffer2;
var cubeTCoordBuffer3;
var cubeTCoordBuffer4;
var cubeTCoordBuffer5;

// Create a place to store terrain geometry
var cubeVertexBuffer;
var cubeVertexBuffer1;
var cubeVertexBuffer2;
var cubeVertexBuffer3;
var cubeVertexBuffer4;
var cubeVertexBuffer5;

var cubeTriIndexBuffer;         // Create a place to store the triangles

var mvMatrix = mat4.create();   // Create ModelView matrix
var pMatrix = mat4.create();    //Create Projection matrix
var nMatrix = mat3.create();    // Create the normal

var mvMatrixStack = [];

// 6 image storage
var cubeImage;
var cubeImage1;
var cubeImage2;
var cubeImage3;
var cubeImage4;
var cubeImage5;

// 6 texture faces
var cubeTexture;
var cubeTexture1;
var cubeTexture2;
var cubeTexture3;
var cubeTexture4;
var cubeTexture5;

// create a texture for the teapot
var teapotTexture;
var teapotVertices = [];
var teapotFaces = [];
var teapotNormals = [];

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,70.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

var reflectionMatrix = mat4.create(); 
var rotateCubeY = 0;                        // rotate the environment
var rotateTeapotY = 0;                      // rotate the teapot

//var for init rotation and multi-key presses
var initFlag = 0; 
var currentlyPressedKeys = {};

//var for reflection rotation
var scale = 10;
var rightRot = 0; 
var leftRot = 0; 

/**
 * Pushes matrix onto modelview matrix stack
 * @param {}
 * @return {}
 */
function mvPushMatrix()
{
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

/**
 * Pops matrix off of modelview matrix stack
 * @param {}
 * @return {}
 */
function mvPopMatrix()
{
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value)
{
  return (value & (value - 1)) == 0;
}

/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
function handleTextureLoaded(image, texture)
{
  // console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
* Sends light information to the shader
* @param {Float32Array} loc Location of light source
* @param {Float32Array} a Ambient light strength
* @param {Float32Array} d Diffuse light strength
* @param {Float32Array} s Specular light strength
*/
function uploadLightsToShader(loc,a,d,s)
{
    gl.useProgram(shaderProgram);
	gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
	gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
	gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
	gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
 * Sends Modelview matrix to shader
 * @param {}
 * @return {}
 */
function uploadModelViewMatrixToShader()
{
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Sends projection matrix to shader
 * @param {}
 * @return {}
 */
function uploadProjectionMatrixToShader()
{
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

/**
  * Generates and sends the normal matrix to the shader
  * @param {}
  * @return {}
  */
function uploadNormalMatrixToShader()
{
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * Sends Modelview matrix to shader, for the skybox
 * @param {}
 * @return {}
 */
function uploadModelViewMatrixToShaderSkybox()
{
  gl.uniformMatrix4fv(skyboxShader.mvMatrixUniform, false, mvMatrix);
}

/**
 * Sends projection matrix to shader, for the skybox
 * @param {}
 * @return {}
 */
function uploadProjectionMatrixToShaderSkybox()
{
  gl.uniformMatrix4fv(skyboxShader.pMatrixUniform,
                      false, pMatrix);
}


/**
  * Generates and sends the normal matrix to the shader
  * @param {}
  * @return {}
  */
function uploadNormalMatrixToShaderSkybox()
{
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(skyboxShader.nMatrixUniform, false, nMatrix);
}

/**
* uploads the reflection texture
*/
function uploadReflectMatrix()
{
    gl.uniformMatrix4fv(shaderProgram.reflectTheMatrix, false, reflectionMatrix);
}

/**
 * Sends projection/modelview matrices to shader, for the teapot
 * @param {}
 * @return {}
 */
function setMatrixUniforms()
{
    gl.useProgram(shaderProgram);
    uploadModelViewMatrixToShader();
    uploadProjectionMatrixToShader();
    uploadNormalMatrixToShader();
    uploadReflectMatrix(); 
}

/**
 * Sends projection/modelview matrices to shader, for the skybox
 * @param {}
 * @return {}
 */
function setMatrixUniformsSkybox()
{
    gl.useProgram(skyboxShader);
    uploadModelViewMatrixToShaderSkybox();
    uploadProjectionMatrixToShaderSkybox();
    uploadNormalMatrixToShaderSkybox();
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees)
{
        return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas)
{
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id)
{
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/**
 * Setup the fragment and vertex shaders, for the teapot
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function setupShadersTeapot()
{
    // determine which shader program to use
    if(document.getElementById("blinn-phong").checked)
    {
        vertexShader = loadShaderFromDOM("shader-vs");
        fragmentShader = loadShaderFromDOM("shader-fs");
    }

    else
    {
        vertexShader = loadShaderFromDOM("shader-reflectVs");
        fragmentShader = loadShaderFromDOM("shader-reflectFs");
    }

    // shader program setup
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
    }

    // send in needed variables to shader
    gl.useProgram(shaderProgram);
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    // needed for the teapot shading
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");

    shaderProgram.reflectTheMatrix = gl.getUniformLocation(shaderProgram, "reflectMat");

}

/**
 * Setup the fragment and vertex shaders for the skybox
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function setupShadersSkybox()
{
    // we are shading the skybox now
    vertexShader1 = loadShaderFromDOM("shader-boxvs");
    fragmentShader1 = loadShaderFromDOM("shader-boxfs");

    skyboxShader = gl.createProgram();
    gl.attachShader(skyboxShader, vertexShader1);
    gl.attachShader(skyboxShader, fragmentShader1);
    gl.linkProgram(skyboxShader);

    if (!gl.getProgramParameter(skyboxShader, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
    }

    gl.useProgram(skyboxShader);

    // for the tex program
    skyboxShader.texCoordAttribute = gl.getAttribLocation(skyboxShader, "aTexCoord");
    gl.enableVertexAttribArray(skyboxShader.texCoordAttribute);

    skyboxShader.vertexPositionAttribute = gl.getAttribLocation(skyboxShader, "aVertexPosition");
    gl.enableVertexAttribArray(skyboxShader.vertexPositionAttribute);

    skyboxShader.mvMatrixUniform = gl.getUniformLocation(skyboxShader, "uMVMatrix");
    skyboxShader.pMatrixUniform = gl.getUniformLocation(skyboxShader, "uPMatrix");
}

/**
 * Creates texture for application to cube.
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function setupTextures()
{
    cubeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    cubeImage = new Image();
    cubeImage.onload = function() { handleTextureLoaded(cubeImage, cubeTexture); }
    cubeImage.src = "pos-z.png";

    // second face
    cubeTexture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture1);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    cubeImage1 = new Image();
    cubeImage1.onload = function() { handleTextureLoaded(cubeImage1, cubeTexture1); }
    cubeImage1.src = "neg-z.png";

    // third face
    cubeTexture2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture2);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    cubeImage2 = new Image();
    cubeImage2.onload = function() { handleTextureLoaded(cubeImage2, cubeTexture2); }
    cubeImage2.src = "pos-y.png";


    // forth face
    cubeTexture3 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture3);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    cubeImage3 = new Image();
    cubeImage3.onload = function() { handleTextureLoaded(cubeImage3, cubeTexture3); }
    cubeImage3.src = "neg-y.png";


    // fifth face
    cubeTexture4 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture4);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    cubeImage4 = new Image();
    cubeImage4.onload = function() { handleTextureLoaded(cubeImage4, cubeTexture4); }
    cubeImage4.src = "neg-x.png";

    // sixth sqaure
    cubeTexture5 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture5);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    cubeImage5 = new Image();
    cubeImage5.onload = function() { handleTextureLoaded(cubeImage5, cubeTexture5); }
    cubeImage5.src = "pos-x.png";

}

/**
 * Populate buffers for teapot
 * @param
 * @return
 */
function setupBuffersTeapot()
{
    vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotVertices), gl.STATIC_DRAW);
    vertexPositionBuffer.itemSize = 3;
    vertexPositionBuffer.numberOfItems = teapotVertices.length/3;

    // Specify normals to be able to do lighting calculations
    vertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotNormals),
                  gl.STATIC_DRAW);
    vertexNormalBuffer.itemSize = 3;
    vertexNormalBuffer.numItems = teapotNormals.length;

    // faces
    vertexFaceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexFaceBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(teapotFaces), gl.STATIC_DRAW);
    vertexFaceBuffer.itemSize = 1;
    vertexFaceBuffer.numItems = teapotFaces.length;
}

/**
 * Populate buffers with data
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
function setupBuffersCube()
{
    // Create a buffer for the cube's vertices.
    cubeVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    var vertices =
    [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeTCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);

    var textureCoordinates = [
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

    cubeTriIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
    var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3    // front

    ]
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

    // Second side
    cubeVertexBuffer1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer1);
    var vertices1 =
    [
      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices1), gl.STATIC_DRAW);
    cubeTCoordBuffer1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer1);

    var textureCoordinates1 =
    [
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates1), gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);


    // Third side
    cubeVertexBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer2);

    var vertices2 =
    [
      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices2), gl.STATIC_DRAW);
    cubeTCoordBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer2);

    var textureCoordinates2 =
    [
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates2), gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

    // Fourth side
    cubeVertexBuffer3 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer3);
    var vertices3 =
    [
      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices3), gl.STATIC_DRAW);
    cubeTCoordBuffer3 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer3);

    var textureCoordinates3 =
    [
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates3), gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

    // Fifth side
    cubeVertexBuffer4 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer4);
    var vertices4 =
    [
      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices4), gl.STATIC_DRAW);
    cubeTCoordBuffer4 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer4);

    var textureCoordinates4 =
    [
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates4), gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

    // Sixth side
    cubeVertexBuffer5 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer5);
    var vertices5 =
    [
      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices5), gl.STATIC_DRAW);
    cubeTCoordBuffer5 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer5);

    var textureCoordinates5 =
    [
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates5), gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}

/**
* loads images onto texture
* @param
* @return
*/
function setupCubeMap()
{
	teapotTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, teapotTexture);
	gl.texImage2D(gl.TEXTURE_CUBE_MAP, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, teapotTexture, "pos-x1.png");  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, teapotTexture, "neg-x1.png");
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, teapotTexture, "pos-y1.png");  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, teapotTexture, "neg-y1.png");  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, teapotTexture, "neg-z1.png");  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, teapotTexture, "pos-z1.png");

}

/**
 * Startup function called from html code to start program.
 * @param {Object}
 * @param {Object}
 */
 function startup()
 {
    canvas = document.getElementById("myGLCanvas");
    //window.addEventListener( 'keydown', onKeyDown, false );
    gl = createGLContext(canvas);
    gl.enable(gl.DEPTH_TEST);
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    readTextFile("teapot_0.obj", loadObjMesh);
}

/**
 * Tick called for every animation frame.
 * @param {Object}
 * @param {Object}
 */
function tick()
{
    requestAnimFrame(tick);
    handleKeys(); 
    setupShadersTeapot();      
    drawTeapot();
}

/**
 * Function draws teapot and surrounding skybox
 * @param
 */
function drawTeapot()
{
    var transformVec = vec3.create();
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // // We'll use perspective
    mat4.perspective(pMatrix,degToRad(90), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
    vec3.add(viewPt, eyePt, viewDir);
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, teapotTexture);

    gl.uniform1i(gl.getUniformLocation(shaderProgram, "uCubeSampler"), 1);

    mvPushMatrix();
    gl.enableVertexAttribArray(shaderProgram.aVertexTextureCoords);

    if(initFlag == 0)
    {
        mat4.rotateY(reflectionMatrix, reflectionMatrix, degToRad(180));
        initFlag = 1;

    }
    if(rightRot == 1){
        mat4.rotateY(reflectionMatrix, reflectionMatrix, degToRad(1.5));
        rightRot = 0; 
    }
    if(leftRot == 1){
        mat4.rotateY(reflectionMatrix, reflectionMatrix, degToRad(-1.5)); 
        leftRot = 0; 
    }
    
    //Draw
    mvPushMatrix();
    vec3.set(transformVec,0.0, -25.0, 0.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    vec3.set(transformVec, scale, scale, scale);
    mat4.scale(mvMatrix,mvMatrix, transformVec);
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotateTeapotY));

    setMatrixUniforms();
    mvPopMatrix();

    uploadLightsToShader([0,-25,80],[0.22 , 0.22, 0.22],[0.6,0.6,0.6],[0.0,0.0,0.0]);
	
    var transformVec = vec3.create();
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                     vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                              vertexNormalBuffer.itemSize,
                              gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexFaceBuffer);
    gl.drawElements(gl.TRIANGLES, vertexFaceBuffer.numItems, gl.UNSIGNED_SHORT,0);

    mvPopMatrix();
    setupShadersSkybox();
    setupBuffersCube();
    gl.useProgram(skyboxShader);

    //Draw the skybox
    mvPushMatrix();
    vec3.set(transformVec, 90.0, 90.0, 90.0);
    mat4.scale(mvMatrix,mvMatrix, transformVec);
    mat4.rotateY(mvMatrix,mvMatrix,degToRad(rotateCubeY));

    setMatrixUniformsSkybox();

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(skyboxShader.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
    gl.vertexAttribPointer(skyboxShader.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
    gl.uniform1i(gl.getUniformLocation(skyboxShader, "uSampler"), 0);

    // Draw face
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
    setMatrixUniformsSkybox();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);


    // second face
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer1);
    gl.vertexAttribPointer(skyboxShader.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer1);
    gl.vertexAttribPointer(skyboxShader.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture1);   // MIGHT NEED TO CREATE A SECOND CUBE THING
    gl.uniform1i(gl.getUniformLocation(skyboxShader, "uSampler"), 0);

    // Draw face
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
    setMatrixUniformsSkybox();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);


    // third face
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer2);
    gl.vertexAttribPointer(skyboxShader.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer2);
    gl.vertexAttribPointer(skyboxShader.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture2);   // MIGHT NEED TO CREATE A SECOND CUBE THING
    gl.uniform1i(gl.getUniformLocation(skyboxShader, "uSampler"), 0);

    // Draw face
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
    setMatrixUniformsSkybox();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);


    // forth face
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer3);
    gl.vertexAttribPointer(skyboxShader.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer3);
    gl.vertexAttribPointer(skyboxShader.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture3);   // MIGHT NEED TO CREATE A SECOND CUBE THING
    gl.uniform1i(gl.getUniformLocation(skyboxShader, "uSampler"), 0);

    // Draw face
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
    setMatrixUniformsSkybox();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // draw the forth sqaure
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer4);
    gl.vertexAttribPointer(skyboxShader.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer4);
    gl.vertexAttribPointer(skyboxShader.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture4);   // MIGHT NEED TO CREATE A SECOND CUBE THING
    gl.uniform1i(gl.getUniformLocation(skyboxShader, "uSampler"), 0);

    // Draw face
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
    setMatrixUniformsSkybox();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);


    // draw the sixth sqaure
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer5);
    gl.vertexAttribPointer(skyboxShader.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer5);
    gl.vertexAttribPointer(skyboxShader.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture5);   // MIGHT NEED TO CREATE A SECOND CUBE THING
    gl.uniform1i(gl.getUniformLocation(skyboxShader, "uSampler"), 0);

    // Draw the face.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
    setMatrixUniformsSkybox();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    mvPopMatrix();
}

function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;
}
function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
}
function handleKeys() {
    if (currentlyPressedKeys[38]) {
      // up
      rotateTeapotY += 1.5; 
    }
    if (currentlyPressedKeys[40]) {
      // down
      rotateTeapotY -= 1.5; 
    }
    if (currentlyPressedKeys[37]) {
      // left
        rotateTeapotY += 1.5;
        rotateCubeY += 1.5;
        leftRot = 1; 
    }
    if (currentlyPressedKeys[39]) {
      // right
        rotateTeapotY -= 1.5;
        rotateCubeY -= 1.5;
        rightRot = 1; 
    }
}

/**
* sets the normals of the new terrian
* @param {Float32Array} faceArray -- array of faces
* @param {Float32Array} vertexArray -- array of veriticies
* @param {Float32Array} normalArray -- array of normals
* @return {Float32Array} normalArray
*/
function setNorms(faceArray, vertexArray, normalArray)
{
    for(var i=0; i<faceArray.length;i+=3)
    {
        //find the face normal, mutiple by 3 since there are 3 components per vertex, add because x, y, z, 0, 1, 2, 3, 4, 5, 6, 7, 8
        var vertex1 = vec3.fromValues(vertexArray[faceArray[i]*3],vertexArray[faceArray[i]*3+1],vertexArray[faceArray[i]*3+2]);

        var vertex2 = vec3.fromValues(vertexArray[faceArray[i+1]*3],vertexArray[faceArray[i+1]*3+1],vertexArray[faceArray[i+1]*3+2]);

        var vertex3 = vec3.fromValues(vertexArray[faceArray[i+2]*3],vertexArray[faceArray[i+2]*3+1],vertexArray[faceArray[i+2]*3+2]);

        var vect31=vec3.create(), vect21=vec3.create();
        vec3.sub(vect21,vertex2,vertex1);
        vec3.sub(vect31,vertex3,vertex1)
        var v=vec3.create();
        vec3.cross(v,vect21,vect31);

        //add the face normal to all the faces vertices
        normalArray[faceArray[i]*3  ]+=v[0];
        normalArray[faceArray[i]*3+1]+=v[1];
        normalArray[faceArray[i]*3+2]+=v[2];

        normalArray[faceArray[i+1]*3]+=v[0];
        normalArray[faceArray[i+1]*3+1]+=v[1];
        normalArray[faceArray[i+1]*3+2]+=v[2];

        normalArray[faceArray[i+2]*3]+=v[0];
        normalArray[faceArray[i+2]*3+1]+=v[1];
        normalArray[faceArray[i+2]*3+2]+=v[2];

    }

    //normalize each vertex normal
    for(var i=0; i<normalArray.length;i+=3)
    {
        var v = vec3.fromValues(normalArray[i],normalArray[i+1],normalArray[i+2]);
        vec3.normalize(v,v);

        normalArray[i  ]=v[0];
        normalArray[i+1]=v[1];
        normalArray[i+2]=v[2];
    }

    //return the vertex normal
    return normalArray;
}

/**
* map the images onto the object
* @param {var} - gl
* @param {var} - target
* @param {var} - texture
* @param {var} - url
* @return
*/
function loadCubeMapFace(gl, target, texture, url)
{
	var image = new Image();
	image.onload = function()
	{
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
		gl.texImage2D(target,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	}
	image.src = url;

}
