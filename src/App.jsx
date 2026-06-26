import React, { useEffect, lazy, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Leva } from 'leva'
import * as THREE from 'three'
import Hall from './world/Hall.jsx'
import BakedHall from './world/BakedHall.jsx'
import ExternalModel from './world/ExternalModel.jsx'
import Descent from './world/Descent.jsx'
import Nadir from './world/Nadir.jsx'
import Atmosphere from './world/Atmosphere.jsx'
import DepthGrade from './world/DepthGrade.jsx'
import AdaptiveQuality from './engine/AdaptiveQuality.jsx'
import Hud from './ui/Hud.jsx'

// Code-split: the Rapier-dependent interaction layer (and its WASM) loads after
// first paint, hidden behind the arrival veil. Drops the initial bundle hard.
const PhysicsWorld = lazy(() => import('./engine/PhysicsWorld.jsx'))
import MinigameLayer from './ui/MinigameLayer.jsx'
import ArrivalVeil from './ui/ArrivalVeil.jsx'
import TouchControls from './ui/TouchControls.jsx'
import AudioBoot from './audio/AudioBoot.jsx'
import { useUI } from './state/store.js'
import { useQuality } from './state/quality.js'
import { ENABLE_NADIR_RETURN } from './world/layout.js'
import { chapters } from './copy.js'
import { T } from './render/treatments.js'
import { LOW } from './util/env.js'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
const HARNESS = params.has('harness')
const BAKED = params.has('baked') // A/B: Blender-baked hall vs matcap hall
const MODEL = params.has('model') // demo the matcap drop-in of baluster.glb in the slot
// Floor: hardwood + clean runner is the locked default; ?floor= overrides for A/B.
const FLOOR = params.get('floor') || 'runner'
const RUG = params.get('rug') // runner rug detail: ?rug=max for the dense variant; clean is default

function Bridge({ shots }) {
  const { gl, camera } = useThree()
  useEffect(() => {
    const ctx = gl.getContext()
    const dbg = ctx.getExtension('WEBGL_debug_renderer_info')
    const gpu = dbg ? ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown'
    window.__kbx = {
      ready: true,
      gpu,
      isWebGL2: ctx instanceof WebGL2RenderingContext,
      shots,
      setCam: (px, py, pz, tx, ty, tz) => {
        camera.position.set(px, py, pz)
        camera.lookAt(tx, ty, tz)
        camera.updateMatrixWorld()
      },
      getCam: () => camera.position.toArray(),
      demoRead: () => {
        const c = chapters[0]
        useUI.getState().read({ id: c.id, numeral: c.numeral, title: c.title, paragraphs: c.paragraphs })
      },
      launch: (id) => useUI.getState().launch(id || 'astrolabe'),
      clearUI: () => {
        useUI.getState().closeRead()
        useUI.getState().exitGame()
      },
      // harness hook: force a quality level and apply the dpr cap (FPS-degrade test)
      forceQuality: (n) => {
        useQuality.getState().setLevel(n)
        gl.setPixelRatio(Math.min(window.devicePixelRatio, useQuality.getState().dpr))
      },
      quality: () => useQuality.getState(),
    }
  }, [gl, camera, shots])
  return null
}

const SHOTS = {
  establish: [0, 8, 46, 0, 6, -12],
  eye: [0, 1.7, 40, 0, 5, -22],
  descent: [0, 2, -29, 0, -11, -50],
  landing: [0, -9, -50, 0, -12, -62],
  arrival: [0, -10.4, -61.5, 0, -14, -90],
  shaft: [-4, -10.5, -61, 3, -34, -82],
  // the final view: a half-step back at eye level, the monumental balustrade
  // framing the impossible void as a deliberate overlook (unresolved ending)
  overlook: [0, -10.4, -58.6, 0, -18, -86],
  detail: [11, 4.5, 28, 0, 6, 22],
  // handoff-slot model at [0,0,14], at visitor eye level and distance
  modelView: [1.3, 1.55, 16.8, 0, 1.0, 14],
  modelClose: [0.8, 1.2, 15.7, 0, 0.9, 14],
  // floor judged at the visitor's walking eye level (not top-down)
  floorWalk: [0, 1.7, 28, 0, 0.0, 6],
  floorAhead: [2.6, 1.7, 20, -1.5, 0.0, 2],
  // closer, steeper look down the runner to read the rug pattern (sits past the
  // handoff-slot placeholder at z=14 so it doesn't occlude the runner)
  rugClose: [0.7, 1.6, 12, 0, 0.0, 2],
  // Nadir -> Return review vantages
  nadirWide: [5, -24, -79, 0, -25.5, -93], // inside the chamber: piers, floor, the doorway + glow at the back
  nadirGlimpse: [2.5, -25.3, -82, 0, -25, -94], // inside the dark Nadir, the doorway + glow ahead
  returnView: [0, -24, -97, 0, -23, -107], // crossed the threshold, the rising pale steps
  returnDest: [1.5, -21.4, -111, 0, -22.4, -120], // standing in the destination: far wall + aperture
  destLookback: [0, -21.7, -117, 0, -24, -99], // from the destination, looking back toward the dark
}

export default function App() {
  const post = useQuality((s) => s.post)
  useEffect(() => {
    if (LOW && !HARNESS) useQuality.getState().stepDown()
  }, [])
  return (
    <>
      <Leva hidden={HARNESS} collapsed />
      <Hud />
      <MinigameLayer />
      {!HARNESS && <ArrivalVeil />}
      {!HARNESS && <TouchControls />}
      <Canvas
        dpr={LOW ? 1 : [1, 2]}
        gl={{ antialias: !LOW, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.7, 44], fov: 64, near: 0.1, far: 260 }}
        onCreated={({ scene, gl }) => {
          scene.fog = new THREE.FogExp2(T.fogColor, T.fogDensity)
          gl.setClearColor(T.fogColor, 1)
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = T.exposure
        }}
      >
        <Bridge shots={SHOTS} />
        <React.Suspense fallback={null}>{BAKED ? <BakedHall /> : <Hall floorStyle={FLOOR} rugVariant={RUG === 'max' ? 'rugmax' : 'rugclean'} />}</React.Suspense>
        {/* hand-model handoff slot: a glb appears here via ?model. The default
            load leaves it EMPTY (the old placeholder rendered as a black PBR
            spike in the lightless scene). */}
        {MODEL && (
          <React.Suspense fallback={null}>
            <ExternalModel url="/models/baluster.glb" position={[0, 0, 14]} rotation={[0, Math.PI * 0.13, 0]} scale={2.0} matcap />
          </React.Suspense>
        )}
        <Descent />
        {/* Nadir/Return arc is experiment-only (?arc=nadir); default is Hall -> Descent. */}
        {ENABLE_NADIR_RETURN && <Nadir />}
        <Atmosphere />
        <DepthGrade />
        {!HARNESS && <AudioBoot />}
        {!HARNESS && <AdaptiveQuality />}
        {!HARNESS && (
          <Suspense fallback={null}>
            <PhysicsWorld />
          </Suspense>
        )}
        {post && (
          <EffectComposer>
            <Bloom intensity={T.bloom.intensity} luminanceThreshold={T.bloom.threshold} luminanceSmoothing={0.4} mipmapBlur radius={T.bloom.radius} />
            <Vignette offset={0.28} darkness={T.vignette} />
          </EffectComposer>
        )}
      </Canvas>
    </>
  )
}
