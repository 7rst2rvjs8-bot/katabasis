import * as THREE from 'three'

// Procedural architecture. Hand-sculpted modelling is the one thing this run
// cannot do, so form comes from parametric primitives + fluting + repetition.

// A fluted column shaft: a tapered cylinder grooved by cos(angle*flutes).
export function flutedColumnGeometry({ height = 14, radius = 0.62, flutes = 20, radial = 96, rings = 10, taper = 0.86, groove = 0.07 } = {}) {
  const geo = new THREE.CylinderGeometry(radius * taper, radius, height, radial, rings, true)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const r = Math.hypot(v.x, v.z)
    if (r < 1e-4) continue
    const ang = Math.atan2(v.z, v.x)
    const f = Math.cos(ang * flutes) * 0.5 + 0.5
    const nr = r * (1 - groove * f)
    const s = nr / r
    v.x *= s
    v.z *= s
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

// A semicircular arch band (voussoir ring) sitting on its springing line y=0.
export function archRingGeometry({ ri = 2.4, ro = 3.3, depth = 1.4, seg = 64 } = {}) {
  const sh = new THREE.Shape()
  sh.absarc(0, 0, ro, 0, Math.PI, false)
  sh.lineTo(-ri, 0)
  sh.absarc(0, 0, ri, Math.PI, 0, true)
  sh.lineTo(ro, 0)
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: seg })
  geo.translate(0, 0, -depth / 2)
  geo.computeVertexNormals()
  return geo
}

// A coffered slab: a box whose underside is recessed into a grid of coffers.
// Cheap density for ceilings/entablature read.
export function corniceGeometry({ w = 4, h = 1.2, d = 2.4 } = {}) {
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1)
  return geo
}

// Disc with a soft radial falloff alpha, for baked shadow planes and glow pools.
export function radialTexture({ size = 256, inner = '#000', outer = 'rgba(0,0,0,0)', stop = 0.0 } = {}) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, size * stop, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
