// Class of 3D vectors

export default class Vec3 {
  constructor(x, y, z) {
    [this.x, this.y, this.z] = [x, y, z]
  }

  add(vec) {
    return new Vec3(this.x + vec.x, this.y + vec.y, this.z + vec.z)
  }

  sub(vec) {
    return new Vec3(this.x - vec.x, this.y - vec.y, this.z - vec.z)
  }

  dot(vec) {
    return this.x * vec.x + this.y * vec.y + this.z * vec.z
  }

  scale(s) {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }

  cross(vec) {
    return new Vec3(this.y * vec.z - this.z * vec.y,
      this.z * vec.x - this.x * vec.z, this.x * vec.y - this.y * vec.x)
  }

  norm2() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  norm() {
    return Math.sqrt(this.norm2())
  }

  normalize() {
    let length = this.norm()
    return length > 0 ? this.scale(1.0 / length) : this
  }

  toString() {
    return `(${[this.x, this.y, this.z]})`
  }
}
