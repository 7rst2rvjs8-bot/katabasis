import React, { useMemo } from 'react'
import * as THREE from 'three'
import { getEstateMaterials } from '../render/estateMaterials.js'
import { Candle } from './Hall.jsx'
import { flutedColumnGeometry, archRingGeometry } from './geometry.js'
import {
  DESC_TOP_Z,
  DESC_LANDING_Y,
  DESC_BACK_Z,
  DESC_WALL_X,
  DESC_STEPS,
  DESC_RISE as RISE,
  DESC_RUN as RUN,
  DESC_STAIR_BOTTOM_Z as STAIR_BOTTOM_Z,
  DESC_BALCONY_Z as BALCONY_Z,
  DESCENT_CANDLES,
  NADIR_FLOOR_Y,
  ENABLE_NADIR_RETURN,
} from './layout.js'

// Zone II: a continuous descent into a vertiginous, impossible shaft falling to
// true black. Critiqued against Piranesi's Carceri: vertical void, bridges
// crossing at wrong angles, stairs that lead nowhere.
export default function Descent() {
  const mat = getEstateMaterials()
  const pendant = useMemo(() => flutedColumnGeometry({ height: 15, radius: 0.55 }), [])
  const escher = useMemo(() => Array.from({ length: 9 }, (_, i) => i), [])
  const farArch = useMemo(() => archRingGeometry({ ri: 4.6, ro: 6.2, depth: 1.8 }), [])

  return (
    <group>
      {/* grand descent stair, hall floor -> landing */}
      {Array.from({ length: DESC_STEPS }).map((_, i) => (
        <mesh key={'st' + i} position={[0, -(i + 0.5) * RISE, DESC_TOP_Z - (i + 0.5) * RUN]} material={mat.stone}>
          <boxGeometry args={[12, RISE, RUN + 0.03]} />
        </mesh>
      ))}
      {/* stair cheeks */}
      {[-6.4, 6.4].map((x, i) => (
        <mesh key={'ch' + i} position={[x, -6.2, (DESC_TOP_Z + STAIR_BOTTOM_Z) / 2]} rotation={[Math.atan2(RISE, RUN), 0, 0]} material={mat.stone}>
          <boxGeometry args={[1.4, 2.4, (DESC_STEPS * RUN) * 1.18]} />
        </mesh>
      ))}

      {/* landing floor (solid) up to the balcony edge */}
      <mesh position={[0, DESC_LANDING_Y - 0.4, (STAIR_BOTTOM_Z + BALCONY_Z) / 2]} material={mat.floor}>
        <boxGeometry args={[2 * DESC_WALL_X, 0.8, STAIR_BOTTOM_Z - BALCONY_Z + 0.5]} />
      </mesh>
      {/* low balustrade over the shaft. DEFAULT: one solid rail halts the walk at
          the void's edge (the strong, unresolved-depth ending). ARC: split to leave
          an offset-right opening where the stair down to the Nadir begins. */}
      {!ENABLE_NADIR_RETURN ? (
        <mesh position={[0, DESC_LANDING_Y + 0.6, BALCONY_Z]} material={mat.brass}>
          <boxGeometry args={[2 * DESC_WALL_X, 1.2, 0.6]} />
        </mesh>
      ) : (
        <>
          <mesh position={[-4.5, DESC_LANDING_Y + 0.6, BALCONY_Z]} material={mat.brass}>
            <boxGeometry args={[13, 1.2, 0.6]} />
          </mesh>
          <mesh position={[9.5, DESC_LANDING_Y + 0.6, BALCONY_Z]} material={mat.brass}>
            <boxGeometry args={[3, 1.2, 0.6]} />
          </mesh>
        </>
      )}

      {/* shaft walls: plunging from high above to deep below */}
      {[-DESC_WALL_X, DESC_WALL_X].map((x, i) => (
        <mesh key={'w' + i} position={[x, -16, (DESC_TOP_Z + DESC_BACK_Z) / 2]} material={mat.stone}>
          <boxGeometry args={[1.6, 64, DESC_TOP_Z - DESC_BACK_Z + 6]} />
        </mesh>
      ))}
      {/* back wall deep down the shaft. DEFAULT: one solid wall + a decorative brass
          arch set deep, reading as the shaft continuing into deeper black (the prior,
          stronger composition). ARC: pierced by a doorway (jambs + lintel) at the
          Nadir floor that leads through to the Return. */}
      {!ENABLE_NADIR_RETURN ? (
        <>
          <mesh position={[0, -30, DESC_BACK_Z]} material={mat.stone}>
            <boxGeometry args={[2 * DESC_WALL_X, 80, 1.4]} />
          </mesh>
          <mesh position={[0, -34, DESC_BACK_Z + 0.9]} geometry={farArch} material={mat.brass} />
        </>
      ) : (
        <>
          <mesh position={[-6.75, -30, DESC_BACK_Z]} material={mat.stone}>
            <boxGeometry args={[8.5, 80, 1.4]} />
          </mesh>
          <mesh position={[6.75, -30, DESC_BACK_Z]} material={mat.stone}>
            <boxGeometry args={[8.5, 80, 1.4]} />
          </mesh>
          <mesh position={[0, -6.375, DESC_BACK_Z]} material={mat.stone}>
            <boxGeometry args={[5, 32.75, 1.4]} />
          </mesh>
          <mesh position={[0, NADIR_FLOOR_Y + 0.5, DESC_BACK_Z + 0.9]} geometry={farArch} material={mat.stone} />
        </>
      )}

      {/* UNCANNY: bridges crossing the shaft, receding into the deep AHEAD of the
          arriving visitor, at and below eye level so the vertiginous scale reads
          on the forward eye-line, not only when you look down. */}
      {[
        [-2, BALCONY_Z - 4, 0.1, 0.03],
        [-8, BALCONY_Z - 13, -0.14, -0.04],
        [-16, BALCONY_Z - 22, 0.22, 0.03],
        [-25, BALCONY_Z - 31, -0.3, -0.05],
        [-34, BALCONY_Z - 40, 0.4, 0.04],
        // In the ARC, drop the deepest bridge (z~-93.8/y~-25) that landed dead on
        // the doorway eye-line. In the DEFAULT shaft there is no doorway, so keep
        // all five bridges receding into the deep (the prior composition).
      ].filter((b) => !ENABLE_NADIR_RETURN || b[1] > -90).map(([y, z, ry, rz], i) => (
        <mesh key={'br' + i} position={[0, y, z]} rotation={[0, ry, rz]} material={mat.stone}>
          <boxGeometry args={[2 * DESC_WALL_X + 7, 0.8, 2.3]} />
        </mesh>
      ))}

      {/* UNCANNY: pendant columns hanging from the dark, receding ahead, reaching
          no floor. An impossible colonnade folded into the shaft. */}
      {[
        [-6.5, -10, BALCONY_Z - 8],
        [6.5, -14, BALCONY_Z - 16],
        [0, -16, BALCONY_Z - 20],
        [-6.5, -20, BALCONY_Z - 28],
        [6.5, -25, BALCONY_Z - 38],
      ].filter((p) => p[2] > -94).map((p, i) => (
        <mesh key={'pd' + i} geometry={pendant} material={mat.stone} position={p} rotation={[Math.PI, 0, 0]} />
      ))}

      {/* UNCANNY: an Escher stair climbing a side wall to nowhere */}
      {escher.map((i) => (
        <mesh key={'es' + i} position={[-DESC_WALL_X + 1.4, -16 + i * 0.9, BALCONY_Z - 6 - i * 1.1]} rotation={[0, 0.25, 0]} material={mat.stone}>
          <boxGeometry args={[3.2, 0.45, 1.2]} />
        </mesh>
      ))}

      {/* dim candles of the descent (colder, sparser than the hall) */}
      {DESCENT_CANDLES.map((p, i) => (
        <Candle key={'dc' + i} position={p} intensity={0.3} />
      ))}
    </group>
  )
}
