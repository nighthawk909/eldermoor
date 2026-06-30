/* =====================================================================
   ELDERMOOR - equipment tab module (EQ1 / EQ+1 / EQ+3). Owns the
   "Equipment" panel via the HUD tab registry hook (window.EMTABS['equip']).
   Renders the OSRS humanoid worn-slot layout and reads the live worn set
   from window.EMEQUIP:

     window.EMEQUIP = {
       worn:   { head:'bronze_helm', body:'leather_body', ... },  // slot -> itemId
       unequip(slot): void,                                       // remove a worn item
       stats(): { attack:{...}, defence:{...}, other:{...} }            // bonus rows
     }

   Each filled slot shows the item\'s icon (from state.getItems()[id].icon);
   empty slots show a ghost label. Clicking a filled slot calls
   window.EMEQUIP.unequip(slot) then state.refresh(). An "Equipment Stats"
   button toggles a panel listing Attack / Defence / Other bonus rows from
   window.EMEQUIP.stats(). Degrades gracefully (all-empty grid, inert stats)
   when EMEQUIP is absent. main.js invokes initEquipTab() once.

   Conventions matched: ES module exporting an init fn; window.EMTABS[tab] =
   (panel, state) => {...}; reads HUD internals through `state` only; never
   mutates other modules' state; self-contained scoped CSS via injected style.
   ===================================================================== */
