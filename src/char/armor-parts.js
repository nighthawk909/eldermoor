/* =====================================================================
   char/armor-parts.js  (<- ArmorParts.tsx)

   Flat-shaded procedural ARMOUR + headwear + garments that decorate an
   assembled body. Each maker returns a Group/Mesh in body-local space;
   Character.js places them onto the right anchor (head, torso, back, hips).
   Pure: THREE passed in.
   ===================================================================== */

import { grp, box, cyl, cone, ico, place, rot, mat, metalMat, dark } from './body-parts.js';

/* ---- HEADWEAR -------------------------------------------------------------
   makeHelmet(THREE, type, color, accent) -> Group anchored at the head centre.
   types: none | hood | knight | greathelm | barbuta | wizardhat | piratehat |
          crown | skullmask | antlers | bandana */
export function makeHelmet(THREE, type, color, accent) {
  color = color || '#c2cad4';
  accent = accent || '#4361ee';
  const g = grp(THREE);

  switch (type) {
    case 'hood': {
      // cowl that rises behind + drapes the shoulders
      g.add(place(box(THREE, 0.46, 0.40, 0.46, color), 0, 0.10, -0.04));
      g.add(place(rot(box(THREE, 0.44, 0.30, 0.20, color), 0.5, 0, 0), 0, 0.22, -0.18));
      g.add(place(box(THREE, 0.40, 0.16, 0.04, dark(color, 0.7)), 0, -0.05, 0.22)); // face shadow lip
      break;
    }
    case 'knight': {
      g.add(place(box(THREE, 0.40, 0.34, 0.40, metalMat(THREE, color).color ? color : color), 0, 0.14, 0));
      g.children[0].material = metalMat(THREE, color);
      g.add(place(box(THREE, 0.42, 0.10, 0.30, dark(color, 0.7)), 0, 0.02, 0.10)); // visor slit band
      g.add(place(box(THREE, 0.06, 0.20, 0.06, accent), 0, 0.42, 0));              // crest spike
      break;
    }
    case 'greathelm': {  // crusader flat-top helm
      const h = box(THREE, 0.42, 0.46, 0.42, color); h.material = metalMat(THREE, color);
      g.add(place(h, 0, 0.16, 0));
      g.add(place(box(THREE, 0.06, 0.30, 0.44, dark(color, 0.6)), 0, 0.18, 0));    // cross slit (vertical)
      g.add(place(box(THREE, 0.44, 0.06, 0.30, dark(color, 0.6)), 0, 0.20, 0.07)); // cross slit (horizontal)
      break;
    }
    case 'barbuta': {    // assassin / rogue open-face helm + nasal
      const h = box(THREE, 0.40, 0.40, 0.40, color); h.material = metalMat(THREE, color);
      g.add(place(h, 0, 0.16, 0));
      g.add(place(box(THREE, 0.06, 0.26, 0.06, dark(color, 0.5)), 0, 0.06, 0.22)); // nasal bar
      break;
    }
    case 'wizardhat': {
      g.add(place(cone(THREE, 0.34, 0.7, color, 7), 0, 0.55, 0));
      g.add(place(cyl(THREE, 0.40, 0.42, 0.06, dark(color, 0.8), 10), 0, 0.18, 0)); // brim
      g.add(place(ico(THREE, 0.07, accent, 0), 0, 0.86, 0));                        // tip jewel
      break;
    }
    case 'piratehat': {
      g.add(place(rot(box(THREE, 0.62, 0.10, 0.30, color), 0, 0, 0.04), 0, 0.30, 0));   // bicorne body
      g.add(place(box(THREE, 0.66, 0.06, 0.14, color), 0, 0.34, 0));
      g.add(place(box(THREE, 0.10, 0.08, 0.02, '#e8e2cf'), 0, 0.34, 0.16));            // skull badge
      break;
    }
    case 'crown': {
      g.add(place(cyl(THREE, 0.30, 0.32, 0.16, color, 8), 0, 0.30, 0));
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(place(cone(THREE, 0.05, 0.16, color, 4), Math.cos(a) * 0.27, 0.44, Math.sin(a) * 0.27)); }
      g.add(place(ico(THREE, 0.06, accent, 0), 0, 0.30, 0.30));
      break;
    }
    case 'skullmask': {  // stag / beast skull worn as a mask
      g.add(place(box(THREE, 0.34, 0.34, 0.20, '#e8e2cf'), 0, 0.12, 0.18));
      g.add(place(box(THREE, 0.14, 0.16, 0.18, '#e8e2cf'), 0, 0.02, 0.30)); // muzzle
      // antlers
      const antler = (s) => { const a = grp(THREE); a.add(rot(cyl(THREE, 0.03, 0.04, 0.4, '#cfc4a8', 5), 0, 0, s * 0.5)); a.add(place(rot(cyl(THREE, 0.02, 0.03, 0.22, '#cfc4a8', 5), 0, 0, s * 1.1), s * 0.16, 0.18, 0)); a.add(place(rot(cyl(THREE, 0.02, 0.03, 0.2, '#cfc4a8', 5), 0, 0, -s * 0.2), s * 0.02, 0.22, 0)); return place(a, s * 0.18, 0.34, 0); };
      g.add(antler(1)); g.add(antler(-1));
      break;
    }
    case 'antlers': {
      const antler = (s) => place(rot(cyl(THREE, 0.03, 0.05, 0.5, '#cfc4a8', 5), 0, 0, s * 0.4), s * 0.18, 0.4, 0);
      g.add(antler(1)); g.add(antler(-1));
      break;
    }
    case 'bandana': {
      g.add(place(box(THREE, 0.42, 0.16, 0.42, color), 0, 0.18, 0));
      g.add(place(box(THREE, 0.40, 0.20, 0.06, color), 0, -0.02, 0.20)); // face wrap
      break;
    }
    default: return null; // 'none'
  }
  return g;
}

