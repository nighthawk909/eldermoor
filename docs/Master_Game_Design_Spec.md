# Eldermoor — Master Game Design Spec

> **Source of truth for *what* the game is.** Build only what is defined here and in the linked
> module specs. Do not implement from memory or assumption. If something isn't specified, write
> the spec first (or open a tracked TODO) — never silently invent or skip.

## 0. What this is
An original, **OSRS-inspired** instant-play browser MMORPG. We recreate *gameplay patterns*
(tile movement, tick-based actions, skills, combat, inventory, banking, economy, quests, NPCs),
**not** Jagex/OSRS content. See `../CLAUDE.md` §2 + the IP rules below — they are binding.

## 1. IP rules (binding)
- **No copied content:** no Jagex/OSRS names, art, maps, quests, lore, item names, NPC names,
  UI graphics, music, or proprietary assets.
- Recreate only **general mechanics**. All names/art/world are original Eldermoor IP.
- When in doubt, rename and redesign. "Inspired by," never "replica."

## 2. Architecture pillars (the "secret sauce", restated as our rules)
1. **Everything advances on a fixed 0.6s game tick** (see `modules/Tick.md`). Render is decoupled
   and interpolates between ticks for smoothness.
2. **Everything in the world is an entity** — players, NPCs, world objects, ground items,
   projectiles — with explicit state (components).
3. **Everything is event-driven** — clicks/intents enqueue actions; the tick loop resolves them.
4. **Everything is stateful and persistent** — player, skills, inventory, bank, objects, quests.
5. **A player state machine** arbitrates conflicting actions (idle/move/skill/combat/bank/dialog…).
See `Technical_Architecture.md` for how these are implemented.

## 3. Module catalogue (the full system list)
Every system from the project brief is tracked in `../FEATURE_COMPLETION_MATRIX.md`. Each gets its
own spec in `docs/modules/<System>.md` **authored just-in-time, immediately before it is built**
(writing all 30+ detailed specs up front would be assumption-driven; the matrix + acceptance
criteria below are the contract, the per-module spec is the detail). Catalogue (grouped):

- **Core:** Tick, Movement, Player Core, Player State Machine, Event/Script Engine, Persistence.
- **Items & containers:** Items, Inventory, Equipment, Banking, Loot/Ground Items.
- **Skills:** Skills framework + (slice) Woodcutting (gather), Firemaking (process); later: the full
  23-skill set.
- **Combat:** Combat Engine (melee first), Magic, Prayer, Ranged.
- **World:** World Object System, World Interaction, NPC AI.
- **Economy/social:** Shops, Trading, Economy/GE, Chat, Social, Friends/Ignore/Clan.
- **Content:** Quest Engine, Achievements, Random Events, Farming Timers, Minigames, Instances, POH.
- **Meta:** UI, Interface Settings, Loot/Drop Tables, Death & Recovery, World Server, Security.

## 4. Initial milestone — Single-player Vertical Slice (Phase 1)
**Goal:** prove the core architecture end-to-end, single-player, local. No networking.

### In scope (must all pass acceptance criteria + tests before Phase 1 is "done")
1. **Tick engine** — fixed 600ms tick; deterministic; pause/step in debug.
2. **Tile movement** — grid world, click-to-path (BFS/A*), 1 tile/tick walk (2/tick run), collision.
3. **Inventory** — 28 slots, stackable/non-stackable, add/remove/move, examine, drop.
4. **Equipment** — slots, equip/unequip from inventory, bonuses aggregate onto the player.
5. **Item interactions** — left-click default action + right-click/long-press option menu;
   item-on-object (e.g. use Tinderbox on Logs), item drop → ground item.
6. **One gathering skill — Woodcutting** — chop a Tree object → roll success/tick → yield Logs + XP;
   tree depletes/respawns.
7. **One processing skill — Firemaking** — use Tinderbox on Logs → fire object, consumes Logs + XP.
8. **Basic melee combat** — attack an NPC; tick-timed hits; accuracy + damage rolls; HP; death;
   loot drop to ground; respawn.
9. **Banking** — bank object opens bank; deposit/withdraw; stacks; persists.
10. **Save/load persistence** — full player+world state to JSON (localStorage); reload restores exactly.
11. **Debug admin panel** — spawn item, set skill level, teleport, toggle/step tick, inspect entity state.
12. **Automated tests** — unit/integration tests for every system above (Vitest); CI gate.

### Out of scope for Phase 1 (tracked, not skipped)
Multiplayer/server, GE/trading, magic/prayer/ranged, quests, most skills, achievements, POH, etc.
Each remains a tracked row in the completion matrix with status `Not Started`.

## 5. Acceptance criteria (global rules)
- **"Do not proceed until tests pass."** A feature is complete only when: its module spec's
  acceptance checklist passes, its automated tests pass, AND it has been **manually QA'd in the
  browser like a player** (real clicks, screenshots) — not just via a console call.
- Every completed feature is recorded in `FEATURE_COMPLETION_MATRIX.md` with date + test status.
- Incomplete items get a tracked TODO with **reason · blocker · next step** (brief inline in the
  matrix or the module spec). Never silently skip.
- **Working systems over visual polish** (per directive). The Three.js character-art upgrade and
  the interaction-polish backlog are deferred behind the Phase-1 systems.

## 6. Relationship to the existing prototype
The current real-time click-to-move Three.js tutorial (`index.html` + `src/`) is **superseded** as the
game core — it is not tile/tick and cannot satisfy this spec. Plan (see `Technical_Architecture.md`
§"Migration"): keep the Three.js **render layer + asset/style work**, replace the **movement/action
core** with the tile+tick simulation. The current tutorial is retained as a reference build under
`prototypes/` until the slice reaches parity, then removed. Nothing is deleted before its replacement
is verified.
