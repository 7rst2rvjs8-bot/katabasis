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

## Phase: Bruno study + Blender bake pipeline

### Adopted from brunosimon/folio-2019 (studied via the public repo)
- **Indirect tint (the lighting illusion).** Bruno's matcap blends toward a warm
  `uIndirectColor` (#d04500) by `distanceTerm * angleTerm`, where distance =
  height above floor and angle = how much the normal faces DOWN. We adopted the
  down-facing-normal term into our fake-bounce (`src/render/estateMaterial.js`):
  warm bounce now concentrates on down-facing soffits near the floor (under
  capitals, beams, arch undersides) as real radiosity would.
- **Camera:** Bruno's per-tick lerp (`easing 0.15/0.1/0.1`) is frame-rate
  DEPENDENT (no dt term). Ours already uses `1 - exp(-k*dt)`, which is the exact
  fix his lacks; kept ours.
- **Reveal:** his click-gated geometry-rises-from-floor reveal (single 0->1 GSAP
  uniform, sub-floor discard) is noted as a future upgrade to our veil+settle.
- Honest: the repo is the shipped ENGINE/shaders, NOT the Blender modeling
  source; the hand-built art lived in .blend files, not the code.

### Blender pipeline (Blender 5.1.2, headless, OPERATES)
- `blender/build_hall.py` generates the colonnade procedurally (fluted columns,
  bases, capitals, entablature, voussoir arches, floor, walls) at the layout.js
  coordinates, smart-UV + lightmap-pack UV2, bakes in Cycles, exports glb.
- Two bakes: COMBINED (albedo x candle GI x AO -> the dramatic look) and a pure
  AO pass. ~20s at 256 samples / 2048 lightmap.
- gltf-transform: Draco geometry + WebP textures -> **972 KB to 74 KB (13x)**.
- **KTX2 gap (honest):** `toktx` / KTX-Software is not installed, so KTX2
  (ETC1S/UASTC) encoding is unavailable; WebP is used as the texture fallback.
  Fix: `brew install ktx` (or download KTX-Software), then `gltf-transform` can
  emit KTX2.
- **Baked-vs-matcap verdict (honest):** baked GI gives real Dore chiaroscuro +
  AO and clearly beats matcap for establishing/dramatic views (see before/after
  shots, ?baked). At the visitor's eye-level POV the DIRECTIONAL baked light
  reads darker than the omnidirectional matcap (grazing angles, inherent). So
  the default keeps the (now indirect-tint-improved) matcap for readability;
  the baked hall is wired and demonstrated via `?baked`. Baked-as-universal-
  default needs the Blender candle light-rig tuned for eye-level readability:
  a tuning pass, not a pipeline gap.

## CURRENT ARCHITECTURE & LOCKED DECISIONS (consolidated, authoritative)

This section is the standalone record of the shipped state. Where it and older
sections above differ, this one wins.

### What it is
A free-roam 3D estate (supersedes the old scroll site). Two connected zones:
the entry HALL (Piranesi colonnade) and, down a continuous grand stair, the
DESCENT (a vertiginous shaft toward true black). Walk it; inspect glowing
objects; two are minigames. Boundary / frozen copy / safety scaffolding are
inviolable (see CLAUDE.md sections 1-2; frozen copy lives verbatim in
`src/copy.js`, checked against CLAUDE.md section 5).

### Stack (locked)
- React 19 + R3F 9 + three 0.184; @react-three/rapier (physics); @react-three/
  postprocessing; drei; zustand (state); gsap; Web Audio (synth). Vite build.
- `leva` is the live-tuning GUI (the R3F-idiomatic equivalent of lil-gui). One
  logged substitution from the named stack.
- Rapier interaction layer is code-split (`React.lazy` on `PhysicsWorld`) so the
  WASM loads behind the arrival veil; initial bundle ~438 KB gzip.

### Rendering (locked: matcap default, baked is a demo)
- DEFAULT = procedural matcap "rendering illusion" (Bruno Simon technique): no
  real-time lights. `src/render/estateMaterial.js` = matcap + fake-bounce from
  candle points + Bruno down-facing-normal indirect tint + procedural tarnish.
  Atmosphere = film-soft billboarded god-rays + drifting dust + FogExp2.
  `DepthGrade` deepens fog/exposure toward true black with depth.
- BAKED-GI hall is a verified `?baked` DEMO, NOT the walked default. It looks
  better for establishing/dramatic views but reads darker at the visitor's
  eye-line (directional light at grazing angles). To promote it to default,
  tune the Blender candle light-rig for eye-level readability (a tuning pass).
- Treatments via `?treatment=charcoal|gold|ember`; charcoal is default.

### Systems (all real-path verified)
- First-person free-roam: Rapier kinematic capsule + character controller
  (slides, no clip), damped dt-independent camera, drag-look, WASD + analog
  touch joystick (coarse-pointer only) + tap/click-to-inspect.
- Inspect: proximity prompt -> E or tap -> cinematic draw-in surfacing frozen
  copy (I-The Threshold in the hall, II-The Descent below). Leaving resumes
  control (verified in both zones, and that close buttons never re-trigger).
- Two minigames via a drop-in registry (`src/minigame/registry.js`): the
  Astrolabe Lock (coupled rings) and the Nine Braziers (lights-out). Both
  winnable; `?solve` seeds them one move from solved for the harness.
- Persistence: zustand `persist` -> localStorage; reads + wins survive reload,
  reflected in-world (steadier glow); an "everything seen" HUD line when all 4.
- Adaptive quality: `AdaptiveQuality` measures FPS, steps post off -> DPR clamp
  -> fog/dust thin (hysteresis), recovers. Verified to fire AND recover.
- Audio: synthesized WebAudio bed that darkens with depth + interaction cues
  (inspect/solve/close). Placeholder; Howler + authored assets is the upgrade.

### Blender pipeline (OPERATES) + asset handoff contract
- Blender 5.1.2 headless. PATH fix: `sudo ln -s "/Applications/Blender.app/
  Contents/MacOS/Blender" /usr/local/bin/blender`. `blender/build_hall.py`
  generates the colonnade procedurally, lightmap-packs UV2, bakes COMBINED GI +
  AO in Cycles, exports glb. `gltf-transform` Draco + WebP: 972 KB -> 74 KB.
  DRACOLoader/KTX2Loader wired (`src/render/loaders.js`, decoders in
  `public/draco|basis`). Baked hall renders via `?baked`.
- KTX2 GAP: `toktx` not installed; WebP is the fallback. Fix: `brew install ktx`.
- HANDOFF: hand-modeled `.glb` files drop into `public/models/` and appear via
  `<ExternalModel>` (live slot in the hall at [0,0,14]; placeholder verified).
  The contract is `docs/ASSET_PIPELINE.md`. Coordinates: three is Y-up, hall
  axis is -Z, floor at y=0.
- INTERACTIVE AUTHORING (added): the official Blender Lab MCP add-on (v1.0.0)
  is wired as the `blender` MCP server for live-API lookup + scene queries over
  a running GUI Blender (`localhost:9876`). It coexists with the headless
  production path above; it does not replace it. The standing rules for all
  Blender model work (version lock, idempotency, the BANNED-PATTERNS list of
  removed/relocated APIs, the bmesh-vs-GeoNodes rule, the 5-iteration cap, and
  the PARAMS/sentinel output contract) live in `docs/BLENDER_AGENT.md` — read
  it before building geometry. Server venv + repo live under
  `/Users/maxmccollom/tools/blender_mcp` (outside this repo by design).

### Shippable realism ceiling for models (VERIFIED in-hall, LOCKED)
First production model `procedural/baluster.py` (a parametric turned baluster:
PARAMS-driven lathe profile of distinct turning elements + angle-limited bevel)
was proved through the full chain — Cycles bake -> baked glb -> in-hall harness
screenshots at visitor eye level. The finding governs every model from here:
- **Shippable procedural realism = FORM + BEVEL GEOMETRY ONLY.** Bevel reads
  excellently under matcap (beveled normals perturb the matcap lookup); it ships
  as geometry. That is the whole win.
- **Baked PBR maps do NOT survive this lighting model.** The scene is matcap /
  no real-time lights, so a baked normal map washes out (normal maps need
  directional light this scene lacks) and a baked albedo mottling map is
  redundant (the estate matcap already applies its own tarnish). Baking ~4x'd
  the file size for near-zero in-hall gain. **Do not bake albedo/normal for
  estate models.** More surface life comes from matcap character or real relief
  geometry for hero objects, never baked maps.
- **Drop-in recipe:** export form+bevel geometry, drop into `public/models/`,
  render with `<ExternalModel url=... matcap />`. The matcap path
  (`estateMaterials.makeModelMatcap`) rebinds the glb's dead PBR material to the
  estate matcap (`makeEstateMatcap` now accepts optional `map`/`normalMap`).
  `?model` demos `baluster.glb` in the slot. Full rationale in
  `docs/BLENDER_AGENT.md`. Allowlist gained `dir:procedural/:py json`.

### Open / deferred (deliberate, not gaps)
- Max's leva feel values are UNBAKED, pending friends-and-family testing; the
  sliders stay live. Do not bake or alter them.
- The descent is the weaker zone (darker, less compositionally resolved).
- Verification was on the dev server, not the built `dist/` bundle (low risk).

### Verification harnesses (the loop; `harness/`)
`shoot.mjs` (multi-angle stills, real GPU, ?harness=1 scriptable camera),
`verify-slice.mjs` (movement/descent/inspects/wins/persistence),
`journey2.mjs` (orrery launch + resume both zones), `verify-close.mjs`
(close path stays closed), `verify-hardening.mjs` (FPS degrade + mobile).
