#!/usr/bin/env python3
"""
build_eldermoor.py  —  Eldermoor character asset builder + renderer (Blender 4.2+)

This is the *asset generator*. It builds the adventurer as real Blender geometry
with proper materials, three-point lighting, depth of field, and Cycles ray tracing.
Quality defaults are PRODUCTION, not sandbox. Run it on a machine with a GPU.

USAGE (your machine, full quality — auto-detects GPU):
    blender --background --python build_eldermoor.py

FAST iteration preview:
    blender --background --python build_eldermoor.py -- --preview

Override anything:
    blender --background --python build_eldermoor.py -- \
        --samples 512 --res 2400 3000 --out hero_final.png --device GPU

Notes:
  * Coordinates are authored in the same space as the web render (Y up, +Z forward)
    and converted to Blender (Z up, front = -Y) via conv(); reuse is intentional so
    the model stays identical to what you approved.
  * Geometry is flat-shaded (the RuneScape-era faceted register) with a light bevel
    so edges catch a highlight — the trick that makes low-poly read as "finished."
"""

import bpy, sys, math, os
from math import radians

# ----------------------------------------------------------------------------- args
def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--")+1:] if "--" in argv else []
    cfg = dict(samples=384, res=(1800, 2250), out="eldermoor_hero.png",
               device="AUTO", preview=False)
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--preview":
            cfg["preview"] = True
        elif a == "--samples":
            cfg["samples"] = int(argv[i+1]); i += 1
        elif a == "--res":
            cfg["res"] = (int(argv[i+1]), int(argv[i+2])); i += 2
        elif a == "--out":
            cfg["out"] = argv[i+1]; i += 1
        elif a == "--device":
            cfg["device"] = argv[i+1].upper(); i += 1
        i += 1
    if cfg["preview"]:
        cfg["samples"] = 48
        cfg["res"] = (720, 900)
    # Resolve a relative --out against this script's own folder (the eldermoor
    # project dir). Run head-less there is no .blend, so Blender would otherwise
    # resolve a bare filename against the drive root (C:\) and fail to save.
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
    except NameError:
        script_dir = os.getcwd()
    if not os.path.isabs(cfg["out"]):
        cfg["out"] = os.path.join(script_dir, cfg["out"])
    return cfg

CFG = parse_args()

# ------------------------------------------------------------------- color helpers
def _hex(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
def _s2l(c):
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
def lin(h):
    r, g, b = _hex(h)
    return (_s2l(r), _s2l(g), _s2l(b), 1.0)

# coordinate conversion: authored (x, y_up, z_fwd) -> Blender (x, -z_fwd, y_up)
def conv(x, y, z): return (x, -z, y)
def dimsB(dx, dy, dz): return (dx, dz, dy)

# ------------------------------------------------------------------------ material
_mats = {}
def M(name, hexcol, rough=0.85, metal=0.0):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = lin(hexcol)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    _mats[name] = m
    return m

# ------------------------------------------------------------- primitive factories
def _finish(o, mat, bevel=0.004, flat=True):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if flat:
        bpy.ops.object.shade_flat()
    o.data.materials.append(mat)
    if bevel > 0:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel; mod.segments = 2
        mod.limit_method = "ANGLE"; mod.angle_limit = radians(35)
    return o

def cube(dims, pos, mat, rot=None, bevel=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=conv(*pos))
    o = bpy.context.active_object
    o.scale = dimsB(*dims)
    if rot: o.rotation_euler = rot
    return _finish(o, mat, bevel)

def cyl(rt, rb, h, pos, mat, verts=10, rot=None, bevel=0.003):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=rb, radius2=rt, depth=h, location=conv(*pos))
    o = bpy.context.active_object
    if rot: o.rotation_euler = rot
    return _finish(o, mat, bevel)

def cone(rb, h, pos, mat, verts=3, rot=None, scale=(1, 1, 1), bevel=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=rb, radius2=0.0, depth=h, location=conv(*pos))
    o = bpy.context.active_object
    o.scale = dimsB(*scale)
    if rot: o.rotation_euler = rot
    return _finish(o, mat, bevel)

def ico(r, pos, mat, subdiv=2, scale=(1, 1, 1), rot=None, bevel=0.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=r, location=conv(*pos))
    o = bpy.context.active_object
    o.scale = dimsB(*scale)
    if rot: o.rotation_euler = rot
    return _finish(o, mat, bevel)

# ===================================================================== build scene
def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for d in list(blk):
            blk.remove(d)

# palette
SKIN, HAIR = "#e8b98e", "#3a2a1c"
TUNIC, TRIM, CAPE = "#3f6f8c", "#d8b25a", "#9c3030"
TROUSER, LEATHER, STEEL, SOLE, EYE = "#2f3742", "#5a3f28", "#c2cad4", "#3a2a1c", "#241812"

