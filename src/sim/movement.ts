// Tile movement: BFS pathfinding (8-dir, no corner-cutting) + a per-tick movement system.
// Headless + deterministic. See docs/modules/Movement.md.
import type { System } from './tick.js';
import { type Grid, type Tile, type Entity, isBlocked } from './world.js';

export interface MoveState {
  path: Tile[];          // remaining tiles to step onto (excludes current tile)
  running: boolean;
  // render-interpolation hints, set by the movement system each tick it moves:
  from?: Tile;
  to?: Tile;
  sinceTick?: number;
}

export interface PathOptions {
  adjacent?: boolean;    // stop on a tile adjacent to the target (interact-walk), not on it
  maxLen?: number;       // safety cap on path length / search
}

const DIRS8: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const KEY = (x: number, y: number) => y * 100000 + x;
const UNKEY = (k: number): Tile => ({ x: k % 100000, y: Math.floor(k / 100000) });

/** Can an entity step from (x,y) by (dx,dy)? Diagonals may not cut a blocked corner. */
export function canStep(grid: Grid, x: number, y: number, dx: number, dy: number): boolean {
  if (isBlocked(grid, x + dx, y + dy)) return false;
  if (dx !== 0 && dy !== 0) {
    if (isBlocked(grid, x + dx, y)) return false; // orthogonal neighbours must be open
    if (isBlocked(grid, x, y + dy)) return false;
  }
  return true;
}

/**
 * Shortest path (BFS) from `from` to `to`, returning the steps to walk (excluding `from`).
 * If the target is unreachable, returns a path to the nearest reachable tile.
 * With `adjacent`, the goal is any tile chebyshev-adjacent to `to` (for interact-walk).
 */
export function findPath(grid: Grid, from: Tile, to: Tile, opts: PathOptions = {}): Tile[] {
  const maxLen = opts.maxLen ?? 200;
  const adjacent = opts.adjacent === true;
  const cheb = (x: number, y: number) => Math.max(Math.abs(x - to.x), Math.abs(y - to.y));
  const isGoal = (x: number, y: number) => (adjacent ? cheb(x, y) === 1 : x === to.x && y === to.y);

  const start = KEY(from.x, from.y);
  const prev = new Map<number, number>();
  const visited = new Set<number>([start]);
  const q: Array<[number, number, number]> = [[from.x, from.y, 0]];
  let head = 0;
  let goal: number | null = null;
  let best = start;
  let bestDist = cheb(from.x, from.y);

  while (head < q.length) {
    const [x, y, d] = q[head++]!;
    if (isGoal(x, y)) { goal = KEY(x, y); break; }
    const dist = cheb(x, y);
    if (dist < bestDist) { bestDist = dist; best = KEY(x, y); }
    if (d >= maxLen) continue;
    for (const [dx, dy] of DIRS8) {
      if (!canStep(grid, x, y, dx, dy)) continue;
      const nk = KEY(x + dx, y + dy);
      if (visited.has(nk)) continue;
      visited.add(nk);
      prev.set(nk, KEY(x, y));
      q.push([x + dx, y + dy, d + 1]);
    }
  }

  const targetKey = goal ?? best;
  if (targetKey === start) return [];
  const path: Tile[] = [];
  let ck = targetKey;
  while (ck !== start) {
    path.push(UNKEY(ck));
    const p = prev.get(ck);
    if (p === undefined) break;
    ck = p;
  }
  return path.reverse();
}

/** Queue a walk for an entity (latest call replaces any current path). */
export function walkTo(e: Entity, grid: Grid, tx: number, ty: number, opts: PathOptions = {}): void {
  if (!e.tile) return;
  const running = (e.move as MoveState | undefined)?.running ?? false;
  e.move = { path: findPath(grid, e.tile, { x: tx, y: ty }, opts), running } satisfies MoveState;
}

/** Per-tick system: advance each moving entity 1 tile (2 if running) along its path. */
export const movementSystem: System = (ctx) => {
  for (const e of ctx.world.entities.values()) {
    const mv = e.move as MoveState | undefined;
    if (!mv || !e.tile || mv.path.length === 0) continue;
    const origin = e.tile;
    const steps = mv.running ? 2 : 1;
    for (let i = 0; i < steps && mv.path.length > 0; i++) {
      const next = mv.path[0]!;
      if (isBlocked(ctx.world.grid, next.x, next.y)) { mv.path.length = 0; break; } // object appeared
      mv.path.shift();
      e.tile = next;
    }
    if (e.tile !== origin) { mv.from = origin; mv.to = e.tile; mv.sinceTick = ctx.tick; }
  }
};
