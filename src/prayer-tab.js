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

/* ----------------------------------------------------- OVERHEAD SPRITE
   Prayers in the 'overhead' group (the protect-from-X wards) and the
   'protect' group (Retribution/Thornmail-style) show a single canvas-
   texture icon sprite above the player's head while active, mirroring
   OSRS overhead prayer icons. Only one overhead can be shown at a time
   (matches the conflicts-based mutual exclusivity already enforced for
   the 'overhead' group; 'protect' prayers do not conflict with each
   other or with wards in this roster, so if more than one qualifying
   prayer is active simultaneously we just show the most-recently-
   activated one - see pickOverheadPrayer()).
   Built the same way as npc.js nameplate()/speechSprite(): canvas ->
   CanvasTexture -> Sprite, no external asset. Position is refreshed every
   frame from window.EMPLAYERPOS via a local rAF loop (this module has no
   access to the shared render loop), and the sprite is removed (scene
   .remove + texture/material dispose) the instant no qualifying prayer
   is active, so it never lingers after toggle-off. */
const OVERHEAD_GROUPS = ['overhead', 'protect'];
function isOverheadPrayer(p) {
  return !!p && OVERHEAD_GROUPS.indexOf(p.group) !== -1;
}

/* Track activation order (most recent last) so we can pick a deterministic
   "current" overhead when multiple non-conflicting protect-group prayers
   happen to be active at once. Cleared entries are pruned lazily. */
const activationOrder = [];
function noteActivation(id) {
  const i = activationOrder.indexOf(id);
  if (i !== -1) activationOrder.splice(i, 1);
  activationOrder.push(id);
}

function pickOverheadPrayer() {
  for (let i = activationOrder.length - 1; i >= 0; i--) {
    const id = activationOrder[i];
    if (!active.has(id)) continue;
    const p = PRAYERS.find((q) => q.id === id);
    if (isOverheadPrayer(p)) return p;
  }
  return null;
}

let _overheadSprite = null;   /* current THREE.Sprite, or null when hidden */
let _overheadTex = null;      /* its CanvasTexture, for disposal */
let _overheadPrayerId = null; /* id the sprite currently represents (avoid redundant rebuilds) */
let _overheadRafHandle = null;

function overheadScene() {
  if (typeof window === 'undefined') return null;
  return window.EMSCENE || (window.EMENGINE && window.EMENGINE.scene) || null;
}

function overheadPlayerPos() {
  if (typeof window === 'undefined') return null;
  return window.EMPLAYERPOS || (window.EMPLAYER && window.EMPLAYER.pos) || null;
}

const OVERHEAD_Y_OFFSET = 3.35; /* above nameplate height (2.35) and speech bubble (2.95) */

/* Build a small round icon sprite (emoji glyph on a dark glowing disc) for
   the given prayer. Mirrors npc.js nameplate() canvas-texture technique. */
