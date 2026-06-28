// Showcase/manual-QA for the character factory. Warm 3-point lighting + turntable, mobile-friendly.
import * as THREE from 'three';
import { makeHero, makeNPC, NPC_PRESETS, makeRat, makeBrute, animateWalk } from '../render/characters.js';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9e4d7');
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

// warm 3-point lighting (key/fill/rim) like the Blender render
scene.add(new THREE.HemisphereLight(new THREE.Color('#bcd6ff'), new THREE.Color('#5a4a32'), 0.7));
const key = new THREE.DirectionalLight(new THREE.Color('#ffe7bd'), 2.2);
key.position.set(-3, 5, 4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
(key.shadow.camera as THREE.OrthographicCamera).left = -3;
(key.shadow.camera as THREE.OrthographicCamera).right = 3;
(key.shadow.camera as THREE.OrthographicCamera).top = 4;
(key.shadow.camera as THREE.OrthographicCamera).bottom = -1;
scene.add(key);
const fill = new THREE.DirectionalLight(new THREE.Color('#cfe0ff'), 0.6); fill.position.set(4, 2, 2); scene.add(fill);
const rim = new THREE.DirectionalLight(new THREE.Color('#ffe6c2'), 1.0); rim.position.set(0, 3, -4); scene.add(rim);

// ground
const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 48),
  new THREE.MeshStandardMaterial({ color: new THREE.Color('#d8d1c0'), roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

// cast lineup on a turntable
const pivot = new THREE.Group(); scene.add(pivot);
const cast: THREE.Object3D[] = [];
const place = (m: THREE.Object3D, x: number) => { m.position.x = x; pivot.add(m); cast.push(m); };
const hero = makeHero(); place(hero, 0);
place(makeBrute(), -3.3);
place(makeNPC(NPC_PRESETS.wizard as never), -2.0);
place(makeNPC(NPC_PRESETS.guide as never), -1.0);
place(makeNPC(NPC_PRESETS.merchant as never), 1.05);
place(makeRat(), 2.1);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
camera.position.set(0, 1.7, 7.6); camera.lookAt(0, 0.9, 0);

// drag to rotate (mouse + touch); idle auto-spin
let dragging = false, lastX = 0, autoSpin = true, vel = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; autoSpin = false; });
canvas.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; pivot.rotation.y += dx * 0.01; vel = dx * 0.01; });
addEventListener('pointerup', () => { dragging = false; });

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  for (const m of cast) animateWalk(m, t, true); // walk-in-place to show the limb animation
  if (autoSpin) pivot.rotation.y += dt * 0.5;
  else if (!dragging) { pivot.rotation.y += vel; vel *= 0.92; }
  renderer.render(scene, camera);
}
animate();

(window as unknown as { __hero: THREE.Group }).__hero = hero;
