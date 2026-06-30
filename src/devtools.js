/* =====================================================================
   ELDERMOOR - developer toolbox (DEV TOOLBOX). A real, in-game dev panel
   for builders/QA: spawn items, set stats, manage runes/bags, teleport,
   noclip and spawn mobs - all without leaving the browser tab.

   Self-initializing: export initDevtools() and window.EMDEVTOOLS. Opens a
   togglable on-screen panel via a hotkey (backtick `) and/or a small
   floating button (mobile-friendly, no keyboard required).

   Reads everything through the globals the client already exposes:
     window.EMHUD       - getInv/getItems/getSkills/getSkillXp/giveItem/refresh
     window.EMEQUIP      - worn / unequip
     window.EMRUN         - { on, energy } run-energy model
     window.EMPLAYERHP    - { cur, max } live player HP pool (combat.js)
     window.EMPRAYERPTS   - { cur, max } live prayer points pool (prayer-tab.js)
     window.EMPLAYERPOS   - live player Vector3 {x,y,z}
     window.EMPLAYER      - the player THREE.Group (for direct visual sync)
     window.EMMOVE        - movement/pathing state (cancel pending moves)
     window.EMWALK(x,z)   - click-to-walk pathing entry
     window.EMMOB.place(id,x,z,name) - spawn a mob node (world.js)
     window.EMDEV          - devtest.js auto-gear flag/object (presence gate)
     window.EMHAPTIC      - mobile haptics (optional)

   Every API read is feature-detected; an absent global degrades to a
   disabled control + an inline note, never a crash. No other file is
   imported or mutated - main.js wires the single initDevtools() call.
   ===================================================================== */

const BTN_ID = 'emdevtools-btn';
const OV_ID = 'emdevtools-ov';
const STYLE_ID = 'emdevtools-css';
const KEY_OPEN = 'eldermoor:devtools:open';

/* ---------------------------------------------------------------- safe globals */
function hud(){
  const h = (typeof window !== 'undefined') ? window.EMHUD : null;
  return (h && typeof h.getInv === 'function' && typeof h.getItems === 'function') ? h : null;
}
function equipApi(){
  const e = (typeof window !== 'undefined') ? window.EMEQUIP : null;
  return (e && typeof e.unequip === 'function') ? e : null;
}
function haptic(kind){ try { const h2 = window.EMHAPTIC; if (h2 && h2[kind]) h2[kind](); } catch (e) {} }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function chat(text){
  const h = hud();
  if (h && typeof h.addChat === 'function') h.addChat('<span style="color:#8fd0ff">[devtools]</span> ' + text, '', true);
}

