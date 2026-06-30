/* =====================================================================
   ELDERMOOR - world module. Owns world bounds + colliders (BOUND / RECTS /
   CIRCLES / NPCCOLS), the collision predicates (staticBlocked / blocked /
   moveBlocked), the A* path grid (buildGrid / astar / smooth / replan /
   planPath and helpers), applyColliders, and the kit-piece library
   (PIECES / place / instanceManifest / scenery descriptors).
   ===================================================================== */
import { scene, dressMaterials } from './engine.js';
import { clickTargets } from './interact.js';
import { move, pos, player } from './player.js';

/* ----------------------------------------------------------- world bounds + colliders
   Loaded from the kit\'s <world>.colliders.json (see applyColliders): the building walls,
   prop footprints, walkable bounds and spawn all come from the asset pipeline - no hand-coded
   collision per building. RECTS/CIRCLES/BOUND start empty and are filled on load. */
export const RAD = 0.32;
export const BOUND = { x0:-7, x1:7, z0:-5, z1:14 };   // overwritten from JSON
export const clampX = x => Math.max(BOUND.x0, Math.min(BOUND.x1, x));
export const clampZ = z => Math.max(BOUND.z0, Math.min(BOUND.z1, z));
export const RECTS = [];               // static rectangular colliders (walls, prop footprints)
export const CIRCLES = [];             // static round obstacles (candles, tree trunks, ...)
export const NPCCOLS = [];             // DYNAMIC NPC body colliders (collision only - they move/wander)
const inBound = (x,z) => x>BOUND.x0 && x<BOUND.x1 && z>BOUND.z0 && z<BOUND.z1;
export function staticBlocked(x, z){   // out-of-bounds + walls + props (what the path grid is baked from)
  if(!inBound(x, z)) return true;
  for(const c of RECTS)   if(x > c.x0-RAD && x < c.x1+RAD && z > c.z0-RAD && z < c.z1+RAD) return true;
  for(const c of CIRCLES){ const dx=x-c.x, dz=z-c.z, rr=c.r+RAD; if(dx*dx+dz*dz < rr*rr) return true; }
  return false;
}
export function blocked(x, z, skip){   // static + dynamic NPCs (full collision)
  if(staticBlocked(x, z)) return true;
  for(const c of NPCCOLS){ if(c===skip) continue; const dx=x-c.x, dz=z-c.z, rr=c.r+RAD; if(dx*dx+dz*dz < rr*rr) return true; }
  return false;
}
/* like blocked(), but if you\'re already OVERLAPPING an NPC body it still lets you step
   AWAY from it - prevents getting permanently glued to a wandering NPC (every adjacent
   tile is inside its radius, so a plain blocked() check would reject all of them). */
export function moveBlocked(ox, oz, nx, nz){
  if(staticBlocked(nx, nz)) return true;                 // walls/bounds/props always hard-block
  if(typeof window !== 'undefined' && window.EMGATE && window.EMGATE.regionBlocked && window.EMGATE.regionBlocked(nx, nz)) return true;  // lesson-locked region
  for(const c of NPCCOLS){
    const rr = c.r + RAD, nd = (nx-c.x)*(nx-c.x) + (nz-c.z)*(nz-c.z);
    if(nd < rr*rr){                                       // new position overlaps this NPC
      const od = (ox-c.x)*(ox-c.x) + (oz-c.z)*(oz-c.z);
      if(nd <= od) return true;                           // block ONLY if not increasing distance
    }
  }
  return false;
}

/* -------------------------------------------------- A* pathfinding (static grid)
   The player routes around walls/pews/props instead of jamming into them. Grid is
   baked once from staticBlocked (obstacles inflated by RAD give body clearance). */
