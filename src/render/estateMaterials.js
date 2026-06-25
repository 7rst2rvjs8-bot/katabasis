import { makeMatcapSet, makeMatcap } from './matcaps.js'
import { makeEstateMatcap } from './estateMaterial.js'
import { ESTATE_LIGHTS } from '../world/layout.js'
import { T } from './treatments.js'

// One shared estate material set (singleton) so both zones and the inspectables
// read the same matcaps + the same continuous candle-light array.
let _set = null

export function getEstateMaterials() {
  if (_set) return _set
  const set = makeMatcapSet()
  const c = T.candle
  const L = ESTATE_LIGHTS
  // Register 3 (the Return): near-white alabaster, matte, luminous shadows that
  // dissolve rather than darken. floorBounce:0 + low strength so the warm candle
  // floor-term (smoothstep(9,0,y)=1 below y=0) cannot contaminate the cool pale.
  // Wide vertical value band (base luma ~50 -> spec luma ~205, spread ~155 vs the
  // old ~95) so view-space-normal sampling actually separates up-faces (bright
  // treads) from down-faces (dark soffits/nosings/reveals). The old narrow band
  // left every recess mid-grey, which read as flat white/grey blockout. Stays
  // cool/neutral (no warm key) and caps spec under the 0.55 global bloom knee.
  const paleMc = makeMatcap({ base: '#34352f', mid: '#6f716b', highlight: '#aeb0a9', spec: '#cdcec8', rim: '#7c8388', specR: 0.34, rimStrength: 0.24 })
  // paleDark: a genuinely dark, cool variant for the Return's recesses, soffits,
  // step nosings, threshold reveals and the aperture-well jambs. The dark base is
  // what carves the form: a down/side-facing paleDark surface reads as deep shadow
  // against the bright pale fronts, so silhouette comes from cut darkness, not
  // from a single giant pale blob. Isolated new key; never touches the shared
  // 'pale' that lectern4 also reads.
  const paleDarkMc = makeMatcap({ base: '#1c1d1a', mid: '#3a3c38', highlight: '#73766f', spec: '#84867d', rim: '#565c60', specR: 0.30, rimStrength: 0.20 })
  _set = {
    stone: makeEstateMatcap(set.stone, L, { warm: c.warm, range: c.range, strength: c.strength * 0.92 }),
    oak: makeEstateMatcap(set.oak, L, { warm: c.warm, range: c.range, strength: c.strength * 1.08 }),
    brass: makeEstateMatcap(set.brass, L, { warm: c.warm, range: c.range + 1.5, strength: c.strength * 1.15 }),
    gilt: makeEstateMatcap(set.gilt, L, { warm: c.warm, range: c.range + 0.5, strength: c.strength * 1.15 }),
    floor: makeEstateMatcap(set.stone, L, { warm: c.warm, range: c.range, strength: c.strength * 0.78, floor: true }),
    pale: makeEstateMatcap(paleMc, L, { warm: c.warm, range: c.range, strength: c.strength * 0.3, floorBounce: 0 }),
    paleDark: makeEstateMatcap(paleDarkMc, L, { warm: c.warm, range: c.range, strength: c.strength * 0.26, floorBounce: 0 }),
    // paleFloor: large severe ashlar slabs (value-only seams, no colour) so the
    // Return landing reads scale + grounding instead of a featureless plane. Its
    // own floorStyle key 'paleslab' gets a distinct shader program (cache key).
    paleFloor: makeEstateMatcap(paleMc, L, { warm: c.warm, range: c.range, strength: c.strength * 0.3, floorBounce: 0, floor: true, floorStyle: 'paleslab', flagSize: 3.2 }),
  }
  return _set
}

// Matcap material for a dropped-in hand/baked model: the same stone matcap and
// candle fake-bounce the estate uses, plus the model's own baked colour/normal
// maps so mottling and relief read in the lightless scene. See ExternalModel.
export function makeModelMatcap({ map = null, normalMap = null, normalScale = null } = {}) {
  const c = T.candle
  const stoneMatcap = getEstateMaterials().stone.matcap
  return makeEstateMatcap(stoneMatcap, ESTATE_LIGHTS, {
    warm: c.warm, range: c.range, strength: c.strength * 0.92,
    map, normalMap, normalScale,
  })
}

// --- floor treatments (matte tone matcaps + value-pattern shaders) ----------
// Tone matcaps for floors. Kept MATTE (soft key, no hot spec core) because a
// flat floor samples one matcap texel everywhere, so a glossy core would read
// as a fake uniform hotspot. Cached; canvas-generated, no shipped assets.
const _floorMatcaps = {}
function floorMatcap(kind) {
  if (_floorMatcaps[kind]) return _floorMatcaps[kind]
  const D = {
    walnut: { base: '#0a0806', mid: '#2a190e', highlight: '#6b4024', spec: '#9c6a3c', rim: '#1b140e', specR: 0.22, rimStrength: 0.4 },
    carpet: { base: '#0a0605', mid: '#36140f', highlight: '#79281f', spec: '#8a352a', rim: '#1a1210', specR: 0.5, rimStrength: 0.25 },
    marble: { base: '#0d0e11', mid: '#3c424a', highlight: '#b7bec6', spec: '#d8dde2', rim: '#2b3440', specR: 0.42, rimStrength: 0.4 },
    // neutral warm-grey matte: the rug pattern shader supplies the real colours,
    // so this only provides constant matte shading for the flat floor to multiply.
    wool: { base: '#0c0a08', mid: '#39332b', highlight: '#9c8f7e', spec: '#b6ab97', rim: '#211d17', specR: 0.46, rimStrength: 0.3 },
  }
  const t = makeMatcap(D[kind] || D.walnut)
  _floorMatcaps[kind] = t
  return t
}

// Build a floor material for a named treatment. `oak` reuses the estate oak
// matcap; the rest get their own matte tone matcap. The pattern is procedural
// (see floorBranchGLSL in estateMaterial.js). Not part of the singleton, so the
// caller must drive its uTime uniform (Hall does).
export function makeFloorMaterial(style) {
  const c = T.candle
  const cfg = {
    flagstone: { mc: 'stone', fs: 'flagstone' },
    oak: { mc: 'oak', fs: 'planks' },
    parquet: { mc: 'walnut', fs: 'parquet' },
    marble: { mc: 'marble', fs: 'marble' },
    carpet: { mc: 'carpet', fs: 'carpet' },
    rugmax: { mc: 'wool', fs: 'rugmax' },
    rugclean: { mc: 'wool', fs: 'rugclean' },
  }[style] || { mc: 'oak', fs: 'planks' }
  const base = getEstateMaterials()
  const tex = cfg.mc === 'stone' ? base.stone.matcap : cfg.mc === 'oak' ? base.oak.matcap : floorMatcap(cfg.mc)
  return makeEstateMatcap(tex, ESTATE_LIGHTS, {
    warm: c.warm, range: c.range, strength: c.strength * 0.78,
    floor: true, floorStyle: cfg.fs, runnerHalf: 2.0,
  })
}
