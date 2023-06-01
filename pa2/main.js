'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let sound;
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let height = 5;
let p = 3;
let R = (height * height) / (2*p);
let radius = 0.3;
const PI = Math.PI;
let length;
let inputData;
var playButton;
let rotation = {x:0, y: 0, z:0};
let position = {x:1, y: 0, z:0};
var context;
let soundFileName = "perfectSound.mp3";
let source;
let panner;
let highpassFilter;

function GetRadiansFromDegree(angle) {
    return angle * PI / 180;
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureCoordBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length/3;
    }

    this.TextureBufferData = function (textureCoords) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STREAM_DRAW);
    
    
      }

      this.Draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
    
        gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormal);
    
        if (inputData.surfaceType.checked) {
          gl.drawArrays(gl.LINE_STRIP, 0, this.count);
        } else {
          const stepLength = this.count / length;
          for (let step = 0; step < this.count; step += stepLength) {
            gl.drawArrays(gl.LINE_STRIP, step, stepLength);
          }
        }
      };
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    this.iColor = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iNormal = -1;
    this.iNormalMatrix = -1;
    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;
    this.iSpecularColor = -1;
    this.iAmbientCoefficient = -1;
    this.iDiffuseCoefficient = -1;
    this.iSpecularCoefficient = -1;
    this.iShininess = -1;
    this.iLightPos = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function UpdateInputData()
{
    this.convergence = 2000.0;
    this.fov = 1.0;
    this.eyeSeparation = 80.0;;
    this.near = 10;
    this.surfaceType = true;
    this.filter = true;
    this.lightPosition = -1;
    this.ratio = 1;
    this.far = 2000.0;
    this.a;
    this.b;
    this.c;
    this.top; 
    this.bottom;
    this.left;
    this.right;

    this.UpdateData = function()
    {
        this.convergence = document.getElementById("convergence").value;
        this.eyeSeparation = document.getElementById("eyeSeparation").value;
        this.fov = document.getElementById("FOV").value;
        this.near = document.getElementById("nearDistance").value - 0.0;
        this.surfaceType = document.getElementById('SurfaceType');
        this.filter = document.getElementById('filter');
        this.lightPosition = document.getElementById('light');
        this.UpdateDataForSides();
    }

    this.UpdateDataForSides = function()
    {
        this.a = this.ratio * Math.tan(this.fov / 2.0) * this.convergence;

        this.b = this.a - this.eyeSeparation / 2;
        this.c = this.a + this.eyeSeparation / 2; 
        
        this.top = this.near * Math.tan(this.fov / 2.0);
        this.bottom = -this.top;
    }

    this.UpdateSidesForLeftProjection = function()
    {
        this.left = -this.b * this.near / this.convergence;
        this.right = this.c * this.near / this.convergence;
    }

    this.UpdateSidesForRightProjection = function()
    {
        this.left = -this.c * this.near / this.convergence;
        this.right = this.b * this.near / this.convergence;
    }
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let orthographic = m4.orthographic(0, 1, 0,1, -1, 1); 
    
    inputData.UpdateData();
    inputData.UpdateSidesForLeftProjection();
    let leftProjection = m4.orthographic(inputData.left, inputData.right,  inputData.bottom, inputData.top, inputData.near, inputData.far);
    inputData.UpdateSidesForRightProjection();
    let rightProjection = m4.orthographic(inputData.left, inputData.right,  inputData.bottom, inputData.top, inputData.near, inputData.far);
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0);
    let translateToPointZero = m4.translation(0,0,0);
    let leftTranslate = m4.translation(-0.03, 0, -20);
    let rightTranslate = m4.translation(0.03, 0, -20);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matStill = m4.multiply(rotateToPointZero, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    let matAccum1 = m4.multiply(translateToPointZero, matStill);
    let matAccumLeft = m4.multiply(leftTranslate, matAccum0);
    let matAccumRight = m4.multiply(rightTranslate, matAccum0);
    let modelViewProjection = m4.multiply(orthographic, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    const light =  Array.from(inputData.lightPosition.getElementsByTagName('input')).map((el) => +el.value);
    const modelviewInv = m4.inverse(matAccum1, new Float32Array(16));
    const normalMatrix = m4.transpose(modelviewInv, new Float32Array(16));  

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    gl.uniform3fv(shProgram.iLightPos, light);
    gl.uniform1i(shProgram.iTMU, 0);
    gl.uniform1f(shProgram.iShininess, 80.0);
    gl.uniform1f(shProgram.iAmbientCoefficient, 1);
    gl.uniform1f(shProgram.iDiffuseCoefficient, 1);
    gl.uniform1f(shProgram.iSpecularCoefficient, 1);

    gl.uniform3fv(shProgram.iAmbientColor, [0.2, 0.1, 0.4]);
    gl.uniform3fv(shProgram.iDiffuseColor, [0.0, 0.8, 0.8]);
    gl.uniform3fv(shProgram.iSpecularColor, [1.0, 1.0, 1.0]);
    gl.uniform4fv(shProgram.iColor, [1,1,0,1] );
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, leftProjection);
    gl.colorMask(true, false, false, false);

    surface.Draw();

    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, rightProjection);
    gl.colorMask(false, true, true, false);

    surface.Draw();
    gl.colorMask(true, true, true, true);

    gl.uniform1f(shProgram.iShininess, 10.0);
    gl.uniform1f(shProgram.iAmbientCoefficient, 1);
    gl.uniform1f(shProgram.iDiffuseCoefficient, 1);
    gl.uniform1f(shProgram.iSpecularCoefficient, 1);

    gl.uniform3fv(shProgram.iAmbientColor, [0.2, 0.1, 0.0]);
    gl.uniform3fv(shProgram.iDiffuseColor, [1.0, 1.0, 0.0]);
    gl.uniform3fv(shProgram.iSpecularColor, [1.0, 1.0, 1.0]);
    gl.uniform4fv(shProgram.iColor, [1,1,0.0,1] );
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, leftProjection);
    gl.colorMask(true, false, false, false);
    sound.Draw();
  
    gl.clear(gl.DEPTH_BUFFER_BIT);
  
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, rightProjection);
    gl.colorMask(false, true, true, false);
    sound.Draw();
  
    gl.colorMask(true, true, true, true);

}

