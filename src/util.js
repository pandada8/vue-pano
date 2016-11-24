export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

export function deg2rad(angle) {
  return angle / 180 * Math.PI
}

export function rad2deg(angle) {
  return angle / Math.PI * 180
}

function taitBryanToQuaternion(alpha, beta, gamma) {
  let r = [beta ? beta * Math.PI / 180 / 2 : 0,
    gamma ? gamma * Math.PI / 180 / 2 : 0,
    alpha ? alpha * Math.PI / 180 / 2 : 0]
  let c = [Math.cos(r[0]), Math.cos(r[1]), Math.cos(r[2])],
    s = [Math.sin(r[0]), Math.sin(r[1]), Math.sin(r[2])]

  return new Quaternion(c[0] * c[1] * c[2] - s[0] * s[1] * s[2],
    s[0] * c[1] * c[2] - c[0] * s[1] * s[2],
    c[0] * s[1] * c[2] + s[0] * c[1] * s[2],
    c[0] * c[1] * s[2] + s[0] * s[1] * c[2])
}

function computeQuaternion(alpha, beta, gamma) {
  let quaternion = taitBryanToQuaternion(alpha, beta, gamma)
  quaternion = quaternion.multiply(new Quaternion(Math.sqrt(0.5), -Math.sqrt(0.5), 0, 0))
  let angle = orientation ? -orientation * Math.PI / 180 / 2 : 0
  return quaternion.multiply(new Quaternion(Math.cos(angle), 0, -Math.sin(angle), 0))
}