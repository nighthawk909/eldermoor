// Reusable faceted prop factories (art playbook). Author once, place by data.
import * as THREE from 'three';

function mat(hex: string, o: { rough?: number; metal?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), flatShading: true, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0 });
}
function P(geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
}

export function makeTree(): THREE.Group {
  const g = new THREE.Group();
  g.add(P(new THREE.CylinderGeometry(0.16, 0.26, 1.5, 6), mat('#6b4a2c'), 0, 0.75, 0));
  const greens = [['#3f7a32', 0.8, 1.6], ['#4f8a3c', 0.62, 2.05], ['#356b2a', 0.5, 2.45]] as const;
  for (const [h, r, y] of greens) g.add(P(new THREE.IcosahedronGeometry(r, 0), mat(h), 0, y, 0));
  return g;
}

export function makeRock(): THREE.Group {
  const g = new THREE.Group();
  const r = P(new THREE.IcosahedronGeometry(0.6, 0), mat('#7d8089', { rough: 1 }), 0, 0.35, 0);
  r.scale.y = 0.8; g.add(r);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; g.add(P(new THREE.IcosahedronGeometry(0.1, 0), mat('#caa24a', { metal: 0.3, rough: 0.5 }), Math.cos(a) * 0.4, 0.5, Math.sin(a) * 0.4)); }
  return g;
}
