/* =====================================================================
   ELDERMOOR - npc module. Owns the NPCS / OBJECTS rosters, the click proxies +
   nameplates + body colliders, the altar glow proxy registration, and the
   wander simulation (npcCtrl / pickWander / updateNpcs). Dialogue data
   (lines / examine / verbs) hangs off the roster entries here.
   ===================================================================== */
import { TAU, scene, dressMaterials } from './engine.js';
import { clampX, clampZ, blocked, NPCCOLS } from './world.js';
import { clickTargets } from './interact.js';
import { pos } from './player.js';
import { chat } from './dialogue.js';

/* ------------------------------------------------------------------ NPCs
   Data-driven roster. `monk` is baked into chapel.glb (proxy-only); the rest each
   load their own glTF from the asset factory and are placed here. Add an entry =
   a new villager in the world (proxy, nameplate, collider, dialogue - all automatic). */
export function nameplate(text, hex, y){
  const cv = document.createElement('canvas'); cv.width=256; cv.height=64;
  const x = cv.getContext('2d');
  x.font='bold 30px Trebuchet MS'; x.textAlign='center'; x.textBaseline='middle';
  x.lineWidth=6; x.strokeStyle='rgba(0,0,0,.9)'; x.strokeText(text,128,32);
  x.fillStyle=hex; x.fillText(text,128,32);
  const t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true}));
  s.scale.set(2.0,0.5,1); s.position.y=y; s.renderOrder=999; return s;
}
/* overhead speech bubble - same canvas-sprite tech as nameplate but sits a bit higher,
   word-wrapped on a rounded dark panel, auto-removed after ~3s, replaced if re-called. */
function speechSprite(text){
  const W = 320, lineH = 30, pad = 14, maxTextW = W - pad*2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = 256;
  const x = cv.getContext('2d');
  x.font = '24px Trebuchet MS';
  // word-wrap into lines that fit maxTextW
  const words = String(text).split(/\s+/); const lines = []; let cur = '';
  for(const w of words){
    const test = cur ? cur+' '+w : w;
    if(x.measureText(test).width > maxTextW && cur){ lines.push(cur); cur = w; }
    else cur = test;
  }
  if(cur) lines.push(cur);
  const boxH = lines.length*lineH + pad*2;
  const boxW = Math.min(W, Math.max(60, ...lines.map(l=>x.measureText(l).width)) + pad*2);
  const bx = (W-boxW)/2, by = 0;
  // rounded panel
  const r = 12;
  x.fillStyle = 'rgba(20,16,12,.86)'; x.strokeStyle = 'rgba(216,178,90,.9)'; x.lineWidth = 2;
  x.beginPath();
  x.moveTo(bx+r, by); x.lineTo(bx+boxW-r, by); x.quadraticCurveTo(bx+boxW, by, bx+boxW, by+r);
  x.lineTo(bx+boxW, by+boxH-r); x.quadraticCurveTo(bx+boxW, by+boxH, bx+boxW-r, by+boxH);
  x.lineTo(bx+r, by+boxH); x.quadraticCurveTo(bx, by+boxH, bx, by+boxH-r);
  x.lineTo(bx, by+r); x.quadraticCurveTo(bx, by, bx+r, by); x.closePath();
  x.fill(); x.stroke();
  // text
  x.fillStyle = '#f5ead2'; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((l,i)=> x.fillText(l, W/2, by+pad+lineH*i+lineH/2));
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true}));
  // scale so on-screen size tracks the drawn box; keep aspect from canvas
  s.scale.set(W/120, 256/120, 1);
  s.renderOrder = 1000;
  s.userData._tex = t;
  return s;
}
const BUBBLE_Y = 2.95;   // a bit above the nameplate (2.35)
/* Show a short-lived speech bubble above an NPC\'s head. Re-calling replaces the prior one.
   The bubble follows wanderers via updateNpcs (n._bubble). */
