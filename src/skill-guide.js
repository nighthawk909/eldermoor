/**
 * skill-guide.js - Skill Guide popup + skill-cell hover tooltips (SK1 / SK2)
 *
 * Self-contained feature module. Does NOT edit hud.js; everything is wired via
 * document-level event delegation against the Stats-tab skill cells that hud.js
 * renders (`.emsk .sk`).
 *
 *   SK1 - clicking a skill cell opens a Skill Guide popup listing that skill\'s
 *         level unlocks (original Eldermoor framing that maps OSRS-style roles).
 *   SK2 - hovering a skill cell shows a custom tooltip with current XP, the
 *         next-level XP threshold, and XP remaining (computed from
 *         window.EMHUD.getSkillXp() + the xp table on getSkills().xpTable via
 *         EMHUD.levelFromXp).
 *
 * Uses window.EMTIP.attach-style rendering when present (its show/hide API),
 * otherwise falls back to a small self-styled tooltip. The guide popup carries
 * its own injected CSS and closes on outside-click / Escape.
 *
 * No-ops gracefully if EMHUD is absent - handlers simply do nothing until the
 * HUD data is ready, so it is safe to init before or after initHud().
 *
 * Usage (wired from main.js): `import { initSkillGuide } from './skill-guide.js';
 * initSkillGuide();`
 *
 * Public API (window.EMSKILLGUIDE, set once initSkillGuide() has run):
 *   EMSKILLGUIDE.open(skillId)    - open the guide popup for a skill id
 *                                   (e.g. 'attack', 'mining'); matches skills.json ids.
 *   EMSKILLGUIDE.tooltip(skillId) - returns { html, xp, level, nextXp, remaining, maxed }
 *                                   for a skill id, or null if unavailable. Does not
 *                                   render anything itself - callers (e.g. a future
 *                                   Skills-tab hover) decide how/where to show it.
 *   EMSKILLGUIDE.close()          - close the guide popup.
 *   EMSKILLGUIDE.isOpen()         - whether the guide popup is currently open.
 */

const STYLE_ID = 'em-skillguide-style';
const POPUP_ID = 'em-skillguide';
const TIP_ID = 'em-skillguide-tip';

/* --- inline unlock data --------------------------------------------------
   Original Eldermoor framing. Each entry: { level, note } describing what the
   player gains / can do at that level. Keyed by skill id (matches skills.json).
   Short by design - a "register of milestones", not an exhaustive table. */
