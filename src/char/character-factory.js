/* =====================================================================
   char/character-factory.js  (<- characterFactory.ts)

   The data layer: a ROSTER of original-IP archetype specs (the parity lineup,
   in the OSRS faceted register), a buildCharacter(THREE, spec) convenience, and
   appearanceToSpec() which maps the live player's appearance + worn gear onto a
   character spec so avatar.js can render the player through the SAME pipeline.
   No geometry here — specs only (data), plus thin builders.
   ===================================================================== */

import { assembleCharacter } from './character.js';

/* ---- ROSTER (original IP; matches the parity reference lineup) ---- */
export const ROSTER = [
  { name: 'Bronze Footman', primary: '#6f5535', secondary: '#8a6b3a', legs: '#3a2e1c', feet: '#2b2118',
    build: 'normal', torsoArmor: true, pauldrons: true, belt: true, weapon: 'sword', accent: '#d8b25a', animation: 'idle' },

  { name: 'Tideglass Mage', primary: '#3f8fa0', secondary: '#2c5f6e', skin: '#b9825b', legs: '#2c5f6e', feet: '#3a2a1c',
    helmet: 'hood', robe: true, weapon: 'staff', weaponOpts: { gem: '#7fe3d6' }, accent: '#7fe3d6', animation: 'cast' },

  { name: 'Moss Knight', primary: '#3a4a2a', secondary: '#4a5a36', legs: '#2a3320', feet: '#241a12',
    build: 'broad', helmet: 'knight', torsoArmor: true, pauldrons: true, spikedPauldrons: true, belt: true,
    cape: '#5b3a7a', weapon: 'mace', accent: '#7a4fa0', animation: 'idle' },

  { name: 'Hollow Rogue', primary: '#22262b', secondary: '#15181c', legs: '#1a1d22', feet: '#0f1114', skin: '#c0936f',
    build: 'slim', helmet: 'hood', belt: true, cape: '#7a2230', weapon: 'dagger', animation: 'walk' },

  { name: 'Stagbone Druid', primary: '#5d7a36', secondary: '#3c2a18', legs: '#4a3a22', feet: '#2b2118', skin: '#b9825b',
    helmet: 'skullmask', belt: true, weapon: 'staff', weaponOpts: { gem: '#cfe0a0', shaft: '#4a3a22' }, accent: '#cfc4a8', animation: 'idle' },

  { name: 'Ashen Crusader', primary: '#dfe2e8', secondary: '#c2cad4', legs: '#9aa0a8', feet: '#5a4632',
    build: 'normal', helmet: 'greathelm', robe: true, weapon: 'spear', accent: '#2f3742', animation: 'idle' },

  { name: 'Saltbeard Corsair', primary: '#26344f', secondary: '#1b2740', legs: '#2a2018', feet: '#3a2a1c', skin: '#b9825b',
    helmet: 'piratehat', belt: true, weapon: 'sword', weaponOpts: { blade: '#d8d8c8', guard: '#d8b25a' }, accent: '#d8b25a', animation: 'idle' },

  { name: 'Mirebrute', primary: '#556b2f', secondary: '#3a3a1f', skin: '#6a994e', legs: '#3a3320', feet: '#241a12',
    build: 'broad', headShape: 'goblin', belt: true, weapon: 'mace', animation: 'walk' },

  { name: 'Pale King Vael', primary: '#3b4a63', secondary: '#5a6b86', legs: '#2a3346', feet: '#1a2030', skin: '#8fb0c0',
    headShape: 'skull', helmet: 'crown', cape: '#2a3346', weapon: 'staff', weaponOpts: { gem: '#9fd8e8', shaft: '#3a4256' }, accent: '#bcdcea', animation: 'cast' },

  { name: 'Dune Wanderer', primary: '#d8cba8', secondary: '#b8a47a', legs: '#7a2238', feet: '#5a4632', skin: '#c79a6a',
    build: 'slim', helmet: 'bandana', belt: true, weapon: 'sword', weaponOpts: { blade: '#cfcfc0' }, accent: '#8a3a2a', animation: 'idle' },

  { name: 'Emberforged Sentinel', primary: '#2a221c', secondary: '#3a2c22', legs: '#221a14', feet: '#1a120c',
    build: 'broad', helmet: 'barbuta', torsoArmor: true, pauldrons: true, spikedPauldrons: true, tassets: '#2a201a',
    weapon: 'sword', weaponOpts: { blade: '#ff7a2a', guard: '#ff9a3a' }, accent: '#ff8a2a', animation: 'idle' },

  { name: 'Reedwater Angler', primary: '#4a5a36', secondary: '#5a4632', legs: '#3a2e1c', feet: '#2b2118', skin: '#c38e70',
    helmet: 'none', belt: true, weapon: 'spear', accent: '#8aa0c0', animation: 'idle' },

  { name: 'Greysage Wizard', primary: '#2c3566', secondary: '#1f2750', legs: '#222a52', feet: '#3a2a1c', skin: '#cda988',
    helmet: 'wizardhat', robe: true, weapon: 'staff', weaponOpts: { gem: '#6fa0ff' }, accent: '#6fa0ff', animation: 'cast' },
];

/* build any roster entry / arbitrary spec. */
export function buildCharacter(THREE, spec) { return assembleCharacter(THREE, spec); }

/* build the whole roster (for the preview / a cast-lineup render). */
export function buildRoster(THREE) { return ROSTER.map((s) => ({ spec: s, char: assembleCharacter(THREE, s) })); }

/* ---- live-player bridge ---------------------------------------------------
   Map the character-creator appearance + worn gear into a character spec, so
   the in-world player renders through this same pipeline (avatar.js Phase 2).
   Conservative: unknown parts fall back to plain adventurer fields. */
export function appearanceToSpec(appearance, worn) {
  const a = appearance || {};
  const parts = a.parts || {};
  const c = a.colours || {};
  const w = worn || {};
  const has = (slot, re) => { const v = w[slot]; const id = v && (v.id || v); return id ? re.test(String(id)) : false; };
  const head = String(parts.head || '');

  const spec = {
    skin: c.skin || '#e8b98e',
    primary: c.torso || '#3f6f8c',
    secondary: c.torso ? c.torso : '#2f3742',
    legs: c.legs || '#2f3742',
    feet: c.feet || '#5a3f28',
    build: a.bodyType === 'B' ? 'broad' : 'normal',
    headShape: 'human',
    helmet: /hood/.test(head) ? 'hood' : 'none',
    robe: /robe/.test(String(parts.torso || '')),
    belt: /jerkin/.test(String(parts.torso || '')),
    weapon: null,
  };

  // worn weapon -> weapon type
  if (has('weapon', /bow/)) spec.weapon = 'bow';
  else if (has('weapon', /staff|wand/)) spec.weapon = 'staff';
  else if (has('weapon', /dagger/)) spec.weapon = 'dagger';
  else if (has('weapon', /spear|harpoon|pike/)) spec.weapon = 'spear';
  else if (has('weapon', /mace|hammer|flail/)) spec.weapon = 'mace';
  else if (has('weapon', /pick/)) spec.weapon = 'pick';
  else if (w.weapon) spec.weapon = 'sword';

  // worn helm/body upgrade the headwear + torso plate
  if (has('head', /.+/) || has('helm', /.+/)) spec.helmet = 'knight';
  if (has('body', /.+/)) { spec.torsoArmor = true; spec.pauldrons = true; }
  if (has('cape', /.+/)) spec.cape = '#9c3030';

  return spec;
}

export default { ROSTER, buildCharacter, buildRoster, appearanceToSpec };