export function npcSay(npc, text){
  if(!npc) return;
  clearBubble(npc);
  const s = speechSprite(text);
  const bx = (npc.x ?? 0), bz = (npc.z ?? 0);
  s.position.set(bx, BUBBLE_Y, bz);
  scene.add(s);
  npc._bubble = s;
  npc._bubbleTimer = setTimeout(()=>{ clearBubble(npc); }, 3000);
}
function clearBubble(npc){
  if(npc._bubbleTimer){ clearTimeout(npc._bubbleTimer); npc._bubbleTimer = null; }
  if(npc._bubble){
    scene.remove(npc._bubble);
    const t = npc._bubble.userData && npc._bubble.userData._tex;
    if(t && t.dispose) t.dispose();
    if(npc._bubble.material && npc._bubble.material.dispose) npc._bubble.material.dispose();
    npc._bubble = null;
  }
}
/* let dialogue.js trigger bubbles without importing the module directly */
if(typeof window !== 'undefined') window.EMNPC = { say: npcSay };

/* Roster bodies are rigged KayKit characters (kaykit: model + skin/hair tint,
   loaded in loaders.js via loadNpcGlb). The old cone/icosphere glbs under
   assets/npcs/ remain ONLY as a load-failure fallback (n.glb). */
export const NPCS = [
  { id:'monk', name:'Brother Aldric', x:1.4, z:-2.9, talkRange:1.25, wander:0.45,
    kaykit:{ model:'mage', skin:'#e8b98e', hair:'#4a3420' },
    examine:"A devout brother who tends the Chapel of Eldermoor.",
    lines:[
      "Peace be upon you, traveller.",
      "You stand in the Chapel of Eldermoor. We keep the altar lit and bury the bones of the fallen for the Prayer it grants.",
      "Rest here as long as you need. The road beyond these walls is a hard one." ] },
  { id:'sister', glb:'assets/npcs/sister.glb', name:'Sister Wenna', x:-1.4, z:-0.6, rotY:0.7, talkRange:1.2, wander:1.0,
    kaykit:{ model:'mage', skin:'#f1cfa9', hair:'#1c140d' },
    examine:"A quiet sister of the chapel order.",
    lines:[ "Light keep you, traveller.",
            "I tend the candles and the quiet. Few faces pass through these doors." ] },
  { id:'pilgrim1', glb:'assets/npcs/pilgrim1.glb', name:'Pilgrim Joss', x:1.4, z:0.6, rotY:-0.7, talkRange:1.2, wander:1.1,
    kaykit:{ model:'rogue', skin:'#d49a6a', hair:'#6b4a2a' },
    examine:"A road-worn pilgrim resting his feet.",
    lines:[ "Long road behind me, longer ahead.",
            "I stop at every chapel I can. A moment\'s peace is worth the miles." ] },
  { id:'pilgrim2', glb:'assets/npcs/pilgrim2.glb', name:'Old Maven', x:0, z:3.4, rotY:Math.PI, talkRange:1.2, wander:0.9,
    kaykit:{ model:'rogue_hooded', skin:'#b87a4e', hair:'#cfcfcf' },
    examine:"An elder who has seen many winters.",
    lines:[ "Eh? Come to pray, have you?",
            "In my day we walked to the mainland. No boats, no fuss. Bah." ] },
];
/* interactable world objects (non-NPC) - tap/long-press like NPCs */
export const OBJECTS = [
  { id:'altar', name:'Altar', kind:'altar', verb:'Pray-at', x:0, z:-4.2, talkRange:1.5,
    examine:"A worn stone altar. The faithful kneel here to pray." },
];

/* build the NPC/object click proxies, nameplates and body colliders (side-effectful:
   run once from main.js so wiring stays centralized). */
export function initProxies(){
  NPCS.forEach(n => {
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.1, 8), new THREE.MeshBasicMaterial({visible:false}));
    proxy.position.set(n.x, 1.05, n.z); proxy.userData.npc = n; scene.add(proxy); clickTargets.push(proxy);
    const plate = nameplate(n.name, '#ffd98a', 2.35); plate.position.set(n.x, 2.35, n.z); scene.add(plate);
    const col = { x:n.x, z:n.z, r:0.42 }; NPCCOLS.push(col);     // dynamic body collider
    n._proxy = proxy; n._plate = plate; n._col = col;            // refs so wander can move them
  });
  OBJECTS.forEach(o => {
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 1.4), new THREE.MeshBasicMaterial({visible:false}));
    proxy.position.set(o.x, 0.75, o.z); proxy.userData.obj = o; scene.add(proxy); clickTargets.push(proxy);
  });
}

