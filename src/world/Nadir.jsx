import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getEstateMaterials } from '../render/estateMaterials.js'
import { Candle } from './Hall.jsx'
import { radialTexture, archRingGeometry } from './geometry.js'
import {
  DESC_LANDING_Y,
  DESC_WALL_X,
  DESC_BACK_Z,
  NADIR_RISE,
  NADIR_RUN,
  NADIR_STEPS,
  NADIR_STAIR_X,
  NADIR_STAIR_HALF_W,
  NADIR_STAIR_TOP_Z,
  NADIR_FLOOR_Y,
  NADIR_Z_FRONT,
  NADIR_Z_BACK,
  NADIR_CEIL_Y,
  RETURN_OPEN,
  RETURN_Z_THRESH,
  RETURN_HALF_W,
  RETURN_STEPS,
  RETURN_RISE,
  RETURN_RUN,
  RETURN_GLOW,
  DEST_Z_FRONT,
  DEST_Z_BACK,
  DEST_HALF_W,
  DEST_FLOOR_Y,
  DEST_APERTURE_HW,
} from './layout.js'

// The Nadir + the first threshold of the Return: the bottom of the arc and the
// turn back toward light. Built procedurally, inside the matcap/no-lights world.
// The Nadir is severe bare stone under a low brow; the Return beyond the doorway
// is pale (Register 3) and rises, with a SINGLE amber-gold glow as the light you
// return toward (an additive sprite, so it reads through fog from the dark).

function ReturnGlow({ position = RETURN_GLOW, base = 2.6, opacity = 0.34 }) {
  const ref = useRef()
  // tighter hot core (inner stop 0.18) so the bright centre is smaller -> reads as
  // a point of light masked by surrounding geometry, not a free-floating blob.
  const tex = useMemo(() => radialTexture({ inner: 'rgba(255,206,150,1)', outer: 'rgba(255,168,86,0)', stop: 0.18 }), [])
  useFrame((s) => {
    if (!ref.current) return
    const f = 0.94 + 0.06 * Math.sin(s.clock.elapsedTime * 1.6) // steady, breathing faintly
    ref.current.scale.setScalar(base * f)
  })
  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial map={tex} color={'#eebe78'} blending={THREE.AdditiveBlending} transparent depthWrite={false} opacity={opacity} />
    </sprite>
  )
}

// A baked AO-style contact disc to seat pale masses on the pale floor (the Hall
// grounds its columns the same way). Dark radial falloff, fogged, no depth write.
function ContactDisc({ position, radius = 2.0 }) {
  const tex = useMemo(() => radialTexture({ inner: 'rgba(0,0,0,0.5)', outer: 'rgba(0,0,0,0)' }), [])
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} fog />
    </mesh>
  )
}

// CONTAINMENT THRESHOLD (the default ending). The grand doorway at the back of the
// Nadir is sealed to a single narrow vertical slit; far behind it one dim amber
// glow shows through the dark - a restrained, occluded sign of return, deliberately
// NOT a walkable room. Darkness and concealment do the work the weak pale geometry
// could not. The brass arch (Descent) still frames it, now reading as a sealed
// threshold with only a sliver of light beyond.
function ContainedThreshold({ mat }) {
  const slitHalf = 0.18
  const openHalf = 2.5 // doorway opening half-width (Descent back-wall jambs)
  const panelHalf = (openHalf - slitHalf) / 2
  const panelX = slitHalf + panelHalf
  const yC = NADIR_FLOOR_Y + 2.125 // centre of the 4.25-tall opening (-27 .. -22.75)
  return (
    <group>
      {/* two heavy stone panels sealing the opening, leaving the central slit */}
      {[-panelX, panelX].map((x, i) => (
        <mesh key={'sp' + i} position={[x, yC, RETURN_Z_THRESH]} material={mat.stone}>
          <boxGeometry args={[2 * panelHalf, 4.4, 1.4]} />
        </mesh>
      ))}
      {/* shallow stone reveal jambs giving the slit real depth (a deep cut, not a
          painted line), so it reads as concealment rather than a gap */}
      {[-(slitHalf + 0.12), slitHalf + 0.12].map((x, i) => (
        <mesh key={'sr' + i} position={[x, yC, RETURN_Z_THRESH - 0.9]} material={mat.stone}>
          <boxGeometry args={[0.24, 4.0, 0.8]} />
        </mesh>
      ))}
      {/* the distant, occluded glow beyond the slit: deliberately DIM and set far
          back so it stays a warm amber point (never a white bloom / heaven light)
          and the slit crops it. Kept under the global bloom knee so it reads as the
          single earned amber accent, glimpsed through the dark. */}
      <ReturnGlow position={[0, yC - 0.3, RETURN_Z_THRESH - 11]} base={1.5} opacity={0.28} />
    </group>
  )
}

