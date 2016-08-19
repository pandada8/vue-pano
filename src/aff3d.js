/**
 * Class of homogeneous transformation matrices
 */

export default class Aff3d {
  constructor() {
    this.values = new Float32Array(16)
  }

  reset() {
    for (let i = 0; i < this.values.length; i++)
      this.values[i] = 0
  }

  setToIdentity() {
    this.reset()
    for (let i = 0; i < 4; ++i)
      this.values[5 * i] = 1
  }

  lookAt (pos, center, up) {
    if (pos.sub(center).norm2() == 0) {
      this.setToIdentity()
      return
    }

    let dirNormalized = center.sub(pos).normalize()
    let somehowUpNormalized = up.normalize()
    let thirdDirection = dirNormalized.cross(somehowUpNormalized).normalize()
    let upNormalized = thirdDirection.cross(dirNormalized).normalize()

    this.values[0] = thirdDirection.x
    this.values[4] = thirdDirection.y
    this.values[8] = thirdDirection.z

    this.values[1] = upNormalized.x
    this.values[5] = upNormalized.y
    this.values[9] = upNormalized.z

    this.values[2] = -dirNormalized.x
    this.values[6] = -dirNormalized.y
    this.values[10] = -dirNormalized.z

    this.values[3] = 0
    this.values[7] = 0
    this.values[11] = 0
    this.values[15] = 1

    this.values[12] = -thirdDirection.dot(pos)
    this.values[13] = -upNormalized.dot(pos)
    this.values[14] = dirNormalized.dot(pos)
  
  }

  // Calculates a projection matrix
  perspective(fovy, aspect, near, far) {
    this.reset()

    let f = 1.0 / Math.tan(fovy * Math.PI / 360.0)
    this.values[0] = f / aspect
    this.values[5] = f
    this.values[10] = (far + near) / (near - far)
    this.values[11] = -1
    this.values[14] = (2 * far * near) / (near - far)
  }

  data() {
    return this.values
  }
}
