# BLENDER_AGENT.md — operating rules for procedural modeling in Blender

This is the standing brief for any session that builds Blender geometry for
Katabasis. It exists so a session stops re-discovering API breakages that have
already cost time. It is boundary-safe build documentation: it contains no
trading content and is committed to the public repo. Read it before touching
anything under `blender/`.

Two facts govern everything here:
- **Version lock: Blender 5.1.2, Python 3.13.** Training data older than this
  WILL be wrong about the API. When unsure of a 5.1 property or operator name,
  look it up against the *running* Blender (see "The MCP authoring loop"),
  never guess from memory.
- **Every claim below is graded by how it was verified.** Tags: `[ref-5.1]` =
  checked against the Blender 5.1 API reference bundled with the MCP server;
  `[live]` = confirmed against the running instance over MCP; `[prior-run]` =
  reported from an earlier build, not re-verified this session (treat as a
  strong prior, confirm live before relying on it).

---

## The two paths (they coexist; do not conflate them)

1. **Interactive authoring path — MCP over a VISIBLE Blender.** The official
   Blender Lab MCP add-on (v1.0.0) runs a TCP bridge inside a *running, GUI*
   Blender on `localhost:9876`. The `blender` MCP server (registered with
   Claude Code) relays Python and API-doc queries to it. Use this to author:
   query the live scene, look up the real 5.1 API, render-inspect-revise. It is
   NOT headless — it needs the window. It executes arbitrary Python live with no
   data guards, so it runs while Max is watching, never unattended.
2. **Production path — headless bake/export.** The proven pipeline
   (`blender/build_hall.py` and friends): procedural geometry -> UV2 ->
   Cycles bake -> glTF -> Draco/WebP. This is what produces the real asset.
   Author live over MCP, then commit the finished parametric script and run it
   `--background` for the actual bake/export.