const G = { x0:-7.6, z0:-5.6, cell:0.45, cols:1, rows:1 };
const cellCenter = (ci,cj) => ({ x:G.x0+(ci+0.5)*G.cell, z:G.z0+(cj+0.5)*G.cell });
const cellOf = (x,z) => ({ ci:Math.floor((x-G.x0)/G.cell), cj:Math.floor((z-G.z0)/G.cell) });
const inb = (ci,cj) => ci>=0 && cj>=0 && ci<G.cols && cj<G.rows;
let WALK = [];
export function buildGrid(){                       // (re)bake from BOUND + static colliders
  G.x0 = BOUND.x0 - 0.5; G.z0 = BOUND.z0 - 0.5;
  G.cols = Math.ceil((BOUND.x1-BOUND.x0+1)/G.cell);
  G.rows = Math.ceil((BOUND.z1-BOUND.z0+1)/G.cell);
  WALK = [];
  for(let ci=0; ci<G.cols; ci++){ WALK[ci]=[]; for(let cj=0; cj<G.rows; cj++){
    const c = cellCenter(ci,cj); WALK[ci][cj] = !staticBlocked(c.x, c.z); } }
}
function cellWalkable(ci,cj, ignoreCol){   // static grid + dynamic NPC bodies (except the one we\'re walking to)
  if(!WALK[ci][cj]) return false;
  const c = cellCenter(ci,cj);
  for(const col of NPCCOLS){ if(col===ignoreCol) continue;
    const dx=c.x-col.x, dz=c.z-col.z, rr=col.r+RAD; if(dx*dx+dz*dz < rr*rr) return false; }
  return true;
}
function nearestWalkable(t, ignoreCol){
  for(let rad=1; rad<10; rad++) for(let dx=-rad; dx<=rad; dx++) for(let dz=-rad; dz<=rad; dz++){
    const ci=t.ci+dx, cj=t.cj+dz; if(inb(ci,cj) && cellWalkable(ci,cj,ignoreCol)) return {ci,cj}; }
  return null;
}
export function lineClear(ax,az,bx,bz){          // segment vs static obstacles (for LOS + chat gate)
  const d=Math.hypot(bx-ax,bz-az), steps=Math.max(1,Math.ceil(d/0.2));
  for(let i=1;i<steps;i++){ const t=i/steps; if(staticBlocked(ax+(bx-ax)*t, az+(bz-az)*t)) return false; }
  return true;
}
export function astar(sx,sz, tx,tz, ignoreCol){
  const W = (ci,cj) => cellWalkable(ci,cj, ignoreCol);
  let s=cellOf(sx,sz), t=cellOf(tx,tz);
  if(!inb(s.ci,s.cj)) return null;
  if(!inb(t.ci,t.cj) || !W(t.ci,t.cj)){ const nw=nearestWalkable(t,ignoreCol); if(!nw) return null; t=nw; }
  if(!W(s.ci,s.cj)){ const nw=nearestWalkable(s,ignoreCol); if(nw) s=nw; }
  const key=(ci,cj)=>ci*1000+cj, open=new Map(), came=new Map(), gsc=new Map();
  const h=(ci,cj)=>Math.hypot(ci-t.ci, cj-t.cj);
  gsc.set(key(s.ci,s.cj),0); open.set(key(s.ci,s.cj),{ci:s.ci,cj:s.cj,f:h(s.ci,s.cj)});
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let guard=0;
  while(open.size && guard++<6000){
    let bk=null,bf=Infinity; for(const [k,v] of open){ if(v.f<bf){bf=v.f; bk=k;} }
    const cur=open.get(bk); open.delete(bk);
    if(cur.ci===t.ci && cur.cj===t.cj){
      const path=[]; let k=bk;
      while(k!==undefined){ path.unshift(cellCenter(Math.floor(k/1000), k%1000)); k=came.get(k); }
      return path;
    }
    const cg=gsc.get(bk);
    for(const [dx,dz] of dirs){
      const ni=cur.ci+dx, nj=cur.cj+dz; if(!inb(ni,nj)||!W(ni,nj)) continue;
      if(dx&&dz && (!W(cur.ci+dx,cur.cj) || !W(cur.ci,cur.cj+dz))) continue;  // no corner cutting
      const nk=key(ni,nj), ng=cg+((dx&&dz)?1.414:1);
      if(!gsc.has(nk) || ng<gsc.get(nk)){ gsc.set(nk,ng); came.set(nk,bk); open.set(nk,{ci:ni,cj:nj,f:ng+h(ni,nj)}); }
    }
  }
  return null;
}
function segClear(ax,az,bx,bz, ignoreCol){  // segment vs static + NPC bodies (for path smoothing)
  const d=Math.hypot(bx-ax,bz-az), steps=Math.max(1,Math.ceil(d/0.22));
  for(let i=1;i<steps;i++){ const t=i/steps; if(blocked(ax+(bx-ax)*t, az+(bz-az)*t, ignoreCol)) return false; }
  return true;
}
export function smooth(path, ignoreCol){          // string-pull: drop waypoints with a clear line between
  if(!path || path.length<3) return path;
  const out=[path[0]]; let i=0;
  while(i<path.length-1){ let j=path.length-1;
    while(j>i+1 && !segClear(path[i].x,path[i].z, path[j].x,path[j].z, ignoreCol)) j--;
    out.push(path[j]); i=j; }
  return out;
}
export function replan(){
  const ignore = move.pending && move.pending._col;   // can still reach the NPC we\'re walking to
  const raw = astar(pos.x,pos.z, move.dest.x, move.dest.z, ignore);
  move.path = (raw && raw.length) ? smooth(raw, ignore) : [{x:move.dest.x, z:move.dest.z}];
  move.wp = 0;
}
export function planPath(tx,tz){            // new player command → fresh path + reset replan budget
  move.dest = {x:clampX(tx), z:clampZ(tz)}; move._replan = 0; replan();
}

