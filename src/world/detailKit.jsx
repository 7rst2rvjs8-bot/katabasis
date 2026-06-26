import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { getEstateMaterials, makeModelMatcap } from '../render/estateMaterials.js'
import { DRACO_PATH, getKTX2, setRenderer } from '../render/loaders.js'
import { radialTexture } from './geometry.js'
import { REDUCED } from '../util/env.js'

// Reusable procedural detail kit: the medium/small layer that turns macro blockout
// into authored architecture. Matcap-only (no real lights, no PBR, no normal maps);
// density comes from geometry, silhouette, value, and controlled additive glow.
// Every glow is a Candle anchored by a fixture (Sconce / FlameCup) so nothing reads
// as a naked orb floating in space.

const FLICK = REDUCED ? 0.25 : 1 // dampen flicker under reduced-motion

// The flame: two additive sprites (soft warm pool + tight bright core), guttering.
// Moved here from Hall so fixtures can compose it; re-exported by Hall for callers.
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

// Wall/column sconce: a stone backplate + brass bracket arm + diagonal brace + a
// gilt flame-cup, with the flame seated in the cup. `side` (+1/-1) is the direction
// from the flame toward the wall it mounts on, so the bracket reaches back to it.
// The cup occludes the lower flame so the glow reads as held, not floating.
export function Sconce({ position, side = 1, intensity = 1 }) {
  const mat = getEstateMaterials()
  const [px, py, pz] = position
  return (
    <group>
      <mesh position={[px + side * 0.86, py - 0.1, pz]} material={mat.stone}>
        <boxGeometry args={[0.16, 1.05, 0.52]} />
      </mesh>
      <mesh position={[px + side * 0.43, py - 0.26, pz]} material={mat.brass}>
        <boxGeometry args={[0.86, 0.1, 0.12]} />
      </mesh>
      <mesh position={[px + side * 0.46, py - 0.52, pz]} rotation={[0, 0, side * 0.72]} material={mat.brass}>
        <boxGeometry args={[0.62, 0.08, 0.1]} />
      </mesh>
      <mesh position={[px, py - 0.17, pz]} material={mat.gilt}>
        <cylinderGeometry args={[0.16, 0.09, 0.22, 12]} />
      </mesh>
      <Candle position={position} intensity={intensity} />
    </group>
  )
}

// Freestanding flame: a stepped stone pedestal + a gilt bowl holding the flame, for
// floor/landing candles that aren't on a wall. `h` is the pedestal height to the bowl.
export function FlameCup({ position, intensity = 1, h = 1.1 }) {
  const mat = getEstateMaterials()
  const [px, py, pz] = position
  const base = py - h
  return (
    <group>
      <mesh position={[px, base + 0.12, pz]} material={mat.stone}>
        <boxGeometry args={[0.7, 0.24, 0.7]} />
      </mesh>
      <mesh position={[px, base + h * 0.5, pz]} material={mat.stone}>
        <cylinderGeometry args={[0.16, 0.24, h - 0.3, 10]} />
      </mesh>
      <mesh position={[px, py - 0.16, pz]} material={mat.gilt}>
        <cylinderGeometry args={[0.26, 0.12, 0.22, 14]} />
      </mesh>
      <Candle position={position} intensity={intensity} />
    </group>
  )
}

// Hanging lantern: an open brass cage (top/bottom cap + corner posts) holding the
// flame, hung from a thin rod that climbs into the dark above. For flames suspended
// in a vertical void (the descent shaft) where there is no wall to mount a sconce.
export function HangingLantern({ position, intensity = 1, drop = 4 }) {
  const mat = getEstateMaterials()
  const [px, py, pz] = position
  return (
    <group>
      <mesh position={[px, py + drop / 2 + 0.45, pz]} material={mat.brass}>
        <cylinderGeometry args={[0.05, 0.05, drop, 6]} />
      </mesh>
      <mesh position={[px, py + 0.46, pz]} material={mat.brass}>
        <boxGeometry args={[0.42, 0.1, 0.42]} />
      </mesh>
      <mesh position={[px, py - 0.36, pz]} material={mat.brass}>
        <boxGeometry args={[0.34, 0.1, 0.34]} />
      </mesh>
      {[[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].map(([ox, oz], i) => (
        <mesh key={'lp' + i} position={[px + ox, py + 0.05, pz + oz]} material={mat.brass}>
          <boxGeometry args={[0.05, 0.82, 0.05]} />
        </mesh>
      ))}
      <Candle position={position} intensity={intensity} />
    </group>
  )
}

// Error boundary for an asset-loading child: on a thrown load error (e.g. a
// missing/corrupt glb) it renders `fallback` instead of taking down the canvas.
// Suspense handles the pending promise; only a class boundary catches the throw.
// Used so the now-default baluster rail degrades to the box rail if the glb fails.
export class AssetBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.warn('[detailKit] asset load failed, using fallback:', error?.message || error)
  }
  render() {
    return this.state.failed ? this.props.fallback ?? null : this.props.children
  }
}

// BalusterRail: a rhythm of REAL turned balusters (baluster.glb) along a rail,
// loaded once via the shared useGLTF pipeline and re-skinned with the estate
// matcap (makeModelMatcap) so the profiled geometry reads in the lightless scene.
// The source scene is drei-cached and shared, so each instance is a clone. Caller
// wraps in <Suspense>. Used only behind ?rails=baluster (see RAILS_GLB) so the glb
// is not fetched on the default path. This is the reference-driven profile test.
export function BalusterRail({ url = '/models/baluster.glb', count = 1, x0 = 0, dx = 1, y = 0, z = 0, scale = 1 }) {
  const gl = useThree((s) => s.gl)
  setRenderer(gl)
  const { scene } = useGLTF(url, DRACO_PATH, undefined, (loader) => loader.setKTX2Loader(getKTX2()))
  const clones = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const root = scene.clone(true)
      root.traverse((c) => {
        if (c.isMesh) c.material = makeModelMatcap({ map: c.material?.map || null })
      })
      return { x: x0 + i * dx, root }
    })
  }, [scene, count, x0, dx])
  return (
    <group>
      {clones.map((c, i) => (
        <primitive key={i} object={c.root} position={[c.x, y, z]} scale={scale} />
      ))}
    </group>
  )
}

// A flat baked contact/AO disc to seat masses on the floor (Hall grounds columns
// the same way). Dark radial falloff, fogged, no depth write.
export function ContactDisc({ position, radius = 2.0, strength = 0.5 }) {
  const tex = useMemo(() => radialTexture({ inner: `rgba(0,0,0,${strength})`, outer: 'rgba(0,0,0,0)' }), [strength])
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} fog />
    </mesh>
  )
}
