/* =====================================================================
   ELDERMOOR - tutorial lesson state machine (FLOW1 / FLOW6 / NPC5).

   Drives the L0-L17 Tutorial-Island lesson chain from data, mirroring the
   OSRS Tutorial Island flow. The ordered lesson list comes from
   `window.EMDATA.lessons` (assets/data/lessons.json): each lesson has
   { id, title, instructor, steps:[{action,detail,complete_when?}],
     grants, gate, complete_when, next }.

   Responsibilities:
     • Track the player\'s place in the chain - current lesson + step - in a
       persisted `progress` object (localStorage key `eldermoor:progress`).
     • Push the active step\'s `detail` to the objective pill via
       window.EMHUD.setObjective(...).
     • Advance when the dialogue runner fires the `em-lesson` CustomEvent with
       detail `complete:LN` (see src/dialogue.js), printing a "well done"
       chat line and pointing the player at the next instructor.
     • Auto-advance on simple predicates (`flag:x`, `has:item`) evaluated on a
       light polling interval, so non-dialogue steps (chop a tree, catch a
       fish) complete themselves.

   Self-contained & defensive: every external touch-point (EMDATA, EMHUD,
   localStorage) is probed before use, so this module no-ops gracefully when
   the HUD or data registry hasn\'t loaded yet. Exposes window.EMLESSON =
   { current(), advance(), check() } and the entry point initLessons().

   No mutation of EMDATA. The `progress` object is always replaced wholesale
   (immutable update) rather than edited in place.
   ===================================================================== */

const STORAGE_KEY = 'eldermoor:progress';
const POLL_MS = 600;
// Anti-brick grace window: when the instructor's scripted "go do it" dialogue
// beat fires (em-lesson complete:LN) but the lesson's action predicate
// (has:/lit:/killed:/cast:) hasn\'t resolved yet, we wait this long for the
// real action to satisfy it via polling before forcing completion anyway.
// Keeps the chain moving even while a downstream system (combat kill flag,
// fire-lighting flag, spell-cast flag) isn\'t wired in yet.
const ACTION_GRACE_MS = 15000;

/* ------------------------------------------------------------ environment */
function hud() {
  return (typeof window !== 'undefined' && window.EMHUD) ? window.EMHUD : null;
}

/* The ordered lesson array, or [] if the registry isn\'t present yet. Read
   lazily every time - EMDATA.lessons may arrive after init, never cache it. */
function lessons() {
  const d = (typeof window !== 'undefined') ? window.EMDATA : null;
  const list = d && d.lessons;
  if (Array.isArray(list)) return list;
  if (list && Array.isArray(list.lessons)) return list.lessons; // tolerate {lessons:[...]}
  return [];
}

function hasData() {
  return lessons().length > 0;
}

/* ------------------------------------------------------------ persistence */
function defaultProgress() {
  // lessonIndex/stepIndex are the cursor; completed is the set of finished
  // lesson ids; flags are predicate booleans set by the rest of the game.
  return { lessonId: null, lessonIndex: 0, stepIndex: 0, completed: [], flags: {}, done: false };
}

function loadProgress() {
  try {
    if (typeof localStorage === 'undefined') return defaultProgress();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return defaultProgress();
    // normalise shape (immutably) so a partial/legacy blob can\'t crash us.
    return {
      lessonId: typeof p.lessonId === 'string' ? p.lessonId : null,
      lessonIndex: Number.isInteger(p.lessonIndex) ? p.lessonIndex : 0,
      stepIndex: Number.isInteger(p.stepIndex) ? p.stepIndex : 0,
      completed: Array.isArray(p.completed) ? p.completed.slice() : [],
      flags: (p.flags && typeof p.flags === 'object') ? Object.assign({}, p.flags) : {},
      done: !!p.done
    };
  } catch (e) {
    return defaultProgress();
  }
}

function saveProgress(p) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch (e) { /* private mode / quota - non-fatal, run from memory */ }
}

/* ------------------------------------------------------------ module state */
let progress = defaultProgress();
let pollTimer = null;
let started = false;
let graceTimer = null;       // pending anti-brick force-complete for the current lesson
let graceLessonId = null;    // which lesson the pending grace timer belongs to

/* ------------------------------------------------------------ data helpers */
function lessonByIndex(i) {
  const ls = lessons();
  return (i >= 0 && i < ls.length) ? ls[i] : null;
}

