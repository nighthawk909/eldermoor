# Eldermoor — Build Roadmap

Phases are sequential. Do not start a phase until the prior phase's matrix rows are `Done`
(tests pass + manual QA). Within a phase, build **one module at a time** per `AI_Agent_Instructions.md`.

## Phase 1 — Playable single-player vertical slice  ← ACTIVE
Order of build (each: spec → tests-with-impl → manual QA → matrix update):
1. **Tick engine** (`modules/Tick.md`) — foundation; everything depends on it.
2. **World + entities + RNG** — tile grid, entity store, seeded PRNG.
3. **Movement** (`modules/Movement.md`) — pathfinding, walk/run, collision.
4. **Items + Inventory** — item table, 28-slot container, add/remove/move/examine/drop.
5. **Equipment** — slots, equip/unequip, bonus aggregation.
6. **Item interactions** — default action + option menu; item-on-object; ground items.
7. **Skills framework + Woodcutting (gather)** — XP curve, success rolls, resource yield, object depletion.
8. **Firemaking (process)** — item-on-item/object, consumes Logs, fire object + timer.
9. **Melee combat** — accuracy/damage rolls, HP, death, loot to ground, respawn.
10. **Banking** — bank object, deposit/withdraw, stacking, persists.
11. **Persistence** — save/load full state; reload restores exactly.
12. **Debug admin panel** — spawn/set/teleport/tick-step/inspect.
**Exit criteria:** all 12 rows `Done`; full slice playable in-browser; `npm test` + CI green.

**Live-deploy switch (DECIDED 2026-06-28):** flip `index.html` to the new tile/tick client and
Vercel to `vite build` **as soon as movement + one gathering skill work** — do NOT wait for full
parity with the old tutorial. The old tutorial moves to `prototypes/` at that point. So the live URL
will show the in-progress slice early (acceptable per the owner).

## Phase 2 — Core MMO systems
Server-authoritative tick (move sim server-side), networking (intents + state sync), accounts/login,
more skills (Mining/Smithing/Fishing/Cooking + the gather/process pairs), Magic/Prayer/Ranged,
NPC AI depth, world objects breadth, death & recovery, chunked world loading.

## Phase 3 — Economy & social
Shops, player trading (two-screen confirm), Grand Exchange, chat (public/private/clan), friends/ignore,
loot/drop tables breadth, coin/item sinks.

## Phase 4 — Content tools
Quest engine + journal, dialogue trees, achievements/collection log, farming timers, minigame
framework, instance engine, random events, world-object/quest scripting tools.

## Phase 5 — Polish & testing
Character-art upgrade (realtime model to match the Blender hero; then Blender→glTF rigged pipeline),
interaction polish backlog, settings, audio, performance, balance, security/anti-cheat hardening,
broad automated + manual QA passes.

> Note: the existing `BACKLOG.md` (chat readability, HUD, context menu, loot visuals, character art)
> is folded into Phases 1 (interaction/loot as slice features) and 5 (art/polish). It stays as a
> client-UX scratch list; `FEATURE_COMPLETION_MATRIX.md` is the master for systems.
