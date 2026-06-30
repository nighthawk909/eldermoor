/* =====================================================================
   orbs.js - OSRS-style minimap ORB CLUSTER (HUD1/MM6/HUD2-orb).

   Renders four round orbs in a row UNDER the existing #emmap minimap
   (which is fixed top-right at right:10px;top:10px, 108px wide), matching
   OSRS's "stat orbs under the minimap" cluster:
       HP (heart) · Prayer · Run-energy · Special.

   Self-contained: injects its own CSS + DOM on init, owns its own refresh
   loop (~5/sec). Reads ambient globals, never imports siblings:
     • window.EMHUD  - getSkillXp() + levelFromXp(id) for 'hitpoints'/'prayer'
     • window.EMRUN  - { on, energy }  (run-energy model from player.js)
     • window.EMTOGGLERUN - optional toggle fn; Run orb click calls it (no-op if absent)

   No-ops gracefully until EMHUD/EMRUN exist, retrying on an interval.

   Export: initOrbs()  - call once from main.js after the HUD is wired.
   ===================================================================== */

const REFRESH_MS = 200;      // ~5 refreshes/sec
const WAIT_MS    = 250;      // retry cadence while globals aren\'t ready

/* fixed geometry - keep in sync with #emmap (right:10px, top:10px, width/height 108px) */
const MAP_RIGHT = 10;        // px from viewport right edge to map
const MAP_TOP   = 10;        // px from viewport top to map
const MAP_W     = 108;       // minimap width
const MAP_H     = 108;       // minimap height
const GAP       = 8;         // gap between map bottom and orb row
const ORB       = 30;        // orb diameter
const ORB_GAP   = 5;         // horizontal gap between orbs
const ORB_ROW_BOTTOM = MAP_TOP + MAP_H + GAP + ORB; // y where the orb row ends (px from viewport top)

const CSS = `
  #emorbs{position:fixed;z-index:31;
    right:${MAP_RIGHT}px;top:${MAP_TOP + MAP_H + GAP}px;
    display:flex;flex-direction:row;justify-content:flex-end;gap:${ORB_GAP}px;
    font-family:"Trebuchet MS",sans-serif;-webkit-user-select:none;user-select:none;}
  #emorbs .emorb{position:relative;width:${ORB}px;height:${ORB}px;border-radius:50%;
    background:radial-gradient(circle at 50% 38%,#3a342a,#211d18 70%);
    border:2px solid #5a4a2a;box-shadow:0 2px 6px #0008,inset 0 0 0 1px #1a1712;
    overflow:hidden;}
  #emorbs .emorb .ico{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);
    font-size:15px;line-height:1;opacity:.92;text-shadow:0 1px 2px #000;pointer-events:none;}
  #emorbs .emorb .val{position:absolute;left:0;right:0;bottom:1px;text-align:center;
    font-size:10px;font-weight:bold;color:#f4ecd6;text-shadow:0 1px 2px #000,0 0 2px #000;
    letter-spacing:.02em;pointer-events:none;}
  #emorbs .emorb.run{cursor:pointer;}
  #emorbs .emorb.run.on{border-color:#e7c64f;box-shadow:0 2px 6px #0008,inset 0 0 0 1px #1a1712,0 0 7px #e7c64f88;}
  #emorbs .emorb.run:hover{filter:brightness(1.12);}
  /* ---- cross-module coordination note ----
     worldmap.js docks #emwmap-btn directly under the minimap at top:124px,
     which is the same slot the orb row now occupies (minimap moved the orbs
     here per OSRS parity: stat orbs live under the minimap). Rather than
     edit worldmap.js (owned by another agent), nudge its button below the
     new orb row with a higher-specificity rule so the two never overlap. */
  body #emwmap-btn{top:${ORB_ROW_BOTTOM + GAP}px !important;}
`;

/* orb specs - id, css class, emoji icon, OSRS-ish color theme */
const SPECS = [
  { id:'hp',     cls:'hp',     ico:'❤️', tip:'Hitpoints' },   // heart
  { id:'prayer', cls:'prayer', ico:'✨',       tip:'Prayer'    },   // sparkle
  { id:'run',    cls:'run',    ico:'👟', tip:'Run energy' },  // shoe
  { id:'spec',   cls:'spec',   ico:'⚔️', tip:'Special attack' },
];

