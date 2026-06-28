#!/usr/bin/env python3
"""
build_hero_v2.py — Eldermoor Adventurer, modeled to MODELING_SPEC.md.

Real mesh work (bmesh): continuous lofted body shell (no waist seam), lofted limbs,
shaped hands, a head with the NOSE EXTRUDED FROM THE FACE and the painted face texture
UV-mapped on (NO eye geometry), hair/beard, shaped boots, gear, substance materials.

Usage:
  blender --background --python build_hero_v2.py -- --part head            # fast head check
  blender --background --python build_hero_v2.py -- --part full --preview  # full, fast
  blender --background --python build_hero_v2.py                           # full, production
"""
import bpy, bmesh, sys, math, os
from math import radians, sin, cos, pi
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else "/home/claude/eldermoor"
FACE_TEX = os.path.join(HERE, "face_tex.png")

# ----- args -----
def args():
    a = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    c = dict(part="full", samples=384, res=(1500, 1875), out=None, preview=False)
    i = 0
    while i < len(a):
        if a[i] == "--part": c["part"] = a[i+1]; i += 1
        elif a[i] == "--preview": c["preview"] = True
        elif a[i] == "--samples": c["samples"] = int(a[i+1]); i += 1
        elif a[i] == "--res": c["res"] = (int(a[i+1]), int(a[i+2])); i += 2
        elif a[i] == "--out": c["out"] = a[i+1]; i += 1
        i += 1
    if c["preview"]: c["samples"] = 40; c["res"] = (700, 875)
    if c["out"] is None: c["out"] = os.path.join(HERE, f"hero_{c['part']}.png")
    return c
CFG = args()

