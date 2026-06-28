// World = authoritative tile grid + entity store. Headless, deterministic.
// See docs/modules/World.md.

export interface Tile {
  x: number;
  y: number;
}

export type EntityType = 'player' | 'npc' | 'object' | 'grounditem';

export interface Entity {
  id: string;
  type?: EntityType;
  tile?: Tile;
  [component: string]: unknown;
}

export interface Grid {
  w: number;
  h: number;
  blocked: Uint8Array; // blocked[y*w + x] = 1 ⇒ impassable
}

export interface World {
  grid: Grid;
  entities: Map<string, Entity>;
}

/* ---------- grid ---------- */
export function makeGrid(w: number, h: number): Grid {
  return { w, h, blocked: new Uint8Array(w * h) };
}
export function inBounds(g: Grid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < g.w && y < g.h;
}
export function isBlocked(g: Grid, x: number, y: number): boolean {
  if (!inBounds(g, x, y)) return true; // can't stand off the grid
  return g.blocked[y * g.w + x] === 1;
}
export function setBlocked(g: Grid, x: number, y: number, blocked: boolean): void {
  if (!inBounds(g, x, y)) return;
  g.blocked[y * g.w + x] = blocked ? 1 : 0;
}

/* ---------- world / entities ---------- */
export function makeWorld(w = 64, h = 64): World {
  return { grid: makeGrid(w, h), entities: new Map<string, Entity>() };
}

export function addEntity(w: World, e: Entity): Entity {
  if (w.entities.has(e.id)) throw new Error(`duplicate entity id: ${e.id}`);
  w.entities.set(e.id, e);
  return e;
}
export function removeEntity(w: World, id: string): boolean {
  return w.entities.delete(id);
}
export function getEntity(w: World, id: string): Entity | undefined {
  return w.entities.get(id);
}
export function entitiesAt(w: World, x: number, y: number): Entity[] {
  const out: Entity[] = [];
  for (const e of w.entities.values()) {
    if (e.tile && e.tile.x === x && e.tile.y === y) out.push(e);
  }
  return out;
}

/** Stable serialization (entities sorted by id) — determinism tests + persistence. */
export function serializeWorld(w: World): string {
  const entries = [...w.entities.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return JSON.stringify(entries);
}
