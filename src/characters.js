// characters.js — character / NPC / rat factories + floating nameplate (crisp blockout style).
import { mat, P } from './engine.js';
const THREE = window.THREE;

export function makeChar(o = {}) {
  const tunic = o.tunic || '#3f6f8c', leg = o.leg || '#2f3742', skin = o.skin || '#e8b98e', hair = o.hair || '#3a2a1c';
  const g = new THREE.Group(); g.userData = {};
  const legL = new THREE.Group(), legR = new THREE.Group();
  [[legL, 1], [legR, -1]].forEach(([G, s]) => {
    G.position.set(0.16 * s, 0.78, 0);
    G.add(P(new THREE.BoxGeometry(0.24, 0.6, 0.26), mat(leg), 0, -0.3, 0));
    G.add(P(new THREE.BoxGeometry(0.27, 0.16, 0.36), mat('#5a3f28'), 0, -0.6, 0.05)); g.add(G);
  });
  g.add(P(new THREE.BoxGeometry(0.56, 0.66, 0.34), mat(tunic), 0, 1.12, 0)); // torso
  if (o.tabard) g.add(P(new THREE.BoxGeometry(0.26, 0.5, 0.04), mat(o.tabard), 0, 1.12, 0.19));
  const armL = new THREE.Group(), armR = new THREE.Group();
  [[armL, 1], [armR, -1]].forEach(([G, s]) => {
    G.position.set(0.36 * s, 1.42, 0);
    G.add(P(new THREE.BoxGeometry(0.17, 0.56, 0.2), mat(o.sleeve || tunic), 0, -0.26, 0));
    G.add(P(new THREE.BoxGeometry(0.15, 0.16, 0.16), mat(skin), 0, -0.52, 0)); g.add(G);
  });
  g.add(P(new THREE.CylinderGeometry(0.09, 0.1, 0.12, 6), mat(skin), 0, 1.5, 0)); // neck
  const head = P(new THREE.BoxGeometry(0.4, 0.4, 0.38), mat(skin), 0, 1.78, 0); g.add(head);
  if (o.hat) { g.add(P(new THREE.ConeGeometry(0.32, 0.5, 8), mat(o.hat), 0, 2.2, 0)); }
  else {
    g.add(P(new THREE.BoxGeometry(0.44, 0.18, 0.42), mat(hair), 0, 2.0, -0.01));
    g.add(P(new THREE.BoxGeometry(0.12, 0.2, 0.06), mat(hair), 0, 1.86, -0.18));
  }
  g.add(P(new THREE.BoxGeometry(0.05, 0.06, 0.02), mat('#20140c'), 0.09, 1.8, 0.19));
  g.add(P(new THREE.BoxGeometry(0.05, 0.06, 0.02), mat('#20140c'), -0.09, 1.8, 0.19));
  if (o.beard) g.add(P(new THREE.BoxGeometry(0.34, 0.18, 0.1), mat(o.beard), 0, 1.64, 0.16));
  g.userData = { legL, legR, armL, armR };
  return g;
}

export function makeRat() {
  const g = new THREE.Group();
  g.add(P(new THREE.BoxGeometry(0.5, 0.3, 0.8), mat('#6b6258'), 0, 0.2, 0));
  g.add(P(new THREE.BoxGeometry(0.3, 0.26, 0.3), mat('#6b6258'), 0, 0.26, 0.45));
  const tail = P(new THREE.ConeGeometry(0.05, 0.5, 4), mat('#caa'), 0, 0.2, -0.6); tail.rotation.x = -1.3; g.add(tail);
  g.add(P(new THREE.BoxGeometry(0.04, 0.05, 0.02), mat('#200'), 0.08, 0.3, 0.6));
  g.add(P(new THREE.BoxGeometry(0.04, 0.05, 0.02), mat('#200'), -0.08, 0.3, 0.6));
  return g;
}

export function plate(text, hex, y) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.font = 'bold 30px Trebuchet MS'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.9)'; x.strokeText(text, 128, 32); x.fillStyle = hex; x.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(2.2, 0.55, 1); s.position.y = y; s.renderOrder = 999; return s;
}
