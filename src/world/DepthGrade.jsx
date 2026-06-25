import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { T } from '../render/treatments.js'
import { useQuality } from '../state/quality.js'
import { RETURN_Z_THRESH } from './layout.js'

// The Doré progression as space: the deeper the camera descends, the denser the
// fog and the closer the ground falls to true black, with exposure easing down.
// Then THE RETURN inverts it: once the camera crosses the back-wall threshold
// (z < RETURN_Z_THRESH) the grade lerps, tightly, toward Register 3 - near-white
// radiance, lifted exposure, fog that dissolves edges instead of blackening
// them. The turn is local to the Return so the Nadir stays graded to black right
// up to the doorway. Sole writer of scene.fog.density (AdaptiveQuality * fogMul).
const trueBlack = new THREE.Color(0x020203)
const baseCol = new THREE.Color(T.fogColor)
const returnWhite = new THREE.Color('#d9dad8') // cool chalk, pale-stone; not warm, not heavenly
const tmp = new THREE.Color()
const lerp = THREE.MathUtils.lerp

export default function DepthGrade() {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  useFrame(({ camera }) => {
    const k = THREE.MathUtils.clamp((1.6 - camera.position.y) / 31.6, 0, 1) // 0 hall .. 1 deep
    const fogMul = useQuality.getState().fogMul
    // r: 0 at the threshold, 1 a few metres into the Return (tight, past -94)
    const r = THREE.MathUtils.clamp((RETURN_Z_THRESH - camera.position.z) / 6, 0, 1)
    tmp.copy(baseCol).lerp(trueBlack, k * 0.85).lerp(returnWhite, r)
    // Return targets pulled back from 0.048/0.88: the wider pale matcap now carries
    // contrast, so the old wash blew out mid-distance edges and pushed bulk pale
    // over the bloom knee. 0.034 density keeps the far-wall dissolve while letting
    // step risers / wall registers / arch orders read; 0.82 exposure seats pale
    // below bloom. r-gated, so the Nadir (r=0) stays graded to black and the Hall
    // is untouched.
    const density = lerp(T.fogDensity * (1 + k * 1.4), 0.034, r) * fogMul
    const exposure = lerp(T.exposure * (1 - k * 0.34), 0.82, r)
    if (scene.fog) {
      scene.fog.density = density
      scene.fog.color.copy(tmp)
    }
    gl.setClearColor(tmp, 1)
    gl.toneMappingExposure = exposure
  })
  return null
}
