# CLAUDE.md — Eldermoor

Durable project context for Claude Code. Read this first every session.

---

## 1. What this is

**Eldermoor** is an original game in the visual register of early-2000s RuneScape
(RS Classic / RS2 era): low-poly, faceted, stylized — *not* AAA, not photoreal.
The bar is **parity-or-better within that register**: clean silhouettes, consistent
materials, deliberate lighting. Think "a notch above OSRS in craft, not in polycount."

## 2. Hard rules (IP)

- **Every asset is original.** We match the *style and production quality* of the era.
- **Never** reproduce Jagex's specific expression: their character/monster models, the
  map of Gielinor, item/UI designs, music, or the RuneScape names/logos.
- Style, genre, mechanics, and the low-poly look are not copyrightable — original designs
  in that style are how a real competitor legally exists. Stay on that side of the line.

## 3. Stack & decisions

- **Cost philosophy (decided):** free tooling now, architected to pay-to-scale the moment
  revenue/load justifies it. No tool choice made to avoid ever paying.
- **Engine (working decision, not locked):** leaning **Unity** — free Personal under
  $200K revenue/funding, Pro seats above. Revisit vs. Godot 4 / web-first before heavy
  engine investment. Browser-instant-play is a desired property (RuneScape's DNA).
- **Asset pipeline (decided):** authored in **Blender** (Python-generated geometry),
  rendered in **Cycles**. Pipeline is engine-agnostic; models carry into Unity/Godot.
- **Renderer:** Cycles, GPU. Production defaults live in `build_eldermoor.py`.

## 4. Visual language / art bible

**Signature:** faceted (flat-shaded) geometry, warm late-afternoon key light, long soft
shadows, harmonized storybook palette, AgX-Punchy grade. Spend boldness on the world and
character silhouettes; keep UI quiet.

**Palette (sRGB hex):**
- Skin `#e8b98e` · Hair `#3a2a1c` · Beard `#4a3420` · Eyes `#241812`
- Tunic `#3f6f8c` · Trim/gold `#d8b25a` · Cape `#9c3030` · Trousers `#2f3742`
- Leather `#5a3f28` · Steel `#c2cad4`
- World/terrain (for later): grass `#4f8a3c`/`#578f3f`/`#477d34`, dirt path `#8c6b40`,
  water `#2c6a82`, neutral ground `#d8d1c0`, sky/world fill `#e9e4d7`

**Character construction (locked approach):**
- Sculpted low-poly **head**: icosphere with lower verts pinched to a **chin**, back
  flattened, face pushed forward; plus a protruding 3-sided **nose**, heavy **brow**,
  angular **eyes**, chunky **hair** (top mass + fringe + sideburns + back), short **beard**.
- Slim, tall-ish **body** with sloped shoulder yoke (no boxy flat top), tapered limbs,
  faceted hands, and **shaped boots** (ankle + forward foot + raised toe + sole).
- Gear: upright sword, round shield (disc faces front), draped cape.

**Lighting:** three-point (warm key, cool fill, warm rim), depth of field, AgX Punchy.

## 5. Current assets

- `build_eldermoor.py` — builds the **Adventurer** and renders a still. The model is
  approved; resolution/samples/denoise are what scale up on GPU.
- `eldermoor.html` — interactive web prototype (Three.js). Reference for the *look* and
  *interaction*: rotatable RS-style camera, click-to-move, floating nameplates, a
  populated world chunk (trees, pond, cottage, campfire, NPCs). Not the shipping client.

## 6. How to render

```bash
# preview (fast): 48 samples, 720x900
blender --background --python build_eldermoor.py -- --preview
# full quality: 1800x2250, 384 samples, OpenImageDenoise, GPU auto-detect
blender --background --python build_eldermoor.py
# overrides
blender --background --python build_eldermoor.py -- --samples 512 --res 2400 3000 --out hero.png
```

**Always confirm GPU use:** the script prints `[eldermoor] render device: GPU (OPTIX/CUDA/HIP/...)`.
If it says `CPU`, enable the card in Blender > Preferences > System > Cycles Render Devices, then rerun.

## 7. Code conventions (build_eldermoor.py)

- **Factory pattern:** `build_head()` + primitive helpers `cube / cyl / cone / ico`.
  New characters reuse these — don't hand-place raw `bpy.ops`.
- **Coordinate convention:** geometry is authored in web-render space (Y up, +Z forward)
  and converted to Blender (Z up, front = -Y) via `conv()` / `dimsB()`. Keep new geometry
  in authored space and let `conv()` handle it, so models stay identical to the web prototype.
- **Flat shading + light bevel** on parts (the faceted look with edge highlights).
- **Color:** author sRGB hex; `lin()` converts to linear for Cycles. Always go through it.
- Scale is applied per-object so bevel width stays uniform.

## 8. Division of labor

- **Claude Code (this machine):** runs renders on the GPU, builds the Unity project,
  multi-file/agentic work, git. The executor.
- **Claude chat:** look/quality judgment (can view uploaded renders), architecture and
  tradeoff decisions, current-info research, authoring scripts/specs that get run here.
- **Loop:** decide & author in chat → execute & render here → bring results back to judge.

## 9. Roadmap

**Near term**
- `build_merchant()` and `build_brute()` → render a **cast lineup** in one frame.
- **Turntable** render (N frames orbiting) for full-angle review.
- **Texture pass** on the head (skin/eye map) — the biggest jump toward true OSRS finish;
  the face is currently pure geometry.

**Then**
- Import approved models into the chosen engine; rig + walk/combat animation set.
- Build a town/zone using the world palette and props from the web prototype.

## 10. Repo layout

```
build_eldermoor.py   # asset generator + Cycles renderer
README.md            # quick-start, run commands, troubleshooting
CLAUDE.md            # this file (project context/rules)
HANDOFF.md           # current state + next steps
.gitignore
```
