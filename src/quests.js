// quests.js — DATA-DRIVEN objective chain + golden beacon. The tutorial is the first quest.
// DOM updates (objective banner / finish) are delegated to a listener so this stays UI-agnostic.
import { scene, col } from './engine.js';
import { STN } from './world.js';
const THREE = window.THREE;

export const STEPS = [
  { t: "Talk to the Guide.", tg: 'guide' },
  { t: "Chop the Tree (Woodcutting).", tg: 'tree' },
  { t: "Light a fire with your logs (Firemaking).", tg: 'fire' },
  { t: "Catch a shrimp at the Fishing spot.", tg: 'fish' },
  { t: "Cook your shrimp on the fire (Cooking).", tg: 'cook' },
  { t: "Mine the Copper rock (Mining).", tg: 'rock' },
  { t: "Smith a dagger at the Anvil (Smithing).", tg: 'smith' },
  { t: "Attack the Combat dummy (Melee).", tg: 'melee' },
  { t: "Kill the Giant rat for bones.", tg: 'rat' },
  { t: "Open your Items and bury the Bones (Prayer).", tg: null },
  { t: "Shoot the Archery target (Ranged).", tg: 'archery' },
  { t: "Talk to the Wizard, then cast on the dummy (Magic).", tg: 'magic' },
  { t: "Craft at the Crafting table.", tg: 'craft' },
  { t: "Board the Boat to finish the tutorial!", tg: 'boat' },
];
export let step = 0;

let onStep = () => {};
/** Register a handler: (currentStepIndex) => void. Fires on showStep(). */
export function setStepListener(fn) { onStep = fn; }

export function showStep() { onStep(step); placeBeacon(); }

export function checkStep(key) { // key = skill name OR station id
  const s = STEPS[step]; if (!s) return;
  const map = {
    guide: 'guide', tree: 'Woodcutting', fire: 'Firemaking', fish: 'Fishing', cook: 'Cooking',
    rock: 'Mining', smith: 'Smithing', melee: 'melee', rat: 'rat', archery: 'Ranged', magic: 'Magic', craft: 'Crafting', boat: 'boat',
  };
  const want = s.tg ? map[s.tg] : 'Prayer';
  if (key === want || key === s.tg) { step++; showStep(); }
}

/* beacon over the next target */
export const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.5, 0.5, 8, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: col('#ffe08a'), transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
beacon.visible = false; scene.add(beacon);

export function placeBeacon() {
  const s = STEPS[step];
  if (s && s.tg) { const st = STN.find(x => x.id === s.tg); if (st) { beacon.position.set(st.pos.x, st.pos.y + 4, st.pos.z); beacon.visible = true; return; } }
  beacon.visible = false;
}
