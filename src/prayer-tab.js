/* =====================================================================
   ELDERMOOR - Prayer tab module (PR1/PR3/PR5/SYS11)

   Owns the "prayer" HUD tab via the shared tab registry hook
   (window.EMTABS['prayer'] = (panel, state) => {...}). Renders a grid of
   early-game prayers using ORIGINAL Eldermoor names that map to the OSRS
   prayer roles (Stoneskin <=> Thick Skin, Ironwill <=> Burst of Strength,
   Keen Eye <=> Clarity of Thought, Granite Hide <=> Rock Skin, ...).

   Behaviour:
   - Prayer level is read live from the HUD state each render:
       lvl = state.levelFromXp( state.getSkillXp()['prayer'] || 0 ).
   - Prayer POINTS pool = current prayer level (max). window.EMPRAYERPTS
     exposes { cur, max } for the Prayer orb and other modules.
   - Prayers ABOVE the player\'s prayer level render greyed and show their
     level requirement; they are not clickable.
   - AVAILABLE prayers (req <= level) are clickable and toggle an "active"
     highlight. The active set is tracked locally and mirrored onto
     window.EMPRAYER (active id list + helpers) so other modules can read
     the current activations.
   - While any prayer is active a drain tick fires every ~0.6 s; each
     active prayer contributes its drain_rate per tick. When points reach
     0 all active prayers are switched off automatically.
   - window.EMPRAYER.buryBones() - if the player inventory (window.EMINV)
     holds a 'bones' item, removes one and awards Prayer XP (45 xp base).
   - Hover shows name + level + effect via window.EMTIP if present.

   Conventions matched: ES module exporting initPrayerTab(); registers via
   window.EMTABS[tab]; reads (never mutates) HUD state through the passed
   `state` object; self-contained CSS injected once. main.js wires the
   single initPrayerTab() call.
   ===================================================================== */

/* -------------------------------------------------------------- DATA */
/* Original Eldermoor prayer names mapped to OSRS roles. Ordered by req.
   drain_rate: points consumed per 0.6-s tick while prayer is active.
   Mirrors OSRS drain tick mechanic (higher tier = faster drain).       */
const PRAYERS = [
  { id: 'stoneskin',     name: 'Stoneskin',      req: 1,  icon: '\u{1F6E1}️',
    osrs: 'Thick Skin',         effect: '+5% Defence.',           drain_rate: 1 },
  { id: 'ironwill',      name: 'Ironwill',       req: 4,  icon: '\u{1F4AA}',
    osrs: 'Burst of Strength',  effect: '+5% Strength.',          drain_rate: 1 },
  { id: 'keeneye',       name: 'Keen Eye',       req: 7,  icon: '\u{1F441}️',
    osrs: 'Clarity of Thought', effect: '+5% Attack.',            drain_rate: 1 },
  { id: 'truearrow',     name: 'True Arrow',     req: 8,  icon: '\u{1F3F9}',
    osrs: 'Sharp Eye',          effect: '+5% Ranged accuracy.',   drain_rate: 1 },
  { id: 'innerflame',    name: 'Inner Flame',    req: 9,  icon: '\u{1F52E}',
    osrs: 'Mystic Will',        effect: '+5% Magic.',             drain_rate: 1 },
  { id: 'granitehide',   name: 'Granite Hide',   req: 10, icon: '\u{1FAA8}',
    osrs: 'Rock Skin',          effect: '+10% Defence.',          drain_rate: 2 },
  { id: 'berserkersoul', name: 'Berserker\'s Soul', req: 13, icon: '⚔️',
    osrs: 'Superhuman Strength', effect: '+10% Strength.',        drain_rate: 2 },
  { id: 'hawkeye',       name: 'Hawk Eye',       req: 16, icon: '\u{1F985}',
    osrs: 'Improved Reflexes',  effect: '+10% Attack.',           drain_rate: 2 },
];

/* -------------------------------------------------- ACTIVE-SET STATE */
/* Local source of truth for which prayers are toggled on, mirrored to
   window.EMPRAYER for other modules to read. */
const active = new Set();

/* -------------------------------------------------- POINTS POOL STATE */
/* Prayer points: max = prayer level, cur drains while prayers are on.  */
const pts = { cur: 1, max: 1 };

/* Drain tick interval handle (null when no prayers are active). */
let drainHandle = null;

/* Saved HUD state ref so the drain tick can re-render the panel. */
let _state = null;
/* Saved host element ref for re-renders triggered by the drain tick. */
let _host = null;

/* ------------------------------------------------------ DRAIN TICK */
const DRAIN_INTERVAL_MS = 600; /* ~0.6 s per tick, matching OSRS rate. */

function totalDrainPerTick() {
  let total = 0;
  PRAYERS.forEach((p) => {
    if (active.has(p.id)) total += p.drain_rate;
  });
  return total;
}

