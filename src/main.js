import Pano from './Pano.vue'
import Vue from "vue"
Vue.component('pano', Pano)
window.Vue = Vue
if (process.env.NODE_ENV != "production") {
  new Vue({
    el: 'body'
  })
}