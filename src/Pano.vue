<template>
  <div class="viewport" v-el:viewport 
      @mousedown="startDrag" @touchstart="startDrag"
      @mousemove="onDrag" @touchmove="onDrag"
      @mouseup="stopDrag" @touchend="stopDrag" @mouseleave="stopDrag">

    <div class="error" v-if="error"><span>{{ error }}</span></div>
    <template v-else>
      <div class="controls" v-el:controls>
        <div class="zoom hover">
          <button class="zoomin" v-el:zoomin @click="zoomin">+</button>
          <button class="zoomout" v-el:zoomout @click="zoomout">-</button>
        </div>
      </div>
      <div class="about hover" v-el:about
        @mousedown="dismiss" @touchstart="dismiss"
        @mousemove="dismiss" @touchmove="dismiss">
        <h3>{{ title }}</h3>
        <article>{{ description }}</article>
      </div>
      <canvas v-el:canvas></canvas>
      <div class="debug" v-show="debug">fov: {{ fov }}, theta: {{ theta }}, phi: {{ phi }}</div>
    </template>

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
    clamp(v, min, max) {
      return Math.max(min, Math.min(max, v))
    },

    zoomin(e) {
      let fov = this.fov -= 4
      this.fov = this.clamp(fov, 20, 90)
    },

    zoomout(e) {
      let fov = this.fov += 4
      this.fov = this.clamp(fov, 20, 90)
    },

    dismiss(e) {
      e.stopPropagation()
    },

    startDrag(e) {
      e = e.changedTouches ? e.changedTouches[0] : e
      this.dragging = true
      this.previous = {
        phi: this.phi,
        theta: this.theta,
        mouseX: e.pageX,
        mouseY: e.pageY
      }
    },

    onDrag(e) {
      e = e.changedTouches ? e.changedTouches[0] : e
      const speed = 0.05
      if (this.dragging) {
        this.mouseX = e.pageX
        this.mouseY = e.pageY
        this.phi = this.previous.phi - speed * (this.mouseX - this.previous.mouseX)
        let theta = this.previous.theta + speed * (this.mouseY - this.previous.mouseY)
        this.theta = this.clamp(theta, -90, 90)
      }
    },

    zoom(e) {
      e = window.event || e
      let delta = this.clamp(e.wheelDelta || -e.detail, -4, 4)
      let fov = this.fov - delta
      this.fov = this.clamp(fov, 20, 90)
    },

    stopDrag() {
      if (this.dragging) {
        this.dragging = false
      }
    },

    resize() {
      const ratio = window.devicePixelRatio || 1
      const {width, height} = this
      const {canvas, viewport} = this.$els

      canvas.style.width = viewport.style.width = width ? width + 'px' : '100%'
      canvas.style.height = viewport.style.height = height ? height + 'px' : '100%'

      canvas.width = canvas.clientWidth * ratio
      canvas.height = canvas.clientHeight * ratio

      this.gl.viewport(0, 0, canvas.width, canvas.height)
    },

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
          let url = this.bundle + direction + '.' + this.format
          let img = new Image()

          img.onload = () => {
            let texture = this.textures[direction] = gl.createTexture()
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
        this.error = 'Unable to load all images'
      })
    },

    initModel() {
      // Define the vertices for the cube.
      // Each line represents one vertex 
      // (x, y, z, u, v)
      const vertices = new Float32Array([
        -1.0, -1.0, 1.0, 1.0, 1.0,
        1.0, -1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 1.0, 0.0, 0.0,
        -1.0, 1.0, 1.0, 1.0, 0.0,

        -1.0, -1.0, -1.0, 0.0, 1.0,
        -1.0, 1.0, -1.0, 0.0, 0.0,
        1.0, 1.0, -1.0, 1.0, 0.0,
        1.0, -1.0, -1.0, 1.0, 1.0,

        -1.0, 1.0, -1.0, 1.0, 0.0,
        -1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, -1.0, 0.0, 0.0,

        -1.0, -1.0, -1.0, 1.0, 1.0,
        1.0, -1.0, -1.0, 0.0, 1.0,
        1.0, -1.0, 1.0, 0.0, 0.0,
        -1.0, -1.0, 1.0, 1.0, 0.0,

        1.0, -1.0, -1.0, 0.0, 1.0,
        1.0, 1.0, -1.0, 0.0, 0.0,
        1.0, 1.0, 1.0, 1.0, 0.0,
        1.0, -1.0, 1.0, 1.0, 1.0,

        -1.0, -1.0, -1.0, 1.0, 1.0,
        -1.0, -1.0, 1.0, 0.0, 1.0,
        -1.0, 1.0, 1.0, 0.0, 0.0,
        -1.0, 1.0, -1.0, 1.0, 0.0
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

    almostEqual(a, b) {
      return Math.abs(a - b) < 1e-4
    },

    draw() {
      const gl = this.gl

      let {phi, theta, fov} = this
      if (this.almostEqual(phi, this.previous.phi) 
          && this.almostEqual(theta, this.previous.theta)
          && this.almostEqual(fov, this.previous.fov)) {
        requestAnimationFrame(this.draw.bind(this))
        return 
      }

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
      gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'modelviewMatrix'),
        false, modelviewMatrix.data())
      gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'projectionMatrix'),
        false, projectionMatrix.data())
      gl.uniform1i(gl.getUniformLocation(this.program, 'uSampler'), 0)

      // draw each side of the cube with the corresponding texture of the cube map
      let textures = this.textures
      gl.bindTexture(gl.TEXTURE_2D, textures.front)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
      gl.bindTexture(gl.TEXTURE_2D, textures.back)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 6 * 2)
      gl.bindTexture(gl.TEXTURE_2D, textures.top)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 12 * 2)
      gl.bindTexture(gl.TEXTURE_2D, textures.bottom)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 18 * 2)
      gl.bindTexture(gl.TEXTURE_2D, textures.left)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 24 * 2)
      gl.bindTexture(gl.TEXTURE_2D, textures.right)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 30 * 2)

      requestAnimationFrame(this.draw.bind(this))
    }
  },

  ready() {
    const {canvas, about} = this.$els
    const gl = this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')

    if (!gl) {
      this.error = 'Your browser does not support WebGL.'
      return
    }

    this.resize()

    this.previous.phi = -this.phi
    this.previous.theta = -this.theta
    this.previous.fov = -this.fov

    const zoom = this.zoom.bind(this)
    const resize = this.resize.bind(resize)
    const dismiss = this.dismiss.bind(dismiss)
    if (addEventListener) {
      this.$el.addEventListener('mousewheel', zoom, false)
      this.$el.addEventListener('DOMMouseScroll', zoom, false)
      about.addEventListener('mousewheel', dismiss, false)
      about.addEventListener('DOMMouseScroll', dismiss, false)

      addEventListener('resize', resize)
    } else {
      this.$el.attachEvent('onmousewheel', zoom)
      about.attachEvent('onmousewheel', dismiss)
      attachEvent('resize', resize)
    }

    this.initShaders()
    this.loadTextures()
    this.initModel()
    this.draw()
  },

  props: {
    width: String,
    height: String,
    title: String,
    bundle: String,
    format: String,
    debug: String,
    description: String
  },

  data() {
    return {
      gl: null,
      dragging: false,
      error: '',

      phi: -90,
      theta: 0,
      fov: 45,
      mouseX: 0,
      mouseY: 0,
      
      previous: {
        phi: 0,
        theta: 0,
        fov: 0,
        mouseX: 0,
        mouseY: 0
      },

      textures: {
        top: null,
        bottom: null,
        front: null,
        back: null,
        left: null,
        right: null,  
      },

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
  font-family: Helvetica, Arial, sans-serif;
  position: relative;
}

.viewport > * {
  position: absolute;
}

.hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, .12), 0 1px 2px rgba(0, 0, 0, .24);
  transition: all 0.3s cubic-bezier(.25, .8, .25, 1);
}