/* the world's spawn point (x, z, facing) - captured from the colliders sidecar so
   death/respawn (CBT death model) can return the player here without hand-coding
   a duplicate coordinate. Defaults to the player module's built-in fallback spawn
   until applyColliders() runs. */
export const SPAWN = { x: pos.x, z: pos.z, ry: player.rotation.y };

/* reset the player to the world spawn point (used by applyColliders on load AND by
   combat.js on player death/respawn - same honest "teleport home" semantics both times). */
export function respawnAtSpawn(){
  pos.set(SPAWN.x, 0, SPAWN.z); player.position.copy(pos);
  player.rotation.y = SPAWN.ry || 0; move.path = []; move.pending = null; move.moving = false;
}

/* apply the kit\'s collider/nav sidecar: walls, props, bounds, spawn, then bake the path grid */
export function applyColliders(data){
  if(data.bound){ const b=data.bound; BOUND.x0=b[0]; BOUND.x1=b[1]; BOUND.z0=b[2]; BOUND.z1=b[3]; }
  (data.rects   || []).forEach(r => RECTS.push({x0:r[0], x1:r[1], z0:r[2], z1:r[3]}));
  (data.circles || []).forEach(c => CIRCLES.push({x:c[0], z:c[1], r:c[2]}));
  if(data.spawn){ SPAWN.x = data.spawn[0]; SPAWN.z = data.spawn[1]; SPAWN.ry = data.spawn[2] || 0;
    respawnAtSpawn(); }
  buildGrid();
}

/* ---------------- kit-piece library + manifest instancing -------------------
   one glb per piece, cloned at every placement the world manifest lists. This is how the
   island scales by DATA - drop instances, not geometry. */
