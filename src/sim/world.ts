// Minimal world/entity store. Expanded in module 2 (World + entities + grid);
// kept intentionally small here so the Tick engine has something concrete to carry.

export interface Entity {
  id: string;
  [key: string]: unknown;
}

export interface World {
  entities: Map<string, Entity>;
}

export function makeWorld(): World {
  return { entities: new Map<string, Entity>() };
}

export function addEntity(w: World, e: Entity): Entity {
  w.entities.set(e.id, e);
  return e;
}

/** Stable serialization (sorted by id) — used by determinism tests and persistence. */
export function serializeWorld(w: World): string {
  const entries = [...w.entities.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return JSON.stringify(entries);
}
