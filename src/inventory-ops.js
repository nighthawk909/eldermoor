/* =====================================================================
   ELDERMOOR - Inventory item interactions (INV1-4 / INV+1 / INV+2 / USE-ON).

   OSRS-style right-click option menu on inventory slots. Self-contained:
   reads the bag + item definitions through window.EMHUD, builds an option
   menu from each item\'s `verbs`, and routes the chosen op:

     Wield / Wear  -> window.EMEQUIP.equip(id)
     Eat           -> heal (addXp-free) + remove from bag
     Use           -> arm a "use cursor" for use-on (next slot OR world fixture)
     Drop          -> remove from bag
     Examine       -> print item\'s examine line to chat (always present)

   Left-click op0 is handled by the HUD itself - we only own right-click.

   Uses DOCUMENT-LEVEL EVENT DELEGATION on `.eminv .s[data-i]` so it never
   touches hud.js and survives every HUD re-render. No-ops gracefully when
   EMHUD is absent. Owns its own menu DOM + CSS.

   ---- Use-on (item-on-item / item-on-fixture) ----
   Tapping "Use" on a bag slot arms a use cursor ("Use <item> with..."). The
   next tap resolves the combination:
     - tap another inventory slot  -> item+item combo (assets/data/useon.json
       `itemPairs`, matched either direction)
     - tap the 3D world (canvas #c) -> item+fixture combo (`itemFixture`),
       matched by the fixture *verb* interact.js already assigns fixtures
       (Cook/Smelt/Smith - see world.js FIXTURE_DESC). We never re-implement
       3D picking here: we read interact.js\'s existing #hoverLabel element
       (already kept live on pointermove with the exact verb+name under the
       cursor) at click time, which stays perfectly in sync with the real
       raycast without importing interact.js or touching its picking code.
   Recipes are fully data-driven (assets/data/useon.json, self-fetched once,
   lazily, same pattern as prayer-tab.js/music-engine.js). Fixture recipes
   that map to an existing skilling action (light/cook/smelt/smith) are
   routed through window.EMSKILL so we never duplicate that engine\'s success
   rolls/xp/consumption; recipes with no skilling counterpart (e.g. the plain
   item+item flour+water -> dough) are applied directly here via EMHUD.
   Unknown combinations always print "Nothing interesting happens." Fully
   defensive: no-ops when EMHUD/EMSKILL/fetch are unavailable.

   main.js calls initInvOps() once.
   ===================================================================== */

const MENU_ID = 'eminv-ctx';
const STYLE_ID = 'eminv-ctx-css';
const USEON_URL = 'assets/data/useon.json';

// ---------- useon.json recipes (module-level: fetched once, lazily, shared
// across re-inits since initInvOps() is idempotent anyway) --------------
let useonData = null;      // { itemPairs:[...], itemFixture:[...] } once loaded
let useonPromise = null;
function loadUseon(){
  if(useonData) return Promise.resolve(useonData);
  if(useonPromise) return useonPromise;
  if(typeof fetch !== 'function'){ useonData = { itemPairs: [], itemFixture: [] }; return Promise.resolve(useonData); }
  useonPromise = fetch(USEON_URL)
    .then(r => r.ok ? r.json() : null)
    .then(j => { useonData = (j && typeof j === 'object') ? j : { itemPairs: [], itemFixture: [] };
      if(!Array.isArray(useonData.itemPairs)) useonData.itemPairs = [];
      if(!Array.isArray(useonData.itemFixture)) useonData.itemFixture = [];
      return useonData; })
    .catch(() => { useonData = { itemPairs: [], itemFixture: [] }; return useonData; });
  return useonPromise;
}

