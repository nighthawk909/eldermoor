# Module: Movement (tile-based)

**Phase 1 · build #3.** Grid movement resolved on the tick. Depends on Tick + World.

## Purpose
Move entities across a tile grid: click-to-path, walk 1 tile/tick (run 2 tiles/tick), collision
against blocked tiles/objects, with smooth render interpolation between tiles.

## Data model
```ts
interface Tile { x:number; y:number; }                 // integer grid coords
interface Grid { w:number; h:number; blocked:Uint8Array; } // blocked[y*w+x] = 1 if impassable
// components on a movable entity:
interface Pos { tile: Tile; }                            // authoritative tile
interface MoveState { path: Tile[]; running: boolean; runEnergy?: number; }
interface RenderPos { from: Tile; to: Tile; t: number; } // for interpolation only (render layer)
```

## Behavior
- **Intent** `walk(targetTile)` → compute a path (BFS for the slice; A* later) from the entity's
  current tile to the nearest reachable tile to the target; store in `MoveState.path`.
- **Per tick (movement system):** pop 1 tile from `path` (2 if running); set `Pos.tile`; the system
  records `from`/`to` for the render layer to interpolate over the next 600ms.
- **Collision:** blocked tiles and object footprints are impassable; pathing routes around them; a
  walk to an unreachable tile goes to the closest reachable tile.
- **Interaction targets:** walking to interact with an object/NPC paths to an adjacent tile, not onto it.
- **Render:** interpolates world position `lerp(from, to, t)` where `t = elapsedSinceTick/600`.

## Edge cases
- Target tile == current tile → no movement, no error.
- Target blocked/unreachable → path to nearest reachable adjacent tile; if none, do nothing + (later) "Can't reach that".
- New `walk` intent mid-path → replace the path (latest click wins), keep current tile authoritative.
- Diagonal: allowed only if not cutting a blocked corner (define: OSRS-style — diagonal blocked if either orthogonal neighbor is blocked).
- Running with 0 run energy → falls back to walking (run energy is Phase 2; slice: running flag only).
- Entity removed mid-path → path discarded safely.
- Very long path → cap path length (e.g. 200) to bound compute.

## Acceptance criteria (testable, headless)
1. `walk` to an open tile 5 east → after 5 ticks the entity is on that tile; intermediate tiles correct.
2. Running: same target reached in ceil(5/2)=3 ticks.
3. Blocked wall between start and target → entity routes around (path contains no blocked tiles) and arrives.
4. Unreachable target (walled off) → entity ends on the nearest reachable tile; never enters a blocked tile.
5. Interact-walk to an object stops on an **adjacent** tile, not the object's tile.
6. New `walk` mid-path overrides the old path next tick.
7. Diagonal corner-cut is rejected (no passing through a blocked corner).

## Manual QA checklist (browser)
- [ ] Tap a far tile → character paths there one tile per tick (visibly steps on tick cadence, smoothly interpolated).
- [ ] Tap across a wall/obstacle → routes around it, doesn't clip through.
- [ ] Tap an object → walks adjacent and stops (then interaction fires — module 6).
- [ ] Rapidly tap new destinations → latest tap wins, no stutter/teleport.
- [ ] (If run toggled) moves ~2× speed.

## Tests (Vitest) — `tests/sim/movement.test.ts`
Grid fixtures (open field, wall, sealed room) covering all 7 acceptance criteria; deterministic.
