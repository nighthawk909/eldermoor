/**
 * levelup.js - OSRS-style level-up celebration popup (standalone feature module).
 *
 * Self-contained, no edits to hud.js/audio.js/main.js. Detects level-ups by
 * polling the read-only accessors hud.js already exposes on window.EMHUD:
 *   - getSkills()   -> { skills:[{id,name,icon,...}], xpTable:[...], ... }
 *   - getSkillXp()  -> { [skillId]: xp }
 *   - levelFromXp(xp) -> integer level (1..99)
 * (hud.js's own addXp() already derives before/after level internally and
 * just prints a chat line - there is no em-levelup/em-xp DOM event to hook,
 * so this module keeps its own last-known-level snapshot per skill and
 * diffs it against EMHUD's live state every poll. This is the same
 * dependency-injection-free pattern xpcounter.js uses against
 * getSkillXp()/getSkills().)
 *
 * On a detected increase for any skill, shows a brief centered OSRS-style
 * popup: "Congratulations, you just advanced a <Skill> level! You are now
 * level N." with the skill's emoji icon, auto-dismissing after a few
 * seconds, and plays window.EMAUDIO.levelUp() if available. Multiple
 * simultaneous level-ups (e.g. a big XP dump) are queued and shown one
 * at a time so they never overlap/clip each other.
 *
 * Usage (wired from main.js, added by the orchestrator):
 *   import { initLevelUp } from './levelup.js';
 *   ... add initLevelUp to the init array ...
 * Also exposed as window.EMLEVELUP = { init } for non-module wiring.
 */

const POLL_MS = 300;            // ~3 polls/sec, matches xpcounter.js cadence order of magnitude
const READY_RETRY_MS = 500;     // retry cadence while EMHUD/skills data isn't ready yet
const SHOW_MS = 4200;           // popup visible duration before auto-dismiss
const FADE_MS = 350;            // fade in/out transition length (kept in sync with CSS below)
const STYLE_ID = 'em-levelup-style';
const POPUP_ID = 'em-levelup-popup';

const CSS = `
#${POPUP_ID} {
  position: fixed;
  top: 18%;
  left: 50%;
  transform: translate(-50%, -12px);
  z-index: 9600;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 280px;
  max-width: min(92vw, 520px);
  padding: 14px 22px;
  font-family: "Trebuchet MS", Verdana, sans-serif;
  color: #f3e7d0;
  background: linear-gradient(180deg, rgba(58, 40, 26, 0.96), rgba(36, 24, 18, 0.96));
  border: 2px solid #d8b25a;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.65), inset 0 0 0 1px rgba(216, 178, 90, 0.35);
  text-shadow: 1px 1px 0 #000;
  text-align: left;
  pointer-events: none;
  user-select: none;
  opacity: 0;
  transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease;
}
#${POPUP_ID}.em-lvl-show {
  opacity: 1;
  transform: translate(-50%, 0);
}
#${POPUP_ID} .em-lvl-icon {
  flex: 0 0 auto;
  font-size: 34px;
  line-height: 1;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.6));
}
#${POPUP_ID} .em-lvl-text {
  flex: 1 1 auto;
  font-size: 14px;
  line-height: 1.35;
}
#${POPUP_ID} .em-lvl-title {
  display: block;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #d8b25a;
  margin-bottom: 2px;
}
@media (max-width: 640px) {
  #${POPUP_ID} {
    top: auto;
    bottom: 128px;
    min-width: 0;
    width: min(92vw, 420px);
    padding: 11px 16px;
    gap: 10px;
  }
  #${POPUP_ID} .em-lvl-icon { font-size: 28px; }
  #${POPUP_ID} .em-lvl-text { font-size: 12.5px; }
}
`;

/** Inject the self-contained stylesheet once. */
function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

/** Escape text placed into innerHTML (skill names are data-driven, defend anyway). */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

/**
 * Read a { [skillId]: level } snapshot from EMHUD, or null if not ready.
 * Uses the same read-only accessors hud.js already exposes.
 */
function readLevels() {
  const hud = typeof window !== 'undefined' ? window.EMHUD : undefined;
  if (!hud || typeof hud.getSkills !== 'function' || typeof hud.getSkillXp !== 'function'
      || typeof hud.levelFromXp !== 'function') return null;

  let sk, xp;
  try {
    sk = hud.getSkills();
    xp = hud.getSkillXp();
  } catch (_err) {
    return null;
  }
  if (!sk || !Array.isArray(sk.skills) || !xp || typeof xp !== 'object') return null;

  const levels = {};
  for (const s of sk.skills) {
    if (!s || !s.id) continue;
    let lvl;
    try {
      lvl = hud.levelFromXp(xp[s.id] || 0);
    } catch (_err) {
      continue;
    }
    if (Number.isFinite(lvl)) levels[s.id] = { level: lvl, name: s.name || s.id, icon: s.icon || '⭐' };
  }
  return levels;
}

