/* =====================================================================
   ELDERMOOR - Logout tab module (TB6/LOGIN1, AUTH-LOGIN)

   Owns the "logout" HUD tab via the shared tab registry:

       window.EMTABS['logout'] = (panel, state) => { ... }

   Renders two controls:
     1. "Click here to logout" button - calls window.EMLOGOUT.logout(),
        which clears the active session and hands off to the REAL login
        screen (window.EMLOGIN, src/login.js) so logging out always lands
        on a usable, real login/landing screen - never a dead-end scrim.
     2. "Switch world" button - stub (no server list yet); per spec this
        also returns to the login screen rather than doing nothing, so
        there is no dead end while world selection is unbuilt.

   showTitle(): delegates to window.EMLOGIN.show() when the login module
   has loaded; falls back to a minimal local scrim (best-effort) if
   EMLOGIN somehow isn\'t present yet, so this module never hard-depends
   on init order.

   Exposes:
       window.EMLOGOUT = { logout(), showTitle() }
       export function initLogoutTab()   // called once from main.js

   Conventions:
   - window.EMTABS registration matches sibling tabs (settings-tab.js,
     music-tab.js, etc.).
   - Self-contained scoped CSS injected once via <style id="em-logout-css">.
   - No-ops gracefully when document / window globals are absent.
   - Node --check clean: no top-level await, no bare ESM imports.
   ===================================================================== */

/* ----------------------------------------------------------------- CSS */
const STYLE_ID = 'em-logout-css';

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
/* ---- Logout tab panel ---- */
.em-logout-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 8px;
  box-sizing: border-box;
}

.em-logout-btn {
  display: block;
  width: 100%;
  padding: 7px 0;
  border: 1px solid #6b5a2e;
  border-radius: 3px;
  background: linear-gradient(180deg, #3a2e14 0%, #221b09 100%);
  color: #e8c96a;
  font-family: inherit;
  font-size: 12px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  letter-spacing: 0.03em;
  transition: background 0.12s, color 0.12s;
}
.em-logout-btn:hover {
  background: linear-gradient(180deg, #4a3c1a 0%, #2e2210 100%);
  color: #f5e08a;
}
.em-logout-btn:active {
  background: linear-gradient(180deg, #221b09 0%, #3a2e14 100%);
}

.em-logout-btn.em-logout-btn--secondary {
  color: #b0a07a;
  border-color: #4a3e20;
  background: linear-gradient(180deg, #29230e 0%, #1a1508 100%);
}
.em-logout-btn.em-logout-btn--secondary:hover {
  color: #d4c08a;
}

.em-logout-divider {
  border: none;
  border-top: 1px solid #2a2210;
  margin: 2px 0;
}

/* ---- Fallback title overlay (used ONLY if src/login.js hasn\'t loaded
   yet - the real login/landing screen lives in window.EMLOGIN). This
   keeps logout-tab.js from ever producing a dead-end blank screen even
   under unexpected init ordering. ---- */
#em-title-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  cursor: pointer;
  animation: em-overlay-fadein 0.25s ease;
}
@keyframes em-overlay-fadein {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.em-title-logo {
  font-family: 'Cinzel', 'Palatino Linotype', Georgia, serif;
  font-size: clamp(28px, 5vw, 52px);
  font-weight: 700;
  color: #e8c96a;
  text-shadow:
    0 0 24px rgba(232, 201, 106, 0.6),
    2px 2px 0 #3a2e14,
    -1px -1px 0 #1a1206;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  user-select: none;
}

.em-title-tagline {
  font-family: inherit;
  font-size: clamp(12px, 2vw, 16px);
  color: #b8a86a;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.85;
  user-select: none;
  animation: em-pulse 2s ease-in-out infinite;
}
@keyframes em-pulse {
  0%, 100% { opacity: 0.55; }
  50%       { opacity: 1;    }
}
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------ fallback title overlay
   Only ever used when window.EMLOGIN (src/login.js) is unavailable. The
   normal path is showTitle() below delegating straight to EMLOGIN.show(),
   which renders the real name-entry login screen, not this scrim. */
function getFallbackOverlay() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('em-title-overlay');
}

function buildFallbackOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'em-title-overlay';

  const logo = document.createElement('div');
  logo.className = 'em-title-logo';
  logo.textContent = 'Eldermoor';

  const tagline = document.createElement('div');
  tagline.className = 'em-title-tagline';
  tagline.textContent = 'Click to play';

  overlay.appendChild(logo);
  overlay.appendChild(tagline);

  overlay.addEventListener('click', function dismissHandler() {
    // Best-effort: if EMLOGIN has appeared since the fallback was shown,
    // hand off to the real login screen instead of just dismissing blind.
    overlay.removeEventListener('click', dismissHandler);
    if (typeof window !== 'undefined' && window.EMLOGIN && typeof window.EMLOGIN.show === 'function') {
      overlay.style.animation = 'em-overlay-fadein 0.2s ease reverse';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        window.EMLOGIN.show();
      }, 200);
      return;
    }
    overlay.style.animation = 'em-overlay-fadein 0.2s ease reverse';
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  });

  return overlay;
}