function clamp(n, lo, hi){ return n < lo ? lo : n > hi ? hi : n; }

/* read a skill\'s current level from EMHUD (safe - returns null if unavailable) */
function skillLevel(hud, id){
  try {
    const xp = (hud.getSkillXp && hud.getSkillXp()) || {};
    const lvl = hud.levelFromXp ? hud.levelFromXp(xp[id] || 0) : null;
    return (typeof lvl === 'number') ? lvl : null;
  } catch { return null; }
}

/* compute the four orb states from globals; returns null if not ready yet */
function readState(){
  const hud = window.EMHUD, run = window.EMRUN;
  if(!hud || !run) return null;

  const hpLevel = skillLevel(hud, 'hitpoints');
  const pr = skillLevel(hud, 'prayer');
  if(hpLevel == null || pr == null) return null;

  /* live HP - prefer window.EMPLAYERHP {cur,max} if present (combat damage) */
  const liveHp = window.EMPLAYERHP;
  const hpCur = (liveHp && typeof liveHp.cur === 'number') ? clamp(liveHp.cur, 0, liveHp.max) : hpLevel;
  const hpMax = (liveHp && typeof liveHp.max === 'number') ? liveHp.max : hpLevel;

  const energy = clamp(Math.round((run && typeof run.energy === 'number') ? run.energy : 100), 0, 100);

  return {
    hp:     { cur: hpCur, max: hpMax, label: `${hpCur}/${hpMax}`, tip: `Hitpoints: ${hpCur}/${hpMax}` },
    prayer: { cur: pr, max: pr, label: String(pr),    tip: `Prayer: ${pr}/${pr}` },
    run:    { cur: energy, max: 100, label: String(energy),
              on: !!(run && run.on), tip: `Run energy: ${energy}% (${run && run.on ? 'on' : 'off'})` },
    spec:   { cur: 100, max: 100, label: '100', tip: 'Special attack: 100%' },
  };
}

let mounted = false;

function mount(){
  if(mounted || typeof document === 'undefined') return;
  mounted = true;

  if(!document.getElementById('emorbs-css')){
    const style = document.createElement('style');
    style.id = 'emorbs-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const wrap = document.createElement('div');
  wrap.id = 'emorbs';
  wrap.innerHTML = SPECS.map(s =>
    `<div class="emorb ${s.cls}" data-orb="${s.id}" title="${s.tip}">
       <span class="ico">${s.ico}</span><span class="val">--</span>
     </div>`).join('');
  document.body.appendChild(wrap);

  // Run orb → toggle run-energy via the global (no-op if player.js hasn\'t exposed it)
  const runEl = wrap.querySelector('[data-orb="run"]');
  if(runEl){
    runEl.addEventListener('click', () => {
      if(typeof window.EMTOGGLERUN === 'function'){ window.EMTOGGLERUN(); refresh(); }
    });
  }
}

function refresh(){
  const wrap = document.getElementById('emorbs');
  if(!wrap) return;
  const st = readState();
  if(!st) return;
  for(const s of SPECS){
    const el = wrap.querySelector(`[data-orb="${s.id}"]`);
    if(!el) continue;
    const o = st[s.id];
    const val = el.querySelector('.val');
    if(val) val.textContent = o.label;
    el.title = o.tip;
    if(s.id === 'run') el.classList.toggle('on', !!o.on);
  }
}

/* =====================================================================
   initOrbs() - wait for EMHUD/EMRUN, then mount + start the refresh loop.
   Safe to call once; idempotent against double-mount.
   ===================================================================== */
export function initOrbs(){
  if(typeof window === 'undefined' || typeof document === 'undefined') return;

  const tryStart = () => {
    if(!window.EMHUD || !window.EMRUN) return false;   // not ready - keep waiting
    mount();
    refresh();
    setInterval(refresh, REFRESH_MS);
    return true;
  };

  if(tryStart()) return;

  const waitId = setInterval(() => {
    if(tryStart()) clearInterval(waitId);
  }, WAIT_MS);
}

export default initOrbs;