function indexOfLesson(id) {
  const ls = lessons();
  for (let i = 0; i < ls.length; i++) { if (ls[i] && ls[i].id === id) return i; }
  return -1;
}

function currentLesson() { return lessonByIndex(progress.lessonIndex); }

function stepsOf(lesson) {
  return (lesson && Array.isArray(lesson.steps)) ? lesson.steps : [];
}

function currentStep() {
  const l = currentLesson();
  const steps = stepsOf(l);
  if (!steps.length) return null;
  const i = Math.min(progress.stepIndex, steps.length - 1);
  return steps[i] || null;
}

/* The predicate that finishes a given step. Prefer a per-step `complete_when`;
   on the lesson\'s final step, fall back to the lesson-level `complete_when`. */
function stepPredicate(lesson, stepIndex) {
  const steps = stepsOf(lesson);
  const step = steps[stepIndex];
  if (step && typeof step.complete_when === 'string' && step.complete_when) {
    return step.complete_when;
  }
  if (stepIndex === steps.length - 1 && lesson && typeof lesson.complete_when === 'string') {
    return lesson.complete_when;
  }
  return null;
}

/* ------------------------------------------------------------ predicates */
function hasItem(id) {
  const h = hud();
  if (!h || typeof h.getInv !== 'function') return false;
  const inv = h.getInv() || [];
  return inv.some(x => x && x.id === id && (x.count == null || x.count > 0));
}

function flagSet(name) {
  return !!progress.flags[name];
}

// Evaluate one atom: `flag:x`, `has:item`, `lesson:LN` (lesson completed),
// plus the action-event verbs `lit:`, `killed:`, `cast:` (e.g. `lit:fire`,
// `killed:giant_rat`, `cast:wind_strike`). Those three are namespaced flags -
// any system can satisfy them by dispatching the existing `em-flag` event
// with the FULL atom as the flag name, e.g.
//   window.dispatchEvent(new CustomEvent('em-flag', { detail: 'killed:giant_rat' }))
// so combat/magic/firemaking systems can wire in later with zero changes
// here. Until something sets them, they simply read false (no soft-lock:
// onLessonEvent's dialogue fallback still carries the chain forward - see
// below). Any other unknown verb (object:, ...) also reads false.
function evalAtom(atom) {
  const t = (atom || '').trim();
  if (!t) return false;
  const ci = t.indexOf(':');
  const verb = ci === -1 ? t : t.slice(0, ci);
  const arg = ci === -1 ? '' : t.slice(ci + 1);
  switch (verb) {
    case 'flag': return flagSet(arg);
    case 'has': return hasItem(arg);
    case 'lesson': return progress.completed.indexOf(arg) !== -1;
    case 'lit':
    case 'killed':
    case 'cast': return flagSet(t); // namespaced flag keyed by the whole atom
    default: return false;
  }
}

// A predicate string may AND atoms with `&`, e.g. "has:tin-ore&has:copper-ore".
function evalPredicate(pred) {
  if (!pred) return false;
  return String(pred).split('&').every(part => evalAtom(part.trim()));
}

/* ------------------------------------------------------------ HUD output */
function pushObjective() {
  const h = hud();
  if (!h || typeof h.setObjective !== 'function') return;
  const l = currentLesson();
  const step = currentStep();
  if (progress.done || !l) {
    h.setObjective('Tutorial complete - you are ready for Eldermoor.');
    return;
  }
  const detail = (step && step.detail) || l.objective || l.title || 'Continue your training.';
  h.setObjective(detail);
}

function chat(text) {
  const h = hud();
  if (h && typeof h.addChat === 'function') h.addChat(text, '', true);
}

