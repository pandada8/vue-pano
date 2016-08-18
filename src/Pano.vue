<template>
  <div id="app">
    <div class="viewport">
      <h3 class="title">{{ title }}</h3>
      <canvas v-el:canvas></canvas>  
    </div>
  </div>
</template>

<script>
const shaders = {
  fragment: require('./fragment.glsl'),
  vertex: require('./vertex.glsl')
}

export default {
  ready() {
    let ratio = window.devicePixelRatio || 1
    let [width, height] = [this.width, this.height].map(n => parseInt(n))
    let $canvas = this.$els.canvas
    this.gl = $canvas.getContext('webgl') || $canvas.getContext('experimental-webgl')

    $canvas.width = width * ratio
    $canvas.height = height * ratio
    $canvas.style.width = this.$el.style.width = width + 'px'
    $canvas.style.height = this.$el.style.height = height + 'px'
  },
  props: {
    width: String,
    height: String,
    title: String,
  },
  data() {
    return {
      fov: 90,
      gl: undefined,
      shaders
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