export const PIECES = {
  tree: { url:'assets/kit/tree.glb', r:0.42, tpl:null },
  bush: { url:'assets/kit/bush.glb', r:0.30, tpl:null },
  rock: { url:'assets/kit/rock.glb', r:0.40, tpl:null },
};
export const mulberry32 = a => () => { a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
/* scenery descriptors by piece type - interactable like NPCs/altar (proxy + clickTargets) */
export const SCENERY_DESC = {
  tree: { name:'Tree', verb:'Chop down', examine:'A sturdy tree, ripe for the Survival Expert\'s axe.' },
  bush: { name:'Bush', verb:'Search',    examine:'A leafy bush.' },
  rock: { name:'Rock', verb:'Mine',      examine:'A rocky outcrop streaked with ore.' },
};
/* live registry of gatherable scenery nodes + per-type respawn timing (seconds) */
export const SCENERY_NODES = [];
export const RESPAWN_SECS = { tree:4, bush:3, rock:3 };
export function place(type, x, z, rot, s){
  const p = PIECES[type]; if(!p || !p.tpl) return;
  const inst = p.tpl.clone(true); inst.position.set(x, 0, z); inst.rotation.y = rot; inst.scale.setScalar(s);
  scene.add(inst); const collider = { x, z, r:p.r*s }; CIRCLES.push(collider);
  const desc = SCENERY_DESC[type];
  if(desc){                                                  // invisible click proxy (same pattern as NPC/altar)
    const rad = Math.max(0.4, p.r*s);
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 2.0, 8), new THREE.MeshBasicMaterial({visible:false}));
    proxy.position.set(x, 1.0, z);
    const node = Object.assign({}, desc, { x, z, talkRange:1.6, kind:'scenery', type,
      depleted:false, baseScale:s });                       // gather-node state lives ON the scenery object
    node._inst = inst; node._proxy = proxy; node._collider = collider;   // back-references for deplete/respawn
    proxy.userData.scenery = node;
    SCENERY_NODES.push(node);
    scene.add(proxy); clickTargets.push(proxy);
  }
}
/* ---------------- interactable FIXTURES (skilling targets) ------------------
   Simple THREE-built props (no glb needed) that the skilling engine (window.EMSKILL)
   targets by verb: fishing-spot/Net, fire/Cook, furnace/Smelt, anvil/Smith. Same proxy +
   clickTargets pattern as scenery, but registered as kind:'scenery' with a `fixture` tag so
   the interaction layer treats them like any gather/skill node. Colliders are kept small or
   omitted so they don\'t choke pathfinding (you must be able to stand at them). */