function GetCurrentZPosition(h){
    return Math.pow(Math.abs(h) - height, 2) / (2*p);
}  
// surface - parabolic humming-top
// x = ((|z| - h)^2 / 2*p)) * cosB
// y = ((|z| - h)^2 / 2*p)) * sinB
// z = z
function CreateSurfaceData()
{
    let vertexList = [];

    const stepU = inputData.surfaceType.checked ? 1 : 2;
    const stepV = inputData.surfaceType.checked ? 0.5 : 1;

    for (let u = 0; u < 360; u += stepU) 
    {
        for(let v = -height; v <= height; v += stepV)
        {
            let currentAngle = GetRadiansFromDegree(u);
            let currentTemp = GetCurrentZPosition(v);
            let nextAngle = GetRadiansFromDegree(u + stepU);

            vertexList.push(currentTemp * Math.cos(currentAngle), v, currentTemp * Math.sin(currentAngle));
            vertexList.push(currentTemp * Math.cos(nextAngle), v, currentTemp * Math.sin(nextAngle));
        }
    }

    length = 360;
    return vertexList;
}

function CreateSoundData()
{
    let vertexList = [];

    const stepU = inputData.surfaceType.checked ? 5 : 9;

    for (let u = 0; u <= 360; u += stepU) 
    {
        for(let v = 0; v <= 360; v += stepU)
        {
            let alpha = GetRadiansFromDegree(u);
            let beta = GetRadiansFromDegree(v);

            vertexList.push(rotation.x +  (radius *  Math.cos(alpha) * Math.sin(beta)),rotation.y + (radius *  Math.sin(alpha) * Math.sin(beta)),rotation.z + (radius *  Math.cos(beta)));
        }
    }

    length = 360;
    return vertexList;
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexture             = gl.getAttribLocation(prog, 'texture');
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix            = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");
    shProgram.iNormal                    = gl.getAttribLocation(prog, 'normal');
    shProgram.iNormalMatrix              = gl.getUniformLocation(prog, 'normalMat');
    shProgram.iAmbientColor              = gl.getUniformLocation(prog, 'ambientColor');
    shProgram.iDiffuseColor              = gl.getUniformLocation(prog, 'diffuseColor');
    shProgram.iSpecularColor             = gl.getUniformLocation(prog, 'specularColor');
    shProgram.iShininess                 = gl.getUniformLocation(prog, 'shininess');
    shProgram.iLightPos                  = gl.getUniformLocation(prog, 'lightPosition');
    shProgram.iSpecularCoefficient       = gl.getUniformLocation(prog, 'specularCoefficient');
    shProgram.iAmbientCoefficient        = gl.getUniformLocation(prog, 'ambientCoefficient');
    shProgram.iDiffuseCoefficient        = gl.getUniformLocation(prog, 'diffuseCoefficient');
    shProgram.iTMU                       = gl.getUniformLocation(prog, 'tmu'); 



    
    inputData = new UpdateInputData();
    inputData.UpdateData();
    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    sound = new Model('Sound');
    sound.BufferData(CreateSoundData());
    gl.enable(gl.DEPTH_TEST);
}