/* ----------------------------------------------------------- wandering NPCs */
export const npcCtrl = [];
export const NPC_SPEED = 1.1;

export function pickWander(c){
  for(let i=0;i<8;i++){
    const a = Math.random()*TAU, r = 0.3 + Math.random()*c.n.wander;
    const tx = clampX(c.home.x + Math.cos(a)*r), tz = clampZ(c.home.z + Math.sin(a)*r);
    if(!blocked(tx, tz, c.col)){ c.tx=tx; c.tz=tz; return; }
  }
  c.tx = c.home.x; c.tz = c.home.z;
}
export function updateNpcs(dt){
  // keep NPCs fully clear of the player\'s body radius (RAD 0.32 + NPC body 0.42 + margin) so
  // they can never wander into the player and glue them in place.
  const nearPlayer = (x,z) => (x-pos.x)*(x-pos.x)+(z-pos.z)*(z-pos.z) < 0.92*0.92;
  for(const c of npcCtrl){
    if(c.n === chat.npc){ c.moving = false; c.rotY = Math.atan2(pos.x-c.px, pos.z-c.pz); }  // frozen, facing you, while talking
    else if(c.waitT > 0){ c.waitT -= dt; c.moving = false; if(c.waitT <= 0) pickWander(c); }  // pick a new spot when the pause ends
    else {
      const dx=c.tx-c.px, dz=c.tz-c.pz, d=Math.hypot(dx,dz);
      if(d < 0.12){ c.moving=false; c.waitT = 2 + Math.random()*4; }   // arrived → pause (next target chosen when pause ends)
      else {
        c.moving = true;
        const step = Math.min(d, NPC_SPEED*dt), ux=dx/d, uz=dz/d;
        const nx = clampX(c.px+ux*step), nz = clampZ(c.pz+uz*step);
        if(!blocked(nx, c.pz, c.col) && !nearPlayer(nx, c.pz)) c.px = nx;
        if(!blocked(c.px, nz, c.col) && !nearPlayer(c.px, nz)) c.pz = nz;
        c.rotY = Math.atan2(ux, uz); c.phase += dt*8;
      }
    }
    const bob = c.moving ? Math.abs(Math.sin(c.phase))*0.05 : 0;
    c.group.position.set(c.px, bob, c.pz); c.group.rotation.y = c.rotY;
    c.col.x = c.px; c.col.z = c.pz;                       // collider follows
    c.n.x = c.px; c.n.z = c.pz;                           // live position (proximity gate / tap target)
    c.n._proxy.position.set(c.px, 1.05, c.pz);            // clickable proxy follows
    c.n._plate.position.set(c.px, 2.35, c.pz);            // nameplate follows
    if(c.n._bubble) c.n._bubble.position.set(c.px, BUBBLE_Y, c.pz);  // speech bubble follows
    // REAL-NPC-MODEL: if a rigged KayKit glb loaded onto this NPC's group, drive its
    // AnimationMixer (idle/walk) instead of - not in addition to - the procedural
    // rig.leg/arm box-limb swing below, so the two never fight over the same NPC.
    const glb = c.group.userData && c.group.userData.glb;
    if(glb){
      setNpcGlbState(glb, c.moving ? 'walk' : 'idle');
      if(glb.mixer) glb.mixer.update(dt);
    } else {
      const sw = c.moving ? Math.sin(c.phase)*0.5 : 0;
      if(c.rig.legL){ c.rig.legL.rotation.x =  sw;     c.rig.legR.rotation.x = -sw; }
      if(c.rig.armL){ c.rig.armL.rotation.x = -sw*0.5; c.rig.armR.rotation.x =  sw*0.5; }
    }
  }
}

/* ============================================================ runtime NPC spawn
   Build a visible, walking, talkable instructor from a world.manifest npc spec —
   procedural low-poly body (fallback) OR a rigged KayKit glTF body (preferred,
   matches the player avatar - see REAL-NPC-MODEL below) — nameplate, click proxy,
   body collider, dialogue (talk() resolves the tree by npc.id), and optional
   wander. Called by world.js instanceManifest() via window.EMNPC.add after the
   world loads. */
