/* =====================================================================
   ELDERMOOR - parameterized player avatar (CC4 / EQ4). Builds the in-world
   player from Three.js primitives so the character-creator selections
   actually appear on the body: head + hair/beard/hood, torso (tunic/robe/
   jerkin/yoke), arms (sleeved/bare/wrapped), hands (bare/gloves/bracers),
   legs (trousers/skirt/breeches), feet (boots/shoes/sandals), body type, and
   every colour. Worn weapon/shield from window.EMEQUIP are shown too.

   It reads the SAVE FORMAT unchanged (window.EMAPPEARANCE / 'eldermoor:appearance'
   and EMEQUIP.worn) and rebuilds on the 'em-appearance' event + when worn gear
   changes. The limb pivots are registered on window.EMRIG so the existing
   player.js walk cycle animates them. The original static player.glb is hidden
   while the parameterized avatar is active (and left intact as a fallback when
   no appearance is saved). Defensive: no-ops until THREE + the player group are
   ready. main.js calls initAvatar() once.

   This is the code-procedural parameterization (stylized low-poly). A higher-
   fidelity Blender-authored multi-part model can replace it later behind the
   same data contract (tracked in BACKLOG).
   ===================================================================== */

import initGlbTint from './char/glb-tint.js';

const DEF = { skin:'#e8b98e', hair:'#3a2a1c', torso:'#3f6f8c', legs:'#2f3742', feet:'#5a3f28' };

/* ---------------------------------------------------------------------
   REAL-AVATAR: rigged KayKit glTF avatar path (CC0, assets/ext/characters/).
   Loads a rigged low-poly character model in place of the procedural box
   body, drives it with THREE.AnimationMixer (idle/walk/attack/death/cast),
   and sockets weapon/shield gear onto its handslot bones. Fully additive +
   defensive: any failure here (missing THREE.GLTFLoader, fetch error, no
   matching bones) leaves `current` null/procedural and the caller falls
   back to the existing buildBody() box avatar so the game never bricks.
   ===================================================================== */
const KAYKIT_DIR = 'assets/ext/characters/';
const KAYKIT_GEAR_DIR = 'assets/ext/gear/';
/* model files verified present in assets/ext/characters/ */
const KAYKIT_MODELS = {
  knight: 'Knight.glb', mage: 'Mage.glb', rogue: 'Rogue.glb',
  rogue_hooded: 'Rogue_Hooded.glb', barbarian: 'Barbarian.glb',
};
/* clip-name aliases: KayKit ships several near-duplicate clips per pose;
   try each in order, first present wins. Keeps the state API stable even
   if a given model is missing one of the alt names. */
const CLIP_ALIASES = {
  idle:   ['Idle', 'Unarmed_Idle'],
  walk:   ['Walking_A', 'Walking_B', 'Walking_C'],
  run:    ['Running_A', 'Running_B'],
  attack: ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Chop', '2H_Melee_Attack_Slice', 'Unarmed_Melee_Attack_Punch_A'],
  cast:   ['Spellcasting', 'Spellcast_Raise', 'Spellcast_Shoot'],
  death:  ['Death_A', 'Death_B'],
  hit:    ['Hit_A', 'Hit_B'],
  block:  ['Block', 'Blocking'],
  /* SKILLING-ANIM: a work-swing loop used for chop/mine/smith (and reused for
     fish/cook - KayKit ships no dedicated fishing/cooking clip, so the same
     repeating hand-swing reads as "working" for all gather/produce verbs).
     Looped (unlike the one-shot attack/cast/hit clips below) since a skilling
     action runs for many ticks, not a single swing. */
  gather: ['1H_Melee_Attack_Chop', '2H_Melee_Attack_Slice', '1H_Melee_Attack_Slice_Diagonal', 'Unarmed_Melee_Attack_Punch_A'],
};
/* -------------------------------------------------------------------
   BUILT-IN GEAR NODES. Every KayKit character glb ships its full gear
   wardrobe as ALWAYS-VISIBLE mesh nodes parented to the hand slots /
   head / chest (2 swords + 4 shields + helmet + cape on the Knight, etc.)
   glTF has no visibility flag, so untouched they ALL render at once —
   the player was walking around holding a sword and four stacked shields.
   We hide every one of them at load, then re-show the node matching each
   actually-equipped item (preferred over loading a separate gear .gltf:
   the built-ins are already skinned, positioned and atlas-textured). */
const GEAR_NODE_RE = /Sword|Shield|Axe|Knife|Crossbow|Throwable|Wand|Staff|Spellbook|Mug|Helmet|_Hat|_Cape/i;
/* per-slot: ordered [item-id regex, gear-node-name regex] — first node
   present in the loaded model wins. */
