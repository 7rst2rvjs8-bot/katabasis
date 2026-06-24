# HANDOFF — start here

## What Katabasis is
A free-roam 3D estate (a walkable Piranesi/Doré world) that presents a
systematic options-research system as an atmosphere, not a dashboard. The
**boundary rules, frozen marketing copy, and safety scaffolding are inviolable**
— they live in `CLAUDE.md` (sections 1-2 = boundary + repo safety, section 5 =
frozen copy), and the copy is mirrored verbatim in `src/copy.js`.

## Current state (verified)
A polished two-zone vertical slice is built and works end to end: the entry
**Hall** and a continuous descent into the **Descent** shaft, with free-roam
movement + Rapier collision, a damped camera, an inspect system that surfaces
the frozen copy diegetically (chapter I above, II below), two winnable minigames
via a drop-in registry, progress persistence, synthesized audio, adaptive
quality, and a mobile touch path. A **Blender bake pipeline operates** (procedural
geometry -> Cycles GI/AO bake -> Draco/WebP glb -> loads via DRACOLoader, shown
with `?baked`) and a **hand-model handoff slot is live**. Full architecture and
every locked decision are in `docs/DECISIONS.md` (read its "CURRENT ARCHITECTURE
& LOCKED DECISIONS" section first).

## How to run and verify
```sh
npm install
npm run dev          # http://localhost:5173  (drag to look, WASD/joystick to move, E or tap to inspect)
npm run build        # static build into dist/ (code-split; ~438 KB gzip initial)

# URL params
?treatment=charcoal|gold|ember   # mood (charcoal default)
?baked=1                         # load the Blender baked-GI hall instead of matcap
?harness=1                       # static scene + scriptable camera (for screenshots)
?solve=1                         # seed minigames one move from solved (harness)

# Screenshot + real-path harnesses (need `npm run dev` running). They drive the
# app on the real GPU and print pass/fail; they are your eyes.
node harness/shoot.mjs               # multi-angle stills (set URL/OUT/TAG env)
node harness/verify-slice.mjs        # movement, descent, both inspects, both wins, persistence
node harness/journey2.mjs            # orrery launch + resume in both zones
node harness/verify-close.mjs        # close buttons close and STAY closed
node harness/verify-hardening.mjs    # FPS degrade fires+recovers; mobile joystick + tap-inspect

# Blender (installed at /Applications/Blender.app). PATH fix:
sudo ln -s "/Applications/Blender.app/Contents/MacOS/Blender" /usr/local/bin/blender
# Re-bake the hall (procedural gen + Cycles bake + glb export), then compress:
BAKE=1 SAMPLES=256 LM=2048 "/Applications/Blender.app/Contents/MacOS/Blender" --background --python blender/build_hall.py
npx @gltf-transform/cli optimize public/models/hall.glb public/models/hall_draco.glb --compress draco --texture-compress webp
```

## Open items, prioritized (honest)
1. **Max's leva feel values are UNBAKED, pending friends-and-family testing.**
   The sliders (movement/camera in the leva panel) stay LIVE until then. Do not
   bake defaults or change them.
2. **The descent is the weaker zone** — darker and less compositionally resolved
   than the hall. Its vertiginous payoff is improved (crossing bridges read on
   the forward eye-line) but it wants more art direction.
3. **Baked-GI is a `?baked` demo, not the default.** To promote it, tune the
   Blender candle light-rig in `build_hall.py` for eye-level readability.
4. **KTX2 textures need tooling:** `brew install ktx` (or KTX-Software), then
   gltf-transform can emit KTX2; today WebP is the fallback.
5. **Audio is synthesized placeholder.** Howler + authored room-tone/footstep/
   cue assets is the upgrade.

## THE NEXT PHASE IS HAND-MODELING IN BLENDER
The pipeline and the handoff slot are **proven and waiting**. The remaining gap
to the target look (Moreau worked-surface density, hand-sculpted relief and
ornament, carved capitals/arches, a hero object) is **hand-modeled art, which
Claude Code cannot produce — it is Max's to build in Blender.** The contract is
`docs/ASSET_PIPELINE.md`: export per spec (UV2 for lightmaps, Draco, KTX2,
`col_`-prefixed collision meshes), drop the `.glb` into `public/models/`, and it
appears via `<ExternalModel>` — the live slot is in the hall at `[0, 0, 14]`
(currently the placeholder obelisk). No code rewiring needed.

## What NOT to do
- Do **not** rewrite or "improve" the frozen copy (`src/copy.js` / CLAUDE.md s5).
- Do **not** touch Max's leva values — they stay live pending testing.
- Do **not** sprawl into new zones; deepen the existing two and unblock the
  hand-modeling pipeline first. Depth over breadth.
- Do **not** relitigate settled decisions — they are in `docs/DECISIONS.md`.
- Do **not** weaken the boundary, safety scaffolding, or allowlist.
