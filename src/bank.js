/* =====================================================================
   ELDERMOOR - Bank module (BANK1-7)
   Exports initBank(). Sets window.EMBANK = { open, close, deposit, withdraw, items }.
   Persists to localStorage key 'eldermoor:bank'.
   Reads inventory via window.EMHUD.getInv() / returns items via window.EMHUD.giveItem().
   No-ops gracefully when EMHUD is absent.
   ===================================================================== */

const STORAGE_KEY = 'eldermoor:bank';

/* ── helpers ──────────────────────────────────────────────────────── */

function loadBank() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBank(bank) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
  } catch { /* storage full - swallow */ }
}

/** Find slot index for item id (-1 if absent). */
function findSlot(bank, id) {
  return bank.findIndex(s => s.id === id);
}

/** Add n of item id to a bank array (mutates a COPY, returns new array). */
function bankAdd(bank, id, n) {
  const copy = bank.map(s => ({ ...s }));
  const idx = findSlot(copy, id);
  if (idx >= 0) {
    copy[idx] = { ...copy[idx], count: copy[idx].count + n };
  } else {
    copy.push({ id, count: n });
  }
  return copy;
}

/** Remove n of item id from a bank array (returns { bank, removed } - removed ≤ n). */
function bankRemove(bank, id, n) {
  const copy = bank.map(s => ({ ...s }));
  const idx = findSlot(copy, id);
  if (idx < 0) return { bank: copy, removed: 0 };
  const have = copy[idx].count;
  const removed = Math.min(have, n);
  if (removed >= have) {
    copy.splice(idx, 1);
  } else {
    copy[idx] = { ...copy[idx], count: have - removed };
  }
  return { bank: copy, removed };
}

/* ── module state ─────────────────────────────────────────────────── */

let _bank = loadBank();   // Array<{ id:string, count:number }>
let _open = false;
let _qty = 1;             // active quantity mode value; 0 = "All"
let _qtyMode = '1';       // '1'|'5'|'10'|'X'|'All'
let _overlay = null;      // root DOM node

/* ── DOM builder ─────────────────────────────────────────────────── */

const CSS = `
#em-bank-overlay{
  position:fixed;inset:0;z-index:200;
  display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.72);
  font-family:"Trebuchet MS",sans-serif;
}
#em-bank-panel{
  width:min(96vw,540px);max-height:90vh;
  background:linear-gradient(180deg,#2e2518 0%,#1e1a12 100%);
  border:2px solid #8a6e2a;border-radius:8px;
  box-shadow:0 8px 36px #000c,inset 0 1px 0 #c8a24a40;
  display:flex;flex-direction:column;overflow:hidden;
}
#em-bank-title-bar{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 12px 7px;
  border-bottom:1px solid #5a4a2a;
  background:#241f14;
}
#em-bank-title-bar h2{
  margin:0;font-size:14px;letter-spacing:.12em;text-transform:uppercase;
  color:#e7c64f;text-shadow:0 1px 4px #000a;
}
#em-bank-close{
  background:none;border:1px solid #5a4a2a;border-radius:4px;
  color:#c8a24a;font-size:16px;line-height:1;cursor:pointer;
  padding:1px 7px;transition:background .15s;
}
#em-bank-close:hover{background:#5a3a10;}
#em-bank-body{flex:1;overflow-y:auto;padding:10px 12px;}
#em-bank-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(52px,1fr));
  gap:5px;
  min-height:52px;
}
.em-bank-slot{
  aspect-ratio:1;
  background:#2b2620;border:1px solid #3e3424;border-radius:5px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  position:relative;font-size:22px;cursor:pointer;
  transition:border-color .12s,background .12s;
}
.em-bank-slot:hover{background:#3d3020;border-color:#c8a24a;}
.em-bank-slot .em-bk-ct{
  position:absolute;bottom:2px;right:4px;
  font-size:10px;color:#8fe08f;font-weight:bold;text-shadow:0 1px 1px #000;
}
.em-bank-slot .em-bk-id{
  font-size:9px;color:#a89060;text-align:center;
  padding:0 2px;word-break:break-all;line-height:1.2;
}
.em-bank-empty{
  color:#5a4a2a;font-size:13px;padding:18px 0;text-align:center;grid-column:1/-1;
}
#em-bank-footer{
  border-top:1px solid #5a4a2a;padding:8px 12px;
  background:#1e1a12;display:flex;flex-direction:column;gap:7px;
}
#em-bank-qty-row{
  display:flex;gap:5px;align-items:center;
}
#em-bank-qty-row span{
  font-size:11px;color:#9a8c6c;letter-spacing:.05em;text-transform:uppercase;
  margin-right:4px;white-space:nowrap;
}
.em-bank-qty-btn{
  flex:1;padding:5px 0;font-size:12px;
  background:#3a2e1f;border:1px solid #5a4a2a;border-radius:4px;
  color:#cdbf98;cursor:pointer;transition:background .12s,border-color .12s;
}
.em-bank-qty-btn.active{
  border-color:#e7c64f;background:#5a4422;color:#fff;
  box-shadow:inset 0 0 5px #0006;
}
.em-bank-qty-btn:hover:not(.active){background:#4a3620;}
#em-bank-action-row{
  display:flex;gap:7px;
}
#em-bank-action-row button{
  flex:1;padding:7px 0;font-size:12px;font-weight:bold;
  background:#3a2e1f;border:1px solid #5a4a2a;border-radius:4px;
  color:#e3d6b8;cursor:pointer;transition:background .12s;
  text-transform:uppercase;letter-spacing:.06em;
}
#em-bank-action-row button:hover{background:#5a4422;border-color:#c8a24a;}
#em-bank-action-row button:active{background:#3a2010;}
`;

