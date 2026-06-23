import * as THREE from 'three'

// Bruno-Simon fake-bounce: a matcap material that adds warm pools of light from
// candle points and a soft floor-bounce, entirely in the fragment shader. No
// real-time lights, near-zero cost. This is the #1 lighting tell: surfaces near
// a flame read as lit by it; everything else falls to true black.

export function makeEstateMatcap(matcapTex, lights, opts = {}) {
  const warm = new THREE.Color(opts.warm || '#ff9436')
  const range = opts.range ?? 7.0
  const strength = opts.strength ?? 2.6
  const floorBounce = opts.floorBounce ?? 0.13
  const N = Math.max(1, lights.length)
  const floor = !!opts.floor
  const flagSize = opts.flagSize ?? 3.2

  const mat = new THREE.MeshMatcapMaterial({ matcap: matcapTex, fog: true })
  const uniforms = {
    uLights: { value: lights.map((l) => new THREE.Vector3(l[0], l[1], l[2])) },
    uWarm: { value: warm },
    uRange: { value: range },
    uStrength: { value: strength },
    uFloor: { value: floorBounce },
    uTime: { value: 0 },
  }
  mat.userData.uniforms = uniforms

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = 'varying vec3 vWPos;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )
    shader.fragmentShader =
      `varying vec3 vWPos;
       uniform vec3 uLights[${N}];
       uniform vec3 uWarm;
       uniform float uRange;
       uniform float uStrength;
       uniform float uFloor;
       uniform float uTime;\n` +
      shader.fragmentShader.replace(
        '#include <fog_fragment>',
        `vec3 bounce = vec3(0.0);
         for (int i = 0; i < ${N}; i++) {
           vec3 lp = uLights[i];
           float d = distance(vWPos, lp);
           float fl = 0.84 + 0.16 * sin(uTime * 8.0 + lp.x * 3.1 + lp.z * 0.7);
           bounce += uWarm * exp(-(d * d) / (uRange * uRange)) * fl;
         }
         bounce += uWarm * uFloor * smoothstep(9.0, 0.0, vWPos.y);
         ${
           floor
             ? `float gx = abs(fract(vWPos.x / ${flagSize.toFixed(1)}) - 0.5);
                float gz = abs(fract(vWPos.z / ${flagSize.toFixed(1)}) - 0.5);
                float grout = smoothstep(0.0, 0.03, min(gx, gz));
                float wear = 0.86 + 0.14 * sin(vWPos.x * 1.7) * sin(vWPos.z * 1.3);
                gl_FragColor.rgb *= mix(0.42, 1.0, grout) * wear;`
             : ''
         }
         gl_FragColor.rgb += gl_FragColor.rgb * bounce * uStrength + bounce * 0.1;
         #include <fog_fragment>`,
      )
  }
  mat.customProgramCacheKey = () => 'estate-matcap-' + N
  return mat
}
