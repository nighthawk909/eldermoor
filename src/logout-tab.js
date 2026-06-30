/* =====================================================================
   ELDERMOOR - Logout tab module (TB6/LOGIN1)

   Owns the "logout" HUD tab via the shared tab registry:

       window.EMTABS['logout'] = (panel, state) => { ... }

   Renders two controls:
     1. "Click here to logout" button - calls window.EMLOGOUT.logout(),
        which clears session state and shows the title/login overlay.
     2. "Switch world" button - stub (logs intent, no server list yet).

   Title overlay: full-screen dark scrim containing the Eldermoor logo
   text and "Click to play" prompt. Clicking anywhere on the scrim
   dismisses it (calls window.EMLOGOUT.showTitle() to toggle back in).

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

/* ---- Title / login overlay ---- */
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

/* -------------------------------------------------------- title overlay */
function getOverlay() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('em-title-overlay');
}

function buildOverlay() {
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
    overlay.removeEventListener('click', dismissHandler);
    overlay.style.animation = 'em-overlay-fadein 0.2s ease reverse';
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  });

  return overlay;
}

function showTitle() {
  if (typeof document === 'undefined') return;
  const existing = getOverlay();
  if (existing) return; // already visible
  document.body.appendChild(buildOverlay());
}

/* ------------------------------------------------------------ logout op */
function logout() {
  // Clear any persisted session tokens / save-state flags.
  // Extend here when a real auth layer exists.
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
    // Stub - world selection UI not yet implemented.
    if (typeof console !== 'undefined') {
      console.log('[EMLOGOUT] Switch world requested - world list not yet implemented.');
    }
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