/* ---- TORSO ARMOUR --------------------------------------------------------- */

/* chest plate that sits proud of the tunic. */
export function makeChestplate(THREE, color, build) {
  const w = build === 'broad' ? 0.92 : build === 'slim' ? 0.66 : 0.80;
  const g = grp(THREE);
  const plate = box(THREE, w, 0.66, 0.44, color); plate.material = metalMat(THREE, color);
  g.add(place(plate, 0, 0.18, 0.01));
  g.add(place(box(THREE, w * 0.5, 0.30, 0.46, dark(color, 0.82)), 0, 0.24, 0.02)); // sternum ridge
  return g;
}

/* shoulder pauldrons (a pair), optionally spiked. */
export function makePauldrons(THREE, color, build, spiked) {
  const w = build === 'broad' ? 0.5 : 0.42;
  const g = grp(THREE);
  const one = (s) => {
    const p = grp(THREE);
    const dome = ico(THREE, 0.20, color, 0); dome.material = metalMat(THREE, color); dome.scale.set(1.1, 0.8, 1.1);
    p.add(dome);
    if (spiked) p.add(place(rot(cone(THREE, 0.06, 0.22, dark(color, 0.7), 4), 0, 0, -s * 0.5), 0, 0.16, 0));
    return place(p, s * w, 0, 0);
  };
  g.add(one(1)); g.add(one(-1));
  return g;
}

/* belt across the waist. */
export function makeBelt(THREE, color, buckle) {
  const g = grp(THREE);
  g.add(place(box(THREE, 0.82, 0.12, 0.42, color || '#3a2a1c'), 0, 0, 0));
  g.add(place(box(THREE, 0.14, 0.14, 0.06, buckle || '#d8b25a'), 0, 0, 0.22));
  return g;
}

/* ---- GARMENTS ------------------------------------------------------------- */

/* CAPE: a draped back panel (slight taper), authored to hang from the shoulders. */
export function makeCape(THREE, color) {
  const g = grp(THREE);
  const panel = box(THREE, 0.7, 1.25, 0.06, color);
  place(panel, 0, -0.35, 0); g.add(panel);
  g.add(place(box(THREE, 0.78, 0.12, 0.10, dark(color, 0.8)), 0, 0.24, 0)); // collar/clasp bar
  return g;
}

/* ROBE SKIRT: a tapered drape over the legs (mage/monk). */
export function makeRobeSkirt(THREE, color, len) {
  len = len || 0.95;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.55, len, 8), mat(THREE, color));
  return place(m, 0, -len / 2, 0);
}

/* TASSET / mail skirt (armoured hip guard). */
export function makeTassets(THREE, color) {
  const g = grp(THREE);
  const t = box(THREE, 0.62, 0.42, 0.40, color); t.material = metalMat(THREE, color);
  g.add(t);
  return g;
}
