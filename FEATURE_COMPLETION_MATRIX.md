# Eldermoor — Feature Completion Matrix

Master status board for every system. A row is **Done** only when its acceptance criteria pass,
automated tests pass, AND it's been manually QA'd in a real browser. Statuses:
`Not Started` · `Spec` (spec written) · `In Progress` · `Partial` (works but incomplete — see note) ·
`Blocked` · `Done (YYYY-MM-DD, tests: N)`.

_Last updated: 2026-06-28._

> **REPRIORITIZED 2026-06-28 (Josh):** depth over width, OSRS-parity Definition of Done
> (`docs/PARITY_STANDARD.md`), **CHARACTERS FIRST.** The engine modules below are tested *building
> blocks* — NOT finished player features. A player feature is Done only when its `docs/parity/<id>.md`
> is 100% checked (enforced by `npm run parity`). See `docs/PROCESS_INFRASTRUCTURE.md`.

## Player features — parity-gated (the real Definition of Done)
| Feature | Parity checklist | Status |
|---------|------------------|--------|
| Characters (hero + NPCs + monsters match Blender asset) `parity:characters` | `docs/parity/characters.md` | **ACTIVE — building now** |
| Inventory UX (open/use/wield/eat/drop/bury/examine/use-on/drag) `parity:inventory` | `docs/parity/inventory.md` | Not Started |
| Equipment UX (open/view/remove/wield + right-click/long-press) `parity:equipment` | `docs/parity/equipment.md` | Not Started |
| Skilling UX (Woodcutting/Firemaking interactions) `parity:skilling` | _to author_ | Not Started |
| Combat UX (attack options, hits, loot pickup) `parity:combat` | _to author_ | Not Started |
| Banking UX `parity:banking` | _to author_ | Not Started |

## Engine primitives (test-gated building blocks — not player features)

## Phase 1 — Single-player vertical slice (ACTIVE)
| # | Module | Spec | Status | Notes / next step |
|---|--------|------|--------|-------------------|
| 1 | Tick engine | `docs/modules/Tick.md` ✅ | **Done (2026-06-28, tests: 7)** | Headless deterministic engine (`src/sim/tick.ts`). 7 Vitest tests = all 6 acceptance criteria + auto-pause edge case. Browser-verified via `tick-harness.html`: 0.6s cadence, Pause freezes, Step +1. |
| 2 | World + entities + tile grid | `docs/modules/World.md` ✅ | **Done (2026-06-28, tests: 7)** | Grid w/ passability, entity store (id/type/tile/components), `entitiesAt`, stable serialize. RNG landed in #1. 7 Vitest tests. Headless data module — on-screen QA arrives with Movement (#3). |
| 3 | Movement (tiles, pathing) | `docs/modules/Movement.md` ✅ | **Done (2026-06-28, tests: 7)** | BFS pathfinding (8-dir, no corner-cut), tick-stepped walk/run, collision, render-interp hints. 7 Vitest tests (all 7 AC). **Browser-verified** in `movement-harness`: real tap-to-walk routes around walls, never enters a blocked tile, arrives at target (mid-detour screenshot confirmed). |
| 4 | Items + Inventory (28) | `docs/modules/Inventory.md` ✅ | **Done (2026-06-28, tests: 7)** | Item data table + 28-slot container: stack/non-stack add/remove/count/move/examine. 7 Vitest tests (28 total), typecheck clean. Headless — UI QA when the inventory panel is wired to the sim. |
| 5 | Equipment | `docs/modules/Equipment.md` ✅ | **Done (2026-06-28, tests: 7)** | Slots + equip/unequip (clean swap, full-inventory guard), `totalBonuses` aggregation. 7 Vitest tests (35 total), typecheck clean. Headless — UI QA with the equipment panel. |
| 6 | Item/World interaction + context menu | `docs/modules/Interaction.md` ✅ | Spec | Default action + option menu; item-on-object. **Captures the reported mobile bugs as binding criteria: reliable touch tap-to-talk + long-press menu.** Needs the client render+input layer. |
| 7 | Skills + Woodcutting (gather) | _to author_ | Not Started | |
| 8 | Firemaking (process) | _to author_ | Not Started | |
| 9 | Melee combat | _to author_ | Not Started | hits, death, loot, respawn. |
| 10 | Banking | _to author_ | Not Started | |
| 11 | Persistence (save/load) | _to author_ | Not Started | |
| 12 | Debug admin panel | _to author_ | Not Started | |
| 13 | Automated test suite (Vitest+CI) | _cross-cutting_ | In Progress | TS+Vite+Vitest scaffolded; `tests/sim/tick.test.ts` (7) passing; CI runs `npm test` + `typecheck` + smoke. Grows with each module. |

