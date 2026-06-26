# Art reference audit — fixtures, architecture, materials

Reference-driven pass for the default Hall → Descent experience. Goal: stop
inventing detail from primitive boxes; study license-safe references so the
procedural detail learns real shape language, and test whether importing a real
profiled asset beats boxes.

**Web research: AVAILABLE** (verified — live fetches to polyhaven.com, kenney.nl,
ambientcg.com, poly.pizza succeeded this session). Every entry below was checked
against the actual source page; nothing here is invented.

**Boundary note:** purely public 3D-art references (architecture/lighting/stone).
No trading/strategy content involved.

---

## License summary

| Source | License | Verified |
| --- | --- | --- |
| Poly Haven (models) | CC0 1.0 (public domain) | yes — asset page states CC0 |
| ambientCG (textures) | CC0 1.0 (public domain) | yes — docs.ambientcg.com/license: "copy, modify, distribute … even for commercial purposes, all without asking permission" |
| Kenney (asset packs) | CC0 1.0 (public domain) | yes — pack page states "Creative Commons CC0" |
| poly.pizza (Quaternius, Kay Lousberg) | CC0 1.0 (public domain) | yes — listed CC0; per-asset author credited |
| three.js / drei | MIT (code) | yes — library license |

No paid, no ripped-game, no AI-generated, no unclear-Sketchfab assets considered.

---

## Candidates

### 1. Poly Haven — Lantern_01
- URL: https://polyhaven.com/a/Lantern_01
- License: **CC0**
- Type: hurricane/storm lantern model (brass + painted variants, glass globe)
- Downloadable: Blend, glTF, USD, FBX
- Visual lesson: a real lantern is a **tapered body + ring caps + a glazed cage**,
  not a box cage. Proportions: tall narrow body, wider shoulder, fuel base.
- Decision: **REJECT import / KEEP as reference.** 34K tris and a 165.5 MB 4K
  package — far too heavy for a matcap web scene; a single fixture should be a
  few-hundred tris. Use it only to copy the silhouette procedurally.
- Risk/perf: high (poly + texture weight). Files touched if used: none (rejected).

### 2. Poly Haven — Lantern Chandelier 01
- URL: https://polyhaven.com/a/lantern_chandelier_01
- License: **CC0**
- Type: ornate Victorian brass lantern chandelier
- Downloadable: Blend, glTF, USD, FBX
- Visual lesson: hanging fixtures read via a **central stem + radiating arms +
  small repeated cups** — a rhythm, not one blob. Informs a richer HangingLantern.
- Decision: **REJECT import / reference only** (heavy + too ornate for the austere
  Doré register). Files touched if used: none.

### 3. Poly Haven — Brass Diya Lantern
- URL: https://polyhaven.com/a/brass_diya_lantern
- License: **CC0**
- Type: small brass oil lamp / diya
- Downloadable: Blend, glTF, USD, FBX
- Visual lesson: a **shallow bowl + lip + small spout** is the canonical flame-cup
  shape — directly informs the Sconce/FlameCup bowl profile (currently a plain
  cylinder; should be a bowl with a lip).
- Decision: **IMITATE procedurally** (bowl profile). Files touched if adopted:
  `src/world/detailKit.jsx` (FlameCup/Sconce cup geometry).

### 4. ambientCG — Bricks031 ("modern stone wall")
- URL: https://ambientcg.com/view?id=Bricks031
- License: **CC0 1.0**
- Type: PBR stone-wall texture set (albedo/normal/roughness/displacement), 1K–8K
- Downloadable: JPG/PNG texture maps (not a mesh)
- Visual lesson: stone walls have **coursed value variation + mortar lines + grime
  gradients**; our walls are a single flat matcap value (reads empty).
- Decision: **IMITATE procedurally** (a value/seam wall shader, or use a 1K albedo
  as a `map` on the existing matcap — `makeEstateMatcap` already supports `opts.map`).
  NOT a PBR pipeline change. Files touched if adopted: `src/render/estateMaterial.js`
  (a wall value branch) or a 1K albedo under `public/vendor/`.
- Risk/perf: low if a single 1K albedo; medium if multiple maps.

### 5. ambientCG — Concrete012 (sandstone/old-plaster)
- URL: https://ambientcg.com/view?id=Concrete012
- License: **CC0 1.0**
- Type: PBR sandstone/plaster texture set, 1K–8K
- Visual lesson: floor/large-surface stone needs **broad low-frequency mottling**,
  not just per-slab seams — informs the floor matcap value noise.
- Decision: **IMITATE procedurally** (tune the floor value noise). Files touched:
  `src/render/estateMaterial.js` floor branches.

### 6. Kenney — Modular Dungeon Kit
- URL: https://kenney.nl/assets/modular-dungeon-kit
- License: **CC0** (stated on page)
- Type: modular architecture kit (walls/floors/columns/props)
- Downloadable: glTF/OBJ/FBX per Kenney's standard *(formats not explicitly listed
  on the page I fetched — verify on download)*
- Visual lesson: modular kits **snap on a grid with consistent trim heights**;
  pieces share a base/cap module so everything aligns. Our pieces are bespoke per
  spot — adopting a shared trim-height module would make the world read systematic.
