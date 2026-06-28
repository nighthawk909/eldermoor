# Eldermoor — Asset Index (the digital asset library)

Source of truth for every reusable asset. Build/update assets here; game code references them via
`src/render/` factories (realtime) and, later, `assets/models/` glTF (Phase 5+). Author once, place
anywhere by data — never re-model inline. See `docs/Technical_Architecture.md` §5b.

## Authoring sources
- `assets/pipeline/build_eldermoor.py` — Blender hero (the quality bar): sculpted head, tunic +
  spaulders + flared hem, rounded boots, gripped sword, round shield. **This is what in-game
  characters must match.**
- `assets/pipeline/build_hero_v2.py`, `make_face_tex.py`, `face_tex.png` — variants / face texture.

## Realtime factories (built from the playbook — CLAUDE.md §4 palette + faceted flat-shading)

Every asset is registered by a string `kind` id in `src/world/assetRegistry.ts` and declared in
`ASSET_KINDS` (`src/world/mapTypes.ts`). Maps place assets by that id. **27 kinds** registered.

| Asset | Factory (`src/render/`) | Registry kind(s) | Status |
|-------|-------------------------|------------------|--------|
| Hero (player) | `characters.ts → makeHero()` | `hero` | ✅ |
| Human NPCs (data-driven palettes) | `characters.ts → makeNPC(NPC_PRESETS[..])` | `guide` `wizard` `merchant` `guard` `townsfolk_m` `townsfolk_f` `skiller` | ✅ 7 presets |
| Monster — Giant rat | `characters.ts → makeRat()` | `rat` | ✅ |
| Monster — Giant spider | `characters.ts → makeSpider()` | `spider` | ✅ |
| Monster — Goblin | `characters.ts → makeGoblin()` | `goblin` | ✅ |
| Monster — Imp | `characters.ts → makeImp()` | `imp` | ✅ |
| Monster — Cow | `characters.ts → makeCow()` | `cow` | ✅ |
| Monster — Forest brute | `characters.ts → makeBrute()` | `brute` | ✅ |
| Trees (parametric `makeTree(variant)`) | `props.ts → TREE_VARIANTS` | `tree`(=oak) `tree_oak` `tree_willow` `tree_pine` `tree_dead` | ✅ 4 variants |
| Rocks (parametric `makeRock(ore)`) | `props.ts → ROCK_VARIANTS` | `rock`(=copper) `rock_copper` `rock_tin` `rock_iron` `rock_coal` `rock_clay` | ✅ 5 ores |
| Decor — campfire / pond | `props.ts → makeFire()/makePond()` | `fire` `pond` | ✅ |

## Rule
Adding a creature/prop = a new factory + register it in `assetRegistry.ts` + add its id to
`ASSET_KINDS`. Trees/rocks are **parametric** (one factory + a variant table) — add a variant row,
not a new function. New world content is data (a `MapDef` row), never new modelling code inline.
