<template>
  <div class="vue-pano viewport" v-el:viewport 
      @mousedown="startDrag" @touchstart="startDrag"
      @mousemove="onDrag" @touchmove="onDrag"
      @mouseup="stopDrag" @touchend="stopDrag" @mouseleave="stopDrag">

    <div class="error" v-if="error"><span>{{ error }}</span></div>
    <template v-else>
      <div class="controls" v-el:controls>
        <div class="zoom handle">
          <button class="zoomin" v-el:zoomin @click="zoomin">+</button>
          <button class="zoomout" v-el:zoomout @click="zoomout">-</button>
        </div>

        <div class="campas">
          <div class="direction" v-bind:style="{ transform: 'rotate(' + (-phi) + 'deg)' }" @click="reset">
            <div class="north"></div>
            <div class="south"></div>
          </div>
        </div>
      </div>

      <h3 class="title">{{ title }}</h3>

      <div class="handle toggle-fullscreen">
        <button @click="toggleFullscreen"></button>
      </div>
      <canvas v-el:canvas></canvas>
      <div class="debug" v-show="debug">fov: {{ fov }}, theta: {{ theta }}, phi: {{ phi }}</div>
    </template>

  </div>
</template>

<script>
import Aff3d from './aff3d.js'
import Vec3 from './vec3.js'
import {clamp} from './util.js'

const shaders = {
  fragment: require('raw!./fragment.glsl'),
  vertex: require('raw!./vertex.glsl')
}

const Promise = window.Promise || require('es6-promise').Promise;

