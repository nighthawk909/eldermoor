/* =====================================================================
   ELDERMOOR - magic tab module (MG1-4). Owns the "Magic" spellbook panel
   via the HUD tab registry hook: window.EMTABS['magic'] = (panel, state).

   Renders a standard OSRS-style spellbook grid of ORIGINAL spells (names
   our own, roles mapped to the familiar early-2000s register: strike/bolt
   combat tiers, a curse, teleports). Each spell carries a Magic level
   requirement and a rune cost.

   A spell cell is GREYED (inert) when EITHER the player\'s Magic level is
   below the requirement OR the required runes are not all present in the
   inventory. Magic level is derived from state.getSkillXp()['magic'] via
   state.levelFromXp(xp). Rune presence is checked against state.getInv()
   (array of {id,count}) by rune item id (e.g. 'air-rune','mind-rune').

   Hovering a spell shows an EMTIP tooltip: name, level req (red if unmet),
   and the rune icons + counts (red if missing). A filter footer toggles
   Combat / Teleport / All.

   Conventions matched: ES module exporting initMagicTab(); idempotent;
   window.EMTABS['magic'] = (panel, state) => {...}; reads HUD state through
   the passed `state` object (falls back to window.EMHUD); uses window.EMTIP
   for hover tooltips; never mutates other modules' state. Self-contained CSS.
   main.js invokes initMagicTab() once.
   ===================================================================== */
