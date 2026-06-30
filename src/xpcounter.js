/**
 * xpcounter.js - OSRS-style XP counter HUD (HUD+1)
 *
 * Self-contained, no edits to hud.js. Polls `window.EMHUD.getSkillXp()`
 * (~4/sec), tracks total XP across all skills, and when total XP rises it
 * accumulates the gained XP into a small panel rendered near the minimap.
 *
 * Right-click the panel for a menu (Reset / Hide). No-ops gracefully until
 * EMHUD is ready and retries until it appears.
 *
 * Usage (wired from main.js): `import { initXpCounter } from './xpcounter.js';
 * initXpCounter();`
 */

const POLL_MS = 250; // ~4 polls/sec
const READY_RETRY_MS = 500; // retry cadence while EMHUD is unavailable
const FADE_AFTER_MS = 5000; // dim the panel after this idle period
const STYLE_ID = 'em-xpcounter-style';
const PANEL_ID = 'em-xpcounter';
const MENU_ID = 'em-xpcounter-menu';

const CSS = `
#${PANEL_ID} {
  /* top-left, below the QA button (#emqa-btn, top:8px + ~40px tall) so the two
     never overlap, and clear of the inventory/tab panel which docks bottom-right. */
  position: fixed;
  top: 56px;
  left: 16px;
  z-index: 9000;
  min-width: 132px;
  padding: 7px 11px;
  font-family: "Trebuchet MS", Verdana, sans-serif;
  color: #ffe98a;
  background: rgba(36, 24, 18, 0.86);
  border: 1px solid #5a3f28;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(216, 178, 90, 0.25);
  text-shadow: 1px 1px 0 #000;
  user-select: none;
  cursor: default;
  transition: opacity 0.6s ease;
  pointer-events: auto;
}
#${PANEL_ID}.em-xp-idle { opacity: 0.55; }
#${PANEL_ID} .em-xp-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #d8b25a;
  opacity: 0.85;
}
#${PANEL_ID} .em-xp-total {
  font-size: 19px;
  font-weight: bold;
  line-height: 1.15;
}
#${PANEL_ID} .em-xp-rate {
  font-size: 10px;
  color: #c2cad4;
  opacity: 0.8;
}
#${MENU_ID} {
  position: fixed;
  z-index: 9001;
  min-width: 120px;
  padding: 3px 0;
  font-family: "Trebuchet MS", Verdana, sans-serif;
  font-size: 12px;
  color: #f3e7d0;
  background: rgba(28, 18, 12, 0.97);
  border: 1px solid #5a3f28;
  border-radius: 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
  user-select: none;
}
#${MENU_ID} .em-xp-mi {
  padding: 5px 14px;
  cursor: pointer;
  white-space: nowrap;
}
#${MENU_ID} .em-xp-mi:hover { background: rgba(216, 178, 90, 0.22); }
.em-xp-hidden { display: none !important; }
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

/** Format an integer XP amount with thousands separators. */
function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

/**
 * Safely read total XP from EMHUD. Returns null if EMHUD/getSkillXp is not
 * ready or returns something unusable, so callers can no-op gracefully.
 */
function readTotalXp() {
  const hud = typeof window !== 'undefined' ? window.EMHUD : undefined;
  if (!hud || typeof hud.getSkillXp !== 'function') return null;

  let data;
  try {
    data = hud.getSkillXp();
  } catch (_err) {
    return null;
  }
  if (data == null) return null;

  // Accept either a single number (already-total) or a map/array of per-skill XP.
  if (typeof data === 'number') {
    return Number.isFinite(data) ? data : null;
  }

  let total = 0;
  let sawValue = false;
  const values =
    typeof data === 'object'
      ? Array.isArray(data)
        ? data
        : Object.values(data)
      : [];
  for (const v of values) {
    const num = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(num)) {
      total += num;
      sawValue = true;
    }
  }
  return sawValue ? total : null;
}

/**
 * Initialize the XP counter HUD. Idempotent: a second call returns the same
 * controller without creating duplicate panels.
 *
 * @returns {{ reset: () => void, toggle: () => void, destroy: () => void }}
 */
export function initXpCounter() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // SSR / non-browser: hand back inert no-op controller.
    return { reset() {}, toggle() {}, destroy() {} };
  }
  if (window.__emXpCounter) return window.__emXpCounter;

  ensureStyle();

  // --- Panel ---
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'polite');
  panel.innerHTML =
    '<div class="em-xp-label">XP gained</div>' +
    '<div class="em-xp-total">0</div>' +
    '<div class="em-xp-rate">&nbsp;</div>';
  document.body.appendChild(panel);

  const totalEl = panel.querySelector('.em-xp-total');
  const rateEl = panel.querySelector('.em-xp-rate');

  // --- Context menu ---
  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.className = 'em-xp-hidden';
  menu.innerHTML =
    '<div class="em-xp-mi" data-act="reset">Reset</div>' +
    '<div class="em-xp-mi" data-act="hide">Hide</div>';
  document.body.appendChild(menu);

  // --- State ---
  const state = {
    baseline: null, // total XP at last reset (or first reading)
    gained: 0,
    lastTotal: null,
    lastGainTs: 0,
    pollTimer: null,
    idleTimer: null,
    destroyed: false,
  };

  function render() {
    totalEl.textContent = fmt(state.gained);
    if (state.gained > 0) {
      rateEl.textContent = '+' + fmt(state.gained);
    } else {
      rateEl.innerHTML = '&nbsp;';
    }
  }

  function markActive() {
    panel.classList.remove('em-xp-idle');
    state.lastGainTs = Date.now();
  }

  function poll() {
    if (state.destroyed) return;
    const total = readTotalXp();
    if (total != null) {
      if (state.baseline == null) {
        // First valid reading establishes the baseline; no gain shown yet.
        state.baseline = total;
        state.lastTotal = total;
      } else if (total > state.lastTotal) {
        state.gained += total - state.lastTotal;
        state.lastTotal = total;
        markActive();
        render();
      } else if (total < state.lastTotal) {
        // XP went down (e.g. world/character reset) - re-baseline silently.
        state.baseline = total;
        state.lastTotal = total;
      }
    }
    // Idle dimming.
    if (
      state.gained > 0 &&
      Date.now() - state.lastGainTs > FADE_AFTER_MS &&
      !panel.classList.contains('em-xp-idle')
    ) {
      panel.classList.add('em-xp-idle');
    }
  }

  function reset() {
    state.baseline = state.lastTotal;
    state.gained = 0;
    panel.classList.remove('em-xp-idle');
    render();
  }

  function setVisible(visible) {
    panel.classList.toggle('em-xp-hidden', !visible);
  }

  function toggle() {
    setVisible(panel.classList.contains('em-xp-hidden'));
  }

  // --- Menu wiring ---
  function openMenu(x, y) {
    menu.classList.remove('em-xp-hidden');
    const w = menu.offsetWidth || 120;
    const h = menu.offsetHeight || 60;
    const left = Math.min(x, window.innerWidth - w - 4);
    const top = Math.min(y, window.innerHeight - h - 4);
    menu.style.left = Math.max(4, left) + 'px';
    menu.style.top = Math.max(4, top) + 'px';
  }

  function closeMenu() {
    menu.classList.add('em-xp-hidden');
  }

  const onPanelContextMenu = (e) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  };

  const onMenuClick = (e) => {
    const item = e.target.closest('.em-xp-mi');
    if (!item) return;
    const act = item.getAttribute('data-act');
    if (act === 'reset') reset();
    else if (act === 'hide') setVisible(false);
    closeMenu();
  };

  const onDocPointerDown = (e) => {
    if (!menu.contains(e.target)) closeMenu();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') closeMenu();
  };

  panel.addEventListener('contextmenu', onPanelContextMenu);
  menu.addEventListener('click', onMenuClick);
  document.addEventListener('pointerdown', onDocPointerDown, true);
  document.addEventListener('keydown', onKeyDown);

  function destroy() {
    state.destroyed = true;
    if (state.pollTimer) clearInterval(state.pollTimer);
    panel.removeEventListener('contextmenu', onPanelContextMenu);
    menu.removeEventListener('click', onMenuClick);
    document.removeEventListener('pointerdown', onDocPointerDown, true);
    document.removeEventListener('keydown', onKeyDown);
    panel.remove();
    menu.remove();
    if (window.__emXpCounter === controller) delete window.__emXpCounter;
  }

  // --- Startup: wait for EMHUD, then begin polling ---
  function start() {
    if (state.destroyed) return;
    if (readTotalXp() == null) {
      // EMHUD not ready yet - retry without spamming work.
      setTimeout(start, READY_RETRY_MS);
      return;
    }
    poll(); // establishes baseline immediately
    state.pollTimer = setInterval(poll, POLL_MS);
  }

  render();
  start();

  const controller = { reset, toggle, destroy };
  window.__emXpCounter = controller;
  return controller;
}

export default initXpCounter;