def build_head(cx, cy, cz):
    """Sculpted low-poly head at authored center (cx,cy_up,cz_fwd)."""
    skin = M("skin", SKIN, 0.62); hair = M("hair", HAIR, 0.95); eye = M("eye", EYE, 0.5); beard = M("beard", "#4a3420", 1.0)
    # --- tapered skull ---
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.2, location=(0, 0, 0))
    skull = bpy.context.active_object
    for v in skull.data.vertices:
        x, y, z = v.co
        if z < 0:                                  # pinch lower verts -> chin
            f = max(0.5, 1 + z * 1.15); x *= f; y *= f
        y = y * 0.9 if y > 0 else y * 1.05          # flatten back / fuller face (front = -y)
        v.co = (x, y, z)
    skull.location = conv(cx, cy, cz)
    skull.scale = (0.96, 1, 1.18)
    _finish(skull, skin, bevel=0.0)
    # features (authored offsets added to head center)
    def hp(lx, ly, lz): return (cx + lx, cy + ly, cz + lz)
    cube((0.26, 0.045, 0.08), hp(0, 0.05, 0.16), skin, rot=(radians(-8), 0, 0))            # brow
    cone(0.062, 0.18, hp(0, -0.01, 0.17), skin, verts=3, rot=(radians(105), 0, 0), scale=(0.8, 1, 1))  # nose
    cube((0.09, 0.045, 0.03), hp(0.08, -0.01, 0.17), eye, rot=(0, radians(10), 0))         # eye L
    cube((0.09, 0.045, 0.03), hp(-0.08, -0.01, 0.17), eye, rot=(0, radians(-10), 0))       # eye R
    ico(0.205, hp(0, 0.075, -0.02), hair, scale=(1.07, 0.72, 1.09))                        # hair top
    cube((0.28, 0.08, 0.1), hp(0, 0.15, 0.1), hair, rot=(radians(-22), 0, 0))              # fringe
    cube((0.07, 0.22, 0.17), hp(0.185, 0, -0.02), hair)                                    # sideburn L
    cube((0.07, 0.22, 0.17), hp(-0.185, 0, -0.02), hair)                                   # sideburn R
    cube((0.27, 0.2, 0.1), hp(0, 0.02, -0.16), hair)                                       # back
    cube((0.2, 0.1, 0.09), hp(0, -0.16, 0.11), beard)                                      # beard chin
    cube((0.08, 0.15, 0.09), hp(0.135, -0.07, 0.09), beard)                                # beard jaw L
    cube((0.08, 0.15, 0.09), hp(-0.135, -0.07, 0.09), beard)                               # beard jaw R

def build_boot(x, ybase):
    lea = M("leather", LEATHER, 0.8); sole = M("sole", SOLE, 0.9)
    o = (x, ybase, 0)  # boot origin (authored)
    cube((0.19, 0.16, 0.2), (o[0], o[1] + 0.0, -0.02), lea)     # ankle
    cube((0.2, 0.12, 0.3), (o[0], o[1] - 0.06, 0.12), lea)      # foot
    cube((0.18, 0.07, 0.12), (o[0], o[1] - 0.03, 0.28), lea)    # toe
    cube((0.22, 0.04, 0.44), (o[0], o[1] - 0.115, 0.1), sole)   # sole