function startDrainIfNeeded() {
  if (drainHandle !== null) return; /* already running */
  if (typeof setInterval === 'undefined') return;
  drainHandle = setInterval(drainTick, DRAIN_INTERVAL_MS);
}

function stopDrain() {
  if (drainHandle === null) return;
  if (typeof clearInterval !== 'undefined') clearInterval(drainHandle);
  drainHandle = null;
}

function drainTick() {
  if (active.size === 0) {
    stopDrain();
    return;
  }
  const cost = totalDrainPerTick();
  pts.cur = Math.max(0, pts.cur - cost);
  publishPts();

  if (pts.cur <= 0) {
    /* Drain all active prayers when points are exhausted. */
    active.clear();
    stopDrain();
    publishActive();
    if (_host && _state) renderGrid(_host, _state);
  }
}

/* ---------------------------------------------------- PUBLISH HELPERS */
function publishPts() {
  if (typeof window === 'undefined') return;
  window.EMPRAYERPTS = { cur: pts.cur, max: pts.max };
}

function publishActive() {
  if (typeof window === 'undefined') return;
  const ids = [...active];
  window.EMPRAYER = window.EMPRAYER || {};
  window.EMPRAYER.active = ids;
  window.EMPRAYER.isActive = (id) => active.has(id);
  window.EMPRAYER.list = () => PRAYERS.map((p) => ({ ...p, active: active.has(p.id) }));
  window.EMPRAYER.buryBones = buryBones;
}

/* ------------------------------------------------------ HUD STATE READ */
/* Read the player\'s prayer level from the HUD state, defensively. */
function prayerLevel(state) {
  try {
    if (!state || typeof state.levelFromXp !== 'function' ||
        typeof state.getSkillXp !== 'function') return 1;
    const xpMap = state.getSkillXp() || {};
    const xp = xpMap.prayer || 0;
    const lv = state.levelFromXp(xp);
    return (typeof lv === 'number' && lv >= 1) ? lv : 1;
  } catch (_err) {
    return 1;
  }
}

/* Sync the max points whenever the level may have changed and cap cur. */
function syncPtsMax(state) {
  const lv = prayerLevel(state);
  pts.max = lv;
  if (pts.cur > pts.max) pts.cur = pts.max;
  publishPts();
}

/* --------------------------------------------------------- BURY BONES */
/* Award 45 base Prayer XP per bones item buried.
   Requires window.EMINV with consumeItem(id) and grantXp(skill, amount).
   Safe-guards: does nothing if inventory API is absent or no bones held. */
const BONES_PRAYER_XP = 45;
const BONES_ITEM_ID = 'bones';

function buryBones() {
  if (typeof window === 'undefined') return false;
  const inv = window.EMINV;
  if (!inv || typeof inv.consumeItem !== 'function') return false;
  const consumed = inv.consumeItem(BONES_ITEM_ID);
  if (!consumed) return false;
  /* Award XP - prefer window.EMHUD.grantXp if available, fall back to
     window.EMINV.grantXp, otherwise no-op gracefully. */
  const grantFn =
    (window.EMHUD && typeof window.EMHUD.grantXp === 'function')
      ? window.EMHUD.grantXp.bind(window.EMHUD)
      : (inv && typeof inv.grantXp === 'function')
        ? inv.grantXp.bind(inv)
        : null;
  if (grantFn) grantFn('prayer', BONES_PRAYER_XP);
  return true;
}

/* ----------------------------------------------------------- TOOLTIP */
function tipHtml(p, available) {
  const status = available
    ? (active.has(p.id) ? '<span class="empr-on">Active</span>'
                        : '<span class="empr-off">Tap to activate</span>')
    : `<span class="empr-locked">Requires Prayer ${p.req}</span>`;
  return `<div class="empr-tip"><b>${p.name}</b> <i>(Lvl ${p.req})</i>` +
         `<div class="empr-eff">${p.effect}</div>${status}</div>`;
}

function attachTip(el, p, available) {
  if (typeof window === 'undefined' || !window.EMTIP ||
      typeof window.EMTIP.attach !== 'function') return;
  window.EMTIP.attach(el, () => tipHtml(p, available));
}

/* --------------------------------------------------------- PTS BAR */
function renderPtsBar(host, state) {
  syncPtsMax(state);
  const pct = pts.max > 0 ? Math.round((pts.cur / pts.max) * 100) : 0;

  const bar = document.createElement('div');
  bar.className = 'empr-ptsbar';
  bar.innerHTML =
    `<div class="empr-ptsbar-label">Prayer Points: ${pts.cur} / ${pts.max}</div>` +
    `<div class="empr-ptsbar-track">` +
      `<div class="empr-ptsbar-fill" style="width:${pct}%"></div>` +
    `</div>`;
  host.appendChild(bar);
}

