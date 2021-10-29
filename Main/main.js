"use strict";

var canvas;
var gl;

var points = [];
var colors = [];
var normals = [];

var cubePoints = 36;

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;

var axis = 0;
var theta = [0, 0, 0];

var trans = [0, 0, 0];

var sphereColor = vec4(1.0, 1.0, 0.0, 1.0);

var levels = 4;

var eye = vec3(0, 8, 8);
var at = vec3(0, 0, - 4);
var up = vec3(0, 1, 0);
var ModelView = lookAt(eye, at, up);
var Normal = transpose(inverse(ModelView));
var Projection = perspective(45, 1, 1, 30);

var AmbientLight = vec3(0.2, 0.2, 0.2);
var LightColor = vec3(1.0, 1.0, 1.0);

//
// 1. Position the light so that it is at [0 0 1.5] in world coordinates
// and not eye coordinates.
//
var LightPosition = vec4(0.0, 0.0, 1.5, 1.0);

var Shininess = 200;

var ModelViewMatrixLoc;
var NormalMatrixLoc;
var ProjectionMatrixLoc;

var trueNormals = true;

var AmbientOnLoc;
var DiffuseOnLoc;
var SpecularOnLoc;

function quad(a, b, c, d) {
	var vertices = [
		vec3(- 1.0, - 1.0, 1.0),
		vec3(- 1.0, 1.0, 1.0),
		vec3(1.0, 1.0, 1.0),
		vec3(1.0, - 1.0, 1.0),
		vec3(- 1.0, - 1.0, - 1.0),
		vec3(- 1.0, 1.0, - 1.0),
		vec3(1.0, 1.0, - 1.0),
		vec3(1.0, - 1.0, - 1.0)
	];

	var vertexColors = [
		vec4(0.0, 0.0, 0.0, 1.0),  // black
		vec4(1.0, 0.0, 0.0, 1.0),  // red
		vec4(1.0, 1.0, 0.0, 1.0),  // yellow
		vec4(0.0, 1.0, 0.0, 1.0),  // green
		vec4(0.0, 0.0, 1.0, 1.0),  // blue
		vec4(1.0, 0.0, 1.0, 1.0),  // magenta
		vec4(0.0, 1.0, 1.0, 1.0),  // cyan
		vec4(1.0, 1.0, 1.0, 1.0),  // white
	];

	// We need to parition the quad into two triangles in order for
	// WebGL to be able to render it.  In this case, we create two
	// triangles from the quad indices

	//vertex color assigned by the index of the vertex

	var indices = [a, b, c, a, c, d];

	for (var i = 0; i< indices.length; ++i) {
		points.push(vertices[indices[i]]);
		colors.push(vertexColors[a]);

		var n = normalize(cross(subtract(vertices[b], vertices[a]),
				subtract(vertices[c], vertices[a])));
		normals.push(n);
	}
}

function color_cube() {
	quad(1, 0, 3, 2);
	quad(2, 3, 7, 6);
	quad(3, 0, 4, 7);
	quad(6, 5, 1, 2);
	quad(4, 5, 6, 7);
	quad(5, 4, 0, 1);
}

function triangle(a, b, c) {
	if (trueNormals) {
		normals.push(a);
		normals.push(b);
		normals.push(c);
	} else {
		var n = normalize(cross(subtract(b, a), subtract(c, a)));
		normals.push(n);
		normals.push(n);
		normals.push(n);
	}

	colors.push(sphereColor);
	colors.push(sphereColor);
	colors.push(sphereColor);

	points.push(a);
	points.push(b);
	points.push(c);
}

function divide_face(a, b, c, n) {
	if (n> 0) {
		var ab = normalize(mix(a, b, 0.5));
		var ac = normalize(mix(a, c, 0.5));
		var bc = normalize(mix(b, c, 0.5));

		divide_face(a, ab, ac, n - 1);
		divide_face(c, ac, bc, n - 1);
		divide_face(b, bc, ab, n - 1);
		divide_face(ab, bc, ac, n - 1);
	} else {
		triangle(a, b, c);
	}
}

