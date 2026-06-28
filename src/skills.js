// skills.js — DOM-FREE skill data + XP math + state.
// UI feedback is decoupled via a listener (setXpListener) so this module never touches the DOM.

export const SKILLS = [
  ['Attack', '⚔️'], ['Strength', '💪'], ['Defence', '🛡️'], ['Hitpoints', '❤️'], ['Ranged', '🏹'],
  ['Magic', '✨'], ['Prayer', '🙏'], ['Woodcutting', '🪓'], ['Firemaking', '🔥'], ['Fishing', '🎣'],
  ['Cooking', '🍳'], ['Mining', '⛏️'], ['Smithing', '🔨'], ['Crafting', '🧵'],
];
export const ICON = Object.fromEntries(SKILLS);

// real OSRS-style xp curve, levels 1–99 (precomputed)
const xpTable = (() => { let a = [0], p = 0; for (let l = 1; l < 99; l++) { p += Math.floor(l + 300 * Math.pow(2, l / 7)); a.push(Math.floor(p / 4)); } return a; })();
export function levelFromXp(xp) { let l = 1; for (let i = 1; i < 99; i++) { if (xp >= xpTable[i]) l = i + 1; else break; } return Math.min(l, 99); }

export const skill = {}; SKILLS.forEach(([s]) => skill[s] = { xp: 0 });
skill.Hitpoints.xp = xpTable[9]; // start HP 10 like OSRS

let onXp = () => {};
/** Register a UI handler: (skillName, amount, {before, after, leveled}) => void */
export function setXpListener(fn) { onXp = fn; }

/** Award XP. Pure state mutation + notifies the listener. Returns true on level-up. */
export function addXp(s, amt) {
  const before = levelFromXp(skill[s].xp);
  skill[s].xp += amt;
  const after = levelFromXp(skill[s].xp);
  onXp(s, amt, { before, after, leveled: after > before });
  return after > before;
}

export function totalLevel() { return SKILLS.reduce((a, [s]) => a + levelFromXp(skill[s].xp), 0); }
