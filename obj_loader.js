function loadObjMesh(string){
    var lines = string.split('\n'); 
    for(var i = 0; i < lines.length; i++) {
        var line_data = lines[i].trim().split(' '); 
		if(line_data.length > 1){
            switch(line_data[0]){
                case 'v': teapotVertices.push(parseFloat(line_data[1])); 
					teapotVertices.push(parseFloat(line_data[2])); 
					teapotVertices.push(parseFloat(line_data[3])); 
					
					teapotNormals.push(0); 
					teapotNormals.push(0); 
					teapotNormals.push(0); 
					break; 
                case 'f': teapotFaces.push(parseInt(line_data[2])-1);
					teapotFaces.push(parseInt(line_data[3])-1); 
					teapotFaces.push(parseInt(line_data[4])-1); 
					break; 
            }
        }
    }
	teapotNormals = setNorms(teapotFaces, teapotVertices, teapotNormals);  
	setupShadersTeapot(); 
	setupBuffersTeapot(); 
	setupTextures(); 
    setupBuffersCube(); 
    setupCubeMap(); 
	tick(); 
}