function divide_tetra(a, b, c, d, n) {
	divide_face(a, b, c, n);
	divide_face(d, c, b, n);
	divide_face(a, d, b, n);
	divide_face(a, c, d, n);
}

function init() {
	canvas = document.getElementById("gl-canvas");

	gl = canvas.getContext('webgl2');
	if (!gl) alert("WebGL 2.0 isn't available");

	color_cube();

	var vertices = [
		vec3(0.0000, 0.0000, 1.0000),
		vec3(0.0000, 0.9428, - 0.3333),
		vec3(- 0.8165, - 0.4714, - 0.3333),
		vec3(0.8165, - 0.4714, - 0.3333)
	];

	divide_tetra(vertices[0], vertices[1], vertices[2], vertices[3], levels);

	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);

	var program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);

	var nBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

	var normalLoc = gl.getAttribLocation(program, "aNormal");
	gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(normalLoc);

	var cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

	var colorLoc = gl.getAttribLocation(program, "aColor");
	gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(colorLoc);

	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

	var positionLoc = gl.getAttribLocation(program, "aPosition");
	gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(positionLoc);

	ModelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
	gl.uniformMatrix4fv(ModelViewMatrixLoc, false, flatten(ModelView));

	NormalMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");
	gl.uniformMatrix4fv(NormalMatrixLoc, false, flatten(Normal));

	ProjectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
	gl.uniformMatrix4fv(ProjectionMatrixLoc, false, flatten(Projection));

	var AmbientLightLoc = gl.getUniformLocation(program, "uAmbientLight");
	gl.uniform3fv(AmbientLightLoc, AmbientLight);

	var LightColorLoc = gl.getUniformLocation(program, "uLightColor");
	gl.uniform3fv(LightColorLoc, LightColor);

	var LightPositionLoc = gl.getUniformLocation(program, "uLightPosition");
	gl.uniform4fv(LightPositionLoc, LightPosition);

	var ShininessLoc = gl.getUniformLocation(program, "uShininess");
	gl.uniform1f(ShininessLoc, Shininess);

	AmbientOnLoc = gl.getUniformLocation(program, "uAmbientOn");
	DiffuseOnLoc = gl.getUniformLocation(program, "uDiffuseOn");
	SpecularOnLoc = gl.getUniformLocation(program, "uSpecularOn");

	document.getElementById("xButton").onclick = function () {
		axis = xAxis;
	};
	document.getElementById("yButton").onclick = function () {
		axis = yAxis;
	};
	document.getElementById("zButton").onclick = function () {
		axis = zAxis;
	};

	document.getElementById("xInc").onclick = function () {
		trans[0] += 0.2;
	};
	document.getElementById("yInc").onclick = function () {
		trans[1] += 0.2;
	};
	document.getElementById("zInc").onclick = function () {
		trans[2] -= 0.2;
	};
	document.getElementById("xDec").onclick = function () {
		trans[0] -= 0.2;
	};
	document.getElementById("yDec").onclick = function () {
		trans[1] -= 0.2;
	};
	document.getElementById("zDec").onclick = function () {
		trans[2] += 0.2;
	};

	var ambientCheckbox = document.getElementById("ambientOn");
	if (ambientCheckbox.checked) {
		gl.uniform1f(AmbientOnLoc, 1.0);
	} else {
		gl.uniform1f(AmbientOnLoc, 0.0);
	}

	ambientCheckbox.onchange = function (event) {
		if (ambientCheckbox.checked) {
			gl.uniform1f(AmbientOnLoc, 1.0);
		} else {
			gl.uniform1f(AmbientOnLoc, 0.0);
		}
	};

	var diffuseCheckbox = document.getElementById("diffuseOn");
	if (diffuseCheckbox.checked) {
		gl.uniform1f(DiffuseOnLoc, 1.0);
	} else {
		gl.uniform1f(DiffuseOnLoc, 0.0);
	}

	diffuseCheckbox.onchange = function (event) {
		if (diffuseCheckbox.checked) {
			gl.uniform1f(DiffuseOnLoc, 1.0);
		} else {
			gl.uniform1f(DiffuseOnLoc, 0.0);
		}
	};

	var specularCheckbox = document.getElementById("specularOn");
	if (specularCheckbox.checked) {
		gl.uniform1f(SpecularOnLoc, 1.0);
	} else {
		gl.uniform1f(SpecularOnLoc, 0.0);
	}

	specularCheckbox.onchange = function (event) {
		if (specularCheckbox.checked) {
			gl.uniform1f(SpecularOnLoc, 1.0);
		} else {
			gl.uniform1f(SpecularOnLoc, 0.0);
		}
	};

	var checkbox = document.getElementById("oneNormalPerTriangle");
	trueNormals = !checkbox.checked;

	checkbox.onchange = function (event) {
		trueNormals = !checkbox.checked;
	};

	render();
};

