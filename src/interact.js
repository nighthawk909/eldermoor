/* =====================================================================
   ELDERMOOR - interaction module. Owns the click marker, the shared
   clickTargets registry, picking (pickAt), the default-action handler
   (worldClick), the context menu (openMenu / closeMenu), and the
   engage / walkTo / examine commands.
   ===================================================================== */
import { canvas, scene, camera, col, buzz } from './engine.js';
import { clampX, clampZ, planPath, astar, staticBlocked } from './world.js';
import { NPCS, OBJECTS } from './npc.js';
import { move, pos } from './player.js';
import { talk, sayLines } from './dialogue.js';

/* shared registry of raycast proxies (NPCs, objects, scenery) - pushed to by npc.js
   and world.place(); read by pickAt. A plain exported array, mutated in place. */
export const clickTargets = [];

/* click marker - fading ring where you tapped (yellow=walk, cyan=interact) */
export const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.16, 0.34, 24),
  new THREE.MeshBasicMaterial({color: col('#ffe27a'), transparent:true, side:THREE.DoubleSide}));
marker.rotation.x = -Math.PI/2; marker.visible = false; scene.add(marker);
let markerT = 0;
export function showMarker(x, z, hex){
  marker.material.color.copy(col(hex));
  marker.position.set(x, 0.04, z); marker.visible = true; markerT = 1; marker.scale.setScalar(1);
}
export function markerStep(dt){   // per-frame fade/scale (called from player.simStep while visible)
  markerT -= dt*1.1; marker.material.opacity = Math.max(0, markerT);
  marker.scale.setScalar(1 + (1-markerT)*0.5);
  if(markerT <= 0) marker.visible = false;
  if(xMarker.visible) xMarkerStep(dt);   // piggy-back the red-X fade on the same per-frame hook (OW6/OW+5)
}

/* red "X" can't-reach marker (OW6 / OW+5) - a literal cross (two crossed bars), distinct
   from the walk/interact ring, that flashes over an unreachable tile/target. Self-contained
   fade timer driven from markerStep() above so no new per-frame hook is needed elsewhere. */
const xMarker = new THREE.Group();
(function buildXMarker(){
  const barGeo = new THREE.BoxGeometry(0.5, 0.05, 0.09);
  const mat = new THREE.MeshBasicMaterial({color: col('#ff4040'), transparent:true});
  const a = new THREE.Mesh(barGeo, mat); a.rotation.y =  Math.PI/4;
  const b = new THREE.Mesh(barGeo, mat.clone()); b.rotation.y = -Math.PI/4;
  xMarker.add(a, b);
})();
xMarker.rotation.x = 0; xMarker.visible = false; scene.add(xMarker);
let xMarkerT = 0;
export function showCantReach(x, z, msg){
  xMarker.position.set(x, 0.5, z); xMarker.visible = true; xMarkerT = 1; xMarker.scale.setScalar(1);
  if(window.EMHUD) EMHUD.addChat(msg || "I can't reach that.");
  buzz(24);
}
function xMarkerStep(dt){
  xMarkerT -= dt*0.9; const op = Math.max(0, xMarkerT);
  xMarker.children.forEach(c => c.material.opacity = op);
  if(xMarkerT <= 0) xMarker.visible = false;
}

