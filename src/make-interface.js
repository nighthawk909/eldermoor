/* =====================================================================
   ELDERMOOR - Make-X production interface (MAKE1-3).

   OSRS-style centered panel shown when the player can produce one or
   more items at a skilling station (furnace, anvil, range, etc.).

   Public surface
   ──────────────
   initMakeInterface()          - call once from main.js
   window.EMMAKE.open(opts)     - show the panel

   opts = {
     title    : string,                         // e.g. "What would you like to smelt?"
     products : [{ id, name, icon }],           // icon is a glyph / emoji string
     onMake   : (productId, qty) => {}          // called on confirm, then panel closes
   }

   Quantity presets: 1 / 5 / 10 / X (custom) / All (28-bag OSRS standard).
   Space bar triggers the currently-highlighted quantity.
   Clicking a different product card highlights it; clicking a preset
   selects the qty and immediately fires onMake (OSRS behaviour).
   "X" pops a tiny numeric input instead.
   All is resolved to BAG_FULL (28).

   No-ops gracefully when document is not defined (SSR / unit tests).
   ===================================================================== */

const BAG_FULL = 28;          // OSRS standard maximum inventory size
const PANEL_ID = 'emmake-panel';
const STYLE_ID = 'emmake-css';

/* ─── module state ────────────────────────────────────────────────── */
let _opts      = null;   // current call\'s opts
let _selProd   = null;   // currently highlighted product id
let _selQty    = 1;      // currently highlighted preset qty (number|'X'|'All')
let _onKey     = null;   // keydown listener reference (for cleanup)

/* ─── entry point ─────────────────────────────────────────────────── */
export function initMakeInterface() {
  if (typeof document === 'undefined') return;
  // Idempotent: bail if already mounted.
  if (document.getElementById(PANEL_ID)) return;

  injectCss();
  buildDom();

  window.EMMAKE = { open };
}

/* ─── public open() ───────────────────────────────────────────────── */
function open(opts) {
  if (typeof document === 'undefined') return;
  if (!opts || !Array.isArray(opts.products) || !opts.products.length) return;

  _opts    = opts;
  _selProd = opts.products[0].id;
  _selQty  = 1;

  render();
  show();
}

/* ─── DOM build (one-time) ────────────────────────────────────────── */
function buildDom() {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('role', 'dialog');
  panel.style.display = 'none';
  document.body.appendChild(panel);
}

/* ─── render into panel ───────────────────────────────────────────── */
function render() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;

  const { title = 'What would you like to make?', products } = _opts;

  /* resolve item icons from EMHUD when available */
  const itemDefs = resolveItemDefs();

  /* product cards */
  const cardsHtml = products.map(p => {
    const icon = resolveIcon(p, itemDefs);
    const active = p.id === _selProd ? ' emmake-prod--active' : '';
    return `
      <button class="emmake-prod${active}" data-prod="${esc(p.id)}"
              type="button" aria-label="${esc(p.name)}">
        <span class="emmake-icon">${icon}</span>
        <span class="emmake-label">${esc(p.name)}</span>
      </button>`;
  }).join('');

  /* quantity presets */
  const presets = [1, 5, 10, 'X', 'All'];
  const presetsHtml = presets.map(q => {
    const active = q === _selQty ? ' emmake-qty--active' : '';
    return `
      <button class="emmake-qty${active}" data-qty="${q}"
              type="button" aria-label="Make ${q}">
        ${q}
      </button>`;
  }).join('');

  panel.innerHTML = `
    <div class="emmake-inner">
      <div class="emmake-title">${esc(title)}</div>
      <div class="emmake-products">${cardsHtml}</div>
      <div class="emmake-divider"></div>
      <div class="emmake-qtys">${presetsHtml}</div>
      <div class="emmake-hint">Space - make selected quantity</div>
      <button class="emmake-close" type="button" aria-label="Close">✕</button>
    </div>`;

  wireEvents(panel);
}

