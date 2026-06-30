#!/usr/bin/env python3
"""
build_kit.py  —  Eldermoor modular ENVIRONMENT kit builder + renderer (Blender 4.2+)

The environment counterpart to build_eldermoor.py. Builds the reusable, grid-aligned,
*textured* kit pieces that rooms are assembled from (walls, floors, ...), per ART_SPEC.md.
This is the real pipeline: procedural tiling materials (not flat plastic, not vertex noise),
faceted geometry with a light bevel, OSRS-style camera + flat/even lighting.

CHUNK 1 (this file): modular stone-wall segment + plank-floor tile, assembled into an
L-corner, rendered from the game camera for a side-by-side vs OSRS interior.

USAGE:
    "C:/Program Files/Blender Foundation/Blender 4.3/blender.exe" --background --python build_kit.py -- --preview
    blender --background --python build_kit.py -- --out kit_corner.png --samples 256

Coordinate convention matches build_eldermoor.py: author in (x, y_up, z_fwd); conv() to
Blender (Z up, front = -Y). One world unit ~= one OSRS floor tile.
"""

import bpy, sys, os, random as _rnd
from math import radians

# ----------------------------------------------------------------------------- args
def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--")+1:] if "--" in argv else []
    cfg = dict(samples=256, res=(1600, 1100), out="kit_corner.png", device="AUTO", preview=False, scene="corner", export=None)
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--preview": cfg["preview"] = True
        elif a == "--samples": cfg["samples"] = int(argv[i+1]); i += 1
        elif a == "--res": cfg["res"] = (int(argv[i+1]), int(argv[i+2])); i += 2
        elif a == "--out": cfg["out"] = argv[i+1]; i += 1
        elif a == "--device": cfg["device"] = argv[i+1].upper(); i += 1
        elif a == "--scene": cfg["scene"] = argv[i+1]; i += 1
        elif a == "--export": cfg["export"] = argv[i+1]; i += 1   # glTF .glb out path for the web client
        i += 1
    if cfg["preview"]:
        cfg["samples"] = 64; cfg["res"] = (900, 620)
    try: script_dir = os.path.dirname(os.path.abspath(__file__))
    except NameError: script_dir = os.getcwd()
    for k in ("out", "export"):
        if cfg[k] and not os.path.isabs(cfg[k]):
            cfg[k] = os.path.join(script_dir, cfg[k])
    return cfg

CFG = parse_args()
EXPORT = CFG.get("export")  # when exporting glTF, procedural materials are swapped for solid
                            # palette colors (glTF can't carry procedural nodes without a bake)

# ---------------------------------------------------------------- collision / nav export
# The kit emits a colliders JSON beside each glb so the web client builds its walls, prop
# colliders, walkable bounds, spawn, and pathfinding grid automatically — no hand-coding per
# building. Authored in the same (x, z) world space the client renders in.
COLLIDERS = {"rects": [], "circles": [], "bound": None, "spawn": None}
def creg_rect(x0, x1, z0, z1):   COLLIDERS["rects"].append([round(x0,3), round(x1,3), round(z0,3), round(z1,3)])
def creg_circle(x, z, r):        COLLIDERS["circles"].append([round(x,3), round(z,3), round(r,3)])
def cset_bound(x0, x1, z0, z1):  COLLIDERS["bound"] = [round(x0,3), round(x1,3), round(z0,3), round(z1,3)]
def cset_spawn(x, z, rot=0.0):   COLLIDERS["spawn"] = [round(x,3), round(z,3), round(rot,3)]

