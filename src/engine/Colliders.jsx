import React from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import {
  BAYS,
  COL_X,
  COL_H,
  WALL_X,
  zFar,
  len,
  midZ,
  DESC_TOP_Z,
  DESC_LANDING_Y,
  DESC_BACK_Z,
  DESC_WALL_X,
  DESC_STEPS,
  DESC_RISE,
  DESC_RUN,
  DESC_STAIR_BOTTOM_Z,
  DESC_BALCONY_Z,
  NADIR_RISE,
  NADIR_RUN,
  NADIR_STEPS,
  NADIR_STAIR_X,
  NADIR_STAIR_HALF_W,
  NADIR_STAIR_TOP_Z,
  NADIR_FLOOR_Y,
  NADIR_Z_FRONT,
  NADIR_Z_BACK,
  ENABLE_NADIR_RETURN,
  RETURN_OPEN,
  RETURN_Z_THRESH,
  RETURN_HALF_W,
  RETURN_STEPS,
  RETURN_RISE,
  RETURN_RUN,
  DEST_Z_FRONT,
  DEST_Z_BACK,
  DEST_HALF_W,
  DEST_FLOOR_Y,
} from '../world/layout.js'

// Primitive colliders shadowing the visuals across both zones. The capsule
// never clips, never falls into the shaft (the balustrade stops it).
export default function Colliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* --- hall --- */}
      <CuboidCollider args={[WALL_X, 0.5, 34.5]} position={[0, -0.5, 4.5]} />
      <CuboidCollider args={[0.8, 20, (len + 16) / 2]} position={[-WALL_X, 12, midZ]} />
      <CuboidCollider args={[0.8, 20, (len + 16) / 2]} position={[WALL_X, 12, midZ]} />
      {BAYS.map((z, i) => (
        <React.Fragment key={i}>
          <CylinderCollider args={[COL_H / 2, 0.95]} position={[-COL_X, COL_H / 2, z]} />
          <CylinderCollider args={[COL_H / 2, 0.95]} position={[COL_X, COL_H / 2, z]} />
        </React.Fragment>
      ))}

      {/* --- descent: grand stair --- */}
      {Array.from({ length: DESC_STEPS }).map((_, i) => (
        <CuboidCollider key={'ds' + i} args={[6, DESC_RISE / 2, (DESC_RUN + 0.03) / 2]} position={[0, -(i + 0.5) * DESC_RISE, DESC_TOP_Z - (i + 0.5) * DESC_RUN]} />
      ))}
      {/* landing floor */}
      <CuboidCollider args={[DESC_WALL_X, 0.4, (DESC_STAIR_BOTTOM_Z - DESC_BALCONY_Z + 0.5) / 2]} position={[0, DESC_LANDING_Y - 0.4, (DESC_STAIR_BOTTOM_Z + DESC_BALCONY_Z) / 2]} />
      {/* balustrade. DEFAULT: one solid rail stops the player at the void's edge.
          ARC: split, with an offset-right gap where the Nadir stair opens. */}
      {!ENABLE_NADIR_RETURN ? (
        <CuboidCollider args={[DESC_WALL_X, 0.9, 0.4]} position={[0, DESC_LANDING_Y + 0.6, DESC_BALCONY_Z]} />
      ) : (
        <>
          <CuboidCollider args={[6.5, 0.9, 0.4]} position={[-4.5, DESC_LANDING_Y + 0.6, DESC_BALCONY_Z]} />
          <CuboidCollider args={[1.5, 0.9, 0.4]} position={[9.5, DESC_LANDING_Y + 0.6, DESC_BALCONY_Z]} />
        </>
      )}
      {/* descent shaft walls */}
      <CuboidCollider args={[0.8, 32, (DESC_TOP_Z - DESC_BACK_Z + 6) / 2]} position={[-DESC_WALL_X, -16, (DESC_TOP_Z + DESC_BACK_Z) / 2]} />
      <CuboidCollider args={[0.8, 32, (DESC_TOP_Z - DESC_BACK_Z + 6) / 2]} position={[DESC_WALL_X, -16, (DESC_TOP_Z + DESC_BACK_Z) / 2]} />

      {/* --- Nadir/Return colliders: experiment-only (?arc=nadir). In the default
          route none of these exist, so there is no invisible Nadir to walk into;
          the solid balustrade above is the floor of the experience. --- */}
      {ENABLE_NADIR_RETURN && (
        <>
          {/* Nadir: stair down, floor, piers */}
          {Array.from({ length: NADIR_STEPS }).map((_, i) => (
            <CuboidCollider
              key={'ns' + i}
              args={[NADIR_STAIR_HALF_W, NADIR_RISE / 2, (NADIR_RUN + 0.03) / 2]}
              position={[NADIR_STAIR_X, DESC_LANDING_Y - (i + 0.5) * NADIR_RISE, NADIR_STAIR_TOP_Z - (i + 0.5) * NADIR_RUN]}
            />
          ))}
          <CuboidCollider args={[DESC_WALL_X, 0.4, (NADIR_Z_FRONT - NADIR_Z_BACK + 0.5) / 2]} position={[0, NADIR_FLOOR_Y - 0.4, (NADIR_Z_FRONT + NADIR_Z_BACK) / 2]} />
          {[[-8, -83], [8, -83], [-8, -90], [8, -90]].map(([x, z], i) => (
            <CuboidCollider key={'pi' + i} args={[0.9, 2.5, 0.9]} position={[x, NADIR_FLOOR_Y + 2.5, z]} />
          ))}

          {/* sealed threshold (when the Return room is contained): a block across the
              doorway, flush with the Nadir floor's back edge */}
          {!RETURN_OPEN && (
            <CuboidCollider args={[DESC_WALL_X, 6, 0.7]} position={[0, NADIR_FLOOR_Y + 3, NADIR_Z_BACK - 0.7]} />
          )}

          {/* Return: rising steps + side walls + destination (only when the room is open) */}
          {RETURN_OPEN && (
            <>
              {Array.from({ length: RETURN_STEPS }).map((_, j) => (
                <CuboidCollider
                  key={'rs' + j}
                  args={[RETURN_HALF_W, 1.0, (RETURN_RUN + 0.05) / 2]}
                  position={[0, NADIR_FLOOR_Y + j * RETURN_RISE - 1.0, RETURN_Z_THRESH - (j + 0.5) * RETURN_RUN]}
                />
              ))}
              {[-RETURN_HALF_W, RETURN_HALF_W].map((x, i) => (
                <CuboidCollider key={'rw' + i} args={[0.4, 6, 7]} position={[x, NADIR_FLOOR_Y + 5, RETURN_Z_THRESH - 14]} />
              ))}
              <CuboidCollider args={[DEST_HALF_W, 0.4, (DEST_Z_FRONT - DEST_Z_BACK) / 2]} position={[0, DEST_FLOOR_Y - 0.4, (DEST_Z_FRONT + DEST_Z_BACK) / 2]} />
              {[-DEST_HALF_W, DEST_HALF_W].map((x, i) => (
                <CuboidCollider key={'dw' + i} args={[0.4, 8, (DEST_Z_FRONT - DEST_Z_BACK) / 2]} position={[x, DEST_FLOOR_Y + 7, (DEST_Z_FRONT + DEST_Z_BACK) / 2]} />
              ))}
              <CuboidCollider args={[DEST_HALF_W, 9.5, 0.4]} position={[0, DEST_FLOOR_Y + 8.5, DEST_Z_BACK]} />
            </>
          )}
        </>
      )}
    </RigidBody>
  )
}
