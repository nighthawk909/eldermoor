// engine.js — renderer, scene, camera, lights, sky, terrain, sea + shared THREE helpers.
// THREE is loaded as a global (UMD r128) by index.html before this module.
const THREE = window.THREE;

export const TAU = Math.PI * 2;
export const col = h => new THREE.Color(h).convertSRGBToLinear();
export const mat = (h, o = {}) => new THREE.MeshStandardMaterial({
  color: col(h), flatShading: true,
  roughness: o.r ?? 0.9, metalness: o.m ?? 0,
  emissive: o.e ? col(o.e) : 0x000000, emissiveIntensity: o.ei ?? 1,
});
// generic shadow-casting mesh helper
export function P(geo, m, x, y, z) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
  return me;
}

/* ---------- renderer / scene ---------- */
export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

export const scene = new THREE.Scene();
const SKY = col('#cfe6f2'); scene.fog = new THREE.Fog(SKY, 38, 90);
export const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 300);

/* sky dome */
(function () {
  const g = new THREE.SphereGeometry(140, 20, 14), top = col('#5e93c9'), bot = col('#e7ddc4'), c = [];
  const v = new THREE.Vector3(); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize(); const t = Math.max(0, v.y);
    c.push(bot.r + (top.r - bot.r) * t, bot.g + (top.g - bot.g) * t, bot.b + (top.b - bot.b) * t);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
})();

/* lights */
scene.add(new THREE.HemisphereLight(col('#bcd6ff'), col('#5a4a32'), 0.85));
scene.add(new THREE.AmbientLight(0xffffff, 0.18));
export const sun = new THREE.DirectionalLight(col('#ffe7bd'), 2.1);
sun.position.set(24, 34, 16); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
sun.shadow.camera.left = -44; sun.shadow.camera.right = 44; sun.shadow.camera.top = 44; sun.shadow.camera.bottom = -44;
sun.shadow.bias = -0.0004; scene.add(sun);

/* ---------- island terrain ---------- */
export const ISLE = 24;
export function gh(x, z) { // ground height
  const r = Math.hypot(x, z);
  if (r > ISLE + 3) return -2.2;
  let beach = 0; if (r > ISLE - 3) beach = -(r - (ISLE - 3)) * 0.45;
  let h = Math.sin(x * 0.12) * 0.5 + Math.cos(z * 0.11) * 0.45 + Math.sin((x + z) * 0.07) * 0.3;
  h = Math.max(0, h) * Math.max(0, 1 - r / (ISLE + 2));
  return h + beach;
}
export function terrainCol(x, z, y) {
  const r = Math.hypot(x, z);
  if (r > ISLE - 2.4 || y < 0.02) return Math.random() < .5 ? col('#d9c79a') : col('#cdb98a'); // sand
  const k = Math.random(); const hi = Math.min(1, Math.max(0, y / 1.0));
  let b = k < .33 ? col('#4f8a3c') : k < .66 ? col('#578f3f') : col('#477d34');
  return b.clone().lerp(col('#86b85e'), hi * 0.4);
}
export let groundMesh;
(function () {
  const S = 64; let g = new THREE.PlaneGeometry(72, 72, S, S); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, gh(p.getX(i), p.getZ(i)));
  g = g.toNonIndexed(); const pp = g.attributes.position, n = pp.count, ca = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 3) {
    let cx = 0, cz = 0, cy = 0; for (let k = 0; k < 3; k++) { cx += pp.getX(i + k); cz += pp.getZ(i + k); cy += pp.getY(i + k); }
    cx /= 3; cz /= 3; cy /= 3; const c = terrainCol(cx, cz, cy);
    for (let k = 0; k < 3; k++) { ca[(i + k) * 3] = c.r; ca[(i + k) * 3 + 1] = c.g; ca[(i + k) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); g.computeVertexNormals();
  groundMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  groundMesh.receiveShadow = true; scene.add(groundMesh);
})();

/* sea */
export let sea;
(function () {
  const g = new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2);
  const m = mat('#2f7fa0', { r: 0.2, m: 0.1 }); m.transparent = true; m.opacity = 0.88;
  sea = new THREE.Mesh(g, m); sea.position.y = -0.35; scene.add(sea);
})();

/* resize */
export function initResize() {
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}
