# Parametric turned baluster for the Katabasis estate balustrades.
#
# A lathe-a-profile job: a single vase/urn silhouette (PARAMS["profile"]) is
# Catmull-Rom densified so the turned curve is a real curve (not faceted on the
# outline), revolved around Z with bmesh.ops.spin, and capped top/bottom by
# square plinth + cap blocks the way a real turned baluster meets its rail/base.
#
# Coordinates: built Blender Z-up; the lathe axis is Z, which glTF export maps to
# three's Y (vertical). Base sits at z=0, so it exports standing on the floor
# (y=0), matching build_hall.py conventions.
#
# Runs two ways (no __main__ guard, so exec(open(...).read()) fires it live):
#   - Interactive (GUI):  builds + renders studio stills. RENDER=auto renders
#                         only when not --background.
#   - Headless export:    Blender --background --python blender/baluster.py
#                         EXPORT=auto exports a glb only under --background.
# Env: RENDER (auto/0/1), EXPORT (auto/0/1), RENDER_DIR, OUT (glb path).
import bpy, bmesh, math, os
from mathutils import Vector

PARAMS = {
    "name": "baluster",
    "height": 1.00,        # total height, base to top (Blender Z -> three Y)
    "plinth_h": 0.10,      # square base block height
    "plinth_hw": 0.115,    # base block half-width
    "cap_h": 0.075,        # square top block height
    "cap_hw": 0.105,       # top block half-width
    "belly_r": 0.140,      # max radius of the turned body (the belly)
    "spin_steps": 96,      # radial resolution around Z (crisp rings)
    "r_start": 0.40,       # body radius where it leaves the plinth (frac belly_r)

    # --- realism levers (see the ceiling notes in docs/DECISIONS / handoff) ---
    # edge_mode: "bevel" softens every sharp arris with a small angle-limited
    #   chamfer (real stone has no razor edges; reads as worn, kills the CG tell)
    #   and supersedes "split" (the razor-crisp split-normal prototype look).
    "edge_mode": "bevel",          # "bevel" | "split"
    "bevel": {"width": 0.0032, "segments": 2, "profile": 0.70, "angle_deg": 22},
    "material_mode": "stone",      # "stone" (procedural) | "flat"
    "surface_bump": True,          # fine procedural pitting/relief via bump nodes
    "render_samples": 96,

    # The turned body as an ordered sequence of architectural turning elements,
    # bottom -> top. Each element runs from the previous radius to its own `r`
    # (fraction of belly_r) over height `h` (relative; the column is normalized
    # to the body length). `bulge` offsets the radius mid-element: + = convex
    # (bead/torus/ovolo), - = concave (groove/scotia), 0 = straight (fillet/neck/
    # taper). `n` = samples along the element (more = rounder arc). `hard`=True
    # splits the ring at the TOP of the element so the join reads as a crisp cut.
    #
    # Crispness recipe: proud half-round beads (same start/end radius, big +bulge)
    # flanked by DEEP narrow grooves (same radius, big -bulge dipping below the
    # shaft) so each ring throws a real shadow line. Fillets are flat shoulders.
    "profile": [
        {"el": "fillet",   "r": 0.40, "h": 0.016, "bulge":  0.00, "n": 2,  "hard": True},
        {"el": "bead_foot","r": 0.40, "h": 0.072, "bulge":  0.20, "n": 16, "hard": True},
        {"el": "groove1",  "r": 0.40, "h": 0.028, "bulge": -0.12, "n": 10, "hard": True},
        # belly as ONE convex hump (peak ~1.0 mid) -> smooth rounded vase, no
        # crown facet. r0=0.40, r1=0.34, +0.63 bulge lifts the mid to belly_r.
        {"el": "vase",     "r": 0.34, "h": 0.365, "bulge":  0.63, "n": 30, "hard": True},
        {"el": "groove2",  "r": 0.34, "h": 0.020, "bulge": -0.11, "n": 9,  "hard": True},
        {"el": "astragal1","r": 0.34, "h": 0.040, "bulge":  0.17, "n": 13, "hard": True},
        {"el": "groove3",  "r": 0.34, "h": 0.020, "bulge": -0.11, "n": 9,  "hard": True},
        {"el": "neck",     "r": 0.30, "h": 0.075, "bulge":  0.00, "n": 3,  "hard": True},
        {"el": "groove4",  "r": 0.30, "h": 0.018, "bulge": -0.11, "n": 9,  "hard": True},
        {"el": "astragal2","r": 0.30, "h": 0.036, "bulge":  0.16, "n": 13, "hard": True},
        {"el": "groove5",  "r": 0.30, "h": 0.018, "bulge": -0.11, "n": 9,  "hard": True},
        {"el": "ovolo",    "r": 0.56, "h": 0.095, "bulge":  0.06, "n": 16, "hard": True},
        {"el": "fillet2",  "r": 0.50, "h": 0.018, "bulge":  0.00, "n": 2,  "hard": True},
    ],
    "stone_color": (0.46, 0.42, 0.36, 1.0),  # warm neutral stone (render only)
}