window.onload = init;

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	theta[axis] += 1.0;

	ModelView = mult(lookAt(eye, at, up),
				 mult(translate(trans[0], trans[1], trans[2]),
				  mult(rotateZ(theta[2]),
					   mult(rotateY(theta[1]),
						rotateX(theta[0])))));
	Normal = transpose(inverse(ModelView));
	gl.uniformMatrix4fv(ModelViewMatrixLoc, false, flatten(ModelView));
	gl.uniformMatrix4fv(NormalMatrixLoc, false, flatten(Normal));
	gl.drawArrays(gl.TRIANGLES, 0, cubePoints);

	//
	// 2. Add code to draw another cube centered at z=-8
	//
	ModelView = mult(lookAt(eye, at, up),
				 mult(translate(trans[0], trans[1], trans[2] - 8),
				  mult(rotateZ(theta[2]),
					   mult(rotateY(theta[1]),
						rotateX(theta[0])))));
	Normal = transpose(inverse(ModelView));
	gl.uniformMatrix4fv(ModelViewMatrixLoc, false, flatten(ModelView));
	gl.uniformMatrix4fv(NormalMatrixLoc, false, flatten(Normal));
	gl.drawArrays(gl.TRIANGLES, 0, cubePoints);

	//
	// 3. Add code to draw spheres centered at z=-4 and z=-12
	//
	// Note that the data for the sphere starts at index cubePoints
	// and runs to the end in the points, colors, and normals arrays
	//
	ModelView = mult(lookAt(eye, at, up),
				 mult(translate(trans[0], trans[1], trans[2] - 4),
				  mult(rotateZ(theta[2]),
					   mult(rotateY(theta[1]),
						rotateX(theta[0])))));
	Normal = transpose(inverse(ModelView));
	gl.uniformMatrix4fv(ModelViewMatrixLoc, false, flatten(ModelView));
	gl.uniformMatrix4fv(NormalMatrixLoc, false, flatten(Normal));
	gl.drawArrays(gl.TRIANGLES, cubePoints, points.length - cubePoints);
	
	ModelView = mult(lookAt(eye, at, up),
				 mult(translate(trans[0], trans[1], trans[2] - 12),
				  mult(rotateZ(theta[2]),
					   mult(rotateY(theta[1]),
						rotateX(theta[0])))));
	Normal = transpose(inverse(ModelView));
	gl.uniformMatrix4fv(ModelViewMatrixLoc, false, flatten(ModelView));
	gl.uniformMatrix4fv(NormalMatrixLoc, false, flatten(Normal));
	gl.drawArrays(gl.TRIANGLES, cubePoints, points.length - cubePoints);

	requestAnimationFrame(render);
}
