/* =====================================================================
   geometry.ts — custom low-poly geometry for the mage. NO BoxGeometry.

   Everything is built from two primitives of our own:
     - loft(rings)  : stitch a stack of polygon cross-sections into a solid
     - ngon / arc   : angular (faceted) polygon + open-arc profiles
   On top of those we expose the named builders the brief asks for:
     createTaperedPrismGeometry, createRobeGeometry, createHoodGeometry,
     createSleeveGeometry, createBootGeometry, createShoulderGeometry,
     createStaffGeometry, createCrystalGeometry  (+ a hand + torso helper).

   All geometry is meant to be rendered flat-shaded (faceted). We keep the
   facet counts low (5-8 sides) so silhouettes read angular, not smooth.
   ===================================================================== */
import * as THREE from 'three';

export type V2 = [number, number];
export type Ring = { y: number; pts: V2[] };

/* an angular closed polygon scaled to half-extents (rx,rz). */
export function ngon(sides: number, rx: number, rz: number, rot = 0): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    pts.push([Math.cos(a) * rx, Math.sin(a) * rz]);
  }
  return pts;
}

/* an OPEN arc profile (for the hood's open face). sweep<2PI leaves a gap. */
export function arc(sides: number, rx: number, rz: number, start: number, sweep: number): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= sides; i++) {
    const a = start + sweep * (i / sides);
    pts.push([Math.cos(a) * rx, Math.sin(a) * rz]);
  }
  return pts;
}

/* loft: connect consecutive rings (equal point counts) into a shell/solid.
   closed=false leaves the profile open (a strip) for cowls. */
export function loft(
  rings: Ring[],
  opts: { closed?: boolean; capTop?: boolean; capBottom?: boolean } = {},
): THREE.BufferGeometry {
  const closed = opts.closed !== false;
  const n = rings[0].pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  rings.forEach((r) => r.pts.forEach(([x, z]) => pos.push(x, r.y, z)));
  const vi = (r: number, p: number) => r * n + p;
  const last = closed ? n : n - 1;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let p = 0; p < last; p++) {
      const q = closed ? (p + 1) % n : p + 1;
      idx.push(vi(r, p), vi(r, q), vi(r + 1, q));
      idx.push(vi(r, p), vi(r + 1, q), vi(r + 1, p));
    }
  }
  const cap = (ringIdx: number, top: boolean) => {
    const ring = rings[ringIdx];
    const base = pos.length / 3;
    let cx = 0, cz = 0;
    ring.pts.forEach(([x, z]) => { cx += x; cz += z; });
    cx /= n; cz /= n;
    pos.push(cx, ring.y, cz);
    const start = ringIdx * n;
    for (let p = 0; p < n; p++) {
      const q = (p + 1) % n;
      if (top) idx.push(base, start + q, start + p);
      else idx.push(base, start + p, start + q);
    }
  };
  if (opts.capBottom) cap(0, false);
  if (opts.capTop) cap(rings.length - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---- named builders ------------------------------------------------------ */

/* a tapered angular prism (limbs, torso, staff). bottom @ y=0, top @ y=height. */
export function createTaperedPrismGeometry(
  botW: number, botD: number, topW: number, topD: number, height: number, sides = 6,
): THREE.BufferGeometry {
  const rot = Math.PI / sides;
  return loft([
    { y: 0, pts: ngon(sides, botW / 2, botD / 2, rot) },
    { y: height, pts: ngon(sides, topW / 2, topD / 2, rot) },
  ], { capTop: true, capBottom: true });
}

/* the robe: narrow at the waist (top), belling out wide at the hem (bottom).
   built from several rings so the flare curves (power ease) instead of a
   straight cone. slightly oval (deeper front-to-back). */
export function createRobeGeometry(waistR = 0.32, hemR = 0.66, height = 1.05, sides = 8): THREE.BufferGeometry {
  const rings: Ring[] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;                  // 0 = hem (bottom), 1 = waist (top)
    const y = t * height;
    const r = waistR + (hemR - waistR) * Math.pow(1 - t, 1.7); // flare low
    rings.push({ y, pts: ngon(sides, r, r * 0.92, Math.PI / sides) });
  }
  return loft(rings, { capTop: true, capBottom: false });
}

/* a layered front robe panel (a tabard-like overlapping drape). */
export function createRobePanelGeometry(): THREE.BufferGeometry {
  return loft([
    { y: 0.0, pts: ngon(5, 0.30, 0.10, Math.PI / 5) },
    { y: 0.5, pts: ngon(5, 0.22, 0.09, Math.PI / 5) },
    { y: 0.92, pts: ngon(5, 0.17, 0.08, Math.PI / 5) },
  ], { capTop: true, capBottom: true });
}

/* the hood: a big back-leaning pointed cowl, OPEN at the front (the face
   cavity). rings shift -z as they rise so the point rakes backward; the front
   gap is left by using an arc profile instead of a full ring. */