export function initInvOps(){
  if(typeof document === 'undefined') return;
  // Idempotent: never wire twice.
  if(document.getElementById(MENU_ID)) return;

  injectCss();
  const menu = buildMenu();
  document.body.appendChild(menu);

  // ---- "use" cursor state: when armed, the next slot click is a use-on ----
  let useArmed = null; // { idx, id, name } or null
  let suppressClick = false; // set after a long-press opens the menu, to eat the trailing click

  // ---------- HUD access (never throws if HUD not ready) ------------------
  function hud(){
    const h = (typeof window !== 'undefined') ? window.EMHUD : null;
    return (h && typeof h.getInv === 'function' && typeof h.getItems === 'function') ? h : null;
  }
  function equipApi(){
    const e = (typeof window !== 'undefined') ? window.EMEQUIP : null;
    return (e && typeof e.equip === 'function') ? e : null;
  }
  function itemAt(h, idx){
    const inv = h.getInv() || [];
    const entry = inv[idx];
    if(!entry) return null;
    const def = (h.getItems() || {})[entry.id] || {};
    return { entry, def, id: entry.id, name: def.name || entry.id };
  }

  // ---------- option-menu model ------------------------------------------
  // Build the ordered option list for an item: its declared verbs, then a
  // synthetic Examine (always). Verbs are kept in declared order so the menu
  // mirrors OSRS (op0 on top). Drop already lives in verbs for most items;
  // we add a fallback Drop + Examine if missing so every item is droppable.
  function optionsFor(def){
    const verbs = Array.isArray(def.verbs) ? def.verbs.slice() : [];
    if(!verbs.some(v => /^drop$/i.test(v))) verbs.push('Drop');
    if(!verbs.some(v => /^examine$/i.test(v))) verbs.push('Examine');
    return verbs;
  }

  // ---------- op routing --------------------------------------------------
  function runOp(verb, idx){
    const h = hud(); if(!h) return;
    const ctx = itemAt(h, idx); if(!ctx) return;
    const v = String(verb || '').toLowerCase();

    if(v === 'wield' || v === 'wear'){
      const eq = equipApi();
      if(eq){ eq.equip(ctx.id); }
      else { h.addChat('You cannot equip that right now.', '', true); }
      // EMEQUIP refreshes the HUD itself; refresh again defensively.
      refresh(h);
      return;
    }
    if(v === 'eat' || v === 'drink'){
      const heal = (typeof ctx.def.heal === 'number') ? ctx.def.heal : 0;
      removeOne(h, idx);
      if(heal > 0){ h.addChat('You eat the ' + ctx.name + '. It heals ' + heal + ' hitpoints.', '', true); }
      else { h.addChat('You eat the ' + ctx.name + '.', '', true); }
      refresh(h);
      return;
    }
    if(v === 'use'){
      armUse(h, idx, ctx);
      return;
    }
    if(v === 'drop'){
      removeOne(h, idx);
      if(window.EMGROUND && EMGROUND.drop) EMGROUND.drop(ctx.id, 1);   // spawn it on the ground (Take to pick up)
      h.addChat('You drop the ' + ctx.name + '.', '', true);
      refresh(h);
      return;
    }
    if(v === 'examine'){
      h.addChat(ctx.def.examine || ('It\'s a ' + ctx.name + '.'));
      return;
    }
    if(v === 'bury'){
      removeOne(h, idx);
      if(typeof h.addXp === 'function') h.addXp('Prayer', 5);   // OSRS-ish bones Prayer XP
      h.addChat('You dig a hole and bury the ' + ctx.name + '.', '', true);
      refresh(h);
      return;
    }
    // Unhandled verbs (Read / Empty / Open ...) - acknowledge in chat
    // so the interaction is never silent. The HUD\'s left-click handles op0;
    // here we just narrate so the menu always responds.
    h.addChat(cap(verb) + ' ' + ctx.name + '.');
  }

  // ---------- use-on (arm + resolve) -------------------------------------
  function armUse(h, idx, ctx){
    useArmed = { idx, id: ctx.id, name: ctx.name };
    document.body.classList.add('eminv-use-armed');
    h.addChat('Use ' + ctx.name + ' with...', '', true);
    loadUseon();   // kick off (or reuse) the fetch now, so it's ready by the time the player taps a target
  }
  function clearUse(){
    useArmed = null;
    document.body.classList.remove('eminv-use-armed');
  }

  // ---- item + item resolution (tap on another inventory slot) ----
  function resolveUseOn(h, targetIdx){
    const src = useArmed;
    const target = itemAt(h, targetIdx);
    clearUse();
    if(!src || !target) return;
    if(target.id === src.id && targetIdx === src.idx){
      h.addChat('Nothing interesting happens.', '', true);
      return;
    }
    loadUseon().then(data => {
      const recipe = findItemPairRecipe(data, src.id, target.id);
      if(!recipe){ h.addChat('Nothing interesting happens.', '', true); return; }
      applyItemPairRecipe(h, recipe, src, target);
    });
  }

  function findItemPairRecipe(data, aId, bId){
    const list = (data && data.itemPairs) || [];
    return list.find(r => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId)) || null;
  }

  function applyItemPairRecipe(h, recipe, src, target){
    // consume both sides (order-independent): whichever of src/target matches a vs b
    const consumeSrc = (recipe.a === src.id) ? recipe.consumeA !== false : recipe.consumeB !== false;
    const consumeTarget = (recipe.a === target.id) ? recipe.consumeA !== false : recipe.consumeB !== false;
    if(consumeSrc) removeById(h, src.id);
    if(consumeTarget) removeById(h, target.id);
    if(recipe.result) h.giveItem(recipe.result, 1);
    if(recipe.xp && recipe.xp.skill && typeof h.addXp === 'function') h.addXp(recipe.xp.skill, recipe.xp.amount || 0);
    h.addChat(recipe.message || 'Nothing interesting happens.', '', true);
    if(recipe.flag) dispatchFlag(recipe.flag);
    refresh(h);
  }

  // remove the FIRST bag slot matching this item id (mirrors removeOne's stack-aware logic)
  function removeById(h, id){
    const inv = h.getInv();
    if(!Array.isArray(inv)) return;
    const idx = inv.findIndex(e => e && e.id === id);
    if(idx >= 0) removeOne(h, idx);
  }

  function dispatchFlag(flag){
    try { window.dispatchEvent(new CustomEvent('em-flag', { detail: flag })); } catch(e){ /* no-op if unsupported */ }
  }

  // ---- item + fixture resolution (tap the 3D world while a use is armed) ----
  // We never re-implement 3D picking: interact.js already maintains a live
  // #hoverLabel DOM element (verb + name text, refreshed on pointermove) that
  // mirrors its own raycast exactly. Reading it at click time on the canvas
  // gives us the same target interact.js would have engaged, with zero
  // coupling to its module internals.
  function currentHoverTarget(){
    const el = document.getElementById('hoverLabel');
    if(!el || el.style.display === 'none' || !el.textContent) return null;
    const verbEl = el.querySelector('span');
    const verb = verbEl ? verbEl.textContent.trim() : '';
    const name = el.textContent.replace(verb, '').trim();
    if(!verb) return null;
    return { verb, name };
  }

  function findFixtureRecipe(data, itemId, verb){
    const list = (data && data.itemFixture) || [];
    const v = String(verb || '').toLowerCase();
    return list.find(r => r.item === itemId && (!r.fixtureVerb || String(r.fixtureVerb).toLowerCase() === v)) || null;
  }
  // fallback: an itemFixture recipe with NO fixtureVerb at all is a "use this
  // item on its required companion item" combo that doesn't need a fixture in
  // range yet (e.g. lighting logs the very first time, before any fire exists).
  function findFixtureFreeRecipe(data, itemId){
    const list = (data && data.itemFixture) || [];
    return list.find(r => r.item === itemId && !r.fixtureVerb) || null;
  }

  function runFixtureRecipe(h, recipe, itemName){
    if(recipe.requiresItem && !hasItemId(h, recipe.requiresItem)){
      h.addChat('You need ' + (itemsDefName(h, recipe.requiresItem)) + ' as well.', '', true);
      return;
    }
    if(recipe.message) h.addChat(recipe.message, '', true);
    const skillApi = (typeof window !== 'undefined') ? window.EMSKILL : null;
    if(recipe.skill && recipe.skill.action && skillApi && typeof skillApi[recipe.skill.action] === 'function'){
      // route through the existing skilling engine (light/cook/smelt/smith) -
      // it owns success rolls, xp, and consuming the matched ingredients itself.
      skillApi[recipe.skill.action]();
      if(recipe.flag) dispatchFlag(recipe.flag);
      return;
    }
    // no skilling counterpart - apply the recipe directly (consume + grant + xp)
    if(recipe.consumeItem) removeById(h, recipe.item);
    if(recipe.consumeRequires && recipe.requiresItem) removeById(h, recipe.requiresItem);
    if(recipe.result) h.giveItem(recipe.result, 1);
    if(recipe.xp && recipe.xp.skill && typeof h.addXp === 'function') h.addXp(recipe.xp.skill, recipe.xp.amount || 0);
    if(recipe.flag) dispatchFlag(recipe.flag);
    refresh(h);
  }

  function hasItemId(h, id){
    const inv = h.getInv() || [];
    return !!inv.find(e => e && e.id === id);
  }
  function itemsDefName(h, id){
    const def = (h.getItems() || {})[id];
    return (def && def.name) || id;
  }

  // called on a canvas click while a use is armed (see canvas wiring below)
  function resolveUseOnWorld(h){
    const src = useArmed;
    clearUse();
    if(!src) return;
    const hover = currentHoverTarget();
    loadUseon().then(data => {
      // 1) try a fixture-verb match against whatever's under the cursor
      const byFixture = hover ? findFixtureRecipe(data, src.id, hover.verb) : null;
      if(byFixture){ runFixtureRecipe(h, byFixture, src.name); return; }
      // 2) fall back to a fixture-free recipe (no fixture required, e.g. first light)
      const free = findFixtureFreeRecipe(data, src.id);
      if(free){ runFixtureRecipe(h, free, src.name); return; }
      h.addChat('Nothing interesting happens.', '', true);
    });
  }

  // ---------- bag mutation (immutable-friendly: edit the live array in place
  // only because the HUD owns it; we never reassign its identity) ----------
  function removeOne(h, idx){
    const inv = h.getInv();
    if(!Array.isArray(inv) || idx < 0 || idx >= inv.length) return;
    const entry = inv[idx];
    if(!entry) return;
    if(typeof entry.count === 'number' && entry.count > 1){
      inv[idx] = { id: entry.id, count: entry.count - 1 };
    } else {
      inv.splice(idx, 1);
    }
  }
  function refresh(h){ if(typeof h.refresh === 'function') h.refresh(); }

  // ---------- menu DOM ----------------------------------------------------
  function openMenu(idx, x, y){
    const h = hud(); if(!h) return;
    const ctx = itemAt(h, idx); if(!ctx) return;
    const opts = optionsFor(ctx.def);
    menu.innerHTML =
      '<div class="eminv-ctx-h">' + escapeHtml(ctx.name) + '</div>' +
      opts.map(v =>
        '<button type="button" class="eminv-ctx-o" data-verb="' + escapeHtml(v) + '">' +
        escapeHtml(v) + ' <span class="eminv-ctx-it">' + escapeHtml(ctx.name) + '</span></button>'
      ).join('');
    menu.querySelectorAll('button[data-verb]').forEach(b => {
      b.onclick = () => { hideMenu(); runOp(b.dataset.verb, idx); };
    });
    // Position, clamped to viewport.
    menu.style.display = 'block';
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    menu.style.left = Math.max(2, Math.min(x, vw - mw - 4)) + 'px';
    menu.style.top  = Math.max(2, Math.min(y, vh - mh - 4)) + 'px';
  }
  function hideMenu(){ menu.style.display = 'none'; menu.innerHTML = ''; }
  function menuOpen(){ return menu.style.display === 'block'; }

  // ---------- delegated listeners (document level) ------------------------
  function slotFrom(target){
    if(!target || !target.closest) return null;
    const el = target.closest('.eminv .s[data-i]');
    if(!el) return null;
    const idx = parseInt(el.dataset.i, 10);
    return Number.isNaN(idx) ? null : idx;
  }

  document.addEventListener('contextmenu', (e) => {
    const idx = slotFrom(e.target);
    if(idx === null) return;
    e.preventDefault();
    openMenu(idx, e.clientX, e.clientY);
  });

  // ---- touch / pointer LONG-PRESS -> open the same option menu (mobile parity).
  // Desktop long-press also works; the trailing click is suppressed so the HUD's
  // op0 doesn't fire underneath the menu we just opened. ----
  const LP_MS = 420, LP_MOVE = 12;
  let lpTimer = null, lpStart = null, lpIdx = null;
  function cancelLongPress(){ if(lpTimer){ clearTimeout(lpTimer); lpTimer = null; } lpIdx = null; lpStart = null; }
  document.addEventListener('pointerdown', (e) => {
    const idx = slotFrom(e.target);
    if(idx === null) return;
    lpIdx = idx; lpStart = { x: e.clientX, y: e.clientY };
    lpTimer = setTimeout(() => {
      lpTimer = null;
      if(lpIdx === null || !lpStart) return;
      suppressClick = true;                                  // eat the click that follows the release
      try { if(window.EMHAPTIC && window.EMHAPTIC.open) window.EMHAPTIC.open(); } catch(_){}
      openMenu(lpIdx, lpStart.x, lpStart.y);
    }, LP_MS);
  }, { passive: true });
  document.addEventListener('pointermove', (e) => {
    if(lpStart && (Math.abs(e.clientX - lpStart.x) > LP_MOVE || Math.abs(e.clientY - lpStart.y) > LP_MOVE)) cancelLongPress();
  }, { passive: true });
  document.addEventListener('pointerup', cancelLongPress, { passive: true });
  document.addEventListener('pointercancel', cancelLongPress, { passive: true });

  // Left-click while a Use is armed = use-on the clicked slot (item+item) OR,
  // if the click landed on the 3D game canvas, use-on-world (item+fixture).
  // We run this in the CAPTURE phase so we intercept before the HUD\'s own
  // op0 onclick fires (for slots) or the canvas\'s own worldClick (interact.js).
  document.addEventListener('click', (e) => {
    if(suppressClick){ suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }  // long-press just opened the menu
    if(menuOpen() && !menu.contains(e.target)) hideMenu();
    if(!useArmed) return;
    const idx = slotFrom(e.target);
    if(idx !== null){
      e.preventDefault();
      e.stopPropagation();
      const h = hud(); if(h) resolveUseOn(h, idx);
      return;
    }
    if(e.target && e.target.id === 'c'){          // the game canvas (engine.js: document.getElementById('c'))
      e.preventDefault();
      e.stopPropagation();
      const h = hud(); if(h) resolveUseOnWorld(h);
      return;
    }
    clearUse(); // clicked off the bag and off the world canvas -> cancel
  }, true);

  // Public API: the HUD routes a left-click / tap through the REAL op0 action
  // (Wield equips, Eat eats, Use arms use-on, Examine prints, ...) so a tap is
  // never a no-op. Also expose the menu opener.
  window.EMINVOPS = {
    defaultAction(idx){
      const h = hud(); if(!h) return;
      const ctx = itemAt(h, idx); if(!ctx) return;
      const verbs = (Array.isArray(ctx.def.verbs) && ctx.def.verbs.length) ? ctx.def.verbs : ['Use'];
      try { if(window.EMHAPTIC && window.EMHAPTIC.tap) window.EMHAPTIC.tap(); } catch(_){}
      runOp(verbs[0], idx);
    },
    openMenu(idx, x, y){ openMenu(idx, x, y); }
  };

  // Dismiss menu / cancel use on Escape or scroll.
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ hideMenu(); clearUse(); }
  });
  window.addEventListener('blur', () => { hideMenu(); });
  document.addEventListener('scroll', () => { hideMenu(); }, true);
}