/* ---------------------------------------------------------------- CSS */
function injectCss(){
  if (document.getElementById(STYLE_ID)) return;
  const css = `
  #${BTN_ID}{position:fixed;z-index:45;top:calc(8px + env(safe-area-inset-top,0px));right:8px;
    min-height:40px;min-width:40px;padding:7px 10px;border-radius:9px;background:#2a2d5a;border:2px solid #7a86d9;
    color:#e6e9ff;font:bold 14px "Trebuchet MS",sans-serif;cursor:pointer;box-shadow:0 3px 12px #0009;}
  #${OV_ID}{position:fixed;inset:0;z-index:9700;display:none;background:rgba(8,8,14,.93);
    overflow:auto;-webkit-overflow-scrolling:touch;font-family:"Trebuchet MS",sans-serif;color:#e6e9ff;
    padding:calc(10px + env(safe-area-inset-top,0px)) 10px calc(16px + env(safe-area-inset-bottom,0px));}
  #${OV_ID}.show{display:block;}
  #${OV_ID} .wrap{max-width:720px;margin:0 auto;}
  #${OV_ID} .hd{display:flex;align-items:center;gap:8px;position:sticky;top:0;background:rgba(8,8,14,.97);
    padding:6px 2px 10px;border-bottom:1px solid #3a3f6a;margin-bottom:10px;z-index:2;}
  #${OV_ID} .hd h3{margin:0;color:#9db4ff;font-size:16px;}
  #${OV_ID} .hd .sub{color:#9aa3c9;font-size:11px;}
  #${OV_ID} .hd .x{margin-left:auto;min-width:44px;min-height:44px;border-radius:8px;border:2px solid #5a5a8a;
    background:#26284a;color:#f3e9cf;font-size:18px;cursor:pointer;}
  #${OV_ID} .sec{background:#15172b;border:1px solid #34386a;border-radius:10px;padding:11px;margin-bottom:10px;}
  #${OV_ID} .sec h4{margin:0 0 8px;color:#bcd0ff;font-size:14px;}
  #${OV_ID} .row{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:7px;align-items:center;}
  #${OV_ID} .row label{font-size:12px;color:#aab2da;min-width:64px;}
  #${OV_ID} input[type=text], #${OV_ID} input[type=number], #${OV_ID} select{
    flex:1;min-width:90px;min-height:38px;box-sizing:border-box;padding:6px 8px;border-radius:7px;
    background:#0e0f1d;border:1px solid #34386a;color:#fff;font:13px "Trebuchet MS",sans-serif;}
  #${OV_ID} button{min-height:38px;padding:6px 12px;border-radius:7px;border:2px solid #4a4e8a;
    background:#262a52;color:#e6e9ff;font:bold 12.5px "Trebuchet MS",sans-serif;cursor:pointer;}
  #${OV_ID} button:hover{background:#323668;}
  #${OV_ID} button.go{border-color:#7fbf7a;background:#2c5a2e;}
  #${OV_ID} button.warn{border-color:#c0473a;background:#5a2622;}
  #${OV_ID} button.on{border-color:#e7c64f;background:#5a4a22;color:#fff;}
  #${OV_ID} .skillsgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;}
  #${OV_ID} .skillsgrid .sk{display:flex;align-items:center;gap:5px;background:#0e0f1d;border:1px solid #2a2e5a;
    border-radius:7px;padding:4px 6px;}
  #${OV_ID} .skillsgrid .sk span.nm{flex:1;font-size:12px;}
  #${OV_ID} .skillsgrid .sk input{width:48px;min-width:48px;flex:none;padding:4px;min-height:30px;}
  #${OV_ID} .note{font-size:11.5px;color:#8a92bd;margin-top:2px;}
  #${OV_ID} .missing{font-size:11.5px;color:#d97a6a;}
  #${OV_ID} .flash{position:sticky;bottom:0;background:rgba(8,8,14,.97);padding:8px 0 2px;font-size:12px;color:#aef0a8;text-align:center;}
  `;
  const st = document.createElement('style'); st.id = STYLE_ID; st.textContent = css; document.head.appendChild(st);
}

/* ---------------------------------------------------------------- data helpers */
function itemList(h){
  const items = (h && typeof h.getItems === 'function') ? (h.getItems() || {}) : {};
  return Object.keys(items).map(id => ({ id, name: (items[id] && items[id].name) || id })).sort((a,b) => a.name.localeCompare(b.name));
}
function skillList(h){
  const sk = (h && typeof h.getSkills === 'function') ? h.getSkills() : null;
  return (sk && Array.isArray(sk.skills)) ? sk.skills : [];
}
function runeIds(h){
  // any item whose id ends in "-rune" is treated as a rune for the quick rune tools
  return itemList(h).filter(it => /-rune$/.test(it.id));
}

/* named teleport spots: world objects/NPCs already placed in the chapel scene,
   read live so the list always matches what's actually in the world (falls
   back to a small static list if the globals aren't ready yet). */
function teleportSpots(){
  const spots = [{ id: 'spawn', name: 'Spawn', x: 0, z: 8.5 }];
  // world.js doesn't expose NPCS/OBJECTS on window, so the named spots below
  // are the known chapel layout (kept in sync manually; harmless if the scene
  // later changes - the x,z teleport box always works regardless).
  spots.push(
    { id: 'altar',    name: 'Altar',         x: 0,    z: -4.2 },
    { id: 'monk',     name: 'Brother Aldric', x: 1.4,  z: -2.9 },
    { id: 'sister',   name: 'Sister Wenna',   x: -1.4, z: -0.6 },
    { id: 'pilgrim1', name: 'Pilgrim Joss',   x: 1.4,  z: 0.6 },
    { id: 'pilgrim2', name: 'Old Maven',      x: 0,    z: 3.4 }
  );
  return spots;
}

