/* =====================================================================
   ELDERMOOR - save/load module. Persists + restores game state to
   localStorage under a single versioned key, and exposes a small public
   API (window.EMSAVE) plus an initSave() bootstrapper that main.js wires
   in. This module is intentionally defensive: it must never throw into
   the game loop. Storage quota errors, corrupt JSON, and a not-yet-ready
   HUD are all handled gracefully (skip / clear-and-fresh / retry).

   State is read from the live HUD getters (window.EMHUD.getSkillXp /
   getInv) and the optional settings module (window.EMSETTINGS), and is
   re-applied on load via window.EMHUD.loadState?.(data) when the HUD
   supports it - otherwise the parsed payload is stashed on
   window.EMSAVED for other modules to pick up when they initialise.

   Schema (the only shape ever written to localStorage):
     {
       v: 1,                    // schema version (bump on breaking change)
       skills: { [id]: xp },    // EMHUD.getSkillXp() snapshot
       inv:    [ {id, count} ], // EMHUD.getInv() snapshot
       settings: { ... }|null,  // EMSETTINGS.get?.() / EMSETTINGS snapshot
       tutorial: { ... }|null,  // EMHUD.getTutorial?.() if present
       ts: 1700000000000        // Date.now() at write time
     }
   ===================================================================== */

const SAVE_KEY = 'eldermoor:save';
const SAVE_VERSION = 1;
const AUTOSAVE_MS = 20000;

/* ---------------------------------------------------------- state readers
   Each reader is wrapped so a single missing/throwing source can\'t sink a
   whole save. Returns null/empty defaults rather than propagating. */
function readSkills(){
  try {
    const hud = (typeof window !== 'undefined') && window.EMHUD;
    if(hud && typeof hud.getSkillXp === 'function'){
      const xp = hud.getSkillXp();
      return (xp && typeof xp === 'object') ? { ...xp } : {};
    }
  } catch(e){ /* fall through to default */ }
  return {};
}

function readInv(){
  try {
    const hud = (typeof window !== 'undefined') && window.EMHUD;
    if(hud && typeof hud.getInv === 'function'){
      const inv = hud.getInv();
      if(Array.isArray(inv)){
        // shallow-copy each slot so the saved snapshot can\'t mutate live state
        return inv.map(s => ({ id: s && s.id, count: (s && s.count) || 1 }));
      }
    }
  } catch(e){ /* fall through to default */ }
  return [];
}

function readSettings(){
  try {
    const s = (typeof window !== 'undefined') && window.EMSETTINGS;
    if(s){
      if(typeof s.get === 'function'){ const v = s.get(); return (v && typeof v === 'object') ? { ...v } : null; }
      if(typeof s === 'object'){ return { ...s }; }
    }
  } catch(e){ /* fall through */ }
  return null;
}

function readTutorial(){
  try {
    const hud = (typeof window !== 'undefined') && window.EMHUD;
    if(hud && typeof hud.getTutorial === 'function'){
      const t = hud.getTutorial();
      return (t && typeof t === 'object') ? { ...t } : null;
    }
  } catch(e){ /* fall through */ }
  return null;
}

/* ---------------------------------------------------------- HUD readiness
   The HUD publishes window.EMHUD asynchronously (after its content fetch).
   We treat "has getSkillXp / getInv" as the readiness signal. */
function hudReady(){
  const hud = (typeof window !== 'undefined') && window.EMHUD;
  return !!(hud && typeof hud.getSkillXp === 'function' && typeof hud.getInv === 'function');
}

/* ----------------------------------------------------------------- save
   Snapshot current state into the versioned envelope and write JSON.
   Returns true on success, false on any failure (never throws). */