// ---------- DOM / CSS construction (module-private) ----------------------
function buildMenu(){
  const m = document.createElement('div');
  m.id = MENU_ID;
  m.style.display = 'none';
  return m;
}

function injectCss(){
  if(document.getElementById(STYLE_ID)) return;
  const css = `
  #${MENU_ID}{position:fixed;z-index:60;min-width:132px;display:none;
    background:linear-gradient(#3a2e1f,#241c12);border:2px solid #5a4a2a;border-radius:5px;
    box-shadow:0 6px 22px #000b;padding:3px;font-family:"Trebuchet MS",sans-serif;}
  #${MENU_ID} .eminv-ctx-h{color:#e7c64f;font-size:10px;letter-spacing:.08em;text-transform:uppercase;
    padding:3px 7px 4px;border-bottom:1px solid #4a3a26;margin-bottom:3px;}
  #${MENU_ID} .eminv-ctx-o{display:block;width:100%;text-align:left;background:transparent;color:#e3d6b8;
    border:0;border-radius:3px;padding:5px 8px;font-size:12px;cursor:pointer;line-height:1.1;}
  #${MENU_ID} .eminv-ctx-o:hover{background:#5a4422;color:#fff;}
  #${MENU_ID} .eminv-ctx-it{color:#9fb8d8;}
  body.eminv-use-armed{cursor:crosshair;}
  body.eminv-use-armed .eminv .s[data-i]{outline:1px dashed #e7c64f;outline-offset:-2px;}
  `;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = css;
  document.head.appendChild(st);
}

// ---------- small string helpers ----------------------------------------
function cap(s){ s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