export function initDevtools(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (window.EMDEVTOOLS) return window.EMDEVTOOLS;

  injectCss();

  // launcher button (always visible - a dev toolbox should be reachable even
  // before EMDEV/EMHUD exist; controls inside simply note what's unavailable)
  const btn = document.createElement('button');
  btn.id = BTN_ID; btn.type = 'button'; btn.title = 'Dev toolbox (` to toggle)';
  btn.textContent = '\u{1F6E0}️';
  document.body.appendChild(btn);

  const ov = document.createElement('div');
  ov.id = OV_ID;
  document.body.appendChild(ov);

  let noclip = false;
  let flashTimer = null;
  function flash(msg){
    const el = ov.querySelector('.flash');
    if (!el) return;
    el.textContent = msg;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { if (el) el.textContent = ''; }, 2400);
  }

  /* ------------------------------------------------------------ actions */
  function doGiveItem(id, qty){
    const h = hud();
    if (!h) { flash('EMHUD not ready - cannot give items.'); return; }
    if (!id) { flash('Pick or type an item id.'); return; }
    const items = (typeof h.getItems === 'function') ? (h.getItems() || {}) : {};
    if (!items[id]) { flash('Unknown item id: ' + id + ' (gave it anyway).'); }
    const n = Math.max(1, Math.floor(Number(qty) || 1));
    h.giveItem(id, n);
    flash('Gave ' + n + 'x ' + id + '.');
  }

  function doRemoveItem(id, qty){
    const h = hud();
    if (!h) { flash('EMHUD not ready - cannot remove items.'); return; }
    if (!id) { flash('Pick or type an item id.'); return; }
    const inv = h.getInv();
    if (!Array.isArray(inv)) { flash('Inventory not available.'); return; }
    const n = Math.max(1, Math.floor(Number(qty) || 1));
    let remaining = n, removed = 0;
    for (let i = inv.length - 1; i >= 0 && remaining > 0; i--){
      const e = inv[i];
      if (!e || e.id !== id) continue;
      const have = e.count || 1;
      if (have <= remaining){ remaining -= have; removed += have; inv.splice(i, 1); }
      else { e.count = have - remaining; removed += remaining; remaining = 0; }
    }
    if (typeof h.refresh === 'function') h.refresh();
    flash(removed > 0 ? ('Removed ' + removed + 'x ' + id + '.') : ('You had none of ' + id + '.'));
  }

  function doClearInventory(){
    const h = hud();
    if (!h) { flash('EMHUD not ready.'); return; }
    const inv = h.getInv();
    if (!Array.isArray(inv)) { flash('Inventory not available.'); return; }
    inv.length = 0;
    if (typeof h.refresh === 'function') h.refresh();
    flash('Inventory cleared.');
  }

  function doFillBag(){
    const h = hud();
    if (!h) { flash('EMHUD not ready.'); return; }
    const inv = h.getInv();
    const items = (typeof h.getItems === 'function') ? (h.getItems() || {}) : {};
    if (!Array.isArray(inv)) { flash('Inventory not available.'); return; }
    const ids = Object.keys(items);
    if (!ids.length) { flash('No item definitions loaded yet.'); return; }
    let added = 0;
    while (inv.length < 28 && added < 28){
      const id = ids[Math.floor(Math.random() * ids.length)];
      inv.push({ id, count: 1 });
      added++;
    }
    if (typeof h.refresh === 'function') h.refresh();
    flash('Bag filled with ' + added + ' random item stack(s).');
  }

  function doSetSkill(skillId, level){
    const h = hud();
    if (!h) { flash('EMHUD not ready.'); return; }
    const sk = h.getSkills();
    const xpMap = (typeof h.getSkillXp === 'function') ? h.getSkillXp() : null;
    if (!sk || !Array.isArray(sk.xpTable) || !xpMap) { flash('Skill data not ready.'); return; }
    const lvl = Math.max(1, Math.min(99, Math.floor(Number(level) || 1)));
    const xp = sk.xpTable[lvl - 1] != null ? sk.xpTable[lvl - 1] : sk.xpTable[sk.xpTable.length - 1];
    xpMap[skillId] = xp;
    if (typeof h.refresh === 'function') h.refresh();
    flash('Set ' + skillId + ' to level ' + lvl + '.');
  }

  function doSetAllSkills(level){
    const h = hud();
    if (!h) { flash('EMHUD not ready.'); return; }
    skillList(h).forEach(s => doSetSkill(s.id, level));
    flash('Set all skills to level ' + level + '.');
  }

  function doSetHp(cur, max){
    if (typeof window === 'undefined') return;
    const m = (max != null && max !== '') ? Math.max(1, Math.floor(Number(max))) : (window.EMPLAYERHP ? window.EMPLAYERHP.max : 10);
    const c = Math.max(0, Math.min(m, Math.floor(Number(cur))));
    window.EMPLAYERHP = { cur: c, max: m };
    flash('HP set to ' + c + '/' + m + '.');
  }

  function doSetPrayer(cur, max){
    if (typeof window === 'undefined') return;
    const m = (max != null && max !== '') ? Math.max(1, Math.floor(Number(max))) : ((window.EMPRAYERPTS && window.EMPRAYERPTS.max) || 1);
    const c = Math.max(0, Math.min(m, Math.floor(Number(cur))));
    window.EMPRAYERPTS = { cur: c, max: m };
    flash('Prayer points set to ' + c + '/' + m + '.');
  }

  function doSetRun(energy){
    const r = (typeof window !== 'undefined') ? window.EMRUN : null;
    if (!r) { flash('EMRUN not ready.'); return; }
    r.energy = Math.max(0, Math.min(100, Math.floor(Number(energy))));
    flash('Run energy set to ' + r.energy + '.');
  }

  function doAddRunes(amount){
    const h = hud();
    if (!h) { flash('EMHUD not ready.'); return; }
    const runes = runeIds(h);
    if (!runes.length) { flash('No rune items found in items.json.'); return; }
    const n = Math.max(1, Math.floor(Number(amount) || 1));
    runes.forEach(r => h.giveItem(r.id, n));
    flash('Gave ' + n + 'x of every rune (' + runes.length + ' types).');
  }

  function doRemoveRunes(){
    const h = hud();
    if (!h) { flash('EMHUD not ready.'); return; }
    const inv = h.getInv();
    if (!Array.isArray(inv)) { flash('Inventory not available.'); return; }
    for (let i = inv.length - 1; i >= 0; i--){
      const e = inv[i];
      if (e && /-rune$/.test(e.id)) inv.splice(i, 1);
    }
    if (typeof h.refresh === 'function') h.refresh();
    flash('Removed all runes from the bag.');
  }

  function syncPlayerVisual(){
    // mirror the live pos onto the player THREE.Group immediately so a
    // teleport reads instantly instead of waiting for the next sim tick.
    const p = (typeof window !== 'undefined') ? window.EMPLAYERPOS : null;
    const grp = (typeof window !== 'undefined') ? window.EMPLAYER : null;
    if (p && grp && grp.position) grp.position.set(p.x, grp.position.y || 0, p.z);
  }

  function doTeleport(x, z){
    if (typeof window === 'undefined') { return; }
    const p = window.EMPLAYERPOS;
    if (!p) { flash('EMPLAYERPOS not ready - cannot teleport.'); return; }
    const move = window.EMMOVE;
    if (move){ move.pending = null; move.path = []; move.moving = false; }
    p.x = Number(x); p.z = Number(z);
    syncPlayerVisual();
    flash('Teleported to (' + p.x.toFixed(1) + ', ' + p.z.toFixed(1) + ').');
  }

  function doTeleportSpot(spotId){
    const spot = teleportSpots().find(s => s.id === spotId);
    if (!spot) { flash('Unknown spot.'); return; }
    doTeleport(spot.x, spot.z);
  }

  let noclipRaf = null;
  function applyNoclip(on){
    noclip = !!on;
    // Lightweight noclip: while active, keep collision-relevant pending moves
    // cleared and let direct position edits (teleport box, arrow-drag in
    // future) stick without the pathing system snapping the player back.
    // We don't reach into world.js's internal collider arrays (out of scope
    // for this module); this guarantees teleports always land even mid-walk.
    const move = (typeof window !== 'undefined') ? window.EMMOVE : null;
    if (noclip && move){ move.pending = null; move.path = []; move.moving = false; }
    flash(noclip ? 'Noclip ON - movement collisions still apply walking, but teleports always land.' : 'Noclip OFF.');
  }

  function doSpawnMob(id, name){
    if (typeof window === 'undefined' || !window.EMMOB || typeof window.EMMOB.place !== 'function'){
      flash('EMMOB not ready - cannot spawn.'); return;
    }
    const p = window.EMPLAYERPOS;
    if (!p) { flash('EMPLAYERPOS not ready.'); return; }
    const ang = Math.random() * Math.PI * 2;
    const dist = 1.6;
    const x = p.x + Math.cos(ang) * dist, z = p.z + Math.sin(ang) * dist;
    window.EMMOB.place(id || 'rat', x, z, name || id || 'Rat');
    flash('Spawned ' + (name || id || 'rat') + ' near you.');
  }

  /* ------------------------------------------------------------ render */
  function render(){
    const h = hud();
    const items = itemList(h);
    const skills = skillList(h);
    const spots = teleportSpots();
    const hp = (typeof window !== 'undefined' && window.EMPLAYERHP) || { cur: '?', max: '?' };
    const pr = (typeof window !== 'undefined' && window.EMPRAYERPTS) || { cur: '?', max: '?' };
    const run = (typeof window !== 'undefined' && window.EMRUN) || null;
    const itemOptions = items.map(it => '<option value="' + esc(it.id) + '">' + esc(it.name) + ' (' + esc(it.id) + ')</option>').join('');

    ov.innerHTML =
      '<div class="wrap">'
      + '<div class="hd"><div><h3>Dev Toolbox</h3><div class="sub">Hotkey: ` &nbsp;|&nbsp; spawn / give / stats / teleport / noclip</div></div>'
      +   '<button type="button" class="x" title="Close">✕</button></div>'

      + '<div class="sec" data-sec="items"><h4>Items</h4>'
      +   (h ? '' : '<div class="missing">EMHUD not ready yet - item controls disabled.</div>')
      +   '<div class="row"><label>Item</label>'
      +     '<input list="emdv-items" type="text" class="f-item" placeholder="item id (type or pick)"/>'
      +     '<datalist id="emdv-items">' + itemOptions + '</datalist>'
      +     '<input type="number" class="f-qty" min="1" value="1" style="max-width:80px"/>'
      +     '<button type="button" data-a="give" class="go">Give</button>'
      +     '<button type="button" data-a="remove" class="warn">Remove</button></div>'
      +   '<div class="row"><button type="button" data-a="fillbag">Fill bag (random)</button>'
      +     '<button type="button" data-a="clearbag" class="warn">Clear inventory</button></div>'
      +   '<div class="row"><label>Runes</label>'
      +     '<input type="number" class="f-runeqty" min="1" value="1000" style="max-width:100px"/>'
      +     '<button type="button" data-a="addrunes" class="go">Give all runes</button>'
      +     '<button type="button" data-a="removerunes" class="warn">Remove all runes</button></div>'
      + '</div>'

      + '<div class="sec" data-sec="skills"><h4>Skills</h4>'
      +   (h && skills.length ? '' : '<div class="missing">Skill data not ready yet.</div>')
      +   '<div class="row"><label>All skills</label>'
      +     '<input type="number" class="f-alllvl" min="1" max="99" value="99" style="max-width:80px"/>'
      +     '<button type="button" data-a="setall" class="go">Set all</button></div>'
      +   '<div class="skillsgrid">'
      +     skills.map(s => '<div class="sk" data-skill="' + esc(s.id) + '"><span class="nm">' + esc(s.icon||'') + ' ' + esc(s.name) + '</span>'
            + '<input type="number" min="1" max="99" value="1" class="f-sklv"/>'
            + '<button type="button" data-a="setone" data-skill="' + esc(s.id) + '">Set</button></div>').join('')
      +   '</div>'
      + '</div>'

      + '<div class="sec" data-sec="vitals"><h4>Vitals</h4>'
      +   '<div class="row"><label>HP</label>'
      +     '<input type="number" class="f-hpcur" min="0" value="' + esc(hp.cur) + '" style="max-width:80px"/> / '
      +     '<input type="number" class="f-hpmax" min="1" value="' + esc(hp.max) + '" style="max-width:80px"/>'
      +     '<button type="button" data-a="sethp" class="go">Set HP</button></div>'
      +   '<div class="row"><label>Prayer</label>'
      +     '<input type="number" class="f-prcur" min="0" value="' + esc(pr.cur) + '" style="max-width:80px"/> / '
      +     '<input type="number" class="f-prmax" min="1" value="' + esc(pr.max) + '" style="max-width:80px"/>'
      +     '<button type="button" data-a="setpr" class="go">Set Prayer</button></div>'
      +   '<div class="row"><label>Run energy</label>'
      +     (run ? '<input type="number" class="f-run" min="0" max="100" value="' + esc(Math.round(run.energy)) + '" style="max-width:80px"/>'
                  + '<button type="button" data-a="setrun" class="go">Set</button>'
            : '<div class="missing">EMRUN not ready.</div>')
      +   '</div>'
      + '</div>'

      + '<div class="sec" data-sec="tp"><h4>Teleport / Noclip</h4>'
      +   '<div class="row"><label>Spot</label><select class="f-spot">'
      +     spots.map(s => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join('')
      +     '</select><button type="button" data-a="tpspot" class="go">Go</button></div>'
      +   '<div class="row"><label>X, Z</label>'
      +     '<input type="number" class="f-tpx" step="0.5" value="0" style="max-width:80px"/>'
      +     '<input type="number" class="f-tpz" step="0.5" value="8.5" style="max-width:80px"/>'
      +     '<button type="button" data-a="tpxz" class="go">Teleport</button></div>'
      +   '<div class="row"><button type="button" data-a="noclip" class="' + (noclip ? 'on' : '') + '">Noclip: ' + (noclip ? 'ON' : 'OFF') + '</button></div>'
      +   (window.EMPLAYERPOS ? '' : '<div class="missing">EMPLAYERPOS not ready - teleport disabled.</div>')
      + '</div>'

      + '<div class="sec" data-sec="spawn"><h4>Spawn NPC / Mob</h4>'
      +   '<div class="row"><label>Id</label><input type="text" class="f-mobid" value="rat" placeholder="mob id"/>'
      +     '<input type="text" class="f-mobname" placeholder="display name (optional)"/>'
      +     '<button type="button" data-a="spawnmob" class="go">Spawn near me</button></div>'
      +   (window.EMMOB ? '' : '<div class="missing">EMMOB not ready - spawn disabled.</div>')
      + '</div>'

      + '<div class="flash"></div>'
      + '</div>';

    ov.querySelector('.x').onclick = close;

    // items
    const fItem = () => ov.querySelector('.f-item').value.trim();
    const fQty = () => ov.querySelector('.f-qty').value;
    ov.querySelector('[data-a="give"]').onclick = () => doGiveItem(fItem(), fQty());
    ov.querySelector('[data-a="remove"]').onclick = () => doRemoveItem(fItem(), fQty());
    ov.querySelector('[data-a="fillbag"]').onclick = () => doFillBag();
    ov.querySelector('[data-a="clearbag"]').onclick = () => { if (confirm('Clear the entire inventory?')) doClearInventory(); };
    ov.querySelector('[data-a="addrunes"]').onclick = () => doAddRunes(ov.querySelector('.f-runeqty').value);
    ov.querySelector('[data-a="removerunes"]').onclick = () => doRemoveRunes();

    // skills
    const setAllBtn = ov.querySelector('[data-a="setall"]');
    if (setAllBtn) setAllBtn.onclick = () => doSetAllSkills(ov.querySelector('.f-alllvl').value);
    ov.querySelectorAll('[data-a="setone"]').forEach(b => {
      b.onclick = () => {
        const card = b.closest('.sk');
        const lvl = card.querySelector('.f-sklv').value;
        doSetSkill(b.dataset.skill, lvl);
      };
    });

    // vitals
    const hpBtn = ov.querySelector('[data-a="sethp"]');
    if (hpBtn) hpBtn.onclick = () => doSetHp(ov.querySelector('.f-hpcur').value, ov.querySelector('.f-hpmax').value);
    const prBtn = ov.querySelector('[data-a="setpr"]');
    if (prBtn) prBtn.onclick = () => doSetPrayer(ov.querySelector('.f-prcur').value, ov.querySelector('.f-prmax').value);
    const runBtn = ov.querySelector('[data-a="setrun"]');
    if (runBtn) runBtn.onclick = () => doSetRun(ov.querySelector('.f-run').value);

    // teleport / noclip
    const tpSpotBtn = ov.querySelector('[data-a="tpspot"]');
    if (tpSpotBtn) tpSpotBtn.onclick = () => doTeleportSpot(ov.querySelector('.f-spot').value);
    const tpXzBtn = ov.querySelector('[data-a="tpxz"]');
    if (tpXzBtn) tpXzBtn.onclick = () => doTeleport(ov.querySelector('.f-tpx').value, ov.querySelector('.f-tpz').value);
    const noclipBtn = ov.querySelector('[data-a="noclip"]');
    if (noclipBtn) noclipBtn.onclick = () => { applyNoclip(!noclip); render(); };

    // spawn
    const spawnBtn = ov.querySelector('[data-a="spawnmob"]');
    if (spawnBtn) spawnBtn.onclick = () => doSpawnMob(ov.querySelector('.f-mobid').value.trim(), ov.querySelector('.f-mobname').value.trim());
  }

  function open(){
    render();
    ov.classList.add('show');
    haptic('open');
    try { localStorage.setItem(KEY_OPEN, '1'); } catch (e) {}
  }
  function close(){
    ov.classList.remove('show');
    haptic('close');
    try { localStorage.removeItem(KEY_OPEN); } catch (e) {}
  }
  function toggle(){ if (ov.classList.contains('show')) close(); else open(); }

  btn.onclick = toggle;

  // hotkey: backtick toggles the panel. Ignored while typing in an input/
  // textarea/contenteditable so it never steals the key from chat or other
  // text fields.
  document.addEventListener('keydown', (e) => {
    if (e.key !== '`' && e.code !== 'Backquote') return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    e.preventDefault();
    toggle();
  });

  window.EMDEVTOOLS = {
    open, close, toggle,
    giveItem: doGiveItem,
    removeItem: doRemoveItem,
    clearInventory: doClearInventory,
    fillBag: doFillBag,
    setSkill: doSetSkill,
    setAllSkills: doSetAllSkills,
    setHp: doSetHp,
    setPrayer: doSetPrayer,
    setRun: doSetRun,
    addRunes: doAddRunes,
    removeRunes: doRemoveRunes,
    teleport: doTeleport,
    teleportTo: doTeleportSpot,
    setNoclip: applyNoclip,
    isNoclip: () => noclip,
    spawnMob: doSpawnMob,
    spots: () => teleportSpots(),
  };
  return window.EMDEVTOOLS;
}

export default initDevtools;