## Phase 2+ — full system catalogue (Not Started; tracked, not skipped)
| System | Phase | Status |
|--------|-------|--------|
| Player Core (stats, combat level, run energy, weight, death/respawn, status timers) | 2 | Not Started |
| Player State Machine | 1–2 | Not Started (slice subset in modules 1/9) |
| Event/Script Engine | 2 | Not Started |
| Skills framework — full 23 skills | 2–4 | Not Started |
| Combat — full (triangle, ranged/magic, special attacks, LoS, PID, multi/single) | 2 | Not Started |
| Magic system | 2 | Not Started |
| Prayer system | 2 | Not Started |
| World Interaction (doors/ladders/altars/furnaces/banks/portals/…) | 2 | Not Started |
| Movement — full (run energy, follow, agility shortcuts, transport) | 2 | Not Started |
| NPC AI (wander/aggro/combat/dialogue/shops/followers) | 2 | Not Started |
| World Object System (states/timers/respawns/ownership) | 2 | Not Started |
| Loot/Drop tables (rare/unique/shared, ground ownership/despawn, collection log) | 3 | Not Started |
| Shops | 3 | Not Started |
| Trading (two-screen confirm) | 3 | Not Started |
| Economy / Grand Exchange | 3 | Not Started |
| Chat (public/private/clan/group, filters, quick chat) | 3 | Not Started |
| Social (friends/ignore/clan/hiscores/examine/duel) | 3 | Not Started |
| Quest Engine (states/dialogue/cutscenes/journal/flags) | 4 | Not Started |
| Achievements (diaries/combat tasks/collection log/music) | 4 | Not Started |
| Random Events | 4 | Not Started |
| Farming Timers | 4 | Not Started |
| Minigame Framework | 4 | Not Started |
| Instance Engine | 4 | Not Started |
| Player-Owned House | 4 | Not Started |
| Collection systems (pets/log/music/emotes/cosmetics) | 4 | Not Started |
| Death & Recovery (gravestones/protection/HC/PvP) | 2 | Not Started |
| UI system (all interfaces) | 1–5 | Partial (inventory/skills/chat exist from prototype; rebuild onto sim) |
| Interface Settings | 5 | Not Started |
| Chat System | 3 | Not Started |
| World Server (worlds/regions/instancing/chunk loading/sync) | 2 | Not Started |
| Security (login/auth/bank pin/sessions/anti-bot/anti-cheat) | 2–5 | Not Started |
| Character art upgrade (realtime model → match render; then glTF rigged) | 5 | Not Started (decided: in-code first, glTF later) |

## Carried-over client UX (from BACKLOG.md, fold into Phase 1/5)
| Item | Status |
|------|--------|
| Chat log readability | Done (2026-06-28) |
| HUD buttons placement | Done (2026-06-28) |
| Skill names full (no truncation) | Done (2026-06-28) |
| Action timer ms/seconds bug | Done (2026-06-27) — note: prototype; sim rebuild supersedes |
| Forgiving click targeting | Done (2026-06-27) — prototype |
| Context menu / long-press / visible loot | Superseded → Phase 1 modules 6 & 9 (built on the sim) |
