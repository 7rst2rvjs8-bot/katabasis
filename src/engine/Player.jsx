import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier'
import { useControls, folder } from 'leva'
import { SPAWN } from '../world/layout.js'
import { useUI } from '../state/store.js'
import { touch } from './touchInput.js'

const lookAtP = new THREE.Vector3()
const camTarget = new THREE.Vector3()

// First-person free-roam. Kinematic capsule + Rapier character controller so it
// slides along walls and steps without clipping. Camera DAMPS to an eye target
// (never rigid-parented) with frame-rate-independent smoothing, for weight.
export default function Player() {
  const { camera, gl } = useThree()
  const { world } = useRapier()
  const body = useRef()
  const cc = useRef()
  const yaw = useRef(Math.PI) // face -Z, into the hall
  const pitch = useRef(-0.02)
  const vy = useRef(0)
  const keys = useRef({ f: 0, b: 0, l: 0, r: 0, run: 0 })
  const drag = useRef({ on: false, x: 0, y: 0 })
  const intro = useRef(0) // arrival settle timer
  const INTRO = 3.6

  const p = useControls({
    movement: folder({
      speed: { value: 6.2, min: 1, max: 18 },
      runMult: { value: 1.7, min: 1, max: 3 },
      gravity: { value: 20, min: 0, max: 40 },
    }),
    camera: folder({
      eyeOffset: { value: 0.66, min: 0.2, max: 1.2 },
      camDamp: { value: 11, min: 1, max: 30, label: 'damping' },
      overshoot: { value: 0.12, min: 0, max: 0.5 },
      lookSpeed: { value: 0.0024, min: 0.0006, max: 0.006 },
      fov: { value: 64, min: 40, max: 90 },
    }),
  })

  useEffect(() => {
    camera.fov = p.fov
    camera.updateProjectionMatrix()
  }, [camera, p.fov])

  useEffect(() => {
    const kd = (e) => set(e.code, 1)
    const ku = (e) => set(e.code, 0)
    function set(c, v) {
      if (c === 'KeyW' || c === 'ArrowUp') keys.current.f = v
      else if (c === 'KeyS' || c === 'ArrowDown') keys.current.b = v
      else if (c === 'KeyA' || c === 'ArrowLeft') keys.current.l = v
      else if (c === 'KeyD' || c === 'ArrowRight') keys.current.r = v
      else if (c === 'ShiftLeft' || c === 'ShiftRight') keys.current.run = v
    }
    const el = gl.domElement
    const pd = (e) => {
      drag.current = { on: true, x: e.clientX, y: e.clientY }
      try {
        el.setPointerCapture?.(e.pointerId)
      } catch {}
    }
    const pm = (e) => {
      if (!drag.current.on) return
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      drag.current.x = e.clientX
      drag.current.y = e.clientY
      yaw.current -= dx * p.lookSpeed
      pitch.current = THREE.MathUtils.clamp(pitch.current - dy * p.lookSpeed, -1.2, 1.2)
    }
    const pu = () => (drag.current.on = false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    el.addEventListener('pointerdown', pd)
    window.addEventListener('pointermove', pm)
    window.addEventListener('pointerup', pu)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      el.removeEventListener('pointerdown', pd)
      window.removeEventListener('pointermove', pm)
      window.removeEventListener('pointerup', pu)
    }
  }, [gl, p.lookSpeed])

  useEffect(() => {
    const c = world.createCharacterController(0.08)
    c.enableAutostep(0.7, 0.3, true)
    c.enableSnapToGround(0.7)
    c.setApplyImpulsesToDynamicBodies(true)
    cc.current = c
    return () => {
      try {
        world.removeCharacterController(c)
      } catch {}
    }
  }, [world])

  useFrame((_, dtRaw) => {
    if (useUI.getState().paused) return // yield camera to the inspect cinematic / overlays
    const dt = Math.min(dtRaw, 1 / 30)
    const b = body.current
    if (!b || !cc.current) return

    // arrival: lock movement early, let the camera settle from above/behind
    intro.current = Math.min(INTRO, intro.current + dt)
    const introK = THREE.MathUtils.smoothstep(intro.current / INTRO, 0, 1)
    const locked = intro.current < INTRO * 0.55

    // keyboard (digital) + joystick (analog), clamped so diagonals/analog never
    // exceed full speed. heading H=(sin,cos); right R=(-cos,sin) so facing -Z, D moves +X.
    let fIn = locked ? 0 : keys.current.f - keys.current.b + touch.my
    let sIn = locked ? 0 : keys.current.r - keys.current.l + touch.mx
    const mag = Math.hypot(fIn, sIn)
    if (mag > 1) {
      fIn /= mag
      sIn /= mag
    }
    const sy = Math.sin(yaw.current)
    const cy = Math.cos(yaw.current)
    const step = p.speed * (keys.current.run ? p.runMult : 1) * dt
    let mvx = (sy * fIn - cy * sIn) * step
    let mvz = (cy * fIn + sy * sIn) * step
    vy.current -= p.gravity * dt
    const my = vy.current * dt

    const collider = b.collider(0)
    cc.current.computeColliderMovement(collider, { x: mvx, y: my, z: mvz })
    const corr = cc.current.computedMovement()
    const t = b.translation()
    const nx = t.x + corr.x
    const ny = t.y + corr.y
    const nz = t.z + corr.z
    b.setNextKinematicTranslation({ x: nx, y: ny, z: nz })
    if (cc.current.computedGrounded()) vy.current = 0

    // damped camera with slight overshoot for inertial life; the arrival offset
    // starts the camera higher and further back, then settles to the eye.
    camTarget.set(nx, ny + p.eyeOffset + (1 - introK) * 5.5, nz + (1 - introK) * 9)
    const a = 1 - Math.exp(-p.camDamp * dt)
    camera.position.lerp(camTarget, a * (1 + p.overshoot))
    const cp = Math.cos(pitch.current)
    lookAtP.set(
      camera.position.x + Math.sin(yaw.current) * cp,
      camera.position.y + Math.sin(pitch.current),
      camera.position.z + Math.cos(yaw.current) * cp,
    )
    camera.lookAt(lookAtP)
  })

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={SPAWN} enabledRotations={[false, false, false]}>
      <CapsuleCollider args={[0.6, 0.35]} />
    </RigidBody>
  )
}