def build_hero():
    tunic = M("tunic", TUNIC, 0.82); trim = M("trim", TRIM, 0.4, 0.6)
    trouser = M("trouser", TROUSER, 0.85); leather = M("leather", LEATHER, 0.7)
    steel = M("steel", STEEL, 0.3, 0.7); skin = M("skin", SKIN, 0.62); cape = M("cape", CAPE, 0.85)
    wood = M("wood", "#5a3f28", 0.75)

    # legs + boots
    for s in (1, -1):
        cyl(0.1, 0.12, 0.62, (0.15 * s, 0.51, 0), trouser, verts=8)
        build_boot(0.15 * s, 0.16)
    # pelvis + belt + buckle
    cube((0.42, 0.18, 0.28), (0, 0.88, 0), leather)
    cube((0.11, 0.09, 0.05), (0, 0.88, 0.155), trim)
    # torso + sloped shoulder yoke + tabard
    cyl(0.2, 0.27, 0.64, (0, 1.32, 0), tunic, verts=10)
    cyl(0.17, 0.25, 0.17, (0, 1.53, 0), tunic, verts=10)
    cube((0.22, 0.46, 0.04), (0, 1.34, 0.245), trim)
    # arms + hands
    for s in (1, -1):
        cyl(0.085, 0.1, 0.5, (0.3 * s, 1.31, 0), tunic, verts=8)
        ico(0.085, (0.3 * s, 1.03, 0), skin, scale=(1, 0.9, 1.1), subdiv=1)
    # neck + head
    cyl(0.07, 0.085, 0.12, (0, 1.66, 0), skin, verts=8)
    build_head(0, 1.86, 0)
    # sword held in near hand, blade upright and forward of the arm
    cube((0.055, 0.82, 0.015), (0.32, 1.52, 0.16), steel)      # blade
    cube((0.2, 0.05, 0.05), (0.32, 1.09, 0.16), trim)          # guard
    cyl(0.028, 0.028, 0.15, (0.32, 1.0, 0.16), leather, verts=8)  # grip
    ico(0.04, (0.32, 0.92, 0.16), trim, subdiv=1)              # pommel
    # shield on far arm (disc faces front = -Y)
    cyl(0.28, 0.28, 0.07, (-0.34, 1.02, 0.14), wood, verts=10, rot=(radians(90), 0, 0))
    cyl(0.3, 0.3, 0.03, (-0.34, 1.02, 0.16), steel, verts=10, rot=(radians(90), 0, 0))
    ico(0.065, (-0.34, 1.02, 0.2), trim, subdiv=1)
    # cape (draped vertical plane behind)
    bpy.ops.mesh.primitive_plane_add(size=1, location=conv(0, 1.12, -0.2))
    cp = bpy.context.active_object
    cp.scale = (0.62, 1.0, 1); cp.rotation_euler = (radians(92), 0, 0)
    _finish(cp, cape, bevel=0.0)

# --------------------------------------------------------------- stage / camera / lights
def build_stage():
    # ground
    ground = M("ground", "#d8d1c0", 0.92)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    _finish(bpy.context.active_object, ground, bevel=0.0)
    # soft backdrop world
    world = bpy.data.worlds.new("w"); bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = lin("#e9e4d7")
    bg.inputs[1].default_value = 0.7

    # aim target
    bpy.ops.object.empty_add(location=conv(0, 1.0, 0.0))
    target = bpy.context.active_object

    def area(name, loc, energy, size, color="#ffffff"):
        bpy.ops.object.light_add(type="AREA", location=loc)
        L = bpy.context.active_object; L.name = name
        L.data.energy = energy; L.data.size = size
        L.data.color = lin(color)[:3]
        c = L.constraints.new("TRACK_TO"); c.target = target
        c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
        return L

    area("key",  (-2.6, -3.2, 3.4), 1400, 3.0, "#fff2dc")
    area("fill", (3.2, -2.2, 1.9), 380, 4.0, "#cfe0ff")
    area("rim",  (-1.4, 3.0, 2.8), 1100, 2.2, "#ffe6c2")

    # camera with depth of field
    bpy.ops.object.camera_add(location=(1.0, -4.6, 1.42))
    cam = bpy.context.active_object
    cam.data.lens = 72
    cam.data.dof.use_dof = True
    cam.data.dof.focus_object = target
    cam.data.dof.aperture_fstop = 3.5
    c = cam.constraints.new("TRACK_TO"); c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    bpy.context.scene.camera = cam

# ----------------------------------------------------------------------- gpu / render
def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = CFG["samples"]
    scene.cycles.use_denoising = True
    try: scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception: pass
    scene.cycles.max_bounces = 12

    # device selection (auto-detect GPU; falls back to CPU)
    chosen = "CPU"
    if CFG["device"] in ("AUTO", "GPU"):
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            for ctype in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
                try:
                    prefs.compute_device_type = ctype
                    prefs.get_devices()
                    gpus = [d for d in prefs.devices if d.type == ctype]
                    if gpus:
                        for d in prefs.devices:
                            d.use = (d.type != "CPU")
                        chosen = ctype; break
                except Exception:
                    continue
        except Exception:
            pass
    scene.cycles.device = "GPU" if chosen != "CPU" else "CPU"
    print(f"[eldermoor] render device: {scene.cycles.device} ({chosen})")

    scene.render.resolution_x, scene.render.resolution_y = CFG["res"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = CFG["out"]
    # color management
    vs = scene.view_settings
    try: vs.view_transform = "AgX"
    except Exception: pass
    for look in ("AgX - Punchy", "Punchy", "None"):
        try: vs.look = look; break
        except Exception: continue

# ------------------------------------------------------------------------------ main
def main():
    clear_scene()
    build_hero()
    build_stage()
    setup_render()
    print(f"[eldermoor] rendering {CFG['res'][0]}x{CFG['res'][1]} @ {CFG['samples']} spp -> {CFG['out']}")
    bpy.ops.render.render(write_still=True)
    print("[eldermoor] done.")

main()