function getItemIcon(id) {
  /* Derive a readable emoji icon from item id; fall back to a chest glyph. */
  const MAP = {
    'bronze-axe':'🪓','iron-axe':'🪓','steel-axe':'🪓','mithril-axe':'🪓','adamant-axe':'🪓','rune-axe':'🪓',
    'tinderbox':'🔥','fishing-rod':'🎣','lobster-pot':'🪣','net':'🥅',
    'coins':'🪙','gold':'🪙',
    'bronze-sword':'⚔️','iron-sword':'⚔️','steel-sword':'⚔️','mithril-sword':'⚔️','adamant-sword':'⚔️','rune-sword':'⚔️',
    'shield':'🛡️','staff':'🪄','wand':'🪄','bow':'🏹','arrows':'➶',
    'log':'🪵','oak-log':'🪵','willow-log':'🪵','maple-log':'🪵','yew-log':'🪵',
    'raw-shrimp':'🦐','raw-trout':'🐟','raw-salmon':'🐟','raw-lobster':'🦞','raw-shark':'🦈',
    'shrimp':'🍤','trout':'🍽️','salmon':'🍽️','lobster':'🦞','shark':'🐟',
    'bread':'🍞','pie':'🥧','cake':'🎂',
    'ring':'💍','amulet':'📿','helmet':'⛑️','platebody':'🧥','platelegs':'👖','boots':'👢','gloves':'🧤',
    'potion':'🧪','antipoison':'🧪','prayer-potion':'🧪',
    'rune':'💎','fire-rune':'💎','water-rune':'💎','earth-rune':'💎','air-rune':'💎',
    'feather':'🪶','clay':'🧱','ore':'⛏️','coal':'⛏️','iron-ore':'⛏️',
    'bar':'📦','iron-bar':'📦','steel-bar':'📦',
    'gem':'💎','sapphire':'💎','emerald':'💎','ruby':'💎','diamond':'💎',
  };
  const lk = id ? id.toLowerCase() : '';
  if (MAP[lk]) return MAP[lk];
  for (const [k, v] of Object.entries(MAP)) {
    if (lk.includes(k)) return v;
  }
  return '📦';
}

function fmtCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function buildOverlay() {
  /* Inject CSS once. */
  if (!document.getElementById('em-bank-style')) {
    const st = document.createElement('style');
    st.id = 'em-bank-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  const overlay = document.createElement('div');
  overlay.id = 'em-bank-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Bank of Eldermoor');

  overlay.innerHTML = `
    <div id="em-bank-panel">
      <div id="em-bank-title-bar">
        <h2>Bank of Eldermoor</h2>
        <button id="em-bank-close" aria-label="Close bank">✕</button>
      </div>
      <div id="em-bank-body">
        <div id="em-bank-grid"></div>
      </div>
      <div id="em-bank-footer">
        <div id="em-bank-qty-row">
          <span>Qty:</span>
          <button class="em-bank-qty-btn" data-qty="1">1</button>
          <button class="em-bank-qty-btn" data-qty="5">5</button>
          <button class="em-bank-qty-btn" data-qty="10">10</button>
          <button class="em-bank-qty-btn" data-qty="X">X</button>
          <button class="em-bank-qty-btn" data-qty="All">All</button>
        </div>
        <div id="em-bank-action-row">
          <button id="em-bank-dep-inv">Deposit Inventory</button>
          <button id="em-bank-dep-worn">Deposit Worn</button>
        </div>
      </div>
    </div>
  `;

  /* Close on backdrop click (but not panel click). */
  overlay.addEventListener('click', e => {
    if (e.target === overlay) EMBANK.close();
  });

  overlay.querySelector('#em-bank-close').addEventListener('click', () => EMBANK.close());

  /* Quantity mode buttons. */
  overlay.querySelectorAll('.em-bank-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.qty;
      if (q === 'X') {
        const raw = prompt('Enter quantity:', '1');
        if (raw === null) return;
        const n = parseInt(raw, 10);
        if (!Number.isFinite(n) || n < 1) return;
        _qty = n;
        _qtyMode = 'X';
        btn.textContent = `X(${n})`;
      } else if (q === 'All') {
        _qtyMode = 'All';
        _qty = 0;
      } else {
        _qtyMode = q;
        _qty = parseInt(q, 10);
      }
      refreshQtyButtons();
    });
  });

  /* Deposit inventory. */
  overlay.querySelector('#em-bank-dep-inv').addEventListener('click', () => {
    if (!window.EMHUD) return;
    const inv = (window.EMHUD.getInv ? window.EMHUD.getInv() : null) || [];
    const snap = inv.map(s => ({ ...s })); // copy before mutation
    snap.forEach(slot => {
      const n = _qtyMode === 'All' ? slot.count : Math.min(_qty, slot.count);
      if (n > 0) EMBANK.deposit(slot.id, n);
    });
  });

  /* Deposit worn - EMHUD may not expose worn; no-op if not available. */
  overlay.querySelector('#em-bank-dep-worn').addEventListener('click', () => {
    if (!window.EMHUD || typeof window.EMHUD.getWorn !== 'function') return;
    const worn = window.EMHUD.getWorn() || [];
    worn.forEach(slot => {
      if (slot && slot.id) EMBANK.deposit(slot.id, 1);
    });
  });

  return overlay;
}

/* ── grid renderer ───────────────────────────────────────────────── */

