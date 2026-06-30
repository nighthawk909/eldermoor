/* =====================================================================
   char/weapon-parts.js  (<- WeaponParts.tsx)

   Flat-shaded procedural WEAPONS. Each maker returns a THREE.Group authored so
   that its grip sits near local origin (0,0,0) and the weapon extends downward/
   forward, ready to be parented to a hand pivot by Character.js. Pure: THREE is
   passed in.
   ===================================================================== */

import { grp, box, cyl, cone, ico, place, rot, mat, metalMat, dark } from './body-parts.js';

const STEEL = '#b8b8a8';
const WOOD = '#5c4033';
const GOLD = '#d8b25a';

/* SWORD: cross-guard + blade, gripped in the hand, point down-forward. */
function sword(THREE, o) {
  const blade = o.blade || STEEL;
  const g = grp(THREE);
  g.add(place(cyl(THREE, 0.045, 0.05, 0.22, dark(WOOD, 0.8), 6), 0, 0.0, 0));     // grip
  g.add(place(box(THREE, 0.34, 0.07, 0.10, o.guard || GOLD), 0, -0.13, 0));        // cross-guard
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.95, 0.04), metalMat(THREE, blade));
  place(b, 0, -0.62, 0); g.add(b);                                                 // blade
  g.add(place(rot(cone(THREE, 0.07, 0.16, blade, 4), Math.PI, 0, 0), 0, -1.16, 0)); // tip
  return rot(g, 0.35, 0, 0);
}

/* DAGGER: short blade. */
function dagger(THREE, o) {
  const g = grp(THREE);
  g.add(place(cyl(THREE, 0.04, 0.045, 0.16, dark(WOOD, 0.7), 6), 0, 0, 0));
  g.add(place(box(THREE, 0.20, 0.05, 0.08, o.guard || '#7a6a52'), 0, -0.10, 0));
  g.add(place(box(THREE, 0.08, 0.42, 0.03, metalMat(THREE, o.blade || STEEL).color.getHexString ? (o.blade || STEEL) : STEEL), 0, -0.34, 0));
  return rot(g, 0.3, 0, 0);
}

/* STAFF: tall shaft topped with a glowing faceted gem (mage register). */
function staff(THREE, o) {
  const g = grp(THREE);
  const shaft = cyl(THREE, 0.05, 0.05, 1.7, o.shaft || WOOD, 6);
  place(shaft, 0, -0.55, 0); g.add(shaft);
  const gemC = o.gem || '#4cc9f0';
  const gem = ico(THREE, 0.17, gemC, 0);
  gem.material = mat(THREE, gemC, { emissive: new THREE.Color(gemC).convertSRGBToLinear ? new THREE.Color(gemC).convertSRGBToLinear() : new THREE.Color(gemC), emissiveIntensity: 0.6, roughness: 0.3 });
  place(gem, 0, 0.36, 0); g.add(gem);
  // claw prongs cradling the gem
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(place(rot(cone(THREE, 0.04, 0.18, o.shaft || WOOD, 4), 0.5, a, 0), Math.cos(a) * 0.12, 0.24, Math.sin(a) * 0.12));
  }
  g.userData.glow = gem;
  return g;
}

/* MACE / flail: shaft + spiked head. */
function mace(THREE, o) {
  const g = grp(THREE);
  g.add(place(cyl(THREE, 0.045, 0.05, 0.6, dark(WOOD, 0.8), 6), 0, -0.2, 0));
  const head = ico(THREE, 0.16, o.head || '#6b7178', 0);
  place(head, 0, -0.56, 0); g.add(head);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(place(rot(cone(THREE, 0.04, 0.12, o.head || '#6b7178', 4), Math.PI / 2, 0, a), Math.cos(a) * 0.18, -0.56, Math.sin(a) * 0.18));
  }
  return g;
}

/* BOW: a curved limb (approximated by two angled segments) + string. */
function bow(THREE, o) {
  const g = grp(THREE);
  const c = o.wood || '#6b4f2e';
  const top = place(rot(box(THREE, 0.05, 0.6, 0.06, c), 0.32, 0, 0), 0, 0.28, 0.0);
  const bot = place(rot(box(THREE, 0.05, 0.6, 0.06, c), -0.32, 0, 0), 0, -0.28, 0.0);
  g.add(top); g.add(bot);
  g.add(place(box(THREE, 0.02, 1.02, 0.02, '#ded3b0'), 0, 0, 0.12)); // string
  return rot(g, 0, 0, 0);
}

/* SPEAR / harpoon: long shaft + leaf head. */
function spear(THREE, o) {
  const g = grp(THREE);
  g.add(place(cyl(THREE, 0.04, 0.04, 1.9, o.shaft || WOOD, 6), 0, -0.5, 0));
  g.add(place(rot(cone(THREE, 0.09, 0.3, o.head || STEEL, 4), Math.PI, 0, 0), 0, 0.55, 0));
  return g;
}

/* PICKAXE / hatchet for skilling NPCs. */
function pick(THREE, o) {
  const g = grp(THREE);
  g.add(place(cyl(THREE, 0.04, 0.045, 0.7, WOOD, 6), 0, -0.25, 0));
  g.add(place(box(THREE, 0.5, 0.08, 0.10, o.head || '#6b7178'), 0, 0.08, 0.06));
  return g;
}

const MAKERS = { sword, dagger, staff, mace, bow, spear, pick };

/* public: build a weapon group by type. Unknown types -> null (empty hand). */
export function makeWeapon(THREE, type, o) {
  const f = MAKERS[type];
  if (!f) return null;
  return f(THREE, o || {});
}

export const WEAPON_TYPES = Object.keys(MAKERS);