/* ------------------------------------------------------------ RENDER */
function renderGrid(host, state) {
  /* Persist refs for drain-tick re-renders. */
  _host = host;
  _state = state;

  const level = prayerLevel(state);
  host.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'empr-head';
  head.textContent = 'Prayers - level ' + level;
  host.appendChild(head);

  renderPtsBar(host, state);

  const grid = document.createElement('div');
  grid.className = 'empr-grid';
  host.appendChild(grid);

  PRAYERS.forEach((p) => {
    const available = level >= p.req;
    const on = active.has(p.id);

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'empr-cell' +
      (available ? '' : ' empr-cell-locked') +
      (on ? ' empr-cell-active' : '');
    cell.setAttribute('aria-pressed', on ? 'true' : 'false');
    cell.setAttribute('aria-disabled', available ? 'false' : 'true');

    cell.innerHTML =
      `<span class="empr-icon">${p.icon}</span>` +
      `<span class="empr-name">${p.name}</span>` +
      (available ? '' : `<span class="empr-req">Lvl ${p.req}</span>`);

    if (available) {
      cell.addEventListener('click', () => {
        if (pts.cur <= 0 && !active.has(p.id)) return; /* no pts, can\'t activate */
        if (active.has(p.id)) {
          active.delete(p.id);
          if (active.size === 0) stopDrain();
        } else {
          active.add(p.id);
          startDrainIfNeeded();
        }
        publishActive();
        renderGrid(host, state);
      });
    } else {
      cell.disabled = true;
    }

    attachTip(cell, p, available);
    grid.appendChild(cell);
  });
}

/* --------------------------------------------------------------- CSS */
const STYLE_ID = 'empr-style';
function injectStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const css = `
  #empanel .empr-head{font:600 12px/1.4 system-ui,sans-serif;color:#d8c9a8;
    margin:0 0 4px;letter-spacing:.02em;}
  #empanel .empr-ptsbar{margin:0 0 6px;}
  #empanel .empr-ptsbar-label{font:500 10px/1.4 system-ui,sans-serif;
    color:#b8d4a0;margin-bottom:2px;}
  #empanel .empr-ptsbar-track{height:6px;background:#1c1710;border-radius:3px;
    border:1px solid #3a2f22;overflow:hidden;}
  #empanel .empr-ptsbar-fill{height:100%;background:linear-gradient(90deg,#4a9a2a,#8fc25a);
    border-radius:3px;transition:width .3s;}
  #empanel .empr-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
  #empanel .empr-cell{display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:2px;padding:6px 2px;min-height:54px;cursor:pointer;
    border:1px solid #3a2f22;border-radius:6px;background:#241c12;color:#e8dcc2;
    font:500 10px/1.1 system-ui,sans-serif;text-align:center;
    transition:background .08s,border-color .08s,box-shadow .08s;}
  #empanel .empr-cell:hover{background:#322715;border-color:#6b5836;}
  #empanel .empr-icon{font-size:18px;line-height:1;}
  #empanel .empr-name{opacity:.95;}
  #empanel .empr-cell-active{background:#3d5a2a;border-color:#8fc25a;
    box-shadow:0 0 0 1px #8fc25a inset,0 0 6px rgba(143,194,90,.4);}
  #empanel .empr-cell-active:hover{background:#456631;}
  #empanel .empr-cell-locked{cursor:default;opacity:.45;filter:grayscale(1);
    background:#1c1710;border-color:#2c241a;}
  #empanel .empr-cell-locked:hover{background:#1c1710;border-color:#2c241a;}
  #empanel .empr-req{font-size:9px;color:#c98;opacity:.9;}
  .empr-tip b{color:#ffd98a;} .empr-tip i{color:#bba; font-style:italic;}
  .empr-tip .empr-eff{margin:2px 0;color:#dcd;}
  .empr-tip .empr-on{color:#8fc25a;} .empr-tip .empr-off{color:#9bd;}
  .empr-tip .empr-locked{color:#c87;}
  `;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

/* ---------------------------------------------------- INIT / REGISTER */
export function initPrayerTab() {
  if (typeof window === 'undefined') return null;

  injectStyle();
  publishPts();   /* seed window.EMPRAYERPTS before any render */
  publishActive(); /* seed window.EMPRAYER before any render */

  window.EMTABS = window.EMTABS || {};
  window.EMTABS['prayer'] = (panel, state) => {
    syncPtsMax(state); /* update max from current prayer level */
    panel.innerHTML = '<h4>Prayer</h4><div class="empr-host"></div>';
    renderGrid(panel.querySelector('.empr-host'), state);
  };

  return window.EMTABS['prayer'];
}

export default initPrayerTab;
