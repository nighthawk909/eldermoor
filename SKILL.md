---
name: eldermoor-asset-build
description: >
  Build and refine Eldermoor 3D game assets in Blender via Python, to the early-RuneScape
  stylized register, with NO shortcuts. Use whenever creating, modeling, texturing, or
  improving any character, prop, or environment asset for the Eldermoor project. Enforces
  small verified chunks (never one-shot), reference-driven critique, and a render→inspect→
  fix loop. Trigger on: "build/model/texture/improve the <asset>", "render the cast",
  "next chunk", or any work that produces or changes an Eldermoor asset.
---

# Eldermoor Asset Build (skill)

You are building original game assets in the early-RuneScape low-poly register. Read
`CLAUDE.md` §0 (Operating Law) before doing anything. The law is binding here.

## The rule of this skill: chunks, not one-shots

Never build a whole character/prop in one pass. Pull the next unchecked chunk from
`MANIFEST.md`, build only that, verify it, and log it. One chunk per loop.

## Loop (repeat per chunk)

1. **PLAN** — Restate the chunk and write its Definition of Done. Identify the exact
   Blender operations (bmesh joins/welds, modifiers, UVs, shader nodes, texture gen).
2. **BUILD** — Implement only this chunk. Prefer the factory helpers in
   `build_eldermoor.py` (`build_head`, `cube/cyl/cone/ico`) and extend them; do not
   hand-place raw bpy.ops if a helper fits.
3. **RENDER** — Render on GPU. Confirm `[eldermoor] render device: GPU (...)`.
4. **INSPECT** — Open the image and actually look at it.
5. **CRITIQUE** — Compare to the OSRS reference and the DoD. Write a concrete defect list
   ("waist seam visible", "eyes read as grey rectangles", "hands oversized").
6. **DECIDE** — Any defect → fix and re-loop. Clean → mark the chunk done in `MANIFEST.md`.
7. **LOG** — Update `HANDOFF.md` with what changed and the next chunk.

## Quality bars (what "good" means here)

- **Mesh:** parts joined into continuous geometry; doubles welded (`bmesh.ops.remove_doubles`);
  no visible primitive seams (the two-cylinder waist) or gaps (sleeve↔shoulder). Use
  Subdivision + selective smooth/auto-smooth for flowing forms while keeping facets where
  the style wants them.
- **Materials:** procedural node setups, not flat colors — noise/voronoi/wave driving subtle
  color variation, bump, and roughness so cloth/leather/steel/skin read as substance.
- **Faces/skin:** a painted texture (generate the image in code, UV-map it). Geometry-only
  faces are forbidden — they go uncanny. This is the single biggest quality lever.
- **Silhouette/proportions:** match the approved Adventurer; slim, tall-ish, shaped boots.

## Commands

```bash
# preview
blender --background --python build_eldermoor.py -- --preview
# full GPU render
blender --background --python build_eldermoor.py -- --samples 384 --res 1800 2250 --out <chunk>.png
```

## Hard don'ts

- Don't one-shot. Don't skip INSPECT. Don't advance a chunk with a known defect.
- Don't substitute stock/purchased/AI-black-box assets. Claude-built only.
- Don't lower resolution/samples/ambition to "save time" — fix the model, not the bar.
- Don't claim done without a reference comparison.
