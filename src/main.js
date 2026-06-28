// main.js — the only orchestrator: builds the player, wires input + HUD, runs the loop.
import { scene, camera, renderer, canvas, gh, groundMesh, sea, initResize } from './engine.js';
import { makeChar, plate } from './characters.js';
import { addXp } from './skills.js';
import { addItem, hasItem } from './inventory.js';
import { initHud, initPanels, msg, showProgress, setProgress, hideProgress, showFinish } from './ui.js';
import { STN, buildWorld } from './world.js';
import { checkStep, showStep, beacon } from './quests.js';
import { dialog, hideDlg, initDialogue } from './dialogue.js';
import { engage, tickCombat, tickHits } from './combat.js';
const THREE = window.THREE;

/* ---------- player ---------- */
const player = makeChar({ tunic: '#3f6f8c', tabard: '#d8b25a', beard: '#4a3420' });
player.position.set(0, gh(0, 0), 0); scene.add(player);
player.add(plate('You', '#7fd0ff', 2.4));

/* ---------- HUD + input init ---------- */
initHud(); initPanels(); initDialogue(); initResize();
addItem('Tinderbox', 1);   // starting item (renders now that the inv listener is wired)
buildWorld();

/* ===================================================================== CAMERA */
const sph = { r: 13, th: 0.7, phi: 0.95 }; const camT = new THREE.Vector3();
function clampR() { sph.r = Math.max(6, Math.min(28, sph.r)); }
function updCam() {
  const t = player.position; camT.lerp(new THREE.Vector3(t.x, t.y + 1.0, t.z), 0.12);
  camera.position.set(camT.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.th), camT.y + sph.r * Math.cos(sph.phi), camT.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.th));
  camera.lookAt(camT);
}
const ptr = new Map(); let down = null, dragged = false, pinch = null;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size === 1) { down = { x: e.clientX, y: e.clientY }; dragged = false; } if (ptr.size === 2) pinch = pd();
});
canvas.addEventListener('pointermove', e => {
  if (!ptr.has(e.pointerId)) return; const pv = ptr.get(e.pointerId);
  const dx = e.clientX - pv.x, dy = e.clientY - pv.y; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size === 2) { const d = pd(); if (pinch) sph.r *= pinch / d; clampR(); pinch = d; return; }
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) dragged = true;
  sph.th -= dx * 0.005; sph.phi = Math.max(0.4, Math.min(1.35, sph.phi - dy * 0.005));
});
canvas.addEventListener('pointerup', e => {
  const two = ptr.size === 2; ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null;
  if (!two && !dragged && down) click(down.x, down.y); if (ptr.size === 0) down = null;
});
canvas.addEventListener('wheel', e => { sph.r *= 1 + e.deltaY * 0.0012; clampR(); e.preventDefault(); }, { passive: false });
function pd() { const v = [...ptr.values()]; return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); }

/* ===================================================================== CLICK / ACTIONS */
const ray = new THREE.Raycaster();
function click(px, py) {
  const ndc = new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight * 2) + 1); ray.setFromCamera(ndc, camera);
  const objs = STN.filter(s => s.kind !== 'deco' && s.alive !== false).map(s => s.obj);
  const hit = ray.intersectObjects(objs, true);
  if (hit.length) {
    let o = hit[0].object; while (o.parent && !STN.find(s => s.obj === o)) o = o.parent;
    const st = STN.find(s => s.obj === o); if (st) { player.target = new THREE.Vector2(st.pos.x, st.pos.z); player.pending = st; hideDlg(); return; }
  }
  const g = ray.intersectObject(groundMesh);
  if (g.length) {
    const p = g[0].point;
    // Forgiving targeting: a tap on or near a station interacts with it (low-poly
    // objects are small on screen; a near-miss should not silently walk you past them).
    let near = null, nd = Infinity;
    for (const s of STN) {
      if (s.kind === 'deco' || s.alive === false) continue;
      const dd = Math.hypot(s.pos.x - p.x, s.pos.z - p.z);
      if (dd < (s.hitR || 1.6) && dd < nd) { nd = dd; near = s; }
    }
    if (near) { player.target = new THREE.Vector2(near.pos.x, near.pos.z); player.pending = near; hideDlg(); return; }
    player.target = new THREE.Vector2(p.x, p.z); player.pending = null;
  }
}