export default function Nadir() {
  const mat = getEstateMaterials()
  const midZ = (NADIR_Z_FRONT + NADIR_Z_BACK) / 2
  const destMidZ = (DEST_Z_FRONT + DEST_Z_BACK) / 2
  // Nested arch ORDERS (the Hall's voussoir vocabulary, translated to pale): two
  // at the doorway threshold (so the glimpse from the dark reads as layered pale
  // architecture) and three at the destination mouth (replacing the single giant
  // arch that read as a primitive blockout). Alternating pale / paleDark orders
  // make the recession between rings read as real dark reveals.
  const thrA = useMemo(() => archRingGeometry({ ri: 2.7, ro: 3.6, depth: 1.0 }), [])
  const thrB = useMemo(() => archRingGeometry({ ri: 2.4, ro: 3.2, depth: 1.0 }), [])
  const mouthA = useMemo(() => archRingGeometry({ ri: 3.3, ro: 4.3, depth: 0.9 }), [])
  const mouthB = useMemo(() => archRingGeometry({ ri: 3.0, ro: 3.9, depth: 0.9 }), [])
  const mouthC = useMemo(() => archRingGeometry({ ri: 2.7, ro: 3.5, depth: 0.9 }), [])
  const panelHW = (DEST_HALF_W - DEST_APERTURE_HW) / 2 // half-width of each back-wall panel
  const panelX = DEST_APERTURE_HW + panelHW // centre x of each panel

  return (
    <group>
      {/* second stair: landing -> Nadir floor, offset right of centre */}
      {Array.from({ length: NADIR_STEPS }).map((_, i) => (
        <mesh
          key={'ns' + i}
          position={[NADIR_STAIR_X, DESC_LANDING_Y - (i + 0.5) * NADIR_RISE, NADIR_STAIR_TOP_Z - (i + 0.5) * NADIR_RUN]}
          material={mat.stone}
        >
          <boxGeometry args={[2 * NADIR_STAIR_HALF_W, NADIR_RISE, NADIR_RUN + 0.03]} />
        </mesh>
      ))}

      {/* Nadir floor: bare heavy stone (not the rug), full shaft width */}
      <mesh position={[0, NADIR_FLOOR_Y - 0.4, midZ]} material={mat.stone}>
        <boxGeometry args={[2 * DESC_WALL_X, 0.8, NADIR_Z_FRONT - NADIR_Z_BACK + 0.5]} />
      </mesh>

      {/* low heavy brow at the chamber mouth: compression, not a sealing ceiling
          (the vertiginous void still towers overhead). Visual only, no collider. */}
      <mesh position={[0, NADIR_CEIL_Y, NADIR_Z_FRONT]} material={mat.stone}>
        <boxGeometry args={[2 * DESC_WALL_X, 2.5, 1.6]} />
      </mesh>

      {/* four squat heavy piers: severity, and something to move among */}
      {[
        [-8, -83], [8, -83], [-8, -90], [8, -90],
      ].map(([x, z], i) => (
        <mesh key={'pi' + i} position={[x, NADIR_FLOOR_Y + 2.5, z]} material={mat.stone}>
          <boxGeometry args={[1.8, 5, 1.8]} />
        </mesh>
      ))}

      {/* a single guttering candle to read the inscription by; cold and final */}
      <Candle position={[-3, NADIR_FLOOR_Y + 1.6, -84]} intensity={0.22} />

      {/* DEFAULT ENDING: a sealed threshold with a distant occluded glow. */}
      {!RETURN_OPEN && <ContainedThreshold mat={mat} />}

      {/* The full walkable pale Return (rising passage + destination room) is
          PRESERVED below but disabled by default: it read as primitive white-box
          blockout in gray-white fog and was rejected. Flip RETURN_OPEN (layout.js)
          to restore it. This is a containment, not a final Return. */}
      {RETURN_OPEN && (<>
      {/* --- THE RETURN: pale rising threshold beyond the back-wall doorway --- */}
      {/* rising steps (anabasis) into near-white. Box height (2.0) only seals the
          under-stair; the visible riser is always RETURN_RISE because the tread in
          front occludes the rest. So the steps read as TREADS (not a ramp) from the
          wider pale matcap (bright up-face vs mid riser) plus a paleDark nosing line
          under each tread lip. Mesh top stays at NADIR_FLOOR_Y + j*RISE = collider
          top, so walkability is untouched. */}
      {Array.from({ length: RETURN_STEPS }).map((_, j) => {
        const top = NADIR_FLOOR_Y + j * RETURN_RISE
        const front = RETURN_Z_THRESH - j * RETURN_RUN + 0.025 // tread front edge (+z)
        return (
          <group key={'rs' + j}>
            <mesh position={[0, top - 1.0, RETURN_Z_THRESH - (j + 0.5) * RETURN_RUN]} material={mat.pale}>
              <boxGeometry args={[2 * RETURN_HALF_W, 2.0, RETURN_RUN + 0.05]} />
            </mesh>
            {/* paleDark riser facing over the visible RETURN_RISE of each step: a
                bright pale tread alternating with a dark riser = unambiguous treads
                + counted scale (not a pale ramp). Visual only; collider untouched. */}
            {j > 0 && (
              <mesh position={[0, top - RETURN_RISE / 2, front + 0.04]} material={mat.paleDark}>
                <boxGeometry args={[2 * RETURN_HALF_W, RETURN_RISE, 0.06]} />
              </mesh>
            )}
          </group>
        )
      })}
      {/* pale side walls framing the rising Return; far ends dissolve in fog */}
      {[-RETURN_HALF_W, RETURN_HALF_W].map((x, i) => (
        <mesh key={'rw' + i} position={[x, NADIR_FLOOR_Y + 5, (RETURN_Z_THRESH - 14)]} material={mat.pale}>
          <boxGeometry args={[0.8, 12, 14]} />
        </mesh>
      ))}
      {/* nested pale threshold orders just past the doorway: the glimpse from the
          dark Nadir now reads as layered pale architecture receding toward the
          glow, not a bare bright block. Both sit at z<-94 so the Nadir stays black
          (the glow centred between them). */}
      <mesh geometry={thrA} material={mat.pale} position={[0, NADIR_FLOOR_Y, -94.4]} />
      <mesh geometry={thrB} material={mat.paleDark} position={[0, NADIR_FLOOR_Y + 0.2, -96.6]} />
      <ReturnGlow />

      {/* --- THE RETURN DESTINATION: a compact pale landing to stand in --- */}
      {/* destination mouth: three nested arch orders (pale / paleDark / pale) so the
          opening reads as a layered, receding threshold instead of one giant ring */}
      <mesh geometry={mouthA} material={mat.pale} position={[0, DEST_FLOOR_Y, DEST_Z_FRONT]} />
      <mesh geometry={mouthB} material={mat.paleDark} position={[0, DEST_FLOOR_Y, DEST_Z_FRONT - 1.3]} />
      <mesh geometry={mouthC} material={mat.pale} position={[0, DEST_FLOOR_Y, DEST_Z_FRONT - 2.6]} />
      {/* landing floor: large pale ashlar slabs (value-only seams) so the ground
          reads scale + grounding instead of a featureless plane */}
      <mesh position={[0, DEST_FLOOR_Y - 0.4, destMidZ]} material={mat.paleFloor}>
        <boxGeometry args={[2 * DEST_HALF_W, 0.8, DEST_Z_FRONT - DEST_Z_BACK]} />
      </mesh>
      {/* side walls, tall, dissolving up into light, articulated into base / shaft
          / impost registers with a shallow pilaster rhythm: the Hall's severe
          colonnade vocabulary translated to Register 3, so the walls read as built
          stone (with a human-height datum for scale) instead of plain pale slabs */}
      {[-DEST_HALF_W, DEST_HALF_W].map((x, i) => {
        // proud of the wall face toward the room, but the inner face (inX - 0.25)
        // must clear the camera's max reach: dest side collider inner face 5.6 -
        // capsule radius 0.35 = camera |x| up to 5.25, so keep inX - 0.25 >= 5.45.
        const inX = x - Math.sign(x) * 0.3
        return (
          <React.Fragment key={'dw' + i}>
            <mesh position={[x, DEST_FLOOR_Y + 7, destMidZ]} material={mat.pale}>
              <boxGeometry args={[0.8, 16, DEST_Z_FRONT - DEST_Z_BACK]} />
            </mesh>
            {/* paleDark plinth course at the foot */}
            <mesh position={[inX, DEST_FLOOR_Y + 0.5, destMidZ]} material={mat.paleDark}>
              <boxGeometry args={[0.5, 1.0, DEST_Z_FRONT - DEST_Z_BACK]} />
            </mesh>
            {/* pale impost band at human height (the scale datum) */}
            <mesh position={[inX, DEST_FLOOR_Y + 2.7, destMidZ]} material={mat.pale}>
              <boxGeometry args={[0.55, 0.4, DEST_Z_FRONT - DEST_Z_BACK]} />
            </mesh>
            {/* two shallow pilaster strips for bay rhythm */}
            {[-111, -117].map((z, k) => (
              <mesh key={'dp' + k} position={[inX, DEST_FLOOR_Y + 3.2, z]} material={mat.pale}>
                <boxGeometry args={[0.5, 5.4, 0.9]} />
              </mesh>
            ))}
          </React.Fragment>
        )
      })}
      {/* high far wall, split to leave one vertical aperture */}
      {[-panelX, panelX].map((x, i) => (
        <mesh key={'db' + i} position={[x, DEST_FLOOR_Y + 8.5, DEST_Z_BACK]} material={mat.pale}>
          <boxGeometry args={[2 * panelHW, 19, 0.8]} />
        </mesh>
      ))}

      {/* --- the aperture as a recessed light-WELL, not a flush clear-colour gap.
          Previously the slot showed the near-white fog clear-colour at full
          brightness -> a blown bloom bar. Now: a pale backstop deep behind the
          slot shows lit stone (below the bloom knee); paleDark jamb/head reveals
          recessed BEHIND the wall face frame it as a deep window; a thin pale
          mullion splits the bar in two. The far-wall collider stays solid and
          full-width (look-through only, not a doorway). --- */}
      <mesh position={[0, DEST_FLOOR_Y + 4, DEST_Z_BACK - 3]} material={mat.pale}>
        <boxGeometry args={[2.2, 13, 0.6]} />
      </mesh>
      {[-0.95, 0.95].map((x, i) => (
        <mesh key={'aj' + i} position={[x, DEST_FLOOR_Y + 3, DEST_Z_BACK - 0.4]} material={mat.paleDark}>
          <boxGeometry args={[0.7, 9, 1.6]} />
        </mesh>
      ))}
      <mesh position={[0, DEST_FLOOR_Y + 6.6, DEST_Z_BACK - 0.4]} material={mat.paleDark}>
        <boxGeometry args={[2.6, 0.8, 1.6]} />
      </mesh>
      <mesh position={[0, DEST_FLOOR_Y + 2.6, DEST_Z_BACK - 0.2]} material={mat.pale}>
        <boxGeometry args={[0.12, 8, 0.5]} />
      </mesh>

      {/* grounding: dark contact discs seat the landing masses; a dark seam line
          where each side wall meets the level destination floor */}
      <ContactDisc position={[0, DEST_FLOOR_Y + 0.04, -114]} radius={1.8} />
      {[-4.7, 4.7].map((x, i) => (
        <React.Fragment key={'dg' + i}>
          <ContactDisc position={[x, DEST_FLOOR_Y + 0.04, DEST_Z_FRONT - 3]} radius={1.7} />
          <ContactDisc position={[x, DEST_FLOOR_Y + 0.04, DEST_Z_BACK + 3]} radius={1.7} />
          <mesh position={[x + (x > 0 ? -0.45 : 0.45), DEST_FLOOR_Y + 0.06, destMidZ]} material={mat.paleDark}>
            <boxGeometry args={[0.5, 0.12, DEST_Z_FRONT - DEST_Z_BACK - 0.5]} />
          </mesh>
        </React.Fragment>
      ))}
      </>)}
    </group>
  )
}
