import * as THREE from 'three'

// Procedural matcaps: the Bruno-Simon "rendering illusion". No real-time lights.
// A matcap is the shaded image of a sphere sampled by the view-space normal, so
// a single warm highlight falling to deep dark reads as one candlelit source on
// every surface, at zero shading cost. Generated from canvas gradients so the
// build ships no texture assets.

export function makeMatcap(opts = {}) {
  const {
    size = 512,
    base = '#0a0908', // deep shadow ground (slightly warm black)
    mid = '#2e2419', // warm midtone falloff
    highlight = '#caa063', // warm gold key
    spec = '#f3e6c4', // hot specular core
    rim = '#1b2230', // cool counter-rim, reads form in the dark
    hx = 0.4,
    hy = 0.33, // key position (upper-left)
    hr = 0.66, // key radius
    specR = 0.13,
    rimStrength = 0.55,
  } = opts

  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')

  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  // warm key (additive so it builds light, not paint)
  ctx.globalCompositeOperation = 'lighter'
  const key = ctx.createRadialGradient(size * hx, size * hy, size * 0.01, size * hx, size * hy, size * hr)
  key.addColorStop(0.0, highlight)
  key.addColorStop(0.4, mid)
  key.addColorStop(1.0, 'rgba(0,0,0,0)')
  ctx.fillStyle = key
  ctx.fillRect(0, 0, size, size)

  // hot specular core
  const sp = ctx.createRadialGradient(size * hx, size * hy, 0, size * hx, size * hy, size * specR)
  sp.addColorStop(0, spec)
  sp.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sp
  ctx.fillRect(0, 0, size, size)

  // cool counter-rim near the sphere limb (lower-right bias)
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = rimStrength
  const rg = ctx.createRadialGradient(size * 0.62, size * 0.72, size * 0.3, size * 0.62, size * 0.72, size * 0.52)
  rg.addColorStop(0, 'rgba(0,0,0,0)')
  rg.addColorStop(0.82, 'rgba(0,0,0,0)')
  rg.addColorStop(1.0, rim)
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, size, size)

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// Material palette for the estate. Each is one matcap; the warm/dark progression
// is carried by the matcap, not by scene lights.
export function makeMatcapSet() {
  return {
    stone: makeMatcap({ base: '#0a0908', mid: '#2b241c', highlight: '#bfa882', spec: '#efe3c6', rim: '#1d2531' }),
    oak: makeMatcap({ base: '#090604', mid: '#3a210f', highlight: '#a8672c', spec: '#e6ad68', rim: '#221911' }),
    brass: makeMatcap({ base: '#0c0a05', mid: '#4a3611', highlight: '#d6a345', spec: '#fff0c0', rim: '#2a2a18', specR: 0.17 }),
    gilt: makeMatcap({ base: '#0d0a04', mid: '#5a3f12', highlight: '#eec158', spec: '#fff4cf', rim: '#332a14', specR: 0.2 }),
  }
}