.hover:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, .25), 0 10px 10px rgba(0, 0, 0, .22);
}

.about {
  background-color: #fff;
  border-radius: 2px;
  color: #3d3d3d;
  font-size: 14px;
  font-weight: 100;
  line-height: 20px;
  margin: 0;
  overflow: hidden;
  padding: 20px;
  right: 10px;
  top: 10px;
  width: 240px;
  z-index: 1;
}

.about h3 {
  font-size: 20px;
  font-weight: 300;
}

.zoom {
  left: 10px;
  position: absolute;
  top: 10px;
}

.zoom > button {
  background: rgba(0, 0, 0, 0.87);
  border: none;
  color: #c9c9c9;
  cursor: pointer;
  font-family: monospace;
  font-size: 16px;
  padding: 4px 8px;
}

.zoom > button:hover {
  color: #fff;
}

.zoom > button:focus {
  outline: none;
}

.zoomin {
  border-radius: 2px 2px 0 0;
}

.zoomout {
  border-radius: 0 0 2px 2px;
}

.error {
  background: radial-gradient(ellipse at center, #4c4c4c 0%,#2c2c2c 50%,#131313 100%);
  bottom: 0;
  color: #fff;
  left: 0;
  right: 0;
  top: 0;
}

.error > span {
  color: rgba(255, 255, 255, 0.74);
  display: block;
  font-size: 16px;
  font-weight: 100;
  left: 0;
  line-height: 24px;
  margin-top: -12px;
  position: absolute;
  right: 0;
  text-align: center;
  text-shadow: 0 0 2px #000;
  top: 50%;
}

.debug {
  font-size: 12px;
  font-family: monospace;
  background: rgba(0, 0, 0, .3);
  color: rgba(255, 255, 255, .7);
  padding: 10px;
  white-space:nowrap;
  bottom: 0;
  left: 0;
}

canvas {
  background: #000;
  z-index: -1;
}

</style>
