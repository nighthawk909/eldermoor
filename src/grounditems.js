/* =====================================================================
   ELDERMOOR - ground items (GROUND-ITEMS). Drop -> spawns a pickable node
   in the world -> Take picks it up. OSRS-style: a dropped item appears at
   the player's feet as a small ground marker (item-icon sprite on a
   coloured tile), is a right-click/tap target with Take + Examine, and
   despawns after a timeout if left alone.

   Self-contained, defensive: reads window.EMSCENE / window.EMPLAYERPOS /
   window.EMHUD; imports clickTargets + walkTo/engage-style picking from
   interact.js (an import, not an edit) so ground nodes participate in the
   SAME raycast/hover/context-menu pipeline as NPCs/scenery/mobs, with no
   changes to interact.js or player.js. Never throws when a global/import
   is missing (unit / SSR / partial-boot safe).

   main.js calls initGround() once. Exposes window.EMGROUND:
     drop(id, qty, x, z)  -> spawn (or stack onto) a ground node
     take(node)            -> give the item back to the bag, remove the node
     tick(dt)               -> per-frame: despawn timers + bob animation
     nodes                  -> live array of ground nodes (read-only use)

   Wiring the orchestrator still needs to do (NOT done here):
     - import { initGround } from './grounditems.js'; in main.js
     - call initGround() alongside the other init*() calls
     - inventory-ops.js\'s Drop verb should call window.EMGROUND.drop(...)
       instead of (or in addition to) just removing the item from the bag.
   ===================================================================== */

import { clickTargets } from './interact.js';

const DESPAWN_SECS = 60;          // OSRS-ish: dropped items vanish after a while
const STACK_RADIUS = 0.5;         // drops within this radius of an existing same-item node stack together
const BOB_SPEED = 2.2;
const BOB_HEIGHT = 0.05;

/* live registry of ground nodes. Each node:
   { id, count, x, z, name, verb:'Take', kind:'ground', talkRange,
     age, examine, _tile, _sprite, _proxy } */
const nodes = [];

let inited = false;
let baseGeo = null, baseMatTemplate = null;

/* ---------------------------------------------------------------- helpers */
function hud(){
  const h = (typeof window !== 'undefined') ? window.EMHUD : null;
  return (h && typeof h.giveItem === 'function') ? h : null;
}
function itemsDef(){
  const h = hud();
  return (h && typeof h.getItems === 'function') ? (h.getItems() || {}) : {};
}
function scene(){
  return (typeof window !== 'undefined' && window.EMSCENE) ? window.EMSCENE : null;
}
function playerPos(){
  return (typeof window !== 'undefined' && window.EMPLAYERPOS) ? window.EMPLAYERPOS : null;
}
function chat(text, opts){
  const h = (typeof window !== 'undefined') ? window.EMHUD : null;
  if(h && typeof h.addChat === 'function') h.addChat(text, '', opts === undefined ? true : opts);
}

/* icon-sprite: same canvas -> CanvasTexture -> Sprite pattern used across
   the client (npc.js nameplates, combat.js hitsplats). Draws the item's
   emoji icon (items.json `icon`) on a small rounded tile so a ground item
   reads at a glance without needing a modeled mesh. */
function makeIconSprite(icon){
  try{
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0,0,64,64);
    ctx.font = '40px "Segoe UI Emoji","Trebuchet MS",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon || '✦', 32, 34);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
    spr.scale.set(0.5, 0.5, 0.5);
    return spr;
  } catch(e){ return null; }
}