const GEAR_NODES = {
  weapon: [
    [/2h|great|battle/i,        /^2H_(Sword|Axe)$/],
    [/axe|hatchet|pick/i,       /^1H_Axe$/],
    [/dagger|knife/i,           /^Knife$/],
    [/bow/i,                    /^1H_Crossbow$/],
    [/staff/i,                  /^2H_Staff$/],
    [/wand/i,                   /^1H_Wand$/],
    [/sword|blade|scimitar/i,   /^1H_Sword$/],
    [/./,                       /^1H_(Sword|Axe)$|^Knife$|^1H_Wand$/],
  ],
  shield: [
    [/square|tower|kite/i,      /^Rectangle_Shield$/],
    [/spike/i,                  /^Spike_Shield$/],
    [/badge|buckler/i,          /^Badge_Shield$/],
    [/./,                       /Round_Shield$/],
  ],
  head:   [ [/./, /_Helmet$|_Hat$/] ],
  cape:   [ [/./, /_Cape$/] ],
};
GEAR_NODES.helm = GEAR_NODES.head;

/* collect + hide every built-in gear node; returns {name -> Object3D} */
function collectGearNodes(root){
  const nodes = {};
  root.traverse(o => {
    if(o.name && GEAR_NODE_RE.test(o.name)){ o.visible = false; nodes[o.name] = o; }
  });
  return nodes;
}

/* pick the built-in node for an equipped item id, or null */
function pickGearNode(nodes, slot, id){
  const table = GEAR_NODES[slot];
  if(!table) return null;
  id = String(id || '');
  for(const [idRe, nodeRe] of table){
    if(!idRe.test(id)) continue;
    for(const name of Object.keys(nodes)){
      if(nodeRe.test(name)) return nodes[name];
    }
  }
  return null;
}

/* gear id/slot -> KayKit gear .gltf filename (closest visual match). */
const GEAR_FILES = {
  weapon: [
    [/dagger/i, 'dagger.gltf'],
    [/axe|hatchet/i, 'axe_1handed.gltf'],
    [/staff/i, 'staff.gltf'],
    [/wand/i, 'wand.gltf'],
    [/bow/i, 'crossbow_1handed.gltf'],
    [/sword|blade|scimitar|longsword/i, 'sword_1handed.gltf'],
  ],
  shield: [
    [/square|tower|kite/i, 'shield_square.gltf'],
    [/spike/i, 'shield_spikes.gltf'],
    [/badge|buckler/i, 'shield_badge.gltf'],
    [/.*/, 'shield_round.gltf'],
  ],
};
/* the KayKit rigs are authored ~1.7 world units tall; the existing
   procedural avatar + player.glb read at ~1.8-1.9u (head pivot at y=1.62
   plus hair). Until the live mesh bounds are measured at load time this is
   the static fallback scale; loadGlbAvatar() below corrects it from the
   actual loaded bounding box so it always matches the world regardless of
   per-model authoring variance. */
const KAYKIT_FALLBACK_SCALE = 1.0;
const TARGET_HEIGHT = 1.84;   // world units - matches the procedural avatar's head height + margin

function pickModelKey(sel){
  const p = (sel && sel.parts) || {};
  const torso = String(p.torso||''), head = String(p.head||'');
  if(/robe/.test(torso)) return 'mage';
  if(/hood/.test(head)) return 'rogue_hooded';
  if(/jerkin/.test(torso)) return 'rogue';
  if(/yoke/.test(torso)) return 'barbarian';
  return 'knight';
}

function gltfLoader(){
  const T = TH();
  if(!T || typeof T.GLTFLoader !== 'function') return null;
  return new T.GLTFLoader();
}

/* find the first bone/object in the rig whose name matches any candidate,
   case-insensitively and tolerant of the '.l'/'.r' vs '_l'/'_r' suffix style. */
function findBone(root, names){
  for(const n of names){
    const o = root.getObjectByName(n);
    if(o) return o;
  }
  return null;
}

