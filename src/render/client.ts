// Eldermoor playable client (step A/B): renders the sim tile-world with the character factory,
// a follow camera, interpolated tile movement, and tap-to-walk. Interaction (tap NPC / long-press
// menu / haptics) is layered on next. See docs/parity/interaction.md.
import * as THREE from 'three';
import { TickEngine } from '../sim/tick.js';
import { makeRNG } from '../sim/rng.js';
import { makeWorld, addEntity, setBlocked, type Entity } from '../sim/world.js';
import { movementSystem, walkTo, type MoveState } from '../sim/movement.js';
import { makeHero, makeNPC, NPC_PRESETS, makeRat, animateWalk } from './characters.js';
import { makeTree, makeRock, makeFire, makePond } from './props.js';
import { optionsFor, defaultOption, examineText, type ActionId, type InteractOption } from '../sim/interaction.js';

const GW = 24, GH = 24, CX = 12, CY = 12;           // grid + center offset (tile→world)
const TW = (x: number) => x - CX, TZ = (y: number) => y - CY;

/* ---------- renderer / scene ---------- */
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#cfe6f2');
scene.fog = new THREE.Fog(new THREE.Color('#cfe6f2'), 22, 46);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

scene.add(new THREE.HemisphereLight(new THREE.Color('#bcd6ff'), new THREE.Color('#5a4a32'), 0.75));
const sun = new THREE.DirectionalLight(new THREE.Color('#ffe7bd'), 2.1);
sun.position.set(-8, 14, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera as THREE.OrthographicCamera;
sc.near = 1; sc.far = 60; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; scene.add(sun);
scene.add(new THREE.DirectionalLight(new THREE.Color('#cfe0ff'), 0.5).translateX(8));

const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH),
  new THREE.MeshStandardMaterial({ color: new THREE.Color('#4f8a3c'), roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(GW, GH, 0x2c5a24, 0x3a6b2e); (grid.material as THREE.Material).opacity = 0.35; (grid.material as THREE.Material).transparent = true; scene.add(grid);

/* ---------- sim world + entities ---------- */
const world = makeWorld(GW, GH);
const rng = makeRNG(7);
const meshes = new Map<string, THREE.Object3D>();
function spawn(e: Entity, mesh: THREE.Object3D, blocked = false): void {
  addEntity(world, e); mesh.position.set(TW(e.tile!.x), 0, TZ(e.tile!.y)); scene.add(mesh); meshes.set(e.id, mesh);
  if (blocked) setBlocked(world.grid, e.tile!.x, e.tile!.y, true);
}
const player = { id: 'player', type: 'player' as const, tile: { x: CX, y: CY } };
spawn(player, makeHero());
spawn({ id: 'guide', type: 'npc', npc: 'guide', name: 'Guide', examine: 'He shows new arrivals the ropes.', dlg: ['Welcome to Eldermoor! Tap the ground to walk.', 'Long-press things to see more options.'], tile: { x: 15, y: 12 } }, faceCam(makeNPC(NPC_PRESETS.guide as never)), true);
spawn({ id: 'wizard', type: 'npc', npc: 'wizard', name: 'Wizard', examine: 'His robes smell faintly of runes.', dlg: ['Magic flows through the runes, traveller.'], tile: { x: 9, y: 15 } }, faceCam(makeNPC(NPC_PRESETS.wizard as never)), true);
spawn({ id: 'merchant', type: 'npc', npc: 'merchant', name: 'Merchant', examine: 'Always looking for a deal.', dlg: ['Finest wares in all of Eldermoor!'], tile: { x: 16, y: 16 } }, faceCam(makeNPC(NPC_PRESETS.merchant as never)), true);
spawn({ id: 'rat', type: 'npc', npc: 'rat', combat: true, name: 'Giant rat', examine: 'A large, mangy rodent.', tile: { x: 13, y: 17 } }, makeRat(), true);
spawn({ id: 'tree1', type: 'object', obj: 'tree', name: 'Tree', examine: 'A sturdy tree — good for logs.', tile: { x: 10, y: 10 } }, makeTree(), true);
spawn({ id: 'rock1', type: 'object', obj: 'rock', name: 'Copper rock', examine: 'A rock streaked with copper.', tile: { x: 17, y: 9 } }, makeRock(), true);
// pond (decor) + lit campfire for a more populated scene
const pond = makePond(); pond.position.set(TW(6), 0, TZ(18)); scene.add(pond);
for (const [px, py] of [[5, 17], [5, 18], [6, 17], [6, 18], [7, 18], [6, 19]] as [number, number][]) setBlocked(world.grid, px, py, true);
const fire = makeFire(); fire.position.set(TW(18), 0, TZ(14)); scene.add(fire); setBlocked(world.grid, 18, 14, true);
// scatter decor trees (block their tiles)
for (let i = 0; i < 18; i++) {
  const x = 1 + rng.int(GW - 2), y = 1 + rng.int(GH - 2);
  if (Math.abs(x - CX) < 3 && Math.abs(y - CY) < 3) continue;
  if (world.grid.blocked[y * GW + x]) continue;
  const t = makeTree(); t.position.set(TW(x), 0, TZ(y)); t.scale.setScalar(0.8 + rng.next() * 0.5); scene.add(t); setBlocked(world.grid, x, y, true);
}
function faceCam(o: THREE.Object3D): THREE.Object3D { o.rotation.y = Math.PI; return o; } // NPCs face -Z toward the player/camera

/* ---------- tick ---------- */
const engine = new TickEngine({ world, rng, systems: [movementSystem] });
let lastTickAt = performance.now();
engine.onTick(() => { lastTickAt = performance.now(); });
engine.start();

/* ---------- HUD: chat log + dialogue ---------- */
const logEl = document.getElementById('log')!;
function log(t: string): void { const d = document.createElement('div'); d.textContent = t; logEl.appendChild(d); while (logEl.children.length > 5) logEl.removeChild(logEl.firstChild!); }
const dlgEl = document.getElementById('dlg')!, dlgWho = document.getElementById('dlgwho')!, dlgTx = document.getElementById('dlgtx')!;
let dlgQueue: string[] = [];
function showDialogue(who: string, lines: string[]): void { dlgWho.textContent = who; dlgQueue = lines.slice(); nextDlg(); }
function nextDlg(): void { const line = dlgQueue.shift(); if (line === undefined) { dlgEl.style.display = 'none'; return; } dlgTx.textContent = line; dlgEl.style.display = 'block'; }
document.getElementById('dlgbtn')!.addEventListener('click', (e) => { e.stopPropagation(); nextDlg(); });
function haptic(ms = 12): void { try { (navigator as unknown as { vibrate?: (n: number) => void }).vibrate?.(ms); } catch { /* unsupported */ } }

/* ---------- click-feedback marker (OSRS-style tap flash) ---------- */
const markers: { mesh: THREE.Mesh; born: number }[] = [];
const markerGeo = new THREE.RingGeometry(0.22, 0.4, 22);
function flashAt(wx: number, wz: number, color: string): void {
  const m = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, side: THREE.DoubleSide, depthTest: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(wx, 0.06, wz); m.renderOrder = 999; scene.add(m);
  markers.push({ mesh: m, born: clock.elapsedTime });
}

/* ---------- interaction ---------- */
let pending: { id: string; action: ActionId } | null = null;
function entityIdAt(obj: THREE.Object3D | null): string | null {
  let o: THREE.Object3D | null = obj;
  while (o) { for (const [id, m] of meshes) if (m === o) return id; o = o.parent; }
  return null;
}
function interactWith(id: string): void {
  const ent = world.entities.get(id); if (!ent || !ent.tile) return;
  runOption(defaultOption(ent), ent);
}
/** Run a chosen option against a target entity (or a ground tile for 'walk'). */
function runOption(opt: InteractOption, ent: Entity | null, tile?: { x: number; y: number }): void {
  if (opt.action === 'walk') {
    pending = null;
    const t = ent?.tile ?? tile; if (t) walkTo(player as unknown as Entity, world.grid, t.x, t.y);
  } else if (opt.action === 'examine' && ent) {
    runAction('examine', ent); // examine is instant — no walking
  } else if (ent && ent.tile) {
    pending = { id: ent.id, action: opt.action };
    walkTo(player as unknown as Entity, world.grid, ent.tile.x, ent.tile.y, { adjacent: true });
  }
}
function runAction(action: ActionId, ent: Entity): void {
  haptic();
  const n = (ent.name as string) ?? ent.id;
  if (action === 'talk') showDialogue(n, (ent.dlg as string[]) ?? ['…']);
  else if (action === 'attack') log(`You attack the ${n}.`);
  else if (action === 'chop') log(`You swing your axe at the ${n}…`);
  else if (action === 'mine') log(`You mine the ${n}…`);
  else if (action === 'take') log(`You take the ${n}.`);
  else if (action === 'examine') log(examineText(ent));
}

/* ---------- input: tap = default action · long-press / right-click = options menu ---------- */
const ray = new THREE.Raycaster();
interface Pick { ent?: Entity; tile?: { x: number; y: number }; }
function pickAt(clientX: number, clientY: number): Pick {
  const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const entObjs = [...meshes.entries()].filter(([id]) => id !== 'player').map(([, m]) => m);
  const eh = ray.intersectObjects(entObjs, true)[0];
  if (eh) { const id = entityIdAt(eh.object); if (id) { const ent = world.entities.get(id); if (ent) return { ent }; } }
  const gh = ray.intersectObject(ground)[0];
  if (gh) return { tile: { x: Math.round(gh.point.x) + CX, y: Math.round(gh.point.z) + CY } };
  return {};
}

const ctxEl = document.getElementById('ctx')!;
let menuOpen = false;
function closeMenu(): void { ctxEl.style.display = 'none'; menuOpen = false; }
function openMenu(clientX: number, clientY: number): void {
  const p = pickAt(clientX, clientY);
  const opts: InteractOption[] = p.ent ? optionsFor(p.ent) : p.tile ? [{ label: 'Walk here', action: 'walk' }] : [];
  if (!opts.length) return;
  ctxEl.innerHTML = '<div class="h">Choose option</div>';
  for (const o of opts) {
    const row = document.createElement('div'); row.className = 'i'; row.textContent = o.label;
    row.addEventListener('pointerup', (ev) => { ev.stopPropagation(); closeMenu(); runOption(o, p.ent ?? null, p.tile); });
    ctxEl.appendChild(row);
  }
  ctxEl.style.display = 'block';
  const mw = ctxEl.offsetWidth || 160, mh = ctxEl.offsetHeight || 160;
  ctxEl.style.left = Math.min(clientX, innerWidth - mw - 4) + 'px';
  ctxEl.style.top = Math.min(clientY, innerHeight - mh - 4) + 'px';
  menuOpen = true; haptic(18);
}
document.addEventListener('pointerdown', (e) => { if (menuOpen && !ctxEl.contains(e.target as Node)) closeMenu(); }, true);

// orbit camera state (drag to look, pinch / wheel to zoom — ported from the original prototype)
const sph = { r: 13, th: 0.7, phi: 0.95 };
const camT = new THREE.Vector3(TW(CX), 1, TZ(CY));
const clampR = () => { sph.r = Math.max(6, Math.min(30, sph.r)); };
const ptr = new Map<number, { x: number; y: number }>();
let down: { x: number; y: number } | null = null, dragged = false, longPressed = false, pinch: number | null = null;
let lpTimer: ReturnType<typeof setTimeout> | null = null;
const clearLP = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
const pinchDist = () => { const v = [...ptr.values()]; return Math.hypot(v[0]!.x - v[1]!.x, v[0]!.y - v[1]!.y); };
function tap(x: number, y: number): void {
  const p = pickAt(x, y);
  if (p.ent && p.ent.tile) { flashAt(TW(p.ent.tile.x), TZ(p.ent.tile.y), '#cf4a3a'); interactWith(p.ent.id); }
  else if (p.tile) { flashAt(TW(p.tile.x), TZ(p.tile.y), '#e7c64f'); pending = null; walkTo(player as unknown as Entity, world.grid, p.tile.x, p.tile.y); }
}
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size === 1) { down = { x: e.clientX, y: e.clientY }; dragged = false; longPressed = false; clearLP(); lpTimer = setTimeout(() => { longPressed = true; openMenu(down!.x, down!.y); }, 450); }
  else { clearLP(); if (ptr.size === 2) pinch = pinchDist(); }
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptr.has(e.pointerId)) return;
  const prev = ptr.get(e.pointerId)!; const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size >= 2) { const d = pinchDist(); if (pinch) { sph.r *= pinch / d; clampR(); } pinch = d; clearLP(); return; } // pinch-zoom
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) { dragged = true; clearLP(); }
  if (dragged) { sph.th -= dx * 0.005; sph.phi = Math.max(0.35, Math.min(1.4, sph.phi - dy * 0.005)); } // orbit
});
canvas.addEventListener('pointerup', (e) => {
  const two = ptr.size === 2; ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; clearLP();
  if (!two && !dragged && !longPressed && down && e.button === 0) tap(down.x, down.y);
  if (ptr.size === 0) down = null;
});
canvas.addEventListener('wheel', (e) => { sph.r *= 1 + e.deltaY * 0.0012; clampR(); e.preventDefault(); }, { passive: false }); // zoom
canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); openMenu(e.clientX, e.clientY); });