/* small flat coloured tile marking the drop location on the ground */
function makeTile(){
  if(!baseGeo) baseGeo = new THREE.CircleGeometry(0.28, 10);
  if(!baseMatTemplate) baseMatTemplate = new THREE.MeshBasicMaterial({ color: 0xe7c64f, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(baseGeo, baseMatTemplate.clone());
  mesh.rotation.x = -Math.PI/2;
  return mesh;
}

function itemName(id){
  const def = itemsDef()[id];
  return (def && def.name) || id;
}
function itemIcon(id){
  const def = itemsDef()[id];
  return (def && def.icon) || null;
}
function itemExamine(id){
  const def = itemsDef()[id];
  return (def && def.examine) || ('It’s a ' + itemName(id) + '.');
}
function itemStackable(id){
  const def = itemsDef()[id];
  return !!(def && def.stackable);
}

/* ---------------------------------------------------------------- drop */
function drop(id, qty, x, z){
  if(!id) return null;
  const n = Math.max(1, qty || 1);
  const sc = scene();
  const p = playerPos();
  const dx = (typeof x === 'number') ? x : (p ? p.x : 0);
  const dz = (typeof z === 'number') ? z : (p ? p.z : 0);

  // stack sensibly: if a stackable item of the same id already sits nearby, add to it
  // instead of spawning a second visible node (OSRS-style single ground stack).
  if(itemStackable(id)){
    const existing = nodes.find(nd => nd.id === id && Math.hypot(nd.x - dx, nd.z - dz) <= STACK_RADIUS);
    if(existing){
      existing.count += n;
      existing.age = 0;                 // refresh despawn timer on restack
      refreshLabel(existing);
      return existing;
    }
  }

  const node = {
    id, count: n, x: dx, z: dz,
    name: itemName(id),
    verb: 'Take',
    kind: 'ground',
    talkRange: 1.4,
    age: 0,
    examine: itemExamine(id),
    _tile: null, _sprite: null, _proxy: null,
  };

  if(sc){
    try{
      const group = new THREE.Group();
      group.position.set(dx, 0.02, dz);
      const tile = makeTile();
      group.add(tile);
      const icon = itemIcon(id);
      const sprite = makeIconSprite(icon);
      if(sprite){ sprite.position.set(0, 0.35, 0); group.add(sprite); }
      sc.add(group);
      node._tile = group;
      node._sprite = sprite;

      // invisible click proxy in the same shape/pattern world.js uses for
      // scenery/fixtures, registered into the SAME clickTargets array so
      // ground items are pickable/hoverable/right-clickable for free.
      const proxy = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 1.2, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.position.set(dx, 0.6, dz);
      proxy.userData.scenery = node;   // reuse the 'scenery' picking channel (name/verb/x/z/examine already match its shape)
      sc.add(proxy);
      clickTargets.push(proxy);
      node._proxy = proxy;
    } catch(e){ /* rendering optional - node still exists for take()/tests */ }
  }

  nodes.push(node);
  return node;
}

function refreshLabel(node){
  // count changed (restack) - nothing visual to redraw for the flat tile/icon;
  // examine text stays accurate via itemExamine(id) at take/examine time.
  void node;
}

/* ---------------------------------------------------------------- take */
function take(node){
  if(!node) return false;
  const idx = nodes.indexOf(node);
  if(idx < 0) return false;
  const h = hud();
  if(h){ h.giveItem(node.id, node.count); }
  removeNode(node);
  return true;
}

function removeNode(node){
  const idx = nodes.indexOf(node);
  if(idx >= 0) nodes.splice(idx, 1);
  const sc = scene();
  if(node._tile){
    if(sc) sc.remove(node._tile);
    node._tile.traverse(o => {
      if(o.material){
        if(o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
      if(o.geometry && o.geometry !== baseGeo) o.geometry.dispose();
    });
  }
  if(node._proxy){
    if(sc) sc.remove(node._proxy);
    const ci = clickTargets.indexOf(node._proxy);
    if(ci >= 0) clickTargets.splice(ci, 1);
    node._proxy.geometry && node._proxy.geometry.dispose();
    node._proxy.material && node._proxy.material.dispose();
  }
}

/* ---------------------------------------------------------------- tick */
function tick(dt){
  if(!nodes.length) return;
  const d = (typeof dt === 'number' && dt > 0) ? dt : 0;
  // iterate a snapshot: removeNode mutates `nodes` in place
  for(const node of nodes.slice()){
    node.age += d;
    if(node._sprite){
      const bob = Math.sin((performance.now() / 1000) * BOB_SPEED + node.x + node.z) * BOB_HEIGHT;
      node._sprite.position.y = 0.35 + bob;
    }
    if(node.age >= DESPAWN_SECS){
      chat('The ' + node.name.toLowerCase() + ' crumbles to dust.', true);
      removeNode(node);
    }
  }
}

/* -------------------------------------------------------------- examine
   Ground nodes are registered on the 'scenery' picking channel (see drop()),
   so interact.js's existing openMenu()/hoverAction() already offer
   "Take <name>" (from node.verb) and "Examine <name>" for free via the
   same code path scenery/fixtures use - no changes to interact.js needed.
   engage(node) from interact.js will walk the player to it and call
   arrive() in player.js; since kind is 'ground' (not 'scenery'/'altar'/
   'mob'), player.js's arrive() switch falls through without side effects,
   so we resolve the actual pickup ourselves once the player is in range. */
function proximityPoll(){
  const p = playerPos();
  if(!p || !nodes.length) return;
  for(const node of nodes.slice()){
    if(!node._pendingTake) continue;
    if(Math.hypot(node.x - p.x, node.z - p.z) <= (node.talkRange + 0.15)){
      node._pendingTake = false;
      take(node);
    }
  }
}

/* public: called by a context-menu / hover "Take" action (or directly) to
   walk to + pick up a node. Falls back to immediate take() if the player is
   already close enough. Uses window.EMWALK (main.js global) to path there;
   never throws if that global is absent - just attempts an immediate take. */
function requestTake(node){
  if(!node) return;
  const p = playerPos();
  if(p && Math.hypot(node.x - p.x, node.z - p.z) <= (node.talkRange + 0.15)){
    take(node);
    return;
  }
  node._pendingTake = true;
  try{
    if(typeof window !== 'undefined' && typeof window.EMWALK === 'function') window.EMWALK(node.x, node.z);
  } catch(e){ /* no walk API available - the periodic tick() will still catch proximity if the player wanders close */ }
}

/* -------------------------------------------------------------- boot */
export function initGround(){
  if(inited) return;
  inited = true;
  if(typeof window === 'undefined') return;
  window.EMGROUND = {
    drop, take, tick, nodes,
    requestTake,
  };
  // fold the proximity poll into the same tick() call the orchestrator/loop
  // already needs to make for despawn timers, so no second per-frame hook.
  const _origTick = tick;
  window.EMGROUND.tick = function(dt){ _origTick(dt); proximityPoll(); };
}

export default initGround;
