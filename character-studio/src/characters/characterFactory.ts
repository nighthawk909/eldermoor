/* =====================================================================
   Character factory — turns an archetype id + seed into a full
   CharacterConfig. Deterministic: same seed → same roster.
   ===================================================================== */
import type { AnimationState, CharacterConfig, Equipment, Stats } from './characterTypes';
import { PALETTES, DEFAULT_PALETTE } from './palettes';
import { makeRng, jitter, type Rng } from '../utils/random';

interface ArchetypeDef {
  name: string;
  paletteKey: string;
  body: { height: number; width: number; headScale: number };
  equipment: Equipment;
  animation: AnimationState;
  movementSpeed: number;
  collisionRadius: number;
  stats: Stats;
}

const E = (e: Partial<Equipment>): Equipment => ({
  helmet: 'none', chest: 'none', cape: false, weapon: 'none', offhand: 'none', ...e,
});

const S = (hp: number, attack: number, defense: number, magic: number, speed: number): Stats =>
  ({ hp, attack, defense, magic, speed });

/** The 12 archetypes, in display order. */
export const ARCHETYPES: Record<string, ArchetypeDef> = {
  bronzeWarrior: {
    name: 'Bronze Warrior', paletteKey: 'bronzeWarrior',
    body: { height: 1.04, width: 1.15, headScale: 1.0 },
    equipment: E({ helmet: 'helmet', chest: 'plate', weapon: 'sword', offhand: 'shield' }),
    animation: 'idle', movementSpeed: 2.6, collisionRadius: 0.55, stats: S(110, 18, 16, 2, 6),
  },
  hoodedRogue: {
    name: 'Hooded Rogue', paletteKey: 'hoodedRogue',
    body: { height: 1.0, width: 0.95, headScale: 0.96 },
    equipment: E({ helmet: 'hood', chest: 'leather', weapon: 'dagger' }),
    animation: 'idle', movementSpeed: 3.4, collisionRadius: 0.45, stats: S(80, 15, 9, 3, 10),
  },
  blueMage: {
    name: 'Blue Mage', paletteKey: 'blueMage',
    body: { height: 1.0, width: 0.96, headScale: 1.0 },
    equipment: E({ helmet: 'wizardHat', chest: 'robe', weapon: 'staff', cape: true }),
    animation: 'cast', movementSpeed: 2.4, collisionRadius: 0.5, stats: S(70, 5, 7, 20, 6),
  },
  greenRanger: {
    name: 'Green Ranger', paletteKey: 'greenRanger',
    body: { height: 1.02, width: 1.0, headScale: 0.98 },
    equipment: E({ helmet: 'hood', chest: 'leather', weapon: 'bow' }),
    animation: 'idle', movementSpeed: 3.2, collisionRadius: 0.48, stats: S(85, 16, 10, 4, 9),
  },
  whiteCleric: {
    name: 'White Cleric', paletteKey: 'whiteCleric',
    body: { height: 1.0, width: 1.0, headScale: 1.0 },
    equipment: E({ chest: 'robe', weapon: 'mace', cape: true }),
    animation: 'idle', movementSpeed: 2.6, collisionRadius: 0.5, stats: S(95, 12, 12, 14, 6),
  },
  skeletonFighter: {
    name: 'Skeleton Fighter', paletteKey: 'skeletonFighter',
    body: { height: 1.0, width: 0.92, headScale: 1.0 },
    equipment: E({ helmet: 'skullFace', chest: 'leather', weapon: 'sword', offhand: 'shield' }),
    animation: 'walk', movementSpeed: 2.8, collisionRadius: 0.48, stats: S(60, 14, 8, 2, 7),
  },
  goblinBrute: {
    name: 'Goblin Brute', paletteKey: 'goblinBrute',
    body: { height: 0.9, width: 1.25, headScale: 1.15 },
    equipment: E({ chest: 'leather', weapon: 'mace' }),
    animation: 'walk', movementSpeed: 2.5, collisionRadius: 0.55, stats: S(120, 17, 11, 1, 5),
  },
  redNomad: {
    name: 'Red Desert Nomad', paletteKey: 'redNomad',
    body: { height: 1.02, width: 1.0, headScale: 1.0 },
    equipment: E({ helmet: 'desertWrap', chest: 'robe', weapon: 'spear', cape: true }),
    animation: 'idle', movementSpeed: 3.0, collisionRadius: 0.5, stats: S(85, 14, 10, 6, 8),
  },
  darkKnight: {
    name: 'Dark Knight', paletteKey: 'darkKnight',
    body: { height: 1.08, width: 1.2, headScale: 1.0 },
    equipment: E({ helmet: 'helmet', chest: 'plate', weapon: 'axe', offhand: 'shield', cape: true }),
    animation: 'idle', movementSpeed: 2.4, collisionRadius: 0.58, stats: S(140, 20, 20, 4, 5),
  },
  pirate: {
    name: 'Pirate Swordsman', paletteKey: 'pirate',
    body: { height: 1.03, width: 1.08, headScale: 1.0 },
    equipment: E({ helmet: 'pirateHat', chest: 'leather', weapon: 'sword' }),
    animation: 'idle', movementSpeed: 3.0, collisionRadius: 0.5, stats: S(95, 16, 11, 3, 8),
  },
  frostShaman: {
    name: 'Frost Shaman', paletteKey: 'frostShaman',
    body: { height: 1.0, width: 0.98, headScale: 1.02 },
    equipment: E({ helmet: 'crown', chest: 'robe', weapon: 'staff', cape: true }),
    animation: 'cast', movementSpeed: 2.4, collisionRadius: 0.5, stats: S(80, 6, 9, 18, 6),
  },
  druid: {
    name: 'Druid', paletteKey: 'druid',
    body: { height: 1.02, width: 1.02, headScale: 1.0 },
    equipment: E({ helmet: 'antlerHood', chest: 'robe', weapon: 'staff' }),
    animation: 'cast', movementSpeed: 2.6, collisionRadius: 0.5, stats: S(90, 9, 11, 16, 7),
  },
};

export const ARCHETYPE_ORDER: string[] = Object.keys(ARCHETYPES);

export function createCharacter(archetype: string, seed: number): CharacterConfig {
  const def = ARCHETYPES[archetype] ?? ARCHETYPES.bronzeWarrior;
  const rng: Rng = makeRng(seed + hashString(archetype));
  const palette = PALETTES[def.paletteKey] ?? DEFAULT_PALETTE;
  return {
    id: `${archetype}-${seed}`,
    name: def.name,
    archetype,
    palette,
    body: {
      height: def.body.height * jitter(rng, 0.04),
      width: def.body.width * jitter(rng, 0.05),
      headScale: def.body.headScale * jitter(rng, 0.05),
    },
    equipment: { ...def.equipment },
    animation: def.animation,
    movementSpeed: def.movementSpeed,
    collisionRadius: def.collisionRadius,
    stats: { ...def.stats },
  };
}

/** The full 12-character sheet for a given seed. */
export function createCharacterSheet(seed = 1): CharacterConfig[] {
  return ARCHETYPE_ORDER.map((a, i) => createCharacter(a, seed * 1000 + i));
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