# ------------------------------------------------------------------- color helpers
def _hex(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
def _s2l(c): return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
def lin(h):
    r, g, b = _hex(h); return (_s2l(r), _s2l(g), _s2l(b), 1.0)

# authored (x, y_up, z_fwd) -> Blender (x, -z_fwd, y_up)
def conv(x, y, z): return (x, -z, y)
def dimsB(dx, dy, dz): return (dx, dz, dy)

# ----------------------------------------------------- procedural tiling materials
# Texel density is kept uniform across pieces by driving every texture from world-space
# Object coords through a Mapping node at the SAME scale (ART_SPEC §3).
def _base(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapp = nt.nodes.new("ShaderNodeMapping")
    nt.links.new(coord.outputs["UV"], mapp.inputs["Vector"])  # cube-projected UVs (see _finish)
    return m, nt, bsdf, mapp

def _brick_in(tex, key, val):
    # brick node socket names vary slightly by version; set defensively
    if key in tex.inputs: tex.inputs[key].default_value = val

def stone_mat():
    """Stone-block wall: visible courses, two tones + mortar, subtle bump."""
    m, nt, bsdf, mapp = _base("stone")
    mapp.inputs["Scale"].default_value = (1.0, 1.0, 1.0)
    tex = nt.nodes.new("ShaderNodeTexBrick")
    nt.links.new(mapp.outputs["Vector"], tex.inputs["Vector"])
    _brick_in(tex, "Color1", lin("#9a958a"))
    _brick_in(tex, "Color2", lin("#7c786f"))
    _brick_in(tex, "Mortar", lin("#49453f"))
    _brick_in(tex, "Scale", 1.0)
    _brick_in(tex, "Mortar Size", 0.045)
    _brick_in(tex, "Brick Width", 0.6)
    _brick_in(tex, "Row Height", 0.36)
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.92
    # faint grime variation so the stone isn't a flat repeat
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 8.0
    nt.links.new(mapp.outputs["Vector"], noise.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMixRGB"); mix.blend_type = "MULTIPLY"; mix.inputs["Fac"].default_value = 0.06
    nt.links.new(tex.outputs["Color"], mix.inputs["Color1"])
    nt.links.new(noise.outputs["Color"], mix.inputs["Color2"])
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    # bump from the mortar grooves
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25
    nt.links.new(tex.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m

def plank_mat():
    """Wood plank floor: long strips via an elongated brick, warm tones, grain noise."""
    m, nt, bsdf, mapp = _base("plank")
    mapp.inputs["Scale"].default_value = (1.0, 1.0, 1.0)
    tex = nt.nodes.new("ShaderNodeTexBrick")
    nt.links.new(mapp.outputs["Vector"], tex.inputs["Vector"])
    _brick_in(tex, "Color1", lin("#7a5631"))
    _brick_in(tex, "Color2", lin("#634327"))
    _brick_in(tex, "Mortar", lin("#3d2a17"))
    _brick_in(tex, "Scale", 1.0)
    _brick_in(tex, "Mortar Size", 0.012)
    _brick_in(tex, "Brick Width", 2.4)   # long planks
    _brick_in(tex, "Row Height", 0.34)
    # grain streaks along the planks
    wave = nt.nodes.new("ShaderNodeTexWave"); wave.inputs["Scale"].default_value = 1.5
    wave.inputs["Distortion"].default_value = 6.0; wave.inputs["Detail"].default_value = 3.0
    nt.links.new(mapp.outputs["Vector"], wave.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMixRGB"); mix.blend_type = "MULTIPLY"; mix.inputs["Fac"].default_value = 0.18
    nt.links.new(tex.outputs["Color"], mix.inputs["Color1"])
    nt.links.new(wave.outputs["Color"], mix.inputs["Color2"])
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.8
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.15
    nt.links.new(tex.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m

# ------------------------------------------------------------- geometry primitives
def _finish(o, mat, bevel=0.02, flat=True):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if flat: bpy.ops.object.shade_flat()
    # world-consistent UVs via cube projection -> brick maps onto every face orientation
    # and texel density is uniform across the whole kit (ART_SPEC §3)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=1.0, correct_aspect=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    o.data.materials.append(mat)
    if bevel > 0:
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = bevel; mod.segments = 2
        mod.limit_method = "ANGLE"; mod.angle_limit = radians(40)
    return o

def block(dims, pos, mat, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=conv(*pos))
    o = bpy.context.active_object; o.scale = dimsB(*dims)
    return _finish(o, mat, bevel)

def cyl(rt, rb, h, pos, mat, verts=10, rot=None, bevel=0.01):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=rb, radius2=rt, depth=h, location=conv(*pos))
    o = bpy.context.active_object
    if rot: o.rotation_euler = rot
    return _finish(o, mat, bevel)

def ico(r, pos, mat, subdiv=1, scale=(1, 1, 1), bevel=0.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=r, location=conv(*pos))
    o = bpy.context.active_object; o.scale = dimsB(*scale)
    return _finish(o, mat, bevel)

def solid(name, hexcol, rough=0.85, metal=0.0):
    """Flat palette color for low-detail props (OSRS props are mostly untextured solids)."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = lin(hexcol)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m

def emissive(name, hexcol, strength=4.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = lin(hexcol)
    for k in ("Emission Color", "Emission"):
        if k in b.inputs: b.inputs[k].default_value = lin(hexcol)
    if "Emission Strength" in b.inputs: b.inputs["Emission Strength"].default_value = strength
    return m

# ===================================================================== kit pieces
WALL_H = 3.0; WALL_T = 0.32; TILE = 2.0  # one grid tile = 2 units

def wall_segment(center, length, axis, mat):
    """One modular wall run. axis 'x' runs along X, 'z' runs along Z (authored)."""
    cx, cy, cz = center
    if axis == "x":
        block((length, WALL_H, WALL_T), (cx, cy + WALL_H/2, cz), mat)
    else:
        block((WALL_T, WALL_H, length), (cx, cy + WALL_H/2, cz), mat)
    # capstone course on top to finish the silhouette
    if axis == "x":
        block((length + 0.06, 0.16, WALL_T + 0.12), (cx, cy + WALL_H + 0.06, cz), mat, bevel=0.04)
    else:
        block((WALL_T + 0.12, 0.16, length + 0.06), (cx, cy + WALL_H + 0.06, cz), mat, bevel=0.04)

def floor_tiles(nx, nz, mat):
    """Plank floor grid centered at origin, sitting at y=0."""
    block((nx * TILE, 0.12, nz * TILE), (0, -0.06, 0), mat)

def build_corner():
    stone = stone_mat(); plank = plank_mat()
    nx, nz = 3, 3
    floor_tiles(nx, nz, plank)
    half_x = nx * TILE / 2; half_z = nz * TILE / 2
    # back wall (runs along X at far -Z... using +Z as the back here) and left wall (along Z)
    wall_segment((0, 0, -half_z), nx * TILE, "x", stone)   # back
    wall_segment((-half_x, 0, 0), nz * TILE, "z", stone)   # left
    # corner post tying the two runs together (no gap at the joint, ART_SPEC §4)
    block((WALL_T + 0.1, WALL_H + 0.2, WALL_T + 0.1), (-half_x, (WALL_H+0.2)/2, -half_z), stone, bevel=0.05)

def wall_line(a, b, mat, openings=()):
    """Axis-aligned wall from authored (x,z) point a to b, with optional openings
    [{center, width, sill, top}] cut out (doors: sill 0; windows: sill>0 and top<WALL_H)."""
    ax = "x" if abs(a[0]-b[0]) >= abs(a[1]-b[1]) else "z"
    H = WALL_H
    if ax == "x": start, end, fixed = min(a[0], b[0]), max(a[0], b[0]), a[1]
    else:         start, end, fixed = min(a[1], b[1]), max(a[1], b[1]), a[0]

    def band(s, e, y0, y1):
        if e - s <= 0.001 or y1 - y0 <= 0.001: return
        L, mid, hy, cy = e - s, (s + e) / 2, y1 - y0, (y0 + y1) / 2
        if ax == "x": block((L, hy, WALL_T), (mid, cy, fixed), mat)
        else:         block((WALL_T, hy, L), (fixed, cy, mid), mat)

    cuts = sorted((op["center"] - op["width"]/2, op["center"] + op["width"]/2, op) for op in openings)
    cursor = start
    for s, e, op in cuts:
        band(cursor, s, 0, H)                  # solid wall before the opening
        band(s, e, 0, op.get("sill", 0))       # under-sill (0 for doors)
        band(s, e, op.get("top", H), H)        # header above the opening
        cursor = e
    band(cursor, end, 0, H)
    # capstone course, full length
    if ax == "x": block((end-start+0.06, 0.16, WALL_T+0.12), ((start+end)/2, H+0.06, fixed), mat, bevel=0.04)
    else:         block((WALL_T+0.12, 0.16, end-start+0.06), (fixed, H+0.06, (start+end)/2), mat, bevel=0.04)

def build_character():
    """Character-focus scene: the monk on a small plank floor for close parity review."""
    plank = solid("plank", "#6e4a2a", 0.9) if EXPORT else plank_mat()
    block((4, 0.12, 4), (0, -0.06, 0), plank)
    build_npc_monk((0, 0, 0))

def pivot(name, ppos, children):
    """Empty at ppos with the given objects parented to it (keep transform). Exports as a
    named glTF node so the web client can swing the limb around the hip/shoulder = real walk."""
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=conv(*ppos))
    e = bpy.context.active_object; e.name = name
    bpy.ops.object.select_all(action="DESELECT")
    for ch in children: ch.select_set(True)
    e.select_set(True); bpy.context.view_layer.objects.active = e
    bpy.ops.object.parent_set(type="OBJECT", keep_transform=True)
    return e

def build_player(pos=(0, 0, 0)):
    """Eldermoor adventurer — the PLAYER avatar. Rounded-form faceted figure
    (44_CHARACTER_RIG method, NOT boxes), authored facing +Z (south, toward camera),
    origin at the feet (y=0). Legs/arms are parented to named pivot nodes
    (legL/legR/armL/armR) so the client can drive a real swinging walk cycle."""
    px, py, pz = pos
    skin = solid("plyskin", "#e8b98e", 0.7);  hair = solid("plyhair", "#3a2a1c", 0.85)
    tunic = solid("plytunic", "#3f6f8c", 0.9); gold = solid("plygold", "#d8b25a", 0.5, 0.3)
    trouser = solid("plytrouser", "#2f3742", 0.9); leather = solid("plyleather", "#5a3f28", 0.85)
    eye = solid("plyeye", "#241812", 0.5)
    # legs + boots, each side parented to a hip pivot (~y 0.92) so it swings from the hip
    for name, s in (("legL", 1), ("legR", -1)):
        leg  = cyl(0.085, 0.11, 0.60, (px + 0.12 * s, py + 0.56, pz), trouser, verts=8)
        boot = cyl(0.12, 0.13, 0.16, (px + 0.12 * s, py + 0.12, pz), leather, verts=8)
        toe  = ico(0.12, (px + 0.12 * s, py + 0.06, pz + 0.09), leather, subdiv=1, scale=(1.0, 0.7, 1.6))
        pivot(name, (px + 0.12 * s, py + 0.92, pz), [leg, boot, toe])
    # pelvis, torso (waist->shoulders, slight taper out), rope/gold belt
    cyl(0.17, 0.19, 0.18, (px, py + 0.92, pz), trouser, verts=10)
    cyl(0.24, 0.18, 0.62, (px, py + 1.28, pz), tunic, verts=10)
    cyl(0.205, 0.205, 0.08, (px, py + 1.0, pz), gold, verts=12)
    # sloped shoulder yoke (no boxy flat top)
    ico(0.26, (px, py + 1.56, pz), tunic, subdiv=1, scale=(1.35, 0.62, 0.92))
    # arms + hands, each parented to a shoulder pivot (~y 1.52) so it swings from the shoulder
    for name, s in (("armL", 1), ("armR", -1)):
        arm  = cyl(0.07, 0.09, 0.56, (px + 0.27 * s, py + 1.25, pz), tunic, verts=8)
        hand = ico(0.082, (px + 0.29 * s, py + 0.95, pz), skin, subdiv=1, scale=(1.0, 1.1, 1.0))
        pivot(name, (px + 0.27 * s, py + 1.52, pz), [arm, hand])
    # neck + sculpted head
    cyl(0.06, 0.07, 0.1, (px, py + 1.66, pz), skin, verts=8)
    ico(0.17, (px, py + 1.82, pz), skin, subdiv=2, scale=(0.92, 1.05, 1.0))
    # chunky hair (top mass + back), kept back so the face reads
    ico(0.188, (px, py + 1.9, pz - 0.03), hair, subdiv=1, scale=(1.06, 0.92, 1.06))
    # angular eyes + protruding nose
    block((0.045, 0.035, 0.02), (px + 0.06, py + 1.83, pz + 0.15), eye)
    block((0.045, 0.035, 0.02), (px - 0.06, py + 1.83, pz + 0.15), eye)
    ico(0.034, (px, py + 1.79, pz + 0.16), skin, subdiv=1, scale=(1.0, 1.2, 1.4))

def build_player_scene():
    """Player-only scene: just the avatar at origin, exported to player.glb for the client."""
    build_player((0, 0, 0))

# ============================================================ ASSET FACTORY
# One rounded-form humanoid method, spec-driven, so a whole distinct cast (instructors,
# townsfolk, mages, guards...) comes from ONE code path. Vary palette / robe-vs-trousers /
# hat / hood / beard / cape / build / hand-prop. Legs+arms parent to named pivot nodes
# (prefix+legL/legR/armL/armR) so each exported NPC can walk in the client.

def build_humanoid(spec, pos=(0, 0, 0), prefix=""):
    """Faceted humanoid from a spec dict. Authored facing +Z, origin at feet (y=0)."""
    px, py, pz = pos
    P = prefix
    g = spec.get
    skin    = solid(P+"skin",  g("skin", "#e8b98e"), 0.7)
    tunicC  = g("tunic", "#3f6f8c")
    tunic   = solid(P+"tunic", tunicC, 0.92)
    sleeve  = solid(P+"sleeve", g("sleeve", tunicC), 0.92)
    legc    = solid(P+"legs",  g("legs", "#2f3742"), 0.9)
    leather = solid(P+"boots", g("boots", "#5a3f28"), 0.85)
    eye     = solid(P+"eye", "#241812", 0.5)
    robe = g("robe", False)
    bw   = g("shoulder", 1.35)

    if robe:                                   # floor-length robe (no separate legs)
        cyl(0.17, 0.40, 1.26, (px, py + 0.63, pz), tunic, verts=12)
        cyl(0.18, 0.205, 0.5, (px, py + 1.30, pz), tunic, verts=12)
    else:                                      # trousers + boots, rigged at the hips
        for name, s in (("legL", 1), ("legR", -1)):
            leg  = cyl(0.085, 0.11, 0.60, (px + 0.12*s, py + 0.56, pz), legc, verts=8)
            boot = cyl(0.12, 0.13, 0.16, (px + 0.12*s, py + 0.12, pz), leather, verts=8)
            toe  = ico(0.12, (px + 0.12*s, py + 0.06, pz + 0.09), leather, subdiv=1, scale=(1.0, 0.7, 1.6))
            pivot(P+name, (px + 0.12*s, py + 0.92, pz), [leg, boot, toe])
        cyl(0.17, 0.19, 0.18, (px, py + 0.92, pz), legc, verts=10)      # pelvis
        cyl(0.24, 0.18, 0.62, (px, py + 1.28, pz), tunic, verts=10)     # torso
    # belt
    if g("belt"):
        cyl(0.205, 0.205, 0.08, (px, py + 1.0, pz), solid(P+"belt", g("belt"), 0.5, 0.3), verts=12)
    # shoulder yoke (sloped, width = build)
    ico(0.26, (px, py + 1.56, pz), tunic, subdiv=1, scale=(bw, 0.62, 0.92))
    # arms + hands, rigged at the shoulders
    for name, s in (("armL", 1), ("armR", -1)):
        arm  = cyl(0.07, 0.09, 0.56, (px + 0.20*bw*s, py + 1.25, pz), sleeve, verts=8)
        hand = ico(0.082, (px + 0.215*bw*s, py + 0.95, pz), skin, subdiv=1, scale=(1.0, 1.1, 1.0))
        pivot(P+name, (px + 0.20*bw*s, py + 1.52, pz), [arm, hand])
    # cape (optional)
    if g("cape"):
        block((0.52, 1.05, 0.05), (px, py + 1.22, pz - 0.2), solid(P+"cape", g("cape"), 0.9))
    # neck + head
    cyl(0.06, 0.07, 0.1, (px, py + 1.66, pz), skin, verts=8)
    ico(0.17, (px, py + 1.82, pz), skin, subdiv=2, scale=(0.92, 1.05, 1.0))
    # hair / hood / hat
    if g("hair"):
        ico(0.188, (px, py + 1.9, pz - 0.03), solid(P+"hair", g("hair"), 0.85), subdiv=1, scale=(1.06, 0.92, 1.06))
    if g("hood"):
        ico(0.205, (px, py + 1.86, pz - 0.05), solid(P+"hood", g("hood"), 0.95), subdiv=1, scale=(1.12, 1.0, 1.06))
    if g("hat"):
        hatm = solid(P+"hat", g("hat"), 0.8); hh = g("hatH", 0.5)
        cyl(0.0, 0.27, hh, (px, py + 2.0 + hh/2 - 0.06, pz), hatm, verts=14)
        if g("brim"):
            cyl(0.36, 0.36, 0.05, (px, py + 1.99, pz), hatm, verts=16)
    # beard (optional)
    if g("beard"):
        ico(0.12, (px, py + 1.7, pz + 0.1), solid(P+"beard", g("beard"), 0.9), subdiv=1, scale=(1.15, 1.35, 0.7))
    # angular eyes + nose
    block((0.045, 0.035, 0.02), (px + 0.06, py + 1.83, pz + 0.15), eye)
    block((0.045, 0.035, 0.02), (px - 0.06, py + 1.83, pz + 0.15), eye)
    ico(0.034, (px, py + 1.79, pz + 0.16), skin, subdiv=1, scale=(1.0, 1.2, 1.4))
    # hand prop (optional): staff or sword in the right hand
    prop = g("prop")
    if prop == "staff":
        cyl(0.035, 0.045, 1.75, (px + 0.30, py + 0.87, pz + 0.06), solid(P+"staff", "#6b4a2c", 0.8), verts=8)
        ico(0.085, (px + 0.30, py + 1.78, pz + 0.06), emissive(P+"gem", g("gem", "#9be0ff"), 4.0), subdiv=1)
    elif prop == "sword":
        steel = solid(P+"steel", "#c2cad4", 0.3, 0.7)
        cyl(0.03, 0.03, 0.22, (px + 0.30, py + 0.86, pz + 0.1), solid(P+"grip", "#3a2a1c", 0.8), verts=6)
        block((0.2, 0.05, 0.05), (px + 0.30, py + 0.98, pz + 0.1), steel)        # crossguard
        block((0.06, 0.72, 0.025), (px + 0.30, py + 1.36, pz + 0.1), steel)      # blade

def build_rat(pos=(0, 0, 0), prefix="rat"):
    """Giant rat mob — quadruped, rounded forms. Faces +Z. Proves the factory covers mobs too."""
    px, py, pz = pos
    fur  = solid(prefix+"fur", "#6b6258", 0.9)
    pink = solid(prefix+"pink", "#c8a0a0", 0.7)
    eye  = solid(prefix+"eye", "#1a1008", 0.4)
    ico(0.45, (px, py + 0.42, pz), fur, subdiv=2, scale=(1.0, 0.9, 1.7))          # body
    ico(0.27, (px, py + 0.44, pz + 0.66), fur, subdiv=2, scale=(1.0, 0.95, 1.1))  # head
    ico(0.12, (px, py + 0.36, pz + 0.92), pink, subdiv=1, scale=(1.0, 0.85, 1.3)) # snout
    for s in (1, -1):
        ico(0.1, (px + 0.13*s, py + 0.64, pz + 0.58), pink, subdiv=1, scale=(0.5, 1.0, 0.6))   # ears
        ico(0.04, (px + 0.1*s, py + 0.5, pz + 0.84), eye, subdiv=1)                              # eyes
        for sz in (0.5, -0.5):
            cyl(0.06, 0.07, 0.3, (px + 0.28*s, py + 0.15, pz + sz), fur, verts=6)               # legs
    cyl(0.02, 0.07, 1.0, (px, py + 0.3, pz - 0.95), pink, verts=6, rot=(radians(72), 0, 0))     # tail

# ---------------------------------------------------------- variation palettes
# Author these small lists ONCE; the factory draws from them to make near-unlimited
# distinct townsfolk WITHOUT new geometry. Add a hex to a list = more variety everywhere.
SKIN_TONES  = ["#f1c9a5", "#e8b98e", "#d49a6a", "#b87a4b", "#8d5524", "#5c3a21"]            # 6
HAIR_COLORS = ["#1c140d", "#3a2a1c", "#5a3f28", "#8a5a2b", "#b8860b", "#d9c27a", "#9a9a9a", "#e8e4d8"]  # 8
CLOTH_COLORS= ["#3f6f8c", "#6b2f2f", "#3a6b3a", "#5a4a78", "#7a5a2a", "#2e5a6e",
               "#8a3f5a", "#445566", "#a0522d", "#557a55"]                                  # 10
LEG_COLORS  = ["#2f3742", "#34302a", "#4a3f30", "#3a3a44", "#5a4326", "#2e2e33"]            # 6
BEARDS      = ["#1c140d", "#3a2a1c", "#5a3f28", "#9a9a9a"]                                  # 4 (+none)
BUILDS      = [1.25, 1.35, 1.45]                                                            # 3

def villager(seed=0, **overrides):
    """Deterministic random townsperson spec from the palettes — distinct skin/hair/clothing
    each seed. Pass overrides to pin any trait (e.g. robe=True). Authoring cost = the palettes
    above; output space ≈ 6·8·10·6·3 base × beard·robe·cape toggles ≈ hundreds of thousands."""
    r = _rnd.Random(seed)
    spec = {"skin": r.choice(SKIN_TONES), "hair": r.choice(HAIR_COLORS),
            "tunic": r.choice(CLOTH_COLORS), "legs": r.choice(LEG_COLORS),
            "shoulder": r.choice(BUILDS)}
    if r.random() < 0.45: spec["beard"] = r.choice(BEARDS)
    if r.random() < 0.22: spec["robe"]  = True
    if r.random() < 0.18: spec["cape"]  = r.choice(CLOTH_COLORS)
    spec.update(overrides)
    return spec

# Original-design tutorial cast (OSRS *roles*, not copies — distinct silhouettes/palette).
ROSTER = {
    "guide":   {"tunic": "#3a6b3a", "legs": "#2e3a2e", "hair": "#b9b3a6", "beard": "#b9b3a6", "shoulder": 1.3},
    "survival":{"tunic": "#6b5333", "sleeve": "#5a4a2a", "legs": "#3a2f22", "hair": "#3a2a1c", "beard": "#3a2a1c", "shoulder": 1.45},
    "chef":    {"tunic": "#e6e1d4", "sleeve": "#d8d2c2", "legs": "#7a6a4a", "hat": "#f3efe6", "hatH": 0.6, "skin": "#e8b98e"},
    "quest":   {"robe": True, "tunic": "#5a4a78", "belt": "#d8b25a", "hair": "#9a9a9a", "shoulder": 1.25},
    "miner":   {"tunic": "#5a4a38", "legs": "#34302a", "hat": "#7d8089", "hatH": 0.34, "brim": True, "beard": "#3a2a1c", "shoulder": 1.45},
    "guard":   {"tunic": "#6b2f2f", "sleeve": "#7d8089", "legs": "#2f3742", "hair": "#2a1c12", "prop": "sword", "cape": "#9c3030", "shoulder": 1.5},
    "banker":  {"robe": True, "tunic": "#2e5a6e", "belt": "#d8b25a", "hair": "#3a2a1c", "shoulder": 1.25},
    "account": {"tunic": "#3a3a44", "sleeve": "#2e2e36", "legs": "#2a2a30", "cape": "#445566", "hair": "#1c140d", "shoulder": 1.3},
    "wizard":  {"robe": True, "tunic": "#2e3a8c", "sleeve": "#2e3a8c", "hat": "#2e3a8c", "hatH": 0.7, "beard": "#dddddd", "prop": "staff", "gem": "#9be0ff"},
    "monklike":{"robe": True, "tunic": "#5a4326", "hood": "#4a3520", "belt": "#caa24a", "skin": "#e8b98e"},
    # chapel visitors (generated from the palettes — proof of the variation system)
    "sister":  villager(7,  robe=True, tunic="#5a4a6e", hair="#3a2a1c", beard=False),
    "pilgrim1":villager(3),
    "pilgrim2":villager(15),
}

def build_cast_lineup():
    """A row of the whole cast + a mob — the 'many things' look-judgment shot."""
    plank = solid("plank", "#6e4a2a", 0.9) if EXPORT else plank_mat()
    block((22, 0.12, 5), (0, -0.06, 0), plank)
    order = ["guide", "chef", "miner", "guard", "banker", "wizard", "monklike"]
    n = len(order)
    for i, nid in enumerate(order):
        x = (i - (n - 1) / 2) * 2.5
        build_humanoid(ROSTER[nid], (x, 0, 0), prefix=nid + "_")
    build_rat((((n - (n - 1) / 2)) * 2.5, 0, 0))   # mob at the far end

def build_npc_monk(pos=(0, 0, 0)):
    """Brother-Brace-equivalent monk: hooded brown robe, rope belt, clasped hands. Built from
    rounded forms (44_CHARACTER_RIG) — NOT boxes. Faces +Z (south, toward the chapel camera)."""
    px, py, pz = pos
    robe = solid("robe", "#5a4326", 0.95); hood = solid("hood", "#4a3520", 0.95)
    skin = solid("npcskin", "#e8b98e", 0.7); eye = solid("npceye", "#241812", 0.5)
    rope = solid("rope", "#caa24a", 0.6)
    # flared lower robe (bottom at y=0), upper torso, rope belt
    cyl(0.17, 0.36, 1.15, (px, py + 0.575, pz), robe, verts=10)
    cyl(0.16, 0.20, 0.52, (px, py + 1.28, pz), robe, verts=10)
    cyl(0.205, 0.205, 0.07, (px, py + 1.02, pz), rope, verts=12)
    # cowl/shoulders
    ico(0.24, (px, py + 1.5, pz), hood, subdiv=1, scale=(1.2, 0.7, 1.05))
    # arms down the sides; clasped hands at the belt
    for s in (1, -1):
        cyl(0.06, 0.085, 0.5, (px + 0.2 * s, py + 1.3, pz + 0.02), robe, verts=8)
    ico(0.085, (px, py + 1.02, pz + 0.16), skin, subdiv=1, scale=(1.4, 0.8, 1.0))
    # neck + sculpted head
    cyl(0.06, 0.07, 0.1, (px, py + 1.62, pz), skin, verts=8)
    ico(0.17, (px, py + 1.78, pz), skin, subdiv=2, scale=(0.95, 1.05, 1.0))
    # hood mass behind/over the head (kept back so the face reads)
    ico(0.205, (px, py + 1.84, pz - 0.07), hood, subdiv=1, scale=(1.08, 0.95, 1.0))
    # minimal face (eyes)
    block((0.05, 0.04, 0.02), (px + 0.06, py + 1.78, pz + 0.15), eye)
    block((0.05, 0.04, 0.02), (px - 0.06, py + 1.78, pz + 0.15), eye)

def build_chapel():
    """Chapel per docs/43: 7x5-tile stone shell (door + 4 windows), plank floor, altar,
    pipe organ, banners, candle stands, center rug. Open-top for the interior beauty render."""
    stone = (solid("stone", "#9a9ea6", 0.95) if EXPORT else stone_mat())
    plank = (solid("plank", "#6e4a2a", 0.9) if EXPORT else plank_mat())
    cloth = solid("banner", "#34427a", 0.9); trim = solid("trim", "#d8b25a", 0.5, 0.3)
    woodm = solid("wood", "#5a3f28", 0.8); pewter = solid("pewter", "#c9ccd2", 0.35, 0.7)
    altstone = solid("altarstone", "#cdc6b6", 0.9); rugm = solid("rug", "#8a2f2f", 0.9)
    flame = emissive("flame", "#ffb24a", 7.0); relic = emissive("relic", "#9be0ff", 5.0)

    IX, IZ = 7.0, 5.0  # interior half-extents (7x5 tiles; tile = 2u)
    block((IX*2, 0.12, IZ*2), (0, -0.06, 0), plank)  # floor
    win = [{"center": -3.0, "width": 0.9, "sill": 1.4, "top": 2.4},
           {"center":  3.0, "width": 0.9, "sill": 1.4, "top": 2.4}]
    wall_line((-IX, -IZ), (IX, -IZ), stone)                                                  # north (solid)
    wall_line((-IX,  IZ), (IX,  IZ), stone, [{"center": 0, "width": 2.0, "sill": 0, "top": 2.4}])  # south door
    wall_line(( IX, -IZ), ( IX,  IZ), stone, win)                                            # east windows
    wall_line((-IX, -IZ), (-IX,  IZ), stone, win)                                            # west windows
    for sx in (-1, 1):
        for sz in (-1, 1):
            block((WALL_T+0.1, WALL_H+0.2, WALL_T+0.1), (sx*IX, (WALL_H+0.2)/2, sz*IZ), stone, bevel=0.05)
    # center rug runner (border + field)
    block((4.4, 0.02, 8.4), (0, 0.012, 0.5), trim)
    block((4.0, 0.04, 8.0), (0, 0.020, 0.5), rugm)
    # altar against north wall + glowing relic
    az = -IZ + 0.7
    block((2.4, 0.8, 1.0), (0, 0.40, az), altstone)
    block((2.7, 0.16, 1.2), (0, 0.86, az), altstone, bevel=0.04)
    ico(0.18, (0, 1.18, az), relic, subdiv=1, scale=(1, 1.2, 1))
    # candle stands flanking the altar
    for sx in (-1, 1):
        cx, cz = sx*1.9, az + 0.3
        cyl(0.06, 0.09, 1.1, (cx, 0.55, cz), woodm, verts=8)
        cyl(0.13, 0.09, 0.08, (cx, 1.12, cz), woodm, verts=8)
        ico(0.07, (cx, 1.22, cz), flame, subdiv=1, scale=(1, 1.5, 1))
    # pipe organ, NE corner
    ox, oz = IX - 1.7, -IZ + 1.5
    block((2.6, 1.0, 0.6), (ox, 0.5, oz), woodm)
    for i, h in enumerate((2.2, 2.6, 2.0, 2.8, 2.4, 1.8)):
        cyl(0.13, 0.13, h, (ox - 1.0 + i*0.4, 1.0 + h/2, oz), pewter, verts=8)
    # banners on north wall (cloth + emblem)
    for bx in (-4.5, -1.5, 1.5, 4.5):
        block((0.9, 1.8, 0.06), (bx, 1.7, -IZ + 0.22), cloth)
        block((0.45, 0.45, 0.08), (bx, 1.75, -IZ + 0.24), trim)

    # ---- dressing pass (was too bare) ----
    pewm = solid("pew", "#6e4a2a", 0.85)
    def pew(cx, cz, w):
        """A wooden bench facing the altar (north, -Z): seat + backrest (south side) + legs."""
        block((w, 0.1, 0.42), (cx, 0.46, cz), pewm)              # seat
        block((w, 0.52, 0.08), (cx, 0.72, cz + 0.21), pewm)      # backrest on the south edge
        for lx in (cx - w/2 + 0.25, cx + w/2 - 0.25):
            for lz in (cz - 0.15, cz + 0.15):
                block((0.1, 0.46, 0.1), (lx, 0.23, lz), pewm)    # legs
    for cz in (0.2, 1.8, 3.4):                                   # 3 rows, left & right blocks
        pew(-3.6, cz, 3.2); pew(3.6, cz, 3.2)
    # stained-glass panels set into the 4 side windows (warm coloured emissive)
    glasscols = {(-IX, -3.0): "#c0392b", (-IX, 3.0): "#2980b9", (IX, -3.0): "#27ae60", (IX, 3.0): "#8e44ad"}
    for (wx, wz), c in glasscols.items():
        block((0.05, 0.95, 0.82), (wx + (0.04 if wx < 0 else -0.04), 1.9, wz), emissive("glass_"+c[1:], c, 2.2))
    # lectern near the altar front (post + angled reading top)
    cyl(0.08, 0.11, 0.95, (1.6, 0.48, az + 1.0), pewm, verts=8)
    block((0.5, 0.06, 0.36), (1.6, 0.98, az + 1.0), pewm, bevel=0.02)
    # wall sconces (small flames) flanking the door + on the side walls
    for sx, sz in ((-2.0, IZ - 0.3), (2.0, IZ - 0.3), (-IX + 0.3, 0.0), (IX - 0.3, 0.0)):
        cyl(0.05, 0.07, 0.3, (sx, 1.8, sz), woodm, verts=6)
        ico(0.07, (sx, 2.0, sz), flame, subdiv=1, scale=(1, 1.5, 1))
    # stone dais step under the altar
    block((3.2, 0.16, 1.6), (0, 0.08, az + 0.1), altstone, bevel=0.03)

    # ---- collider/nav registration (consumed by the web client) ----
    T = WALL_T/2 + 0.01
    creg_rect(-IX-T, IX+T, -IZ-T, -IZ+T)                 # north wall
    creg_rect( IX-T, IX+T, -IZ-T,  IZ+T)                 # east wall
    creg_rect(-IX-T,-IX+T, -IZ-T,  IZ+T)                 # west wall
    creg_rect(-IX-T, -1.0,  IZ-T,  IZ+T)                 # south wall, left of door
    creg_rect(  1.0, IX+T,  IZ-T,  IZ+T)                 # south wall, right of door (door gap x[-1,1])
    creg_rect(-1.6, 1.6, -5.0, -3.4)                     # altar + dais
    creg_rect( 4.0, 6.65, -3.85, -3.15)                 # pipe organ
    for cz in (0.2, 1.8, 3.4):                           # pews (left & right blocks)
        creg_rect(-5.3, -1.9, cz-0.3, cz+0.35); creg_rect(1.9, 5.3, cz-0.3, cz+0.35)
    creg_circle(-1.9, -4.0, 0.24); creg_circle(1.9, -4.0, 0.24)   # candle stands
    creg_circle( 1.6, az+1.0, 0.2)                       # lectern

    # Brother-Brace-equivalent monk, standing beside the altar (clear of it so the altar
    # is independently interactable in the client), facing the congregation
    build_npc_monk((1.4, 0, az + 1.4))

def build_tree(pos, scale=1.0, register=True):
    """Faceted low-poly tree (trunk + stacked canopy lobes). When register, adds a trunk
    collider — off for the standalone kit-piece export (the manifest adds per-instance colliders)."""
    px, py, pz = pos
    bark = solid("bark", "#5a3f28", 0.9)
    leaf = [solid("leaf_a", "#3f7a32", 0.95), solid("leaf_b", "#4f8a3c", 0.95), solid("leaf_c", "#356b2a", 0.95)]
    cyl(0.16*scale, 0.26*scale, 1.5*scale, (px, py + 0.75*scale, pz), bark, verts=7)
    ico(0.80*scale, (px, py + 1.7*scale, pz), leaf[0], subdiv=1)
    ico(0.60*scale, (px + 0.42*scale, py + 2.1*scale, pz), leaf[1], subdiv=1)
    ico(0.50*scale, (px - 0.32*scale, py + 2.2*scale, pz), leaf[2], subdiv=1)
    if register: creg_circle(px, pz, 0.42*scale)

def build_bush(pos, scale=1.0, register=True):
    """Small faceted shrub — clustered leaf lobes."""
    px, py, pz = pos
    g1 = solid("bushleaf_a", "#3f7a32", 0.95); g2 = solid("bushleaf_b", "#4f8a3c", 0.95)
    ico(0.40*scale, (px, py + 0.32*scale, pz), g1, subdiv=1)
    ico(0.30*scale, (px + 0.26*scale, py + 0.27*scale, pz), g2, subdiv=1)
    ico(0.28*scale, (px - 0.22*scale, py + 0.29*scale, pz), g2, subdiv=1)
    if register: creg_circle(px, pz, 0.3*scale)

def build_rock(pos, scale=1.0, register=True):
    """Faceted boulder cluster."""
    px, py, pz = pos
    rk = solid("rock_a", "#7d8089", 1.0)
    ico(0.45*scale, (px, py + 0.26*scale, pz), rk, subdiv=1, scale=(1.0, 0.72, 1.1))
    ico(0.26*scale, (px + 0.34*scale, py + 0.16*scale, pz), rk, subdiv=1, scale=(1.0, 0.7, 1.0))
    if register: creg_circle(px, pz, 0.4*scale)

# pond (survival area) — centre + radius, shared by height/colour/collider
POND = (9.0, 32.0, 5.8)

def build_house(cx, cz, w, d, doorw=2.0):
    """Reusable small building: stone shell + plank floor + a south doorway, open-top. Placed at
    (cx,cz) on the world; registers its own wall colliders (with the door gap) at world coords."""
    stone = solid("stone", "#9a9ea6", 0.95) if EXPORT else stone_mat()
    plank = solid("plank", "#6e4a2a", 0.9)  if EXPORT else plank_mat()
    hx, hz = w/2.0, d/2.0
    block((w, 0.12, d), (cx, -0.06, cz), plank)                                          # floor (top at y=0)
    wall_line((cx-hx, cz-hz), (cx+hx, cz-hz), stone)                                      # north
    wall_line((cx+hx, cz-hz), (cx+hx, cz+hz), stone)                                      # east
    wall_line((cx-hx, cz-hz), (cx-hx, cz+hz), stone)                                      # west
    wall_line((cx-hx, cz+hz), (cx+hx, cz+hz), stone,
              [{"center": cx, "width": doorw, "sill": 0, "top": 2.4}])                    # south door
    for sx in (-1, 1):
        for sz in (-1, 1):
            block((WALL_T+0.1, WALL_H+0.2, WALL_T+0.1), (cx+sx*hx, (WALL_H+0.2)/2, cz+sz*hz), stone, bevel=0.05)
    T = WALL_T/2 + 0.01
    creg_rect(cx-hx-T, cx+hx+T, cz-hz-T, cz-hz+T)                                         # north wall
    creg_rect(cx+hx-T, cx+hx+T, cz-hz-T, cz+hz+T)                                         # east wall
    creg_rect(cx-hx-T, cx-hx+T, cz-hz-T, cz+hz+T)                                         # west wall
    creg_rect(cx-hx-T, cx-doorw/2, cz+hz-T, cz+hz+T)                                      # south, left of door
    creg_rect(cx+doorw/2, cx+hx+T, cz+hz-T, cz+hz+T)                                      # south, right of door

def _terr_h(x, z):
    """Terrain height: flat (0) across the playable rectangle so buildings/player sit level;
    a pond basin dips down at POND; rolling faceted hills rise beyond the edges as a backdrop."""
    from math import sin, cos, hypot
    pr = hypot(x-POND[0], z-POND[1])
    if pr < POND[2]: return max(-0.9, -(POND[2]-pr)*0.22)            # pond basin
    px  = max(0.0, abs(x) - 29.0)
    pzn = max(0.0, (-9.0) - z)
    pzs = max(0.0, z - 64.0)
    d = px + pzn + pzs
    if d <= 0.0: return 0.0
    rise = min(d * 0.55, 9.0)
    noise = sin(x*0.3)*cos(z*0.28)*1.6 + sin((x+z)*0.18)*1.1
    return rise + noise * min(1.0, d/5.0)

def _terr_c(x, z, h):
    """Per-vertex terrain colour — grass tones, dirt patches, the path stripe, rocky hilltops
    (authentic OSRS flat-shaded coloured terrain). Returns LINEAR rgb."""
    from math import sin, cos, hypot
    pr = hypot(x-POND[0], z-POND[1])
    if pr < POND[2]-1.1: return lin("#35564d")[:3]                     # pond bed (under water)
    if pr < POND[2]:     return lin("#cdbd8e")[:3]                     # sand shore ring
    if abs(x) < 1.7 and 5.0 < z < 60.0: return lin("#8c6b40")[:3]      # dirt path
    if h > 5.5: return lin("#9a9ea6")[:3]                              # rocky hilltops
    if h > 2.0:
        t = min(1.0, (h-2.0)/3.5); g = lin("#4f8a3c"); r = lin("#9a9ea6")
        return tuple(g[i]+(r[i]-g[i])*t for i in range(3))            # grass→rock slope
    if sin(x*0.5)*cos(z*0.42) + sin((x+z)*0.3) > 0.95:               # dirt patch
        return lin("#7a6a40")[:3]
    t = sin(x*0.7)*cos(z*0.6)*0.5 + 0.5                               # grass tonal variation
    a = lin("#477d34"); b = lin("#5f9a43")
    return tuple(a[i]+(b[i]-a[i])*t for i in range(3))

def terrain_mat():
    m = bpy.data.materials.new("terrain"); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes.get("Principled BSDF")
    attr = nt.nodes.new("ShaderNodeVertexColor"); attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 1.0
    return m

def build_terrain():
    """Faceted, vertex-coloured heightmap terrain (one mesh). Flat where you play, hills beyond."""
    nx, nz = 64, 76
    x0, x1, z0, z1 = -55.0, 55.0, -52.0, 80.0
    verts, cols = [], []
    for j in range(nz+1):
        for i in range(nx+1):
            x = x0 + (x1-x0)*i/nx; z = z0 + (z1-z0)*j/nz; h = _terr_h(x, z)
            verts.append(list(conv(x, h, z))); cols.append(_terr_c(x, z, h))
    faces = []
    for j in range(nz):
        for i in range(nx):
            a = j*(nx+1)+i; b = a+1; c = a+(nx+1); d = c+1
            faces.append((a, b, d, c))
    mesh = bpy.data.meshes.new("terrain"); mesh.from_pydata(verts, [], faces); mesh.update()
    ca = mesh.color_attributes.new(name="Col", type='FLOAT_COLOR', domain='POINT')
    for i, c in enumerate(cols): ca.data[i].color = (c[0], c[1], c[2], 1.0)
    for poly in mesh.polygons: poly.use_smooth = False
    obj = bpy.data.objects.new("terrain", mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(terrain_mat())
    return obj

def build_grounds():
    """The Chapel taken OUTDOORS: grass terrain + the chapel building + a fenced courtyard you
    enter through the south door. First exterior — proves the collision/nav export pipeline and
    the room-to-world step. Spawn is in the courtyard, facing the chapel door."""
    fencem = solid("fence", "#6e4a2a", 0.85)
    waterm = solid("water", "#2c6a82", 0.2, 0.1)
    # faceted vertex-coloured heightmap terrain (grass/dirt/path/rock blend + hills beyond)
    build_terrain()
    block((360, 0.04, 360), (0, -0.45, 14), waterm)      # surrounding sea (shows beyond the island)
    block((2*POND[2]-1.4, 0.05, 2*POND[2]-1.4), (POND[0], -0.07, POND[1]), waterm)  # pond surface
    creg_circle(POND[0], POND[1], POND[2]-0.3)           # can't walk into the pond
    build_chapel()                                       # the building (registers its own colliders)
    # courtyard fence (x ±7, z 5..14) with a GATE gap (x ±1.5) in the south run so you can leave
    FX, Z0, Z1, GW = 7.0, 5.0, 14.0, 1.5
    for sx in (-1, 1):                                    # east + west runs
        block((0.12, 1.0, Z1-Z0), (sx*FX, 0.5, (Z0+Z1)/2), fencem)
        creg_rect(sx*FX-0.16, sx*FX+0.16, Z0, Z1)
        block((FX-GW, 1.0, 0.12), (sx*(FX+GW)/2, 0.5, Z1), fencem)            # south run, each side of the gate
        creg_rect(*sorted((sx*GW, sx*FX)), Z1-0.16, Z1+0.16)
    # NOTE: trees/bushes/rocks are no longer baked here — they're placed by the world MANIFEST
    # (explicit objects + procedural scatter), instanced in the client from assets/kit/*.glb.
    # World.glb = static terrain + building + fence only.
    # walkable bounds (chapel + courtyard + open land/forest) + spawn in the courtyard
    cset_bound(-26.0, 26.0, -5.2, 60.0)
    cset_spawn(0.0, 8.5, radians(180))

# --------------------------------------------------------------- stage / cam / light
def build_stage(scene="corner"):
    # bright, even world fill (OSRS flat light, ART_SPEC §2)
    world = bpy.data.worlds.new("w"); bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = lin("#dfe7f0"); bg.inputs[1].default_value = 1.05

    if scene == "grounds":
        tgt, campos, lens, sunpos = (0, 0.6, 26), (1, 46, 86), 42, (10, 30, 30)
    elif scene == "lineup":
        tgt, campos, lens, sunpos = (1.25, 1.0, 0), (1.25, 6.5, 21), 40, (5, 16, 9)
    elif scene == "chapel":
        tgt, campos, lens, sunpos = (0, 1.0, -1.0), (1.5, 14, 15), 50, (6, 15, 6)
    else:
        tgt, campos, lens, sunpos = (0, 0.6, 0), (7.5, 8.5, 8.5), 85, (4, 9, 5)

    bpy.ops.object.empty_add(location=conv(*tgt))
    target = bpy.context.active_object

    # gentle warm sun, high angle, soft shadow
    bpy.ops.object.light_add(type="SUN", location=conv(*sunpos))
    sun = bpy.context.active_object
    sun.data.energy = 3.2; sun.data.color = lin("#fff1d6")[:3]; sun.data.angle = radians(3)
    c = sun.constraints.new("TRACK_TO"); c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"

    # steep, long-lens game camera (near-isometric, ART_SPEC §2)
    bpy.ops.object.camera_add(location=conv(*campos))
    cam = bpy.context.active_object; cam.data.lens = lens
    c = cam.constraints.new("TRACK_TO"); c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    bpy.context.scene.camera = cam

# ----------------------------------------------------------------------- gpu / render
def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = CFG["samples"]; scene.cycles.use_denoising = True
    try: scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception: pass
    scene.cycles.max_bounces = 8
    chosen = "CPU"
    if CFG["device"] in ("AUTO", "GPU"):
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            for ctype in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
                try:
                    prefs.compute_device_type = ctype; prefs.get_devices()
                    if [d for d in prefs.devices if d.type == ctype]:
                        for d in prefs.devices: d.use = (d.type != "CPU")
                        chosen = ctype; break
                except Exception: continue
        except Exception: pass
    scene.cycles.device = "GPU" if chosen != "CPU" else "CPU"
    print(f"[kit] render device: {scene.cycles.device} ({chosen})")
    scene.render.resolution_x, scene.render.resolution_y = CFG["res"]
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = CFG["out"]
    vs = scene.view_settings
    try: vs.view_transform = "AgX"
    except Exception: pass
    for look in ("AgX - Punchy", "Punchy", "None"):
        try: vs.look = look; break
        except Exception: continue

def clear_scene():
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete()
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for d in list(blk): blk.remove(d)

def main():
    clear_scene()
    scene = CFG.get("scene", "corner")
    if scene.startswith("npc:"):                      # export one roster NPC: --scene npc:guide
        nid = scene.split(":", 1)[1]
        builder = lambda: build_humanoid(ROSTER[nid], (0, 0, 0))
    elif scene.startswith("kit:"):                    # export a reusable kit piece: --scene kit:tree
        piece = scene.split(":", 1)[1]
        builder = {"tree": lambda: build_tree((0, 0, 0), 1.0, register=False),
                   "bush": lambda: build_bush((0, 0, 0), 1.0, register=False),
                   "rock": lambda: build_rock((0, 0, 0), 1.0, register=False)}.get(piece, build_corner)
    else:
        builder = {"chapel": build_chapel, "character": build_character,
                   "player": build_player_scene, "lineup": build_cast_lineup,
                   "grounds": build_grounds,
                   "rat": lambda: build_rat((0, 0, 0))}.get(scene, build_corner)
    builder()
    if EXPORT:
        os.makedirs(os.path.dirname(EXPORT), exist_ok=True)
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.export_scene.gltf(filepath=EXPORT, export_format="GLB",
                                  use_selection=False, export_apply=True, export_yup=True)
        print(f"[kit] exported glTF: {EXPORT}")
        # emit the collider/nav sidecar (consumed by the web client) when any colliders were registered
        if COLLIDERS["rects"] or COLLIDERS["circles"] or COLLIDERS["bound"]:
            import json
            cpath = os.path.splitext(EXPORT)[0] + ".colliders.json"
            with open(cpath, "w") as f: json.dump(COLLIDERS, f)
            print(f"[kit] exported colliders: {cpath}  "
                  f"({len(COLLIDERS['rects'])} rects, {len(COLLIDERS['circles'])} circles)")
        return
    build_stage(scene); setup_render()
    print(f"[kit] rendering {scene} {CFG['res'][0]}x{CFG['res'][1]} @ {CFG['samples']} spp -> {CFG['out']}")
    bpy.ops.render.render(write_still=True)
    print("[kit] done.")

main()