export function initMagicTab(){
  if(typeof window === 'undefined') return;
  if(window.__emMagicInit) return;          // idempotent - main.js should call once
  window.__emMagicInit = true;

  /* --------------------------------------------------------- rune catalogue */
  // Original rune set in the classic register. icon = emoji glyph (geometry
  // textures come later); name used in tooltips.
  const RUNES = {
    'air-rune':   { name: 'Air Rune',   icon: '🌀' },
    'water-rune': { name: 'Water Rune', icon: '💧' },
    'earth-rune': { name: 'Earth Rune', icon: '🪨' },
    'fire-rune':  { name: 'Fire Rune',  icon: '🔥' },
    'mind-rune':  { name: 'Mind Rune',  icon: '🟡' },
    'body-rune':  { name: 'Body Rune',  icon: '🟢' },
    'chaos-rune': { name: 'Chaos Rune', icon: '🟣' },
    'death-rune': { name: 'Death Rune', icon: '💀' },
    'law-rune':   { name: 'Law Rune',   icon: '⚖️' },
    'cosmic-rune':{ name: 'Cosmic Rune',icon: '✨' }
  };

  /* --------------------------------------------------------- spellbook data */
  // ORIGINAL names; roles map to the familiar OSRS slots. cost: { runeId: n }.
  // cat: 'combat' | 'teleport' | 'utility'. The lvl-1 combat opener is
  // "Gale Bolt" (our Wind Strike). ~12 spells total across strike/bolt tiers,
  // a curse, and teleports.
  const SPELLS = [
    { id:'gale-bolt',      name:'Gale Bolt',        icon:'🌬️', lvl:1,  cat:'combat',
      cost:{ 'air-rune':1, 'mind-rune':1 }, role:'Wind Strike' },
    { id:'spring-lance',   name:'Spring Lance',     icon:'💦', lvl:5,  cat:'combat',
      cost:{ 'water-rune':1, 'air-rune':1, 'mind-rune':1 }, role:'Water Strike' },
    { id:'stone-jab',      name:'Stone Jab',        icon:'🪨', lvl:9,  cat:'combat',
      cost:{ 'earth-rune':2, 'air-rune':1, 'mind-rune':1 }, role:'Earth Strike' },
    { id:'ember-spit',     name:'Ember Spit',       icon:'🔥', lvl:13, cat:'combat',
      cost:{ 'fire-rune':3, 'air-rune':2, 'mind-rune':1 }, role:'Fire Strike' },
    { id:'hex-of-frailty', name:'Hex of Frailty',   icon:'🩸', lvl:19, cat:'utility',
      cost:{ 'water-rune':2, 'body-rune':1 }, role:'Confuse (curse)' },
    { id:'gale-shard',     name:'Gale Shard',       icon:'🌪️', lvl:17, cat:'combat',
      cost:{ 'air-rune':2, 'chaos-rune':1 }, role:'Wind Bolt' },
    { id:'spring-shard',   name:'Spring Shard',     icon:'🌊', lvl:23, cat:'combat',
      cost:{ 'water-rune':2, 'air-rune':2, 'chaos-rune':1 }, role:'Water Bolt' },
    { id:'stone-shard',    name:'Stone Shard',      icon:'⛰️', lvl:29, cat:'combat',
      cost:{ 'earth-rune':3, 'air-rune':2, 'chaos-rune':1 }, role:'Earth Bolt' },
    { id:'ember-shard',    name:'Ember Shard',      icon:'☄️', lvl:35, cat:'combat',
      cost:{ 'fire-rune':4, 'air-rune':3, 'chaos-rune':1 }, role:'Fire Bolt' },
    { id:'mire-snare',     name:'Mire Snare',       icon:'🕸️', lvl:31, cat:'utility',
      cost:{ 'earth-rune':3, 'water-rune':3, 'nature-omitted':0 }, role:'Bind' },
    { id:'hearthward',     name:'Hearthward',       icon:'🏠', lvl:25, cat:'teleport',
      cost:{ 'air-rune':3, 'fire-rune':1, 'law-rune':1 }, role:'Home Teleport' },
    { id:'moorgate-step',  name:'Moorgate Step',    icon:'🗺️', lvl:45, cat:'teleport',
      cost:{ 'air-rune':5, 'fire-rune':1, 'law-rune':1 }, role:'City Teleport' }
  ];

  /* --------------------------------------------------------- state accessors */
  // Resolve the HUD state object (the `state` arg passed to the EMTABS hook,
  // falling back to the global). All reads are defensive - the HUD may not be
  // fully wired when a render is requested.
  function hud(state){ return state || window.EMHUD || null; }

  function magicLevel(state){
    const h = hud(state);
    if(!h || typeof h.getSkillXp !== 'function' || typeof h.levelFromXp !== 'function') return 1;
    try {
      const xp = h.getSkillXp() || {};
      return h.levelFromXp(xp['magic'] || 0) || 1;
    } catch(_){ return 1; }
  }

  // Map of rune id -> count currently held.
  function runeCounts(state){
    const h = hud(state);
    const out = {};
    if(!h || typeof h.getInv !== 'function') return out;
    let inv;
    try { inv = h.getInv(); } catch(_){ inv = null; }
    if(!Array.isArray(inv)) return out;
    inv.forEach(it => {
      if(it && typeof it.id === 'string') out[it.id] = (out[it.id] || 0) + (it.count || 0);
    });
    return out;
  }

  // Filtered, normalised cost: drop placeholder/zero entries.
  function spellCost(sp){
    const out = {};
    const c = sp && sp.cost ? sp.cost : {};
    for(const k in c){ if(c[k] > 0 && RUNES[k]) out[k] = c[k]; }
    return out;
  }

  // True if every required rune is present in sufficient quantity.
  function hasRunes(sp, counts){
    const cost = spellCost(sp);
    for(const id in cost){ if((counts[id] || 0) < cost[id]) return false; }
    return true;
  }

  /* --------------------------------------------------------- one-time styles */
  const css = `
  #emmag-wrap{font-family:"Trebuchet MS",sans-serif;}
  #emmag-wrap h4{margin:0 0 8px;color:#e7c64f;font-size:12px;letter-spacing:.08em;
    text-transform:uppercase;}
  .emmag-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;}
  .emmag-grid .sp{aspect-ratio:1;background:#2b2620;border:1px solid #3e3424;border-radius:5px;
    position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:1px;cursor:pointer;color:#e3d6b8;text-align:center;padding:1px;}
  .emmag-grid .sp .ic{font-size:18px;line-height:1;}
  .emmag-grid .sp .nm{font-size:7.5px;line-height:1.02;color:#cdbf98;max-width:100%;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .emmag-grid .sp .lv{position:absolute;top:1px;left:3px;font-size:8px;color:#9ad17a;opacity:.9;}
  .emmag-grid .sp:hover{border-color:#e7c64f;}
  .emmag-grid .sp.off{opacity:.4;cursor:not-allowed;filter:grayscale(1);}
  .emmag-grid .sp.off:hover{border-color:#3e3424;}
  .emmag-grid .sp.off .lv{color:#d36a5a;}
  .emmag-empty{color:#9a8c6c;font-size:12px;padding:6px 2px;}
  .emmag-foot{display:flex;gap:4px;margin-top:9px;}
  .emmag-foot button{flex:1;background:#33291a;border:1px solid #4a3a22;color:#cdbf98;
    font:600 10px/1 "Trebuchet MS",sans-serif;letter-spacing:.05em;text-transform:uppercase;
    padding:5px 4px;border-radius:4px;cursor:pointer;}
  .emmag-foot button:hover{border-color:#e7c64f;color:#f3e9cf;}
  .emmag-foot button.on{background:#5a4422;border-color:#e7c64f;color:#ffe9b0;}
  /* tooltip internals (rendered inside EMTIP) */
  .emmag-tip-name{color:#ffd86a;font-weight:700;}
  .emmag-tip-role{color:#8f8266;font-size:10px;}
  .emmag-tip-lvl{font-size:11px;}
  .emmag-tip-lvl.ok{color:#9ad17a;}
  .emmag-tip-lvl.bad{color:#d36a5a;}
  .emmag-tip-runes{margin-top:3px;display:flex;flex-wrap:wrap;gap:6px;}
  .emmag-tip-runes .r{font-size:11px;color:#cdbf98;}
  .emmag-tip-runes .r.miss{color:#d36a5a;}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* --------------------------------------------------------- tooltip builder */
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Build the hover tooltip HTML for a spell given live level + rune counts.
  function tipHtml(sp, level, counts){
    const meets = level >= sp.lvl;
    const cost = spellCost(sp);
    const runeBits = Object.keys(cost).map(id => {
      const r = RUNES[id];
      const have = counts[id] || 0;
      const miss = have < cost[id];
      return `<span class="r${miss?' miss':''}">${r.icon} ${cost[id]}× ${esc(r.name)}</span>`;
    }).join('');
    return `<div class="emmag-tip-name">${esc(sp.name)}</div>`
      + `<div class="emmag-tip-role">${esc(sp.role || '')}</div>`
      + `<div class="emmag-tip-lvl ${meets?'ok':'bad'}">Magic level ${sp.lvl}`
      + `${meets?'':' (you are '+level+')'}</div>`
      + `<div class="emmag-tip-runes">${runeBits || '<span class="r">No runes.</span>'}</div>`;
  }

  /* --------------------------------------------------------- grid rendering */
  let curFilter = 'all';   // 'combat' | 'teleport' | 'all' (sticky across renders)
  const detachers = [];    // EMTIP detach fns for the currently rendered cells

  function clearTips(){
    while(detachers.length){ const d = detachers.pop(); try { if(typeof d==='function') d(); } catch(_){} }
  }

  function visibleSpells(){
    if(curFilter === 'combat')   return SPELLS.filter(s => s.cat === 'combat');
    if(curFilter === 'teleport') return SPELLS.filter(s => s.cat === 'teleport');
    return SPELLS.slice();
  }

  function renderInto(panel, state){
    clearTips();
    const level = magicLevel(state);
    const counts = runeCounts(state);
    const list = visibleSpells();

    const cells = list.map(sp => {
      const meets = level >= sp.lvl;
      const runed = hasRunes(sp, counts);
      const off = !meets || !runed;
      return `<div class="sp${off?' off':''}" data-id="${sp.id}">`
        + `<span class="lv">${sp.lvl}</span>`
        + `<span class="ic">${sp.icon || '✦'}</span>`
        + `<span class="nm">${esc(sp.name)}</span></div>`;
    }).join('');

    const grid = list.length
      ? `<div class="emmag-grid">${cells}</div>`
      : `<div class="emmag-empty">No spells in this filter.</div>`;

    const foot = `<div class="emmag-foot">`
      + `<button data-f="combat"${curFilter==='combat'?' class="on"':''}>Combat</button>`
      + `<button data-f="teleport"${curFilter==='teleport'?' class="on"':''}>Teleport</button>`
      + `<button data-f="all"${curFilter==='all'?' class="on"':''}>All</button>`
      + `</div>`;

    panel.innerHTML = `<div id="emmag-wrap"><h4>Spellbook</h4>${grid}${foot}</div>`;

    // wire tooltips (live-resolved on hover so level/runes are always current)
    if(window.EMTIP && typeof EMTIP.attach === 'function'){
      panel.querySelectorAll('.emmag-grid .sp[data-id]').forEach(el => {
        const sp = SPELLS.find(s => s.id === el.dataset.id);
        if(!sp) return;
        const detach = EMTIP.attach(el, () =>
          tipHtml(sp, magicLevel(state), runeCounts(state)));
        if(typeof detach === 'function') detachers.push(detach);
      });
    }

    // filter footer - re-render in place, preserving the chosen filter
    panel.querySelectorAll('.emmag-foot button[data-f]').forEach(btn => {
      btn.onclick = () => {
        const f = btn.dataset.f;
        if(f === 'combat' || f === 'teleport' || f === 'all'){
          curFilter = f;
          renderInto(panel, state);
        }
      };
    });
  }

  /* ---------------------------------------------- TAB REGISTRY HOOK (EMTABS) */
  // Renders into the HUD\'s shared panel when the 'magic' tab is shown. This
  // overrides the HUD\'s built-in placeholder (hud.js checks EMTABS first).
  window.EMTABS = window.EMTABS || {};
  window.EMTABS['magic'] = (panel, state) => {
    if(!panel) return;
    renderInto(panel, state);
  };

  /* --------------------------------------------------------- public: EMMAGIC */
  // Lightweight introspection surface (read-only) for other modules/tests.
  window.EMMAGIC = {
    spells: () => SPELLS.slice(),
    runes:  () => Object.assign({}, RUNES),
    filter: () => curFilter,
    // True if the spell is castable right now (level + runes met).
    canCast: (id, state) => {
      const sp = SPELLS.find(s => s.id === id);
      if(!sp) return false;
      return magicLevel(state) >= sp.lvl && hasRunes(sp, runeCounts(state));
    }
  };
}