function renderGrid() {
  if (!_overlay) return;
  const grid = _overlay.querySelector('#em-bank-grid');
  if (!grid) return;

  const IT = (window.EMHUD && window.EMHUD.getItems) ? window.EMHUD.getItems() : {};

  if (_bank.length === 0) {
    grid.innerHTML = '<div class="em-bank-empty">Your bank is empty.</div>';
    return;
  }

  grid.innerHTML = '';
  _bank.forEach(slot => {
    const def = IT[slot.id] || {};
    const icon = (def.icon) ? def.icon : getItemIcon(slot.id);
    const label = def.name || slot.id;

    const el = document.createElement('div');
    el.className = 'em-bank-slot';
    el.title = `${label} (${slot.count})\nClick to withdraw`;
    el.innerHTML = `
      <span class="em-bk-icon">${icon}</span>
      <span class="em-bk-id" style="display:none">${label}</span>
      ${slot.count > 1 ? `<span class="em-bk-ct">${fmtCount(slot.count)}</span>` : ''}
    `;
    /* Show icon if emoji truthy, else show text id */
    if (!icon || icon === '📦') {
      el.querySelector('.em-bk-icon').style.display = 'none';
      el.querySelector('.em-bk-id').style.display = '';
    }

    el.addEventListener('click', () => {
      const n = _qtyMode === 'All' ? slot.count : Math.min(_qty, slot.count);
      if (n > 0) EMBANK.withdraw(slot.id, n);
    });

    grid.appendChild(el);
  });
}

function refreshQtyButtons() {
  if (!_overlay) return;
  _overlay.querySelectorAll('.em-bank-qty-btn').forEach(btn => {
    const q = btn.dataset.qty;
    const isActive =
      (q === 'All' && _qtyMode === 'All') ||
      (q === 'X'   && _qtyMode === 'X')   ||
      (q === _qtyMode);
    btn.classList.toggle('active', isActive);
  });
}

/* ── public API ──────────────────────────────────────────────────── */

const EMBANK = {
  /** Open the bank panel. Creates DOM if needed. */
  open() {
    if (_open) return;
    _open = true;
    if (!_overlay) {
      _overlay = buildOverlay();
    }
    refreshQtyButtons();
    document.body.appendChild(_overlay);
    renderGrid();
    _overlay.querySelector('#em-bank-close').focus();
  },

  /** Close and detach the bank panel. */
  close() {
    if (!_open) return;
    _open = false;
    if (_overlay && _overlay.parentNode) {
      _overlay.parentNode.removeChild(_overlay);
    }
  },

  /**
   * Deposit n of item id into the bank.
   * Removes items from EMHUD inventory when n > 0 and EMHUD is available.
   * Pass removeFromInv = false to skip the inventory removal (raw add only).
   */
  deposit(id, n, removeFromInv = true) {
    if (!id || n <= 0) return;
    // If removing from inventory is requested and EMHUD is present, take items out.
    if (removeFromInv && window.EMHUD && typeof window.EMHUD.getInv === 'function') {
      const inv = window.EMHUD.getInv();
      const slot = inv.find(s => s.id === id);
      if (!slot) return; // item not in inventory - cannot deposit what you don\'t have
      const toDeposit = Math.min(n, slot.count);
      if (toDeposit <= 0) return;
      // Mutate inventory array (matches hud.js pattern - inv is a shared reference)
      slot.count -= toDeposit;
      if (slot.count <= 0) {
        const idx = inv.indexOf(slot);
        if (idx >= 0) inv.splice(idx, 1);
      }
      if (window.EMHUD.refresh) window.EMHUD.refresh();
      _bank = bankAdd(_bank, id, toDeposit);
    } else {
      _bank = bankAdd(_bank, id, n);
    }
    saveBank(_bank);
    if (_open) renderGrid();
  },

  /**
   * Withdraw n of item id from the bank.
   * Calls window.EMHUD.giveItem(id, n) to place items in the player inventory.
   */
  withdraw(id, n) {
    if (!id || n <= 0) return;
    const { bank: nextBank, removed } = bankRemove(_bank, id, n);
    if (removed <= 0) return;
    _bank = nextBank;
    saveBank(_bank);
    if (window.EMHUD && typeof window.EMHUD.giveItem === 'function') {
      window.EMHUD.giveItem(id, removed);
    }
    if (_open) renderGrid();
  },

  /** Return a shallow copy of the current bank contents. */
  items() {
    return _bank.map(s => ({ ...s }));
  },
};

/* ── init entry-point ─────────────────────────────────────────────── */

export function initBank() {
  window.EMBANK = EMBANK;
}
