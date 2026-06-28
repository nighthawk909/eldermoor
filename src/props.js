// props.js — pure prop/object factories (no world/state imports, so it never creates cycles).
import { mat, P, TAU, col } from './engine.js';
const THREE = window.THREE;

export function makeTree() {
  const g = new THREE.Group();
  g.add(P(new THREE.CylinderGeometry(0.16, 0.26, 1.5, 6), mat('#6b4a2c'), 0, 0.75, 0));
  const c = new THREE.Group(); c.position.y = 1.6;
  [['#3f7a32', 0.8, 0], ['#4f8a3c', 0.62, 0.45], ['#356b2a', 0.5, 0.85]]
    .forEach(([h, r, yy]) => c.add(P(new THREE.IcosahedronGeometry(r, 0), mat(h), 0, yy, 0)));
  g.add(c); g.userData.canopy = c; return g;
}
export function makeRock() {
  const g = new THREE.Group();
  const r = P(new THREE.IcosahedronGeometry(0.6, 0), mat('#7d8089', { r: 1 }), 0, 0.35, 0);
  r.scale.y = 0.8; g.add(r);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; g.add(P(new THREE.IcosahedronGeometry(0.1, 0), mat('#caa24a', { m: 0.3, r: 0.5 }), Math.cos(a) * 0.4, 0.5, Math.sin(a) * 0.4)); }
  return g;
}
export function makeFire(lit) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const lg = P(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), mat('#5a3f28'), Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2); lg.rotation.z = 1; g.add(lg); }
  if (lit) {
    const fl = P(new THREE.ConeGeometry(0.25, 0.7, 6), mat('#ff8a2c', { e: '#ff7a1c', ei: 1.6 }), 0, 0.45, 0); g.add(fl); g.userData.flame = fl;
    const L = new THREE.PointLight(col('#ff9a3c'), 2.2, 8, 2); L.position.y = 0.7; g.add(L); g.userData.light = L;
  }
  return g;
}

export function makeFishSpot() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col('#bfe9ff'), transparent: true, opacity: 0.7 }));
  g.add(ring); g.userData.ring = ring; return g;
}
export function makeFurnace() {
  const g = new THREE.Group();
  g.add(P(new THREE.BoxGeometry(1.2, 1.3, 1.2), mat('#7d7066', { r: 1 }), 0, 0.65, 0));
  g.add(P(new THREE.BoxGeometry(0.5, 0.5, 0.3), mat('#ff8a2c', { e: '#ff6a1c', ei: 1.4 }), 0, 0.5, 0.6)); return g;
}
export function makeAnvil() {
  const g = new THREE.Group();
  g.add(P(new THREE.BoxGeometry(0.5, 0.3, 0.9), mat('#3a3f46', { m: 0.4, r: 0.5 }), 0, 0.7, 0));
  g.add(P(new THREE.BoxGeometry(0.3, 0.5, 0.3), mat('#3a3f46', { m: 0.4, r: 0.5 }), 0, 0.35, 0)); return g;
}
export function makeDummy() {
  const g = new THREE.Group();
  g.add(P(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), mat('#6b4a2c'), 0, 0.7, 0));
  g.add(P(new THREE.BoxGeometry(0.5, 0.6, 0.4), mat('#cdb38b', { r: 1 }), 0, 1.2, 0));
  g.add(P(new THREE.SphereGeometry(0.2, 6, 5), mat('#cdb38b', { r: 1 }), 0, 1.65, 0)); return g;
}
export function makeTarget() {
  const g = new THREE.Group();
  g.add(P(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), mat('#6b4a2c'), 0, 0.6, 0));
  [['#fff', 0.45], ['#cf4a3a', 0.32], ['#fff', 0.2], ['#cf4a3a', 0.09]].forEach(([h, r]) => { const d = P(new THREE.CylinderGeometry(r, r, 0.06, 16), mat(h), 0, 1.3, 0); d.rotation.x = Math.PI / 2; g.add(d); }); return g;
}
export function makeAltar() {
  const g = new THREE.Group();
  g.add(P(new THREE.BoxGeometry(1.4, 0.8, 0.7), mat('#cdc6b6', { r: 1 }), 0, 0.4, 0));
  g.add(P(new THREE.BoxGeometry(1.5, 0.15, 0.8), mat('#b7ad96', { r: 1 }), 0, 0.85, 0));
  g.add(P(new THREE.IcosahedronGeometry(0.16, 0), mat('#9be0ff', { e: '#7fd0ff', ei: 1.6 }), 0, 1.1, 0)); return g;
}
export function makeTable() {
  const g = new THREE.Group();
  g.add(P(new THREE.BoxGeometry(1.2, 0.1, 0.8), mat('#6b4a2c'), 0, 0.8, 0));
  [[0.5, 0.3], [-0.5, 0.3], [0.5, -0.3], [-0.5, -0.3]].forEach(([x, z]) => g.add(P(new THREE.BoxGeometry(0.1, 0.8, 0.1), mat('#5a3f28'), x, 0.4, z)));
  g.add(P(new THREE.BoxGeometry(0.3, 0.12, 0.2), mat('#9c6b3a'), 0, 0.9, 0)); return g;
}
export function makeBoat() {
  const g = new THREE.Group();
  g.add(P(new THREE.BoxGeometry(1.4, 0.5, 3), mat('#6b4a2c'), 0, 0.25, 0));
  g.add(P(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), mat('#5a3f28'), 0, 1.3, 0));
  g.add(P(new THREE.BoxGeometry(0.04, 1.2, 1.0), mat('#e8e0d0'), 0, 1.4, 0)); return g;
}