/* ─── event wiring ────────────────────────────────────────────────── */
function wireEvents(panel) {
  /* product card click */
  panel.querySelectorAll('.emmake-prod').forEach(btn => {
    btn.addEventListener('click', () => {
      _selProd = btn.dataset.prod;
      refreshCards(panel);
    });
  });

  /* quantity preset click → confirm immediately (OSRS) */
  panel.querySelectorAll('.emmake-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.qty;
      if (raw === 'X') {
        promptCustomQty(panel);
      } else {
        _selQty = raw === 'All' ? 'All' : Number(raw);
        confirmMake();
      }
    });
  });

  /* close button */
  const closeBtn = panel.querySelector('.emmake-close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  /* backdrop click on the outer panel (not the inner card) */
  panel.addEventListener('click', e => {
    if (e.target === panel) close();
  });

  /* keyboard: Space = make; Escape = close */
  removeKeyListener();
  _onKey = e => {
    if (e.code === 'Space') { e.preventDefault(); confirmMake(); }
    if (e.code === 'Escape') { e.preventDefault(); close(); }
  };
  document.addEventListener('keydown', _onKey);
}

/* ─── custom quantity prompt ──────────────────────────────────────── */
function promptCustomQty(panel) {
  const hint = panel.querySelector('.emmake-hint');
  if (!hint) return;

  hint.innerHTML = `
    <span>Enter amount:</span>
    <input id="emmake-xinput" class="emmake-xinput" type="number"
           min="1" max="999" value="1" aria-label="Custom quantity" />
    <button class="emmake-xok" type="button">OK</button>`;

  const input = document.getElementById('emmake-xinput');
  const okBtn = panel.querySelector('.emmake-xok');

  if (input) {
    input.focus();
    input.select();
    input.addEventListener('keydown', e => {
      if (e.code === 'Enter') { e.stopPropagation(); applyCustom(); }
      if (e.code === 'Escape') { e.stopPropagation(); close(); }
    });
  }
  if (okBtn) okBtn.addEventListener('click', applyCustom);

  function applyCustom() {
    const val = parseInt(input ? input.value : '1', 10);
    if (!isNaN(val) && val > 0) {
      _selQty = val;
      confirmMake();
    }
  }
}

/* ─── make action ─────────────────────────────────────────────────── */
function confirmMake() {
  if (!_opts || !_selProd) return;
  const qty = _selQty === 'All' ? BAG_FULL : Number(_selQty) || 1;
  const cb  = _opts.onMake;
  const id  = _selProd;
  close();
  if (typeof cb === 'function') cb(id, qty);
}

/* ─── show / close ────────────────────────────────────────────────── */
function show() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  panel.style.display = 'flex';
  // Focus the first product card for keyboard UX
  const firstCard = panel.querySelector('.emmake-prod');
  if (firstCard) firstCard.focus();
}

function close() {
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.style.display = 'none';
  removeKeyListener();
  _opts    = null;
  _selProd = null;
  _selQty  = 1;
}

function removeKeyListener() {
  if (_onKey) { document.removeEventListener('keydown', _onKey); _onKey = null; }
}

/* ─── card highlight refresh (avoids full re-render) ─────────────── */
function refreshCards(panel) {
  panel.querySelectorAll('.emmake-prod').forEach(btn => {
    btn.classList.toggle('emmake-prod--active', btn.dataset.prod === _selProd);
  });
}

/* ─── icon resolution ─────────────────────────────────────────────── */
function resolveItemDefs() {
  try {
    const h = (typeof window !== 'undefined') ? window.EMHUD : null;
    return (h && typeof h.getItems === 'function') ? (h.getItems() || {}) : {};
  } catch (_) { return {}; }
}

function resolveIcon(product, itemDefs) {
  if (product.icon) return esc(product.icon);
  const def = itemDefs[product.id];
  if (def && def.icon) return esc(def.icon);
  return '?';
}

/* ─── helpers ─────────────────────────────────────────────────────── */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── scoped CSS (injected once) ─────────────────────────────────── */
function injectCss() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
/* ── Make-X overlay backdrop ───────────────────────────────────── */
#emmake-panel {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.55);
  font-family: "Trebuchet MS", sans-serif;
}

