# ART_SPEC.md — Eldermoor visual standard ("what clean looks like")

The locked recipe for hitting **OSRS parity-or-better**. This is the bar every asset and
every scene is measured against. If something reads as "slop," it is failing a rule here —
find which one and fix that. Pairs with MODELING_SPEC.md (character proportions) and
CLAUDE.md §4 (art bible). Created 2026-06-28 after proving the render-recipe fix.

---

## 0. The core insight

OSRS does not look clean because it is high-detail. It looks clean because it is
**coherent and restrained**, executed with a fixed technical recipe:

> tiling textures on grid-aligned low-poly geometry · flat, even, bright lighting ·
> a steep, near-isometric, long-lens camera · one shared palette + texel density.

Coherence is what the eye reads as "clean." Two assets that each look fine but disagree on
texel density, palette, or lighting will read as slop side by side. **Consistency > detail.**

## 1. The slop checklist (never ship these)

These are the exact tells that made our first prototype read as slop. Banned:

- ❌ **Per-face / per-vertex random color noise** for surfaces (the "TV static" ground).
  Surfaces get a *tiling texture*; large-scale tint is *smooth/deterministic*.
- ❌ **Moody filmic lighting** — strong single directional key + low fill + heavy fog +
  aggressive tonemapping. That's cinematic-indie, not RuneScape.
- ❌ **Wide-lens distortion** — FOV ≳ 45° at a low orbit. Reads as a phone game.
- ❌ **Raw stacked primitives as final assets** — cones-as-trees, boxes-as-furniture,
  icosphere-blob foliage. Primitives are blockout only; final assets are modeled.
- ❌ **Untextured flat-plastic materials** — every surface reads as its *substance*.
- ❌ **Off-grid placement** — walls/floors/props float at arbitrary positions.

## 2. Render recipe (locked numbers)

### Web client (Three.js — `tutorial_island.html`)
| Setting | Value | Why |
|---|---|---|
| Camera FOV | **~34°** | Long lens → near-isometric, minimal distortion |
| Camera pitch | steep (orbit `phi ≈ 0.74`) | OSRS high 3/4 view |
| Tonemapping | ACESFilmic, exposure **1.0** | Neutral, not crushed |
| Hemisphere light | `#dbe9ff`/`#6b5a3e` @ **1.0** | Bright even sky/ground fill |
| Ambient | **0.4** | Lifts shadows so nothing goes muddy |
| Directional (sun) | `#fff1d6` @ **1.3**, high angle | Gentle warm key, soft shadow only |
| Fog | start **70**, end **150** | Distance fade only, near scene stays clear |
| Ground | tiling texture (`map`) × smooth vertex tint | Clean detail, no noise |

### Blender (Cycles — asset authoring & beauty renders)
- Match the web read: bright even key + strong fill, AgX-Punchy-equivalent grade,
  long-lens camera (low FOV / orthographic-ish), GPU, production samples (CLAUDE.md §6).
- Author assets so they look right under *both* the flat web light and the Cycles render.

## 3. Texturing standard

- **Every surface is textured** with a tiling map authored to its substance: stone block,
  wood plank, thatch, cloth, leather, steel, dirt, grass, sand, water.
- **Texel density is uniform** across the kit. Target: **~64 px per world unit** (1 unit ≈
  one OSRS tile). A wall and a floor tile must share density so they read as one set.
- Textures are **low-res but clean** (64–256 px, tileable, no seams). Hand-feel, not photo.
- Color comes from the **palette** (below); textures carry *value/detail*, palette carries *hue*.
- Procedural generation in code is fine (Claude-built); the *output* must be a clean tiling map.

## 4. Geometry standard

- **Low-poly, modular, grid-aligned.** Build a kit (wall, floor, door, window, roof, post,
  fence, furniture) sized to the tile grid; instance it. Rooms = assembled kit, not one-offs.
- **Faceted flat-shading + light bevel** for the signature edge read (CLAUDE.md §7).
- **Continuous meshes** — no stacked-primitive seams, no gaps at joints (MODELING_SPEC).
- **Readable silhouette first** — the shape must read at a glance from the game camera.
- Authored in web-render space, `conv()` to Blender (CLAUDE.md §7 coordinate convention).

## 5. Palette (single source of truth)

From CLAUDE.md §4 — all assets pull from this, nothing off-palette:

- **Characters:** skin `#e8b98e` · hair `#3a2a1c` · beard `#4a3420` · eyes `#241812` ·
  tunic `#3f6f8c` · trim/gold `#d8b25a` · cape `#9c3030` · trousers `#2f3742` ·
  leather `#5a3f28` · steel `#c2cad4`
- **World:** grass `#4f8a3c`/`#578f3f`/`#477d34` · dirt path `#8c6b40` · water `#2c6a82` ·
  neutral ground `#d8d1c0` · sky/fill `#e9e4d7`
- **Architecture (extends palette):** stone wall `#9a958a`/`#7e7a70` · wood plank
  `#7a5631`/`#634327` · thatch `#b79a55` · interior floor `#6b4a2c` · banner blue `#34427a` ·
  candle flame `#ffb24a`. (Refine against reference; keep harmonized & storybook.)

## 6. Acceptance per asset (Definition of Done)

A kit piece or asset is done only when ALL pass against an OSRS reference of the same thing:

1. Silhouette reads correctly from the game camera at gameplay distance.
2. Textured to substance at the shared texel density — no flat plastic, no noise.
3. Continuous mesh — no primitive seams or joint gaps.
4. On-palette.
5. Grid-aligned / tiles cleanly with its neighbors (for modular pieces).
6. Renders clean in Blender (GPU, production) AND reads clean in the web client recipe.
7. Passes a side-by-side reference comparison; written critique of any remaining defect.

## 7. The standard, in one line

> If an OSRS player glanced at a screenshot, would they accept it as the same craft tier?
> If not, it isn't done — and the failing rule above is the thing to fix.