const NPC_BODY_COLORS = {
  guide:0x3f6f8c, survival:0x4f8a3c, chef:0xd8d1c0, quest:0x9c3030, miner:0x8c6b40,
  guard:0xc2cad4, banker:0xd8b25a, account:0x5a3f28, wizard:0x3a2a6c, monklike:0x6a5a3a, default:0x7a6a52,
};
function npcMat(c){ return new THREE.MeshStandardMaterial({ color:c, flatShading:true }); }
function buildNpcBody(role){
  const g = new THREE.Group();
  const body = NPC_BODY_COLORS[role] || NPC_BODY_COLORS.default, skin = 0xe8b98e, trews = 0x2f3742;
  const legGeo = new THREE.BoxGeometry(0.22,0.85,0.24);
  const legL = new THREE.Group(); legL.position.set(-0.16,0.9,0); const lm=new THREE.Mesh(legGeo,npcMat(trews)); lm.position.y=-0.42; legL.add(lm); g.add(legL);
  const legR = new THREE.Group(); legR.position.set( 0.16,0.9,0); const rm=new THREE.Mesh(legGeo,npcMat(trews)); rm.position.y=-0.42; legR.add(rm); g.add(legR);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.8,0.34), npcMat(body)); torso.position.y=1.3; g.add(torso);
  const armGeo = new THREE.BoxGeometry(0.18,0.7,0.2);
  const armL = new THREE.Group(); armL.position.set(-0.4,1.6,0); const am=new THREE.Mesh(armGeo,npcMat(body)); am.position.y=-0.35; armL.add(am); g.add(armL);
  const armR = new THREE.Group(); armR.position.set( 0.4,1.6,0); const ar=new THREE.Mesh(armGeo,npcMat(body)); ar.position.y=-0.35; armR.add(ar); g.add(armR);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.42,0.42), npcMat(skin)); head.position.y=1.98; g.add(head);
  g.userData.rig = { legL, legR, armL, armR };
  return g;
}

/* ---------------------------------------------------------------------
   REAL-NPC-MODEL: rigged KayKit glTF body for spawned instructor NPCs, same
   CC0 pack + AnimationMixer approach as avatar.js's rigged player avatar.
   Fully additive + defensive: any failure here (missing THREE.GLTFLoader,
   fetch error, no matching bones) leaves the NPC on its existing procedural
   buildNpcBody() box body, so nothing ever bricks. ===================== */
const NPC_KAYKIT_DIR = 'assets/ext/characters/';
const NPC_KAYKIT_MODELS = {
  knight: 'Knight.glb', mage: 'Mage.glb', rogue: 'Rogue.glb', barbarian: 'Barbarian.glb',
  rogue_hooded: 'Rogue_Hooded.glb',
};
const NPC_CLIP_ALIASES = {
  idle: ['Idle', 'Unarmed_Idle'],
  walk: ['Walking_A', 'Walking_B', 'Walking_C'],
};
const NPC_TARGET_HEIGHT = 1.8;   // matches the procedural NPC body's head height (~1.98) with margin, and avatar.js's 1.7-1.84 band

/* role/type -> KayKit model key. Spread across the four packs so the roster
   doesn't read as four clones; anything unmatched falls to 'knight'. */
function pickNpcModelKey(role){
  const r = String(role || '').toLowerCase();
  if(/mage|wizard/.test(r)) return 'mage';
  if(/rogue/.test(r)) return 'rogue';
  if(/survival|ranger/.test(r)) return 'rogue';
  if(/barbarian/.test(r)) return 'barbarian';
  if(/guide|warden|guard|combat/.test(r)) return 'knight';
  if(/chef|banker|quest|account/.test(r)) return 'knight';
  return 'knight';
}
function npcGltfLoader(){
  if(typeof THREE === 'undefined' || typeof THREE.GLTFLoader !== 'function') return null;
  return new THREE.GLTFLoader();
}
/* The KayKit glbs ship their entire gear wardrobe as always-visible nodes
   (the Knight carries 2 swords + 4 shields + helmet + cape at once, parented
   to the hand slots). Hide all of it, then re-show a small role-appropriate
   loadout so each instructor reads as their profession, not an armory rack. */
