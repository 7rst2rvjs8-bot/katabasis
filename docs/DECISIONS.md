# Decision log: the immersive 3D build

Running log of load-bearing choices for the free-roam 3D estate. Newest first.

## Environment realities (verified this session)
- **Blender is not installed** (no PATH binary, no .app). The headless Blender
  Python pipeline (procedural geometry, UV2 unwrap, lightmap/AO bake, glTF
  export) is therefore not available this run.
- **Cascade:** no authored `.glb` -> the KTX2 / Draco / gltf-transform / draw-
  call-budget / 5 MB-asset pipeline is moot this run and is intentionally NOT
  built. Geometry is generated procedurally in code; shading is matcap-based
  (Bruno Simon's "rendering illusion": no real-time lights). This is deliberate
  scoping forced by the environment, not a silent shortfall.
- Chrome present (screenshot harness), Node 24, npm registry reachable.

## The spine: a verified visual loop
- The harness must run on the **real GPU**, not software WebGL. Critiques of
  Piranesi/Dore chiaroscuro, bloom, exposure and warm grade are only valid on
  hardware. First harness run records `UNMASKED_RENDERER_WEBGL`; if it reads
  SwiftShader/llvmpipe, all colour/tone judgments are flagged provisional for
  Max's real-hardware eye.
- The loop judges LOOK / COMPOSITION / LIGHT only. Motion feel, camera inertia
  and audio cannot be judged from stills: those are built to known-good
  patterns, wired to a live GUI, and handed to Max with a flag.

## Stack
- React + R3F as specified. `leva` is used as the live-tuning GUI: it is the
  R3F-idiomatic equivalent of lil-gui (same purpose, better React integration).
  Flagged as the one substitution from the named stack.
- No external runtime assets: matcaps are generated procedurally (canvas
  gradients), shaders inlined. Self-contained and boundary-safe.

## Reachable bar (honest)
- Procedural + matcap + atmosphere reaches an **evocative stylized homage** that
  reads the references (Piranesi scale-into-dark, Dore single-source chiaroscuro,
  Moreau gold-and-dark). It will **not** reach hand-sculpted engraving-density
  surface detail; that shortfall is named, not chased.
- Effort weighted to reachable high-impact levers: fog falloff to black, single-
  source matcap light pools + baked shadow planes, the warm gold-and-dark
  palette, composition for impossible scale, instanced repeated ornament for
  density, and uncanny spatial connections.

## Graceful-failure order
room-look (relentless loop) -> movement/collision -> inspect + one minigame ->
audio + mobile. If the run stops early it still yields {runnable build + one
iterated room + honest report}, never {great plumbing, nothing rendering}.

## Boundary
Abstract/atmospheric only. Frozen copy surfaced verbatim (copy lives in
`src/copy.js`; verbatim check adapted there). Nothing proprietary.
