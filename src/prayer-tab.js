/* =====================================================================
   ELDERMOOR - Prayer tab module (PR1/PR3/PR5/SYS11, PR-ROSTER)

   Owns the "prayer" HUD tab via the shared tab registry hook
   (window.EMTABS['prayer'] = (panel, state) => {...}). Renders a grid of
   prayers using ORIGINAL Eldermoor names that map to the OSRS prayer
   roles (Stoneskin <=> Thick Skin, Ironwill <=> Burst of Strength,
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
   - Some prayers declare `conflicts: [ids]` (protection/overhead prayers,
     style-boost tiers, and the top-tier combo prayers) - activating one
     auto-deactivates any currently-active prayer in its conflict set,
     mirroring OSRS's mutually-exclusive prayer groups.
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
/* Original Eldermoor prayer roster mapped to OSRS roles. Ordered by req.
   drain_rate: points consumed per 0.6-s tick while prayer is active.
   Mirrors OSRS drain tick mechanic (higher tier = faster drain).
   This FALLBACK_PRAYERS array is the synchronous source used on first
   render (and if assets/data/prayers.json is unavailable); it is kept in
   sync with assets/data/prayers.json so the tab never blocks on a fetch.
   If the fetch in loadPrayersData() resolves with a valid roster, PRAYERS
   is swapped to the fetched data (additive override, same shape) and any
   mounted panel is re-rendered. */
