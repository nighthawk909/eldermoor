/* =====================================================================
   Earthy, muted, OSRS-era palettes — one per archetype. All original
   colour choices (no ripped assets), tuned for flat-shaded low-poly.
   ===================================================================== */
import type { Palette } from './characterTypes';

export const PALETTES: Record<string, Palette> = {
  bronzeWarrior: { skin: '#c38e70', primary: '#8a5a32', secondary: '#5c3a1e', metal: '#b08968', accent: '#d8b25a' },
  hoodedRogue:   { skin: '#b9825b', primary: '#2b2b30', secondary: '#1c1c20', metal: '#6e6e76', accent: '#7a2c2c' },
  blueMage:      { skin: '#b9825b', primary: '#263859', secondary: '#1a2740', metal: '#9aa7c7', accent: '#4cc9f0' },
  greenRanger:   { skin: '#caa07c', primary: '#54632c', secondary: '#3a3a1f', metal: '#8a7b4f', accent: '#9fb35a' },
  whiteCleric:   { skin: '#c9a07e', primary: '#d8d2c4', secondary: '#b7b0a0', metal: '#c9ccd4', accent: '#3a557a' },
  skeletonFighter:{ skin: '#c7c9b6', primary: '#5a6470', secondary: '#3c4450', metal: '#9aa0aa', accent: '#8fb0c0' },
  goblinBrute:   { skin: '#6a994e', primary: '#556b2f', secondary: '#3a3a1f', metal: '#7a6a4a', accent: '#9c3030' },
  redNomad:      { skin: '#b07a4e', primary: '#a8453a', secondary: '#e0cda0', metal: '#8a6a44', accent: '#d8b25a' },
  darkKnight:    { skin: '#9a7a5e', primary: '#23201c', secondary: '#15130f', metal: '#3a342c', accent: '#e07b2c' },
  pirate:        { skin: '#b9825b', primary: '#2a3340', secondary: '#1c2630', metal: '#9aa0aa', accent: '#d8b25a' },
  frostShaman:   { skin: '#8fb6c0', primary: '#46566a', secondary: '#2e3a48', metal: '#9fb6c4', accent: '#bfe6f0' },
  druid:         { skin: '#caa07c', primary: '#5a6e34', secondary: '#6a4a2c', metal: '#8a7b4f', accent: '#d8c98a' },
};

export const DEFAULT_PALETTE: Palette = PALETTES.bronzeWarrior;