function save(){
  if(typeof window === 'undefined' || !window.localStorage) return false;
  if(!hudReady()) return false; // nothing meaningful to persist yet - no-op
  try {
    const payload = {
      v: SAVE_VERSION,
      skills: readSkills(),
      inv: readInv(),
      settings: readSettings(),
      tutorial: readTutorial(),
      ts: Date.now()
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch(e){
    // QuotaExceededError, serialization issues, private-mode blocks, etc.
    // Swallow: a failed autosave must never interrupt play.
    try { console.warn('[save] write failed:', e && e.message); } catch(_){ }
    return false;
  }
}

/* ----------------------------------------------------------------- load
   Read + parse the stored envelope. On corruption (bad JSON or wrong
   shape) we clear the key and return null so the game starts fresh -
   never throw. Returns the parsed payload object, or null. */
function load(){
  if(typeof window === 'undefined' || !window.localStorage) return null;
  let raw;
  try { raw = window.localStorage.getItem(SAVE_KEY); }
  catch(e){ return null; }
  if(!raw) return null;
  let data;
  try { data = JSON.parse(raw); }
  catch(e){
    // Corrupt payload - wipe it and start clean.
    try { console.warn('[save] corrupt save cleared:', e && e.message); } catch(_){ }
    clear();
    return null;
  }
  // Minimal shape validation; anything off → treat as corrupt.
  if(!data || typeof data !== 'object' || typeof data.v !== 'number'){
    try { console.warn('[save] invalid save shape - cleared'); } catch(_){ }
    clear();
    return null;
  }
  // Normalise to the current schema so consumers get predictable fields.
  return {
    v: data.v,
    skills: (data.skills && typeof data.skills === 'object') ? data.skills : {},
    inv: Array.isArray(data.inv) ? data.inv : [],
    settings: (data.settings && typeof data.settings === 'object') ? data.settings : null,
    tutorial: (data.tutorial && typeof data.tutorial === 'object') ? data.tutorial : null,
    ts: (typeof data.ts === 'number') ? data.ts : 0
  };
}

/* ---------------------------------------------------------------- clear
   Remove the save entirely. Used on corruption and by the public API. */
function clear(){
  if(typeof window === 'undefined' || !window.localStorage) return false;
  try { window.localStorage.removeItem(SAVE_KEY); return true; }
  catch(e){ return false; }
}

/* --------------------------------------------------------------- apply
   Hand a loaded payload to the rest of the game. Prefer a HUD-provided
   loadState() hook; otherwise stash on window.EMSAVED for modules that
   read their own slice during their own init. */
function applyLoaded(data){
  if(!data || typeof window === 'undefined') return;
  try {
    const hud = window.EMHUD;
    if(hud && typeof hud.loadState === 'function'){ hud.loadState(data); return; }
  } catch(e){ try { console.warn('[save] loadState failed:', e && e.message); } catch(_){ } }
  // No HUD hook (yet): publish for other modules to consume.
  window.EMSAVED = data;
}

/* --------------------------------------------------------------- timers
   Autosave on an interval plus the standard "page going away" signals so
   we capture the latest state even on a hard close. Guarded so init is
   idempotent (main.js may call initSave more than once during reloads). */
let _started = false;
function startAutosave(){
  if(_started || typeof window === 'undefined') return;
  _started = true;
  try { setInterval(() => { save(); }, AUTOSAVE_MS); } catch(e){ /* ignore */ }
  try { window.addEventListener('beforeunload', () => { save(); }); } catch(e){ /* ignore */ }
  try {
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'hidden') save();
    });
  } catch(e){ /* ignore */ }
}

/* ----------------------------------------------------------- initSave()
   Entry point wired by main.js. Loads + applies any prior save (retrying
   until the HUD is ready, since EMHUD publishes asynchronously), then
   arms the autosave timers. Safe to call before the HUD exists. */
export function initSave(){
  if(typeof window === 'undefined') return getApi();

  // Load the payload once up-front (does not require the HUD).
  const data = load();

  // Apply as soon as the HUD\'s loadState hook (or fallback stash) is usable.
  let tries = 0;
  const MAX_TRIES = 200; // ~20s at 100ms - generous; HUD normally readies in <1s
  function tryApply(){
    // If a loadState hook exists now, prefer it; otherwise stash immediately.
    const hud = window.EMHUD;
    if(data){
      if(hud && typeof hud.loadState === 'function'){ applyLoaded(data); }
      else if(!window.EMSAVED){ window.EMSAVED = data; } // stash for early readers
    }
    // Arm autosave once the HUD is producing real state; retry until then.
    if(hudReady()){
      // Re-apply through the hook if it only appeared after the first stash.
      if(data && hud && typeof hud.loadState === 'function' && window.EMSAVED === data){
        applyLoaded(data);
      }
      startAutosave();
      return;
    }
    if(++tries < MAX_TRIES){ setTimeout(tryApply, 100); }
    else { startAutosave(); } // give up waiting; timers still useful for future saves
  }
  tryApply();

  return getApi();
}

function getApi(){ return { save, load, clear }; }

/* Publish the public API immediately so other modules can call it even
   before initSave() runs. initSave() returns the same object. */
if(typeof window !== 'undefined'){
  window.EMSAVE = getApi();
}

export default { initSave };
