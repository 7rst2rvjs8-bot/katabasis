// Shared estate layout. Visuals (Hall) and primitive colliders (Colliders) both
// read these so the collision shells track the architecture.
export const BAYS = [28, 20, 12, 4, -4, -12, -20]
export const COL_X = 6.4
export const COL_H = 16
export const WALL_X = COL_X + 4.4
export const zNear = BAYS[0] + 6
export const zFar = BAYS[BAYS.length - 1] - 6
export const len = zNear - zFar
export const midZ = (zNear + zFar) / 2

export const CANDLES = BAYS.flatMap((z) => [
  [-COL_X + 1.5, 5.5, z],
  [COL_X - 1.5, 5.5, z],
])

export const SPAWN = [0, 1.0, zNear - 2] // capsule centre; eye is offset up in Player

// --- Zone II: The Descent. A continuous grand stair from the hall floor (y=0,
// z~-30) down to a deep landing, then a balcony over an impossible vertical
// shaft falling to true black. ---
export const DESC_TOP_Z = zFar - 4 // grand stair begins at the far arch
export const DESC_LANDING_Y = -12
export const DESC_LANDING_Z = -56
export const DESC_BACK_Z = -94 // deep: the shaft recedes ahead so scale reads on the level eye-line
export const DESC_WALL_X = 11
export const DESC_STEPS = 16
export const DESC_RISE = 0.75
export const DESC_RUN = 1.3
export const DESC_STAIR_BOTTOM_Z = DESC_TOP_Z - DESC_STEPS * DESC_RUN
export const DESC_BALCONY_Z = DESC_STAIR_BOTTOM_Z - 12

// dim candles for the descent (deeper, sparser than the hall)
export const DESCENT_CANDLES = [
  [-7.5, DESC_LANDING_Y + 4.5, DESC_LANDING_Z + 4],
  [7.5, DESC_LANDING_Y + 4.5, DESC_LANDING_Z + 4],
  [-3.5, -3.5, -40],
  [3.5, -7.5, -47],
  [0, DESC_LANDING_Y + 3, DESC_LANDING_Z + 1],
]

// --- The Nadir + the Return (the bottom of the arc and the turn back). The
// descent shaft now resolves at the bottom into a low, severe stone chamber
// (the Nadir, Chapter III); beyond its back-wall doorway is the first threshold
// of the Return (Chapter IV): a pale space rising toward light. A second stair,
// OFFSET RIGHT so the central balcony still stops the straight-ahead walk,
// drops from the landing into the Nadir. ---
export const NADIR_RISE = 0.75 // matches the proven grand-stair step height
export const NADIR_RUN = 0.8
export const NADIR_STEPS = 21
export const NADIR_STAIR_X = 5 // offset to the right of centre
export const NADIR_STAIR_HALF_W = 3
export const NADIR_STAIR_TOP_Z = DESC_BALCONY_Z // begins at the balcony edge
export const NADIR_FLOOR_Y = DESC_LANDING_Y - (NADIR_STEPS - 1) * NADIR_RISE // -27, flush with the last step top
export const NADIR_Z_FRONT = NADIR_STAIR_TOP_Z - NADIR_STEPS * NADIR_RUN // -79.6
export const NADIR_Z_BACK = DESC_BACK_Z + 1 // -93, just shy of the back wall
export const NADIR_CEIL_Y = NADIR_FLOOR_Y + 4.25 // heavy low brow, not a seal
export const NADIR_DOOR_HALF_W = 2.5 // doorway through the back wall to the Return

// EXPERIMENT FLAG. The entire Nadir/Return arc (Chapters III-IV) did not reach an
// acceptable visual bar and is REJECTED as a default experience. It is preserved
// but renders ONLY with ?arc=nadir, so the default route is the strongest
// presentable path: Hall -> Descent shaft into darkness (unresolved depth). When
// false: no Nadir, no Return, no sealed threshold; the Descent keeps its solid
// balustrade + solid back wall (the prior, stronger composition).
export const ENABLE_NADIR_RETURN = (() => {
  try {
    return new URLSearchParams(window.location.search).get('arc') === 'nadir'
  } catch {
    return false
  }
})()

// RAIL FLAG. The real turned baluster.glb is now the DEFAULT landing rail (it reads
// far better than the old primitive boxes; see docs/ART_REFERENCE_AUDIT.md). The
// glb only loads on the default Hall->Descent route (not in ?arc=nadir, which uses
// the split brass balustrade). ?rails=boxes forces the old box rail (rollback/debug).
export const RAILS_BOXES = (() => {
  try {
    return new URLSearchParams(window.location.search).get('rails') === 'boxes'
  } catch {
    return false
  }
})()

// CONTAINMENT FLAG (sub-flag of the arc above; only meaningful when the arc is on).
// The walkable pale Return room (rising passage + destination)
// read as primitive white-box blockout and was rejected. It is PRESERVED in the
// code but disabled by default: when false, the doorway is sealed to a narrow
// slit with a distant occluded glow beyond (a restrained threshold, not a room).
// Flip to true to restore the full walkable Return (and its colliders/lectern4).
export const RETURN_OPEN = false

// The Return: beyond the back wall (z < DESC_BACK_Z), a pale rising threshold.
export const RETURN_Z_THRESH = DESC_BACK_Z // -94
export const RETURN_Z_BACK = -108
export const RETURN_HALF_W = 5
export const RETURN_STEPS = 7
export const RETURN_RISE = 0.68 // gentle (anabasis), under the controller step
export const RETURN_RUN = 2.0
export const RETURN_GLOW = [0, NADIR_FLOOR_Y + 3.5, -100.5] // the one amber-gold accent / the light glimpsed from the dark

// The Return destination: one compact pale landing beyond the rising steps. The
// first place to stand after returning. Severe, not triumphant: pale stone, a
// severe arch at the mouth, a high wall dissolving up into light, one vertical
// aperture. Chapter IV resolves here.
export const DEST_Z_FRONT = RETURN_Z_BACK // -108, where the rising steps end
export const DEST_Z_BACK = -120
export const DEST_HALF_W = 6
export const DEST_FLOOR_Y = NADIR_FLOOR_Y + (RETURN_STEPS - 1) * RETURN_RISE // flush with the last step
export const DEST_APERTURE_HW = 0.6 // half-width of the vertical light slot in the far wall

// All estate lights. Every fake-bounce material reads this so candlelight is
// continuous across the descent (one shader loop, N kept modest).
export const ESTATE_LIGHTS = [...CANDLES, ...DESCENT_CANDLES]