/* ------------------------------------------------------------- picking / actions */
const ray = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
export function pickAt(px, py){
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((px-r.left)/r.width)*2-1, -((py-r.top)/r.height)*2+1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(clickTargets, false);
  const g = new THREE.Vector3();
  const ground = ray.ray.intersectPlane(groundPlane, g) ? {x:clampX(g.x), z:clampZ(g.z)} : null;
  let npc = hit.length ? hit[0].object.userData.npc : null;
  let obj = hit.length ? hit[0].object.userData.obj : null;
  let scenery = hit.length ? (hit[0].object.userData.scenery || null) : null;
  let mob = hit.length ? (hit[0].object.userData.mob || null) : null;
  if(!npc && !obj && !mob && ground){
    // forgiving tap-near-target: OSRS picks the NEAREST overlapping interactable, not a
    // hard type-priority order (OW+4) - so compare every candidate's distance to the tap
    // and keep the closest one, instead of always preferring NPC > object > scenery.
    let bestKind = null, bestEnt = null, bestD = Infinity;
    const consider = (kind, ent, d, cap) => { if(d < cap && d < bestD){ bestD = d; bestKind = kind; bestEnt = ent; } };
    const nNpc = NPCS.reduce((b,n) => { const d=Math.hypot(n.x-ground.x, n.z-ground.z); return (!b||d<b.d)?{n,d}:b; }, null);
    if(nNpc) consider('npc', nNpc.n, nNpc.d, 1.2);
    const nObj = OBJECTS.reduce((b,o) => { const d=Math.hypot(o.x-ground.x, o.z-ground.z); return (!b||d<b.d)?{o,d}:b; }, null);
    if(nObj) consider('obj', nObj.o, nObj.d, 1.0);
    for(const t of clickTargets){
      const s = t.userData && t.userData.scenery;
      if(s){ consider('scenery', s, Math.hypot(s.x-ground.x, s.z-ground.z), 1.2); continue; }
      const m = t.userData && t.userData.mob;      // mobs join the forgiving tap too -
      if(m && !m.dead)                             // a near-miss on a small rat should attack, not walk
        consider('mob', m, Math.hypot(m.x-ground.x, m.z-ground.z), 1.2);
    }
    if(bestKind === 'npc') npc = bestEnt;
    else if(bestKind === 'obj') obj = bestEnt;
    else if(bestKind === 'scenery') scenery = bestEnt;
    else if(bestKind === 'mob') mob = bestEnt;
  }
  return { npc, obj, scenery, mob, ground };
}
/* reachability check (OW6 / OW+5 / occlusion) - a real A* probe from the player's current
   position, the same router planPath() will use. Returns false if the target tile sits
   inside a wall/collider (occluded/unreachable) or no walkable route exists at all, so a
   walk-tap through geometry fails loudly instead of silently degrading into a stuck path. */
function isReachable(tx, tz){
  if(staticBlocked(tx, tz)) return false;          // tile itself is inside a wall/prop footprint
  return !!astar(pos.x, pos.z, tx, tz, null);       // a walkable route exists from here
}
export function worldClick(px, py){            // single tap = OSRS default action
  const { npc, obj, scenery, mob, ground } = pickAt(px, py);
  if(npc){ engage(npc); return; }
  if(obj){ engage(obj); return; }
  if(scenery){ engage(scenery); return; }
  if(mob){ if(window.EMGATE && !EMGATE.allow(mob)){ EMGATE.nudge(mob); return; } window.EMCOMBAT && EMCOMBAT.attack(mob); return; }
  if(ground) walkTo(ground);
}
export function engage(t){
  if(t && window.EMGATE && !EMGATE.allow(t)){ EMGATE.nudge(t); showMarker(t.x, t.z, '#ffe27a'); return; }  // lesson gate: nudge instead of acting
  if(t && !isReachable(t.x, t.z)){ showCantReach(t.x, t.z); return; }   // OW6/OW+5: no route to the target
  move.pending = t; move._lastGoal = {x:t.x, z:t.z}; planPath(t.x, t.z); showMarker(t.x, t.z, '#7fe0ff'); buzz(18);
}
export const engageNpc = engage;
export function walkTo(g){
  if(!isReachable(g.x, g.z)){ showCantReach(g.x, g.z); return; }        // OW6/OW+5/occlusion: blocked or unreachable tile
  move.pending = null; planPath(g.x, g.z); showMarker(g.x, g.z, '#ffe27a'); buzz(12);
}
export function examine(e){
  const data = (window.EMDATA && window.EMDATA.examine) || null;
  const nameKey = (e.name || '').toLowerCase();
  const text =
    e.examine ||
    (data && e.fixture && data[e.fixture]) ||
    (data && e.type && data[e.type]) ||
    (data && nameKey && data[nameKey]) ||
    ('It is a '+(e.name||'thing').toLowerCase()+'.');
  if(window.EMHUD){ EMHUD.addChat(text); }
  else { sayLines('Examine', [text]); }
}