/* ---------- render loop ---------- */
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime(); // advances the clock; reading .elapsedTime directly leaves it frozen at 0
  const mv = (player as unknown as Entity).move as MoveState | undefined;
  let wx = TW(player.tile.x), wz = TZ(player.tile.y), moving = false;
  if (mv && mv.from && mv.to && mv.sinceTick === engine.tickCount) {
    const a = Math.min(1, (performance.now() - lastTickAt) / 600);
    wx = (mv.from.x + (mv.to.x - mv.from.x) * a) - CX;
    wz = (mv.from.y + (mv.to.y - mv.from.y) * a) - CY;
  }
  if (mv && (mv.path.length > 0 || mv.sinceTick === engine.tickCount)) moving = true;
  const heroMesh = meshes.get('player')!;
  heroMesh.position.set(wx, moving ? Math.abs(Math.sin(t * 9)) * 0.07 : 0, wz); // walk bob
  if (mv && mv.from && mv.to) heroMesh.rotation.y = Math.atan2(mv.to.x - mv.from.x, mv.to.y - mv.from.y);
  animateWalk(heroMesh, t, moving);

  // fade out click markers
  for (let i = markers.length - 1; i >= 0; i--) {
    const mk = markers[i]!; const age = t - mk.born; const s = 1 + age * 3;
    mk.mesh.scale.set(s, s, s);
    (mk.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age / 0.5);
    if (age > 0.5) { scene.remove(mk.mesh); markers.splice(i, 1); }
  }

  // run a pending interaction once we've walked adjacent to the target
  if (pending && (!mv || mv.path.length === 0)) {
    const ent = world.entities.get(pending.id);
    if (ent && ent.tile && Math.max(Math.abs(player.tile.x - ent.tile.x), Math.abs(player.tile.y - ent.tile.y)) <= 1) {
      runAction(pending.action, ent);
    }
    pending = null;
  }

  // orbit follow camera (drag/pinch/wheel controlled)
  camT.lerp(new THREE.Vector3(wx, 1.0, wz), 0.15);
  camera.position.set(
    camT.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.th),
    camT.y + sph.r * Math.cos(sph.phi),
    camT.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.th));
  camera.lookAt(camT);
  renderer.render(scene, camera);
}
animate();

(window as unknown as { __game: unknown }).__game = { engine, world, player, meshes };
