/* =====================================================================
   ELDERMOOR - world module. Owns world bounds + colliders (BOUND / RECTS /
   CIRCLES / NPCCOLS), the collision predicates (staticBlocked / blocked /
   moveBlocked), the A* path grid (buildGrid / astar / smooth / replan /
   planPath and helpers), applyColliders, and the kit-piece library
   (PIECES / place / instanceManifest / scenery descriptors).
   ===================================================================== */
import { scene, dressMaterials, TEX, registerRoof } from './engine.js';
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
export const DOOR_GAPS = [];           // door openings force-carved WALKABLE in the A* grid (see buildGrid),
                                       // so a solid-walled building is always enterable through its door
                                       // regardless of gap-vs-cell alignment / RAD inflation.
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
  if(typeof window !== 'undefined' && window.EMDOORS && window.EMDOORS.blocks && window.EMDOORS.blocks(nx, nz)) return true;           // a shut door/gate blocks its gap
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
  // force door openings walkable so a solid-walled building is always enterable through
  // its door (the RAD-inflated wall segments can otherwise pinch a narrow gap shut in the grid).
  for(const g of DOOR_GAPS){
    for(let ci=0; ci<G.cols; ci++) for(let cj=0; cj<G.rows; cj++){
      const c = cellCenter(ci,cj);
      if(c.x>=g.x0 && c.x<=g.x1 && c.z>=g.z0 && c.z<=g.z1) WALK[ci][cj] = true;
    }
  }
}
function cellWalkable(ci,cj, ignoreCol){   // static grid + dynamic NPC bodies (except the one we\'re walking to)
  if(!inb(ci,cj) || !WALK[ci] || !WALK[ci][cj]) return false;   // BUG+7: guard edge/OOB cells (no "undefined" throw at the BOUND edge)
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
  // BUG+6 fix: encode with the LIVE row count (cj always < G.rows), not a fixed 1000,
  // so cell keys never alias once the world grows past 1000 cols/rows (world-scale mandate).
  const KR = G.rows;
  const key=(ci,cj)=>ci*KR+cj, open=new Map(), came=new Map(), gsc=new Map();
  const h=(ci,cj)=>Math.hypot(ci-t.ci, cj-t.cj);
  gsc.set(key(s.ci,s.cj),0); open.set(key(s.ci,s.cj),{ci:s.ci,cj:s.cj,f:h(s.ci,s.cj)});
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let guard=0;
  while(open.size && guard++<6000){
    let bk=null,bf=Infinity; for(const [k,v] of open){ if(v.f<bf){bf=v.f; bk=k;} }
    const cur=open.get(bk); open.delete(bk);
    if(cur.ci===t.ci && cur.cj===t.cj){
      const path=[]; let k=bk;
      while(k!==undefined){ path.unshift(cellCenter(Math.floor(k/KR), k%KR)); k=came.get(k); }
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
// NOTE: literal defaults — must NOT read pos/player at module top level. world.js and
// player.js import each other; evaluating this before player.js finishes init throws a TDZ
// ("Cannot access 'pos' before initialization") that bricks the entire boot. These match
// player.js's fallback spawn and are overwritten from the colliders JSON in applyColliders().
export const SPAWN = { x: 0, z: 8.5, ry: Math.PI };

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
  // zone fixtures (Blender-authored, exported v42) — small colliders so you can stand at them
  range:      { url:'assets/kit/range.glb',      r:0.45, tpl:null },
  furnace:    { url:'assets/kit/furnace.glb',    r:0.55, tpl:null },
  anvil:      { url:'assets/kit/anvil.glb',      r:0.45, tpl:null },
  bank_booth: { url:'assets/kit/bank_booth.glb', r:0.55, tpl:null },
  altar:      { url:'assets/kit/altar.glb',      r:0.55, tpl:null },
  ladder:     { url:'assets/kit/ladder.glb',     r:0.30, tpl:null },
  signpost:   { url:'assets/kit/signpost.glb',   r:0.20, tpl:null },
  dock:       { url:'assets/kit/dock.glb',       r:0.30, tpl:null },
  rat_pen_gate:{ url:'assets/kit/rat_pen_gate.glb', r:0.45, tpl:null },
  target_butt:{ url:'assets/kit/target_butt.glb', r:0.35, tpl:null },
  rune_rack:  { url:'assets/kit/rune_rack.glb',   r:0.35, tpl:null },
  boat:       { url:'assets/kit/boat.glb',        r:0.30, tpl:null },
};
export const mulberry32 = a => () => { a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
/* scenery descriptors by piece type - interactable like NPCs/altar (proxy + clickTargets) */
export const SCENERY_DESC = {
  tree: { name:'Tree', verb:'Chop down', examine:'A sturdy tree, ripe for the Survival Expert\'s axe.' },
  bush: { name:'Bush', verb:'Search',    examine:'A leafy bush.' },
  rock: { name:'Rock', verb:'Mine',      examine:'A rocky outcrop streaked with ore.' },
  // departure point (tutorial L17): the dock is the reachable board-point; the boat sits at the
  // world edge as its backdrop. Both carry verb 'Board' so arrive() can fire the `departed` flag.
  dock: { name:'Ferry dock', verb:'Board', examine:'The ferry to the mainland waits here. Board it when you are ready to leave.' },
  boat: { name:'Boat',       verb:'Board', examine:'A small boat that will carry you across to the mainland - your adventure begins.' },
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
  'range':        { name:'Cooking range',verb:'Cook',  examine:'A stone range with an iron grate for cooking.', color:0x8c6b40, r:0.45, h:0.9, opacity:1, pieceId:'range' },
  'furnace':      { name:'Furnace',      verb:'Smelt', examine:'A stone furnace roaring with heat.',          color:0x8c6b40, r:0.5,  h:1.1,  opacity:1, pieceId:'furnace' },
  'anvil':        { name:'Anvil',        verb:'Smith', examine:'A heavy iron anvil, scarred from the hammer.',color:0x4a4f57, r:0.4,  h:0.6,  opacity:1, pieceId:'anvil' },
  'bank-booth':   { name:'Bank booth',   verb:'Bank',  examine:'A sturdy wooden booth - a banker waits inside.', color:0x8c6b40, r:0.35, h:0.9,  opacity:1, pieceId:'bank_booth' },
  'poll-booth':   { name:'Poll booth',   verb:'Vote',  examine:'A small wooden booth for casting your vote.',    color:0x7a5c30, r:0.30, h:0.85, opacity:1 },
};
/* live registry of placed fixtures (parallels SCENERY_NODES) */
export const FIXTURE_NODES = [];
export function placeFixture(type, x, z){
  const d = FIXTURE_DESC[type]; if(!d) return null;
  // visual: prefer the Blender-authored kit mesh when available, else the simple primitive
  let inst;
  if(d.pieceId && PIECES[d.pieceId] && PIECES[d.pieceId].tpl){
    inst = PIECES[d.pieceId].tpl.clone(true);
    inst.position.set(x, 0, z);
  } else {
    const geo = (type === 'fishing-spot')
      ? new THREE.CircleGeometry(0.6, 12)
      : new THREE.CylinderGeometry(d.r || 0.3, (d.r || 0.3) * 1.15, d.h, 8);
    const mat = new THREE.MeshStandardMaterial({ color:d.color,
      transparent:d.opacity < 1, opacity:d.opacity,
      emissive:(type === 'fire') ? 0x802000 : 0x000000 });
    inst = new THREE.Mesh(geo, mat);
    if(type === 'fishing-spot'){ inst.rotation.x = -Math.PI/2; inst.position.set(x, 0.02, z); }
    else { inst.position.set(x, d.h/2, z); }
  }
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
/* ---- procedural building + marker rendering for the multi-zone manifest (no glb needed) ---- */
function placeHouse(b){
  const w=b.w||8, d=b.d||7, x=b.x, z=b.z, h=3.0, t=0.3, doorw=b.doorw||2;
  const wallMat = new THREE.MeshStandardMaterial({ color:0xcdbf98, flatShading:true });
  // v66: walls are SOLID (RECT colliders) so you can't clip through them, with a WIDE
  // south doorway (>=3.2u) that the 0.45 A* grid can reliably route through after RAD
  // inflation — you enter through the door, not the back wall. (v61's attempt failed only
  // because the 2.0 gap was too narrow AND instructors sat on fixtures; both fixed since.)
  const wall = (cx,cz,ww,dd) => {
    const m=new THREE.Mesh(new THREE.BoxGeometry(ww,h,dd), wallMat); m.position.set(cx,h/2,cz); scene.add(m);
    RECTS.push({ x0:cx-ww/2, x1:cx+ww/2, z0:cz-dd/2, z1:cz+dd/2 });
  };
  const doorGap = Math.max(3.2, doorw);                   // wide enough to A*-route through
  wall(x, z+d/2, w, t);                                   // north wall (solid)
  wall(x-w/2, z, t, d);                                   // west wall (solid)
  wall(x+w/2, z, t, d);                                   // east wall (solid)
  const seg=Math.max(0.4,(w-doorGap)/2);
  wall(x-(doorGap/2+seg/2), z-d/2, seg, t);               // south wall, left of the door gap
  wall(x+(doorGap/2+seg/2), z-d/2, seg, t);               // south wall, right of the door gap
  DOOR_GAPS.push({ x0:x-doorGap/2+0.15, x1:x+doorGap/2-0.15, z0:(z-d/2)-0.9, z1:(z-d/2)+0.9 });  // keep this opening routable
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w+0.6,0.4,d+0.6), new THREE.MeshStandardMaterial({ color:0x6b3f2a, flatShading:true }));
  roof.position.set(x,h+0.2,z); scene.add(roof);
  registerRoof(roof);                                    // hide this roof when the player steps inside (see engine.updateRoofsFor)
  // openable door in the south doorway (starts OPEN so the walkable island is unchanged)
  if(typeof window !== 'undefined' && window.EMDOORS){
    const zoneName = b.zone ? b.zone.replace(/_/g,' ') : 'house';
    try { window.EMDOORS.placeDoor(x, z-d/2, { w:doorGap, dir:'x', startOpen:true,
      examine:'A wooden door into the '+zoneName+'.' }); } catch(e){ console.warn('[em] door', e); }
  }
}
function placeMarker(x,z){   // visible placeholder landmark for fixtures without a mesh yet (ladder/gate/altar/dock/etc.)
  const m=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.9,0.8), new THREE.MeshStandardMaterial({ color:0x7a5c30, flatShading:true }));
  m.position.set(x,0.45,z); scene.add(m);
}
const MANIFEST_FIX = { fishing_spot:'fishing-spot', fire_ring:'fire', cooking_range:'range',
  furnace:'furnace', anvil:'anvil', bank_booth:'bank-booth', poll_booth:'poll-booth' };