/* ----------------------------------------------- context menu (long-press / right-click) */
const menuEl = document.getElementById('menu');
export function closeMenu(){ menuEl.style.display = 'none'; }
export function openMenu(px, py){
  const { npc, obj, scenery, mob, ground } = pickAt(px, py);
  const t = npc || obj || scenery || mob;
  const items = [];
  if(mob){ items.push(['Attack', ' '+mob.name, ()=>{ if(window.EMGATE && !EMGATE.allow(mob)){ EMGATE.nudge(mob); return; } window.EMCOMBAT && EMCOMBAT.attack(mob); }]);
           items.push(['Examine', ' '+mob.name, ()=>examine(mob)]); }
  if(npc){ items.push(['Talk-to', ' '+npc.name, ()=>engage(npc)]); }
  if(obj){ items.push([obj.verb || 'Use', ' '+obj.name, ()=>engage(obj)]); }
  if(scenery){ items.push([scenery.verb, ' '+scenery.name, ()=>engage(scenery)]);
               items.push(['Examine', ' '+scenery.name, ()=>examine(scenery)]); }
  if(t && !scenery && !mob){ items.push(['Examine', ' '+t.name, ()=>examine(t)]); }
  if(ground) items.push(['Walk here', '', ()=>walkTo(ground)]);
  items.push(['Cancel', '', ()=>{}]);
  menuEl.innerHTML = (t ? `<div class="hdr">${t.name}</div>` : '') +
    items.map((it,i)=>{
      const isCancel = it[0] === 'Cancel';                 // OW+2: Cancel is always red, always last
      const style = isCancel ? ' style="color:#ff5b5b"' : '';
      return `<div class="mi" data-i="${i}"><span class="o"${style}>${it[0]}</span>${it[1]}</div>`;
    }).join('');
  menuEl.querySelectorAll('.mi').forEach(el => { el.onclick = ev => { ev.stopPropagation(); items[+el.dataset.i][2](); closeMenu(); }; });
  menuEl.style.display = 'block';
  menuEl.style.left = Math.min(px, innerWidth  - menuEl.offsetWidth  - 6) + 'px';
  menuEl.style.top  = Math.min(py, innerHeight - menuEl.offsetHeight - 6) + 'px';
  buzz(20);
}
export { menuEl };

/* ----------------------------------------------- hover affordance (OW+1 / FEEL+4)
   OSRS-style top-left HUD label that previews the default action under the cursor
   ("Talk-to Brother Aldric", "Chop down Tree", "Walk here", ...) and switches the
   canvas cursor to a pointer over interactables. Read-only: it never calls
   preventDefault and skips entirely while a pointer button is held, so it cannot
   interfere with the camera-drag / tap / long-press / right-click handlers that
   input.js owns. Throttled to ~60ms to stay cheap. */
const hoverLabel = (() => {
  const el = document.createElement('div');
  el.id = 'hoverLabel';
  el.style.cssText =
    'position:fixed;left:8px;top:8px;z-index:9;pointer-events:none;display:none;' +
    'padding:4px 10px;background:rgba(18,22,28,.82);border:1px solid #c8a24a;border-radius:6px;' +
    'font-family:"Trebuchet MS","Segoe UI",system-ui,sans-serif;font-size:14px;color:#f3e9cf;' +
    'white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.5);text-shadow:0 1px 2px #000;';
  document.body.appendChild(el);
  return el;
})();

/* default verb + target for a pick result, mirroring worldClick\'s priority order */
function hoverAction(p){
  if(p.npc)     return { verb:'Talk-to', name:p.npc.name };
  if(p.obj)     return { verb:p.obj.verb || 'Use', name:p.obj.name };
  if(p.scenery) return { verb:p.scenery.verb || 'Use', name:p.scenery.name };
  if(p.mob)     return { verb:'Attack', name:p.mob.name };
  if(p.ground)  return { verb:'Walk here', name:'' };
  return null;
}

let _hoverLast = 0;
function onHoverMove(e){
  if(e.buttons){ return; }                       // a button is down → input.js is dragging; stay out of the way
  const now = (e.timeStamp || performance.now());
  if(now - _hoverLast < 60) return;              // throttle ~60ms
  _hoverLast = now;
  if(menuEl && menuEl.style.display === 'block'){ hoverLabel.style.display='none'; return; }
  const a = hoverAction(pickAt(e.clientX, e.clientY));
  if(!a){ hoverLabel.style.display='none'; canvas.style.cursor='default'; return; }
  const interactable = a.verb !== 'Walk here';
  hoverLabel.innerHTML = `<span style="color:#e7c64f">${a.verb}</span>${a.name ? ' '+a.name : ''}`;
  hoverLabel.style.display = 'block';
  canvas.style.cursor = interactable ? 'pointer' : 'default';
}
function onHoverLeave(){ hoverLabel.style.display='none'; canvas.style.cursor='default'; }

/* passive listeners - never preventDefault, additive to input.js\'s own handlers */
canvas.addEventListener('pointermove', onHoverMove, { passive:true });
canvas.addEventListener('pointerleave', onHoverLeave, { passive:true });
canvas.addEventListener('pointerdown', onHoverLeave, { passive:true });   // hide while interacting
