import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

// Drifting dust: instanced points with all motion in the vertex shader (near-
// zero cost ambient life). Denser, warmer where light falls.
function Dust({ count = 1500, spread = [22, 20, 64], z0 = 4 }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * spread[0] * 0.5
      pos[i * 3 + 1] = Math.random() * spread[1]
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * spread[2] * 0.5 + z0
      seed[i] = Math.random() * 100
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count, spread, z0])

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uSize: { value: 26 }, uColor: { value: new THREE.Color('#ffd49a') } },
        vertexShader: `
          attribute float aSeed; uniform float uTime; uniform float uSize;
          varying float vTw;
          void main(){
            vec3 p = position;
            p.y += sin(uTime*0.18 + aSeed)*0.7;
            p.x += sin(uTime*0.12 + aSeed*1.7)*0.6;
            p.z += cos(uTime*0.10 + aSeed*0.9)*0.6;
            vec4 mv = modelViewMatrix*vec4(p,1.0);
            gl_Position = projectionMatrix*mv;
            gl_PointSize = uSize*(1.0/ max(0.1,-mv.z));
            vTw = 0.35 + 0.65*pow(0.5+0.5*sin(uTime*1.6+aSeed*6.2),2.0);
          }`,
        fragmentShader: `
          uniform vec3 uColor; varying float vTw;
          void main(){
            float r = length(gl_PointCoord-0.5);
            float a = smoothstep(0.5,0.0,r)*vTw*0.5;
            gl_FragColor = vec4(uColor, a);
          }`,
      }),
    [],
  )
  useFrame((s) => (mat.uniforms.uTime.value = s.clock.elapsedTime))
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

// A shaft of light descending from an unseen opening in the dark vault. Additive
// cone, brightest mid-fall, fading at both ends. Doré single-source drama.
function Shaft({ position, height = 22, top = 1.0, bottom = 4.6, color = '#ffe1ad', strength = 0.16 }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(top, bottom, height, 28, 1, true), [height, top, bottom])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
        vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uStrength; varying float vY;
          void main(){
            float a = smoothstep(0.0,0.35,vY)*smoothstep(1.0,0.45,vY)*uStrength;
            gl_FragColor = vec4(uColor, a);
          }`,
      }),
    [color, strength],
  )
  return <mesh geometry={geo} material={mat} position={position} renderOrder={2} />
}

export default function Atmosphere() {
  return (
    <group>
      <Dust />
      <Shaft position={[-1.5, 11, 20]} />
      <Shaft position={[2.0, 11, 2]} strength={0.2} />
      <Shaft position={[-1.0, 11, -14]} strength={0.13} />
    </group>
  )
}
