attribute vec4 aPosition;
attribute vec2 aUV;
uniform mat4 modelviewMatrix;
uniform mat4 projectionMatrix;
varying vec2 vUV;

void main() {
    gl_Position = projectionMatrix * modelviewMatrix * aPosition;
    vUV = aUV;
}