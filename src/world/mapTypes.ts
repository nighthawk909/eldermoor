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
  // decor / props
  'fire', 'pond',
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export type EntityKind = 'player' | 'npc' | 'object' | 'grounditem';

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
  groundColor: string;
  start: { x: number; y: number };
  spawns: SpawnDef[];
  decor?: DecorDef[];
  scatter?: ScatterDef[];
  /** Extra impassable tiles not tied to a single mesh (e.g. a pond footprint). */
  blockedTiles?: [number, number][];
}