const FALLBACK_PRAYERS = [
  { id: 'stoneskin',       name: 'Stoneskin',          req: 1,  icon: '\u{1F6E1}️',
    group: 'defence', effect: '+5% Defence.', drain_rate: 1 },
  { id: 'ironwill',        name: 'Ironwill',           req: 4,  icon: '\u{1F4AA}',
    group: 'strength', effect: '+5% Strength.', drain_rate: 1 },
  { id: 'keeneye',         name: 'Keen Eye',           req: 7,  icon: '\u{1F441}️',
    group: 'attack', effect: '+5% Attack.', drain_rate: 1 },
  { id: 'truearrow',       name: 'True Arrow',         req: 8,  icon: '\u{1F3F9}',
    group: 'ranged', effect: '+5% Ranged accuracy.', drain_rate: 1 },
  { id: 'innerflame',      name: 'Inner Flame',        req: 9,  icon: '\u{1F52E}',
    group: 'magic', effect: '+5% Magic accuracy.', drain_rate: 1 },
  { id: 'granitehide',     name: 'Granite Hide',       req: 10, icon: '\u{1FAA8}',
    group: 'defence', effect: '+10% Defence.', drain_rate: 2, conflicts: ['stoneskin'] },
  { id: 'steadfastmind',   name: 'Steadfast Mind',     req: 12, icon: '\u{1F9D8}',
    group: 'restore', effect: 'Doubles Prayer point restore from food/potions.', drain_rate: 1 },
  { id: 'berserkersoul',   name: 'Berserker\'s Soul',  req: 13, icon: '⚔️',
    group: 'strength', effect: '+10% Strength.', drain_rate: 2, conflicts: ['ironwill'] },
  { id: 'hawkeye',         name: 'Hawk Eye',           req: 16, icon: '\u{1F985}',
    group: 'ranged', effect: '+10% Ranged accuracy.', drain_rate: 2, conflicts: ['truearrow'] },
  { id: 'mysticbarrier',   name: 'Mystic Barrier',     req: 17, icon: '\u{1F300}',
    group: 'magic', effect: '+10% Magic accuracy.', drain_rate: 2, conflicts: ['innerflame'] },
  { id: 'ironhide',        name: 'Ironhide',           req: 19, icon: '\u{1F6E1}️',
    group: 'attack', effect: '+10% Attack.', drain_rate: 2, conflicts: ['keeneye'] },
  { id: 'warders',         name: 'Warder\'s Resolve',  req: 20, icon: '\u{1F3F0}',
    group: 'defence', effect: '+15% Defence.', drain_rate: 3, conflicts: ['stoneskin', 'granitehide'] },
  { id: 'retribution',     name: 'Retribution',        req: 22, icon: '⚡',
    group: 'protect', effect: 'On death, deals damage to nearby foes proportional to your max HP.', drain_rate: 3 },
  { id: 'wardeneye',       name: 'Warden\'s Eye',      req: 25, icon: '\u{1F3AF}',
    group: 'ranged', effect: '+15% Ranged accuracy.', drain_rate: 3, conflicts: ['truearrow', 'hawkeye'] },
  { id: 'battlefury',      name: 'Battlefury',         req: 25, icon: '\u{1F525}',
    group: 'strength', effect: '+15% Strength.', drain_rate: 3, conflicts: ['ironwill', 'berserkersoul'] },
  { id: 'arcanesight',     name: 'Arcane Sight',       req: 27, icon: '\u{1F441}️',
    group: 'magic', effect: '+15% Magic accuracy.', drain_rate: 3, conflicts: ['innerflame', 'mysticbarrier'] },
  { id: 'vanguard',        name: 'Vanguard\'s Edge',   req: 29, icon: '\u{1F5E1}️',
    group: 'attack', effect: '+15% Attack.', drain_rate: 3, conflicts: ['keeneye', 'ironhide'] },
  { id: 'thornmail',       name: 'Thornmail Aura',     req: 30, icon: '\u{1F33F}',
    group: 'protect', effect: 'Reflects a portion of melee damage taken back to the attacker.', drain_rate: 3 },
  { id: 'swiftstep',       name: 'Swiftstep',          req: 32, icon: '\u{1F45F}',
    group: 'utility', effect: 'Removes the run-energy drain while walking.', drain_rate: 2 },
  { id: 'ward_melee',      name: 'Ward of Iron',       req: 35, icon: '\u{1F6E1}️',
    group: 'overhead', effect: 'Blocks most melee damage from hitting you.', drain_rate: 4, conflicts: ['ward_ranged', 'ward_magic'] },
  { id: 'ward_ranged',     name: 'Ward of Wind',       req: 40, icon: '\u{1F32C}️',
    group: 'overhead', effect: 'Blocks most Ranged damage from hitting you.', drain_rate: 4, conflicts: ['ward_melee', 'ward_magic'] },
  { id: 'ward_magic',      name: 'Ward of Glass',      req: 44, icon: '❇️',
    group: 'overhead', effect: 'Blocks most Magic damage from hitting you.', drain_rate: 4, conflicts: ['ward_melee', 'ward_ranged'] },
  { id: 'soulward',        name: 'Soulward',           req: 50, icon: '\u{1F47B}',
    group: 'restore', effect: 'Redirects a portion of damage taken to drain Prayer points instead of HP.', drain_rate: 4 },
  { id: 'preserve',        name: 'Preserve',           req: 55, icon: '⏳',
    group: 'restore', effect: 'Slows the natural decay of boosted stats and halves Prayer drain from skill-boosting effects.', drain_rate: 2 },
  { id: 'stoneward',       name: 'Stoneward Stance',   req: 60, icon: '\u{1FAA8}',
    group: 'defence', effect: '+20% Defence.', drain_rate: 5, conflicts: ['stoneskin', 'granitehide', 'warders'] },
  { id: 'valorscall',      name: 'Valor\'s Call',      req: 65, icon: '\u{1F396}️',
    group: 'combo', effect: '+20% Attack, +23% Strength, +25% Defence. The melee combo prayer.', drain_rate: 6,
    conflicts: ['keeneye', 'ironhide', 'vanguard', 'ironwill', 'berserkersoul', 'battlefury', 'stoneskin', 'granitehide', 'warders', 'stoneward'] },
  { id: 'huntersfocus',    name: 'Hunter\'s Focus',    req: 70, icon: '\u{1F3F9}',
    group: 'combo', effect: '+20% Ranged accuracy, +23% Ranged Strength, +25% Defence. The ranged combo prayer.', drain_rate: 6,
    conflicts: ['truearrow', 'hawkeye', 'wardeneye', 'stoneskin', 'granitehide', 'warders', 'stoneward'] },
  { id: 'archmagiststouch', name: 'Archmagist\'s Touch', req: 77, icon: '\u{1F9D9}',
    group: 'combo', effect: '+25% Magic accuracy and damage, +25% Defence while casting.', drain_rate: 6,
    conflicts: ['innerflame', 'mysticbarrier', 'arcanesight', 'stoneskin', 'granitehide', 'warders', 'stoneward'] },
];