NAME = PARAMS["name"]
COLL = "KB_" + NAME
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# --- idempotency: purge only our own datablocks, never a scene wipe ----------
def purge():
    coll = bpy.data.collections.get(COLL)
    if coll:
        for o in list(coll.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(coll)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.lights,
                bpy.data.cameras):
        for d in list(col):
            if d.name.startswith(NAME) and d.users == 0:
                col.remove(d)


def get_collection():
    coll = bpy.data.collections.new(COLL)
    bpy.context.scene.collection.children.link(coll)
    return coll


# --- profile: ordered turning elements -> (radius, z) chain + hard-join z's ---
def build_profile():
    z0 = PARAMS["plinth_h"]
    z1 = PARAMS["height"] - PARAMS["cap_h"]
    body_h = z1 - z0
    R = PARAMS["belly_r"]
    elems = PARAMS["profile"]
    htot = sum(e["h"] for e in elems)

    z = z0
    r0 = PARAMS["r_start"]
    pts = [(r0 * R, z)]          # (radius, height) silhouette, bottom -> top
    hard_z = []                  # z heights to split into crisp rings
    for e in elems:
        seg_h = e["h"] / htot * body_h
        r1 = e["r"]
        bulge = e.get("bulge", 0.0)
        n = max(1, e.get("n", 8))
        for j in range(1, n + 1):
            u = j / n
            r_lin = r0 + (r1 - r0) * u
            rr = r_lin + bulge * math.sin(math.pi * u)   # 0 at ends, peak mid
            pts.append((max(rr, 0.0) * R, z + u * seg_h))
        z += seg_h
        r0 = r1
        if e.get("hard"):
            hard_z.append(z)
    return pts, hard_z, z0, z1


# --- geometry ----------------------------------------------------------------
def make_turned_body(coll):
    pts, hard_z, z0, z1 = build_profile()
    # flat axis caps top + bottom (hidden inside the blocks) -> watertight body
    sil = [(0.0, z0)] + pts + [(0.0, z1)]

    bm = bmesh.new()
    vchain = [bm.verts.new((r, 0.0, z)) for (r, z) in sil]
    echain = [bm.edges.new((vchain[i], vchain[i + 1]))
              for i in range(len(vchain) - 1)]
    bmesh.ops.spin(bm, geom=echain, cent=(0, 0, 0), axis=(0, 0, 1),
                   angle=2 * math.pi, steps=PARAMS["spin_steps"], use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    # "split" mode: cut the ring loop at every hard junction so normals break
    # across it (the razor-crisp prototype look). "bevel" mode leaves the body
    # welded and lets an angle-limited Bevel modifier round the arrises instead
    # (worn stone). split + bevel together would double-process, so it is one or
    # the other.
    if PARAMS["edge_mode"] == "split":
        rings = []
        for e in bm.edges:
            za, zb = e.verts[0].co.z, e.verts[1].co.z
            if abs(za - zb) < 1e-5:  # a horizontal ring edge
                for hz in hard_z:
                    if abs(za - hz) < 1e-4:
                        rings.append(e)
                        break
        if rings:
            bmesh.ops.split_edges(bm, edges=rings)

    me = bpy.data.meshes.new(NAME + "_body")
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True  # smooth within each element; splits keep joins hard
    obj = bpy.data.objects.new(NAME + "_body", me)
    coll.objects.link(obj)
    return obj


def make_block(coll, suffix, hw, z_bottom, h):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(2 * hw, 2 * hw, h), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, 0, z_bottom + h / 2), verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(NAME + "_" + suffix)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False  # crisp square block
    obj = bpy.data.objects.new(NAME + "_" + suffix, me)
    coll.objects.link(obj)
    return obj


