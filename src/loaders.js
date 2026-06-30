/* =====================================================================
   ELDERMOOR - asset loading module. Owns the GLTFLoader, the load counter
   (maybeReady / EXPECTED_LOADS), and every async fetch/load: the colliders
   + manifest sidecars, world.glb, the kit pieces, player.glb, and the
   per-NPC glTFs (which also wire up the wander controllers).
   startLoading() kicks the whole sequence; called once from main.js.
   ===================================================================== */
import { scene, dressMaterials } from './engine.js';
import {
  applyColliders, instanceManifest, PIECES, buildGrid
} from './world.js';
import { player, rig } from './player.js';
import { NPCS, npcCtrl } from './npc.js';

/* ------------------------------------------------------------ asset loading */
let loaded = 0;
/* world.glb + player.glb + 3 kit pieces (tree/bush/rock) + every NPC glb + the
   content-data registry fetch (quests/emotes/.../lessons) - overlay clears only
   when ALL expected loads resolve, so scenery/NPCs/content never pop in after
   the loading screen has already faded. */
const KIT_PIECE_COUNT = Object.keys(PIECES).length;   // dynamic: tree/bush/rock + zone fixtures
const EXPECTED_LOADS = 2 + KIT_PIECE_COUNT + NPCS.filter(n => n.glb).length + 1 /* content-data registry */;
/* Safety net: never let the overlay hang forever if one load silently never
   settles (every loader.load() error path already calls maybeReady(), and
   loadContentData()'s fetches never reject - but this guards any path we
   haven't anticipated, e.g. a future loader that forgets to call maybeReady()). */
const LOAD_TIMEOUT_MS = 20000;
let loadTimedOut = false;
function clearOverlay(){
  const l = document.getElementById('load');
  if(l){ l.style.opacity = 0; setTimeout(()=>l.remove(), 600); }
}
function maybeReady(){ if(++loaded >= EXPECTED_LOADS && !loadTimedOut) clearOverlay(); }
setTimeout(() => { if(loaded < EXPECTED_LOADS){ loadTimedOut = true; clearOverlay(); } }, LOAD_TIMEOUT_MS);
const loader = new THREE.GLTFLoader();
const WORLD = 'assets/world.glb';

/* ---------------------------------------------------- content-data registry
   Fetches the JSON content files (quests/emotes/music/settings/appearance/
   dialogue) into a shared window.EMDATA registry so tab/feature modules can
   read game content without re-fetching. Each file is optional: a 404 or a
   parse failure for one file yields null for that key and never rejects, so
   one missing file can\'t sink the others. This runs in parallel with - and
   independently of - the 3D asset loader, but the load overlay now waits on
   it too (via maybeReady()) so HUD/quest/dialogue content that reads
   window.EMDATA doesn't pop in right after the loading screen disappears.
   Listeners render on the 'em-data-ready' event. */
const EM_DATA_FILES = ['quests', 'emotes', 'music', 'settings', 'appearance', 'dialogue', 'combat', 'examine', 'lessons'];
function loadContentData(){
  const fetchOne = key => fetch('assets/data/' + key + '.json')
    .then(r => r.ok ? r.json() : null)
    .catch(() => null);
  Promise.all(EM_DATA_FILES.map(fetchOne)).then(results => {
    const data = {};
    EM_DATA_FILES.forEach((key, i) => { data[key] = results[i]; });
    window.EMDATA = data;
    window.dispatchEvent(new CustomEvent('em-data-ready'));
    maybeReady();
  });
}

export function startLoading(){
  loadContentData();                                              // content registry (non-blocking)
  fetch(WORLD.replace('.glb', '.colliders.json'))                 // nav/collision sidecar
    .then(r => r.json()).then(applyColliders)
    .catch(err => console.warn('colliders json failed:', err));
  loader.load(WORLD, g => { dressMaterials(g.scene); scene.add(g.scene); maybeReady(); },
    undefined, err => { document.getElementById('load').textContent = 'Failed to load world.glb - ' + err; });

  /* kit-piece library + manifest instancing: one glb per piece, cloned at every placement the
     world manifest lists. This is how the island scales by DATA - drop instances, not geometry. */
  (function loadPiecesThenManifest(){
    const keys = Object.keys(PIECES); let n = keys.length;
    keys.forEach(k => loader.load(PIECES[k].url, g => { dressMaterials(g.scene); PIECES[k].tpl = g.scene; maybeReady();
      if(--n === 0) fetch(WORLD.replace('.glb','.manifest.json')).then(r=>r.json()).then(instanceManifest).catch(()=>{}); },
      undefined, err => { console.warn('kit piece load failed:', k, err); maybeReady();
        if(--n === 0) fetch(WORLD.replace('.glb','.manifest.json')).then(r=>r.json()).then(instanceManifest).catch(()=>{}); }));
  })();

  loader.load('assets/player.glb', g => {
    dressMaterials(g.scene, false); player.add(g.scene);
    ['legL','legR','armL','armR'].forEach(n => { const o = g.scene.getObjectByName(n); if(o) rig[n] = o; });
    // The parameterized avatar (avatar.js) may already have built into the player group
    // and registered its own limb pivots BEFORE this async glb load resolves. Adding the
    // glb scene now would render it on top of the avatar, and the rig writes above would
    // steal the walk animation from the avatar pivots. Let the avatar re-assert last:
    // it re-hides every non-avatar child (incl. this glb) and reclaims rig.legL/R/armL/R.
    try { if(window.EMAVATAR && window.EMAVATAR.rebuild) window.EMAVATAR.rebuild(); } catch(_){}
    maybeReady();
  }, undefined, err => { document.getElementById('load').textContent = 'Failed to load player.glb - ' + err; });

  /* place every NPC that has its own glTF (data-driven) + wire up wandering */
  NPCS.filter(n => n.glb).forEach(n => {
    loader.load(n.glb, g => {
      dressMaterials(g.scene, false);
      g.scene.position.set(n.x, 0, n.z);
      g.scene.rotation.y = (n.rotY || 0);
      scene.add(g.scene);
      const rg = {}; ['legL','legR','armL','armR'].forEach(k => { const o = g.scene.getObjectByName(k); if(o) rg[k]=o; });
      if(n.wander) npcCtrl.push({ n, group:g.scene, rig:rg, col:n._col,
        home:{x:n.x, z:n.z}, px:n.x, pz:n.z, tx:n.x, tz:n.z,
        rotY:n.rotY||0, moving:false, phase:0, waitT:1+Math.random()*3 });
      maybeReady();
    }, undefined, err => { console.warn('NPC load failed:', n.id, err); maybeReady(); });
  });
}
