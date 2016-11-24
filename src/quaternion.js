class Quaternion {
  constructor(w, x, y, z) {
    this.w = w
    this.x = x
    this.y = y
    this.z = z
  }

  multiply(q) {
    return new Quaternion(
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
      this.x * q.w + this.w * q.x + this.y * q.z - this.z * q.y,
      this.y * q.w + this.w * q.y + this.z * q.x - this.x * q.z,
      this.z * q.w + this.w * q.z + this.x * q.y - this.y * q.x)
  }

  toEulerAngles() {
    let phi = Math.atan2(2 * (this.w * this.x + this.y * this.z), 1 - 2 * (this.x * this.x + this.y * this.y)),
      theta = Math.asin(2 * (this.w * this.y - this.z * this.x)),
      psi = Math.atan2(2 * (this.w * this.z + this.x * this.y), 1 - 2 * (this.y * this.y + this.z * this.z))

    return [phi, theta, psi];
  }
}