export default {
  methods: {
    reset() {
      this.phi = this.theta = 0
    },

    zoomin(e) {
      let fov = this.fov -= 4
      this.fov = clamp(fov, this.minFov, this.maxFov)
    },

    zoomout(e) {
      let fov = this.fov += 4
      this.fov = clamp(fov, this.minFov, this.maxFov)
    },

    startDrag(e) {
      if (e.targetTouches && e.targetTouches.length >= 2) {
        let p1 = event.targetTouches[0], p2 = event.targetTouches[1]
        let distance = Math.sqrt(Math.pow(p2.pageX - p1.pageX, 2) + Math.pow(p2.pageY - p1.pageY, 2))
        
        this.previous.pinchDistance = distance
        this.previous.fov = this.fov
        this.pinching = true

        return
      }

      e = e.changedTouches ? e.changedTouches[0] : e
      this.dragging = true
      this.previous = {
        phi: this.phi,
        theta: this.theta,
        mouseX: e.pageX,
        mouseY: e.pageY,
        touchPoints: [],
        pinchDistance: null,
        fov: this.fov
      }
    },

    onDrag(e) {
      if (this.pinching) {
        let p1 = event.targetTouches[0], p2 = event.targetTouches[1]
        let distance = Math.sqrt(Math.pow(p2.pageX - p1.pageX, 2) + Math.pow(p2.pageY - p1.pageY, 2))
        let fov = this.fov + (this.previous.pinchDistance - distance) / distance * (100 / window.devicePixelRatio)
        this.previous.pinchDistance = distance
        this.fov = clamp(fov, this.minFov, this.maxFov)
        return
      }

      e = e.changedTouches ? e.changedTouches[0] : e
      const speed = 0.05 * window.devicePixelRatio
      if (this.dragging) {
        this.mouseX = e.pageX
        this.mouseY = e.pageY
        this.phi = this.previous.phi - speed * (this.mouseX - this.previous.mouseX)
        let theta = this.previous.theta + speed * (this.mouseY - this.previous.mouseY)
        this.theta = clamp(theta, -90, 90)
      }
    },

    zoom(e) {
      e = window.event || e
      let delta = clamp(e.wheelDelta || -e.detail, -4, 4)
      let fov = this.fov - delta
      this.fov = clamp(fov, this.minFov, this.maxFov)
    },

    stopDrag() {
      this.dragging = this.pinching = false
    },

    resize() {
      const ratio = window.devicePixelRatio || 1
      const {canvas, viewport} = this.$els
      let {width, height} = this

      if (this.fullscreen) {
        height = width = '100%'
      } else if (+width == width && +height == height) {
        width += 'px'
        height += 'px'
      }

      canvas.style.width = viewport.style.width = width ? width : '100%'
      canvas.style.height = viewport.style.height = height ? height : '100%'
      canvas.width = canvas.clientWidth * ratio
      canvas.height = canvas.clientHeight * ratio

      this.gl.viewport(0, 0, canvas.width, canvas.height)
      this.draw(true)
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

    toggleFullscreen() {
      this.fullscreen = !this.fullscreen

      let enter = this.$el.requestFullsceen,
        leave = document.cancelFullScreen;

      if (!enter) {
        for (let vendor of ['webkit', 'moz', 'ms']) {
          if ((vendor + 'RequestFullscreen') in this.$el) {
            enter = this.$el[vendor + 'RequestFullscreen']
            leave = document[vendor + 'ExitFullscreen']
            break;
          }
        }

        if (!enter) {
          console.warn('Fullscreen API not avaliable on this browser')
        }
      }

      if (this.fullscreen) {
        enter.call(this.$el)
      } else {
        leave.call(document)
      }

      this.resize()
    },

    draw(force) {
      const gl = this.gl

      let {phi, theta, fov} = this
      if (!force
          && this.almostEqual(phi, this.previous.phi) 
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
    const {canvas} = this.$els
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

    if (window.addEventListener) {
      this.$el.addEventListener('mousewheel', zoom, false)
      this.$el.addEventListener('DOMMouseScroll', zoom, false)
      addEventListener('resize', resize, false)
      addEventListener('touchmove', event => event.preventDefault(), false)
      document.body.addEventListener('touchstart', event => event.preventDefault())
    } else {
      this.$el.attachEvent('onmousewheel', zoom)
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
    front: String,
    bundle: String,
    format: String,
    debug: String,
    description: String
  },

  data() {
    return {
      gl: null,
      dragging: false,
      pinching: false,
      error: '',
      fullscreen: false,

      phi: 90,
      theta: 0,
      fov: 45,
      mouseX: 0,
      mouseY: 0,

      minFov: 20,
      maxFov: 90,
      
      previous: {
        phi: 0,
        theta: 0,
        fov: 0,
        mouseX: 0,
        mouseY: 0,
        touchPoints: []
      },

      target: {
        phi: 0,
        theta: 0,
        fov: 0
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

.title {
  color: #fff;
  font-size: 20px;
  font-weight: 300;
  margin: 0;
  right: 10px;
  top: 10px;
}

.controls {
  left: 10px;
  position: absolute;
  top: 10px;
}

.zoom {
  width: 26px;
  margin-left: 12px;
}

.handle button {
  background: rgba(0, 0, 0, 0.87);
  border: none;
  color: #c9c9c9;
  cursor: pointer;
  font-family: monospace;
  font-size: 16px;
  margin: 0;
  padding: 4px 8px;
}

.handle button:hover {
  color: #fff;
}

.handle button:focus {
  outline: none;
}

.zoomin {
  border-radius: 2px 2px 0 0;
}

.zoomout {
  border-radius: 0 0 2px 2px;
}

.toggle-fullscreen {
  bottom: 10px;
  right: 10px;
  font-size: 0;
}

.toggle-fullscreen button {
  border-radius: 2px;
  padding: 2px;
}

.toggle-fullscreen button:after {
  content: url(enter.svg);

}

.toggle-fullscreen.on button:after {
  content: url(leave.svg);
}

.campas {
  margin-top: 10px;
}

.campas > .direction {
  background: rgba(0, 0, 0, 0.48);
  border-radius: 26px;
  border: 12px solid #000;
  cursor: pointer;
  height: 28px;
  transform: rotate(0);
  width: 28px;
  transition: all 0.2s;
}

.campas > .direction > div {
  border-style: solid;
  height: 0;
  width: 0;
  transform: translate(8px, -8px);
}

.campas .north {
  border-color: transparent transparent #ba2226 transparent;
  border-width: 0 6px 24px 6px;
}

.campas .south {
  border-color: #c6c6c6 transparent transparent transparent;
  border-width: 24px 6px 0 6px;
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
