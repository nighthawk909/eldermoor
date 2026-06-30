/* =====================================================================
   char/body-parts.js  (<- BodyParts.tsx)

   Flat-shaded primitive BODY pieces + the shared procedural toolkit.
   "Dumb" geometry only: no rigging, no animation, no per-archetype logic
   (Character assembles + rigs these; ArmorParts/WeaponParts decorate them).

   Ported from the React-Three-Fiber sample to vanilla ES + Three r128. THREE
   is PASSED IN (not read off window) so every part maker stays pure + unit
   testable and works in both the live client (window.THREE) and the preview.
   ===================================================================== */

/* ---- shared toolkit (exported; ArmorParts/WeaponParts/Character reuse) ---- */

/* sRGB hex -> linear THREE.Color, matching engine.js col() so the preview and
   the in-game grade agree. */
export function col(THREE, hex) {
  const c = new THREE.Color(hex);
  return c.convertSRGBToLinear ? c.convertSRGBToLinear() : c;
}
export function mat(THREE, hex, opts) {
  return new THREE.MeshStandardMaterial(Object.assign(
    { color: col(THREE, hex), flatShading: true, roughness: 0.82, metalness: 0.0 },
    opts || {}));
}
/* a faintly metallic variant for steel/gold armour + blades */
export function metalMat(THREE, hex) { return mat(THREE, hex, { roughness: 0.45, metalness: 0.55 }); }

export function grp(THREE) { return new THREE.Group(); }
export function place(o, x, y, z) { o.position.set(x, y, z); return o; }
export function rot(o, x, y, z) { o.rotation.set(x, y, z); return o; }

export function box(THREE, w, h, d, hex, opts) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(THREE, hex, opts)); }
export function cyl(THREE, rt, rb, h, hex, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 6), mat(THREE, hex)); }
export function cone(THREE, r, h, hex, seg) { return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 5), mat(THREE, hex)); }
export function ico(THREE, r, hex, detail) { return new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail || 0), mat(THREE, hex)); }
export function dodeca(THREE, r, hex) { return new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(THREE, hex)); }

/* darken a hex (shadowed undersides / trims) */
export function dark(hex, f) {
  f = f == null ? 0.6 : f;
  try {
    const n = parseInt(String(hex).slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = (r * f) | 0; g = (g * f) | 0; b = (b * f) | 0;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  } catch (e) { return '#222222'; }
}

/* ---- body pieces ---------------------------------------------------------
   All pieces are authored in a Y-up space with the character standing on y=0,
   the same "Josh scale" as the RTF sample (~2.6 units tall). Character.js does
   the placement + rigging; these just return geometry centred on their own
   local origin so they can be positioned freely. */

/* HEAD: a faceted dodecahedron (the OSRS angular skull read), squashed +
   given a brow and nose wedge. shape: 'human' | 'goblin' | 'skull' | 'beast'. */
export function makeHead(THREE, o) {
  o = o || {};
  const skin = o.skin || '#c38e70';
  const shape = o.shape || 'human';
  const g = grp(THREE);

  const skull = dodeca(THREE, 0.34, skin);
  skull.scale.set(0.92, 1.08, 0.94);
  g.add(skull);

  if (shape === 'skull') {
    skull.scale.set(0.9, 1.0, 0.95);
    // hollow eye sockets + jaw
    g.add(place(box(THREE, 0.10, 0.10, 0.06, dark(skin, 0.35)), -0.12, 0.04, 0.27));
    g.add(place(box(THREE, 0.10, 0.10, 0.06, dark(skin, 0.35)), 0.12, 0.04, 0.27));
    g.add(place(box(THREE, 0.26, 0.10, 0.16, skin), 0, -0.22, 0.16)); // jaw
  } else {
    // brow ridge + nose wedge for a readable face
    g.add(place(box(THREE, 0.30, 0.06, 0.06, dark(skin, 0.78)), 0, 0.10, 0.28)); // brow
    g.add(place(box(THREE, 0.09, 0.10, 0.12, skin), 0, -0.02, 0.30));            // nose
    g.add(place(box(THREE, 0.05, 0.04, 0.04, '#241812'), -0.10, 0.02, 0.29));    // eye
    g.add(place(box(THREE, 0.05, 0.04, 0.04, '#241812'), 0.10, 0.02, 0.29));     // eye
  }

  if (shape === 'goblin') {
    skull.scale.set(1.04, 0.9, 0.96);
    const ear = (s) => place(rot(cone(THREE, 0.08, 0.26, skin, 4), 0, 0, s * 0.9), s * 0.32, 0.06, -0.02);
    g.add(ear(1)); g.add(ear(-1));
  }
  if (shape === 'beast') {
    // elongated muzzle (deer/stag skull mask wearers, etc.)
    g.add(place(box(THREE, 0.18, 0.16, 0.22, skin), 0, -0.10, 0.30));
  }
  return g;
}

/* TORSO: a tapered trunk (wider chest -> narrower waist) so it is not a flat
   box. primary = garment colour. build: 'normal' | 'slim' | 'broad'. */
export function makeTorso(THREE, o) {
  o = o || {};
  const primary = o.primary || '#6f4e37';
  const build = o.build || 'normal';
  const w = build === 'broad' ? 0.74 : build === 'slim' ? 0.50 : 0.60;
  const g = grp(THREE);
  // chest (upper) -> waist (lower, tapered): a leaner two-band trunk
  g.add(place(box(THREE, w, 0.58, 0.34, primary), 0, 0.30, 0));         // chest
  g.add(place(box(THREE, w * 0.74, 0.56, 0.30, primary), 0, -0.26, 0)); // waist taper
  // collar + neck
  g.add(place(cyl(THREE, 0.12, 0.15, 0.18, o.skin || '#c38e70', 6), 0, 0.66, 0));
  g.userData.shoulderW = w;
  return g;
}

/* PELVIS / hip block — anchors the legs and any skirt/tassets. */
export function makePelvis(THREE, o) {
  o = o || {};
  return place(box(THREE, (o.w || 0.6) * 0.9, 0.26, 0.36, o.primary || dark(o.legs || '#2f3e46', 0.8)), 0, 0, 0);
}

/* UPPER ARM segment (a tapered limb). Returned centred so Character can hang it
   from a shoulder pivot. */
export function makeUpperArm(THREE, o) {
  o = o || {};
  const len = o.len || 0.92;
  const m = box(THREE, 0.15, len, 0.16, o.color || '#6f4e37');
  m.position.y = -len / 2;
  const g = grp(THREE); g.add(m);
  g.userData.len = len;
  return g;
}

/* HAND — a faceted little block. */
export function makeHand(THREE, o) {
  o = o || {};
  return box(THREE, 0.17, 0.16, 0.17, o.color || '#c38e70');
}

/* UPPER LEG (tapered). */
export function makeUpperLeg(THREE, o) {
  o = o || {};
  const len = o.len || 1.02;
  const m = box(THREE, 0.19, len, 0.21, o.color || '#2f3e46');
  m.position.y = -len / 2;
  const g = grp(THREE); g.add(m);
  g.userData.len = len;
  return g;
}

/* FOOT / boot — a forward-pointing wedge so it reads as a shaped boot, not a
   cube. heel + toe. */
export function makeFoot(THREE, o) {
  o = o || {};
  const c = o.color || '#2b2118';
  const g = grp(THREE);
  g.add(place(box(THREE, 0.21, 0.16, 0.28, c), 0, 0, 0.02));      // foot block
  g.add(place(box(THREE, 0.19, 0.09, 0.16, c), 0, -0.04, 0.20));  // raised toe
  return g;
}