# --- stone material: flat, or procedural color/roughness/bump variation ------
# NOTE on the shippable ceiling: this node graph reads in a Blender render, but
# procedural nodes do NOT survive glTF export, and the live site is matcap /
# no real-time lights (see ExternalModel/BakedHall). To reach the site this must
# be BAKED to color/normal maps, and even then roughness/specular response is
# lost (matcap/unlit). Bevel geometry, by contrast, ships natively.
def make_stone_material(stone, bump):
    mat = bpy.data.materials.new(NAME + "_mat")
    mat.use_nodes = True
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.82
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    if not stone:
        bsdf.inputs["Base Color"].default_value = PARAMS["stone_color"]
        return mat

    # base-color mottling: low-freq noise -> ramp between two limestone tones
    ncol = nodes.new("ShaderNodeTexNoise")
    ncol.inputs["Scale"].default_value = 3.2
    ncol.inputs["Detail"].default_value = 2.0
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.34
    ramp.color_ramp.elements[0].color = (0.40, 0.36, 0.30, 1)
    ramp.color_ramp.elements[1].position = 0.74
    ramp.color_ramp.elements[1].color = (0.53, 0.49, 0.42, 1)
    links.new(ncol.outputs["Factor"], ramp.inputs["Factor"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])

    # roughness variation so highlights break up instead of reading plastic
    nro = nodes.new("ShaderNodeTexNoise")
    nro.inputs["Scale"].default_value = 9.0
    mr = nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 0.70
    mr.inputs["To Max"].default_value = 0.92
    links.new(nro.outputs["Factor"], mr.inputs["Value"])
    links.new(mr.outputs["Result"], bsdf.inputs["Roughness"])

    if bump:
        # fine pitting (high-freq noise) + coarser voronoi cells, chained bumps
        nf = nodes.new("ShaderNodeTexNoise")
        nf.inputs["Scale"].default_value = 48.0
        nf.inputs["Detail"].default_value = 8.0
        nf.inputs["Roughness"].default_value = 0.7
        b1 = nodes.new("ShaderNodeBump")
        b1.inputs["Strength"].default_value = 0.18
        b1.inputs["Distance"].default_value = 0.004
        links.new(nf.outputs["Factor"], b1.inputs["Height"])
        vor = nodes.new("ShaderNodeTexVoronoi")
        vor.inputs["Scale"].default_value = 26.0
        b2 = nodes.new("ShaderNodeBump")
        b2.inputs["Strength"].default_value = 0.10
        b2.inputs["Distance"].default_value = 0.004
        links.new(vor.outputs["Distance"], b2.inputs["Height"])
        links.new(b1.outputs["Normal"], b2.inputs["Normal"])
        links.new(b2.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def build():
    coll = get_collection()
    body = make_turned_body(coll)
    plinth = make_block(coll, "plinth", PARAMS["plinth_hw"], 0.0,
                        PARAMS["plinth_h"])
    cap = make_block(coll, "cap", PARAMS["cap_hw"],
                     PARAMS["height"] - PARAMS["cap_h"], PARAMS["cap_h"])

    # join into one object (body is active, so the result keeps its name root)
    bpy.ops.object.select_all(action="DESELECT")
    for o in (body, plinth, cap):
        o.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = NAME
    obj.data.name = NAME

    # worn arrises: a small angle-limited bevel rounds every sharp edge (block
    # corners, fillet shoulders, bead rims) while leaving the smooth vase alone.
    if PARAMS["edge_mode"] == "bevel":
        bev = obj.modifiers.new("stone_bevel", "BEVEL")
        bev.limit_method = "ANGLE"
        bev.angle_limit = math.radians(PARAMS["bevel"]["angle_deg"])
        bev.width = PARAMS["bevel"]["width"]
        bev.segments = PARAMS["bevel"]["segments"]
        bev.profile = PARAMS["bevel"]["profile"]

    mat = make_stone_material(PARAMS["material_mode"] == "stone",
                              PARAMS["surface_bump"])
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


# --- authoring render rig (lights/cam live in our collection; purged + not
#     exported, since export is use_selection on the baluster only) -----------
def add_area_light(coll, name, location, energy, size):
    ld = bpy.data.lights.new(NAME + "_" + name, "AREA")
    ld.energy = energy
    ld.size = size
    lo = bpy.data.objects.new(NAME + "_" + name, ld)
    lo.location = location
    coll.objects.link(lo)
    target = Vector((0, 0, PARAMS["height"] * 0.5))
    lo.rotation_euler = (target - Vector(location)).to_track_quat('-Z', 'Y').to_euler()
    return lo


def add_camera(coll, name, location, ortho=False):
    cd = bpy.data.cameras.new(NAME + "_" + name)
    co = bpy.data.objects.new(NAME + "_" + name, cd)
    co.location = location
    coll.objects.link(co)
    target = Vector((0, 0, PARAMS["height"] * 0.5))
    co.rotation_euler = (target - Vector(location)).to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = PARAMS["height"] * 1.18
    return co


def studio_render(obj):
    coll = bpy.data.collections.get(COLL)
    rdir = os.environ.get("RENDER_DIR", os.path.join(ROOT, "procedural", "_renders"))
    os.makedirs(rdir, exist_ok=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x = 760
    sc.render.resolution_y = 1100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "Standard"  # AgX washes flat product shots
    sc.view_settings.look = "None"
    # best-effort EEVEE-Next quality: samples + ray-traced AO/GI so the grooves
    # self-shadow and the bump reads (property names vary across 4.x/5.x).
    ee = getattr(sc, "eevee", None)
    if ee is not None:
        for attr, val in (("taa_render_samples", PARAMS["render_samples"]),
                          ("use_raytracing", True),
                          ("use_gtao", True),
                          ("use_shadows", True)):
            try:
                setattr(ee, attr, val)
            except Exception:
                pass
    world = sc.world or bpy.data.worlds.new(NAME + "_w")
    sc.world = world
    world.use_nodes = True
    wbg = world.node_tree.nodes["Background"]

    # dark world + lit object: crisp silhouette against black, suits the mood.
    # Energies tuned numerically (no clipping at full res); see DECISIONS notes.
    wbg.inputs["Color"].default_value = (0.02, 0.022, 0.028, 1)
    wbg.inputs["Strength"].default_value = 1.0

    H = PARAMS["height"]
    d = H * 1.6
    key = add_area_light(coll, "key", (d * 0.55, -d * 0.7, H * 1.25), 10.0, 1.4)
    fill = add_area_light(coll, "fill", (-d * 0.7, -d * 0.55, H * 0.7), 3.0, 1.8)
    side_cam = add_camera(coll, "cam_side", (0.0, -d * 1.3, H * 0.5), ortho=True)
    q_cam = add_camera(coll, "cam_34", (d * 0.85, -d * 0.95, H * 0.78), ortho=False)

    # Isolate the render to our collection: hide every other object from the
    # render so nothing in the user's scene (e.g. the default Cube enclosing the
    # origin) occludes the baluster. Reversible; restored below.
    ours = set(coll.objects)
    hidden = [(o, o.hide_render) for o in sc.objects if o not in ours]
    for o, _ in hidden:
        o.hide_render = True
    try:
        shots = []
        # 1) orthographic side ELEVATION: key + soft fill so BOTH silhouette
        #    edges read; the curve being judged is the raw outline against black.
        sc.camera = side_cam
        p1 = os.path.join(rdir, "baluster_side.png")
        sc.render.filepath = p1
        bpy.ops.render.render(write_still=True)
        shots.append(p1)
        # 2) 3/4 perspective: same rig, reads the turned form in the round.
        sc.camera = q_cam
        p2 = os.path.join(rdir, "baluster_34.png")
        sc.render.filepath = p2
        bpy.ops.render.render(write_still=True)
        shots.append(p2)
    finally:
        for o, prev in hidden:
            o.hide_render = prev
    return shots


def _export_selected(obj, out, tangents=False):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=out, export_format="GLB", use_selection=True,
        export_apply=True, export_texcoords=True, export_normals=True,
        export_tangents=tangents, export_extras=False,
    )
    return out


def export_glb(obj):
    out = os.environ.get("OUT", os.path.join(ROOT, "public", "models", "baluster.glb"))
    return _export_selected(obj, out)


# --- the shippable chain: bake the procedural surface (mottling + bump) to maps
#     that survive glTF, and emit TWO glbs so the site A/B is real:
#       baluster_bevel.glb  geometry + bevel only (no maps)
#       baluster_full.glb   geometry + bevel + baked albedo + baked normal
#     Needs Cycles, so this runs HEADLESS (the MCP GUI instance is EEVEE-only).
def bake_and_export(obj):
    models = os.path.join(ROOT, "public", "models")
    os.makedirs(models, exist_ok=True)
    LM = int(os.environ.get("BAKE_LM", "1024"))

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    # bake/ship the final geometry: apply the bevel so form+arrises are baked in
    for m in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=m.name)
        except Exception as e:  # noqa
            print("KB_BALUSTER modifier_apply failed", m.name, e)

    # 1) bevel-only glb (no textures -> the site applies a plain estate matcap)
    bevel_path = _export_selected(obj, os.path.join(models, "baluster_bevel.glb"))

    # 2) UV unwrap for the bake target
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    me = obj.data
    if "UVMap" not in [l.name for l in me.uv_layers]:
        me.uv_layers.new(name="UVMap")
    me.uv_layers.active = me.uv_layers["UVMap"]
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")

    # 3) bake albedo (DIFFUSE colour pass) and normal (tangent) from the
    #    procedural stone+bump material into images.
    mat = obj.data.materials[0]
    nt = mat.node_tree
    alb = bpy.data.images.new(NAME + "_albedo", LM, LM)
    nrm = bpy.data.images.new(NAME + "_normal", LM, LM)
    nrm.colorspace_settings.name = "Non-Color"
    tgt = nt.nodes.new("ShaderNodeTexImage")
    tgt.select = True
    nt.nodes.active = tgt

    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    try:
        sc.cycles.device = "GPU"
    except Exception:
        pass
    sc.cycles.samples = int(os.environ.get("BAKE_SAMPLES", "64"))
    bk = sc.render.bake
    bk.margin = 8
    bk.use_pass_direct = False
    bk.use_pass_indirect = False
    bk.use_pass_color = True

    tgt.image = alb
    print("KB_BALUSTER_BAKE albedo")
    bpy.ops.object.bake(type="DIFFUSE")
    alb.filepath_raw = os.path.join(models, "baluster_albedo.png")
    alb.file_format = "PNG"
    alb.save()

    tgt.image = nrm
    print("KB_BALUSTER_BAKE normal")
    bpy.ops.object.bake(type="NORMAL")  # tangent space, +Y (glTF/OpenGL)
    nrm.filepath_raw = os.path.join(models, "baluster_normal.png")
    nrm.file_format = "PNG"
    nrm.save()

    # 4) export material: Principled with baked albedo + normal map -> glTF gets
    #    baseColorTexture + normalTexture (the site reads these onto its matcap).
    em = bpy.data.materials.new(NAME + "_baked")
    em.use_nodes = True
    ent = em.node_tree
    bsdf = ent.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.82
    ta = ent.nodes.new("ShaderNodeTexImage")
    ta.image = alb
    ent.links.new(ta.outputs["Color"], bsdf.inputs["Base Color"])
    tn = ent.nodes.new("ShaderNodeTexImage")
    tn.image = nrm
    nm = ent.nodes.new("ShaderNodeNormalMap")
    ent.links.new(tn.outputs["Color"], nm.inputs["Color"])
    ent.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    obj.data.materials.clear()
    obj.data.materials.append(em)

    full_path = _export_selected(obj, os.path.join(models, "baluster_full.glb"),
                                 tangents=True)
    print("KB_BALUSTER_BAKE_OK", bevel_path, full_path)
    return full_path


# --- top level (no guard, so exec() fires it) --------------------------------
purge()
_obj = build()

_render = os.environ.get("RENDER", "auto")
_do_render = (_render == "1") or (_render == "auto" and not bpy.app.background)
_bake = os.environ.get("BAKE", "0") == "1"
_export = os.environ.get("EXPORT", "auto")
_do_export = (not _bake) and ((_export == "1") or (_export == "auto" and bpy.app.background))

_shots = studio_render(_obj) if _do_render else []
_path = bake_and_export(_obj) if _bake else (export_glb(_obj) if _do_export else "")
KB_BALUSTER_RESULT = {"shots": _shots, "glb": _path,
                      "verts": len(_obj.data.vertices),
                      "polys": len(_obj.data.polygons)}
print("KB_BALUSTER_OK", _path or "(no-export)", KB_BALUSTER_RESULT)
