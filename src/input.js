/* =====================================================================
   ELDERMOOR - input module. Owns the spherical follow-camera state (sph /
   camT), the camera update (updCam), and every pointer / wheel / contextmenu
   handler. Listener registration is done via initInput(), called once from
   main.js so all side-effectful wiring stays centralized.
   ===================================================================== */
import { canvas, camera } from './engine.js';
import { pos } from './player.js';
import { worldClick, openMenu, closeMenu, menuEl } from './interact.js';

/* ============================================================= CAMERA + INPUT
   Custom spherical follow camera - proven mobile model: 1-finger drag orbits,
   2-finger pinch zooms, a tap (no drag) is a world click. */
export const sph = { r:11, th:0, phi:0.62 };          // th=0 → camera south of player, looking north
export const camT = new THREE.Vector3(pos.x, 1.1, pos.z);
const clampR = () => sph.r = Math.max(5, Math.min(22, sph.r));
export function updCam(){
  camT.lerp(new THREE.Vector3(pos.x, 1.1, pos.z), 0.15);
  camera.position.set(
    camT.x + sph.r*Math.sin(sph.phi)*Math.sin(sph.th),
    camT.y + sph.r*Math.cos(sph.phi),
    camT.z + sph.r*Math.sin(sph.phi)*Math.cos(sph.th));
  camera.lookAt(camT);
}
const ptr = new Map(); let down=null, dragged=false, pinch=null, holdTimer=null, consumed=false, midOrbit=false;
const pinchDist = () => { const v=[...ptr.values()]; return Math.hypot(v[0].x-v[1].x, v[0].y-v[1].y); };
const clearHold = () => { if(holdTimer){ clearTimeout(holdTimer); holdTimer=null; } };

/* ---- Keyboard camera control (CAM1/CAM+3): arrows + WASD orbit/pitch the
   camera at a steady radians-per-second rate, dt-scaled so it\'s FPS-independent.
   WASD is CAMERA-ONLY here - walking stays click-to-move. An internal rAF ticker
   drives the per-frame update so main.js needs no changes. */
const held = new Set();
const KEY_YAW_RATE = 1.6;   // rad/s for left/right (th)
const KEY_PITCH_RATE = 1.2; // rad/s for up/down (phi)
const typingInField = () => {
  const a = document.activeElement;
  if(!a) return false;
  const tag = a.tagName;
  return tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT' || a.isContentEditable;
};
export function updateCameraKeys(dt){
  if(held.size===0) return;
  let dth=0, dphi=0;
  if(held.has('arrowleft')  || held.has('a')) dth += 1;
  if(held.has('arrowright') || held.has('d')) dth -= 1;
  if(held.has('arrowup')    || held.has('w')) dphi += 1;  // tilt up toward overhead → smaller phi
  if(held.has('arrowdown')  || held.has('s')) dphi -= 1;
  if(dth)  sph.th += dth * KEY_YAW_RATE * dt;
  if(dphi) sph.phi = Math.max(0.30, Math.min(1.15, sph.phi - dphi * KEY_PITCH_RATE * dt));
}
let _kbLast = 0;
function _kbTick(now){
  requestAnimationFrame(_kbTick);
  const dt = Math.min((now - _kbLast)/1000, 0.05); _kbLast = now;
  updateCameraKeys(dt);
}

export function initInput(){
  canvas.addEventListener('pointerdown', e => {
    try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
    ptr.set(e.pointerId, {x:e.clientX, y:e.clientY});
    const menuWasOpen = menuEl.style.display==='block'; closeMenu();
    if(ptr.size===1){
      down={x:e.clientX, y:e.clientY}; dragged=false; consumed=menuWasOpen;
      midOrbit = (e.button===1);   // middle-mouse drag orbits like left-drag, no tap/hold-menu
      clearHold();
      if(!midOrbit) holdTimer = setTimeout(()=>{ if(!dragged && ptr.size===1){ openMenu(down.x, down.y); consumed=true; } }, 450);
    }
    if(ptr.size===2){ pinch = pinchDist(); clearHold(); }
  });
  canvas.addEventListener('pointermove', e => {
    if(!ptr.has(e.pointerId)) return;
    const pv = ptr.get(e.pointerId);
    const dx = e.clientX-pv.x, dy = e.clientY-pv.y;
    ptr.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(ptr.size===2){ const d=pinchDist(); if(pinch && d>0.001){ sph.r *= pinch/d; clampR(); } pinch=d; clearHold(); return; }
    if(down && Math.hypot(e.clientX-down.x, e.clientY-down.y) > 7){ dragged = true; clearHold(); }
    sph.th -= dx*0.005;
    sph.phi = Math.max(0.30, Math.min(1.15, sph.phi - dy*0.005));
  });
  canvas.addEventListener('pointerup', e => {
    clearHold();
    const two = ptr.size===2; ptr.delete(e.pointerId);
    if(ptr.size < 2) pinch = null;
    if(!two && !dragged && !consumed && !midOrbit && down) worldClick(down.x, down.y);   // single tap = default action
    if(ptr.size===0){ down = null; consumed=false; midOrbit=false; }
  });
  canvas.addEventListener('wheel', e => { sph.r *= 1 + e.deltaY*0.0012; clampR(); e.preventDefault(); }, {passive:false});
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); clearHold(); openMenu(e.clientX, e.clientY); consumed=true; });

  // Keyboard camera control - track held arrow/WASD keys; ignore while typing in a field.
  const CAM_KEYS = new Set(['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d']);
  window.addEventListener('keydown', e => {
    if(typingInField()) return;
    const k = e.key.toLowerCase();
    if(!CAM_KEYS.has(k)) return;
    held.add(k);
    if(k.startsWith('arrow')) e.preventDefault();   // stop arrows scrolling the page
  });
  window.addEventListener('keyup', e => { held.delete(e.key.toLowerCase()); });
  window.addEventListener('blur', () => held.clear());   // never get stuck-held on focus loss

  _kbLast = performance.now();
  requestAnimationFrame(_kbTick);
}
