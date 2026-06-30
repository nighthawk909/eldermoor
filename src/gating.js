/* =====================================================================
   ELDERMOOR - lesson gating module (FLOW/GATE).

   Makes the Tutorial-Island lesson chain actually drive gameplay: a player
   may not perform a skill/combat/bank action until the lesson that TEACHES
   it has been reached, and may not walk into a lesson-locked region until
   it is unlocked. When blocked, the player gets an OSRS-style nudge that
   points them at the right instructor instead of the action silently firing.

   Two consultation surfaces, both order-robust (callers null-check EMGATE):
     * window.EMGATE.allow(target)  - interact.js asks before the default
       action on a picked target (scenery/fixture/mob/object). NPCs, the
       altar and plain ground are never gated, so walking + talking always
       work.
     * window.EMGATE.regionBlocked(x,z) - world.js asks per movement step.
       Locked regions are registered with lockRegion()/clearRegions(); none
       are placed in the current single-zone build, so movement is unchanged
       until zones/doors land, at which point gating bites automatically.

   Anti-brick guarantee: a gate stays OPEN when the lesson that would gate it
   cannot yet be taught - i.e. its instructor NPC is not present in the world,
   or the lessons data / EMLESSON state is absent, or the tutorial is done.
   This keeps the deployed sandbox fully testable while the world is still a
   single zone with no instructors placed. Testers can also hard-disable via
   EMGATE.setEnabled(false) (persisted) or window.EM_GATING_OFF.

   Reads EMLESSON (cursor/flags) and EMHUD (chat nudge) defensively, and the
   NPC roster (read-only) to decide instructor presence. Mutates nothing it
   does not own.
   ===================================================================== */

import { NPCS } from './npc.js';

const NUDGE_MS = 2500;            // throttle so a held/streamed tap can't spam chat
const STORAGE_KEY = 'eldermoor:gating';

let enabled = true;
let lastNudge = 0;
let lastNudgeKey = '';
const regions = [];               // [{x0,x1,z0,z1,id}] lesson-locked rectangles (empty until zones land)

/* ------------------------------------------------------------ environment */
function hud()     { return (typeof window !== 'undefined' && window.EMHUD) ? window.EMHUD : null; }
function lessonAPI(){ return (typeof window !== 'undefined' && window.EMLESSON) ? window.EMLESSON : null; }
function lessonsData(){
  const d = (typeof window !== 'undefined') ? window.EMDATA : null;
  const list = d && d.lessons;
  if (Array.isArray(list)) return list;
  if (list && Array.isArray(list.lessons)) return list.lessons;
  return [];
}

function loadEnabled(){
  try {
    if (typeof window !== 'undefined' && window.EM_GATING_OFF) return false;
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch (e) { return true; }
}
function saveEnabled(v){
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, v ? 'on' : 'off'); }
  catch (e) { /* private mode - run from memory */ }
}

/* ------------------------------------------------------------ target -> lesson
   Map a picked target to the keywords of the lesson that introduces its action.
   Anything not in this table is ungated (returns null -> always allowed). */
function keywordsFor(t){
  if (!t || typeof t !== 'object') return null;
  if (t.kind === 'mob') return ['attack', 'combat'];
  if (t.fixture){
    switch (t.fixture){
      case 'fishing-spot': return ['fish'];
      case 'fire':         return ['cook'];
      case 'furnace':      return ['smelt', 'smith'];
      case 'anvil':        return ['smith'];
      case 'bank-booth':   return ['bank'];
      default:             return null;        // poll-booth etc. - not a lesson action
    }
  }
  if (t.kind === 'scenery'){
    if (t.type === 'tree') return ['chop', 'woodcut'];
    if (t.type === 'rock') return ['mine', 'mining'];
  }
  return null;                                 // NPCs, altar, ground, unknown -> ungated
}

function lessonMatches(lesson, kws){
  if (!lesson) return false;
  const title = String(lesson.title || '').toLowerCase();
  if (kws.some(k => title.indexOf(k) !== -1)) return true;
  const steps = Array.isArray(lesson.steps) ? lesson.steps : [];
  return steps.some(s => {
    const a = String((s && s.action) || '').toLowerCase();
    return kws.some(k => a === k || a.indexOf(k) !== -1);
  });
}

