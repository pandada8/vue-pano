precision mediump float;
varying vec2 vUV;
uniform sampler2D uSampler;

void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    gl_FragColor = texture2D(uSampler, vUV);
}