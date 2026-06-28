# Eldermoor — Technical Architecture

> Records the engineering decisions for the spec-driven build. Decisions are **proposed defaults**
> for sign-off; once acknowledged they are binding until a documented change.

## 1. Decisions (DECIDED unless flagged ⚠️ NEEDS SIGN-OFF)

| Area | Decision | Rationale |
|------|----------|-----------|
| Platform | **Web, instant-play** (no install) | Core pillar; matches the existing client + Vercel deploy. |
| Language ⚠️ | **TypeScript** for the sim core (migrate `src/` from JS) | 50+ interconnected systems + tests demand static types; "no assumptions" is far safer with types. |
| Build/deploy ⚠️ | **Vite** (dev server + build); Vercel auto-detects Vite | Replaces the current zero-build static serve; needed for TS + tests + bundling. |
| Tests | **Vitest** (unit + integration), gated in CI | ESM/TS-native, fast; required by the spec. |
| Rendering | **Reuse the existing Three.js layer** as a pure *view* | Keeps our renderer/asset/style work; the view only draws sim state + interpolates. |
| Simulation | **New authoritative tile+tick world model**, separate from render | The spec's mandate; decouples logic from drawing and makes it testable headless. |
| Sim ↔ render | Sim is **headless & deterministic**; render reads sim state each frame and **interpolates** entity positions between tile steps | Tests run the sim with no DOM/WebGL; smooth visuals without coupling. |
| Entity model | **Lightweight ECS-lite**: entities = id + typed component bag; systems mutate components per tick | Extensible to the full system list; easy to test. |
| Content | **Data-driven**: items, objects, NPCs, skills, drop tables as typed data tables | New content = data, not engine edits. |
| Persistence (slice) | Serialize full sim state → JSON in **localStorage**; versioned | Single-player slice; swappable for a DB later (see §4). |
| Networking (slice) | **None.** Sim runs client-side, locally authoritative | Phase 1 is single-player by spec. Designed for later server authority. |

⚠️ The three flagged rows (TypeScript, Vite, replacing zero-build) are the only choices that change
the repo's shape materially. Recommended, but easy to veto in favor of staying vanilla-JS ESM.

## 2. The tick loop (canonical)
```
every 600ms (game tick):
  1. drain the intent queue (clicks/commands resolved into queued actions)
  2. run systems in fixed order:
     movement → interaction/skilling → combat → NPC AI → timers (respawns, fire burn, regen)
     → state-machine resolution → persistence-dirty marking
  3. emit tick events; increment tick counter
render loop (requestAnimationFrame, decoupled):
  interpolate entity world-positions between their previous and current tile; draw; no logic.
```
Determinism: given the same state + same intents + same seeded RNG, a tick produces the same next
state (required for tests). RNG is a seeded PRNG injected into systems (no `Math.random()` in sim).

## 3. Entity / component model (slice subset)
- **Entity**: `{ id, type: 'player'|'npc'|'object'|'grounditem', components }`.
- **Components (examples)**: `Tile {x,y}`, `Path {steps[]}`, `Stats {hp,maxhp,...}`,
  `SkillSet {skill->{xp}}`, `Inventory {slots[28]}`, `Equipment {slot->item}`, `Bank {items[]}`,
  `StateMachine {state, until}`, `NpcAI {kind, home, aggro}`, `ObjectState {kind, depletedUntil}`,
  `GroundItem {item, qty, owner, despawnTick}`.
- **Systems** read/write components per tick; never touch the DOM.

## 4. Server/client model (designed now, built later — Phase 2)
- The sim core is written so it can run **server-authoritative** later: clients send **intents**
  (`walk(x,y)`, `interact(entityId, option)`), server runs the tick, broadcasts state deltas.
- DB schema (later, Postgres/Supabase candidate): `players`, `skills`, `inventory_items`,
  `bank_items`, `world_state`, `sessions`. Slice persistence (localStorage JSON) maps 1:1 to these
  tables so the swap is mechanical.
- Chunked region loading + player/NPC/object synchronization: Phase 2+ (`modules/World_Server.md`).