export const FIXTURE_DESC = {
  'fishing-spot': { name:'Fishing spot', verb:'Net',   examine:'Ripples break the surface - fish are here.', color:0x2c6a82, r:0,    h:0.05, opacity:0.55 },
  'fire':         { name:'Fire',         verb:'Cook',  examine:'A crackling fire, hot enough to cook on.',    color:0xd86a2c, r:0.28, h:0.4,  opacity:1 },
  'furnace':      { name:'Furnace',      verb:'Smelt', examine:'A stone furnace roaring with heat.',          color:0x8c6b40, r:0.5,  h:1.1,  opacity:1 },
  'anvil':        { name:'Anvil',        verb:'Smith', examine:'A heavy iron anvil, scarred from the hammer.',color:0x4a4f57, r:0.4,  h:0.6,  opacity:1 },
  'bank-booth':   { name:'Bank booth',   verb:'Bank',  examine:'A sturdy wooden booth - a banker waits inside.', color:0x8c6b40, r:0.35, h:0.9,  opacity:1 },
  'poll-booth':   { name:'Poll booth',   verb:'Vote',  examine:'A small wooden booth for casting your vote.',    color:0x7a5c30, r:0.30, h:0.85, opacity:1 },
};
/* live registry of placed fixtures (parallels SCENERY_NODES) */
export const FIXTURE_NODES = [];
export function placeFixture(type, x, z){
  const d = FIXTURE_DESC[type]; if(!d) return null;
  // simple visual mesh
  const geo = (type === 'fishing-spot')
    ? new THREE.CircleGeometry(0.6, 12)
    : new THREE.CylinderGeometry(d.r || 0.3, (d.r || 0.3) * 1.15, d.h, 8);
  const mat = new THREE.MeshStandardMaterial({ color:d.color,
    transparent:d.opacity < 1, opacity:d.opacity,
    emissive:(type === 'fire') ? 0x802000 : 0x000000 });
  const inst = new THREE.Mesh(geo, mat);
  if(type === 'fishing-spot'){ inst.rotation.x = -Math.PI/2; inst.position.set(x, 0.02, z); }
  else { inst.position.set(x, d.h/2, z); }
  scene.add(inst);
  // small collider only for solid fixtures (furnace/anvil); spots/fire are non-blocking
  let collider = null;
  if(d.r > 0.3){ collider = { x, z, r:d.r }; CIRCLES.push(collider); }
  // invisible click proxy (same shape as scenery proxies)
  const rad = Math.max(0.5, d.r || 0.5);
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 2.0, 8),
    new THREE.MeshBasicMaterial({ visible:false }));
  proxy.position.set(x, 1.0, z);
  const node = { name:d.name, verb:d.verb, examine:d.examine, x, z,
    talkRange:1.6, kind:'scenery', fixture:type };
  node._inst = inst; node._proxy = proxy; node._collider = collider;
  proxy.userData.scenery = node;
  FIXTURE_NODES.push(node);
  scene.add(proxy); clickTargets.push(proxy);
  return node;
}
export function instanceManifest(data){
  (data.objects || []).forEach(o => place(o.type, o.x, o.z, o.rot||0, o.scale||1));   // explicit placements
  (data.scatter || []).forEach(s => {                                                  // procedural fill
    if(!PIECES[s.type] || !PIECES[s.type].tpl) return;
    const rnd = mulberry32(s.seed||1), ex = s.exclude, sp = s.spacing||1.4;
    let placed=0, tries=0, cap=(s.count||20)*10;
    while(placed < (s.count||20) && tries < cap){
      tries++;
      const x = s.x0 + (s.x1-s.x0)*rnd(), z = s.z0 + (s.z1-s.z0)*rnd();
      if(staticBlocked(x,z)) continue;                                                 // skip walls/props/path-not, OOB
      if(ex && x>ex[0] && x<ex[1] && z>ex[2] && z<ex[3]) continue;                      // keep the path clear
      let ok=true; for(const c of CIRCLES){ if((c.x-x)*(c.x-x)+(c.z-z)*(c.z-z) < sp*sp){ ok=false; break; } }
      if(!ok) continue;                                                                // min spacing
      place(s.type, x, z, rnd()*Math.PI*2, (s.sMin||0.8) + ((s.sMax||1.2)-(s.sMin||0.8))*rnd());
      placed++;
    }
  });
  // default in-world skilling fixtures near the pond / grounds (data may override via data.fixtures)
  if(data.fixtures){ data.fixtures.forEach(f => placeFixture(f.type, f.x, f.z)); }
  else { placeFixture('fishing-spot', 4.5, 10.5); placeFixture('fire', 3.2, 9.0); }
  // bank-booth + poll-booth in the grounds near the spawn area
  placeFixture('bank-booth', -5, 2);
  placeFixture('poll-booth', -6, 2);
  // default mobs
  placeMob('giant-rat', -3, 6, 'Giant Rat');
  buildGrid();                                       // rebake the path grid with all the new colliders
}

/* ---------------- attackable mobs (NPC3/CBT) --------------------------------
   placeMob() drops a small rat-like creature mesh + an invisible click proxy.
   The proxy carries userData.mob so the interaction layer can pick it up.
   Mobs are non-blocking (no CIRCLES entry) so pathfinding is unaffected.
   All placed mobs are tracked in MOB_NODES and exposed via window.EMMOB.   */
export const MOB_NODES = [];

/* Build a minimal low-poly rat-like body from THREE primitives.
   Returns a THREE.Group positioned at (x, 0, z). */
function _buildRatMesh(x, z){
  const g = new THREE.Group();
  // body - squat flattened box
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.40, 0.20, 0.60),
    new THREE.MeshStandardMaterial({ color:0x6b5240, flatShading:true })
  );
  body.position.set(0, 0.12, 0);
  g.add(body);
  // head - small cube pushed forward
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.22),
    new THREE.MeshStandardMaterial({ color:0x6b5240, flatShading:true })
  );
  head.position.set(0, 0.22, 0.30);
  g.add(head);
  // snout - tiny box
  const snout = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.08, 0.12),
    new THREE.MeshStandardMaterial({ color:0x7a6050, flatShading:true })
  );
  snout.position.set(0, 0.19, 0.41);
  g.add(snout);
  // tail - thin elongated box
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.38),
    new THREE.MeshStandardMaterial({ color:0x503c2c, flatShading:true })
  );
  tail.position.set(0, 0.10, -0.38);
  g.add(tail);
  g.position.set(x, 0, z);
  return g;
}

