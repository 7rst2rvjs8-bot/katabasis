import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { flutedColumnGeometry, archRingGeometry, radialTexture } from './geometry.js'
import { getEstateMaterials, makeFloorMaterial } from '../render/estateMaterials.js'
import { BAYS, COL_X, COL_H, WALL_X, zNear, zFar, len, midZ, CANDLES } from './layout.js'
import { T } from '../render/treatments.js'
import { REDUCED } from '../util/env.js'

const FLICK = REDUCED ? 0.25 : 1 // dampen sway/flicker under reduced-motion
const SPRING = COL_H // arches spring from the column tops
export { CANDLES }

export function useEstateMaterials() {
  return getEstateMaterials()
}

function Column({ x, z, mat }) {
  const shaft = useMemo(() => flutedColumnGeometry({ height: COL_H, radius: 0.7 }), [])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.45, 0]} material={mat.stone} castShadow>
        <boxGeometry args={[2.2, 0.9, 2.2]} />
      </mesh>
      <mesh position={[0, COL_H / 2 + 0.6, 0]} geometry={shaft} material={mat.stone} />
      <mesh position={[0, COL_H + 0.35, 0]} material={mat.gilt}>
        <boxGeometry args={[2.0, 0.9, 2.0]} />
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

export function Candle({ position, intensity = 1 }) {
  const ref = useRef()
  const core = useRef()
  const tex = useMemo(() => radialTexture({ inner: 'rgba(255,196,120,1)', outer: 'rgba(255,150,60,0)' }), [])
  const ctex = useMemo(() => radialTexture({ inner: 'rgba(255,240,210,1)', outer: 'rgba(255,200,120,0)' }), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const f = 0.82 + FLICK * (0.14 * Math.sin(t * 9 + position[0] * 3) + 0.06 * Math.sin(t * 23.3 + position[2]))
    if (ref.current) {
      ref.current.scale.setScalar(3.0 * f * (0.6 + 0.4 * intensity))
      ref.current.material.opacity = 0.85 * f * intensity
    }
    if (core.current) {
      core.current.scale.setScalar(0.7 * f)
      core.current.material.opacity = f * intensity
    }
  })
  return (
    <group position={position}>
      <sprite ref={ref}>
        <spriteMaterial map={tex} color={'#ffce86'} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
      </sprite>
      <sprite ref={core}>
        <spriteMaterial map={ctex} color={'#fff2d6'} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
      </sprite>
    </group>
  )
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

      {/* entablature beams along both colonnades */}
      <mesh position={[-COL_X, COL_H + 1.0, midZ]} material={mat.stone}>
        <boxGeometry args={[2.4, 1.4, len]} />
      </mesh>
      <mesh position={[COL_X, COL_H + 1.0, midZ]} material={mat.stone}>
        <boxGeometry args={[2.4, 1.4, len]} />
      </mesh>

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

      {/* candlelight along the colonnade (same points the bounce shader reads) */}
      {CANDLES.map((p, i) => (
        <Candle key={'c' + i} position={p} />
      ))}
    </group>
  )
}
