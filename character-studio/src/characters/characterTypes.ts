/* =====================================================================
   Eldermoor Character Studio — shared data contract.
   Every part component, the factory, and the animation hook agree on
   these types so the whole system compiles as one piece.
   ===================================================================== */

export type AnimationState = 'idle' | 'walk' | 'attack' | 'cast';

export interface Palette {
  skin: string;
  primary: string;   // main cloth / robe / tunic
  secondary: string; // trim / under-layer / accents
  metal: string;     // armour / blades
  accent: string;    // gems, plumes, glow
}

export type WeaponType =
  | 'none' | 'sword' | 'dagger' | 'staff' | 'bow' | 'mace' | 'axe' | 'spear';

export type OffhandType = 'none' | 'shield';

export type HelmetType =
  | 'none' | 'helmet' | 'hood' | 'antlerHood' | 'wizardHat'
  | 'pirateHat' | 'crown' | 'skullFace' | 'desertWrap';

export type ChestType =
  | 'none' | 'plate' | 'robe' | 'leather' | 'tunic';

export interface Equipment {
  helmet: HelmetType;
  chest: ChestType;
  cape: boolean;
  weapon: WeaponType;
  offhand: OffhandType;
}

/** Placeholder combat stats so characters are game-ready. */
export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
}

export interface CharacterConfig {
  id: string;
  name: string;
  archetype: string;
  palette: Palette;
  body: {
    height: number;   // overall scale multiplier (1 = baseline)
    width: number;    // torso/shoulder width multiplier
    headScale: number;
  };
  equipment: Equipment;
  animation: AnimationState;

  /* ---- game-ready fields ---- */
  movementSpeed: number;
  collisionRadius: number;
  stats: Stats;
}

/** Shared prop shape for the simple low-poly part components. */
export interface PartProps {
  color: string;
  /** secondary colour for two-tone parts (trim, soles, etc.) */
  accent?: string;
  /** uniform scale applied on top of the part's intrinsic size */
  scale?: number;
}
