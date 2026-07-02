#!/usr/bin/env python3
"""
bake_tint_masks.py - generate per-model skin/hair recolor masks for the
KayKit character atlases (assets/ext/characters/*.glb).

Zero-dependency (pure stdlib, like make_textures.py). For each model it:
  1. reads the glb, decodes the embedded 1024x1024 atlas PNG,
  2. rasterizes the UV islands of every mesh (head meshes tracked separately),
  3. classifies each covered texel against measured palette anchors:
       SKIN  (shared KayKit skin ramp)     -> may appear on any mesh
       HAIR  (per-model hair/beard colors) -> only counted on the HEAD mesh
             islands, so e.g. the rogue's auburn hair anchors never catch the
             barbarian's same-colored leather bracers,
  4. dilates the result 2px (kills bilinear seams at island edges),
  5. writes assets/ext/characters/masks/<Model>_mask.png
       R channel = skin mask (255 = recolor as skin)
       G channel = hair mask (255 = recolor as hair)

The client (src/char/glb-tint.js) samples these masks to retint the live
atlas texture to the player's chosen skin tone / hair colour at runtime.
Re-run only when the source glbs change. Debug composites go to --debug DIR.
"""
import json, struct, zlib, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHAR_DIR = os.path.join(ROOT, 'assets', 'ext', 'characters')
MASK_DIR = os.path.join(CHAR_DIR, 'masks')

# HSL family predicates, designed from a census of each model's UV islands
# (the atlas swatches are vertical GRADIENTS, so fixed RGB anchors clip partway
# down a swatch; hue/sat/lightness bands cover the full ramp). Skin is the
# shared KayKit ramp (hue 18-26deg, sat ~0.8); each hair family lives in its
# own region; the dark face-paint / eye cluster (hue ~190deg) matches nothing.
import colorsys

def _hsl(px):
    hh, ll, ss = colorsys.rgb_to_hls(px[0]/255, px[1]/255, px[2]/255)
    return hh*360, ss, ll

def is_skin(px):
    h, s, l = _hsl(px)
    return 12 <= h <= 30 and s >= 0.68 and 0.55 <= l <= 0.92

def _hair_blonde(px):
    h, s, l = _hsl(px)
    return 27 <= h <= 44 and 0.32 <= s <= 0.68 and 0.5 <= l <= 0.85

def _hair_gray(px):
    h, s, l = _hsl(px)
    return (h <= 60 or h >= 330) and s <= 0.22 and 0.3 <= l <= 0.75

def _hair_auburn(px):
    h, s, l = _hsl(px)
    return 4 <= h <= 24 and 0.3 <= s <= 0.6 and 0.18 <= l <= 0.6

def _hair_dark(px):
    h, s, l = _hsl(px)
    return (h >= 270 or h <= 60) and s <= 0.25 and l <= 0.28

HAIR_PRED = {
    'Knight':       _hair_blonde,
    'Barbarian':    _hair_gray,
    'Rogue':        _hair_auburn,
    'Rogue_Hooded': _hair_auburn,
    'Mage':         _hair_dark,
}
# runtime tint bases (lum reference for shading-preserving recolor), exported
# for src/char/glb-tint.js to mirror:
TINT_BASE = {
    'skin': (0xf6,0xc0,0x9c),
    'Knight': (0xe3,0xbe,0x8f), 'Barbarian': (0x9a,0x92,0x8a),
    'Rogue': (0xa2,0x61,0x49), 'Rogue_Hooded': (0xa2,0x61,0x49),
    'Mage': (0x2a,0x26,0x29),
}

def load_glb(path):
    d = open(path,'rb').read()
    ln, = struct.unpack('<I', d[12:16]); j = json.loads(d[20:20+ln])
    off = 20+ln
    bl, = struct.unpack('<I', d[off:off+4])
    return j, d[off+8:off+8+bl]

def accessor(j, binc, idx):
    a = j['accessors'][idx]; bv = j['bufferViews'][a['bufferView']]
    fmt, sz = {5126:('f',4),5123:('H',2),5125:('I',4),5121:('B',1)}[a['componentType']]
    n = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    off = bv.get('byteOffset',0) + a.get('byteOffset',0)
    return struct.unpack('<' + fmt*a['count']*n, binc[off:off+a['count']*n*sz])