const UNLOCKS = {
  attack: [
    { level: 1, note: 'Wield bronze arms - the recruit\'s edge.' },
    { level: 5, note: 'Iron weapons answer to your grip.' },
    { level: 20, note: 'Tempered steel; the moor\'s guard takes notice.' },
    { level: 40, note: 'Knightsteel blades - a duelist\'s reach.' },
    { level: 60, note: 'Warbrand mastery; champions cross you carefully.' },
    { level: 99, note: 'Bladelord of Eldermoor - the cape of mastery.' }
  ],
  strength: [
    { level: 1, note: 'Raw might - heft any common arm.' },
    { level: 20, note: 'Crushing maces and warhammers swing true.' },
    { level: 50, note: 'Siege-arms of the moorfolk wars.' },
    { level: 99, note: 'Titan of Eldermoor - unmatched force.' }
  ],
  defence: [
    { level: 1, note: 'Don boiled leather and bronze.' },
    { level: 10, note: 'Iron plate turns the first blow.' },
    { level: 40, note: 'Knightsteel harness - a wall in the field.' },
    { level: 60, note: 'Wardplate of the moor; few wounds land.' },
    { level: 99, note: 'Bulwark of Eldermoor - the immovable.' }
  ],
  hitpoints: [
    { level: 10, note: 'A hardened constitution - you start here.' },
    { level: 50, note: 'Seasoned vitality; long campaigns hold.' },
    { level: 99, note: 'Lifewarden - the heart that will not fail.' }
  ],
  ranged: [
    { level: 1, note: 'String a shortbow; loose your first volley.' },
    { level: 20, note: 'Oakwood longbow - the moor\'s far reach.' },
    { level: 50, note: 'Hunter\'s warbow; a sniper\'s patience pays.' },
    { level: 99, note: 'Far-Strider of Eldermoor - never a miss.' }
  ],
  prayer: [
    { level: 1, note: 'Whisper the first roadside blessing.' },
    { level: 31, note: 'Call protective wards in the thick of battle.' },
    { level: 70, note: 'Channel the moor-saints\' high litanies.' },
    { level: 99, note: 'Vesper of Eldermoor - the saints answer.' }
  ],
  magic: [
    { level: 1, note: 'Loose a Gust strike - the apprentice\'s spark.' },
    { level: 25, note: 'Bind and teleport along the leyroads.' },
    { level: 55, note: 'Command the higher elemental arts.' },
    { level: 99, note: 'Archmage of Eldermoor - the woven word.' }
  ],
  mining: [
    { level: 1, note: 'Chip copper and tin from the moorrock.' },
    { level: 15, note: 'Break iron from the deeper seams.' },
    { level: 40, note: 'Pull coal and silver; the mine yields.' },
    { level: 85, note: 'Wrest runite from the heart of the stone.' },
    { level: 99, note: 'Stonewright of Eldermoor - the mountain\'s friend.' }
  ],
  smithing: [
    { level: 1, note: 'Smelt and beat bronze at the forge.' },
    { level: 15, note: 'Work iron into honest tools.' },
    { level: 40, note: 'Forge steel arms for the moor-guard.' },
    { level: 85, note: 'Hammer runite - only masters dare.' },
    { level: 99, note: 'Forgelord of Eldermoor - anvil-king.' }
  ],
  fishing: [
    { level: 1, note: 'Net shrimp from the shallows.' },
    { level: 20, note: 'Cast a line for trout in the moorbecks.' },
    { level: 40, note: 'Harpoon the deep-water catch.' },
    { level: 99, note: 'Tidecaller of Eldermoor - the waters give.' }
  ],
  cooking: [
    { level: 1, note: 'Cook your first catch over a fire.' },
    { level: 25, note: 'Bake bread and stew for the road.' },
    { level: 60, note: 'Prepare feast-fare for the hall.' },
    { level: 99, note: 'Hearthmaster of Eldermoor - none go hungry.' }
  ],
  woodcutting: [
    { level: 1, note: 'Fell ordinary trees of the moor-edge.' },
    { level: 15, note: 'Take oak for sturdier work.' },
    { level: 60, note: 'Bring down the great yew elders.' },
    { level: 99, note: 'Woodwarden of Eldermoor - the forest yields.' }
  ],
  firemaking: [
    { level: 1, note: 'Coax a flame from log and tinder.' },
    { level: 30, note: 'Keep a maple blaze against the night.' },
    { level: 99, note: 'Flamekeeper of Eldermoor - the warding light.' }
  ],
  crafting: [
    { level: 1, note: 'Cut hide and shape simple leather.' },
    { level: 20, note: 'Blow glass and string the first amulet.' },
    { level: 70, note: 'Set gemcraft fit for the moor-court.' },
    { level: 99, note: 'Artificer of Eldermoor - the maker\'s hand.' }
  ],
  fletching: [
    { level: 1, note: 'Whittle arrow shafts and shortbows.' },
    { level: 35, note: 'String longbows of seasoned oak.' },
    { level: 99, note: 'Bowwright of Eldermoor - every shaft flies true.' }
  ],
  herblore: [
    { level: 1, note: 'Clean herbs gathered from the heath.' },
    { level: 25, note: 'Brew tonics that mend on the march.' },
    { level: 70, note: 'Distil the rare moor-draughts.' },
    { level: 99, note: 'Apothecary of Eldermoor - the healer\'s lore.' }
  ],
  agility: [
    { level: 1, note: 'Cross the first moor-rooftop run.' },
    { level: 40, note: 'Vault the deeper gorge courses.' },
    { level: 99, note: 'Pathfinder of Eldermoor - no wall holds you.' }
  ],
  thieving: [
    { level: 1, note: 'Lift a coin-purse from a stall.' },
    { level: 38, note: 'Pick locks and crack the merchant chests.' },
    { level: 99, note: 'Shadowhand of Eldermoor - unseen, unfelt.' }
  ],
  slayer: [
    { level: 1, note: 'Take your first hunt-contract from the master.' },
    { level: 50, note: 'Stalk the moor\'s rarer beasts.' },
    { level: 99, note: 'Beastbane of Eldermoor - the final word in the hunt.' }
  ],
  farming: [
    { level: 1, note: 'Sow the first allotment plots.' },
    { level: 35, note: 'Tend orchard and herb patch alike.' },
    { level: 99, note: 'Greenwarden of Eldermoor - the land repays you.' }
  ],
  runecraft: [
    { level: 1, note: 'Bind air essence at the leystone.' },
    { level: 44, note: 'Weave nature and law runes from raw essence.' },
    { level: 99, note: 'Runelord of Eldermoor - the woven powers.' }
  ],
  construction: [
    { level: 1, note: 'Raise the first plank of your holding.' },
    { level: 50, note: 'Furnish halls fit to host the moor-folk.' },
    { level: 99, note: 'Homewright of Eldermoor - the standing house.' }
  ],
  hunter: [
    { level: 1, note: 'Lay snares for moor-fowl and kit.' },
    { level: 40, note: 'Trap the larger beasts of the heath.' },
    { level: 99, note: 'Tracker of Eldermoor - nothing escapes the net.' }
  ]
};