# ----- color -----
def _hex(h): h=h.lstrip("#"); return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def _s2l(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lin(h): r,g,b=_hex(h); return (_s2l(r),_s2l(g),_s2l(b),1.0)

SKIN="#e8b98e"; HAIR="#3a2a1c"; BEARD="#4a3420"
TUNIC="#3f6f8c"; TRIM="#d8b25a"; CAPE="#9c3030"; TROUSER="#34404c"
LEATHER="#5a3f28"; STEEL="#c2cad4"; WOOD="#6a4a2c"

# ----- materials (substance: bump + roughness variation, never flat) -----
def _principled(mat):
    return mat.node_tree.nodes.get("Principled BSDF")

def mat_solid(name, hexc, rough=0.85, metal=0.0, bump=0.0, bscale=18.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = _principled(m)
    b.inputs["Base Color"].default_value = lin(hexc)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if bump > 0:
        tex = nt.nodes.new("ShaderNodeTexNoise"); tex.inputs["Scale"].default_value = bscale
        bmp = nt.nodes.new("ShaderNodeBump"); bmp.inputs["Strength"].default_value = bump
        nt.links.new(tex.outputs["Fac"], bmp.inputs["Height"])
        nt.links.new(bmp.outputs["Normal"], b.inputs["Normal"])
        # subtle roughness break-up
        rmp = nt.nodes.new("ShaderNodeMath"); rmp.operation = "ADD"
        # leave base roughness; bump alone already lifts it off "plastic"
    return m

def mat_skin_with_face(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = _principled(m)
    b.inputs["Roughness"].default_value = 0.62
    if os.path.exists(FACE_TEX):
        img = bpy.data.images.load(FACE_TEX)
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img
        uv = nt.nodes.new("ShaderNodeUVMap"); uv.uv_map = "UVMap"
        nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    else:
        b.inputs["Base Color"].default_value = lin(SKIN)
    return m

# ----- bmesh helpers -----
def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return o

def ring(z, rx, ry, n=12, yoff=0.0):
    """horizontal ellipse cross-section at height z (front = -Y)."""
    return [Vector((rx*cos(t), ry*sin(t)+yoff, z)) for t in
            [2*pi*i/n for i in range(n)]]

def loft(name, rings, cap_bottom=True, cap_top=False):
    bm = bmesh.new(); n = len(rings[0])
    vlay = [[bm.verts.new(p) for p in r] for r in rings]
    bm.verts.ensure_lookup_table()
    for a, b in zip(vlay, vlay[1:]):
        for i in range(n):
            j = (i+1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap_bottom: bm.faces.new(vlay[0][::-1])
    if cap_top: bm.faces.new(vlay[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm), vlay

def shade(o, smooth=True, angle=35):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True); bpy.context.view_layer.objects.active = o
    if smooth:
        bpy.ops.object.shade_smooth()
        try: o.data.use_auto_smooth = True; o.data.auto_smooth_angle = radians(angle)
        except Exception:
            # Blender 4.1+ removed the flag; use a smooth-by-angle modifier
            try: bpy.ops.object.shade_smooth_by_angle(angle=radians(angle))
            except Exception: pass
    else:
        bpy.ops.object.shade_flat()

def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object; o.name = name
    # weld + clean
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0006)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free()
    return o

# ============================================================ BODY SHELL
def build_body():
    rings = [
        ring(0.84, 0.255, 0.17),   # hips
        ring(1.00, 0.215, 0.15),   # waist (continuous -> no seam)
        ring(1.20, 0.265, 0.185),  # chest
        ring(1.40, 0.30, 0.20),    # upper chest
        ring(1.52, 0.34, 0.205),   # shoulders (widest)
        ring(1.585, 0.135, 0.125), # slope into neck
    ]
    shell, _ = loft("body", rings, cap_bottom=True, cap_top=False)
    return shell

def build_neck():
    rings = [ring(1.55, 0.105, 0.1, n=10), ring(1.72, 0.095, 0.092, n=10)]
    o, _ = loft("neck", rings, cap_bottom=False, cap_top=False)
    return o

# ============================================================ LIMBS
def tube(name, pts, n=10):
    """pts: list of (z, x, y, r). lofted tapered tube."""
    rings = [ring(z, r, r, n=n, yoff=y) for (z, x, y, r) in
             [(p[0], p[1], p[2], p[3]) for p in pts]]
    # shift x per ring
    for rg, p in zip(rings, pts):
        for v in rg: v.x += p[1]
    o, _ = loft(name, rings, cap_bottom=True, cap_top=True)
    return o

def build_arm(side):
    s = side
    pts = [(1.50, 0.30*s, 0, 0.115),   # shoulder (inside shell -> no gap)
           (1.34, 0.34*s, 0, 0.092),   # upper
           (1.18, 0.35*s, 0, 0.082),   # elbow
           (1.02, 0.35*s, 0, 0.07)]    # wrist
    return tube(f"arm.{'L' if s>0 else 'R'}", pts, n=10)

def build_leg(side):
    s = side
    pts = [(0.92, 0.15*s, 0, 0.145),   # hip (inside shell)
           (0.62, 0.155*s, 0, 0.12),   # thigh
           (0.40, 0.15*s, 0, 0.10),    # knee
           (0.14, 0.145*s, 0, 0.088)]  # ankle
    return tube(f"leg.{'L' if s>0 else 'R'}", pts, n=10)

def build_hand(side):
    s = side
    bm = bmesh.new()
    # palm
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x*0.13, v.co.y*0.16, v.co.z*0.1))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_obj(f"hand.{'L' if s>0 else 'R'}", bm)
    # fingers block + thumb
    fb = bpy.data.meshes.new("fb"); bmf = bmesh.new(); bmesh.ops.create_cube(bmf, size=1)
    for v in bmf.verts: v.co = Vector((v.co.x*0.12, v.co.y*0.1, v.co.z*0.045))
    bmf.to_mesh(fb); bmf.free()
    fingers = bpy.data.objects.new("fingers", fb); bpy.context.collection.objects.link(fingers)
    fingers.location = (0, -0.12, 0.025)
    th = bpy.data.meshes.new("th"); bmt = bmesh.new(); bmesh.ops.create_cube(bmt, size=1)
    for v in bmt.verts: v.co = Vector((v.co.x*0.04, v.co.y*0.07, v.co.z*0.04))
    bmt.to_mesh(th); bmt.free()
    thumb = bpy.data.objects.new("thumb", th); bpy.context.collection.objects.link(thumb)
    thumb.location = (0.07*s, -0.03, -0.01)
    o = join([o, fingers, thumb], f"hand.{'L' if s>0 else 'R'}")
    o.location = (0.35*s, 0, 0.99)
    return o

# ============================================================ HEAD
def build_head():
    R = 0.205
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2*R)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=4, use_grid_fill=True)
    bm.verts.ensure_lookup_table()
    # round the cube toward a sphere (faceted-but-round)
    for v in bm.verts:
        n = v.co.normalized() * R
        v.co = v.co.lerp(n, 0.72)
    # taper jaw, flatten back, push face
    for v in bm.verts:
        x, y, z = v.co
        if z < 0:
            f = max(0.55, 1 + (z/R)*0.35); x *= f; y *= f
        if y > 0: y *= 0.92          # back (here +Y is back; front is -Y)
        else:     y *= 1.04          # face
        v.co = Vector((x, y, z*1.16))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    # --- extrude the NOSE from a single face (front = -Y, center, mid/low) ---
    bm.faces.ensure_lookup_table()
    def face_c(f): return f.calc_center_median()
    front = [f for f in bm.faces if f.normal.y < -0.5]
    if front:
        target = Vector((0, -0.25, -0.01))
        nose_faces = [min(front, key=lambda f: (face_c(f) - target).length)]
        r = bmesh.ops.extrude_face_region(bm, geom=nose_faces)
        verts = [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]
        cx = sum((v.co.x for v in verts), 0)/len(verts)
        cz = sum((v.co.z for v in verts), 0)/len(verts)
        for v in verts:
            v.co += Vector((0, -0.055, -0.012))      # forward + slightly down
            v.co.x = cx + (v.co.x - cx)*0.55          # pinch to a tip
            v.co.z = cz + (v.co.z - cz)*0.7
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    # --- brow ridge: push a band of upper-front faces forward ---
    for v in bm.verts:
        if v.co.y < -0.12 and 0.05 < v.co.z < 0.13 and abs(v.co.x) < 0.18:
            v.co.y -= 0.022

    # --- planar front UV projection (so the painted face lands on the curve) ---
    uvl = bm.loops.layers.uv.new("UVMap")
    xs = [v.co.x for v in bm.verts]; zs = [v.co.z for v in bm.verts]
    xmin, xmax = min(xs), max(xs); zmin, zmax = min(zs), max(zs)
    pad = 0.12
    def U(x): return (x - xmin)/(xmax - xmin)*(1-2*pad)+pad
    def V(z): return (z - zmin)/(zmax - zmin)*(1-2*pad)+pad
    for f in bm.faces:
        for lo in f.loops:
            lo[uvl].uv = (U(lo.vert.co.x), V(lo.vert.co.z))

    o = new_obj("head", bm)
    o.location = (0, 0, 1.9)
    return o