function buildOverheadSprite(p) {
  if (typeof window === 'undefined' || !window.THREE) return null;
  const THREE = window.THREE;
  const S = 96;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d');
  const cx = S / 2, cy = S / 2, r = S / 2 - 4;
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
  grad.addColorStop(0, 'rgba(40,30,10,.95)');
  grad.addColorStop(1, 'rgba(20,15,5,.85)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffd98a';
  ctx.shadowColor = '#ffd98a';
  ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = (S * 0.52) + 'px "Segoe UI Emoji","Trebuchet MS",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(p.icon || '✨', cx, cy + 2);

  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(0.62, 0.62, 1);
  spr.renderOrder = 1005;
  spr.userData._tex = tex;
  return spr;
}

function destroyOverheadSprite() {
  const scene = overheadScene();
  if (_overheadSprite) {
    if (scene && typeof scene.remove === 'function') scene.remove(_overheadSprite);
    if (_overheadTex && _overheadTex.dispose) _overheadTex.dispose();
    if (_overheadSprite.material && _overheadSprite.material.dispose) _overheadSprite.material.dispose();
  }
  _overheadSprite = null;
  _overheadTex = null;
  _overheadPrayerId = null;
}

/* One rAF tick: keep the sprite positioned at the live player position (it
   moves every frame, same as combat hitsplats use position.set per-frame)
   and tear itself down once no overhead prayer remains active. */
function overheadFrame() {
  _overheadRafHandle = null;
  const p = pickOverheadPrayer();
  if (!p) { destroyOverheadSprite(); return; } /* stop the loop - nothing to show */

  if (!_overheadSprite || _overheadPrayerId !== p.id) {
    destroyOverheadSprite();
    const spr = buildOverheadSprite(p);
    const scene = overheadScene();
    if (spr && scene && typeof scene.add === 'function') {
      scene.add(spr);
      _overheadSprite = spr;
      _overheadTex = spr.userData._tex;
      _overheadPrayerId = p.id;
    }
  }

  if (_overheadSprite) {
    const pp = overheadPlayerPos();
    if (pp) {
      const py = (typeof pp.y === 'number') ? pp.y : 0;
      _overheadSprite.position.set(pp.x || 0, py + OVERHEAD_Y_OFFSET, pp.z || 0);
    }
  }

  if (typeof requestAnimationFrame !== 'undefined') {
    _overheadRafHandle = requestAnimationFrame(overheadFrame);
  }
}

/* Start the follow loop if not already running (idempotent). Called any
   time the active set changes so a fresh overhead activation is picked up
   immediately rather than waiting on the next unrelated render. */
function ensureOverheadLoop() {
  if (_overheadRafHandle !== null) return;
  if (typeof requestAnimationFrame === 'undefined') return;
  _overheadRafHandle = requestAnimationFrame(overheadFrame);
}

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

  /* Single chokepoint for the active set changing (toggle click, conflict
     drain, points-exhausted drain) - start/refresh the overhead-icon
     follow loop if a qualifying prayer is on, or let it tear itself down
     on its next tick if not (overheadFrame() checks pickOverheadPrayer()
     itself, so it's safe to just ensure the loop is running here). */
  ensureOverheadLoop();
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
      (on ? `<span class="empr-check" aria-hidden="true">✓</span>` : '') +
      `<span class="empr-icon">${p.icon}</span>` +
      `<span class="empr-name">${p.name}</span>` +
      (available ? (on ? `<span class="empr-onlabel">ON</span>` : '')
                 : `<span class="empr-req">Lvl ${p.req}</span>`);

    if (available) {
      cell.addEventListener('click', () => {
        if (pts.cur <= 0 && !active.has(p.id)) return; /* no pts, can\'t activate */
        if (active.has(p.id)) {
          active.delete(p.id);
          if (active.size === 0) stopDrain();
        } else {
          deactivateConflicts(p);
          active.add(p.id);
          noteActivation(p.id);
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
  #empanel .empr-cell{position:relative;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:2px;padding:6px 2px;min-height:54px;cursor:pointer;
    border:2px solid #3a2f22;border-radius:6px;background:#241c12;color:#e8dcc2;
    font:500 10px/1.1 system-ui,sans-serif;text-align:center;
    transition:background .08s,border-color .08s,box-shadow .08s;}
  #empanel .empr-cell:hover{background:#322715;border-color:#6b5836;}
  #empanel .empr-icon{font-size:18px;line-height:1;}
  #empanel .empr-name{opacity:.95;}
  /* ACTIVE state must be unmistakable at a glance: bright lime border + glow halo +
     a distinctly tinted background + a corner checkmark badge + an "ON" label.
     Inactive cells stay on the neutral dark palette above (no border/bg overlap). */
  #empanel .empr-cell-active{background:#2c4a1c;border-color:#a6e86a;
    box-shadow:0 0 0 2px #a6e86a inset,0 0 10px 2px rgba(166,232,106,.65);}
  #empanel .empr-cell-active:hover{background:#355c22;}
  #empanel .empr-check{position:absolute;top:-7px;right:-7px;width:16px;height:16px;
    border-radius:50%;background:#a6e86a;color:#16290a;font:700 11px/16px system-ui,sans-serif;
    box-shadow:0 0 0 2px #14110a,0 0 6px rgba(166,232,106,.8);}
  #empanel .empr-onlabel{position:absolute;bottom:3px;right:5px;font:700 8px/1 system-ui,sans-serif;
    color:#1c3310;background:#a6e86a;border-radius:3px;padding:1px 3px;letter-spacing:.04em;}
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