def png_decode(data):
    pos = 8; w = h = ct = None; idat = b''
    while pos < len(data):
        l, = struct.unpack('>I', data[pos:pos+4]); typ = data[pos+4:pos+8]
        if typ == b'IHDR': w,h,_,ct = struct.unpack('>IIBB', data[pos+8:pos+18])
        elif typ == b'IDAT': idat += data[pos+8:pos+8+l]
        pos += 12+l
    raw = zlib.decompress(idat); bpp = {2:3,6:4}[ct]; stride = w*bpp+1
    out = bytearray(w*h*bpp); prev = bytearray(w*bpp)
    for y in range(h):
        f = raw[y*stride]; line = bytearray(raw[y*stride+1:(y+1)*stride])
        if f == 1:
            for x in range(bpp, len(line)): line[x] = (line[x]+line[x-bpp]) & 255
        elif f == 2:
            for x in range(len(line)): line[x] = (line[x]+prev[x]) & 255
        elif f == 3:
            for x in range(len(line)): line[x] = (line[x]+((line[x-bpp] if x>=bpp else 0)+prev[x])//2) & 255
        elif f == 4:
            for x in range(len(line)):
                a2 = line[x-bpp] if x>=bpp else 0; b2 = prev[x]; c2 = prev[x-bpp] if x>=bpp else 0
                p = a2+b2-c2; pa,pb,pc = abs(p-a2), abs(p-b2), abs(p-c2)
                line[x] = (line[x]+(a2 if pa<=pb and pa<=pc else (b2 if pb<=pc else c2))) & 255
        out[y*w*bpp:(y+1)*w*bpp] = line; prev = line
    return w, h, bpp, out

def png_encode(w, h, rgb):
    def chunk(typ, data):
        c = struct.pack('>I', len(data)) + typ + data
        return c + struct.pack('>I', zlib.crc32(typ+data) & 0xffffffff)
    raw = b''.join(b'\x00' + bytes(rgb[y*w*3:(y+1)*w*3]) for y in range(h))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

def raster_islands(j, binc, node_names, w, h):
    """Set of texel offsets covered by the UV triangles of the named nodes."""
    cover = bytearray(w*h)
    name2node = {n.get('name'): n for n in j['nodes']}
    for nm in node_names:
        n = name2node.get(nm)
        if not n or 'mesh' not in n: continue
        for prim in j['meshes'][n['mesh']]['primitives']:
            if 'TEXCOORD_0' not in prim['attributes']: continue
            uv = accessor(j, binc, prim['attributes']['TEXCOORD_0'])
            idxs = accessor(j, binc, prim['indices'])
            for t in range(0, len(idxs), 3):
                xs=[]; ys=[]
                for k in range(3):
                    xs.append(uv[idxs[t+k]*2] * w); ys.append(uv[idxs[t+k]*2+1] * h)
                x0 = max(0, int(min(xs))-1); x1 = min(w-1, int(max(xs))+1)
                y0 = max(0, int(min(ys))-1); y1 = min(h-1, int(max(ys))+1)
                ax,ay,bx,by,cx,cy = xs[0],ys[0],xs[1],ys[1],xs[2],ys[2]
                den = (by-cy)*(ax-cx) + (cx-bx)*(ay-cy)
                if abs(den) < 1e-9: continue
                for py in range(y0, y1+1):
                    for px in range(x0, x1+1):
                        l1 = ((by-cy)*(px+.5-cx) + (cx-bx)*(py+.5-cy)) / den
                        l2 = ((cy-ay)*(px+.5-cx) + (ax-cx)*(py+.5-cy)) / den
                        l3 = 1-l1-l2
                        if l1 >= -0.02 and l2 >= -0.02 and l3 >= -0.02:
                            cover[py*w+px] = 1
    return cover

def dilate(mask, w, h, rounds=2):
    for _ in range(rounds):
        src = bytes(mask)
        for y in range(h):
            row = y*w
            for x in range(w):
                i = row+x
                if src[i]: continue
                if ((x and src[i-1]) or (x < w-1 and src[i+1]) or
                    (y and src[i-w]) or (y < h-1 and src[i+w])):
                    mask[i] = 255
    return mask

def bake(model, debug_dir=None):
    j, binc = load_glb(os.path.join(CHAR_DIR, model + '.glb'))
    img = j['images'][0]; bv = j['bufferViews'][img['bufferView']]
    w, h, bpp, atlas = png_decode(binc[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])
    names = [n.get('name') for n in j['nodes'] if 'mesh' in n]
    heads = [nm for nm in names if nm and 'Head' in nm]
    cover_all  = raster_islands(j, binc, names, w, h)
    cover_head = raster_islands(j, binc, heads, w, h)
    hair_pred = HAIR_PRED.get(model)
    skin = bytearray(w*h); hair = bytearray(w*h)
    for i in range(w*h):
        if not cover_all[i]: continue
        px = atlas[i*bpp:i*bpp+3]
        if cover_head[i] and hair_pred and hair_pred(px):
            hair[i] = 255
        elif is_skin(px):
            skin[i] = 255
    dilate(skin, w, h); dilate(hair, w, h)
    out = bytearray(w*h*3)
    for i in range(w*h):
        out[i*3] = skin[i]; out[i*3+1] = hair[i]
    os.makedirs(MASK_DIR, exist_ok=True)
    dst = os.path.join(MASK_DIR, model + '_mask.png')
    open(dst, 'wb').write(png_encode(w, h, out))
    ns = sum(1 for v in skin if v); nh = sum(1 for v in hair if v)
    print(f'{model}: skin {ns}px  hair {nh}px  -> {os.path.relpath(dst, ROOT)}')

    if debug_dir:
        # composite: atlas with skin tinted deep-brown + hair tinted red, to eyeball coverage
        os.makedirs(debug_dir, exist_ok=True)
        def lum(p): return 0.299*p[0] + 0.587*p[1] + 0.114*p[2]
        SKIN_T = (0x6b,0x45,0x2c); SKIN_B = lum(TINT_BASE['skin'])
        HAIR_T = (0xc0,0x30,0x20)
        HAIR_B = lum(TINT_BASE.get(model, (0x80,0x80,0x80)))
        dbg = bytearray(w*h*3)
        for i in range(w*h):
            p = atlas[i*bpp:i*bpp+3]
            if hair[i]:
                s = lum(p)/max(1.0, HAIR_B)
                dbg[i*3:i*3+3] = bytes(min(255,int(c*s)) for c in HAIR_T)
            elif skin[i]:
                s = lum(p)/SKIN_B
                dbg[i*3:i*3+3] = bytes(min(255,int(c*s)) for c in SKIN_T)
            else:
                dbg[i*3:i*3+3] = p
        open(os.path.join(debug_dir, model + '_debug.png'), 'wb').write(png_encode(w, h, dbg))

if __name__ == '__main__':
    debug = None
    if '--debug' in sys.argv:
        debug = sys.argv[sys.argv.index('--debug')+1]
    for model in ['Knight','Barbarian','Rogue','Rogue_Hooded','Mage']:
        bake(model, debug)
