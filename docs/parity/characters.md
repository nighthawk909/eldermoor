# Parity: Characters (ACTIVE — the current deep feature)

Bar: the in-game hero, human NPCs, and monsters must read at the quality of our Blender asset
(`assets/pipeline/build_eldermoor.py` render) — faceted/sculpted, NOT blocky boxes. Built as a
**reusable, data-driven factory** (`src/render/characters.ts`) so any NPC/monster is a data row.

## Build (each must be done + look right on screen)
- [ ] `makeHero()` — sculpted tapered head (chin/brow/nose/hair/beard), rounded limbs, tunic + flared
      hem, leather spaulders, belt, **rounded boots**, gripped sword, round shield — matches the render
- [ ] Faceted flat-shaded style + the locked palette (CLAUDE.md §4); warm 3-point-ish lighting
- [ ] `makeNPC(opts)` variants from the SAME factory (e.g. Guide, Wizard, Merchant) by params/data
- [ ] At least one **monster** (`makeRat`, and a `makeBrute`) that is clearly not a box
- [ ] Animation rig retained (limb groups) so walk/attack still animate
- [ ] Reusable: a character is defined by a DATA entry (kind → factory + params), placeable anywhere
- [ ] Showcase page (turntable/lineup) deployed so it can be viewed + rotated

## Mobile QA — Josh confirms on a real phone
- [ ] Hero/NPCs/monster look good (not blocky) on the phone, side-by-side with the Blender render
- [ ] Smooth rotation/turntable; acceptable performance on device

## Tests
- [ ] Headless: factory returns a Group with the expected sub-meshes per kind (smoke-level)
- [ ] Visual: screenshot verification at desktop + phone width