/* --- DOM / style setup --------------------------------------------------- */

const POPUP_CSS = `
#${POPUP_ID}-backdrop {
  position: fixed; inset: 0; z-index: 99990;
  background: rgba(0, 0, 0, 0.45);
}
#${POPUP_ID} {
  position: fixed; z-index: 99991;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(86vw, 360px); max-height: 70vh; overflow: auto;
  padding: 14px 16px 16px;
  font-family: "Trebuchet MS", Verdana, sans-serif;
  color: #e8dcc0;
  background: linear-gradient(#3a2e1f, #28201a);
  background-color: #312718;
  border: 2px solid #5a4a2a;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(216, 178, 90, 0.18);
  text-shadow: 0 1px 2px #000;
}
#${POPUP_ID} .em-sg-head {
  display: flex; align-items: center; gap: 9px;
  margin: 0 0 10px; padding-bottom: 9px;
  border-bottom: 1px solid #4a3a26;
}
#${POPUP_ID} .em-sg-ico { font-size: 22px; line-height: 1; }
#${POPUP_ID} .em-sg-title { flex: 1; }
#${POPUP_ID} .em-sg-title h4 {
  margin: 0; color: #e7c64f; font-size: 14px;
  letter-spacing: .04em; text-transform: uppercase;
}
#${POPUP_ID} .em-sg-sub { color: #b9a884; font-size: 11px; }
#${POPUP_ID} .em-sg-close {
  cursor: pointer; border: 1px solid #5a4a2a; background: #2b2620;
  color: #cdbf98; border-radius: 4px; width: 24px; height: 24px;
  font-size: 14px; line-height: 1; flex: none;
}
#${POPUP_ID} .em-sg-close:hover { border-color: #e7c64f; color: #fff; }
#${POPUP_ID} ul.em-sg-list { list-style: none; margin: 0; padding: 0; }
#${POPUP_ID} ul.em-sg-list li {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 6px 4px; border-bottom: 1px solid rgba(74, 58, 38, 0.5);
  font-size: 12.5px; line-height: 1.4;
}
#${POPUP_ID} ul.em-sg-list li:last-child { border-bottom: 0; }
#${POPUP_ID} ul.em-sg-list li.em-sg-have { color: #cfeec0; }
#${POPUP_ID} ul.em-sg-list li.em-sg-have .em-sg-lvl { color: #8fe08f; }
#${POPUP_ID} ul.em-sg-list li.em-sg-locked { color: #9a8c6c; }
#${POPUP_ID} .em-sg-lvl {
  flex: none; width: 30px; text-align: center;
  font-weight: bold; color: #e7c64f;
}
#${TIP_ID} {
  position: fixed; z-index: 100000; top: 0; left: 0;
  max-width: 240px; padding: 5px 9px;
  font-family: "Trebuchet MS", "Segoe UI", Tahoma, sans-serif;
  font-size: 12px; line-height: 1.4;
  color: #ffe9b0; background: #1b140c;
  border: 1px solid #d8b25a; border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
  text-shadow: 1px 1px 0 #000;
  pointer-events: none; white-space: normal;
  opacity: 0; visibility: hidden;
}
#${TIP_ID}.em-sg-tip-on { opacity: 1; visibility: visible; }
#${TIP_ID} b { color: #ffd86a; }
#${TIP_ID} .em-sg-tip-sub { color: #b9a884; font-size: 11px; }
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = POPUP_CSS;
  document.head.appendChild(style);
}

/* --- EMHUD access helpers (all no-op safe) ------------------------------- */

function hud() {
  return (typeof window !== 'undefined' && window.EMHUD) ? window.EMHUD : null;
}

// Resolve the skill descriptor for a given cell by matching its title prefix
// ("Attack: 1234 xp") against the skill list. hud.js doesn\'t tag cells with an
// id, so we map by name (case-insensitive). Returns the skill object or null.
function skillForCell(cell) {
  const h = hud();
  if (!h || typeof h.getSkills !== 'function') return null;
  const sk = h.getSkills();
  if (!sk || !Array.isArray(sk.skills)) return null;

  const title = cell.getAttribute('title') || '';
  const name = title.split(':')[0].trim().toLowerCase();
  if (name) {
    const byName = sk.skills.find(s => (s.name || '').toLowerCase() === name);
    if (byName) return byName;
  }
  // Fallback: positional index among sibling cells (render order == skills order).
  const cells = cell.parentNode ? Array.from(cell.parentNode.querySelectorAll('.sk')) : [];
  const idx = cells.indexOf(cell);
  if (idx >= 0 && idx < sk.skills.length) return sk.skills[idx];
  return null;
}

// Resolve the skill descriptor by id (matches skills.json `s.id`, e.g. 'attack').
// Case-insensitive; accepts the display name too as a convenience fallback.
function skillById(skillId) {
  const h = hud();
  if (!h || typeof h.getSkills !== 'function' || !skillId) return null;
  const sk = h.getSkills();
  if (!sk || !Array.isArray(sk.skills)) return null;
  const key = String(skillId).toLowerCase();
  return sk.skills.find(s => (s.id || '').toLowerCase() === key)
    || sk.skills.find(s => (s.name || '').toLowerCase() === key)
    || null;
}

// Compute { xp, level, nextXp, remaining, maxed } for a skill id.
function progressFor(skillId) {
  const h = hud();
  if (!h) return null;
  const sk = (typeof h.getSkills === 'function') ? h.getSkills() : null;
  const xpMap = (typeof h.getSkillXp === 'function') ? h.getSkillXp() : null;
  if (!sk || !xpMap || !Array.isArray(sk.xpTable)) return null;

  const xp = Math.floor(xpMap[skillId] || 0);
  const level = (typeof h.levelFromXp === 'function')
    ? h.levelFromXp(xp)
    : localLevelFromXp(xp, sk.xpTable);

  const table = sk.xpTable;
  const maxLevel = Math.min(99, table.length);
  if (level >= maxLevel) {
    return { xp, level, nextXp: null, remaining: 0, maxed: true };
  }
  // xpTable is 0-indexed by (level-1): table[level] is the xp for `level+1`.
  const nextXp = (table[level] != null) ? table[level] : null;
  const remaining = (nextXp != null) ? Math.max(0, nextXp - xp) : 0;
  return { xp, level, nextXp, remaining, maxed: false };
}

// Local fallback if EMHUD.levelFromXp is unavailable for any reason.
function localLevelFromXp(xp, table) {
  let l = 1;
  for (let i = 1; i < table.length; i++) {
    if (xp >= table[i]) l = i + 1; else break;
  }
  return Math.min(l, 99);
}

function fmt(n) {
  return (typeof n === 'number') ? n.toLocaleString() : String(n);
}

/* --- SK2: hover tooltip -------------------------------------------------- */

// Build tooltip HTML for an already-resolved skill descriptor. Returns '' if
// data unavailable. Shared core for both the hover tooltip (by cell) and the
// public EMSKILLGUIDE.tooltip(skillId) API.
function tipHtmlForSkill(skill) {
  if (!skill) return '';
  const p = progressFor(skill.id);
  if (!p) return '';

  const head = `<b>${skill.icon || ''} ${skill.name}</b> - level ${p.level}`;
  if (p.maxed) {
    return `${head}<div class="em-sg-tip-sub">${fmt(p.xp)} xp · mastered (99)</div>`;
  }
  return `${head}`
    + `<div class="em-sg-tip-sub">Current XP: ${fmt(p.xp)}</div>`
    + `<div class="em-sg-tip-sub">Next level: ${fmt(p.nextXp)} xp</div>`
    + `<div class="em-sg-tip-sub">Remaining: ${fmt(p.remaining)} xp</div>`;
}

// Build tooltip HTML for a skill cell. Returns '' if data unavailable.
function tipHtml(cell) {
  return tipHtmlForSkill(skillForCell(cell));
}

// Public: full tooltip data + rendered HTML for a skill id. Returns null if
// EMHUD / the skill / xp data is unavailable. Does not render or position
// anything - that is left to the caller (the HUD's hover handling, or
// whatever future Skills-tab UI wants to display it).
function tooltipFor(skillId) {
  const skill = skillById(skillId);
  if (!skill) return null;
  const p = progressFor(skill.id);
  if (!p) return null;
  return {
    html: tipHtmlForSkill(skill),
    skillId: skill.id,
    name: skill.name,
    icon: skill.icon || '',
    xp: p.xp,
    level: p.level,
    nextXp: p.nextXp,
    remaining: p.remaining,
    maxed: p.maxed
  };
}

// Self-styled fallback tooltip element (used only when EMTIP is absent).
let fallbackTip = null;
function fbEnsure() {
  if (fallbackTip && document.body.contains(fallbackTip)) return fallbackTip;
  fallbackTip = document.createElement('div');
  fallbackTip.id = TIP_ID;
  fallbackTip.setAttribute('role', 'tooltip');
  document.body.appendChild(fallbackTip);
  return fallbackTip;
}
function fbShow(html, x, y) {
  const el = fbEnsure();
  el.innerHTML = html;
  el.classList.add('em-sg-tip-on');
  // Position with a small offset, clamped to viewport.
  const rect = el.getBoundingClientRect();
  let left = x + 14, top = y + 18;
  if (left + rect.width + 6 > window.innerWidth) left = x - 14 - rect.width;
  if (left < 6) left = 6;
  if (top + rect.height + 6 > window.innerHeight) top = y - 18 - rect.height;
  if (top < 6) top = 6;
  el.style.left = left + 'px';
  el.style.top = top + 'px';
}
function fbHide() {
  if (fallbackTip) fallbackTip.classList.remove('em-sg-tip-on');
}

// Show/refresh the tooltip for a cell at the cursor, using EMTIP when present.
function showTip(cell, x, y) {
  const html = tipHtml(cell);
  if (!html) { hideTip(); return; }
  const tip = (typeof window !== 'undefined' && window.EMTIP) ? window.EMTIP : null;
  if (tip && typeof tip.show === 'function') tip.show(html, x, y);
  else fbShow(html, x, y);
}
function hideTip() {
  const tip = (typeof window !== 'undefined' && window.EMTIP) ? window.EMTIP : null;
  if (tip && typeof tip.hide === 'function') tip.hide();
  fbHide();
}

/* --- SK1: guide popup ---------------------------------------------------- */

let popupOpen = false;

function closePopup() {
  const bd = document.getElementById(POPUP_ID + '-backdrop');
  if (bd) bd.remove();
  const pp = document.getElementById(POPUP_ID);
  if (pp) pp.remove();
  popupOpen = false;
}

// Open the guide popup for an already-resolved skill descriptor. Shared core
// for both the cell-click handler (SK1) and the public EMSKILLGUIDE.open(skillId).
function openPopupForSkill(skill) {
  if (!skill) return;
  const p = progressFor(skill.id);
  const level = p ? p.level : 1;

  closePopup(); // single instance

  const rows = UNLOCKS[skill.id] || [
    { level: 1, note: 'The first steps of this craft await in Eldermoor.' }
  ];
  const items = rows.map(r => {
    const cls = (level >= r.level) ? 'em-sg-have' : 'em-sg-locked';
    return `<li class="${cls}"><span class="em-sg-lvl">${r.level}</span>`
      + `<span>${r.note}</span></li>`;
  }).join('');

  const subParts = [];
  if (p) {
    subParts.push('Level ' + p.level);
    subParts.push(fmt(p.xp) + ' xp');
    if (!p.maxed) subParts.push(fmt(p.remaining) + ' xp to next');
  }
  const sub = subParts.join(' · ');

  const backdrop = document.createElement('div');
  backdrop.id = POPUP_ID + '-backdrop';

  const popup = document.createElement('div');
  popup.id = POPUP_ID;
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', skill.name + ' skill guide');
  popup.innerHTML =
    `<div class="em-sg-head">`
    + `<span class="em-sg-ico">${skill.icon || '📘'}</span>`
    + `<div class="em-sg-title"><h4>${skill.name} Guide</h4>`
    + `<div class="em-sg-sub">${sub}</div></div>`
    + `<button class="em-sg-close" aria-label="Close" title="Close">✕</button>`
    + `</div>`
    + `<ul class="em-sg-list">${items}</ul>`;

  document.body.appendChild(backdrop);
  document.body.appendChild(popup);
  popupOpen = true;

  // Close interactions: the ✕ button and clicks on the backdrop (outside).
  const closeBtn = popup.querySelector('.em-sg-close');
  if (closeBtn) closeBtn.addEventListener('click', closePopup);
  backdrop.addEventListener('click', closePopup);
}

/* --- delegation wiring --------------------------------------------------- */

// Find the `.emsk .sk` cell from an arbitrary event target, or null.
function cellFromEvent(ev) {
  const t = ev.target;
  if (!t || typeof t.closest !== 'function') return null;
  const cell = t.closest('.sk');
  if (!cell) return null;
  // Only treat it as a skill cell if it lives inside the stats grid.
  return cell.closest('.emsk') ? cell : null;
}

let wired = false;

export function initSkillGuide() {
  if (typeof document === 'undefined') {
    if (typeof console !== 'undefined') console.warn('[EMSG] no document; init skipped');
    return null;
  }
  if (wired) return publicApi();
  wired = true;

  ensureStyle();

  // SK1: click a skill cell → open its guide popup.
  document.addEventListener('click', (ev) => {
    // Don\'t treat clicks inside an open popup as cell clicks.
    if (ev.target && typeof ev.target.closest === 'function'
        && ev.target.closest('#' + POPUP_ID)) return;
    const cell = cellFromEvent(ev);
    if (!cell) return;
    openPopup(cell);
  });

  // SK2: hover a skill cell → custom tooltip with XP progress.
  document.addEventListener('mouseover', (ev) => {
    const cell = cellFromEvent(ev);
    if (!cell) return;
    showTip(cell, ev.clientX, ev.clientY);
  });
  document.addEventListener('mousemove', (ev) => {
    const cell = cellFromEvent(ev);
    if (!cell) { return; }
    // Refresh content + position so live XP changes show while hovering.
    showTip(cell, ev.clientX, ev.clientY);
  });
  document.addEventListener('mouseout', (ev) => {
    const cell = cellFromEvent(ev);
    if (!cell) return;
    // Only hide when actually leaving the cell (not moving within it).
    const to = ev.relatedTarget;
    if (to && typeof to.closest === 'function' && to.closest('.sk') === cell) return;
    hideTip();
  });

  // Close the guide popup on Escape.
  document.addEventListener('keydown', (ev) => {
    if (popupOpen && (ev.key === 'Escape' || ev.key === 'Esc')) closePopup();
  });

  return publicApi();
}

function publicApi() {
  const api = { open: openPopup, close: closePopup, isOpen: () => popupOpen };
  if (typeof window !== 'undefined') window.EMSKILLGUIDE = api;
  return api;
}

export default initSkillGuide;