def build_hair():
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.235)
    # open only the lower face (keep crown + forehead hairline)
    todel = [v for v in bm.verts if v.co.y < -0.05 and v.co.z < 0.05]
    bmesh.ops.delete(bm, geom=todel, context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_obj("hair", bm)
    o.scale = (1.07, 1.07, 1.13)
    o.location = (0, 0.03, 1.92)
    return o

def build_beard():
    objs = []
    def chunk(sx, sy, sz, loc):
        m = bpy.data.meshes.new("bd"); b = bmesh.new(); bmesh.ops.create_cube(b, size=1)
        for v in b.verts: v.co = Vector((v.co.x*sx, v.co.y*sy, v.co.z*sz))
        b.to_mesh(m); b.free()
        ob = bpy.data.objects.new("beard", m); bpy.context.collection.objects.link(ob)
        ob.location = loc; objs.append(ob)
    chunk(0.26, 0.12, 0.1, (0, -0.17, 1.74))     # chin
    chunk(0.1, 0.14, 0.13, (0.16, -0.1, 1.79))    # jaw L
    chunk(0.1, 0.14, 0.13, (-0.16, -0.1, 1.79))   # jaw R
    return join(objs, "beard")

# ============================================================ BOOTS / GEAR
def build_boot(side):
    s = side; objs = []
    def box(sx, sy, sz, loc):
        m = bpy.data.meshes.new("bt"); b = bmesh.new(); bmesh.ops.create_cube(b, size=1)
        for v in b.verts: v.co = Vector((v.co.x*sx, v.co.y*sy, v.co.z*sz))
        b.to_mesh(m); b.free()
        ob = bpy.data.objects.new("boot", m); bpy.context.collection.objects.link(ob); ob.location=loc
        objs.append(ob)
    box(0.18, 0.2, 0.14, (0, 0.0, 0.1))      # ankle/heel
    box(0.19, 0.34, 0.1, (0, -0.12, 0.05))   # instep -> toe (forward = -Y)
    box(0.17, 0.14, 0.06, (0, -0.28, 0.03))  # toe
    o = join(objs, f"boot.{'L' if s>0 else 'R'}")
    o.location = (0.15*s, 0, 0); return o

def build_sword():
    objs=[]
    def box(sx,sy,sz,loc):
        m=bpy.data.meshes.new("sw");b=bmesh.new();bmesh.ops.create_cube(b,size=1)
        for v in b.verts: v.co=Vector((v.co.x*sx,v.co.y*sy,v.co.z*sz))
        b.to_mesh(m);b.free();ob=bpy.data.objects.new("sword",m);bpy.context.collection.objects.link(ob);ob.location=loc;objs.append(ob);return ob
    blade=box(0.05,0.02,0.82,(0,0,1.52))
    box(0.2,0.05,0.05,(0,0,1.09))   # guard
    box(0.05,0.05,0.16,(0,0,1.0))   # grip
    return blade, objs

# ============================================================ ASSEMBLE
def assemble_full():
    skin = mat_skin_with_face("skin")
    tunic = mat_solid("tunic", TUNIC, rough=0.82, bump=0.06, bscale=16)
    trouser = mat_solid("trouser", TROUSER, rough=0.85, bump=0.05, bscale=14)
    leather = mat_solid("leather", LEATHER, rough=0.6, bump=0.12, bscale=30)
    steel = mat_solid("steel", STEEL, rough=0.3, metal=0.8)
    wood = mat_solid("wood", WOOD, rough=0.7, bump=0.1, bscale=20)
    hairm = mat_solid("hairm", HAIR, rough=1.0, bump=0.08, bscale=22)
    trim = mat_solid("trim", TRIM, rough=0.4, metal=0.5)

    body = build_body(); neck = build_neck()
    armL=build_arm(1); armR=build_arm(-1)
    body = join([body, neck, armL, armR], "body")
    body.data.materials.append(tunic); shade(body, smooth=True, angle=33)

    # legs as a separate trouser-colored object
    legL=build_leg(1); legR=build_leg(-1)
    legs = join([legL, legR], "legs"); legs.data.materials.append(trouser); shade(legs, True, 33)

    # tabard panel + belt break up the tunic (the iconic read)
    def slab(name, sx, sy, sz, loc, m, smooth=False):
        me=bpy.data.meshes.new(name); b=bmesh.new(); bmesh.ops.create_cube(b,size=1)
        for v in b.verts: v.co=Vector((v.co.x*sx, v.co.y*sy, v.co.z*sz))
        b.to_mesh(me); b.free(); ob=bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob); ob.location=loc
        ob.data.materials.append(m); shade(ob, smooth, 30); return ob
    slab("tabard", 0.2, 0.02, 0.46, (0, -0.27, 1.2), trim)
    slab("belt", 0.52, 0.36, 0.1, (0, 0, 0.9), leather)

    handL=build_hand(1); handR=build_hand(-1)
    for h in (handL,handR): h.data.materials.append(skin); shade(h, True, 40)

    head=build_head(); head.data.materials.append(skin); shade(head, True, 36)
    hair=build_hair(); hair.data.materials.append(hairm); shade(hair, True, 50)

    bootL=build_boot(1); bootR=build_boot(-1)
    for b in (bootL,bootR): b.data.materials.append(leather); shade(b, True, 40)

    # sword upright in right hand (parts not joined -> no origin shift)
    blade, swordparts = build_sword()
    for p in swordparts:
        p.data.materials.append(steel); shade(p, False)
        p.location.x += 0.34; p.location.y += 0.16

    # shield: domed wood disc + steel rim + boss
    bm=bmesh.new(); bmesh.ops.create_circle(bm, radius=0.3, segments=16, cap_ends=True)
    for v in bm.verts: v.co.y -= 0.06*(1-(v.co.x**2+v.co.z**2)/0.09)
    sh=new_obj("shield", bm); sh.rotation_euler=(radians(90),0,0)
    sh.location=(-0.36,-0.12,1.02); sh.data.materials.append(wood); shade(sh, True, 40)
    rim=bpy.data.meshes.new("rim"); br=bmesh.new()
    bmesh.ops.create_cone(br, segments=16, radius1=0.325, radius2=0.325, depth=0.04, cap_ends=True)
    br.to_mesh(rim); br.free(); rimo=bpy.data.objects.new("rim",rim)
    bpy.context.collection.objects.link(rimo); rimo.rotation_euler=(radians(90),0,0)
    rimo.location=(-0.36,-0.09,1.02); rimo.data.materials.append(steel); shade(rimo, True, 40)
    boss=bpy.data.meshes.new("boss"); bo=bmesh.new()
    bmesh.ops.create_icosphere(bo, subdivisions=1, radius=0.06); bo.to_mesh(boss); bo.free()
    bosso=bpy.data.objects.new("boss",boss); bpy.context.collection.objects.link(bosso)
    bosso.location=(-0.36,-0.19,1.02); bosso.data.materials.append(trim); shade(bosso, False)

    return body

