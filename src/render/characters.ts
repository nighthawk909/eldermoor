// Reusable character factory — faceted low-poly, ported from the Blender hero
// (assets/pipeline/build_eldermoor.py) into realtime Three.js. Art playbook: CLAUDE.md §4 palette,
// flat-shaded facets. Author once, place by data. See docs/parity/characters.md.
import * as THREE from 'three';

const PAL = {
  skin: '#e8b98e', hair: '#3a2a1c', beard: '#4a3420', eye: '#241812',
  tunic: '#3f6f8c', trim: '#d8b25a', cape: '#9c3030', trouser: '#2f3742',
  leather: '#5a3f28', steel: '#c2cad4', wood: '#5a3f28',
};

function mat(hex: string, o: { rough?: number; metal?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex), flatShading: true,
    roughness: o.rough ?? 0.85, metalness: o.metal ?? 0,
  });
}
type V3 = [number, number, number];
function place(mesh: THREE.Mesh, pos: V3, rot?: V3, scale?: V3): THREE.Mesh {
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
const box = (d: V3, pos: V3, m: THREE.Material, rot?: V3) => place(new THREE.Mesh(new THREE.BoxGeometry(d[0], d[1], d[2]), m), pos, rot);
const cyl = (rt: number, rb: number, h: number, pos: V3, m: THREE.Material, seg = 10, rot?: V3) =>
  place(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m), pos, rot);
const cone = (r: number, h: number, pos: V3, m: THREE.Material, seg = 3, rot?: V3, scale?: V3) =>
  place(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m), pos, rot, scale);
const ico = (r: number, pos: V3, m: THREE.Material, detail = 1, scale?: V3) =>
  place(new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), m), pos, undefined, scale);
const D = (deg: number) => (deg * Math.PI) / 180;

/** Sculpted, tapered head: pinched chin + brow/nose/eyes/hair/beard. Authored at (cx,cy,cz), +Z = front. */
function buildHead(parent: THREE.Group, cx: number, cy: number, cz: number): void {
  const skin = mat(PAL.skin, { rough: 0.62 }), hair = mat(PAL.hair, { rough: 0.95 });
  const eye = mat(PAL.eye, { rough: 0.5 }), beard = mat(PAL.beard, { rough: 1 });

  const g = new THREE.IcosahedronGeometry(0.2, 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i); const y = p.getY(i); let z = p.getZ(i);
    if (y < 0) { const f = Math.max(0.5, 1 + y * 1.15); x *= f; z *= f; } // pinch lower → chin
    z = z > 0 ? z * 1.02 : z * 0.9;                                       // fuller face (+Z), flatter back
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  const skull = new THREE.Mesh(g, skin);
  skull.castShadow = true; skull.position.set(cx, cy, cz); skull.scale.set(0.96, 1.18, 1.0);
  parent.add(skull);

  const hp = (lx: number, ly: number, lz: number): V3 => [cx + lx, cy + ly, cz + lz];
  parent.add(box([0.26, 0.045, 0.08], hp(0, 0.05, 0.16), skin, [D(-8), 0, 0]));        // brow
  parent.add(cone(0.062, 0.18, hp(0, -0.01, 0.18), skin, 3, [D(100), 0, 0], [0.8, 1, 1])); // nose
  parent.add(box([0.09, 0.045, 0.03], hp(0.08, -0.01, 0.17), eye, [0, D(10), 0]));     // eye L
  parent.add(box([0.09, 0.045, 0.03], hp(-0.08, -0.01, 0.17), eye, [0, D(-10), 0]));   // eye R
  parent.add(ico(0.205, hp(0, 0.075, -0.02), hair, 1, [1.07, 0.72, 1.09]));            // hair top
  parent.add(box([0.28, 0.08, 0.1], hp(0, 0.15, 0.1), hair, [D(-22), 0, 0]));          // fringe
  parent.add(box([0.07, 0.22, 0.17], hp(0.185, 0, -0.02), hair));                      // sideburn L
  parent.add(box([0.07, 0.22, 0.17], hp(-0.185, 0, -0.02), hair));                     // sideburn R
  parent.add(box([0.27, 0.2, 0.1], hp(0, 0.02, -0.16), hair));                         // back
  parent.add(box([0.2, 0.1, 0.09], hp(0, -0.16, 0.11), beard));                        // beard chin
  parent.add(box([0.08, 0.15, 0.09], hp(0.135, -0.07, 0.09), beard));                  // beard jaw L
  parent.add(box([0.08, 0.15, 0.09], hp(-0.135, -0.07, 0.09), beard));                 // beard jaw R
}

/** Rounded shoe: heel + arched sole + tapered upper + spherical toe + ankle cuff. */
function buildBoot(parent: THREE.Group, x: number, yb: number): void {
  const lea = mat(PAL.leather, { rough: 0.8 }), sole = mat('#3a2a1c', { rough: 0.9 });
  parent.add(box([0.15, 0.065, 0.1], [x, yb - 0.115, -0.075], sole));    // heel
  parent.add(box([0.165, 0.04, 0.32], [x, yb - 0.10, 0.07], sole));      // sole
  parent.add(box([0.155, 0.15, 0.19], [x, yb + 0.02, -0.01], lea));      // ankle/upper
  parent.add(box([0.14, 0.11, 0.15], [x, yb - 0.015, 0.15], lea));       // instep
  parent.add(ico(0.075, [x, yb - 0.03, 0.26], lea, 2, [1.0, 0.8, 1.15])); // rounded toe
  parent.add(cyl(0.105, 0.115, 0.12, [x, yb + 0.14, -0.015], lea, 12));  // ankle cuff
}