Wiring (verified this session, durable paths):
- Repo clone: `/Users/maxmccollom/tools/blender_mcp` (well away from the site
  repo and the trading bot; never inside this repo's tree).
- MCP server venv (built from Blender's bundled 3.13, no brew/uv needed):
  `/Users/maxmccollom/tools/blender_mcp/.venv/bin/blender-mcp`.
- Registered with Claude Code as the `blender` stdio server (local scope).
- Pre-built add-on zip: `/Users/maxmccollom/tools/blender_mcp/_built/mcp-1.0.0.zip`.

The server health-check reading "Connected" only means the MCP server process is
healthy. Live-scene tools additionally require the GUI Blender add-on bridge to
be running on `:9876`; without it they fail with a socket error. The setup
runbook is in the handoff report / `docs/DECISIONS.md`.

---

## Idempotency contract (non-negotiable)

Geometry piled up across re-runs on an earlier build. Every model script MUST,
before it builds anything, purge its own named objects AND their orphaned data
(meshes, materials, node groups). Build into a known, named collection and clear
that collection first. A re-run must produce a scene identical to a first run.
`bpy.ops.outliner.orphans_purge` or explicit `bpy.data.*.remove(...)` of the
script's own datablocks — not a blanket scene wipe that would also delete the
user's work during interactive authoring.

---

## BANNED PATTERNS (removed / renamed / relocated APIs)

Each line: the dead pattern, the correct 5.1 form, and the verification grade.

- `mesh.use_auto_smooth` / `mesh.auto_smooth_angle` — **gone as mesh properties**
  (removed 4.1). Auto-smooth is now a modifier / operator. Note the trap: the
  *operator parameter* `bpy.ops.object.shade_auto_smooth(use_auto_smooth=...)`
  still exists, so a grep "finds" the name; the **mesh data property does not**.
  Correct: `bpy.ops.object.shade_smooth_by_angle(angle=...)`, or set
  `polygon.use_smooth` per face directly. `[ref-5.1: mesh property absent;
  shade_smooth_by_angle present at bpy.ops.object]`
  - **Headless gotcha:** `shade_auto_smooth` / `shade_smooth_by_angle` pull in
    the "Smooth by Angle" asset node group, whose load needs a window tick, so
    the operator can hang/fail under `--background`. In headless scripts, set
    smoothing manually (`for p in mesh.polygons: p.use_smooth = True`) or
    append/instantiate the node group directly. `[prior-run]`
- `Mesh.calc_normals()` — **removed** (4.0); normals are computed automatically
  now. Do not call it. If you need split/custom normals, use the current
  normals API on the mesh. `[ref-5.1: symbol absent from reference]`
- **Dict-style context overrides** — `bpy.ops.x(override_dict, ...)` was removed
  in the 4.x line. Correct: `with bpy.context.temp_override(**ctx):
  bpy.ops.x(...)`. `[ref-5.1: temp_override present with examples]`
- `bpy.app.version_char` — **removed** (4.3). Use `bpy.app.version` (a tuple)
  or `bpy.app.version_string`. `[ref-5.1: symbol absent from reference]`
- `material.cycles.displacement_method` — **relocated** (4.1). The property now
  lives directly on the material: `material.displacement_method`
  (`'BUMP'` | `'DISPLACEMENT'` | `'BOTH'`). `[ref-5.1: displacement_method
  confirmed on bpy.types.Material]`
- **Integer-index access to Geometry-Nodes sockets** — disabled in 5.0. Do NOT
  use `node.inputs[0]` / `modifier["Input_2"]`-by-position for typed socket
  access. Use name-based access: `node.inputs["Radius"]`, and set modifier
  inputs by the socket identifier. `[prior-run — confirm the exact accessor live
  via get_python_api_docs before relying on it]`

When you hit any API you are not certain is current, resolve it with the MCP
`get_python_api_docs` tool against the running 5.1 instance rather than guessing.
That is the entire point of the interactive path.

---

## Geometry rule

- **bmesh for actual geometry.** Real surfaces (lathe/spin, extrude, bevel,
  inset) are authored with `bmesh`: explicit, debuggable, no hidden evaluation
  order. This is the default for model bodies.
- **Geometry Nodes ONLY for instancing / distribution** — e.g. placing N
  balusters along a rail, scattering, array-on-curve. Not for sculpting the base
  form. Keep GeoNodes out of single-object body geometry.

---

## Screenshot-feedback discipline (the authoring loop)

render -> inspect -> revise, driven by Max's eye on the renders.
- Cap at **~5 visual iterations** per model. Past that the loop over-corrects
  destructively (each fix fighting the last). If 5 rounds have not converged,
  **reset to the last good parametric state and restart** from there rather than
  pushing further mutations onto a degrading object.
- Change one family of parameters per round so each render isolates a cause.

---

## Output contract (every model script)

- A single `PARAMS` dict at the very top. **No magic numbers** below it; every
  dimension reads from `PARAMS`. This is what makes the model parametric and
  re-tunable without spelunking.
- The script **runs headless** (`Blender --background --python <script>`) and
  exports a `.glb` (so it feeds the production pipeline), following the
  `build_hall.py` conventions: three-is-Y-up coordinate mapping, named
  collection, glTF export with the same flags.
- It prints an explicit success sentinel on completion (house style:
  `print("KB_<NAME>_OK", <path>)`), so the headless run is machine-verifiable.
- Idempotent per the contract above.

Model scripts are authored in `blender/` and graduate to `procedural/` (both
allowlisted for `.py`/`.json`; this doc lives in `docs/`). The first graduated
production model is `procedural/baluster.py` — use it as the reference for the
PARAMS/sentinel/idempotency contract and for the recipe below.

---

## Shippable realism ceiling (VERIFIED in-hall — applies to every model)

This estate is **matcap / no real-time lights** (`src/render/estateMaterial.js`,
`src/world/ExternalModel.jsx`, `src/world/BakedHall.jsx` — no lights or
environment exist in the scene). The baluster was proved end to end (Cycles bake
-> baked glb -> in-hall harness screenshots at visitor eye level), which settles
the recipe for all models here. Do not rediscover this:

- **Shippable procedural realism = FORM + BEVEL GEOMETRY ONLY.** A small
  angle-limited Bevel on the hard arrises reads excellently under matcap (the
  beveled normals perturb the matcap lookup, so edges catch light like worn
  stone). Form + bevel are geometry, so they ship natively and survive intact.
  This is the whole win.
- **Baked PBR maps do NOT survive the lighting model.**
  - A baked tangent-space **normal map barely reads and washes out entirely at
    visitor distance**: normal maps need DIRECTIONAL light, which this scene does
    not have. The soft near-diffuse matcap yields almost no contrast from normal
    perturbation.
  - A baked **albedo mottling map is largely REDUNDANT**: the estate matcap
    already applies its own procedural tarnish/mottling to all geometry.
  - Net: baking ~4x'd file size (669 KB -> 2.8 MB) for near-zero visible gain.
    **Do not bake albedo/normal for estate models.**
- **Levers for MORE surface life here** (never baked maps): (a) matcap character
  — a sharper or per-material tarnish in the matcap itself; (b) real relief
  GEOMETRY for hero objects seen up close (hand-sculpt).

**Default model pipeline:** export form+bevel geometry to a glb (the headless
default of a model script; `export_apply` applies the bevel), drop it into
`public/models/`, and render via `<ExternalModel url=... matcap />`. The matcap
drop-in path (`estateMaterials.makeModelMatcap`) rebinds the glb's dead PBR
material to the estate matcap, carrying any maps the glb happens to have. **Skip
the bake.** The `bake_and_export` path in `procedural/baluster.py` (`BAKE=1`)
remains as the evidence, gated off by default.