// marker types that now have a Blender-authored kit mesh -> place the real prop
const MARKER_PIECE = { ladder_down:'ladder', ladder_up:'ladder', altar:'altar', signpost:'signpost', dock_planks:'dock',
  rat_pen_gate:'rat_pen_gate', target_butt:'target_butt', rune_rack:'rune_rack', boat:'boat' };
/* Big grass island floor covering the whole walkable area. The world.glb ships
   only the chapel-grounds terrain; the multi-zone island (out to the north dock)
   otherwise sat over the 360x360 ocean plane -> "everything is blue". This lays a
   tiled-grass ground UNDER the existing terrain/floors/pond (y below them) but
   ABOVE the ocean, so the island reads as land while the ocean still frames it. */
let _islandGround = null;
function addIslandGround(){
  if(_islandGround || typeof THREE === 'undefined') return;
  const w = 80, d = 100, cx = 0, cz = 37;     // covers x[-40,40], z[-13,87] (BOUND + margin)
  const tex = TEX && TEX.grass ? TEX.grass.clone() : null;
  if(tex){ tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w/3, d/3); tex.needsUpdate = true; }
  const mat = new THREE.MeshStandardMaterial({ color:0x5f8f3f, map:tex, flatShading:false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1), mat);
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(cx, -0.12, cz);           // below chapel terrain(-0.01)/pond(-0.07), above ocean(-0.45)
  mesh.renderOrder = 0;
  scene.add(mesh); _islandGround = mesh;
}
export function instanceManifest(data){
  // publish the manifest + live bounds for data-driven consumers (world map)
  try { window.EMWORLD = Object.assign(window.EMWORLD || {}, { manifest: data, bound: BOUND }); } catch(e){}
  addIslandGround();                                                                   // land under the whole island (kills the all-water look)
  // keep procedural scatter OUT of building footprints and off placed objects/NPCs,
  // so nothing grows through a wall/roof or on top of an instructor (was: trees inside houses).
  const _foot = (data.buildings||[]).filter(b=>b.type==='house').map(b=>{
    const w=(b.w||8), d=(b.d||7); return [b.x-w/2-1.5, b.x+w/2+1.5, b.z-d/2-1.5, b.z+d/2+1.5];
  });
  const _clear = [].concat(
    (data.objects||[]).map(o=>[o.x,o.z]),
    (data.npcs||[]).map(n=>[n.x,n.z])
  );
  function _scatterBlocked(x,z){
    for(const f of _foot){ if(x>f[0]&&x<f[1]&&z>f[2]&&z<f[3]) return true; }
    for(const p of _clear){ const dx=x-p[0],dz=z-p[1]; if(dx*dx+dz*dz < 6.25) return true; }   // 2.5u clear radius
    return false;
  }
  (data.objects || []).forEach(o => place(o.type, o.x, o.z, o.rot||0, o.scale||1));   // explicit placements
  (data.scatter || []).forEach(s => {                                                  // procedural fill
    if(!PIECES[s.type] || !PIECES[s.type].tpl) return;
    const rnd = mulberry32(s.seed||1), ex = s.exclude, sp = s.spacing||1.4;
    let placed=0, tries=0, cap=(s.count||20)*10;
    while(placed < (s.count||20) && tries < cap){
      tries++;
      const x = s.x0 + (s.x1-s.x0)*rnd(), z = s.z0 + (s.z1-s.z0)*rnd();
      if(staticBlocked(x,z)) continue;                                                 // skip walls/props/path-not, OOB
      if(_scatterBlocked(x,z)) continue;                                               // skip building footprints + placed objects/npcs
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

  // --- multi-zone manifest: render houses, marker fixtures/mobs, and instructor NPCs (all defensive) ---
  (data.buildings || []).forEach(b => { try { if(b.type === 'house') placeHouse(b); } catch(e){ console.warn('[em] building', e); } });
  (data.objects || []).forEach(o => { try {
    if(MANIFEST_FIX[o.type]) placeFixture(MANIFEST_FIX[o.type], o.x, o.z);          // skilling fixtures
    else if(o.type === 'rat_spawn'){ const n=o.count||1; for(let i=0;i<n;i++) placeMob('giant-rat', o.x + i*1.3, o.z, 'Giant Rat'); }
    else if(o.type === 'practice_chicken'){ placeMob('giant-rat', o.x, o.z, 'Chicken'); }
    else if(o.type === 'rat_pen_gate' && window.EMDOORS){                                        // openable gate (starts SHUT - open it to enter the pen)
      window.EMDOORS.placeDoor(o.x, o.z, { w:2.0, dir:(Math.abs((o.rot||0)%Math.PI) > 0.6 ? 'z' : 'x'),
        gate:true, startOpen:false, name:'Gate', examine:'The gate to the rat pen. Open it to fight the rats.' });
    }
    else if(MARKER_PIECE[o.type]) place(MARKER_PIECE[o.type], o.x, o.z, o.rot||0, o.scale||1);   // real Blender-authored prop
    else if(!PIECES[o.type]) placeMarker(o.x, o.z);                                 // placeholder for still-unmodelled props (gate/target/rune_rack/boat)
  } catch(e){ console.warn('[em] object', e); } });
  (data.npcs || []).forEach(n => { try { if(window.EMNPC && window.EMNPC.add) window.EMNPC.add(n); } catch(e){ console.warn('[em] npc', e); } });

  buildGrid();                                       // rebake the path grid with all the new colliders
}

/* ---------------- attackable mobs (NPC3/CBT) --------------------------------
   placeMob() drops a small rat-like creature mesh + an invisible click proxy.
   The proxy carries userData.mob so the interaction layer can pick it up.
   Mobs are non-blocking (no CIRCLES entry) so pathfinding is unaffected.
   All placed mobs are tracked in MOB_NODES and exposed via window.EMMOB.   */
export const MOB_NODES = [];

/* faceted flat-shaded material helper for mob parts */
function _mobMat(hex){ return new THREE.MeshStandardMaterial({ color:hex, flatShading:true }); }
function _mobBox(w,h,d,hex,x,y,z){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), _mobMat(hex)); m.position.set(x,y,z); return m; }

/* Build a readable low-poly mob body (authored facing +Z, same convention as
   every character). Returns a THREE.Group with animation part refs in
   group.userData.anim = { legs:[pivots], tail, head } for updateMobs(). */
function _buildMobMesh(kind){
  const g = new THREE.Group();
  const anim = { legs: [], tail: null, head: null };
  if(kind === 'chicken'){
    const white = 0xe8e2d4, comb = 0xc03028, beak = 0xd8922a, leg = 0xc98f3a;
    g.add(_mobBox(0.34, 0.30, 0.46, white, 0, 0.34, 0));                 // body
    const head = _mobBox(0.18, 0.20, 0.18, white, 0, 0.62, 0.20);        // head raised forward
    g.add(head); anim.head = head;
    g.add(_mobBox(0.06, 0.10, 0.12, comb, 0, 0.76, 0.20));               // comb
    g.add(_mobBox(0.06, 0.05, 0.12, beak, 0, 0.60, 0.32));               // beak
    g.add(_mobBox(0.04, 0.04, 0.04, 0x241812, -0.07, 0.66, 0.26));       // eyes
    g.add(_mobBox(0.04, 0.04, 0.04, 0x241812,  0.07, 0.66, 0.26));
    const tail = _mobBox(0.20, 0.22, 0.10, white, 0, 0.46, -0.26);       // tail fan
    tail.rotation.x = -0.5; g.add(tail); anim.tail = tail;
    g.add(_mobBox(0.06, 0.26, 0.28, white, -0.20, 0.36, 0));             // wings
    g.add(_mobBox(0.06, 0.26, 0.28, white,  0.20, 0.36, 0));
    for(const side of [-1, 1]){                                          // legs (pivots at hip)
      const pv = new THREE.Group(); pv.position.set(side*0.08, 0.20, 0);
      pv.add(_mobBox(0.04, 0.20, 0.04, leg, 0, -0.10, 0));
      pv.add(_mobBox(0.10, 0.03, 0.12, leg, 0, -0.20, 0.03));            // foot
      g.add(pv); anim.legs.push(pv);
    }
  } else {
    // giant rat: dog-sized, grey-brown fur, long segmented tail
    const fur = 0x5a4a3a, furDark = 0x483a2c, pink = 0xb98a7a;
    g.add(_mobBox(0.44, 0.34, 0.60, fur, 0, 0.30, -0.10));               // haunches
    g.add(_mobBox(0.38, 0.30, 0.42, fur, 0, 0.28, 0.28));                // shoulders
    const head = new THREE.Group(); head.position.set(0, 0.30, 0.52);
    head.add(_mobBox(0.26, 0.22, 0.30, fur, 0, 0, 0));                   // skull
    head.add(_mobBox(0.12, 0.10, 0.16, pink, 0, -0.03, 0.20));           // snout
    head.add(_mobBox(0.10, 0.12, 0.03, furDark, -0.10, 0.14, -0.04));    // ears
    head.add(_mobBox(0.10, 0.12, 0.03, furDark,  0.10, 0.14, -0.04));
    head.add(_mobBox(0.03, 0.03, 0.03, 0x111111, -0.07, 0.03, 0.16));    // eyes
    head.add(_mobBox(0.03, 0.03, 0.03, 0x111111,  0.07, 0.03, 0.16));
    g.add(head); anim.head = head;
    const tail = new THREE.Group(); tail.position.set(0, 0.26, -0.40);   // tail (pivot at rump)
    tail.add(_mobBox(0.05, 0.05, 0.34, furDark, 0, 0, -0.17));
    tail.add(_mobBox(0.04, 0.04, 0.26, pink, 0, 0.01, -0.44));
    g.add(tail); anim.tail = tail;
    for(const [sx, sz] of [[-0.16,0.26],[0.16,0.26],[-0.16,-0.20],[0.16,-0.20]]){
      const pv = new THREE.Group(); pv.position.set(sx, 0.16, sz);       // leg pivots
      pv.add(_mobBox(0.08, 0.16, 0.08, furDark, 0, -0.08, 0));
      g.add(pv); anim.legs.push(pv);
    }
  }
  g.userData.anim = anim;
  return g;
}

export function placeMob(id, x, z, name){
  const label = name || id;
  const kind = /chicken|hen|rooster/i.test(label) ? 'chicken' : 'rat';
  // visual mesh
  const inst = _buildMobMesh(kind);
  inst.position.set(x, 0, z);
  scene.add(inst);
  // invisible click proxy (cylinder, same pattern as NPC/scenery)
  const proxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.4, 8),
    new THREE.MeshBasicMaterial({ visible:false })
  );
  proxy.position.set(x, 0.7, z);
  const node = { id, name:label, x, z, talkRange:1.4, kind:'mob', _inst:inst, _proxy:proxy,
    _home:{x, z}, _mobKind:kind,
    _ai:{ phase:Math.random()*6, waitT:1+Math.random()*3, tx:x, tz:z, moving:false, lastHp:null, flashT:0, deathT:-1 } };
  proxy.userData.mob = node;   // hand the CANONICAL node to the picker (was a throwaway clone -> broke combat+magic HP/death)
  /* death/respawn hooks for combat.js: a visible fall-over + fade instead of
     an instant vanish; respawn resets the transform. Animated by updateMobs. */
  node.die = () => { node._ai.deathT = 0; };
  node.respawn = () => {
    const ai = node._ai;
    ai.deathT = -1; ai.flashT = 0; ai.moving = false; ai.waitT = 1 + Math.random()*2;
    node.x = node._home.x; node.z = node._home.z; ai.tx = node.x; ai.tz = node.z;
    inst.position.set(node.x, 0, node.z);
    inst.rotation.set(0, inst.rotation.y, 0);
    inst.visible = true;
    inst.traverse(o => { if(o.material && o.material.opacity !== undefined){ o.material.opacity = 1; o.material.transparent = false; } });
    proxy.position.set(node.x, 0.7, node.z);
  };
  MOB_NODES.push(node);
  scene.add(proxy);
  clickTargets.push(proxy);
  return node;
}

