# Module: World + Entities + Tile Grid

**Phase 1 · build #2.** The state every system reads/writes: a tile grid + an entity store.
Headless, deterministic, testable. Depends on nothing (Tick carries a `World` but doesn't define it).

## Purpose
Provide the authoritative world container: a 2D **tile grid** with per-tile passability, and an
**entity store** (players/NPCs/objects/ground-items) addressable by id and by tile, with stable
serialization for determinism tests + persistence.

## Data model
```ts
interface Tile { x: number; y: number; }                 // integer grid coords
interface Grid { w: number; h: number; blocked: Uint8Array; } // blocked[y*w+x] = 1 ⇒ impassable
type EntityType = 'player' | 'npc' | 'object' | 'grounditem';
interface Entity { id: string; type?: EntityType; tile?: Tile; [component: string]: unknown; }
interface World { grid: Grid; entities: Map<string, Entity>; }
```
- Components live as well-known keys on the entity (e.g. `tile`, later `stats`, `inventory`).
- `makeWorld(w=64, h=64)` builds an empty grid + entity map (defaults keep Tick/its tests working).

## API
```
makeGrid(w,h): Grid
inBounds(g,x,y): boolean
isBlocked(g,x,y): boolean          // out-of-bounds counts as blocked
setBlocked(g,x,y,b): void
makeWorld(w?,h?): World
addEntity(w,e): Entity             // throws on duplicate id
removeEntity(w,id): boolean
getEntity(w,id): Entity | undefined
entitiesAt(w,x,y): Entity[]        // entities whose .tile matches
serializeWorld(w): string         // stable (entities sorted by id) — for determinism + saves
```

## Edge cases
- Out-of-bounds tile queries: `inBounds` false; `isBlocked` returns **true** (can't stand off-grid).
- Duplicate entity id on `addEntity`: throw (ids are unique).
- `removeEntity` of a missing id: returns false, no throw.
- `entitiesAt` for an entity with no `tile`: excluded.
- `blocked` index math must be correct at all edges (corners, last row/col).
- Serialization must be **order-independent of insertion** (sorted by id) so two runs match.

## Acceptance criteria (testable, headless)
1. `makeWorld(10,8)` → grid 10×8, all tiles passable, 0 entities.
2. `setBlocked` then `isBlocked` reflects the change at the exact tile; neighbors unaffected.
3. `inBounds`/`isBlocked` treat out-of-bounds as not-in-bounds / blocked.
4. `addEntity` stores + returns; duplicate id throws; `getEntity` retrieves; `removeEntity` removes (true) and missing returns false.
5. `entitiesAt(x,y)` returns exactly the entities on that tile (and none without a tile).
6. `serializeWorld` is identical for two worlds built with the same entities added in different orders.

## Manual QA checklist
- N/A for direct human play (pure headless data structure). Visible verification arrives in
  **Movement (#3)** once entities render on the grid. Tracked, not skipped: this module's gate is
  its automated tests; the grid/entities are exercised on-screen by #3.

## Tests (Vitest) — `tests/sim/world.test.ts`
Cover all 6 acceptance criteria; deterministic; no DOM.