/**
 * Initialize the level-up celebration popup. Idempotent: a second call
 * returns the same controller without creating duplicate DOM/timers.
 *
 * @returns {{ destroy: () => void, testShow: (skillId?: string) => void }}
 */
export function initLevelUp() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { destroy() {}, testShow() {} };
  }
  if (window.__emLevelUp) return window.__emLevelUp;

  ensureStyle();

  const popup = document.createElement('div');
  popup.id = POPUP_ID;
  popup.setAttribute('role', 'status');
  popup.setAttribute('aria-live', 'polite');
  popup.innerHTML =
    '<div class="em-lvl-icon">⭐</div>' +
    '<div class="em-lvl-text">' +
    '<span class="em-lvl-title">Level up!</span>' +
    '<span class="em-lvl-msg"></span>' +
    '</div>';
  document.body.appendChild(popup);

  const iconEl = popup.querySelector('.em-lvl-icon');
  const msgEl = popup.querySelector('.em-lvl-msg');

  const state = {
    lastLevels: null,   // last-known { [skillId]: level } snapshot
    queue: [],          // pending { name, icon, level } celebrations
    showing: false,
    pollTimer: null,
    hideTimer: null,
    destroyed: false,
  };

  function playJingle() {
    try {
      if (window.EMAUDIO && typeof window.EMAUDIO.levelUp === 'function') window.EMAUDIO.levelUp();
    } catch (_err) { /* audio is best-effort, never block the popup */ }
  }

  function showNext() {
    if (state.destroyed) return;
    if (state.showing) return;
    const next = state.queue.shift();
    if (!next) return;

    state.showing = true;
    iconEl.textContent = next.icon;
    msgEl.innerHTML = 'Congratulations, you just advanced a <b>' + escapeHtml(next.name) +
      '</b> level! You are now level <b>' + next.level + '</b>.';
    playJingle();

    // Force reflow so the transition re-triggers if a previous popup just faded out.
    popup.classList.remove('em-lvl-show');
    // eslint-disable-next-line no-unused-expressions
    void popup.offsetWidth;
    popup.classList.add('em-lvl-show');

    if (state.hideTimer) clearTimeout(state.hideTimer);
    state.hideTimer = setTimeout(() => {
      popup.classList.remove('em-lvl-show');
      state.hideTimer = setTimeout(() => {
        state.showing = false;
        showNext();
      }, FADE_MS);
    }, SHOW_MS);
  }

  function enqueue(name, icon, level) {
    state.queue.push({ name, icon, level });
    showNext();
  }

  function poll() {
    if (state.destroyed) return;
    const levels = readLevels();
    if (levels == null) return;

    if (state.lastLevels == null) {
      // First valid reading establishes the baseline; no celebration on load
      // (avoids firing for the player's existing/starting levels).
      state.lastLevels = levels;
      return;
    }

    for (const id in levels) {
      const cur = levels[id];
      const prev = state.lastLevels[id];
      const prevLevel = prev ? prev.level : cur.level;
      if (cur.level > prevLevel) {
        enqueue(cur.name, cur.icon, cur.level);
      }
    }
    state.lastLevels = levels;
  }

  function start() {
    if (state.destroyed) return;
    if (readLevels() == null) {
      setTimeout(start, READY_RETRY_MS);
      return;
    }
    poll(); // establishes baseline immediately (no popup fires from this call)
    state.pollTimer = setInterval(poll, POLL_MS);
  }

  function destroy() {
    state.destroyed = true;
    if (state.pollTimer) clearInterval(state.pollTimer);
    if (state.hideTimer) clearTimeout(state.hideTimer);
    popup.remove();
    if (window.__emLevelUp === controller) delete window.__emLevelUp;
  }

  /** Dev/QA helper: force-show a celebration without waiting for real XP gain. */
  function testShow(skillId) {
    const levels = readLevels();
    const id = skillId || (levels && Object.keys(levels)[0]) || 'attack';
    const entry = (levels && levels[id]) || { name: id, icon: '⭐', level: 1 };
    enqueue(entry.name, entry.icon, entry.level);
  }

  start();

  const controller = { destroy, testShow };
  window.__emLevelUp = controller;
  return controller;
}

export default initLevelUp;

if (typeof window !== 'undefined') {
  window.EMLEVELUP = { init: initLevelUp };
}
