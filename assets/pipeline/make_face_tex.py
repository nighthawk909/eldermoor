#!/usr/bin/env python3
"""Chunk A2: paint a stylized face texture (Claude-built, no stock art).
Frontal layout intended for a planar UV projection onto the head front."""
from PIL import Image, ImageDraw, ImageFilter
import math

S = 1024
img = Image.new("RGB", (S, S), (232, 185, 142))   # base skin #e8b98e
d = ImageDraw.Draw(img, "RGBA")
cx = S // 2

def blob(layer_fn):
    """draw on a transparent layer, blur, composite (soft painted look)."""
    lay = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    layer_fn(ImageDraw.Draw(lay))
    return lay

# ---- skin shading: radial light from upper-center, darker at edges/jaw ----
shade = Image.new("L", (S, S), 0)
sd = ImageDraw.Draw(shade)
for r, a in [(560, 0), (470, 18), (380, 36), (300, 60)]:
    sd.ellipse([cx - r, int(0.34 * S) - r, cx + r, int(0.34 * S) + r], fill=a)
shade = shade.filter(ImageFilter.GaussianBlur(70))
dark = Image.new("RGB", (S, S), (150, 104, 66))     # shadow tone
img = Image.composite(dark, img, shade)
d = ImageDraw.Draw(img, "RGBA")

# warm cheek tint
cheek = blob(lambda dd: [dd.ellipse([cx - 250, 470, cx - 110, 600], fill=(206, 120, 96, 70)),
                         dd.ellipse([cx + 110, 470, cx + 250, 600], fill=(206, 120, 96, 70))])
cheek = cheek.filter(ImageFilter.GaussianBlur(40))
img.paste(Image.new("RGB", (S, S), (206, 120, 96)), (0, 0), cheek)
d = ImageDraw.Draw(img, "RGBA")

# ---- nose: soft side shadows + tip highlight (geometry nose exists; keep subtle) ----
nose = blob(lambda dd: [dd.polygon([(cx - 26, 360), (cx - 40, 520), (cx - 10, 540)], fill=(140, 96, 60, 90)),
                        dd.polygon([(cx + 26, 360), (cx + 40, 520), (cx + 10, 540)], fill=(120, 82, 50, 90))])
nose = nose.filter(ImageFilter.GaussianBlur(14))
img.paste(Image.new("RGB", (S, S), (130, 88, 54)), (0, 0), nose)
d = ImageDraw.Draw(img, "RGBA")
d.ellipse([cx - 16, 520, cx + 16, 556], fill=(244, 200, 158, 120))   # tip highlight

# ---- eyes (angled, defined) ----
def eye(ex, mirror=1):
    ey = 430
    # eye-white almond
    d.polygon([(ex - 70 * mirror, ey), (ex - 6 * mirror, ey - 26),
               (ex + 64 * mirror, ey + 6), (ex - 4 * mirror, ey + 30)],
              fill=(238, 235, 228, 255))
    # iris + pupil
    ix = ex + 6 * mirror
    d.ellipse([ix - 24, ey - 16, ix + 24, ey + 32], fill=(74, 52, 34, 255))
    d.ellipse([ix - 12, ey - 4, ix + 12, ey + 20], fill=(26, 18, 12, 255))
    d.ellipse([ix - 4, ey - 2, ix + 6, ey + 8], fill=(245, 245, 240, 220))   # catchlight
    # heavy upper lid (the OSRS read)
    d.line([(ex - 74 * mirror, ey - 4), (ex - 4 * mirror, ey - 30),
            (ex + 66 * mirror, ey + 2)], fill=(40, 28, 18, 255), width=11)
    # subtle lower lid
    d.line([(ex - 64 * mirror, ey + 6), (ex + 56 * mirror, ey + 14)],
           fill=(150, 104, 66, 160), width=5)

eye(cx - 150, mirror=1)
eye(cx + 150, mirror=-1)

# ---- brows (thick, angled inward-down: defined/serious) ----
def brow(bx, mirror=1):
    by = 360
    d.polygon([(bx - 96 * mirror, by + 6), (bx + 70 * mirror, by - 30),
               (bx + 66 * mirror, by - 6), (bx - 96 * mirror, by + 30)],
              fill=(58, 42, 28, 255))
brow(cx - 150, 1)
brow(cx + 150, -1)

# ---- mouth (calm, slight lower-lip light) ----
d.line([(cx - 70, 660), (cx, 672), (cx + 70, 660)], fill=(120, 72, 56, 220), width=8)
d.line([(cx - 60, 686), (cx + 60, 686)], fill=(214, 150, 120, 130), width=6)

# gentle overall paint softening
img = img.filter(ImageFilter.GaussianBlur(1.2))
img.save("/home/claude/eldermoor/face_tex.png")
print("saved face_tex.png", img.size)
