// world.js — DATA-DRIVEN world: station definitions + placement.
// Adding content = adding an addStation({...}) entry here, not changing the engine.
import { scene, gh, ISLE, TAU } from './engine.js';
import { makeChar, makeRat, plate } from './characters.js';
import {
  makeTree, makeRock, makeFire, makeFishSpot, makeFurnace, makeAnvil,
  makeDummy, makeTarget, makeAltar, makeTable, makeBoat,
} from './props.js';
const THREE = window.THREE;

export const STN = []; // { id, pos, obj, kind, skill, xp, give, need, dur, verb, ... }

export function addStation(s) {
  const y = gh(s.pos.x, s.pos.z); s.obj.position.set(s.pos.x, y, s.pos.z);
  if (s.rot) s.obj.rotation.y = s.rot; scene.add(s.obj);
  if (s.label) s.obj.add(plate(s.label, s.color || '#e7c64f', s.labelY || 2.4));
  s.pos.y = y; STN.push(s); return s;
}

function stationsNear(x, z) { return STN.some(s => Math.hypot(s.pos.x - x, s.pos.z - z) < 4); }
function makeTrees(n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, r = 4 + Math.random() * (ISLE - 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r; if (stationsNear(x, z)) continue;
    const t = makeTree(); t.position.set(x, gh(x, z), z); t.scale.setScalar(0.8 + Math.random() * 0.5); scene.add(t);
  }
}

/** Build all stations + scatter trees. Call once after listeners are wired. */
export function buildWorld() {
  addStation({ id: 'guide', pos: { x: 3, z: -4 }, obj: makeChar({ tunic: '#3a6b3a', hair: '#caa', beard: '#999' }), kind: 'npc', label: 'Guide',
    dlg: ["Welcome to Eldermoor! I'll show you the ropes.", "Tap the ground to walk. Tap things to use them.", "Follow the golden beacons. First — chop that tree to the northwest."] });
  addStation({ id: 'tree', pos: { x: -8, z: -8 }, obj: makeTree(), kind: 'gather', label: 'Tree', color: '#9fe09f', labelY: 2.6,
    skill: 'Woodcutting', xp: 25, give: 'Logs', dur: 1600, verb: 'chop' });
  addStation({ id: 'fire', pos: { x: -5, z: -9 }, obj: new THREE.Group(), kind: 'firemaking', label: 'Clearing', color: '#ffd98a', labelY: 1.2,
    skill: 'Firemaking', xp: 40, need: 'Logs', dur: 1800, verb: 'light a fire at' });
  addStation({ id: 'fish', pos: { x: 12, z: 7 }, obj: makeFishSpot(), kind: 'gather', label: 'Fishing spot', color: '#bfe9ff', labelY: 1.6,
    skill: 'Fishing', xp: 30, give: 'Raw shrimp', dur: 1800, verb: 'fish' });
  addStation({ id: 'cook', pos: { x: 9, z: 9 }, obj: makeFire(true), kind: 'cook', label: 'Cooking fire', color: '#ffd98a', labelY: 1.6,
    skill: 'Cooking', xp: 30, need: 'Raw shrimp', give: 'Shrimp', dur: 1500, verb: 'cook on' });
  addStation({ id: 'rock', pos: { x: -12, z: 6 }, obj: makeRock(), kind: 'gather', label: 'Copper rock', color: '#e6c06a', labelY: 1.4,
    skill: 'Mining', xp: 35, give: 'Ore', dur: 1900, verb: 'mine' });
  addStation({ id: 'smith', pos: { x: -14, z: 2 }, obj: makeAnvil(), kind: 'use', label: 'Anvil', color: '#cfd6de', labelY: 1.6,
    skill: 'Smithing', xp: 50, need: 'Ore', give: 'Bronze dagger', dur: 1900, verb: 'smith at' });
  addStation({ id: 'furnace', pos: { x: -16, z: 3.5 }, obj: makeFurnace(), kind: 'deco' });
  addStation({ id: 'rat', pos: { x: 9, z: -10 }, obj: makeRat(), kind: 'combat', label: 'Giant rat', color: '#e0584c', labelY: 1.0,
    hp: 8, maxhp: 8, drop: 'Bones' });
  addStation({ id: 'archery', pos: { x: -3, z: 13 }, obj: makeTarget(), kind: 'ranged', label: 'Archery target', color: '#9fe0ff', labelY: 1.9,
    skill: 'Ranged', xp: 30, dur: 1100, verb: 'shoot' });
  addStation({ id: 'wizard', pos: { x: 13, z: -3 }, obj: makeChar({ tunic: '#2e3a8c', sleeve: '#2e3a8c', hat: '#2e3a8c', skin: '#e8b98e', beard: '#ddd' }), kind: 'npc', label: 'Wizard', color: '#9fb0ff',
    dlg: ["Magic flows through the runes.", "Cast a spell on the practice target beside me!"] });
  addStation({ id: 'magic', pos: { x: 15, z: -5 }, obj: makeDummy(), kind: 'magic', label: 'Practice dummy', color: '#c9a0ff', labelY: 1.9,
    skill: 'Magic', xp: 35, dur: 1200, verb: 'cast Wind Strike on' });
  addStation({ id: 'melee', pos: { x: 7, z: -12 }, obj: makeDummy(), kind: 'melee', label: 'Combat dummy', color: '#ffcf6e', labelY: 1.9,
    dur: 900, verb: 'attack' });
  addStation({ id: 'altar', pos: { x: 0, z: -15 }, obj: makeAltar(), kind: 'pray', label: 'Altar', color: '#bfe9ff', labelY: 1.6,
    skill: 'Prayer', xp: 20, dur: 1500, verb: 'pray at' });
  addStation({ id: 'craft', pos: { x: -6, z: -2 }, obj: makeTable(), kind: 'use', label: 'Crafting table', color: '#e0c89a', labelY: 1.4,
    skill: 'Crafting', xp: 25, give: 'Leather pouch', dur: 1500, verb: 'craft at' });
  addStation({ id: 'boat', pos: { x: 1, z: 20 }, obj: makeBoat(), kind: 'finish', label: 'Boat to mainland', color: '#9fe09f', labelY: 2.2, rot: Math.PI });
  makeTrees(14);
}