const NPC_GEAR_NODE_RE = /Sword|Shield|Axe|Knife|Crossbow|Throwable|Wand|Staff|Spellbook|Mug|Helmet|_Hat|_Cape/i;
const NPC_LOADOUTS = [
  [/guard|warden|combat/i,             [/^1H_Sword$/, /Round_Shield$/, /_Helmet$/, /_Cape$/]],
  [/mage|wizard/i,                     [/^2H_Staff$/, /_Hat$/, /_Cape$/]],
  [/survival|ranger|rogue/i,           [/^Knife$/]],
  [/barbarian/i,                       [/^1H_Axe$/]],
  [/guide|quest|account|banker|chef/i, [/_Cape$/]],
];
function curateNpcGear(root, role){
  const gear = {};
  root.traverse(o => {
    if(o.name && NPC_GEAR_NODE_RE.test(o.name)){ o.visible = false; gear[o.name] = o; }
  });
  const r = String(role || '');
  for(const [roleRe, wants] of NPC_LOADOUTS){
    if(!roleRe.test(r)) continue;
    wants.forEach(re => {
      for(const name of Object.keys(gear)){
        if(re.test(name)){ gear[name].visible = true; break; }
      }
    });
    return;
  }
}
/* Attempt the rigged-glTF NPC body load. Resolves a { scene, mixer, actions }
   bundle on success, or null on any failure - caller keeps the procedural
   buildNpcBody() box already in the scene so the NPC is never invisible. */
/* deterministic per-NPC colour variety: hash the npc id into the creator's
   skin/hair palettes so the cast doesn't read as identical clones. */