export function createHoodGeometry(): THREE.BufferGeometry {
  const S = 7;
  const gapStart = Math.PI / 2 + 0.6;     // front (+z) is PI/2; leave a gap there
  const sweep = Math.PI * 2 - 1.2;
  const ring = (y: number, rx: number, rz: number, zoff: number): Ring => ({
    y, pts: arc(S, rx, rz, gapStart, sweep).map(([x, z]) => [x, z + zoff] as V2),
  });
  return loft([
    ring(0.00, 0.46, 0.50, 0.02),
    ring(0.34, 0.44, 0.48, -0.04),
    ring(0.62, 0.34, 0.38, -0.13),
    ring(0.84, 0.18, 0.22, -0.22),
    ring(1.00, 0.06, 0.08, -0.28),
  ], { closed: false });
}

/* a small brow rim that frames the top of the face opening (adds a layer). */
export function createHoodBrowGeometry(): THREE.BufferGeometry {
  return loft([
    { y: 0, pts: arc(6, 0.30, 0.30, Math.PI / 2 + 0.7, Math.PI - 1.4) },
    { y: 0.12, pts: arc(6, 0.36, 0.36, Math.PI / 2 + 0.7, Math.PI - 1.4).map(([x, z]) => [x, z - 0.05] as V2) },
  ], { closed: false });
}

/* a bell sleeve: hangs from the shoulder (y=0) and widens to a cuff at the
   bottom (negative y). */
export function createSleeveGeometry(): THREE.BufferGeometry {
  return loft([
    { y: 0.0, pts: ngon(6, 0.14, 0.14, Math.PI / 6) },
    { y: -0.30, pts: ngon(6, 0.16, 0.16, Math.PI / 6) },
    { y: -0.56, pts: ngon(6, 0.21, 0.21, Math.PI / 6) },   // flared cuff
  ], { capTop: true, capBottom: true });
}

/* a sloped shoulder/pauldron cap (squashed hexagonal dome). */
export function createShoulderGeometry(): THREE.BufferGeometry {
  return loft([
    { y: 0.0, pts: ngon(6, 0.22, 0.18, Math.PI / 6) },
    { y: 0.13, pts: ngon(6, 0.12, 0.10, Math.PI / 6) },
  ], { capTop: true, capBottom: true });
}

/* a chunky boot: an L-shaped side profile (heel->toe, ankle up) extruded
   across the foot width. Custom Shape, no bevel -> faceted. */
export function createBootGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.13, 0.0);
  s.lineTo(0.24, 0.0);
  s.lineTo(0.26, 0.09);
  s.lineTo(0.03, 0.14);
  s.lineTo(0.01, 0.34);
  s.lineTo(-0.13, 0.34);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false });
  g.translate(0, 0, -0.11);   // centre across width
  g.computeVertexNormals();
  return g;
}

/* an oversized faceted hand mitt. */
export function createHandGeometry(): THREE.BufferGeometry {
  return loft([
    { y: 0.0, pts: ngon(6, 0.10, 0.09, Math.PI / 6) },
    { y: -0.10, pts: ngon(6, 0.12, 0.11, Math.PI / 6) },
    { y: -0.20, pts: ngon(6, 0.09, 0.085, Math.PI / 6) },
  ], { capTop: true, capBottom: true });
}

/* upper torso (under the hood / above the waist) — sloped, narrow. */
export function createTorsoGeometry(): THREE.BufferGeometry {
  return createTaperedPrismGeometry(0.42, 0.30, 0.30, 0.24, 0.42, 6);
}

/* a thin tapered staff shaft (5-sided so it reads faceted, not round). */
export function createStaffGeometry(height = 2.05): THREE.BufferGeometry {
  return createTaperedPrismGeometry(0.055, 0.055, 0.04, 0.04, height, 5);
}

/* a faceted crystal — an elongated bipyramid (custom triangle soup). */
export function createCrystalGeometry(r = 0.13, top = 0.28, bot = 0.18, sides = 5): THREE.BufferGeometry {
  const mid = ngon(sides, r, r, 0);
  const pos: number[] = [];
  const idx: number[] = [];
  pos.push(0, top, 0);                          // 0: top apex
  mid.forEach(([x, z]) => pos.push(x, 0, z));   // 1..sides: middle ring
  pos.push(0, -bot, 0);                         // bottom apex
  const bottom = sides + 1;
  for (let i = 0; i < sides; i++) {
    const a = 1 + i, b = 1 + ((i + 1) % sides);
    idx.push(0, b, a);
    idx.push(bottom, a, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* a low faceted base disc to stand the mage on. */
export function createBaseGeometry(): THREE.BufferGeometry {
  return loft([
    { y: 0.0, pts: ngon(8, 0.95, 0.95) },
    { y: 0.1, pts: ngon(8, 0.8, 0.8) },
  ], { capTop: true, capBottom: true });
}