/* First lesson (with its index) that teaches the target's action, or null. */
function introLessonFor(t){
  const kws = keywordsFor(t);
  if (!kws) return null;
  const ls = lessonsData();
  for (let i = 0; i < ls.length; i++){
    if (lessonMatches(ls[i], kws)) return { lesson: ls[i], index: i };
  }
  return null;
}

/* ------------------------------------------------------------ state reads */
function snapshot(){
  const api = lessonAPI();
  if (!api || typeof api.current !== 'function') return null;
  try { return api.current(); } catch (e) { return null; }
}

function reached(intro, snap){
  if (!snap) return true;                                  // no state -> don't gate
  if (snap.done) return true;
  const p = snap.progress || {};
  if (Number.isInteger(p.lessonIndex) && p.lessonIndex >= intro.index) return true;
  const id = intro.lesson && intro.lesson.id;
  return !!(id && Array.isArray(snap.completed) && snap.completed.indexOf(id) !== -1);
}

/* True when the lesson's instructor is NOT in the world yet (can't be taught,
   so we must not lock the player out of the action). */
function instructorAbsent(lesson){
  const who = lesson && lesson.instructor;
  if (!who) return false;                                  // unowned lesson - treat as teachable
  const want = String(who).toLowerCase();
  return !NPCS.some(n => {
    const id = String(n.id || '').toLowerCase();
    const nm = String(n.name || '').toLowerCase();
    return id === want || nm.indexOf(want) !== -1;
  });
}

/* ------------------------------------------------------------ public checks */
function evaluate(t){
  // returns { allowed, intro } - intro present only when a gate applies
  if (!enabled) return { allowed: true };
  const intro = introLessonFor(t);
  if (!intro) return { allowed: true };                    // ungated target
  const snap = snapshot();
  if (!snap) return { allowed: true };                     // lesson system not ready
  if (instructorAbsent(intro.lesson)) return { allowed: true, intro, antibrick: true };
  if (reached(intro, snap)) return { allowed: true, intro };
  return { allowed: false, intro };
}

function allow(t){ return evaluate(t).allowed; }

function capitalize(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function nudge(t){
  const res = evaluate(t);
  if (res.allowed || !res.intro) return;                   // nothing to say
  const l = res.intro.lesson;
  const who = l.instructor ? capitalize(l.instructor) : null;
  const title = l.title || l.id || 'your training';
  const msg = who
    ? "You should speak to " + who + " and learn " + title + " before you try that."
    : "You need to complete " + title + " before you try that.";
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const key = l.id || title;
  if (now - lastNudge < NUDGE_MS && key === lastNudgeKey) return;
  lastNudge = now; lastNudgeKey = key;
  const h = hud();
  if (h && typeof h.addChat === 'function') h.addChat(msg, '', true);
}

/* ------------------------------------------------------------ region gating */
function regionBlocked(x, z){
  if (!enabled || !regions.length) return false;
  for (const r of regions){ if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true; }
  return false;
}
function lockRegion(rect, id){
  if (!rect) return;
  regions.push({ x0: rect.x0, x1: rect.x1, z0: rect.z0, z1: rect.z1, id: id || null });
}
function clearRegions(id){
  if (id == null) { regions.length = 0; return; }
  for (let i = regions.length - 1; i >= 0; i--){ if (regions[i].id === id) regions.splice(i, 1); }
}

/* ------------------------------------------------------------ public API */
export function initGating(){
  if (typeof window !== 'undefined' && window.EMGATE) return window.EMGATE;
  enabled = loadEnabled();
  window.EMGATE = {
    allow,                                   // boolean: may the default action on this target fire?
    check(t){ return evaluate(t); },         // full result {allowed, intro, antibrick?}
    nudge,                                    // emit the OSRS-style chat nudge for a locked target
    regionBlocked,                            // boolean: is this world point in a locked region?
    lockRegion, clearRegions,                 // manage lesson-locked rectangles (for zone placement)
    setEnabled(v){ enabled = !!v; saveEnabled(enabled); return enabled; },
    enabled(){ return enabled; }
  };
  return window.EMGATE;
}

export default initGating;
