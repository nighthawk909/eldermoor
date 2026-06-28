# Parity: Characters (ACTIVE — the current deep feature)

Bar: the in-game hero, human NPCs, and monsters must read at the quality of our Blender asset
(`assets/pipeline/build_eldermoor.py` render) — faceted/sculpted, NOT blocky boxes. Built as a
**reusable, data-driven factory** (`src/render/characters.ts`) so any NPC/monster is a data row.

## Build (each must be done + look right on screen)
- [x] `makeHero()` — sculpted tapered head (chin/brow/nose/hair/beard), rounded limbs, tunic + flared
      hem, leather spaulders, belt, **rounded boots**, gripped sword, round shield — matches the render
      (ported from build_eldermoor.py; verified front + side in the showcase)
- [x] Faceted flat-shaded style + the locked palette (CLAUDE.md §4); warm 3-point lighting
- [x] `makeNPC(opts)` variants from the SAME factory — Guide/Wizard/Merchant by data (NPC_PRESETS); verified in lineup
- [x] At least one **monster** (`makeRat` + `makeBrute`) that is clearly not a box; verified in lineup
- [x] Animation: limb groups pivot at hip/shoulder; `animateWalk` walk cycle wired + verified
      animating in the showcase (leg angle changes frame-to-frame; mid-stride confirmed)
- [x] Reusable: a character is a DATA entry (NPC_PRESETS / factory by kind), placeable anywhere
- [x] Showcase page (turntable/lineup) deployed so it can be viewed + rotated (`/characters-showcase`)

## Mobile QA — Josh confirms on a real phone
- [ ] Hero/NPCs/monster look good (not blocky) on the phone, side-by-side with the Blender render
- [ ] Smooth rotation/turntable; acceptable performance on device

## Tests
- [ ] Headless: factory returns a Group with the expected sub-meshes per kind (smoke-level)
- [ ] Visual: screenshot verification at desktop + phone width
