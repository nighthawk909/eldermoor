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
  .emmag-grid .sp.casting{border-color:#b0e0ff;box-shadow:0 0 6px #4ac8ff;animation:emmagPulse .7s infinite alternate;}
  @keyframes emmagPulse{from{box-shadow:0 0 4px #4ac8ff;}to{box-shadow:0 0 12px #9ee8ff;}}
  #emmag-castbar{margin-top:6px;padding:5px 7px;background:#1a2a38;border:1px solid #4ac8ff;
    border-radius:4px;color:#9ee8ff;font-size:10px;text-align:center;letter-spacing:.04em;}
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

  /* --------------------------------------------------------- cast-target state */
  // When the player clicks a castable combat spell, pendingCast is set to that
  // spell. The next mob click is then consumed as a magic attack: runes are
  // removed, XP awarded, damage applied, and a bolt projectile fired.
  // cancelCast() clears the mode (Escape, or clicking something other than a mob).
  let pendingCast = null;          // { sp } | null
  let _savedAttack = null;         // original EMCOMBAT.attack while intercepting

  // CSS cursor hint applied to <body> while targeting.
  const CURSOR_CAST = 'crosshair';

  function cancelCast(){
    if(!pendingCast) return;
    pendingCast = null;
    // restore the original EMCOMBAT.attack we wrapped
    if(window.EMCOMBAT && typeof _savedAttack === 'function'){
      window.EMCOMBAT.attack = _savedAttack;
    }
    _savedAttack = null;
    if(typeof document !== 'undefined') document.body.style.cursor = '';
    // refresh the panel visuals to remove the casting highlight
    _rerender();
  }

  // Track the most recently rendered (panel, state) so cancelCast can re-render.
  let _lastPanel = null;
  let _lastState = null;
  function _rerender(){ if(_lastPanel) renderInto(_lastPanel, _lastState); }

  /* ------------------------------------------------ magic projectile (bolt) */
  // A coloured orb that arcs from the player to the mob, then calls onArrive().
  // Falls back to immediate delivery when THREE / scene are unavailable.
  function fireMagicBolt(colour, onArrive){
    const THREE = (typeof window !== 'undefined') ? window.THREE : undefined;
    const scene = THREE
      ? (window.EMSCENE || (window.EMENGINE && window.EMENGINE.scene) || null)
      : null;
    const mob   = pendingCast && pendingCast._mob ? pendingCast._mob : null;
    const pp    = (typeof window !== 'undefined')
      ? (window.EMPLAYERPOS || (window.EMPLAYER && window.EMPLAYER.pos) || null)
      : null;

    if(!THREE || !scene || !mob){
      if(typeof onArrive === 'function') onArrive();
      return;
    }

    // anchor helpers (mirrors combat.js mobAnchor)
    function mobAnchorLocal(m){
      const o = m.group || m.mesh || (m.position ? m : null);
      if(o && o.position) return { x:o.position.x, y:(o.position.y||0)+1.8, z:o.position.z };
      return { x:m.x||0, y:1.8, z:m.z||0 };
    }

    const from = { x: pp ? pp.x : 0,
                   y: pp ? ((typeof pp.y === 'number' ? pp.y : 0) + 1.4) : 1.4,
                   z: pp ? pp.z : 0 };
    const to   = mobAnchorLocal(mob);

    // small glowing orb canvas
    const S = 24;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const grad = ctx.createRadialGradient(S/2, S/2, 2, S/2, S/2, S/2 - 1);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, colour);
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(S/2, S/2, S/2 - 1, 0, Math.PI * 2); ctx.fill();

    const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
    const spr = new THREE.Sprite(
      new THREE.SpriteMaterial({ map:tex, transparent:true, depthTest:false }));
    spr.scale.set(0.32, 0.32, 1);
    spr.renderOrder = 1004;
    spr.position.set(from.x, from.y, from.z);
    scene.add(spr);

    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const dur  = Math.max(120, Math.min(500, dist * 70));
    const born = (typeof performance !== 'undefined') ? performance.now() : Date.now();

    (function step(){
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      const t   = Math.min(1, (now - born) / dur);
      spr.position.set(from.x + dx*t, from.y + dy*t, from.z + dz*t);
      if(t < 1){ requestAnimationFrame(step); return; }
      scene.remove(spr);
      if(tex.dispose)          tex.dispose();
      if(spr.material.dispose) spr.material.dispose();
      if(typeof onArrive === 'function') onArrive();
    })();
  }

  /* ---------------------------------------------- rune consumption ---------- */
  // Deduct cost runes from EMHUD inventory. Mutates the live inv array entries
  // (EMHUD exposes no takeItem; we reduce counts and splice empties ourselves).
  function consumeRunes(sp){
    const h = (typeof window !== 'undefined') ? window.EMHUD : null;
    if(!h || typeof h.getInv !== 'function') return;
    let inv;
    try { inv = h.getInv(); } catch(_){ inv = null; }
    if(!Array.isArray(inv)) return;
    const cost = spellCost(sp);
    for(const runeId in cost){
      let needed = cost[runeId];
      for(let i = inv.length - 1; i >= 0 && needed > 0; i--){
        const slot = inv[i];
        if(!slot || slot.id !== runeId) continue;
        const take = Math.min(slot.count, needed);
        slot.count -= take;
        needed -= take;
        if(slot.count <= 0) inv.splice(i, 1);
      }
    }
  }

  /* -------------------------------------- magic XP + damage on mob ---------- */
  // XP rates match the OSRS magic model: 2× base per damage (Magic) + 1.33× (HP).
  // Max hit scales with magic level (floors at 1).
  const MAGIC_XP_PER_DMG   = 2.0;
  const MAGIC_HP_XP_PER_DMG = 1.33;

  function magicMaxHit(magLvl){
    // simple linear: floor(level / 5) + 1, minimum 1
    return Math.max(1, Math.floor(magLvl / 5) + 1);
  }

  function awardMagicXp(dmg){
    const h = (typeof window !== 'undefined') ? window.EMHUD : null;
    if(!h || typeof h.addXp !== 'function' || dmg <= 0) return;
    h.addXp('magic',      Math.round(dmg * MAGIC_XP_PER_DMG    * 10) / 10);
    h.addXp('hitpoints',  Math.round(dmg * MAGIC_HP_XP_PER_DMG * 10) / 10);
  }

  // Colour of the magic bolt by element (derived from spell id prefix).
  function spellColour(sp){
    const id = sp ? sp.id : '';
    if(id.indexOf('ember') === 0 || id.indexOf('fire')  !== -1) return '#ff6030';
    if(id.indexOf('spring') === 0|| id.indexOf('water') !== -1) return '#40c8ff';
    if(id.indexOf('stone') === 0 || id.indexOf('earth') !== -1) return '#a0d060';
    return '#c0a0ff'; // default: arcane purple
  }

  /* ------------------------------------------------ execute the cast -------- */
  // Called once a mob target has been selected. Consumes runes, fires the bolt,
  // then on landing applies damage + hitsplat + XP via EMCOMBAT helpers.
  function executeCast(sp, mob){
    const magLvl  = magicLevel(null);
    const maxHit  = magicMaxHit(magLvl);
    const dmg     = Math.floor(Math.random() * (maxHit + 1));
    const colour  = spellColour(sp);
    const h       = (typeof window !== 'undefined') ? window.EMHUD   : null;
    const ec      = (typeof window !== 'undefined') ? window.EMCOMBAT : null;

    // announce
    if(h && typeof h.addChat === 'function'){
      h.addChat('You cast ' + sp.name + ' at the ' + (mob.name || 'creature') + '.', '', true);
    }

    // consume runes now (before bolt lands - OSRS behaviour)
    consumeRunes(sp);

    // stash the mob on the pending cast for fireMagicBolt to anchor the sprite
    if(pendingCast) pendingCast._mob = mob;

    fireMagicBolt(colour, function(){
      // bolt landed - apply damage
      if(dmg > 0){
        // reduce mob HP directly (mirrors combat.js approach)
        if(mob.hp == null) mob.hp = mob.maxHp || 1;
        mob.hp = Math.max(0, mob.hp - dmg);
      }
      // show hitsplat: try EMCOMBAT internal or fall back to a local canvas splat
      applyHitsplat(mob, dmg);
      // award magic XP
      awardMagicXp(dmg);
      // trigger mob death path if HP hit zero (uses EMCOMBAT.attack to engage
      // so the existing kill/respawn/drop logic fires)
      if(mob.hp <= 0){
        // kill flow lives inside combat\'s attack loop; the cheapest honest hook
        // is to set hp=0 and then start an attack so the first tick fires killMob.
        if(ec && typeof ec.attack === 'function') ec.attack(mob);
      } else if(dmg > 0){
        // mob is still alive: keep the retaliation chain going via EMCOMBAT.attack
        if(ec && typeof ec.attack === 'function') ec.attack(mob);
      }
      // chat feedback on zero hit
      if(dmg === 0 && h && typeof h.addChat === 'function'){
        h.addChat(sp.name + ' splashes! (0 damage)', '', true);
      }
    });
  }

  /* quick hitsplat helper: delegates to EMCOMBAT internals via a scratch mob
     attack then cancels, OR draws a minimal canvas sprite directly if the scene
     is accessible. Using the simpler direct canvas path to stay self-contained. */
  function applyHitsplat(mob, amount){
    const THREE = (typeof window !== 'undefined') ? window.THREE : undefined;
    const scene = THREE
      ? (window.EMSCENE || (window.EMENGINE && window.EMENGINE.scene) || null)
      : null;
    if(!THREE || !scene) return;

    // anchor
    const o = mob.group || mob.mesh || (mob.position ? mob : null);
    const ax = o && o.position ? o.position.x : (mob.x || 0);
    const ay = (o && o.position ? o.position.y : 0) + 1.8;
    const az = o && o.position ? o.position.z : (mob.z || 0);

    const S = 64;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const col = amount === 0 ? '#3a64c8' : '#9030c8'; // blue = zero, purple = magic
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(S/2, S/2, S/2 - 4, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)';
    const lbl = String(amount | 0);
    ctx.strokeText(lbl, S/2, S/2 + 1);
    ctx.fillText(lbl,   S/2, S/2 + 1);

    const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
    const spr = new THREE.Sprite(
      new THREE.SpriteMaterial({ map:tex, transparent:true, depthTest:false }));
    spr.scale.set(0.7, 0.7, 1);
    spr.renderOrder = 1002;
    spr.position.set(ax, ay, az);
    scene.add(spr);

    const born = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const dur  = 700;
    (function rise(){
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      const t   = (now - born) / dur;
      if(t >= 1){
        scene.remove(spr);
        if(tex.dispose)          tex.dispose();
        if(spr.material.dispose) spr.material.dispose();
        return;
      }
      spr.position.y = ay + t * 0.6;
      if(spr.material) spr.material.opacity = 1 - t;
      requestAnimationFrame(rise);
    })();
  }

  /* ----------------------------------------- intercept mob click for casting */
  // When a combat spell is clicked and pendingCast is set, we wrap
  // window.EMCOMBAT.attack with a one-shot function. interact.js calls
  // EMCOMBAT.attack(mob) for every mob click; the wrapper consumes the cast and
  // restores the original so normal melee resumes on subsequent clicks.
  function enterCastMode(sp, panel, panelState){
    // cancel any existing pending cast cleanly first
    if(pendingCast) cancelCast();

    pendingCast = { sp: sp };
    if(typeof document !== 'undefined') document.body.style.cursor = CURSOR_CAST;

    // highlight the chosen spell cell
    if(panel){
      panel.querySelectorAll('.emmag-grid .sp[data-id]').forEach(el => {
        el.classList.toggle('casting', el.dataset.id === sp.id);
      });
      // show/update the cast status bar
      let bar = panel.querySelector('#emmag-castbar');
      if(!bar){
        bar = document.createElement('div');
        bar.id = 'emmag-castbar';
        const wrap = panel.querySelector('#emmag-wrap');
        if(wrap) wrap.appendChild(bar);
      }
      bar.textContent = sp.icon + ' ' + sp.name + ' - click a target (Esc to cancel)';
    }

    // wrap EMCOMBAT.attack while it exists; re-check at click time if it was
    // initialised after this point.
    function installHook(){
      const ec = (typeof window !== 'undefined') ? window.EMCOMBAT : null;
      if(!ec || typeof ec.attack !== 'function') return false;
      _savedAttack = ec.attack;
      ec.attack = function magicInterceptAttack(mob){
        // restore original immediately (one-shot)
        ec.attack = _savedAttack;
        _savedAttack = null;
        if(typeof document !== 'undefined') document.body.style.cursor = '';
        const captured = pendingCast ? pendingCast.sp : null;
        pendingCast = null;

        if(!captured){ return; }

        // re-check castability at click-time (runes/level may have changed)
        const lvlOk   = magicLevel(panelState) >= captured.lvl;
        const runesOk = hasRunes(captured, runeCounts(panelState));
        if(!lvlOk || !runesOk){
          const hh = (typeof window !== 'undefined') ? window.EMHUD : null;
          if(hh && typeof hh.addChat === 'function')
            hh.addChat('You don\'t have the runes to cast ' + captured.name + '.', '', true);
          _rerender();
          return;
        }

        _rerender(); // drop casting highlight
        executeCast(captured, mob);
      };
      return true;
    }

    // install now if EMCOMBAT is ready, otherwise defer until first click
    if(!installHook()){
      // EMCOMBAT not yet ready: poll briefly then give up gracefully
      let tries = 0;
      const poll = setInterval(function(){
        tries++;
        if(installHook() || tries > 20) clearInterval(poll);
      }, 100);
    }

    // Escape cancels cast-target mode
    function onEsc(e){
      if(e.key === 'Escape' && pendingCast){ cancelCast(); _rerender(); }
    }
    if(typeof document !== 'undefined'){
      document.addEventListener('keydown', onEsc);
      // clean up the listener when cast resolves (either execute or cancel)
      const orig = cancelCast;
      cancelCast = function(){
        document.removeEventListener('keydown', onEsc);
        cancelCast = orig;
        orig();
      };
    }
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
    _lastPanel = panel;
    _lastState = state;
    clearTips();
    const level  = magicLevel(state);
    const counts = runeCounts(state);
    const list   = visibleSpells();
    const castId = pendingCast ? pendingCast.sp.id : null;

    const cells = list.map(sp => {
      const meets = level >= sp.lvl;
      const runed = hasRunes(sp, counts);
      const off   = !meets || !runed;
      const cast  = castId === sp.id ? ' casting' : '';
      return `<div class="sp${off?' off':''}${cast}" data-id="${sp.id}">`
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

    const castBar = castId
      ? `<div id="emmag-castbar">${esc(list.find(s=>s.id===castId)?list.find(s=>s.id===castId).icon:'') } Targeting - click a mob (Esc to cancel)</div>`
      : '';

    panel.innerHTML = `<div id="emmag-wrap"><h4>Spellbook</h4>${grid}${castBar}${foot}</div>`;

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

    // spell cell clicks: castable combat spells enter cast-target mode
    panel.querySelectorAll('.emmag-grid .sp[data-id]:not(.off)').forEach(el => {
      el.onclick = () => {
        const sp = SPELLS.find(s => s.id === el.dataset.id);
        if(!sp) return;
        if(sp.cat === 'combat'){
          // toggle off if clicking the already-pending spell
          if(pendingCast && pendingCast.sp.id === sp.id){ cancelCast(); _rerender(); return; }
          enterCastMode(sp, panel, state);
        }
        // teleport / utility: no-op for now (future task)
      };
    });

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
  // Renders into the HUD\'s shared panel when the \'magic\' tab is shown. This
  // overrides the HUD\'s built-in placeholder (hud.js checks EMTABS first).
  window.EMTABS = window.EMTABS || {};
  window.EMTABS['magic'] = (panel, state) => {
    if(!panel) return;
    renderInto(panel, state);
  };

  /* --------------------------------------------------------- public: EMMAGIC */
  // Lightweight introspection surface for other modules/tests.
  window.EMMAGIC = {
    spells:      () => SPELLS.slice(),
    runes:       () => Object.assign({}, RUNES),
    filter:      () => curFilter,
    pendingCast: () => pendingCast ? Object.assign({}, pendingCast) : null,
    cancelCast,
    // True if the spell is castable right now (level + runes met).
    canCast: (id, st) => {
      const sp = SPELLS.find(s => s.id === id);
      if(!sp) return false;
      return magicLevel(st) >= sp.lvl && hasRunes(sp, runeCounts(st));
    }
  };
}