/* -------- mob behaviour: wander + face + scurry + hit-flash + death fall.
   Driven from the main loop (main.js) every frame, like updateNpcs. Mobs stay
   NON-BLOCKING (no CIRCLES entry); wander steps still respect world collision
   via blocked() so a penned rat can't phase through its gate. */
const MOB_SPEED = 0.9, MOB_WANDER_R = 1.3;
export function updateMobs(dt){
  const target = (typeof window !== 'undefined' && window.EMCOMBAT && window.EMCOMBAT.target) ? window.EMCOMBAT.target() : null;
  for(const n of MOB_NODES){
    const inst = n._inst, ai = n._ai;
    if(!inst || !ai) continue;

    /* death animation: keel over sideways + sink + fade, then hide (combat.js
       flips visibility back + calls respawn() when the timer elapses). */
    if(ai.deathT >= 0){
      if(!inst.visible) continue;                       // already fully despawned
      ai.deathT += dt;
      const t = Math.min(1, ai.deathT / 0.7);
      inst.rotation.z = t * Math.PI / 2;
      inst.position.y = -t * 0.12;
      if(ai.deathT > 0.9){
        const f = Math.min(1, (ai.deathT - 0.9) / 0.5);
        inst.traverse(o => { if(o.material){ o.material.transparent = true; o.material.opacity = 1 - f; } });
        if(f >= 1) inst.visible = false;
      }
      continue;
    }

    /* hit flash: emissive red pulse whenever HP drops */
    if(ai.lastHp != null && n.hp != null && n.hp < ai.lastHp) ai.flashT = 0.25;
    ai.lastHp = n.hp;
    if(ai.flashT > 0){
      ai.flashT -= dt;
      const on = ai.flashT > 0 && (Math.floor(ai.flashT * 12) % 2 === 0);
      inst.traverse(o => { if(o.material && o.material.emissive) o.material.emissive.setHex(on ? 0x8a1a10 : 0x000000); });
    }

    const engaged = target === n;
    if(engaged){
      /* face the player + aggressive bounce; hold position (melee range is the
         player's job to close - OSRS mobs square up where they stand) */
      ai.moving = false;
      inst.rotation.y = Math.atan2(pos.x - n.x, pos.z - n.z);
      ai.phase += dt * 10;
      inst.position.y = Math.abs(Math.sin(ai.phase)) * 0.05;
    } else if(ai.waitT > 0){
      ai.waitT -= dt; ai.moving = false;
      if(ai.waitT <= 0){
        // pick a wander spot near home; skip blocked picks (penned rats stay penned)
        for(let i = 0; i < 6; i++){
          const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * MOB_WANDER_R;
          const tx = n._home.x + Math.cos(a) * r, tz = n._home.z + Math.sin(a) * r;
          if(!blocked(tx, tz, null)){ ai.tx = tx; ai.tz = tz; break; }
        }
      }
    } else {
      const dx = ai.tx - n.x, dz = ai.tz - n.z, d = Math.hypot(dx, dz);
      if(d < 0.08){ ai.moving = false; ai.waitT = 2 + Math.random() * 4; }
      else {
        ai.moving = true;
        const step = Math.min(d, MOB_SPEED * dt), ux = dx/d, uz = dz/d;
        const nx = n.x + ux * step, nz = n.z + uz * step;
        if(!blocked(nx, nz, null)){ n.x = nx; n.z = nz; }
        else { ai.waitT = 1 + Math.random() * 2; ai.moving = false; }   // bumped something - re-pick later
        inst.rotation.y = Math.atan2(ux, uz);
        ai.phase += dt * 10;
      }
    }

    /* scurry: leg swing + tail sway + head bob while moving; settle when idle */
    const anim = inst.userData.anim || {};
    const sw = ai.moving ? Math.sin(ai.phase) * 0.6 : 0;
    (anim.legs || []).forEach((pv, i) => { pv.rotation.x = (i % 2 === 0 ? sw : -sw); });
    if(anim.tail) anim.tail.rotation.y = Math.sin(ai.phase * 0.7) * (ai.moving ? 0.35 : 0.12);
    if(!engaged) inst.position.y = ai.moving ? Math.abs(Math.sin(ai.phase)) * 0.03 : 0;

    /* keep transform + proxy + anchor in sync with the live position */
    inst.position.x = n.x; inst.position.z = n.z;
    n._proxy.position.set(n.x, 0.7, n.z);
  }
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
/* expose the depletion model on window for the main loop + gather actions, plus
   planPath/respawnAtSpawn (CBT path-to-mob + death/respawn) so combat.js can drive
   the existing movement plumbing without a direct ES import (matches combat.js's
   established "read window.EM* lazily" convention - see its THREE_/HUD/DATA/EQUIP
   accessors - so it keeps working regardless of module load order). */
if(typeof window !== 'undefined'){
  window.EMWORLD = Object.assign(window.EMWORLD || {}, {
    deplete, isDepleted, tickRespawns, gatherNode, nodes: SCENERY_NODES,
    fixtures: FIXTURE_NODES,
    planPath, respawnAtSpawn, spawn: SPAWN, updateMobs });
  window.EMMOB = { place: placeMob, nodes: MOB_NODES };
}
