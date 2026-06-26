import React, { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { flutedColumnGeometry, archRingGeometry, radialTexture } from './geometry.js'
import { getEstateMaterials, makeFloorMaterial } from '../render/estateMaterials.js'
import { BAYS, COL_X, COL_H, WALL_X, zNear, zFar, len, midZ, CANDLES } from './layout.js'
import { T } from '../render/treatments.js'
import { Candle, Sconce } from './detailKit.jsx'

const SPRING = COL_H // arches spring from the column tops
export { CANDLES }
// Candle now lives in the detail kit; re-export so existing callers (Descent, Nadir)
// keep importing it from Hall unchanged.
export { Candle }

export function useEstateMaterials() {
  return getEstateMaterials()
}

function Column({ x, z, mat }) {
  const shaft = useMemo(() => flutedColumnGeometry({ height: COL_H, radius: 0.7 }), [])
  return (
    <group position={[x, 0, z]}>
      {/* stepped base: wide plinth -> die -> chamfer step where the shaft springs */}
      <mesh position={[0, 0.18, 0]} material={mat.stone} castShadow>
        <boxGeometry args={[2.7, 0.36, 2.7]} />
      </mesh>
      <mesh position={[0, 0.62, 0]} material={mat.stone}>
        <boxGeometry args={[2.2, 0.6, 2.2]} />
      </mesh>
      <mesh position={[0, 1.02, 0]} material={mat.stone}>
        <boxGeometry args={[1.8, 0.28, 1.8]} />
      </mesh>
      {/* brass astragal ring at the shaft foot (small detail) */}
      <mesh position={[0, 1.22, 0]} material={mat.brass}>
        <cylinderGeometry args={[0.74, 0.74, 0.1, 20]} />
      </mesh>
      {/* fluted shaft */}
      <mesh position={[0, COL_H / 2 + 0.6, 0]} geometry={shaft} material={mat.stone} />
      {/* capital: brass necking ring -> gilt bell -> abacus slab */}
      <mesh position={[0, COL_H - 0.1, 0]} material={mat.brass}>
        <cylinderGeometry args={[0.7, 0.66, 0.16, 20]} />
      </mesh>
      <mesh position={[0, COL_H + 0.3, 0]} material={mat.gilt}>
        <boxGeometry args={[1.9, 0.8, 1.9]} />
      </mesh>
      <mesh position={[0, COL_H + 0.85, 0]} material={mat.gilt}>
        <boxGeometry args={[2.25, 0.3, 2.25]} />
      </mesh>
      {/* baked shadow disc under the column */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <ShadowMat />
      </mesh>
    </group>
  )
}

function ShadowMat() {
  const tex = useMemo(() => radialTexture({ inner: 'rgba(0,0,0,0.85)', outer: 'rgba(0,0,0,0)' }), [])
  return <meshBasicMaterial map={tex} transparent depthWrite={false} fog />
}

function TransverseArch({ z, mat }) {
  const geo = useMemo(() => archRingGeometry({ ri: COL_X - 0.2, ro: COL_X + 1.0, depth: 1.8 }), [])
  return <mesh position={[0, SPRING + 0.8, z]} geometry={geo} material={mat.stone} />
}

export default function Hall({ floorStyle = null, rugVariant = 'rugmax' }) {
  const mat = useEstateMaterials()
  // floor treatment A/B (?floor=oak|parquet|marble|runner). Default null keeps
  // the shipped flagstone (mat.floor). A 'runner' is oak planks + a raised
  // matte-wool runner slab down the centre (real geometry edge), carrying the
  // procedural Persian/Savonnerie rug pattern (rugVariant: rugmax | rugclean).
  const floorMat = useMemo(
    () => (floorStyle ? makeFloorMaterial(floorStyle === 'runner' ? 'oak' : floorStyle) : null),
    [floorStyle],
  )
  const runnerMat = useMemo(() => (floorStyle === 'runner' ? makeFloorMaterial(rugVariant) : null), [floorStyle, rugVariant])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    for (const k in mat) mat[k].userData.uniforms.uTime.value = t
    if (floorMat) floorMat.userData.uniforms.uTime.value = t
    if (runnerMat) runnerMat.userData.uniforms.uTime.value = t
  })
  const farArch = useMemo(() => archRingGeometry({ ri: 6.2, ro: 8.2, depth: 2.6 }), [])
  const pendant = useMemo(() => flutedColumnGeometry({ height: 11, radius: 0.6 }), [])

  return (
    <group>
      {/* floor (ends at the far arch where the descent begins) */}
      <mesh position={[0, 0, 4.5]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat || mat.floor}>
        <planeGeometry args={[2 * WALL_X, 69]} />
      </mesh>
      {/* centre runner: a thin raised matte-carpet slab (visual only, no collider) */}
      {runnerMat && (
        <mesh position={[0, 0.05, 4.5]} material={runnerMat}>
          <boxGeometry args={[4.0, 0.06, 60]} />
        </mesh>
      )}

      {/* enclosing outer walls rising into darkness */}
      <mesh position={[-WALL_X, 12, midZ]} material={mat.stone}>
        <boxGeometry args={[1.6, 40, len + 16]} />
      </mesh>
      <mesh position={[WALL_X, 12, midZ]} material={mat.stone}>
        <boxGeometry args={[1.6, 40, len + 16]} />
      </mesh>

      {/* pilaster strips on the walls for rhythm + density */}
      {BAYS.map((z, i) => (
        <group key={'p' + i}>
          <mesh position={[-WALL_X + 0.9, 9, z]} material={mat.stone}>
            <boxGeometry args={[0.7, 18, 1.6]} />
          </mesh>
          <mesh position={[WALL_X - 0.9, 9, z]} material={mat.stone}>
            <boxGeometry args={[0.7, 18, 1.6]} />
          </mesh>
        </group>
      ))}

      {/* colonnade + arches */}
      {BAYS.map((z, i) => (
        <group key={i}>
          <Column x={-COL_X} z={z} mat={mat} />
          <Column x={COL_X} z={z} mat={mat} />
          <TransverseArch z={z} mat={mat} />
        </group>
      ))}

      {/* entablature beams + a bed molding below and a projecting cornice course
          above, so a horizontal trim rhythm reads along the colonnade tops */}
      {[-COL_X, COL_X].map((cx, i) => (
        <group key={'ent' + i}>
          <mesh position={[cx, COL_H + 1.0, midZ]} material={mat.stone}>
            <boxGeometry args={[2.4, 1.4, len]} />
          </mesh>
          <mesh position={[cx, COL_H + 0.25, midZ]} material={mat.stone}>
            <boxGeometry args={[2.7, 0.18, len]} />
          </mesh>
          <mesh position={[cx, COL_H + 1.85, midZ]} material={mat.stone}>
            <boxGeometry args={[2.9, 0.3, len]} />
          </mesh>
        </group>
      ))}

      {/* grand far archway framing the descent into Zone II */}
      <mesh position={[0, 0.5, zFar - 4]} geometry={farArch} material={mat.brass} />

      {/* UNCANNY: bridges crossing the void above, half-lost in fog, slightly
          askew so the space reads a touch wrong. Piranesi Carceri verticality. */}
      <mesh position={[0, 21.5, 12]} rotation={[0, 0, 0.015]} material={mat.stone}>
        <boxGeometry args={[2 * WALL_X, 0.8, 3.2]} />
      </mesh>
      <mesh position={[0, 25.5, -8]} rotation={[0, 0.14, -0.02]} material={mat.stone}>
        <boxGeometry args={[2 * WALL_X + 4, 0.8, 2.6]} />
      </mesh>

      {/* UNCANNY: pendant columns hanging from the dark, never reaching the
          floor. An impossible colonnade folded above the descent. */}
      {[
        [-COL_X, 18, -16],
        [COL_X, 16, -22],
        [0, 20, zFar - 8],
      ].map((p, i) => (
        <mesh key={'pend' + i} geometry={pendant} material={mat.stone} position={p} rotation={[Math.PI, 0, 0]} />
      ))}

      {/* candlelight along the colonnade, now mounted as column sconces (bracket +
          gilt cup) so each flame reads as a fixture, not a floating orb. Same points
          the bounce shader reads. The sconce mounts toward the column (outward). */}
      {CANDLES.map((p, i) => (
        <Sconce key={'c' + i} position={p} side={Math.sign(p[0])} />
      ))}
    </group>
  )
}