const NPC_SKINS = ['#e8b98e','#f1cfa9','#d49a6a','#b87a4e','#8c5a36','#5e3a22'];
const NPC_HAIRS = ['#3a2a1c','#4a3420','#1c140d','#6b4a2a','#8a6a3a','#c9a96a','#9c3030','#cfcfcf'];
function npcVariety(id){
  let h = 0; const s = String(id || '');
  for(let i = 0; i < s.length; i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  return { skin: NPC_SKINS[h % NPC_SKINS.length], hair: NPC_HAIRS[(h >> 3) % NPC_HAIRS.length] };
}
/* spec (optional): { model:'mage', skin:'#hex', hair:'#hex' } — explicit body
   pick + tint for roster NPCs; instructors pass only role and get
   pickNpcModelKey + hash variety. */
function loadNpcGlb(role, spec){
  return new Promise(resolve => {
    const loader = npcGltfLoader();
    if(!loader){ resolve(null); return; }
    const modelKey = (spec && spec.model) || pickNpcModelKey(role);
    const file = NPC_KAYKIT_MODELS[modelKey] || NPC_KAYKIT_MODELS.knight;
    loader.load(NPC_KAYKIT_DIR + file, gltf => {
      try {
        const root = gltf.scene;
        if(!root){ resolve(null); return; }
        dressMaterials(root, false);
        curateNpcGear(root, role);
        root.userData.emAtlasTinted = true;   // appearance-apply must not repaint the shared atlas material
        if(window.EMTINT && spec && (spec.skin || spec.hair)){
          window.EMTINT.tint(root, modelKey, spec.skin, spec.hair);
        }
        root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(root);
        const h = Math.max(0.01, box.max.y - box.min.y);
        const scl = (h > 0.05) ? (NPC_TARGET_HEIGHT / h) : 1.0;
        root.scale.setScalar(scl);
        // NO extra yaw: KayKit rigs face +Z and updateNpcs aims the group's +Z
        // along the walk direction (rotation.y = atan2(ux,uz)); the old
        // rotation.y=PI here made every NPC walk backwards.
        root.rotation.y = 0;
        root.position.set(0,0,0);
        const mixer = new THREE.AnimationMixer(root);
        const actions = {};
        Object.keys(NPC_CLIP_ALIASES).forEach(state => {
          for(const name of NPC_CLIP_ALIASES[state]){
            const clip = THREE.AnimationClip.findByName(gltf.animations || [], name);
            if(clip){ actions[state] = mixer.clipAction(clip); break; }
          }
        });
        resolve({ scene: root, mixer, actions, modelKey });
      } catch(e){ console.warn('[npc] glb body setup failed:', role, e); resolve(null); }
    }, undefined, err => { console.warn('[npc] glb body load failed:', file, err); resolve(null); });
  });
}
/* start/keep the right loop (idle vs walk) playing on an NPC's glb bundle;
   no-op if that state's clip wasn't found in the model (holds current). */
function setNpcGlbState(bundle, name){
  if(!bundle || !bundle.mixer) return;
  const action = bundle.actions[name];
  if(!action || bundle._active === name) return;
  Object.keys(bundle.actions).forEach(k => { if(k !== name) bundle.actions[k].fadeOut(0.2); });
  action.reset().fadeIn(0.2).play();
  bundle._active = name;
}

export { loadNpcGlb, setNpcGlbState };

export function addNpc(spec){
  if(!spec || spec.x==null || spec.z==null) return null;
  const id = spec.dialogue || spec.id;
  if(!id || NPCS.some(n => n.id === id)) return null;            // skip dupes (e.g. the baked monk)
  // also dedupe by NAME: the manifest ships brother_aldric while the roster already
  // has the monk (id 'monk', same display name) -> two bodies + two nameplates
  if(spec.name && NPCS.some(n => n.name && String(n.name).toLowerCase() === String(spec.name).toLowerCase())) return null;
  const x = spec.x, z = spec.z, rotY = spec.rot || 0;
  const npc = { id, name: spec.name || id, x, z, talkRange: spec.talkRange || 1.5,
    examine: spec.examine || ('A ' + (spec.role || 'villager') + '.'), wander: spec.wander || 0 };
  const role = spec.type || spec.role || 'default';
  const body = buildNpcBody(role); body.position.set(x,0,z); body.rotation.y = rotY; scene.add(body);
  const plate = nameplate(npc.name, '#ffd98a', 2.35); plate.position.set(x,2.35,z); scene.add(plate);
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,2.1,8), new THREE.MeshBasicMaterial({visible:false}));
  proxy.position.set(x,1.05,z); proxy.userData.npc = npc; scene.add(proxy); clickTargets.push(proxy);
  const col = { x, z, r:0.42 }; NPCCOLS.push(col);
  npc._proxy = proxy; npc._plate = plate; npc._col = col; npc._body = body;
  NPCS.push(npc);
  let ctrl = null;
  if(npc.wander > 0){
    ctrl = { n:npc, group:body, rig:body.userData.rig, col, home:{x,z},
      px:x, pz:z, tx:x, tz:z, rotY, moving:false, phase:0, waitT:1+Math.random()*3 };
    npcCtrl.push(ctrl);
  }
  // Kick off the rigged glTF body load in the background (BOOT-CRITICAL: the
  // procedural box body above is already live in the scene, so a slow/failed
  // load here never blocks or blanks the NPC - it just stays procedural).
  loadNpcGlb(role, npcVariety(id)).then(bundle => {
    if(!bundle || !bundle.scene) return;                // load failed - keep the procedural body
    // hide the procedural primitive meshes (legL/legR/armL/armR/torso/head) BEFORE
    // adding the glb, so the hide-pass never touches the glb's own meshes; the now-
    // invisible rig groups still exist and still move with the wander sim (position/
    // rotation only - see updateNpcs), they just render nothing.
    body.traverse(o => { if(o.isMesh) o.visible = false; });
    body.add(bundle.scene);                              // parent under the same group the wander sim already moves
    body.userData.glb = bundle;                           // gate: updateNpcs skips rig.leg/arm swing when this is set
    setNpcGlbState(bundle, (ctrl && ctrl.moving) ? 'walk' : 'idle');
  }).catch(()=>{ /* loadNpcGlb never rejects, but stay defensive */ });
  return npc;
}
if(typeof window !== 'undefined'){ window.EMNPC = window.EMNPC || {}; window.EMNPC.add = addNpc; }
