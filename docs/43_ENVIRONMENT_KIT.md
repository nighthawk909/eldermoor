# 43_ENVIRONMENT_KIT.md — modular environment kit + Chapel worked example

Two parts: (A) the reusable kit-piece catalog every building is assembled from, and (B) the
**Chapel** specified to full parity depth — the reference standard for how detailed every
buildable spec must be (`02_AI_DEV_WORKFLOW`). Built with `build_kit.py`, verified against the
owner's OSRS chapel reference (study only — never reused, `03_IP_AND_ORIGINALITY`).

Grid law: **1 tile = 2.0 world units.** All placement is tile-aligned. Palette from `40_ART_SPEC` §5.

---

## A. Kit-piece catalog

| Piece | Dims (u) | Tris budget | Material | Notes | Status |
|-------|----------|-------------|----------|-------|--------|
| `wall.segment` | len × 3.0 × 0.32 + capstone | ≤16 | stone | runs along X or Z; capstone course on top | ✅ proven |
| `wall.corner_post` | 0.42 × 3.2 × 0.42 | ≤12 | stone | ties two runs, no joint gap | ✅ proven |
| `wall.doorway` | 2.0 gap, lintel above | ≤24 | stone | 2.0u opening + stone lintel | 📋 |
| `wall.window` | 0.9 arched opening | ≤30 | stone | arched cutout, sill | 📋 |
| `floor.tile` | 2.0 × 0.12 × 2.0 | 2 | plank | instanced to fill interior | ✅ proven |
| `roof.gable` | per span | ≤40 | thatch/plank | hidden when camera inside (open-top render) | 📋 |
| `prop.altar` | 3.0 × 1.6 × 1.4 | ≤120 | altar-stone | glowing relic on top | 📋 |
| `prop.organ` | 2.4 × 3.0 × 1.2 | ≤300 | pewter+wood | pipe rack | 📋 |
| `prop.banner` | 0.9 × 1.8 × 0.05 | ≤20 | cloth | wall-hung, emblem | 📋 |
| `prop.candlestand`| 0.3 × 1.3 × 0.3 | ≤60 | wood+flame | emissive flame | 📋 |
| `prop.rug` | 2 tiles × 4 tiles | 2 | cloth | center runner | 📋 |

Texel density uniform across all (UV cube-projection, `40_ART_SPEC` §3).

## B. Chapel — full parity spec

### B.1 Reference & intent
A small stone place of worship: rectangular stone-block shell, open-top (camera sees the interior
from above, as in the reference), plank floor, altar at the head, a pipe organ in a corner, wall
banners, candle stands flanking the altar, a red runner rug. Brother-Brace-equivalent NPC (`55`).

### B.2 Footprint & shell (measurable acceptance)
- **Interior:** 7 × 5 tiles (14.0 × 10.0 u). Origin = interior center (0,0,0); floor top at y=0.
- **Walls:** height **3.0 u** + **0.16 u** capstone; thickness **0.32 u**; on the interior
  perimeter. Material `stone` (#9a958a / #7c786f, mortar #49453f), blocks ~0.6u wide, running bond,
  visible mortar — per kit-corner result.
- **Corner posts:** 4, at the interior corners (±7.0, ±5.0), 0.42² × 3.2u.
- **Doorway:** centered on the **south** wall (+Z), 2.0u opening, stone lintel from 2.4–3.0u high.
- **Windows:** 2 per long (north/south of east & west)… concretely **4 arched windows**: two on
  the east wall, two on the west wall, centered at z = ±3.0, sill 1.4u, arch top 2.4u, opening 0.9u.
- **Floor:** plank, fills 7×5 tiles flush to interior walls.
- **Roof:** `roof.gable` spec'd but **omitted from the interior beauty render** (open-top), matching
  the reference camera. Toggle `--roof` builds it for exterior shots.

### B.3 Props (tile-aligned positions, authored x=E/W, z=N/S; north = −Z)
| Prop | Count | Position(s) (u) | Size (u) | Palette |
|------|-------|-----------------|----------|---------|
| Altar | 1 | (0, 0, −4.4) against north wall | 3.0×1.6×1.4 | stone #cdc6b6/#b7ad96; relic emissive #9be0ff |
| Candle stand | 2 | (−1.8,0,−4.0),(1.8,0,−4.0) | 0.3×1.3×0.3 | wood #5a3f28; flame emissive #ffb24a |
| Pipe organ | 1 | NE corner (5.4,0,−3.4) | 2.4×3.0×1.2 | pipes #c9ccd2 pewter; frame #5a3f28 |
| Banner | 4 | north wall, x=−4.5,−1.5,1.5,4.5 at z=−4.9, y=1.0–2.6 | 0.9×1.8×0.05 | cloth #34427a; emblem trim #d8b25a |
| Rug runner | 1 | center, spanning z −3.5→3.5 | 2 tiles × ~4 tiles | #8a2f2f; border #d8b25a |

### B.4 Materials / lighting / camera
- Materials: stone, plank, cloth, pewter (metal 0.6 rough 0.4), altar-stone, emissive flame/relic.
  All on-palette, UV-projected for uniform texel density.
- Lighting: `40_ART_SPEC` §2 Blender recipe — bright even world fill + gentle high warm sun, AgX-Punchy.
- Camera: steep near-isometric, long lens (85mm), looking down into the open top (reference framing).

### B.5 Budgets
- Shell+posts ≤ 400 tris · all props ≤ 900 tris · **chapel total ≤ ~1,500 tris** (within building
  object-class budget, `00_PROJECT_VISION` §3). Materials ≤ 7. Draw calls minimized by shared mats.

### B.6 Parity acceptance checklist (each row pass/fail via render-compare)
1. ☐ Stone walls read as stacked blocks with visible mortar courses on **all four** walls.
2. ☐ Interior is 7×5 tiles, walls 1.5 tiles tall, proportions read like the reference (wider than tall).
3. ☐ Plank floor fills the interior flush, no gaps at the wall base.
4. ☐ Doorway gap on south wall with a lintel; 4 arched windows placed symmetrically.
5. ☐ Altar centered against the north wall with a glowing relic; 2 lit candle stands flank it.
6. ☐ Pipe organ reads as a pewter pipe rack in the NE corner.
7. ☐ 4 blue banners evenly spaced on the north wall; red runner rug down the center.
8. ☐ Palette on-spec (no off-palette colors); flat even lighting; no bloom/PBR sheen.
9. ☐ Renders clean on GPU from the game camera; reads instantly as "a chapel" at gameplay distance.
10. ☐ Total ≤ ~1,500 tris; ≤ 7 materials.

### B.7 Verification procedure
`blender --background --python build_kit.py -- --scene chapel --out chapel_preview.png`; inspect;
score B.6 rows vs reference; fix failing rows; repeat until all pass; only then surface.

### B.8 Metadata (per `41_ASSET_STANDARDS`)
```
id: bld.chapel.tutorial            display: "Chapel"
category: building/religious       scale: 9×7 tiles outer
tris: ≤1500  textures: procedural tiling  materials: ≤7
collision: perimeter walls + door gap walkable; props blocking
interactions: altar(Pray), organ(Examine), door(Open)
reuse: kit pieces shared with all buildings; banners/altar reusable in other temples
deps: wall.*, floor.tile, prop.altar, prop.organ, prop.banner, prop.candlestand, prop.rug
folder: /assets/buildings/chapel   variants: +roof (exterior), ruined (future)
```
