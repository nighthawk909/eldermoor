// Asset registry: maps an AssetKind id → a factory that builds its mesh. The ONLY place
// that knows which factory backs which id. loadMap() and any spawner go through this, so
// adding a new asset = add a factory + register it here + add its id to ASSET_KINDS.
import * as THREE from 'three';
import { makeHero, makeNPC, NPC_PRESETS, makeRat, makeBrute, makeSpider, makeGoblin, makeImp, makeCow } from '../render/characters.js';
import { makeTree, makeRock, makeFire, makePond, makeAnvil, makeFurnace, makeRange, makeAltar, makeBankBooth, makeFishingSpot } from '../render/props.js';
import { ASSET_KINDS, type AssetKind } from './mapTypes.js';

export type AssetFactory = () => THREE.Object3D;
const npc = (preset: string): AssetFactory => () => makeNPC(NPC_PRESETS[preset] as never);

export const assetRegistry: Record<AssetKind, AssetFactory> = {
  // characters
  hero: () => makeHero(),
  guide: npc('guide'), wizard: npc('wizard'), merchant: npc('merchant'),
  guard: npc('guard'), townsfolk_m: npc('townsfolk_m'), townsfolk_f: npc('townsfolk_f'), skiller: npc('skiller'),
  // monsters
  rat: () => makeRat(), spider: () => makeSpider(), goblin: () => makeGoblin(), imp: () => makeImp(), cow: () => makeCow(), brute: () => makeBrute(),
  // trees
  tree: () => makeTree('oak'), tree_oak: () => makeTree('oak'), tree_willow: () => makeTree('willow'), tree_pine: () => makeTree('pine'), tree_dead: () => makeTree('dead'),
  // rocks
  rock: () => makeRock('copper'), rock_copper: () => makeRock('copper'), rock_tin: () => makeRock('tin'), rock_iron: () => makeRock('iron'), rock_coal: () => makeRock('coal'), rock_clay: () => makeRock('clay'),
  // skill stations
  anvil: () => makeAnvil(), furnace: () => makeFurnace(), range: () => makeRange(), altar: () => makeAltar(), bank_booth: () => makeBankBooth(), fishing_spot: () => makeFishingSpot(),
  // decor
  fire: () => makeFire(), pond: () => makePond(),
};

/** Build a fresh mesh for a kind. Throws on an unregistered id (fail fast at boundaries). */
export function buildAsset(kind: AssetKind): THREE.Object3D {
  const factory = assetRegistry[kind];
  if (!factory) throw new Error(`asset registry has no factory for kind "${kind}"`);
  return factory();
}

/** The kinds the registry actually covers — used by tests to assert parity with ASSET_KINDS. */
export const REGISTERED_KINDS = Object.keys(assetRegistry) as AssetKind[];
export { ASSET_KINDS };
