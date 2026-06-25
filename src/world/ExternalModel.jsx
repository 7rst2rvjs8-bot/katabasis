import React, { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { DRACO_PATH, getKTX2, setRenderer } from '../render/loaders.js'
import { makeModelMatcap } from '../render/estateMaterials.js'

// ExternalModel: the drop-in slot for a hand-modeled Blender .glb.
// ---------------------------------------------------------------------------
// Export a glb into public/models/ and point this component at it:
//   <ExternalModel url="/models/lectern.glb" position={[0, 0, -30]} />
// No rewiring is needed. Draco geometry and KTX2 textures decode through the
// LOCAL decoders configured in src/render/loaders.js. See docs/ASSET_PIPELINE.md
// for the export spec and coordinate convention.
//
// Loading goes through drei's useGLTF (Suspense-driven, same cache as the rest
// of the scene), given the same local '/draco/' path and our shared KTX2Loader.
// A missing file (404) must not crash the app: useGLTF throws, and a thrown
// Error is NOT a Suspense fallback (only thrown promises are), so a class
// ErrorBoundary catches it and renders nothing.

class ModelBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    // Non-fatal. A missing or malformed glb leaves the slot empty rather than
    // taking down the canvas. Logged once for the asset author.
    // eslint-disable-next-line no-console
    console.warn(`[ExternalModel] failed to load "${this.props.url}":`, error?.message || error)
  }
  componentDidUpdate(prev) {
    // Allow recovery if the url changes (e.g. a real asset replaces the
    // placeholder during the handoff).
    if (prev.url !== this.props.url && this.state.failed) {
      this.setState({ failed: false })
    }
  }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

function Model({ url, position, rotation, scale, matcap, normalScale }) {
  // Ensure the KTX2 transcoder knows the GPU target before any textured glb is
  // decoded. Idempotent; safe to run on every mount.
  const gl = useThree((s) => s.gl)
  setRenderer(gl)

  // 2nd arg sets the local Draco path (overrides drei's gstatic CDN default);
  // 4th arg (extendLoader) attaches the shared local KTX2Loader.
  const { scene } = useGLTF(
    url,
    DRACO_PATH,
    undefined,
    (loader) => loader.setKTX2Loader(getKTX2()),
  )

  // matcap path (opt-in): a glb's own glTF material is PBR, which renders BLACK
  // in this lightless matcap scene. Rebind each mesh to the estate matcap,
  // carrying the glb's baked colour/normal maps so mottling + relief read. The
  // source scene is shared (drei cache), so clone and only assign on the clone.
  const obj = useMemo(() => {
    if (!matcap) return scene
    const root = scene.clone(true)
    const ns = normalScale != null ? new THREE.Vector2(normalScale, normalScale) : null
    root.traverse((c) => {
      if (c.isMesh) {
        const src = c.material || {}
        c.material = makeModelMatcap({ map: src.map || null, normalMap: src.normalMap || null, normalScale: ns })
      }
    })
    return root
  }, [scene, matcap, normalScale])

  return <primitive object={obj} position={position} rotation={rotation} scale={scale} />
}

export default function ExternalModel({
  url = '/models/placeholder.glb',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  matcap = false,
  normalScale = 1,
}) {
  // ErrorBoundary OUTSIDE Suspense: Suspense re-throws once the rejected loader
  // promise settles, and only the boundary can catch that throw. key={url} so a
  // url swap remounts cleanly past a prior failure.
  return (
    <ModelBoundary key={url} url={url}>
      <Suspense fallback={null}>
        <Model url={url} position={position} rotation={rotation} scale={scale} matcap={matcap} normalScale={normalScale} />
      </Suspense>
    </ModelBoundary>
  )
}

// NOTE: intentionally NO useGLTF.preload here. The default placeholder.glb is
// expected to 404 until a real asset is dropped in, and preload would throw
// eagerly. Preload a real model from its own call site once it exists.