/* Live roster - starts as the fallback array; may be swapped (same shape)
   once assets/data/prayers.json resolves. `let` so loadPrayersData() can
   reassign it; everything else in this module reads PRAYERS by reference
   at call time so the swap is picked up on the next render. */
let PRAYERS = FALLBACK_PRAYERS;

/* Validates the fetched JSON has the minimum shape this module relies on
   before trusting it over the fallback (defensive - never trust external
   data). Requires a non-empty prayers[] array of objects with id/name/
   req(number)/effect/drain_rate(number). */
function isValidRoster(list) {
  return Array.isArray(list) && list.length > 0 && list.every((p) =>
    p && typeof p.id === 'string' && typeof p.name === 'string' &&
    typeof p.req === 'number' && typeof p.effect === 'string' &&
    typeof p.drain_rate === 'number');
}

/* Best-effort async load of the data-driven roster. Non-blocking: the tab
   already renders correctly from FALLBACK_PRAYERS before/without this
   resolving. On success, swaps PRAYERS and re-renders the panel if it's
   currently mounted. Any failure (network, 404, bad JSON) is swallowed
   and the fallback roster remains in effect. */
function loadPrayersData() {
  if (typeof fetch === 'undefined') return;
  fetch('assets/data/prayers.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const list = data && data.prayers;
      if (!isValidRoster(list)) return;
      PRAYERS = list;
      publishActive();
      if (_host && _state) renderGrid(_host, _state);
    })
    .catch(() => {});
}

/* -------------------------------------------------- ACTIVE-SET STATE */
/* Local source of truth for which prayers are toggled on, mirrored to
   window.EMPRAYER for other modules to read. */
const active = new Set();

/* Deactivates any currently-active prayer that conflicts with `p`
   (mutually-exclusive groups: protection/overhead prayers, style-boost
   tiers that stack onto the same stat, and the top-tier combo prayers).
   Conflicts are declared per-prayer via `conflicts: [ids]`; checked both
   ways so an older prayer's list doesn't need to list every newer prayer
   that supersedes it (newer prayers list their own predecessors, but this
   stays defensive in case data is ever asymmetric). Called just before a
   prayer is added to `active`; does not itself touch drain state beyond
   removing ids from the set (the caller's startDrainIfNeeded/stopDrain
   bookkeeping still applies on top). */
function deactivateConflicts(p) {
  const mine = Array.isArray(p.conflicts) ? p.conflicts : [];
  [...active].forEach((id) => {
    if (id === p.id) return;
    const other = PRAYERS.find((q) => q.id === id);
    const theirs = (other && Array.isArray(other.conflicts)) ? other.conflicts : [];
    if (mine.includes(id) || theirs.includes(p.id)) active.delete(id);
  });
}

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
          deactivateConflicts(p);
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
  loadPrayersData(); /* best-effort: swap in assets/data/prayers.json roster when it resolves */

  window.EMTABS = window.EMTABS || {};
  window.EMTABS['prayer'] = (panel, state) => {
    syncPtsMax(state); /* update max from current prayer level */
    panel.innerHTML = '<h4>Prayer</h4><div class="empr-host"></div>';
    renderGrid(panel.querySelector('.empr-host'), state);
  };

  return window.EMTABS['prayer'];
}

export default initPrayerTab;
