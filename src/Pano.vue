<template>
  <div id="app">
    <div class="viewport">
      <h3 class="title">{{ title }}</h3>
      <canvas v-el:canvas></canvas>
    </div>
  </div>
</template>

<script>
import Aff3d from './aff3d.js'
import Vec3 from './vec3.js'

const shaders = {
  fragment: require('raw!./fragment.glsl'),
  vertex: require('raw!./vertex.glsl')
}

const Promise = window.Promise || require('es6-promise').Promise;

export default {
  methods: {
    initShaders() {
      const gl = this.gl
      this.program = gl.createProgram()
      let vertex = this.shaders.vertex = gl.createShader(gl.VERTEX_SHADER)
      gl.shaderSource(vertex, shaders.vertex)
      gl.compileShader(vertex)
      gl.attachShader(this.program, vertex)

      let fragment = this.shaders.fragment = gl.createShader(gl.FRAGMENT_SHADER)
      gl.shaderSource(fragment, shaders.fragment)
      gl.compileShader(fragment)
      gl.attachShader(this.program, fragment)

      gl.linkProgram(this.program)
      gl.useProgram(this.program)
    },

    loadTextures() {
      const gl = this.gl
      let tasks = ['top', 'bottom', 'front', 'left', 'back', 'right'].map(
        direction => new Promise((resolve, reject) => {
          let url = this.images + direction + '.' + this.format
          let img = new Image()

          img.onload = () => {
            let texture = this[direction] = gl.createTexture()
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT)
            gl.generateMipmap(gl.TEXTURE_2D)
            gl.bindTexture(gl.TEXTURE_2D, null)
            
            resolve(url)
          }
          img.onerror = reject
          img.src = url
        }))

      Promise.all(tasks).then(images => {
        
      }).catch(e => {
        this.error = 'Unable to load all images.'
      })
    },

    initModel() {
      // Define the vertices for the cube.
      // Each line represents one vertex 
      // (x, y, z, u, v)
      const vertices = new Float32Array([
        -1.0, -1.0, 1.0, 0.0, 1.0,
        1.0, -1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 0.0,
        -1.0, 1.0, 1.0, 0.0, 0.0,

        -1.0, -1.0, -1.0, 1.0, 1.0,
        -1.0, 1.0, -1.0, 1.0, 0.0,
        1.0, 1.0, -1.0, 0.0, 0.0,
        1.0, -1.0, -1.0, 0.0, 1.0,

        -1.0, 1.0, -1.0, 0.0, 0.0,
        -1.0, 1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, -1.0, 1.0, 0.0,

        -1.0, -1.0, -1.0, 0.0, 1.0,
        1.0, -1.0, -1.0, 1.0, 1.0,
        1.0, -1.0, 1.0, 1.0, 0.0,
        -1.0, -1.0, 1.0, 0.0, 0.0,

        1.0, -1.0, -1.0, 1.0, 1.0,
        1.0, 1.0, -1.0, 1.0, 0.0,
        1.0, 1.0, 1.0, 0.0, 0.0,
        1.0, -1.0, 1.0, 0.0, 1.0,

        -1.0, -1.0, -1.0, 0.0, 1.0,
        -1.0, -1.0, 1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0, 1.0, 0.0,
        -1.0, 1.0, -1.0, 0.0, 0.0
      ])

      // Define indices for the cube.
      // Each line represents one triangle and
      // each two lines represent one face of the cube.
      const indices = new Uint16Array([
        0, 1, 2,
        2, 3, 0,

        4, 5, 6,
        6, 7, 4,

        8, 9, 10,
        10, 11, 8,

        12, 13, 14,
        14, 15, 12,

        16, 17, 18,
        18, 19, 16,

        20, 21, 22,
        22, 23, 20
      ])

      const gl = this.gl

      // store vertices in a buffer
      var vertexBufferObject = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject)
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

      // store indices in a buffer
      var indexBufferObject = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

      // tell shader program where to find the vertex data
      var vertexAttribLoc = gl.getAttribLocation(this.program, 'aPosition')
      var vertexAttribLocUV = gl.getAttribLocation(this.program, 'aUV')
      gl.enableVertexAttribArray(vertexAttribLoc)
      gl.enableVertexAttribArray(vertexAttribLocUV)
      gl.vertexAttribPointer(vertexAttribLoc, 3, gl.FLOAT, false, 5 * 4, 0)
      gl.vertexAttribPointer(vertexAttribLocUV, 2, gl.FLOAT, false, 5 * 4, 3 * 4)
    },

    draw() {
      const gl = this.gl

      // calculate the viewing direction from the spherical coordinates
      let dirX = Math.cos(Math.PI * this.phi / 180) * Math.cos(Math.PI * this.theta / 180)
      let dirY = Math.sin(Math.PI * this.theta / 180)
      let dirZ = Math.sin(Math.PI * this.phi / 180) * Math.cos(Math.PI * this.theta / 180)

      let viewerDirection = new Vec3(dirX, dirY, dirZ)

      // the camera is located in the origin
      let viewerPosition = new Vec3(0.0, 0.0, 0.0)

      // Calculate the camera matrix depending on viewing direction
      let modelviewMatrix = new Aff3d()
      modelviewMatrix.lookAt(viewerPosition, viewerPosition.add(viewerDirection), new Vec3(0.0, 1.0, 0.0))

      let projectionMatrix = new Aff3d()
      let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight
      projectionMatrix.perspective(this.fov, aspect, 0.1, 2)

      // clear screen
      gl.clearColor(1.0, 1.0, 1.0, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      // pass parameters to the shader program
      gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "modelviewMatrix"),
        false, modelviewMatrix.data())
      gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "projectionMatrix"),
        false, projectionMatrix.data())
      gl.uniform1i(gl.getUniformLocation(this.program, "uSampler"), 0)

      // draw each side of the cube with the corresponding texture of the cube map
      gl.bindTexture(gl.TEXTURE_2D, this.front)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
      gl.bindTexture(gl.TEXTURE_2D, this.back)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 6 * 2)
      gl.bindTexture(gl.TEXTURE_2D, this.top)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 12 * 2)
      gl.bindTexture(gl.TEXTURE_2D, this.bottom)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 18 * 2)
      gl.bindTexture(gl.TEXTURE_2D, this.right)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 24 * 2)
      gl.bindTexture(gl.TEXTURE_2D, this.left)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 30 * 2)

      this.animationId = requestAnimationFrame(this.draw.bind(this))
    }
  },

  ready() {
    const ratio = 1
    const [width, height] = [this.width, this.height].map(n => parseInt(n))
    const $canvas = this.$els.canvas
    const gl = this.gl = $canvas.getContext('webgl') || $canvas.getContext('experimental-webgl')

    if (!this.gl) {
      this.error = 'Your browser does not support WebGL.'
      return
    }

    $canvas.width = width * ratio
    $canvas.height = height * ratio
    $canvas.style.width = this.$el.style.width = width + 'px'
    $canvas.style.height = this.$el.style.height = height + 'px'

    this.initShaders()
    this.loadTextures()
    this.initModel()
    this.draw()
  },

  props: {
    width: String,
    height: String,
    title: String,
    images: String,
    format: String
  },

  data() {
    return {
      fov: 90,
      gl: null,

      animationId: 0,
      phi: -90,
      phiOld: 0,
      theta: 0,
      thetaOld: 0,
      mousedown: false,
      mousePosX: 0,
      mousePosY: 0,
      mousePosOldX: 0,
      mousePosOldY: 0,

      top: null,
      bottom: null,
      front: null,
      back: null,
      left: null,
      right: null,

      program: null,
      shaders: {
        vertex: null,
        fragment: null
      }
    }
  }
}
</script>

<style scoped>

.viewport {
  position: relative;
}

.viewport > * {
  position: absolute;
}

.title {
  background-color: rgba(0, 0, 0, .0);
  color: rgba(255, 255, 255, .5);
  font-family: Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 100;
  left: 0;
  margin: 0;
  padding: 10px;
  right: 0;
  top: 0;
  transition: background-color;
  z-index: 1;
}

.title:hover {
  background-color: rgba(0, 0, 0, .3);
}

canvas {
  background: #000;
  z-index: -1;
}

</style>
