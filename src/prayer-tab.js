/* =====================================================================
   ELDERMOOR - Prayer tab module (PR1/PR3/PR5)

   Owns the "prayer" HUD tab via the shared tab registry hook
   (window.EMTABS['prayer'] = (panel, state) => {...}). Renders a grid of
   early-game prayers using ORIGINAL Eldermoor names that map to the OSRS
   prayer roles (Stoneskin ⇄ Thick Skin, Ironwill ⇄ Burst of Strength,
   Keen Eye ⇄ Clarity of Thought, Granite Hide ⇄ Rock Skin, ...).

   Behaviour:
   - Prayer level is read live from the HUD state each render:
       lvl = state.levelFromXp( state.getSkillXp()['prayer'] || 0 ).
   - Prayers ABOVE the player\'s prayer level render greyed and show their
     level requirement; they are not clickable.
   - AVAILABLE prayers (req <= level) are clickable and toggle an "active"
     highlight. The active set is tracked locally and mirrored onto
     window.EMPRAYER (active id list + helpers) so other modules can read
     the current activations.
   - Hover shows name + level + effect via window.EMTIP if present.

   Conventions matched: ES module exporting initPrayerTab(); registers via
   window.EMTABS[tab]; reads (never mutates) HUD state through the passed
   `state` object; self-contained CSS injected once. main.js wires the
   single initPrayerTab() call.
   ===================================================================== */

/* -------------------------------------------------------------- DATA */
/* Original Eldermoor prayer names mapped to OSRS roles. Ordered by req. */
const PRAYERS = [
  { id: 'stoneskin',     name: 'Stoneskin',      req: 1,  icon: '🛡️',
    osrs: 'Thick Skin',         effect: '+5% Defence.' },
  { id: 'ironwill',      name: 'Ironwill',       req: 4,  icon: '💪',
    osrs: 'Burst of Strength',  effect: '+5% Strength.' },
  { id: 'keeneye',       name: 'Keen Eye',       req: 7,  icon: '👁️',
    osrs: 'Clarity of Thought', effect: '+5% Attack.' },
  { id: 'truearrow',     name: 'True Arrow',     req: 8,  icon: '🏹',
    osrs: 'Sharp Eye',          effect: '+5% Ranged accuracy.' },
  { id: 'innerflame',    name: 'Inner Flame',    req: 9,  icon: '🔮',
    osrs: 'Mystic Will',        effect: '+5% Magic.' },
  { id: 'granitehide',   name: 'Granite Hide',   req: 10, icon: '🪨',
    osrs: 'Rock Skin',          effect: '+10% Defence.' },
  { id: 'berserkersoul', name: "Berserker\'s Soul", req: 13, icon: '⚔️',
    osrs: 'Superhuman Strength', effect: '+10% Strength.' },
  { id: 'hawkeye',       name: 'Hawk Eye',       req: 16, icon: '🦅',
    osrs: 'Improved Reflexes',  effect: '+10% Attack.' },
];

/* -------------------------------------------------- ACTIVE-SET STATE */
/* Local source of truth for which prayers are toggled on, mirrored to
   window.EMPRAYER for other modules to read. */
const active = new Set();

function publishActive() {
  if (typeof window === 'undefined') return;
  const ids = [...active];
  window.EMPRAYER = window.EMPRAYER || {};
  window.EMPRAYER.active = ids;
  window.EMPRAYER.isActive = (id) => active.has(id);
  window.EMPRAYER.list = () => PRAYERS.map((p) => ({ ...p, active: active.has(p.id) }));
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

/* ------------------------------------------------------------ RENDER */
function renderGrid(host, state) {
  const level = prayerLevel(state);
  host.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'empr-head';
  head.textContent = 'Prayers - level ' + level;
  host.appendChild(head);

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
        if (active.has(p.id)) active.delete(p.id);
        else active.add(p.id);
        publishActive();
        renderGrid(host, state); // re-render to reflect highlight
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
    margin:0 0 6px;letter-spacing:.02em;}
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
  publishActive(); // seed window.EMPRAYER before any render

  window.EMTABS = window.EMTABS || {};
  window.EMTABS['prayer'] = (panel, state) => {
    panel.innerHTML = '<h4>Prayer</h4><div class="empr-host"></div>';
    renderGrid(panel.querySelector('.empr-host'), state);
  };

  return window.EMTABS['prayer'];
}

export default initPrayerTab;