function TH(){ return (typeof window !== 'undefined') ? window.THREE : null; }
function appearance(){
  if (typeof window === 'undefined') return null;
  if (window.EMAPPEARANCE) return window.EMAPPEARANCE;
  try { const r = localStorage.getItem('eldermoor:appearance'); return r ? JSON.parse(r) : null; } catch(e){ return null; }
}
function col(sel, k){ const c = sel && sel.colours && sel.colours[k]; return c || DEF[k]; }
function dark(hex){ try{ const n=parseInt(String(hex).slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; r=(r*0.55)|0;g=(g*0.55)|0;b=(b*0.55)|0; return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}catch(e){return '#222';} }

function mat(hex){ const T=TH(); return new T.MeshStandardMaterial({ color:new T.Color(hex), flatShading:true }); }
function box(w,h,d,hex){ const T=TH(); const m=new T.Mesh(new T.BoxGeometry(w,h,d), mat(hex)); return m; }
function cyl(rt,rb,h,hex){ const T=TH(); return new T.Mesh(new T.CylinderGeometry(rt,rb,h,10), mat(hex)); }
function place(o,x,y,z){ o.position.set(x,y,z); return o; }

/* build the avatar group from an appearance selection. Returns
   { group, pivots:{legL,legR,armL,armR}, handR, handL }. */
function buildBody(sel){
  const T = TH();
  const p = (sel && sel.parts) || {};
  const head=String(p.head||''), torso=String(p.torso||''), arms=String(p.arms||''),
        hands=String(p.hands||''), legs=String(p.legs||''), feet=String(p.feet||'');
  const skin=col(sel,'skin'), hair=col(sel,'hair'), tcol=col(sel,'torso'), lcol=col(sel,'legs'), fcol=col(sel,'feet');
  const hooded=/hood/.test(head), beard=/beard/.test(head), longB=/long/.test(head);
  const robe=/robe/.test(torso), yoke=/yoke/.test(torso), jerkin=/jerkin/.test(torso);
  const skirt=/skirt/.test(legs), breeches=/breech/.test(legs);
  const bare=/bare/.test(arms), wrapped=/wrap/.test(arms);
  const gloves=/glove/.test(hands), bracers=/bracer/.test(hands);
  const boots=/boot/.test(feet), sandals=/sandal/.test(feet);
  const wide = sel && sel.bodyType === 'B';
  const bw = wide ? 1.25 : 1.0;

  const g = new T.Group();
  const armCol = (bare || wrapped) ? skin : tcol;
  const handCol = gloves ? dark(tcol) : skin;

  // torso
  const torsoH = robe ? 0.95 : 0.55, torsoY = robe ? 0.95 : 1.15;
  g.add(place(box(0.5*bw, torsoH, 0.28, tcol), 0, torsoY, 0));
  if(yoke) g.add(place(box(0.66*bw, 0.14, 0.32, tcol), 0, 1.40, 0));            // shoulder yoke
  if(jerkin) g.add(place(box(0.52*bw, 0.06, 0.30, dark(tcol)), 0, 0.92, 0));    // belt

  // head + hair/beard/hood
  g.add(place(box(0.34, 0.34, 0.32, skin), 0, 1.62, 0));
  if(hooded) g.add(place(box(0.42, 0.30, 0.40, tcol), 0, 1.70, -0.02));         // hood shell (behind/over)
  else g.add(place(box(0.38, 0.12, 0.36, hair), 0, 1.80, 0));                   // hair cap
  if(beard) g.add(place(box(0.30, longB?0.20:0.12, 0.10, hair), 0, 1.46, 0.16));

  // arms (pivots at shoulders so the walk cycle can swing them)
  const shoulderY = 1.40, shoulderX = 0.34*bw, armLen = 0.5;
  function arm(side){
    const pv = new T.Group(); pv.position.set(side*shoulderX, shoulderY, 0);
    const a = place(box(0.14, armLen, 0.16, armCol), 0, -armLen/2, 0); pv.add(a);
    if(wrapped) for(let i=0;i<3;i++) pv.add(place(box(0.15,0.03,0.17,dark(skin)),0,-0.12-i*0.13,0));
    const hand = place(box(0.13,0.13,0.13, handCol), 0, -armLen-0.04, 0); pv.add(hand);
    if(bracers) pv.add(place(box(0.15,0.06,0.17,dark(fcol)),0,-armLen+0.02,0));
    g.add(pv); return { pv, hand };
  }
  const aL = arm(-1), aR = arm(1);

  // legs (pivots at hips)
  const hipY = 0.92, hipX = 0.13*bw, legLen = 0.9;
  function leg(side){
    const pv = new T.Group(); pv.position.set(side*hipX, hipY, 0);
    const upperCol = (skirt||breeches) ? skin : lcol;
    pv.add(place(box(0.16, legLen, 0.18, upperCol), 0, -legLen/2, 0));
    // feet
    if(sandals){ pv.add(place(box(0.18,0.05,0.28, skin), 0, -legLen-0.02, 0.03)); pv.add(place(box(0.16,0.04,0.10,fcol),0,-legLen+0.02,0)); }
    else { const fh = boots?0.20:0.10; pv.add(place(box(0.18, fh, 0.28, fcol), 0, -legLen-fh/2, 0.04)); }
    g.add(pv); return pv;
  }
  const lL = leg(-1), lR = leg(1);
  if(skirt) g.add(place(cyl(0.26*bw, 0.42*bw, 0.5, lcol), 0, 0.70, 0));         // skirt drape over the legs
  else if(breeches) { g.add(place(box(0.20*bw,0.4,0.22,lcol),0,1.0,0)); }       // breeches cover upper legs

  // metrics so worn-gear overlays (body/cape/helm/legs/feet) land on the right
  // anchors regardless of body type / robe.
  const metrics = { bw, torsoY, torsoH, headY:1.62, hipY, legLen, robe:!!robe };
  return { group:g, pivots:{ legL:lL, legR:lR, armL:aL.pv, armR:aR.pv }, handR:aR.hand, handL:aL.hand, metrics };
}

export function initAvatar(){
  if (typeof window === 'undefined') return null;
  if (window.EMAVATAR) return window.EMAVATAR;
  initGlbTint();

  let current = null;       // { group, pivots, handR, handL }
  let wornSig = '';         // signature of the last-rendered worn set
  /* rigged-avatar runtime state, kept fully separate from `current` (the
     procedural fallback) so the two paths never fight over the same fields.
     glb = { scene, mixer, actions:{name->AnimationAction}, activeName,
             handR, handL, modelKey, worn:{slot->Object3D} } | null while
     loading/unavailable - player.js checks window.EMAVATAR.usingGlb() and
     skips the procedural rig swing only when this is truthy. */
  let glb = null;
  let glbWornSig = '';
  let glbLoadToken = 0;     // bumps on every rebuild; a stale in-flight load checks this and bails

  function playerGroup(){ return window.EMPLAYER || null; }
  function ready(){ return !!(TH() && playerGroup() && window.EMRIG); }

  /* ---------------------------------------------------------- glb avatar */
  function disposeGlb(){
    if(!glb) return;
    try {
      if(glb.mixer) glb.mixer.stopAllAction();
      if(glb.scene){
        glb.scene.traverse(o => { if(o.geometry && o.geometry.dispose) o.geometry.dispose();
          if(o.material){ const ms=Array.isArray(o.material)?o.material:[o.material]; ms.forEach(m=>{
            if(!m) return;
            // material.dispose() does NOT cascade to textures - free the tint
            // CanvasTexture and the kept original atlas explicitly
            if(m.map && m.map.dispose) m.map.dispose();
            const orig = m.userData && m.userData.emOrigMap;
            if(orig && orig !== m.map && orig.dispose) orig.dispose();
            if(m.dispose) m.dispose();
          }); } });
        if(glb.scene.parent) glb.scene.parent.remove(glb.scene);
      }
      if(glb.worn) Object.keys(glb.worn).forEach(k => disposeGearMesh(glb.worn[k]));
    } catch(_){}
    glb = null;
    glbWornSig = '';
    _mixerFinishedBound = false;   // the next loadGlbAvatar() creates a fresh mixer - rebind its 'finished' listener
  }

  function disposeGearMesh(mesh){
    if(!mesh) return;
    try {
      mesh.traverse(o => { if(o.geometry && o.geometry.dispose) o.geometry.dispose();
        if(o.material){ const ms=Array.isArray(o.material)?o.material:[o.material]; ms.forEach(m=>m.dispose&&m.dispose()); } });
      if(mesh.parent) mesh.parent.remove(mesh);
    } catch(_){}
  }

  /* resolve a clip alias list against the loaded animations; returns the
     first matching THREE.AnimationAction, or null. */
  function resolveAction(mixer, root, aliasList){
    if(!root.animations || !root.animations.length) return null;
    for(const name of aliasList){
      const clip = TH().AnimationClip.findByName(root.animations, name);
      if(clip) return mixer.clipAction(clip);
    }
    return null;
  }

  /* Attempt the rigged-glTF avatar load. Resolves true on success (glb is
     populated), false on any failure (caller keeps/uses the procedural
     buildBody fallback). Never throws. */
  function loadGlbAvatar(sel, pg){
    return new Promise(resolve => {
      const T = TH();
      const loader = gltfLoader();
      if(!T || !loader){ resolve(false); return; }
      const modelKey = pickModelKey(sel);
      const file = KAYKIT_MODELS[modelKey] || KAYKIT_MODELS.knight;
      const myToken = ++glbLoadToken;
      loader.load(KAYKIT_DIR + file, gltf => {
        if(myToken !== glbLoadToken){ return resolve(false); }   // a newer rebuild superseded this load
        try {
          const root = gltf.scene;
          if(!root){ resolve(false); return; }
          // scale to match the world: measure the loaded bounding box and
          // fit it to TARGET_HEIGHT rather than trusting a hardcoded ratio,
          // so per-model authoring variance (Mage vs Knight vs Barbarian)
          // never desyncs the silhouette from the ground / camera rig.
          root.updateMatrixWorld(true);
          const box = new T.Box3().setFromObject(root);
          const h = Math.max(0.01, box.max.y - box.min.y);
          const scl = (h > 0.05) ? (TARGET_HEIGHT / h) : KAYKIT_FALLBACK_SCALE;
          root.scale.setScalar(scl);
          // NO extra yaw: the KayKit rig faces +Z, same as the procedural body
          // (beard/boots at +Z), and player.js aims the GROUP's +Z along the
          // walk direction (rotation.y = atan2(ux,uz)). The old rotation.y=PI
          // here flipped the model 180deg — the "walking backwards" bug.
          root.rotation.y = 0;
          root.position.set(0,0,0);

          const mixer = new T.AnimationMixer(root);
          const actions = {};
          Object.keys(CLIP_ALIASES).forEach(state => {
            const a = resolveAction(mixer, gltf, CLIP_ALIASES[state]);
            if(a){ a.clampWhenFinished = (state==='death'); a.loop = (state==='death'||state==='attack'||state==='cast'||state==='hit') ? T.LoopOnce : T.LoopRepeat; actions[state] = a; }
          });
          const handR = findBone(root, ['handslot.r', 'handslot_r', 'hand.r']);
          const handL = findBone(root, ['handslot.l', 'handslot_l', 'hand.l']);

          // hide the baked-in gear wardrobe (all of it renders by default);
          // renderWornGlb() re-shows the pieces the player actually wears.
          const gearNodes = collectGearNodes(root);
          root.userData.emAtlasTinted = true;   // appearance-apply must not repaint the shared atlas material

          glb = { scene: root, mixer, actions, activeName: null, handR, handL, modelKey, worn:{}, gearNodes };
          pg.add(root);

          // apply the creator's skin-tone / hair-colour picks to the atlas
          if(window.EMTINT) window.EMTINT.tint(root, modelKey, col(sel,'skin'), col(sel,'hair'));

          // start in idle (or whatever's available) immediately
          playState('idle');
          resolve(true);
        } catch(e){ console.warn('[avatar] glb avatar setup failed:', e); resolve(false); }
      }, undefined, err => { console.warn('[avatar] glb avatar load failed:', file, err); resolve(false); });
    });
  }

  /* crossfade to a named state (idle/walk/run/attack/cast/death/hit/block/gather).
     Falls back to idle if the requested state has no resolved clip; no-ops
     entirely if no glb avatar is active. oneShot states (attack/cast/hit)
     auto-return to idle/walk via the mixer 'finished' listener. */
  function playState(name, fadeS){
    if(!glb || !glb.mixer) return false;
    const fade = (fadeS == null) ? 0.18 : fadeS;
    let action = glb.actions[name] || glb.actions.idle;
    if(!action) return false;
    const actName = glb.actions[name] ? name : 'idle';
    if(glb.activeName === actName && action.isRunning()) return true;
    Object.keys(glb.actions).forEach(k => { if(k !== actName) glb.actions[k].fadeOut(fade); });
    action.reset().fadeIn(fade).play();
    glb.activeName = actName;
    return true;
  }

  /* SKILLING-ANIM: is a gather/produce action currently ticking?
     Reads the already-published, read-only window.EMSKILL.isActive() (see
     skilling.js initSkilling()) - no patching, no invasive hook, just a
     boolean poll of a public accessor that already exists for this purpose. */
  function skillingActive(){
    try { return !!(window.EMSKILL && window.EMSKILL.isActive && window.EMSKILL.isActive()); }
    catch(e){ return false; }
  }

  /* setState() is called every frame by player.js with 'walk'/'idle' (plus
     rising-edge 'attack'/'death'). player.js has no knowledge of skilling
     (it only owns movement/combat), so we intercept its low-priority
     walk/idle requests here and substitute the looping 'gather' clip while
     a skill action is actively ticking AND the player isn't walking (a step
     away should read as the player abandoning the action, matching OSRS).
     'attack'/'cast'/'death'/'hit'/'block' always pass through untouched -
     they already win by construction (player.js only calls them on rising
     edges and they auto-settle back to idle/walk via bindMixerFinished). */
  function setState(name, fadeS){
    if((name === 'walk' || name === 'idle') && glb && glb.actions.gather){
      const moving = window.EMMOVE && window.EMMOVE.moving;
      if(!moving && skillingActive()) return playState('gather', fadeS);
    }
    return playState(name, fadeS);
  }
  let _mixerFinishedBound = false;
  function bindMixerFinished(){
    if(_mixerFinishedBound || !glb || !glb.mixer) return;
    glb.mixer.addEventListener('finished', e => {
      // one-shot clips (attack/cast/hit/death) settle back to idle/walk once they end,
      // EXCEPT death, which holds its final pose (clampWhenFinished above).
      if(glb && glb.activeName && glb.activeName !== 'death'){
        const moving = window.EMMOVE && window.EMMOVE.moving;
        playState(moving ? 'walk' : 'idle');
      }
    });
    _mixerFinishedBound = true;
  }

  /* public per-frame tick - called from player.js simStep(dt) each frame. */
  function update(dt){
    if(glb && glb.mixer) glb.mixer.update(dt);
  }
  function usingGlb(){ return !!(glb && glb.scene); }

  function disposeGroup(grp){
    if(!grp) return;
    grp.traverse(o => { if(o.geometry && o.geometry.dispose) o.geometry.dispose();
      if(o.material){ const ms = Array.isArray(o.material)?o.material:[o.material]; ms.forEach(m=>m.dispose&&m.dispose()); } });
    if(grp.parent) grp.parent.remove(grp);
  }

  function hideGlb(pg, keep){
    // Hide the static glb mesh(es) under the player group, but leave our avatar
    // group AND any non-mesh overlays (sprites / nameplates / arrows that other
    // modules may parent to the player) visible. We detect the glb by it owning
    // renderable mesh geometry; sprites and groups-of-sprites are left alone.
    (pg.children || []).slice().forEach(c => {
      if(c === keep) return;
      if(c.userData && c.userData.emKeepVisible) return;     // explicit opt-out
      let hasMesh = false;
      try { c.traverse(o => { if(o.isMesh) hasMesh = true; }); } catch(_){ hasMesh = !!c.isMesh; }
      if(hasMesh) c.visible = false;
    });
  }

  function rebuild(){
    const sel = appearance();
    if(!sel || !ready()) return false;
    const pg = playerGroup();
    // Tear down any previous rigged-glb avatar too - a rebuild means the
    // appearance changed, so the model choice (pickModelKey) may change.
    disposeGlb();
    if(current) disposeGroup(current.group);
    current = buildBody(sel);
    pg.add(current.group);
    hideGlb(pg, current.group);
    // hand the limb pivots to the walk rig so player.js animates the avatar
    const rig = window.EMRIG;
    rig.legL = current.pivots.legL; rig.legR = current.pivots.legR;
    rig.armL = current.pivots.armL; rig.armR = current.pivots.armR;
    wornSig = '';                 // force worn re-render against the new hands
    renderWorn();

    // Kick off the rigged glTF avatar load in the background (BOOT-CRITICAL:
    // the procedural body above is already live, so a failure/slow network
    // here never blocks or blanks the player - it just stays procedural).
    loadGlbAvatar(sel, pg).then(ok => {
      if(!ok || !glb) return;
      bindMixerFinished();
      hideGlb(pg, glb.scene);          // hide the procedural body + static player.glb, keep only the rigged avatar
      current.group.visible = false;   // belt-and-suspenders: procedural group stays built (cheap) but hidden
      glbWornSig = '';                 // force gear re-render against the new hand bones
      renderWornGlb();
    }).catch(()=>{ /* loadGlbAvatar never rejects, but stay defensive */ });
    return true;
  }

  /* read the live worn map ({slot -> {id,count}|string}) as a plain {slot:id} */
  function wornState(){
    const e = window.EMEQUIP; const w = (e && e.worn) || {};
    const out = {};
    Object.keys(w).forEach(slot => { const v = w[slot]; const id = v && (v.id || v); if(id) out[slot] = String(id); });
    return out;
  }

  /* low-poly substance colour for a worn item, derived from its id keywords */
  function gearColor(slot, id){
    id = String(id||'');
    if(/gold|gilded|brass/.test(id)) return '#d8b25a';
    if(/leather|hide|studded/.test(id)) return '#5a3f28';
    if(/bronze/.test(id)) return '#8a6b3a';
    if(/iron/.test(id)) return '#6b7178';
    if(/steel|metal|plate|chain|mail/.test(id)) return '#c2cad4';
    if(/wood|oak|wooden/.test(id)) return '#6b4f2e';
    if(slot === 'cape') return '#9c3030';
    if(slot === 'weapon') return '#c2cad4';
    if(slot === 'shield') return '#5a3f28';
    return '#7a6a52';
  }

  /* (re)build EVERY worn item onto the avatar: weapon+shield ride the hands so
     they swing with the walk cycle; body/cape/helm/legs/feet are body-fixed
     overlays. Items unequipped since last call are removed. */
  function renderWorn(){
    if(!current) return;
    const T = TH(); if(!T) return;
    const ws = wornState();
    const sig = Object.keys(ws).sort().map(s => s + ':' + ws[s]).join('|');
    if(sig === wornSig) return;
    wornSig = sig;

    // tear down the previous worn meshes (each remembers its own parent)
    if(current._worn) current._worn.forEach(m => disposeGroup(m));
    current._worn = [];
    const add = (mesh, parent) => { if(mesh && parent){ parent.add(mesh); current._worn.push(mesh); } };

    const m = current.metrics || { bw:1, torsoY:1.15, torsoH:0.55, headY:1.62, hipY:0.92, legLen:0.9, robe:false };
    const bw = m.bw;

    Object.keys(ws).forEach(slot => {
      const id = ws[slot];
      const c = gearColor(slot, id);
      if(slot === 'weapon'){
        let mesh;
        if(/bow/.test(id)) mesh = place(box(0.06,0.7,0.04,'#5a3f28'), 0, -0.2, 0.05);
        else if(/staff|wand/.test(id)) mesh = place(box(0.05,0.8,0.05,'#5a3f28'), 0, -0.2, 0);
        else if(/pick/.test(id)) mesh = place(box(0.06,0.34,0.30, c), 0, -0.22, 0.06);
        else if(/axe|hatchet/.test(id)){ mesh = place(box(0.05,0.40,0.05,'#5a3f28'),0,-0.24,0.04); add(place(box(0.16,0.16,0.08,c),0,-0.04,0.06), mesh); }
        else mesh = place(box(0.06,0.5,0.12, c), 0, -0.28, 0.04);              // blade/dagger
        add(mesh, current.handR);
      } else if(slot === 'shield'){
        const sh = cyl(0.22,0.22,0.05, c); sh.rotation.x = Math.PI/2; place(sh, 0, -0.1, 0.06);
        add(sh, current.handL);
      } else if(slot === 'body'){
        // armour shell over the torso (slightly larger so it reads as worn)
        add(place(box(0.56*bw, m.torsoH+0.06, 0.34, c), 0, m.torsoY, 0), current.group);
        add(place(box(0.70*bw, 0.12, 0.36, c), 0, m.torsoY + m.torsoH/2, 0), current.group); // shoulder pauldrons
      } else if(slot === 'cape'){
        add(place(box(0.46*bw, 0.9, 0.05, c), 0, m.torsoY - 0.05, -0.20), current.group);     // draped on the back
      } else if(slot === 'head' || slot === 'helm'){
        add(place(box(0.40, 0.22, 0.40, c), 0, m.headY + 0.16, 0), current.group);            // helm shell
      } else if(slot === 'legs'){
        add(place(box(0.46*bw, 0.5, 0.30, c), 0, m.hipY - 0.18, 0), current.group);           // greaves/skirt of mail
      } else if(slot === 'feet'){
        add(place(box(0.20, 0.16, 0.30, c), -0.13*bw, m.hipY - m.legLen, 0.04), current.group);
        add(place(box(0.20, 0.16, 0.30, c),  0.13*bw, m.hipY - m.legLen, 0.04), current.group);
      } else if(slot === 'hands'){
        // gloves: small cubes over both hands
        if(current.handR) add(box(0.16,0.16,0.16, c), current.handR);
        if(current.handL) add(box(0.16,0.16,0.16, c), current.handL);
      }
      // ammo / ring / amulet: no visible mesh (parity with OSRS scale)
    });
  }

  /* gear id -> best-match KayKit gear filename, or null if the slot has no
     KayKit prop equivalent (armour/legs/feet/helm read purely as re-tints
     on the base rig for now - no matching GLTF exists in assets/ext/gear/). */
  function pickGearFile(slot, id){
    const table = GEAR_FILES[slot];
    if(!table) return null;
    id = String(id||'');
    for(const [re, file] of table){ if(re.test(id)) return file; }
    return null;
  }

  /* (re)build weapon/shield gear onto the rigged glb avatar's hand-slot bones.
     Loads + clones the matching KayKit gear .gltf and parents it to
     handslot.r (weapon) / handslot.l (shield), with a small offset so the
     grip sits in the hand. Removed cleanly on unequip. Defensive: any
     missing bone / failed load / unmapped id just skips that slot silently -
     never throws, never blocks the rest of the avatar. */
  let _gearLoaderInst = null;   // lazily constructed, keeps a single GLTFLoader instance for gear pieces
  function getGearLoader(){
    if(_gearLoaderInst) return _gearLoaderInst;
    _gearLoaderInst = gltfLoader();
    return _gearLoaderInst;
  }
  const GEAR_OFFSET = {
    weapon: { pos:[0, -0.02, 0.02], rot:[0, 0, 0] },
    shield: { pos:[0, -0.02, 0.02], rot:[0, Math.PI/2, 0] },
  };
  const GLB_GEAR_SLOTS = ['weapon','shield','head','helm','cape'];
  function renderWornGlb(){
    if(!glb || !glb.scene) return;
    const ws = wornState();
    const sig = Object.keys(ws).filter(k => GLB_GEAR_SLOTS.indexOf(k) >= 0).sort().map(s => s + ':' + ws[s]).join('|');
    if(sig === glbWornSig) return;
    glbWornSig = sig;

    // tear down: re-hide any built-in node shown last pass, dispose loaded props
    GLB_GEAR_SLOTS.forEach(slot => {
      const prev = glb.worn[slot];
      if(!prev) return;
      if(prev.userData && prev.userData.emBuiltinGear) prev.visible = false;
      else disposeGearMesh(prev);
      glb.worn[slot] = null;
    });

    GLB_GEAR_SLOTS.forEach(slot => {
      const id = ws[slot];
      if(!id) return;
      // 1) PREFERRED: the model's own baked-in gear node — already skinned,
      //    positioned and textured from the same atlas as the body.
      const node = pickGearNode(glb.gearNodes || {}, slot, id);
      if(node){
        node.visible = true;
        node.userData.emBuiltinGear = true;
        glb.worn[slot] = node;
        return;
      }
      // 2) FALLBACK: clone a standalone KayKit gear .gltf onto the hand bone
      //    (weapon/shield only — armour slots have no standalone props).
      if(slot !== 'weapon' && slot !== 'shield') return;
      const bone = slot === 'weapon' ? glb.handR : glb.handL;
      if(!bone) return;                              // rig has no matching socket - skip gracefully
      const file = pickGearFile(slot, id);
      if(!file) return;                               // no KayKit prop maps to this item id
      const loader = getGearLoader();
      if(!loader) return;
      const myGlb = glb;                               // capture so a stale async resolve can detect a rebuild
      loader.load(KAYKIT_GEAR_DIR + file, gltf => {
        if(myGlb !== glb || !glb.worn) return;          // avatar was rebuilt/torn down while this was in flight
        try {
          const piece = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if(!piece) return;
          const off = GEAR_OFFSET[slot] || { pos:[0,0,0], rot:[0,0,0] };
          piece.position.set(off.pos[0], off.pos[1], off.pos[2]);
          piece.rotation.set(off.rot[0], off.rot[1], off.rot[2]);
          bone.add(piece);
          glb.worn[slot] = piece;
        } catch(e){ console.warn('[avatar] gear attach failed:', slot, file, e); }
      }, undefined, err => { console.warn('[avatar] gear load failed:', file, err); });
    });
  }

  // build when ready / on appearance change; poll worn gear for equip/unequip
  let tries = 0;
  (function pump(){ if(rebuild()) return; if(++tries < 120) setTimeout(pump, 150); })();
  addEventListener('em-appearance', () => { try { rebuild(); } catch(e){} }, { passive:true });
  if(typeof setInterval === 'function') setInterval(() => {
    try { renderWorn(); } catch(e){}
    try { renderWornGlb(); } catch(e){}
  }, 400);

  /* -------------------------------------------------------- creator preview
     Load a standalone tinted+idling copy of the rigged model for a given
     appearance selection (used by the character creator so the preview shows
     the REAL in-world character, not the procedural box body). Async;
     cb({group, mixer, modelKey, retint}) on success, cb(null) on any failure
     (caller falls back to buildBody / the SVG paper-doll). The caller owns
     the returned group (adds it to its own scene + ticks the mixer). */
  function buildGlbPreview(sel, cb){
    const T = TH();
    const loader = gltfLoader();
    if(!T || !loader){ cb && cb(null); return; }
    const modelKey = pickModelKey(sel);
    const file = KAYKIT_MODELS[modelKey] || KAYKIT_MODELS.knight;
    loader.load(KAYKIT_DIR + file, gltf => {
      try {
        const root = gltf.scene;
        if(!root){ cb && cb(null); return; }
        root.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(root);
        const hgt = Math.max(0.01, box.max.y - box.min.y);
        root.scale.setScalar(hgt > 0.05 ? (TARGET_HEIGHT / hgt) : 1);
        collectGearNodes(root);                     // hide the baked-in gear wardrobe
        root.userData.emAtlasTinted = true;         // keep appearance-apply's heuristics off the atlas
        const retint = (skinHex, hairHex) => {
          if(window.EMTINT) window.EMTINT.tint(root, modelKey, skinHex, hairHex);
        };
        retint(col(sel,'skin'), col(sel,'hair'));
        const mixer = new T.AnimationMixer(root);
        const idle = resolveAction(mixer, gltf, CLIP_ALIASES.idle);
        if(idle) idle.play();
        cb && cb({ group: root, mixer, modelKey, retint });
      } catch(e){ console.warn('[avatar] preview build failed:', e); cb && cb(null); }
    }, undefined, err => { console.warn('[avatar] preview load failed:', file, err); cb && cb(null); });
  }

  window.EMAVATAR = {
    rebuild, renderWorn, buildBody, buildGlbPreview, pickModelKey,
    current(){ return current; },
    /* REAL-AVATAR state API: driven by player.js each frame. */
    update,                 // update(dt) - ticks the AnimationMixer; no-op if no glb avatar loaded
    setState,                // setState('idle'|'walk'|'run'|'attack'|'cast'|'death'|'hit'|'block'|'gather', fadeSeconds?)
                              // (walk/idle requests are transparently upgraded to 'gather' while a skill
                              // action is actively ticking and the player isn't moving - see setState() above)
    usingGlb,                // true once the rigged glTF avatar has replaced the procedural body
  };
  return window.EMAVATAR;
}

export default initAvatar;