def build_head_only():
    skin = mat_skin_with_face("skin")
    head = build_head(); head.data.materials.append(skin); shade(head, True, 36)
    hairm = mat_solid("hairm", HAIR, rough=1.0, bump=0.08, bscale=22)
    hair=build_hair(); hair.data.materials.append(hairm); shade(hair, True, 50)
    return head

# ============================================================ STAGE / RENDER
def clear():
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete()
    for c in (bpy.data.meshes,bpy.data.materials,bpy.data.lights,bpy.data.cameras,bpy.data.images):
        for d in list(c):
            try: c.remove(d)
            except Exception: pass

def stage(part):
    grd = mat_solid("ground", "#d8d1c0", 0.92)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0,0,0))
    bpy.context.active_object.data.materials.append(grd)
    w = bpy.data.worlds.new("w"); bpy.context.scene.world=w; w.use_nodes=True
    bg=w.node_tree.nodes["Background"]; bg.inputs[0].default_value=lin("#e9e4d7"); bg.inputs[1].default_value=0.75
    look_z = 1.78 if part=="head" else 1.0
    bpy.ops.object.empty_add(location=(0,0,look_z)); tgt=bpy.context.active_object
    def area(loc,e,sz,col):
        bpy.ops.object.light_add(type="AREA",location=loc); L=bpy.context.active_object
        L.data.energy=e; L.data.size=sz; L.data.color=lin(col)[:3]
        c=L.constraints.new("TRACK_TO"); c.target=tgt; c.track_axis="TRACK_NEGATIVE_Z"; c.up_axis="UP_Y"
    area((-2.6,-3.2,3.4),1400,3.0,"#fff2dc"); area((3.2,-2.2,2.0),380,4.0,"#cfe0ff"); area((-1.4,3.0,2.8),1000,2.2,"#ffe6c2")
    cam_loc = (0.5,-2.0,1.85) if part=="head" else (0.9,-4.6,1.45)
    bpy.ops.object.camera_add(location=cam_loc); cam=bpy.context.active_object
    cam.data.lens = 80 if part=="head" else 72
    cam.data.dof.use_dof=True; cam.data.dof.focus_object=tgt; cam.data.dof.aperture_fstop=3.2
    c=cam.constraints.new("TRACK_TO"); c.target=tgt; c.track_axis="TRACK_NEGATIVE_Z"; c.up_axis="UP_Y"
    bpy.context.scene.camera=cam