## 5. Repo layout (scaled, full-software-dev style)
**Principle:** every system is its own chunk (sim module + data file + spec + parity checklist),
content is data not code, and **assets live in one library** that game code references — you build/
update assets in the library, never re-model inline. This is how it scales to the 35+ system list.

```
assets/                         # ◆ THE DIGITAL ASSET LIBRARY (source of truth) ◆
  pipeline/                     #   Blender authoring (build_*.py) → high-fidelity renders / future glTF
  models/                       #   exported glTF/textures used by the game (Phase 5+)
  ASSET_INDEX.md                #   catalogue: every asset, its id, where it's used

src/
  sim/                          # headless, deterministic, testable (no DOM/THREE) — ONE FILE PER SYSTEM
    core/      tick.ts world.ts entities.ts rng.ts persistence.ts
    movement/  movement.ts
    items/     items.ts inventory.ts equipment.ts
    skills/    skills.ts woodcutting.ts firemaking.ts …      (one file per skill)
    combat/    combat.ts
    npc/       npc_ai.ts
    quests/    quest_engine.ts                                (state machine, flags)
    dialogue/  dialogue.ts                                    (tree runner)
    economy/   shops.ts trading.ts grand_exchange.ts
    bank/      banking.ts
  data/                         # CONTENT as data (add content here, not engine code)
    items.ts  npcs.ts  objects.ts  drop_tables.ts
    quests/<questId>.ts  dialogue/<npcId>.ts  world/<zoneId>.ts
  render/                       # Three.js VIEW — reusable asset factories (the realtime art playbook)
    characters.ts props.ts effects.ts  scene.ts  interpolate.ts
  ui/                           # HUD/DOM panels (inventory, equipment, skills, bank, chat, context-menu, debug)
  input/                        # pointer/touch → intents (tap, long-press, drag)
  main.ts                       # wires sim + render + ui + input

tests/sim/…                     # Vitest, mirrors src/sim/* (one spec per module)
docs/
  modules/<System>.md           # one spec per system
  parity/<feature>.md           # one OSRS-parity checklist per player feature
  Master_Game_Design_Spec.md  Technical_Architecture.md  Build_Roadmap.md
  PARITY_STANDARD.md  PROCESS_INFRASTRUCTURE.md  MOBILE_QA.md
FEATURE_COMPLETION_MATRIX.md    # master status board
```

**Rule for adding any system** (enforced via PROCESS_INFRASTRUCTURE): create its `sim/<area>/<x>.ts`
+ `data/…` + `docs/modules/<X>.md` + `docs/parity/<x>.md` + `tests/sim/<x>.test.ts`. Never bolt a
system into an unrelated file. Assets it needs are authored once in `assets/` + a `render/` factory.

## 5b. Render / asset layer — reuse the art playbook (BINDING)
The `src/render/` view layer MUST build from a **reusable, data-driven asset library**, not bespoke
geometry per object:
- Reuse the established **factory pattern + visual language**: `makeChar / makeRat / makeTree /
  makeRock / makeFire / …` and the `cube/cyl/cone/ico` helpers, the CLAUDE.md §4 palette + faceted
  flat-shaded style, and `MODELING_SPEC.md`. Author an asset once; **place it anywhere by data**
  (a world-object/NPC table maps `kind` → factory + params).
- New world content = a data row (kind, tile, params), never new modelling code. This is how it
  scales to a large world and stays visually consistent.
- The Blender pipeline (`assets/pipeline/`) remains the high-fidelity source; glTF import (Phase 5)
  swaps factory placeholders for rigged models behind the same data-driven placement.

## 6. Migration from the current prototype
1. Stand up `src/sim/` (headless) + tests first — no rendering needed to validate the core.
2. Add the Three.js `render/` layer reading sim state (reuse current geometry/materials/camera).
3. Port HUD pieces (`ui/`) — inventory/skills already exist; adapt to read sim state.
4. When the slice reaches feature parity with (and exceeds) the tutorial, move the old
   `index.html`/`src/*.js` tutorial to `prototypes/` then delete after verification.
5. Each step keeps `main` deployable; CI smoke + Vitest gate every merge.