/** The hero, matching the Blender render. Returns a Group with limb subgroups for future animation. */
export function makeHero(): THREE.Group {
  const g = new THREE.Group();
  const tunic = mat(PAL.tunic, { rough: 0.82 }), trim = mat(PAL.trim, { rough: 0.4, metal: 0.6 });
  const trouser = mat(PAL.trouser, { rough: 0.85 }), leather = mat(PAL.leather, { rough: 0.7 });
  const steel = mat(PAL.steel, { rough: 0.3, metal: 0.7 }), skin = mat(PAL.skin, { rough: 0.62 });
  const wood = mat(PAL.wood, { rough: 0.75 }), cape = mat(PAL.cape, { rough: 0.85 });

  const legL = new THREE.Group(), legR = new THREE.Group();
  const armL = new THREE.Group(), armR = new THREE.Group();

  for (const [s, leg] of [[1, legL], [-1, legR]] as [number, THREE.Group][]) {
    leg.add(cyl(0.1, 0.12, 0.62, [0.15 * s, 0.51, 0], trouser, 8));
    buildBoot(leg, 0.15 * s, 0.16);
    g.add(leg);
  }
  g.add(box([0.42, 0.18, 0.28], [0, 0.88, 0], leather));            // pelvis/belt
  g.add(box([0.11, 0.09, 0.05], [0, 0.88, 0.155], trim));           // buckle
  g.add(cyl(0.2, 0.27, 0.64, [0, 1.32, 0], tunic, 10));             // torso
  g.add(cyl(0.17, 0.25, 0.17, [0, 1.53, 0], tunic, 10));            // shoulder yoke
  g.add(box([0.22, 0.46, 0.04], [0, 1.34, 0.245], trim));          // tabard
  for (const [s, arm] of [[1, armL], [-1, armR]] as [number, THREE.Group][]) {
    arm.add(cyl(0.085, 0.1, 0.5, [0.3 * s, 1.31, 0], tunic, 8));    // sleeve
    arm.add(cyl(0.1, 0.092, 0.07, [0.3 * s, 1.08, 0], leather, 10)); // cuff
    g.add(arm);
    g.add(ico(0.135, [0.31 * s, 1.5, 0], leather, 2, [1.2, 0.8, 1.05])); // spaulder
  }
  g.add(ico(0.092, [-0.3, 1.02, 0.03], skin, 2, [1.0, 0.95, 1.2])); // shield-side hand
  g.add(cyl(0.07, 0.085, 0.12, [0, 1.66, 0], skin, 8));             // neck
  g.add(cyl(0.15, 0.175, 0.07, [0, 1.6, 0], leather, 12));          // collar
  buildHead(g, 0, 1.86, 0);
  g.add(cyl(0.27, 0.31, 0.13, [0, 1.04, 0], tunic, 12));            // flared hem

  // sword gripped by the near hand, forward of the shoulder
  const hx = 0.33, hy = 1.05, hz = 0.18;
  g.add(cyl(0.07, 0.075, 0.26, [0.315, 1.07, 0.09], leather, 10, [D(74), 0, 0])); // forearm
  g.add(ico(0.097, [hx, hy, hz], skin, 2, [1.05, 1.0, 1.3]));        // fist
  g.add(box([0.1, 0.05, 0.075], [hx, hy + 0.02, hz + 0.05], skin));  // knuckles
  g.add(cyl(0.03, 0.03, 0.22, [hx, hy, hz], wood, 8));               // grip
  g.add(box([0.22, 0.05, 0.055], [hx, hy + 0.15, hz], trim));        // crossguard
  g.add(box([0.05, 0.8, 0.018], [hx, hy + 0.56, hz], steel));        // blade
  g.add(cone(0.028, 0.17, [hx, hy + 1.045, hz], steel, 4, undefined, [1, 1, 0.36])); // tip
  g.add(ico(0.045, [hx, hy - 0.15, hz], trim, 2));                   // pommel

  // round shield on the far arm (disc faces +Z)
  g.add(cyl(0.28, 0.28, 0.07, [-0.34, 1.02, 0.14], wood, 12, [D(90), 0, 0]));
  g.add(cyl(0.3, 0.3, 0.03, [-0.34, 1.02, 0.16], steel, 12, [D(90), 0, 0]));
  g.add(ico(0.065, [-0.34, 1.02, 0.2], trim, 1));                    // boss

  // draped cape behind
  const cp = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.0), new THREE.MeshStandardMaterial({ color: new THREE.Color(PAL.cape), flatShading: true, roughness: 0.85, side: THREE.DoubleSide }));
  cp.position.set(0, 1.12, -0.2); cp.castShadow = true; g.add(cp);
  void cape;

  g.userData = { legL, legR, armL, armR };
  return g;
}
