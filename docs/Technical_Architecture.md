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

## 5. Repo layout (target)
```
index.html            # thin shell: canvas + HUD mount + module entry
src/
  sim/                # headless, testable simulation (no DOM/THREE)
    tick.ts  world.ts  entities.ts  movement.ts  skills.ts  combat.ts
    inventory.ts  equipment.ts  banking.ts  items.ts  rng.ts  persistence.ts
  data/               # content tables (items, objects, npcs, skills, drop tables)
  render/             # Three.js view layer (reads sim, interpolates, draws)
  ui/                 # HUD/DOM (inventory, equipment, skills, bank, chat, debug panel)
  main.ts             # wires sim + render + ui + input(intents)
tests/                # Vitest specs mirroring src/sim/*
docs/ … FEATURE_COMPLETION_MATRIX.md
assets/pipeline/      # Blender asset pipeline (unchanged)
```

## 6. Migration from the current prototype
1. Stand up `src/sim/` (headless) + tests first — no rendering needed to validate the core.
2. Add the Three.js `render/` layer reading sim state (reuse current geometry/materials/camera).
3. Port HUD pieces (`ui/`) — inventory/skills already exist; adapt to read sim state.
4. When the slice reaches feature parity with (and exceeds) the tutorial, move the old
   `index.html`/`src/*.js` tutorial to `prototypes/` then delete after verification.
5. Each step keeps `main` deployable; CI smoke + Vitest gate every merge.
