// Asset registry: maps an AssetKind id → a factory that builds its mesh. The ONLY place
// that knows which factory backs which id. loadMap() and any spawner go through this, so
// adding a new asset = add a factory + register it here + add its id to ASSET_KINDS.
import * as THREE from 'three';
import { makeHero, makeNPC, NPC_PRESETS, makeRat } from '../render/characters.js';
import { makeTree, makeRock, makeFire, makePond } from '../render/props.js';
import { ASSET_KINDS, type AssetKind } from './mapTypes.js';

export type AssetFactory = () => THREE.Object3D;

export const assetRegistry: Record<AssetKind, AssetFactory> = {
  hero: () => makeHero(),
  guide: () => makeNPC(NPC_PRESETS.guide as never),
  wizard: () => makeNPC(NPC_PRESETS.wizard as never),
  merchant: () => makeNPC(NPC_PRESETS.merchant as never),
  rat: () => makeRat(),
  tree: () => makeTree(),
  rock: () => makeRock(),
  fire: () => makeFire(),
  pond: () => makePond(),
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