- Decision: **IMITATE procedurally** (shared trim-module constants) — importing a
  stylized low-poly dungeon kit would clash with the realist Doré cathedral.
- Risk/perf: n/a (not imported).

### 7. poly.pizza — Quaternius / Kay Lousberg low-poly lantern & torch
- URLs: https://poly.pizza/m/CtHBJ1ufeW (Kay Lousberg lantern),
  https://poly.pizza/u/Quaternius (torch/props)
- License: **CC0**
- Type: low-poly stylized lantern / wall torch (FBX/OBJ/glTF)
- Downloadable: yes, small (low-poly, typically tens of KB)
- Visual lesson: confirms the **canonical fixture silhouette** (cap → cage →
  fuel base; torch = bracket → sconce ring → flame) at minimal poly — a good
  proportion guide.
- Decision: **REJECT import / reference only.** Lightweight and CC0, but the
  flat-shaded stylized language clashes with the realist matcap cathedral even
  under the estate matcap. Use for proportions, not in-scene.

### 8. three.js GLTFLoader / drei useGLTF
- URLs: https://threejs.org/docs/pages/GLTFLoader.html ,
  https://github.com/pmndrs/drei (useGLTF)
- License: **MIT** (code)
- Type: asset-loading pattern
- Lesson/decision: **already implemented correctly** — `src/world/ExternalModel.jsx`
  loads glb via drei `useGLTF` with local Draco + KTX2 decoders, an ErrorBoundary,
  and applies the estate matcap (`makeModelMatcap`). The pipeline to ingest real
  profiled assets exists and is proven (it renders `baluster.glb`).

### 9. baluster.glb (project's own, in-repo)
- Path: `public/models/baluster.glb` (669 KB), generated by `procedural/baluster.py`
- License: project-own (procedurally generated; effectively public-domain)
- Type: a real **lathe-turned baluster** (vase/urn silhouette, 1.0 unit tall,
  ~0.23 wide, stands on its base) — a genuine profiled fixture, not a box
- Decision: **IMPORT (use existing).** This is the one fitting profiled asset
  already in the repo and already wired to the matcap pipeline. Ideal first test
  of "profiled geometry > boxes" with zero new-asset license/weight risk.

---

## Chosen visual lesson

**Real fixtures and architecture read through *curved, proportioned profiles and
shared trim modules* — turned balusters, tapered lantern bodies, bowl-lipped
flame cups, coursed/mottled stone — where Katabasis currently uses flat boxes and
plain cylinders.** The single highest-leverage correction is *profile* (silhouette
curvature), then *material value variation* on large flat surfaces.

A blunt finding from the research: the references that **fit** the realist Doré
cathedral (Poly Haven) are **too heavy** for a matcap web scene, and the assets
that are **lightweight** (Quaternius/Kay Lousberg) are **stylistically wrong**. So
for most detail the correct path is *reference-informed procedural*, not import.
The one exception is the project's own `baluster.glb`, which is both fitting and
already in-repo — the right first import test.

---

## Chosen vertical-slice plan — Option D (baluster.glb rails)

Replace the landing balustrade's **box** balusters with instances of the real
turned `baluster.glb`, through the existing `useGLTF` + matcap pipeline.

Why this is the best first test:
1. **Directly attacks the core critique** ("too boxy"): a turned profile vs a box
   is the clearest possible profiled-geometry proof.
2. **Zero new-asset risk:** the asset is already in the repo, license-clean, and
   its pipeline is already proven (it renders under `?model`).
3. **Dimensionally drop-in:** baluster.glb is 1.0 tall / ~0.23 wide — it lands on
   the exact footprint of the current box balusters.
4. **Honors the hard constraints:** matcap-only (via `makeModelMatcap`), no real
   lights, no PBR. To avoid adding 669 KB to the *default* load without approval,
   the test is **gated behind `?rails=baluster`** — the default keeps the boxes
   (no extra fetch), and the profiled version is an opt-in A/B for judgement.

Rejected alternatives: A/B (import a real lantern/sconce) — fitting assets too
heavy, light assets clash; C (floor/wall texture) — useful but lower-impact than
fixing the most-visible boxes, and best done as a shader value pass later.

No third-party assets are imported in this slice, so no new `LICENSES.md` entry is
required; `baluster.glb` provenance is recorded above.

### PROMOTED to default

The A/B test passed: the turned `baluster.glb` rail reads far better than the box
rail, so it is now the **default** landing rail (no longer opt-in). The flag
inverted accordingly:
- **Default route:** real turned `baluster.glb` balusters (one cached fetch on the
  Hall→Descent route; not fetched under `?arc=nadir`, which uses the split rail).
- **`?rails=boxes`:** rollback/debug — forces the old primitive box rail.
- The rail also **falls back to the box rail** automatically if the glb ever fails
  to load (an `AssetBoundary` around the loader), so the default path cannot break.

Net asset weight added to the default route: the in-repo `baluster.glb` (669 KB),
already present in the repo (not newly imported). No third-party / unclear-license
files were added. The broader finding stands: fitting external CC0 assets were too
heavy or stylistically mismatched, so the project's own profiled in-repo asset is
what carries the default rail.