export function initEquipTab(){
  if(typeof window === 'undefined') return;
  if(window.__emEquipTabInit) return;     // idempotent - main.js should call once
  window.__emEquipTabInit = true;

  /* --------------------------------------------------------- slot definitions */
  // OSRS humanoid worn layout. `cell` is the grid area each slot occupies in a
  // 3-column body diagram (head on top, weapon/body/shield across the middle...).
  const SLOTS = [
    { slot:'head',   label:'Head',   ghost:'⛑️', cell:'h'  },
    { slot:'cape',   label:'Cape',   ghost:'🧣', cell:'cp' },
    { slot:'neck',   label:'Neck',   ghost:'📿', cell:'nk' },
    { slot:'ammo',   label:'Ammo',   ghost:'➶',  cell:'am' },
    { slot:'weapon', label:'Weapon', ghost:'⚔️', cell:'wp' },
    { slot:'body',   label:'Body',   ghost:'👕', cell:'bd' },
    { slot:'shield', label:'Shield', ghost:'🛡️', cell:'sh' },
    { slot:'legs',   label:'Legs',   ghost:'👖', cell:'lg' },
    { slot:'hands',  label:'Hands',  ghost:'🧤', cell:'hd' },
    { slot:'feet',   label:'Feet',   ghost:'🥾', cell:'ft' },
    { slot:'ring',   label:'Ring',   ghost:'💍', cell:'rg' },
  ];

  /* ----------------------------------------------------- data access (safe) */
  // EMEQUIP may load after init; always read it lazily, never cache.
  function equip(){ const e = window.EMEQUIP; return (e && typeof e === 'object') ? e : null; }
  function worn(){ const e = equip(); const w = e && e.worn; return (w && typeof w === 'object') ? w : {}; }
  // Resolve an itemId to its display def via the HUD\'s item map.
  function itemDef(state, id){
    if(!id) return null;
    const get = state && typeof state.getItems === 'function' ? state.getItems() : null;
    return (get && get[id]) || { name:id };
  }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* --------------------------------------------------------- one-time styles */
  const css = `
  .emeqt-wrap{font-family:"Trebuchet MS",sans-serif;color:#e3d6b8;}
  .emeqt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;justify-items:center;
    grid-template-areas:
      ". h ."
      "cp nk am"
      "wp bd sh"
      ". lg ."
      "hd ft rg";}
  .emeqt-grid .es{width:46px;height:46px;border-radius:7px;background:#2b2620;border:1px solid #3e3424;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;position:relative;
    text-align:center;padding:2px;box-sizing:border-box;}
  .emeqt-grid .es .ic{font-size:21px;line-height:1;}
  .emeqt-grid .es .nm{font-size:7.5px;line-height:1;color:#8c7f60;max-width:100%;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .emeqt-grid .es.filled{cursor:pointer;border-color:#5a4a2a;background:#352b1c;}
  .emeqt-grid .es.filled .nm{color:#cdbf98;}
  .emeqt-grid .es.filled:hover{border-color:#e7c64f;}
  .emeqt-grid .es.empty .ic{opacity:.32;filter:grayscale(1);}
  .emeqt-statbtn{margin-top:9px;width:100%;background:#3a2e1f;border:1px solid #5a4a2a;color:#f3e9cf;
    font-family:inherit;font-size:11px;padding:5px 0;border-radius:6px;cursor:pointer;letter-spacing:.04em;}
  .emeqt-statbtn:hover{border-color:#e7c64f;background:#5a4422;}
  .emeqt-stats{margin-top:8px;background:#241f18;border:1px solid #3e3424;border-radius:6px;
    padding:7px 9px;display:none;}
  .emeqt-stats.show{display:block;}
  .emeqt-stats .grp{margin-bottom:6px;}
  .emeqt-stats .grp:last-child{margin-bottom:0;}
  .emeqt-stats .grp > .t{color:#e7c64f;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;
    margin-bottom:2px;}
  .emeqt-stats .row{display:flex;justify-content:space-between;font-size:11px;line-height:1.5;}
  .emeqt-stats .row .k{color:#cdbf98;}
  .emeqt-stats .row .v{color:#f3e9cf;font-variant-numeric:tabular-nums;}
  .emeqt-stats .none{color:#9a8c6c;font-size:11px;}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* --------------------------------------------------------- stats rendering */
  // Pretty-print a bonus group ({key:value}) into k/v rows. Numbers get a sign.
  function statRows(group){
    if(!group || typeof group !== 'object') return '';
    const keys = Object.keys(group);
    if(!keys.length) return '';
    return keys.map(k => {
      const v = group[k];
      const disp = (typeof v === 'number') ? (v > 0 ? '+'+v : String(v)) : esc(v);
      return `<div class="row"><span class="k">${esc(k)}</span><span class="v">${disp}</span></div>`;
    }).join('');
  }
  function renderStats(host){
    const e = equip();
    let data = null;
    if(e && typeof e.stats === 'function'){ try { data = e.stats(); } catch(_){ data = null; } }
    if(!data || typeof data !== 'object'){
      host.innerHTML = '<div class="none">No equipment bonuses.</div>';
      return;
    }
    // Accept either a flat {attack,defence,other} shape or arbitrary group keys.
    const groups = Object.keys(data).filter(k => data[k] && typeof data[k] === 'object');
    if(!groups.length){
      // flat map of bonuses (no sub-groups) → render as a single "Other" group
      const rows = statRows(data);
      host.innerHTML = rows
        ? `<div class="grp"><div class="t">Bonuses</div>${rows}</div>`
        : '<div class="none">No equipment bonuses.</div>';
      return;
    }
    const label = { attack:'Attack', defence:'Defence', defense:'Defence', other:'Other' };
    const html = groups.map(g => {
      const rows = statRows(data[g]);
      if(!rows) return '';
      const t = label[g] || (g.charAt(0).toUpperCase() + g.slice(1));
      return `<div class="grp"><div class="t">${esc(t)}</div>${rows}</div>`;
    }).join('');
    host.innerHTML = html || '<div class="none">No equipment bonuses.</div>';
  }

  /* --------------------------------------------------------- grid rendering */
  // worn[slot] may be a bare itemId (legacy) OR an inventory entry {id,count}
  // (as equipment.js stores it). Normalise to the itemId string so the slot
  // renders the real icon/name instead of "[object Object]".
  function wornId(entry){ return entry && (typeof entry === 'string' ? entry : entry.id) || null; }

  function renderGrid(host, state){
    const w = worn();
    const cells = SLOTS.map(def => {
      const id = wornId(w[def.slot]);
      if(id){
        const it = itemDef(state, id);
        const icon = (it && it.icon) || '❓';
        const name = (it && it.name) || id;
        return `<div class="es filled" style="grid-area:${def.cell}" data-slot="${esc(def.slot)}" `
          + `title="${esc('Remove ' + name)}">`
          + `<span class="ic">${esc(icon)}</span><span class="nm">${esc(name)}</span></div>`;
      }
      return `<div class="es empty" style="grid-area:${def.cell}" title="${esc(def.label + ' (empty)')}">`
        + `<span class="ic">${esc(def.ghost)}</span><span class="nm">${esc(def.label)}</span></div>`;
    }).join('');
    host.innerHTML = `<div class="emeqt-grid">${cells}</div>`;
    host.querySelectorAll('.es.filled[data-slot]').forEach(el => {
      el.onclick = () => {
        const e = equip();
        if(e && typeof e.unequip === 'function'){
          try { e.unequip(el.dataset.slot); } catch(_){}
        }
        if(state && typeof state.refresh === 'function'){ state.refresh(); }
      };
    });
  }

  /* ---------------------------------------------- TAB REGISTRY HOOK (EMTABS) */
  // Renders into the HUD\'s shared #empanel when the 'equip' tab is shown.
  window.EMTABS = window.EMTABS || {};
  window.EMTABS['equip'] = (panel, state) => {
    panel.innerHTML = '<h4>Worn Equipment</h4>'
      + '<div class="emeqt-wrap">'
      + '<div class="emeqt-gridhost"></div>'
      + '<button type="button" class="emeqt-statbtn">Equipment Stats</button>'
      + '<div class="emeqt-stats"></div>'
      + '</div>';
    renderGrid(panel.querySelector('.emeqt-gridhost'), state);

    const statsHost = panel.querySelector('.emeqt-stats');
    const btn = panel.querySelector('.emeqt-statbtn');
    btn.onclick = () => {
      const showing = statsHost.classList.toggle('show');
      if(showing) renderStats(statsHost);   // refresh contents each time it opens
    };
  };
}
