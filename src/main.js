/* =====================================================================
   ELDERMOOR - entry point. Imports every module, performs the one-time
   side-effectful wiring (DOM binds, proxy build, asset loading, input,
   HUD init, feature-module inits), exposes the shared window.EM* globals
   the feature modules read, and runs the render loop. The ONLY module
   with top-level side effects beyond engine.js\'s scene/material setup.
   ===================================================================== */
import { renderer, scene, camera } from './engine.js';
import { pos, simStep, toggleRun, rig, move } from './player.js';
import { NPCS, initProxies } from './npc.js';
import { nextDlg } from './dialogue.js';
import { walkTo } from './interact.js';
import { updCam, initInput } from './input.js';
import { startLoading } from './loaders.js';
import { initHud } from './hud.js';

/* feature modules (each self-registers on window.EM* when its init runs) */
import { initTooltip } from './tooltip.js';
import { initOrbs } from './orbs.js';
import { initXpCounter } from './xpcounter.js';
import { initWorldMap } from './worldmap.js';
import { initEmotes } from './emotes.js';
import { initSave } from './save.js';
import { initAudio } from './audio.js';
import { initCombat } from './combat.js';
import { initSkilling } from './skilling.js';
import { initEquipment } from './equipment.js';
import { initEquipTab } from './equipment-tab.js';
import { initPrayerTab } from './prayer-tab.js';
import { initMagicTab } from './magic-tab.js';
import { initQuestsTab } from './quests-tab.js';
import { initSettingsTab } from './settings-tab.js';
import { initInvOps } from './inventory-ops.js';
import { initMinimapNav } from './minimap-nav.js';
import { initLessons } from './lessons.js';
import { initCharCreate } from './charcreate.js';
import { initMusicTab } from './music-tab.js';
import { initSocial } from './social.js';
import { initSkillGuide } from './skill-guide.js';
import { initMinimapRender } from './minimap-render.js';
import { initBank } from './bank.js';
import { initLogoutTab } from './logout-tab.js';
import { initAppearanceApply } from './appearance-apply.js';
import { initMakeInterface } from './make-interface.js';
import { initSfxActions } from './sfx-actions.js';
import { initGating } from './gating.js';
import { initTick } from './tick.js';
import { initMobileUI } from './mobile-ui.js';

/* --- shared globals the feature modules read (player pos/rig/move, walk, scene) --- */
window.EMPLAYERPOS = pos;          // live Vector3 (mutated in place) → {x,z} reads stay current
window.EMRIG       = rig;          // limb pivots (emotes)
window.EMMOVE      = move;         // movement state (emotes interrupt)
window.EMSCENE     = scene;        // combat hitsplats/HP-bar sprites
window.EMTOGGLERUN = toggleRun;    // run orb click
window.EMWALK      = (x,z) => walkTo({x,z});   // minimap-nav / em-walk

/* dialogue Continue button + core wiring */
document.getElementById('dlgbtn').onclick = nextDlg;
initProxies();
startLoading();
initInput();
initHud();                          // window.EMHUD now exists for the feature modules
initMobileUI();                     // responsive layout/orientation/haptics over the HUD (Milestone 1A)

/* bring up the feature modules (order-robust - they poll for deps if absent) */
[ initTick, initTooltip, initOrbs, initXpCounter, initWorldMap, initEmotes, initSave, initAudio,
  initCombat, initSkilling, initEquipment, initEquipTab, initPrayerTab, initMagicTab,
  initQuestsTab, initSettingsTab, initInvOps, initMinimapNav,
  initLessons, initGating, initCharCreate, initMusicTab, initSocial, initSkillGuide, initMinimapRender,
  initBank, initLogoutTab, initAppearanceApply, initMakeInterface, initSfxActions
].forEach(fn => { try { fn(); } catch(e){ console.warn('[em] init failed:', fn.name, e); } });

/* minimap click-to-walk fallback (when EMWALK isn\'t reached directly) */
addEventListener('em-walk', e => { try { walkTo({x:e.detail.x, z:e.detail.z}); } catch(_){} });
/* lesson-complete events from the dialogue runner (objective handoff stub) */
addEventListener('em-lesson', e => { try { if(window.EMHUD && e.detail) EMHUD.addChat('('+e.detail+')','', true); } catch(_){} });

/* ==================================================================== LOOP */
let last = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min((now-last)/1000, 0.05); last = now;
  simStep(dt);
  updCam();
  if(window.EMWORLD && EMWORLD.tickRespawns) EMWORLD.tickRespawns(dt);   // resource node respawns
  if(window.EMHUD) EMHUD.setPlayer(pos.x, pos.z, 0, NPCS.map(n=>({x:n.x, z:n.z, c:'#ffd98a'})));
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