/* ── inner card ─────────────────────────────────────────────────── */
#emmake-panel .emmake-inner {
  position: relative;
  background: linear-gradient(160deg, #2c2416, #1e1a13);
  border: 2px solid #c8a24a;
  border-radius: 8px;
  padding: 18px 22px 16px;
  min-width: 260px;
  max-width: min(86vw, 440px);
  box-shadow: 0 8px 32px #000c, inset 0 0 0 1px #3e3020;
  color: #f3e9cf;
}

/* ── title ──────────────────────────────────────────────────────── */
#emmake-panel .emmake-title {
  font-size: 13px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #e7c64f;
  text-align: center;
  margin-bottom: 14px;
  text-shadow: 0 1px 3px #000;
}

/* ── product cards row ──────────────────────────────────────────── */
#emmake-panel .emmake-products {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 10px;
}

#emmake-panel .emmake-prod {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  background: #2b2218;
  border: 2px solid #3e3020;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  color: #e3d6b8;
  font-size: 11px;
  min-width: 64px;
  transition: border-color .1s, background .1s;
}
#emmake-panel .emmake-prod:hover {
  border-color: #a08030;
  background: #38291a;
}
#emmake-panel .emmake-prod--active,
#emmake-panel .emmake-prod:focus {
  border-color: #e7c64f;
  background: #4a3318;
  outline: none;
  box-shadow: 0 0 0 2px #e7c64f44;
}

#emmake-panel .emmake-icon {
  font-size: 26px;
  line-height: 1;
}

#emmake-panel .emmake-label {
  text-align: center;
  line-height: 1.2;
}

/* ── divider ────────────────────────────────────────────────────── */
#emmake-panel .emmake-divider {
  height: 1px;
  background: #4a3820;
  margin: 10px 0;
}

/* ── quantity row ───────────────────────────────────────────────── */
#emmake-panel .emmake-qtys {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-bottom: 10px;
}

#emmake-panel .emmake-qty {
  flex: 1;
  max-width: 56px;
  background: #2b2218;
  border: 2px solid #3e3020;
  border-radius: 5px;
  color: #e3d6b8;
  font-size: 12px;
  font-family: "Trebuchet MS", sans-serif;
  padding: 6px 0;
  cursor: pointer;
  text-align: center;
  transition: border-color .1s, background .1s;
}
#emmake-panel .emmake-qty:hover {
  border-color: #a08030;
  background: #38291a;
}
#emmake-panel .emmake-qty--active,
#emmake-panel .emmake-qty:focus {
  border-color: #e7c64f;
  background: #4a3318;
  outline: none;
  color: #fff;
}

/* ── hint line ──────────────────────────────────────────────────── */
#emmake-panel .emmake-hint {
  text-align: center;
  font-size: 11px;
  color: #8a7a58;
  min-height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* ── custom qty input ───────────────────────────────────────────── */
#emmake-panel .emmake-xinput {
  width: 60px;
  background: #1e1a13;
  border: 1px solid #c8a24a;
  border-radius: 3px;
  color: #f3e9cf;
  font-size: 12px;
  padding: 2px 5px;
  text-align: center;
  font-family: "Trebuchet MS", sans-serif;
}
#emmake-panel .emmake-xinput:focus {
  outline: none;
  border-color: #e7c64f;
}

#emmake-panel .emmake-xok {
  background: #4a3318;
  border: 1px solid #e7c64f;
  border-radius: 3px;
  color: #f3e9cf;
  font-size: 11px;
  padding: 2px 8px;
  cursor: pointer;
  font-family: "Trebuchet MS", sans-serif;
}
#emmake-panel .emmake-xok:hover { background: #5a4420; }

/* ── close button ───────────────────────────────────────────────── */
#emmake-panel .emmake-close {
  position: absolute;
  top: 7px;
  right: 9px;
  background: none;
  border: none;
  color: #8a7a58;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 3px;
}
#emmake-panel .emmake-close:hover { color: #e7c64f; }
`;
  document.head.appendChild(st);
}