/**
 * showTitle - return to the login/landing screen.
 *
 * Prefers the real login module (window.EMLOGIN.show(), src/login.js):
 * a proper name-entry / saved-profile screen with an "Enter Eldermoor"
 * action, never a blank or dead-end screen. Falls back to a minimal
 * local scrim only if EMLOGIN genuinely isn\'t present yet.
 */
function showTitle() {
  if (typeof window === 'undefined') return;
  if (window.EMLOGIN && typeof window.EMLOGIN.show === 'function') {
    window.EMLOGIN.show();
    return;
  }
  if (typeof document === 'undefined') return;
  const existing = getFallbackOverlay();
  if (existing) return; // already visible
  document.body.appendChild(buildFallbackOverlay());
}

/* ------------------------------------------------------------ logout op */
function logout() {
  // Clear the active session so a reload (or the login screen itself)
  // treats this as logged-out. The saved profile/appearance are left
  // intact so returning players land on "Continue as <name>" rather
  // than losing their save.
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('eldermoor:session');
    }
  } catch (_) {
    // localStorage blocked (e.g. private browsing with strict settings) - no-op.
  }

  showTitle();
}

/* ------------------------------------------------------- global surface */
function installGlobal() {
  if (typeof window === 'undefined') return;
  window.EMLOGOUT = {
    logout:    logout,
    showTitle: showTitle,
  };
}

/* ---------------------------------------------------- tab panel renderer */
function renderLogoutPanel(panel) {
  if (!panel) return;

  // Idempotent: clear previous content before re-render.
  panel.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'em-logout-panel';

  // --- Primary action: logout ---
  const btnLogout = document.createElement('button');
  btnLogout.className = 'em-logout-btn';
  btnLogout.type = 'button';
  btnLogout.textContent = 'Click here to logout';
  btnLogout.addEventListener('click', function () {
    logout();
  });

  // --- Divider ---
  const hr = document.createElement('hr');
  hr.className = 'em-logout-divider';

  // --- Secondary action: switch world (stub) ---
  const btnWorld = document.createElement('button');
  btnWorld.className = 'em-logout-btn em-logout-btn--secondary';
  btnWorld.type = 'button';
  btnWorld.textContent = 'Switch world';
  btnWorld.addEventListener('click', function () {
    // World selection UI not yet implemented (single world today). Rather
    // than a dead-end no-op, behave like logout: end the session and
    // return to the real login screen, where the player can sign back in.
    if (typeof console !== 'undefined') {
      console.log('[EMLOGOUT] Switch world requested - single world only; returning to login.');
    }
    logout();
  });

  root.appendChild(btnLogout);
  root.appendChild(hr);
  root.appendChild(btnWorld);
  panel.appendChild(root);
}

/* ----------------------------------------- EMTABS registration + export */

/**
 * initLogoutTab - call once from main.js.
 *
 * Injects scoped CSS, installs window.EMLOGOUT, and registers the
 * tab renderer at window.EMTABS['logout'].
 */
export function initLogoutTab() {
  // Styles are document-scoped; skip if not in a browser environment.
  injectStyles();

  // Expose the public API.
  installGlobal();

  // Register tab handler in the shared HUD tab registry.
  if (typeof window !== 'undefined') {
    window.EMTABS = window.EMTABS || {};
    window.EMTABS['logout'] = function logoutTabHandler(panel, _state) {
      renderLogoutPanel(panel);
    };
  }
}