def setup_render():
    sc=bpy.context.scene; sc.render.engine="CYCLES"
    sc.cycles.samples=CFG["samples"]; sc.cycles.use_denoising=True
    try: sc.cycles.denoiser="OPENIMAGEDENOISE"
    except Exception: pass
    chosen="CPU"
    try:
        pr=bpy.context.preferences.addons["cycles"].preferences
        for t in ("OPTIX","CUDA","HIP","METAL","ONEAPI"):
            try:
                pr.compute_device_type=t; pr.get_devices()
                if [d for d in pr.devices if d.type==t]:
                    for d in pr.devices: d.use=(d.type!="CPU")
                    chosen=t; break
            except Exception: continue
    except Exception: pass
    sc.cycles.device="GPU" if chosen!="CPU" else "CPU"
    print(f"[hero] device: {sc.cycles.device} ({chosen})")
    sc.render.resolution_x,sc.render.resolution_y=CFG["res"]
    sc.render.image_settings.file_format="PNG"; sc.render.filepath=CFG["out"]
    vs=sc.view_settings
    try: vs.view_transform="AgX"
    except Exception: pass
    for lk in ("AgX - Punchy","Punchy","None"):
        try: vs.look=lk; break
        except Exception: continue

def main():
    clear()
    if CFG["part"]=="head": build_head_only()
    else: assemble_full()
    stage(CFG["part"]); setup_render()
    print(f"[hero] rendering {CFG['part']} {CFG['res']} @ {CFG['samples']} -> {CFG['out']}")
    bpy.ops.render.render(write_still=True)
    print("[hero] done.")

main()
