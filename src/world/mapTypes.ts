// Data-driven map layer — PURE types + the asset-kind source of truth (no Three.js here,
// so this stays unit-testable). A MapDef fully describes a region: its ground, the player
// start, every NPC/object spawn, fixed decor, and procedural scatter. The render layer
// (assetRegistry + loadMap) turns this data into meshes + sim entities. Author once, place
// by data — no hand-placed geometry in the client. See docs/modules/World.md.

/** Every renderable asset id. The registry MUST cover all of these (enforced by a test). */
export const ASSET_KINDS = [
  // characters
  'hero', 'guide', 'wizard', 'merchant', 'guard', 'townsfolk_m', 'townsfolk_f', 'skiller',
  // monsters
  'rat', 'spider', 'goblin', 'imp', 'cow', 'brute',
  // trees (variants)
  'tree', 'tree_oak', 'tree_willow', 'tree_pine', 'tree_dead',
  // rocks (ore variants)
  'rock', 'rock_copper', 'rock_tin', 'rock_iron', 'rock_coal', 'rock_clay',
  // skill stations
  'anvil', 'furnace', 'range', 'altar', 'bank_booth', 'fishing_spot',
  // decor / props
  'fire', 'pond',
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export type EntityKind = 'player' | 'npc' | 'object' | 'grounditem';

/** Terrain paint + collision. A rect of tiles of one kind. Walkable kinds clear collision;
 *  water blocks. When a map declares ANY terrain, all tiles start blocked (ocean) and only
 *  walkable terrain rects open them up — so the island's shape is exactly its land rects. */
export type TerrainKind = 'grass' | 'path' | 'sand' | 'floor' | 'water';
export const WALKABLE_TERRAIN: Record<TerrainKind, boolean> = {
  grass: true, path: true, sand: true, floor: true, water: false,
};
export interface TerrainRect { kind: TerrainKind; x: number; y: number; w: number; h: number; }

/** A straight run of fence: `len` tiles from (x,y) along the axis. Blocks its line of tiles. */
export interface FenceDef { x: number; y: number; len: number; dir: 'h' | 'v'; color?: string; }

/** A rectangular building: walls block the footprint perimeter except the single `door` tile;
 *  the interior is a walkable floor. Optional roof + colors. */
export interface BuildingDef {
  x: number; y: number; w: number; h: number;
  door: { x: number; y: number };
  wall?: string;
  roof?: string;
  floor?: TerrainKind;
}

/** A spawn that becomes BOTH a mesh (via the registry) and a sim Entity. */
export interface SpawnDef {
  id: string;
  kind: AssetKind;
  tile: { x: number; y: number };
  entityType: EntityKind;
  blocked?: boolean;   // occupies its tile (default true for spawns)
  faceCam?: boolean;   // rotate to face the player/camera (NPCs)
  // sim-entity components (mirror world.Entity, all optional)
  npc?: string;
  obj?: string;
  combat?: boolean;
  name?: string;
  examine?: string;
  dlg?: string[];
}

/** Fixed, hand-placed decoration — a mesh only, no sim entity (e.g. a pond). */
export interface DecorDef {
  kind: AssetKind;
  tile: { x: number; y: number };
  blocked?: boolean;
  scale?: number;
  faceCam?: boolean;
}

/** Procedural scatter of one kind (e.g. background trees). Deterministic via the seeded RNG. */
export interface ScatterDef {
  kind: AssetKind;
  count: number;
  blocked?: boolean;     // default true
  minScale?: number;     // default 0.8
  maxScale?: number;     // default 1.3
  clearRadius?: number;  // keep this many tiles clear around the player start (default 3)
}

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  groundColor: string;       // base plane (ocean when terrain is used)
  start: { x: number; y: number };
  terrain?: TerrainRect[];   // painted + collision regions; presence ⇒ ocean-by-default
  fences?: FenceDef[];
  buildings?: BuildingDef[];
  spawns: SpawnDef[];
  decor?: DecorDef[];
  scatter?: ScatterDef[];
  /** Extra impassable tiles not tied to a single mesh (e.g. a pond footprint). */
  blockedTiles?: [number, number][];
}
