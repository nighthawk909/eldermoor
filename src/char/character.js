/* =====================================================================
   char/character.js  (<- Character.tsx)

   Assembles BodyParts + ArmorParts + WeaponParts into ONE rigged, flat-shaded
   character from a normalized `spec`, and exposes an update(t, anim) animator
   (idle | walk | attack | cast) ported 1:1 from the RTF sample's useFrame.

   The four limb pivots are exposed on the returned rig ({armL,armR,legL,legR})
   so the SAME object can be driven either standalone (call update()) or by the
   live client's player.js walk cycle via window.EMRIG. Pure: THREE passed in.

   assembleCharacter(THREE, spec) -> {
     group,                       // THREE.Group, feet on y=0
     rig: {armL,armR,legL,legR},  // shoulder/hip pivot Groups (rotate .x to swing)
     hands: {L, R},               // hand groups (parent weapons/shields here)
     glow,                        // staff gem mesh (or null) for cast pulse
     update(t, anim)              // advance one frame of the named animation
   }
   ===================================================================== */

import {
  grp, place, rot, box, dark,
  makeHead, makeTorso, makePelvis, makeUpperArm, makeHand, makeUpperLeg, makeFoot,
} from './body-parts.js';
import {
  makeHelmet, makeChestplate, makePauldrons, makeBelt, makeCape, makeRobeSkirt, makeTassets,
} from './armor-parts.js';
import { makeWeapon } from './weapon-parts.js';

/* default spec — a plain adventurer; every field is overridable. */
const DEFAULTS = {
  skin: '#c38e70', primary: '#6f4e37', secondary: '#2f3e46',
  legs: '#2f3e46', feet: '#2b2118', accent: '#d8b25a',
  build: 'normal', headShape: 'human',
  helmet: 'none',                 // none|hood|knight|greathelm|barbuta|wizardhat|piratehat|crown|skullmask|antlers|bandana
  torsoArmor: false, pauldrons: false, spikedPauldrons: false,
  belt: false, cape: null, robe: false, tassets: null,
  weapon: 'sword', weaponOpts: null,
  animation: 'idle',
};

export function assembleCharacter(THREE, specIn) {
  const spec = Object.assign({}, DEFAULTS, specIn || {});
  const root = grp(THREE);

  const w = spec.build === 'broad' ? 0.88 : spec.build === 'slim' ? 0.62 : 0.75;
  const HIP_Y = 0.98, LEG_LEN = 0.80;
  const TORSO_Y = 1.50;
  const SHOULDER_Y = 1.98, SHOULDER_X = w * 0.5 + 0.16;
  const HEAD_Y = 2.34, ARM_LEN = 0.82;

  /* ---- torso + pelvis + head ---- */
  const torso = makeTorso(THREE, { primary: spec.primary, build: spec.build, skin: spec.skin });
  root.add(place(torso, 0, TORSO_Y, 0));
  root.add(place(makePelvis(THREE, { w, legs: spec.legs }), 0, HIP_Y + 0.02, 0));

  const head = makeHead(THREE, { skin: spec.skin, shape: spec.headShape });
  root.add(place(head, 0, HEAD_Y, 0));

  /* ---- arms (shoulder pivots, limb hangs -Y, hand at the end) ---- */
  const armColor = spec.robe || spec.helmet === 'hood' ? spec.primary : spec.primary;
  function buildArm(side) {
    const pivot = grp(THREE); pivot.position.set(side * SHOULDER_X, SHOULDER_Y, 0);
    pivot.add(makeUpperArm(THREE, { len: ARM_LEN, color: armColor }));
    const hand = grp(THREE); hand.position.set(0, -ARM_LEN - 0.06, 0);
    hand.add(makeHand(THREE, { color: spec.skin }));
    pivot.add(hand);
    root.add(pivot);
    return { pivot, hand };
  }
  const aL = buildArm(-1), aR = buildArm(1);

  /* ---- legs (hip pivots) ---- */
  function buildLeg(side) {
    const pivot = grp(THREE); pivot.position.set(side * w * 0.26, HIP_Y, 0);
    pivot.add(makeUpperLeg(THREE, { len: LEG_LEN, color: spec.legs }));
    pivot.add(place(makeFoot(THREE, { color: spec.feet }), 0, -LEG_LEN - 0.06, 0));
    root.add(pivot);
    return pivot;
  }
  const lL = buildLeg(-1), lR = buildLeg(1);

  /* ---- garments + armour overlays (body-fixed) ---- */
  if (spec.robe) root.add(place(makeRobeSkirt(THREE, spec.primary, 1.0), 0, HIP_Y + 0.12, 0));
  if (spec.tassets) root.add(place(makeTassets(THREE, spec.tassets), 0, HIP_Y - 0.10, 0));
  if (spec.torsoArmor) root.add(place(makeChestplate(THREE, spec.secondary, spec.build), 0, TORSO_Y, 0));
  if (spec.pauldrons) root.add(place(makePauldrons(THREE, spec.secondary, spec.build, spec.spikedPauldrons), 0, SHOULDER_Y, 0));
  if (spec.belt) root.add(place(makeBelt(THREE, dark(spec.primary, 0.5), spec.accent), 0, TORSO_Y - 0.52, 0));
  if (spec.cape) root.add(place(makeCape(THREE, spec.cape), 0, SHOULDER_Y - 0.05, -0.24));

  const helm = makeHelmet(THREE, spec.helmet, spec.secondary, spec.accent);
  if (helm) root.add(place(helm, 0, HEAD_Y, 0));

  /* ---- weapon in the right hand ---- */
  let glow = null;
  const wpn = makeWeapon(THREE, spec.weapon, spec.weaponOpts || {});
  if (wpn) { aR.hand.add(wpn); if (wpn.userData && wpn.userData.glow) glow = wpn.userData.glow; }

  const rig = { armL: aL.pivot, armR: aR.pivot, legL: lL, legR: lR };

  /* ---- animator (idle|walk|attack|cast) — matches the RTF sample ---- */
  function update(t, anim) {
    anim = anim || spec.animation;
    if (anim === 'idle') {
      root.position.y = Math.sin(t * 2) * 0.03;
      rig.armL.rotation.x = Math.sin(t * 2) * 0.05;
      rig.armR.rotation.x = -Math.sin(t * 2) * 0.05;
    } else if (anim === 'walk') {
      const swing = Math.sin(t * 6) * 0.55;
      rig.armL.rotation.x = swing; rig.armR.rotation.x = -swing;
      rig.legL.rotation.x = -swing; rig.legR.rotation.x = swing;
      root.position.y = Math.abs(Math.sin(t * 6)) * 0.04;
    } else if (anim === 'attack') {
      rig.armR.rotation.x = -1.2 + Math.sin(t * 10) * 0.5;
    } else if (anim === 'cast') {
      rig.armR.rotation.x = -1.8;
      rig.armR.rotation.z = Math.sin(t * 4) * 0.2;
      if (glow && glow.material) glow.material.emissiveIntensity = 0.4 + (Math.sin(t * 6) + 1) * 0.5;
    }
  }

  return { group: root, rig, hands: { L: aL.hand, R: aR.hand }, glow, update };
}

export default assembleCharacter;