export function placeMob(id, x, z, name){
  const label = name || id;
  // visual mesh
  const inst = _buildRatMesh(x, z);
  scene.add(inst);
  // invisible click proxy (cylinder, same pattern as NPC/scenery)
  const proxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8),
    new THREE.MeshBasicMaterial({ visible:false })
  );
  proxy.position.set(x, 0.7, z);
  const node = { id, name:label, x, z, talkRange:1.4, kind:'mob', _inst:inst, _proxy:proxy };
  proxy.userData.mob = { id, name:label, x, z, talkRange:1.4, kind:'mob' };
  MOB_NODES.push(node);
  scene.add(proxy);
  clickTargets.push(proxy);
  return node;
}

/* ---------------- resource-node depletion + respawn -----------------------
   Gather actions (chop/mine/search) call gatherNode() / deplete() to consume a
   node: it dims+shrinks the visual, pulls its click proxy out of clickTargets
   (so it can\'t be re-engaged), and starts a per-type respawn timer. tickRespawns(dt)
   (driven by the main loop) restores it when the timer elapses. The collider is
   intentionally KEPT for simplicity - pathfinding/collision are untouched, since the
   path grid bakes from CIRCLES (unchanged) and clickTargets only drives picking. */
function _detachProxy(node){                          // remove from raycast + forgiving-tap scan
  if(!node._proxy) return;
  const i = clickTargets.indexOf(node._proxy);
  if(i >= 0) clickTargets.splice(i, 1);
  node._proxy.visible = false;
}
function _attachProxy(node){
  if(!node._proxy) return;
  if(clickTargets.indexOf(node._proxy) < 0) clickTargets.push(node._proxy);
  node._proxy.visible = true;
}
export function isDepleted(scenery){ return !!(scenery && scenery.depleted); }
export function deplete(scenery){
  if(!scenery || scenery.depleted) return false;
  scenery.depleted = true;
  scenery._respawn = RESPAWN_SECS[scenery.type] != null ? RESPAWN_SECS[scenery.type] : 4;
  _detachProxy(scenery);
  if(scenery._inst){                                  // visual feedback: shrink + dim (stump/depleted look)
    scenery._inst.scale.setScalar((scenery.baseScale || 1) * 0.35);
    scenery._inst.traverse(o => { if(o.material){
      if(o.userData._gOpacity === undefined){ o.userData._gOpacity = o.material.opacity; o.userData._gTrans = o.material.transparent; }
      o.material.transparent = true; o.material.opacity = 0.35; } });
  }
  return true;
}
function _restore(node){
  node.depleted = false; node._respawn = 0;
  if(node._inst){
    node._inst.scale.setScalar(node.baseScale || 1);
    node._inst.traverse(o => { if(o.material && o.userData._gOpacity !== undefined){
      o.material.opacity = o.userData._gOpacity; o.material.transparent = o.userData._gTrans; } });
  }
  _attachProxy(node);
}
/* public gather entry: accept a scenery object or its proxy mesh; deplete + return ok */
export function gatherNode(proxyOrId){
  if(!proxyOrId) return false;
  const node = (proxyOrId.kind === 'scenery') ? proxyOrId
             : (proxyOrId.userData && proxyOrId.userData.scenery) || null;
  return node ? deplete(node) : false;
}
/* main-loop hook: advance respawn timers; restore nodes whose timer has elapsed */
export function tickRespawns(dt){
  if(!(dt > 0)) return;
  for(const node of SCENERY_NODES){
    if(!node.depleted) continue;
    node._respawn -= dt;
    if(node._respawn <= 0) _restore(node);
  }
}
/* expose the depletion model on window for the main loop + gather actions */
if(typeof window !== 'undefined'){
  window.EMWORLD = Object.assign(window.EMWORLD || {}, {
    deplete, isDepleted, tickRespawns, gatherNode, nodes: SCENERY_NODES });
  window.EMMOB = { place: placeMob, nodes: MOB_NODES };
}