function pointToNext() {
  const next = currentLesson();
  if (!next) { chat('You have finished the tutorial. Your adventure begins!'); return; }
  const who = next.instructor ? capitalize(next.instructor) : null;
  const where = next.zone ? humanZone(next.zone) : null;
  if (who && where) chat('Next, find ' + who + ' in the ' + where + '.');
  else if (who) chat('Next, speak to ' + who + '.');
  else chat('Next: ' + (next.objective || next.title || 'continue your training') + '.');
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function humanZone(z) { return String(z).replace(/_/g, ' '); }

/* ------------------------------------------------------------ transitions */
/* Move to the next uncompleted step in the current lesson, or complete the
   lesson and roll into the next one. Always builds a NEW progress object. */
function advanceStep() {
  const l = currentLesson();
  if (!l) return false;
  const steps = stepsOf(l);
  if (progress.stepIndex < steps.length - 1) {
    progress = Object.assign({}, progress, { stepIndex: progress.stepIndex + 1 });
    saveProgress(progress);
    pushObjective();
    return true;
  }
  return completeLesson();
}

function clearGrace() {
  if (graceTimer != null && typeof clearTimeout !== 'undefined') clearTimeout(graceTimer);
  graceTimer = null;
  graceLessonId = null;
}

function completeLesson() {
  const l = currentLesson();
  if (!l) return false;
  clearGrace();
  const completed = progress.completed.indexOf(l.id) === -1
    ? progress.completed.concat(l.id)
    : progress.completed.slice();

  // resolve the next lesson by id (data-authored) else the array order.
  let nextIndex = progress.lessonIndex + 1;
  if (l.next) {
    const byId = indexOfLesson(l.next);
    if (byId !== -1) nextIndex = byId;
  }
  const nextLesson = lessonByIndex(nextIndex);
  const done = !nextLesson || l.next === null;

  progress = Object.assign({}, progress, {
    completed,
    lessonIndex: done ? progress.lessonIndex : nextIndex,
    lessonId: nextLesson ? nextLesson.id : l.id,
    stepIndex: 0,
    done
  });
  saveProgress(progress);

  chat('Well done - ' + (l.title || l.id) + ' complete!');
  if (done) { progress = Object.assign({}, progress, { done: true }); saveProgress(progress); }
  pushObjective();
  if (!done) pointToNext();
  else chat('You have completed Tutorial Island.');
  return true;
}

/* Sync the cursor\'s lessonId after (re)loading data, in case the persisted
   index and the (possibly re-ordered) data diverge. Index wins as the cursor;
   id is refreshed to match. */
function reconcile() {
  const l = currentLesson();
  if (l && progress.lessonId !== l.id) {
    progress = Object.assign({}, progress, { lessonId: l.id });
    saveProgress(progress);
  }
}

/* ------------------------------------------------------------ event wiring */
// dialogue.js dispatches CustomEvent('em-lesson', { detail: 'complete:LN' })
// from the instructor\'s final scripted dialogue node - i.e. the moment the
// NPC finishes explaining/assigning the task, which is BEFORE the player has
// necessarily performed it. We must not let that line alone finish a lesson
// whose `complete_when` is an action predicate (has:/lit:/killed:/cast:) -
// otherwise e.g. L2 "Woodcutting" would complete the instant Maeve says
// "go chop a tree", before any logs are in the bag (GATE+2).
//
//   - flag-style predicates (or no complete_when): the dialogue beat IS the
//     taught lesson (e.g. Halric explaining controls) - set the flag now and
//     complete immediately.
//   - action-style predicates (has:/lit:/killed:/cast:): complete immediately
//     ONLY if the predicate already holds (player already did it); otherwise
//     push the player at the actionable step and arm a bounded anti-brick
//     grace timer so the chain still advances if the action never resolves
//     (e.g. no kill/cast/light system wired in yet for this lesson).
function onLessonEvent(ev) {
  const action = ev && ev.detail;
  if (typeof action !== 'string') return;
  const ci = action.indexOf(':');
  const verb = ci === -1 ? action : action.slice(0, ci);
  const arg = ci === -1 ? '' : action.slice(ci + 1);
  if (verb !== 'complete') return;
  const l = currentLesson();
  if (!l) return;
  // Only advance if the event targets the lesson we\'re on (or no id given).
  if (arg && arg !== l.id) {
    // event for an already-completed lesson - ignore; for a future one, ignore.
    return;
  }

  const pred = (typeof l.complete_when === 'string') ? l.complete_when.trim() : '';
  const isFlagPred = !pred || pred.split('&').every(p => p.trim().indexOf('flag:') === 0);

  if (isFlagPred) {
    // The scripted beat itself teaches the lesson - mark its flag(s) satisfied.
    if (pred) {
      pred.split('&').forEach(p => {
        const part = p.trim();
        if (part.indexOf('flag:') === 0) {
          const name = part.slice('flag:'.length);
          if (name) progress = Object.assign({}, progress, { flags: Object.assign({}, progress.flags, { [name]: true }) });
        }
      });
      saveProgress(progress);
    }
    completeLesson();
    return;
  }

  // Action-style predicate: only finish now if it already holds.
  if (evalPredicate(pred)) { completeLesson(); return; }

  // Not yet done - move the objective onto the actionable step (if not
  // already there) so the player sees what to actually go do, and arm the
  // anti-brick grace timer so this lesson cannot stall forever waiting on
  // an action system that may not be wired up yet.
  if (progress.stepIndex < stepsOf(l).length - 1) {
    progress = Object.assign({}, progress, { stepIndex: stepsOf(l).length - 1 });
    saveProgress(progress);
  }
  pushObjective();

  if (graceLessonId !== l.id) {
    clearGrace();
    graceLessonId = l.id;
    if (typeof setTimeout !== 'undefined') {
      graceTimer = setTimeout(() => {
        graceTimer = null;
        // re-check we\'re still on the same, still-incomplete lesson before forcing it.
        const cur = currentLesson();
        if (cur && cur.id === graceLessonId && !progress.done) {
          graceLessonId = null;
          completeLesson();
        }
      }, ACTION_GRACE_MS);
    }
  }
}

// Allow the rest of the game to set tutorial flags (appearance_confirmed, ...)
// via CustomEvent('em-flag', { detail: 'flagName' | {flag, value} }).
function onFlagEvent(ev) {
  const d = ev && ev.detail;
  if (!d) return;
  let name, value = true;
  if (typeof d === 'string') { name = d; }
  else if (typeof d === 'object') { name = d.flag || d.name; if ('value' in d) value = !!d.value; }
  if (!name) return;
  setFlag(name, value);
}

function setFlag(name, value) {
  const flags = Object.assign({}, progress.flags, { [name]: value });
  progress = Object.assign({}, progress, { flags });
  saveProgress(progress);
  check();
}

/* ------------------------------------------------------------ polling */
// Re-evaluate the current step\'s predicate; auto-advance if it now holds.
function check() {
  if (!started || progress.done || !hasData()) return false;
  const l = currentLesson();
  if (!l) return false;
  // Lesson-level completion FIRST: if the lesson's own complete_when holds, finish
  // the whole lesson regardless of which step we're on. This fixes lessons whose
  // predicate is satisfied by a non-dialogue system - notably L0, whose
  // flag:appearance_confirmed is set by charcreate's em-flag (never an em-lesson
  // 'complete:L0' beat), so without this the tutorial got stuck on L0 after
  // character creation. It also hardens every action lesson (chop/mine/etc.):
  // gathering the item completes the lesson even if the instructor dialogue beat
  // that moves the step-cursor never fired.
  const cw = (typeof l.complete_when === 'string') ? l.complete_when.trim() : '';
  if (cw && evalPredicate(cw)) { return completeLesson(); }
  const pred = stepPredicate(l, Math.min(progress.stepIndex, stepsOf(l).length - 1));
  if (pred && evalPredicate(pred)) {
    return advanceStep();
  }
  return false;
}

function startPolling() {
  if (pollTimer != null || typeof setInterval === 'undefined') return;
  pollTimer = setInterval(check, POLL_MS);
}

/* ------------------------------------------------------------ public API */
export function initLessons() {
  if (started) return window.EMLESSON;
  started = true;

  progress = loadProgress();

  const boot = () => {
    if (!hasData()) return;            // data not here yet - wait for em-data-ready
    reconcile();
    pushObjective();
    startPolling();
    check();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('em-lesson', onLessonEvent);
    window.addEventListener('em-flag', onFlagEvent);
    // EMDATA / EMHUD may arrive after us - (re)boot when the registry is ready.
    window.addEventListener('em-data-ready', boot);
  }

  window.EMLESSON = {
    // The active lesson + step snapshot (read-only view).
    current() {
      const l = currentLesson();
      return {
        lesson: l,
        lessonId: l ? l.id : null,
        stepIndex: progress.stepIndex,
        step: currentStep(),
        done: !!progress.done,
        completed: progress.completed.slice(),
        progress: Object.assign({}, progress)
      };
    },
    // Force-advance one step/lesson (used by scripted beats / debug).
    advance() { return advanceStep(); },
    // Re-evaluate predicates now (call after inventory/flag changes).
    check() { return check(); },
    // Set a tutorial flag (also reachable via the 'em-flag' event).
    setFlag(name, value) { setFlag(name, value === undefined ? true : !!value); },
    // Wipe progress and restart the chain (debug / new character).
    reset() {
      clearGrace();
      progress = defaultProgress();
      saveProgress(progress);
      reconcile(); pushObjective(); check();
      return true;
    }
  };

  boot();                              // boot immediately if data is already present
  return window.EMLESSON;
}

export default initLessons;