let action = null; // { st, t, dur }
function startAction(st) {
  if (st.kind === 'npc') { dialog(st); return; }
  if (st.kind === 'finish') { showFinish(); return; }
  if (st.kind === 'combat') { engage(player, st); return; }
  if (st.need && !hasItem(st.need)) { msg(`You need ${st.need} first.`); return; }
  action = { st, t: 0, dur: st.dur || 1500 }; showProgress();
  msg(`You ${st.verb} the ${st.label}…`);
}
function finishAction(st) {
  if (st.need) addItem(st.need, -1);
  if (st.give) addItem(st.give, 1);
  if (st.skill) addXp(st.skill, st.xp);
  if (st.give) msg(`You get: ${st.give}.`);
  checkStep(st.skill || st.id); checkStep(st.id);
}

/* ===================================================================== LOOP */
const clock = new THREE.Clock(); let walkP = 0;
function animate() {
  requestAnimationFrame(animate); const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  // movement
  let moving = false;
  if (player.target) {
    const dx = player.target.x - player.position.x, dz = player.target.y - player.position.z, d = Math.hypot(dx, dz);
    const stopDist = player.pending ? 1.6 : 0.15;
    if (d > stopDist) {
      moving = true; const sp = Math.min(3.6 * dt / d, 1); player.position.x += dx * sp; player.position.z += dz * sp;
      player.position.y = gh(player.position.x, player.position.z); player.rotation.y = Math.atan2(dx, dz);
    } else {
      player.target = null;
      if (player.pending) { const st = player.pending; player.pending = null; player.rotation.y = Math.atan2(st.pos.x - player.position.x, st.pos.z - player.position.z); startAction(st); }
    }
  }
  // walk anim
  const u = player.userData;
  if (moving) { walkP += dt * 9; const s = Math.sin(walkP) * 0.6; u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.6; u.armR.rotation.x = s * 0.6; }
  else { u.legL.rotation.x *= 0.8; u.legR.rotation.x *= 0.8; u.armL.rotation.x *= 0.8; u.armR.rotation.x *= 0.8; }
  // action progress
  if (action) {
    action.t += dt * 1000; setProgress(Math.min(100, action.t / action.dur * 100)); // dur is in ms; dt is seconds
    u.armR.rotation.x = Math.sin(t * 16) * 0.7; // working motion
    if (action.t >= action.dur) { const st = action.st; action = null; hideProgress(); finishAction(st); }
  }
  // combat
  tickCombat(player, dt, u);
  // ambient anim
  STN.forEach(s => {
    if (s.obj.userData.flame) { const f = 0.85 + Math.sin(t * 18) * 0.12; s.obj.userData.flame.scale.set(f, 1 + Math.sin(t * 22) * 0.2, f); }
    if (s.obj.userData.ring) s.obj.userData.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.15);
  });
  if (sea) sea.material.opacity = 0.85 + Math.sin(t * 1.5) * 0.05;
  beacon.rotation.y = t * 1.2; beacon.material.opacity = 0.2 + Math.sin(t * 3) * 0.08;
  tickHits(dt);
  updCam(); renderer.render(scene, camera);
}

showStep(); updCam(); animate();
setTimeout(() => { const h = document.getElementById('hint'); h.style.opacity = 0; setTimeout(() => h.remove(), 600); }, 4200);

// dev hook (localhost or ?dbg) — for debugging/automation only; inert in production
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.search.includes('dbg')) {
  window.__EM = { STN, player, startAction, dialog, checkStep, click, camera, groundMesh, scene, get action() { return action; } };
}
