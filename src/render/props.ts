// Reusable faceted prop factories (art playbook). Author once, place by data.
// Trees and rocks are PARAMETRIC: one factory + a variant table, never copy-pasted.
import * as THREE from 'three';

function mat(hex: string, o: { rough?: number; metal?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), flatShading: true, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0 });
}
function P(geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
}

/* ---------------- trees ---------------- */
type Foliage = [hex: string, radius: number, y: number];
interface TreeVariant {
  trunk: string; trunkH: number; trunkTop: number; trunkBot: number;
  foliage: Foliage[];          // stacked icosphere canopy (empty for pine/dead)
  cone?: [hex: string, baseR: number, baseY: number, layers: number]; // conical canopy (pine)
  bare?: boolean;              // dead tree: bare branches, no canopy
}
export type TreeKind = 'oak' | 'willow' | 'pine' | 'dead';
export const TREE_VARIANTS: Record<TreeKind, TreeVariant> = {
  oak:    { trunk: '#6b4a2c', trunkH: 1.5, trunkTop: 0.16, trunkBot: 0.26, foliage: [['#3f7a32', 0.8, 1.6], ['#4f8a3c', 0.62, 2.05], ['#356b2a', 0.5, 2.45]] },
  willow: { trunk: '#5e4a30', trunkH: 1.25, trunkTop: 0.15, trunkBot: 0.24, foliage: [['#6f9a4a', 1.05, 1.35], ['#7faa55', 0.82, 1.75], ['#5f8a3f', 0.6, 2.05]] },
  pine:   { trunk: '#5a4326', trunkH: 1.1, trunkTop: 0.12, trunkBot: 0.2, foliage: [], cone: ['#2f6b34', 0.85, 1.0, 4] },
  dead:   { trunk: '#4a3a2a', trunkH: 1.7, trunkTop: 0.1, trunkBot: 0.22, foliage: [], bare: true },
};

export function makeTree(variant: TreeKind = 'oak'): THREE.Group {
  const v = TREE_VARIANTS[variant];
  const g = new THREE.Group();
  const trunkM = mat(v.trunk);
  g.add(P(new THREE.CylinderGeometry(v.trunkTop, v.trunkBot, v.trunkH, 6), trunkM, 0, v.trunkH / 2, 0));
  for (const [h, r, y] of v.foliage) g.add(P(new THREE.IcosahedronGeometry(r, 0), mat(h), 0, y, 0));
  if (v.cone) {
    const [hex, baseR, baseY, layers] = v.cone;
    for (let i = 0; i < layers; i++) {
      const t = i / layers;
      g.add(P(new THREE.ConeGeometry(baseR * (1 - t * 0.7), 0.7, 7), mat(hex), 0, baseY + i * 0.45, 0));
    }
  }
  if (v.bare) {
    for (const [ax, ay, az, rz] of [[0.18, 1.3, 0, 0.6], [-0.16, 1.55, 0, -0.7], [0.05, 1.75, 0.1, 0.2]] as const) {
      const br = P(new THREE.CylinderGeometry(0.03, 0.06, 0.55, 5), trunkM, ax, ay, az); br.rotation.z = rz; g.add(br);
    }
  }
  return g;
}

/* ---------------- rocks (ore variants) ---------------- */
interface RockVariant { base: string; ore: string; oreMetal: number; oreRough?: number; }
export type RockKind = 'copper' | 'tin' | 'iron' | 'coal' | 'clay';
export const ROCK_VARIANTS: Record<RockKind, RockVariant> = {
  copper: { base: '#7d8089', ore: '#b5713a', oreMetal: 0.35, oreRough: 0.5 },
  tin:    { base: '#7d8089', ore: '#cfcabf', oreMetal: 0.45, oreRough: 0.45 },
  iron:   { base: '#6f6f72', ore: '#8a5a3a', oreMetal: 0.35, oreRough: 0.55 },
  coal:   { base: '#55555a', ore: '#26262b', oreMetal: 0.2, oreRough: 0.4 },
  clay:   { base: '#9a8468', ore: '#b89a72', oreMetal: 0, oreRough: 0.9 },
};

export function makeRock(variant: RockKind = 'copper'): THREE.Group {
  const v = ROCK_VARIANTS[variant];
  const g = new THREE.Group();
  const r = P(new THREE.IcosahedronGeometry(0.6, 0), mat(v.base, { rough: 1 }), 0, 0.35, 0);
  r.scale.y = 0.8; g.add(r);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; g.add(P(new THREE.IcosahedronGeometry(0.1, 0), mat(v.ore, { metal: v.oreMetal, rough: v.oreRough ?? 0.5 }), Math.cos(a) * 0.4, 0.5, Math.sin(a) * 0.4)); }
  return g;
}

/* ---------------- decor ---------------- */
export function makeFire(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const lg = P(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), mat('#5a3f28'), Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2); lg.rotation.z = 1; g.add(lg); }
  const fl = P(new THREE.ConeGeometry(0.25, 0.7, 6), new THREE.MeshStandardMaterial({ color: new THREE.Color('#ff8a2c'), emissive: new THREE.Color('#ff7a1c'), emissiveIntensity: 1.4, flatShading: true }), 0, 0.45, 0);
  g.add(fl); const L = new THREE.PointLight(new THREE.Color('#ff9a3c'), 6, 6, 2); L.position.y = 0.7; g.add(L);
  return g;
}
export function makePond(): THREE.Group {
  const g = new THREE.Group();
  const w = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshStandardMaterial({ color: new THREE.Color('#2c6a82'), roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9 }));
  w.rotation.x = -Math.PI / 2; w.position.y = 0.04; w.receiveShadow = true; g.add(w);
  return g;
}
