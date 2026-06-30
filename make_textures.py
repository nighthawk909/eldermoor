#!/usr/bin/env python3
"""
make_textures.py — generate seamless tiling textures for the Eldermoor web client.

Pure stdlib (zlib + struct) so it runs anywhere, no PIL/numpy/Blender needed. Outputs
sRGB PNGs that Three.js tiles in world space (uniform texel density, ART_SPEC §3). The
client applies them by glTF material name (stone -> brick, plank -> wood).

Run:  python make_textures.py
"""
import zlib, struct, random, math, os

W = H = 256
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "textures")


def write_png(path, w, h, rgb):
    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data
                + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff))
    raw = bytearray()
    for y in range(h):
        raw.append(0)                       # filter byte: none
        raw += rgb[y * w * 3:(y + 1) * w * 3]
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def clamp(v):
    return 0 if v < 0 else 255 if v > 255 else int(v)


def brick(seed=7):
    """Stone-brick wall: offset courses, mortar lines, per-brick tone + grain noise.
    Seamless horizontally (offset pattern repeats every 2 rows) and vertically."""
    random.seed(seed)
    bw, bh, mortar = 64, 32, 4                       # brick w/h and mortar thickness (px)
    mortar_c = (108, 110, 116)
    px = bytearray(W * H * 3)
    # precompute a per-brick base tone keyed by (row, col, offset) so tiling stays seamless
    tone = {}
    rows = H // bh
    for ry in range(rows + 1):
        off = (bw // 2) if (ry % 2) else 0
        for cx in range(-1, W // bw + 1):
            tone[(ry % rows, cx)] = 168 + random.randint(-20, 16)
    for y in range(H):
        ry = y // bh
        off = (bw // 2) if (ry % 2) else 0
        fy = y % bh
        for x in range(W):
            xx = (x + off) % W
            cx = xx // bw
            fx = xx % bw
            is_mortar = fy < mortar or fx < mortar
            if is_mortar:
                n = random.randint(-6, 6)
                r, g, b = mortar_c[0] + n, mortar_c[1] + n, mortar_c[2] + n
            else:
                base = tone[(ry % rows, cx)]
                # subtle top-light shading down each brick + speckle
                shade = int((fy - bh / 2) * 0.18)
                n = random.randint(-7, 7)
                r = base + 4 - shade + n
                g = base + 6 - shade + n
                b = base + 12 - shade + n
            i = (y * W + x) * 3
            px[i] = clamp(r); px[i + 1] = clamp(g); px[i + 2] = clamp(b)
    return px


def plank(seed=11):
    """Wood plank floor: vertical boards, dark seams, per-board tone + horizontal grain.
    Seamless on both axes."""
    random.seed(seed)
    pw, seam = 52, 3
    px = bytearray(W * H * 3)
    nboards = W // pw + 1
    board_tone = [random.randint(-20, 16) for _ in range(nboards + 1)]
    for x in range(W):
        bi = x // pw
        fx = x % pw
        seam_x = fx < seam
        for y in range(H):
            # horizontal grain streaks (low-freq sine + noise), seamless via 2*pi*y/H
            grain = math.sin(y / H * math.pi * 6 + bi) * 5 + math.sin(y / H * math.pi * 18) * 3
            base_r, base_g, base_b = 122, 84, 46
            t = board_tone[bi]
            if seam_x:
                r, g, b = base_r - 46, base_g - 36, base_b - 24
            else:
                n = random.randint(-6, 6)
                r = base_r + t + grain + n
                g = base_g + t + grain * 0.7 + n
                b = base_b + t + grain * 0.5 + n
            i = (y * W + x) * 3
            px[i] = clamp(r); px[i + 1] = clamp(g); px[i + 2] = clamp(b)
    return px


def _field(seed, base, patch_amp, noise_amp, speckle, freq=(2, 2, 3)):
    """Generic seamless ground texture: low-freq tonal patches (sine, wraps) + per-pixel
    noise + occasional light/dark speckle. base=(r,g,b)."""
    random.seed(seed)
    px = bytearray(W * H * 3)
    for y in range(H):
        for x in range(W):
            patch = (math.sin(2*math.pi*x/W*freq[0]) * math.cos(2*math.pi*y/H*freq[1]) * patch_amp
                     + math.sin(2*math.pi*(x+y)/W*freq[2]) * patch_amp*0.6)
            n = random.randint(-noise_amp, noise_amp)
            sp = 0; r = random.random()
            if r < speckle:        sp = random.randint(10, 26)
            elif r < speckle*2:    sp = -random.randint(8, 20)
            i = (y * W + x) * 3
            px[i]   = clamp(base[0] + patch*0.5 + n*0.7 + sp*0.6)
            px[i+1] = clamp(base[1] + patch     + n     + sp)
            px[i+2] = clamp(base[2] + patch*0.4 + n*0.6 + sp*0.4)
    return px


def grass(seed=23): return _field(seed, (78, 138, 60), 7, 11, 0.06)
def dirt(seed=29):  return _field(seed, (140, 107, 64), 8, 13, 0.05, freq=(3, 2, 4))
def sand(seed=37):  return _field(seed, (216, 200, 150), 6, 9, 0.04, freq=(3, 3, 5))


def water(seed=31):
    """Seamless water: layered ripples (sine, wrap) over a blue base."""
    random.seed(seed)
    px = bytearray(W * H * 3)
    base = (44, 106, 130)
    for y in range(H):
        for x in range(W):
            ripple = (math.sin(2*math.pi*x/W*4 + math.sin(2*math.pi*y/H*3)*1.5) * 9
                      + math.sin(2*math.pi*y/H*6) * 5)
            n = random.randint(-3, 3)
            i = (y * W + x) * 3
            px[i]   = clamp(base[0] + ripple*0.4 + n)
            px[i+1] = clamp(base[1] + ripple*0.7 + n)
            px[i+2] = clamp(base[2] + ripple     + n)
    return px


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, gen in (("brick", brick), ("plank", plank), ("grass", grass),
                      ("dirt", dirt), ("sand", sand), ("water", water)):
        write_png(os.path.join(OUT, name + ".png"), W, H, gen())
    print(f"[textures] wrote brick, plank, grass, dirt, sand, water -> {OUT}")


if __name__ == "__main__":
    main()
