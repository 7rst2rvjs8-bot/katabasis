import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { flutedColumnGeometry, archRingGeometry, radialTexture } from './geometry.js'
import { makeMatcapSet } from '../render/matcaps.js'
import { makeEstateMatcap } from '../render/estateMaterial.js'

const BAYS = [28, 20, 12, 4, -4, -12, -20] // z of each bay, receding
const COL_X = 6.4
const COL_H = 16
const SPRING = COL_H // arches spring from the column tops

// Candle points: two per bay, mid-height. Shared by the glow sprites AND the
// fake-bounce material so flames actually pool light onto the architecture.
export const CANDLES = BAYS.flatMap((z) => [
  [-COL_X + 1.5, 5.5, z],
  [COL_X - 1.5, 5.5, z],
])

export function useEstateMaterials() {
  return useMemo(() => {
    const set = makeMatcapSet()
    return {
      stone: makeEstateMatcap(set.stone, CANDLES, { range: 7.0, strength: 2.4 }),
      oak: makeEstateMatcap(set.oak, CANDLES, { range: 7.0, strength: 2.8 }),
      brass: makeEstateMatcap(set.brass, CANDLES, { range: 9.0, strength: 3.0 }),
      gilt: makeEstateMatcap(set.gilt, CANDLES, { range: 8.0, strength: 3.0 }),
      floor: makeEstateMatcap(set.stone, CANDLES, { range: 7.0, strength: 2.0, floor: true }),
    }
  }, [])
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

function Candle({ position }) {
  const ref = useRef()
  const core = useRef()
  const tex = useMemo(() => radialTexture({ inner: 'rgba(255,196,120,1)', outer: 'rgba(255,150,60,0)' }), [])
  const ctex = useMemo(() => radialTexture({ inner: 'rgba(255,240,210,1)', outer: 'rgba(255,200,120,0)' }), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const f = 0.82 + 0.14 * Math.sin(t * 9 + position[0] * 3) + 0.06 * Math.sin(t * 23.3 + position[2])
    if (ref.current) {
      ref.current.scale.setScalar(3.0 * f)
      ref.current.material.opacity = 0.85 * f
    }
    if (core.current) {
      core.current.scale.setScalar(0.7 * f)
      core.current.material.opacity = f
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

export default function Hall() {
  const mat = useEstateMaterials()
  useFrame((s) => {
    const t = s.clock.elapsedTime
    for (const k in mat) mat[k].userData.uniforms.uTime.value = t
  })
  const zNear = BAYS[0] + 6
  const zFar = BAYS[BAYS.length - 1] - 6
  const len = zNear - zFar
  const midZ = (zNear + zFar) / 2

  const farArch = useMemo(() => archRingGeometry({ ri: 6.2, ro: 8.2, depth: 2.6 }), [])
  const WALL_X = COL_X + 4.4
  const steps = useMemo(() => Array.from({ length: 12 }, (_, i) => i), [])

  return (
    <group>
      {/* flagstone floor */}
      <mesh position={[0, 0, midZ]} rotation={[-Math.PI / 2, 0, 0]} material={mat.floor}>
        <planeGeometry args={[2 * WALL_X, len + 30]} />
      </mesh>

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

      {/* descent stair beyond the far arch, dropping into the dark */}
      {steps.map((i) => (
        <mesh key={'s' + i} position={[0, -0.5 - i * 0.75, zFar - 6 - i * 1.7]} material={mat.stone}>
          <boxGeometry args={[10 - i * 0.2, 0.75, 1.8]} />
        </mesh>
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

      {/* grand far archway framing the descent */}
      <mesh position={[0, 0.5, zFar - 4]} geometry={farArch} material={mat.brass} />
      {/* threshold floor beyond, dropping into dark */}
      <mesh position={[0, -1.5, zFar - 14]} rotation={[-Math.PI / 2, 0, 0]} material={mat.stone}>
        <planeGeometry args={[18, 18]} />
      </mesh>

      {/* candlelight along the colonnade (same points the bounce shader reads) */}
      {CANDLES.map((p, i) => (
        <Candle key={'c' + i} position={p} />
      ))}
    </group>
  )
}
