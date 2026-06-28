// loadMap: turn a pure MapDef into meshes + sim entities. The client supplies a small
// context (how to spawn an entity, how to place decor, tile→world conversion, the RNG) so
// this module stays the single bridge between map data and the running scene.
import type * as THREE from 'three';
import type { Entity, World } from '../sim/world.js';
import { setBlocked } from '../sim/world.js';
import { type MapDef, type SpawnDef, WALKABLE_TERRAIN } from './mapTypes.js';
import { buildAsset } from './assetRegistry.js';
import { makeTerrainPlane, makeBuilding, makeFence } from '../render/structures.js';

export interface LoadCtx {
  world: World;
  /** Add a sim entity + its mesh, optionally blocking the tile. */
  spawn: (e: Entity, mesh: THREE.Object3D, blocked?: boolean) => void;
  /** Place a decor-only mesh (no sim entity) at a tile. */
  place: (mesh: THREE.Object3D, x: number, y: number) => void;
  faceCam: (o: THREE.Object3D) => THREE.Object3D;
  rng: { int: (n: number) => number; next: () => number };
}

function entityFromSpawn(s: SpawnDef): Entity {
  const e: Entity = { id: s.id, type: s.entityType, tile: { x: s.tile.x, y: s.tile.y } };
  if (s.npc !== undefined) e.npc = s.npc;
  if (s.obj !== undefined) e.obj = s.obj;
  if (s.combat !== undefined) e.combat = s.combat;
  if (s.name !== undefined) e.name = s.name;
  if (s.examine !== undefined) e.examine = s.examine;
  if (s.dlg !== undefined) e.dlg = s.dlg;
  return e;
}

export function loadMap(map: MapDef, ctx: LoadCtx): void {
  // terrain: when present, the whole grid starts blocked (ocean) and walkable rects open it.
  if (map.terrain && map.terrain.length) {
    ctx.world.grid.blocked.fill(1);
    for (const t of map.terrain) {
      const plane = makeTerrainPlane(t.kind, t.w, t.h);
      ctx.place(plane, t.x + (t.w - 1) / 2, t.y + (t.h - 1) / 2); // center of the rect
      const walkable = WALKABLE_TERRAIN[t.kind]; // walkable clears collision; water re-blocks (lakes over grass)
      for (let yy = t.y; yy < t.y + t.h; yy++) for (let xx = t.x; xx < t.x + t.w; xx++) setBlocked(ctx.world.grid, xx, yy, !walkable);
    }
  }

  // buildings: floor + walls; block the footprint perimeter except the door
  for (const b of map.buildings ?? []) {
    ctx.place(makeTerrainPlane(b.floor ?? 'floor', b.w, b.h), b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2);
    ctx.place(makeBuilding(b), b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2);
    for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) {
      const onPerim = tx === b.x || tx === b.x + b.w - 1 || ty === b.y || ty === b.y + b.h - 1;
      const isDoor = tx === b.door.x && ty === b.door.y;
      setBlocked(ctx.world.grid, tx, ty, onPerim && !isDoor);
    }
  }

  // fences: posts/rails along a run; block the line
  for (const f of map.fences ?? []) {
    const cx = f.dir === 'h' ? f.x + (f.len - 1) / 2 : f.x;
    const cy = f.dir === 'v' ? f.y + (f.len - 1) / 2 : f.y;
    ctx.place(makeFence(f), cx, cy);
    for (let i = 0; i < f.len; i++) setBlocked(ctx.world.grid, f.dir === 'h' ? f.x + i : f.x, f.dir === 'v' ? f.y + i : f.y, true);
  }

  // explicit collision footprint (e.g. pond) — applied after terrain so it can re-block
  for (const [x, y] of map.blockedTiles ?? []) setBlocked(ctx.world.grid, x, y, true);

  for (const s of map.spawns) {
    let mesh = buildAsset(s.kind);
    if (s.faceCam) mesh = ctx.faceCam(mesh);
    ctx.spawn(entityFromSpawn(s), mesh, s.blocked ?? true);
  }

  for (const d of map.decor ?? []) {
    let mesh = buildAsset(d.kind);
    if (d.faceCam) mesh = ctx.faceCam(mesh);
    if (d.scale !== undefined) mesh.scale.setScalar(d.scale);
    ctx.place(mesh, d.tile.x, d.tile.y);
    if (d.blocked) setBlocked(ctx.world.grid, d.tile.x, d.tile.y, true);
  }

  for (const sc of map.scatter ?? []) {
    const clear = sc.clearRadius ?? 3, lo = sc.minScale ?? 0.8, hi = sc.maxScale ?? 1.3;
    for (let i = 0; i < sc.count; i++) {
      const x = 1 + ctx.rng.int(map.width - 2), y = 1 + ctx.rng.int(map.height - 2);
      if (Math.abs(x - map.start.x) < clear && Math.abs(y - map.start.y) < clear) continue;
      if (ctx.world.grid.blocked[y * map.width + x]) continue;
      const mesh = buildAsset(sc.kind);
      mesh.scale.setScalar(lo + ctx.rng.next() * (hi - lo));
      ctx.place(mesh, x, y);
      if (sc.blocked ?? true) setBlocked(ctx.world.grid, x, y, true);
    }
  }
}
