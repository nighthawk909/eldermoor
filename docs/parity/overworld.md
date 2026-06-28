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

### 3. Bigger Tutorial Island — 🔨 in progress
**3a. Terrain + bigger island — ✅**
- [x] Grid expanded to 40×40; island authored purely in map data.
- [x] Terrain layer (`TerrainRect` + `WALKABLE_TERRAIN`, rendered by `structures.ts → makeTerrainPlane`):
      ocean base, sand coastline, grass landmass, dirt **path cross**, inland **lake**.
- [x] Collision: terrain-present ⇒ ocean-by-default; walkable rects open, water blocks. Verified in
      browser — ocean/lake blocked, paths/grass/sand walkable, no gaps (40×40 grid probe).
- [x] Populated with the new asset variety across zones (mining cluster, SW monster field, SE village,
      mixed-variant forests).
**3b. Buildings + fences — ✅**
- [x] `BuildingDef`/`FenceDef` schema; `structures.ts → makeBuilding/makeFence` (faceted, palette-driven).
- [x] `loadMap` places them + blocks the footprint perimeter (door left open) / fence line; building
      interior gets a walkable floor. Verified in browser: bank hut + house render with pitched roofs,
      collision probe confirms walls/fences block, doorways + interiors walkable.
- [x] Tests: building fits grid + door on perimeter; fence run in bounds (52 tests).
**3c. Skill-station props + zones — ✅**
- [x] New station factories in `props.ts`: `makeAnvil/makeFurnace/makeRange/makeAltar/makeBankBooth/makeFishingSpot`
      (emissive furnace/range/altar candles), registered as kinds `anvil/furnace/range/altar/bank_booth/fishing_spot`.
- [x] Placed by data across zones: fishing spot (lake), cooking range, smithing (ore rocks + furnace + anvil, NE),
      prayer altar + magic rune altar, bank booth (inside the bank hut), combat field, quest guide (start).
- [x] Verified in browser: all 7 stations spawn with meshes at correct tiles, collision-blocked, sim `obj`
      types set (examinable). Skill *actions* on them are separate later features.

### 4. Guided quest flow — 🔨 in progress
**4a. Quest sim module — ✅** — `src/sim/quest.ts` (QuestDef/Step/Condition/State + start/current/
applyEvent/progress): headless, deterministic, immutable step machine; conditions talk/interact/reach.
8 tests (`tests/sim/quest.test.ts`), doc `docs/modules/Quest.md`.
**4b. Client wiring + objective HUD — ✅**
- [x] Objective banner (`#objective` in play.html, top-center, gold-bordered) shows `Objective n/total`
      + the current instruction; completion message when done.
- [x] Client emits QuestEvents into `applyEvent`: talk (runAction talk), interact (runAction non-talk
      on a station/object), reach (player settles on a new tile). Advance fires a log line + haptic.
- [x] Verified in browser: banner shows step 1; tapping the Guide advanced it 1→2 with dialogue;
      out-of-order events don't advance; talk→reach→interact ran to the Complete state.
**4c. Full Tutorial Island step list + polish — ⬜** — author the talk→survival→fishing→cooking→
mining→smithing→combat→prayer→magic→bank→done sequence in data; QC the full run.

## Rules
- Data-driven: new content is a `MapDef` edit, not new code. New asset = factory + registry + kind.
- Depth over width; OSRS-parity DoD; no shortcuts.
- HUD (inventory/skills/equipment/minimap) is a LATER pass (Josh's call: world first).
- Do NOT flip the live root to the new client until Josh signs off on mobile.
