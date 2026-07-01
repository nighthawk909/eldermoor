/* =====================================================================
   ELDERMOOR - openable doors + gates (DOORS).

   Signature Tutorial-Island interaction: a hinged wooden leaf that sits in a
   doorway / fence gap, is clicked to swing open or shut, plays a creak, and -
   while shut - blocks movement through the gap.

   Design (deliberately zero-regression):
     - A door reuses the existing "scenery" node shape, so picking, the hover
       label, right-click Examine and the walk-to-then-act flow all work for
       free. Its node.kind is 'door', which player.arrive() routes to toggle().
     - Collision is a DYNAMIC predicate (window.EMDOORS.blocks) consulted by
       world.moveBlocked() - exactly like the lesson-region gate - so the baked
       A* path grid is never touched and pathfinding is unchanged. A shut door
       is the only thing that blocks; an open door blocks nothing.
     - window.EMDOORS is published at IMPORT time (module side-effect), not
       gated behind init(), so world.placeHouse() can place doors during the
       very first manifest instantiation (which runs before the init array).

   Boot-safe by construction: every hook is defensive and no-ops if THREE or a
   dependency isn't ready, so a failure here can never brick the world.
   ===================================================================== */
import { scene } from './engine.js';
import { clickTargets } from './interact.js';

const HALF = Math.PI / 2;
const SWING = 4.2;           // radians/sec - a brisk, readable swing
const WOOD  = 0x6b4a2a;      // plank brown, in the world palette
const IRON  = 0x4a4f57;      // gate iron banding

const DOORS = [];            // live door records: { node, pivot, base, cur, target, open, box, dir }

/* one hinged leaf: a Group whose origin is the hinge axis, with the leaf mesh
   offset so it extends +X from the hinge and rests on the ground. Rotating the
   group about Y swings the leaf. */
function buildLeaf(w, h, gate){
  const pivot = new THREE.Group();
  const thick = 0.12;
  const mat = new THREE.MeshStandardMaterial({ color: WOOD, flatShading: true });
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, h, thick), mat);
  leaf.position.set(w / 2, h / 2, 0);
  pivot.add(leaf);
  if (gate){
    // fence-gate look: two horizontal iron bands across the leaf
    const bandMat = new THREE.MeshStandardMaterial({ color: IRON, flatShading: true });
    [0.32, 0.72].forEach(fy => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.1, thick + 0.04), bandMat);
      band.position.set(w / 2, h * fy, 0);
      pivot.add(band);
    });
  }
  return pivot;
}

/* place a door at gap centre (x,z). opts:
     w        gap width          (default 1.8)
     h        leaf height        (default 2.4)
     dir      'x' | 'z'          gap runs along this axis (default 'x')
     startOpen true|false        (default true - preserves current walkability)
     gate     true|false         fence-gate styling + wider block box
     name / examine              label + examine text                          */
function placeDoor(x, z, opts){
  if (typeof THREE === 'undefined') return null;
  opts = opts || {};
  const w = opts.w || 1.8, h = opts.h || 2.4, dir = (opts.dir === 'z') ? 'z' : 'x';
  const gate = !!opts.gate;
  const open = opts.startOpen !== false;              // default OPEN unless explicitly closed

  const pivot = buildLeaf(w, h, gate);
  // hinge point + base orientation so the SHUT leaf spans the gap along `dir`
  const base = (dir === 'z') ? HALF : 0;
  if (dir === 'z') pivot.position.set(x, 0, z - w / 2);
  else             pivot.position.set(x - w / 2, 0, z);
  const shut = base, ajar = base - HALF;
  pivot.rotation.y = open ? ajar : shut;
  scene.add(pivot);

  // invisible click proxy over the gap (same shape as scenery proxies)
  const proxy = new THREE.Mesh(
    new THREE.CylinderGeometry(Math.max(0.6, w / 2), Math.max(0.6, w / 2), h, 8),
    new THREE.MeshBasicMaterial({ visible: false }));
  proxy.position.set(x, h / 2, z);

  const node = {
    name: opts.name || (gate ? 'Gate' : 'Door'),
    verb: open ? 'Close' : 'Open',
    examine: opts.examine || (gate ? 'A wooden gate on iron hinges.' : 'A sturdy wooden door.'),
    x, z, talkRange: 1.5, kind: 'door',
  };
  proxy.userData.scenery = node;
  scene.add(proxy); clickTargets.push(proxy);

  const halfGap = w / 2 + 0.05, depth = gate ? 0.5 : 0.4;
  const box = (dir === 'z')
    ? { x0: x - depth, x1: x + depth, z0: z - halfGap, z1: z + halfGap }
    : { x0: x - halfGap, x1: x + halfGap, z0: z - depth, z1: z + depth };

  const rec = { node, pivot, base, cur: pivot.rotation.y, target: pivot.rotation.y, open, box, dir, shut, ajar };
  node._rec = rec;
  DOORS.push(rec);
  return node;
}

function sfx(open){
  try {
    if (typeof window === 'undefined' || !window.EMSFX) return;
    const s = window.EMSFX;
    if (typeof s.play === 'function') s.play(open ? 'door-open' : 'door-close');
    else if (typeof s.door === 'function') s.door(open);
  } catch (_) {}
}

/* open/close a door from its scenery node (player.arrive routes here). */
function toggle(node){
  const rec = node && node._rec;
  if (!rec) return;
  rec.open = !rec.open;
  rec.target = rec.open ? rec.ajar : rec.shut;
  node.verb = rec.open ? 'Close' : 'Open';
  sfx(rec.open);
  try { if (window.EMHUD) window.EMHUD.addChat('You ' + (rec.open ? 'open' : 'close') + ' the ' + node.name.toLowerCase() + '.'); } catch (_) {}
}

/* dynamic collision: a SHUT door blocks its gap box; an open one blocks nothing.
   Called by world.moveBlocked() for every candidate step. */
function blocks(nx, nz){
  for (let i = 0; i < DOORS.length; i++){
    const d = DOORS[i];
    if (d.open) continue;
    const b = d.box;
    if (nx > b.x0 && nx < b.x1 && nz > b.z0 && nz < b.z1) return true;
  }
  return false;
}

/* advance every swing tween toward its target angle. */
function update(dt){
  for (let i = 0; i < DOORS.length; i++){
    const d = DOORS[i];
    if (d.cur === d.target) continue;
    const step = SWING * dt;
    if (Math.abs(d.target - d.cur) <= step) d.cur = d.target;
    else d.cur += Math.sign(d.target - d.cur) * step;
    d.pivot.rotation.y = d.cur;
  }
}

export function initDoors(){
  if (typeof window === 'undefined') return null;
  return window.EMDOORS;
}

/* publish at import time so placeHouse() can place doors during manifest load */
if (typeof window !== 'undefined' && !window.EMDOORS){
  window.EMDOORS = { placeDoor, toggle, blocks, update, list: DOORS };
}

export default initDoors;
