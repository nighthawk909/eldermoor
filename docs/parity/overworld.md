# Parity: Overworld + Tutorial Island

Bar: a real OSRS-style Tutorial Island, not a bare circle of grass. A multi-room island with
paths, water/coastline, fences and buildings, populated with a varied asset library, structured
as a guided path through skill stations. Everything is **data-driven** — author once, place by
data (CLAUDE.md). Built increment by increment; QC each in the browser against the register.

## Increments

### 1. Data-driven map + asset registry foundation — ✅ (PR #20)
- `src/world/mapTypes.ts` — pure `MapDef`/`SpawnDef`/`DecorDef`/`ScatterDef` + `ASSET_KINDS`.
- `src/world/assetRegistry.ts` — `AssetKind → mesh factory` (the only id→factory map).
- `src/world/loadMap.ts` — turns a `MapDef` into scene meshes + sim entities.
- `src/world/maps/tutorialIsland.ts` — content as data; `client.ts` loads it via `loadMap()`.
- Tests: `tests/world/map.test.ts` (registry coverage + map validity).

### 2. Asset breadth — ✅
Tens of assets, all parametric / data-driven, registered by id (**27 kinds**). Verified: a live
sampler renders every kind with zero build errors.
- **Trees** (`makeTree(variant)` + `TREE_VARIANTS`): oak, willow, pine (conical), dead (bare).
- **Rocks** (`makeRock(ore)` + `ROCK_VARIANTS`): copper, tin, iron, coal, clay.
- **NPCs** (`makeNPC` + `NPC_PRESETS`): guide, wizard, merchant, guard, townsfolk_m, townsfolk_f, skiller.
- **Monsters**: rat, spider, goblin, imp, cow, brute.
- **Decor**: campfire, pond.

### 3. Bigger Tutorial Island — ⬜ (next)
- [ ] Expand the grid; author a larger multi-room island in map data.
- [ ] Paths, water/coastline, fences, buildings (collision via `blockedTiles`/decor).
- [ ] Skill stations: survival/fishing, cooking, mining/smithing, combat, quest guide, bank,
      prayer, magic — each a room with its station prop + NPC, placed by data.
- [ ] Populate with the new asset variety (varied trees/rocks/NPCs/monsters per region).
- [ ] Verify in the browser: walkable, no collision gaps, reads as an island.

### 4. Guided quest flow — ⬜
- [ ] Stations gate progression (complete a step → next area opens), à la OSRS Tutorial Island.

## Rules
- Data-driven: new content is a `MapDef` edit, not new code. New asset = factory + registry + kind.
- Depth over width; OSRS-parity DoD; no shortcuts.
- HUD (inventory/skills/equipment/minimap) is a LATER pass (Josh's call: world first).
- Do NOT flip the live root to the new client until Josh signs off on mobile.