function CreateSound()
{
    context = new window.AudioContext();
    CreateHighpassFilter();
    CreatePanner();
    const request = new XMLHttpRequest();
    source = context.createBufferSource();
    request.open("GET", soundFileName, true);
    request.responseType = "arraybuffer";

    request.onload = () => {
        const audioData = request.response;

        context.decodeAudioData(audioData, (buffer) => {          

            source.buffer = buffer;
            source.connect(highpassFilter);
            highpassFilter.connect(panner);
            panner.connect(context.destination);
            source.loop = true;
        }, (err) => {alert(err)}
        );
    };

    request.send();
    source.start(0);
    playButton.disabled = true;
    playButton.style.display = 'none';
}

function CreateHighpassFilter()
{
    highpassFilter = context.createBiquadFilter();
    highpassFilter.type = "highpass";
    highpassFilter.frequency.value = 1500;
}

function CreatePanner()
{
    panner = context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.maxDistance = 1000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {

    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }


    window.addEventListener('devicemotion', (event) => {
        if(panner)
        {
            let dt = 0.05;
            position.x += GetRadiansFromDegree(event.rotationRate.alpha) * dt;
            position.y += GetRadiansFromDegree(event.rotationRate.beta) * dt;
            position.z += GetRadiansFromDegree(event.rotationRate.gamma) * dt;

            rotation.x = R * Math.cos(position.y)*Math.cos(position.x);
            rotation.y = height * Math.sin(position.y);
            rotation.z = R * Math.cos(position.y)*Math.sin(position.z);
        
            panner.setPosition(rotation.x, rotation.y, rotation.z);
            panner.setOrientation(0,0,0);
            sound.BufferData(CreateSoundData());
        }
    })

    playButton = document.getElementById("play-button");
    playButton.addEventListener('click', function(){
        
                CreateSound();
    });
    spaceball = new TrackballRotator(canvas, draw, 0);
    Update();
}

function Update()
{
    draw()
    window.requestAnimationFrame(Update);
}

function Redraw() {
    highpassFilter.frequency.value = inputData.filter.checked ? 1500 : 0;  
    surface.BufferData(CreateSurfaceData());
    sound.BufferData(CreateSoundData());
    draw();
}

