/* =====================================================================
   ELDERMOOR - emotes module (EMOTE1-6). Registers an "Emotes" panel via
   the HUD tab registry hook (window.EMTABS['emotes']) and exposes
   window.EMEMOTE.play(id). Self-contained, data-driven: reads emote
   definitions from window.EMDATA.emotes (each {id,name,icon,locked,unlock,
   anim?}). Locked emotes render greyed with their unlock hint as a tooltip;
   clicking an unlocked one plays a brief animation on the player rig (via
   window.EMRIG if exposed) and is interrupted by player movement. A small
   floating 😀 button makes the grid reachable even before a tab button
   exists. main.js invokes initEmotes() once.

   Conventions matched: ES module exporting an init fn; window.EMTABS[tab] =
   (panel, state) => {...}; window.EMHUD.addChat / EMHUD.show(tab); never
   mutates other modules' state.
   ===================================================================== */
export function initEmotes(){
  if(typeof window === 'undefined') return;
  if(window.__emEmotesInit) return;            // idempotent - main.js should call once
  window.__emEmotesInit = true;

  /* ----------------------------------------------------- data access (safe) */
  // EMDATA may load after init; always read it lazily, never cache the array.
  function emotes(){
    const d = window.EMDATA;
    const list = d && Array.isArray(d.emotes) ? d.emotes : null;
    return list || [];
  }
  function findEmote(id){ return emotes().find(e => e && e.id === id) || null; }

  /* --------------------------------------------------------- one-time styles */
  const css = `
  #emem-fab{position:fixed;right:8px;bottom:118px;z-index:32;width:38px;height:38px;border-radius:50%;
    background:#3a2e1f;border:2px solid #5a4a2a;color:#f3e9cf;font-size:19px;line-height:1;cursor:pointer;
    box-shadow:0 3px 12px #0008;display:flex;align-items:center;justify-content:center;}
  #emem-fab:hover{border-color:#e7c64f;background:#5a4422;}
  #emem-ov{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;
    background:rgba(12,10,8,.55);}
  #emem-ov.show{display:flex;}
  #emem-ov .card{width:min(92vw,360px);max-height:70vh;overflow:auto;background:linear-gradient(#3a2e1f,#312718);
    border:2px solid #5a4a2a;border-radius:8px;padding:11px;box-shadow:0 8px 30px #000c;
    font-family:"Trebuchet MS",sans-serif;}
  #emem-ov .card h4{margin:0 0 8px;color:#e7c64f;font-size:12px;letter-spacing:.1em;text-transform:uppercase;
    display:flex;align-items:center;}
  #emem-ov .card h4 .x{margin-left:auto;cursor:pointer;color:#cdbf98;font-size:15px;line-height:1;
    padding:0 3px;border-radius:4px;}
  #emem-ov .card h4 .x:hover{color:#fff;background:#5a4422;}
  .emem-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;}
  .emem-grid .e{aspect-ratio:1;background:#2b2620;border:1px solid #3e3424;border-radius:6px;position:relative;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;
    color:#e3d6b8;text-align:center;padding:2px;}
  .emem-grid .e .ic{font-size:21px;line-height:1;}
  .emem-grid .e .nm{font-size:8.5px;line-height:1.05;color:#cdbf98;max-width:100%;
    overflow:hidden;text-overflow:ellipsis;}
  .emem-grid .e:hover{border-color:#e7c64f;}
  .emem-grid .e.locked{opacity:.4;cursor:not-allowed;filter:grayscale(1);}
  .emem-grid .e.locked:hover{border-color:#3e3424;}
  .emem-grid .e .lk{position:absolute;top:1px;right:3px;font-size:9px;opacity:.85;}
  .emem-empty{color:#9a8c6c;font-size:12px;padding:6px 2px;}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* --------------------------------------------------------- grid rendering */
  // Render the emote grid into `host`. Wires click handlers; locked → tooltip.
  function renderGrid(host){
    const list = emotes();
    if(!list.length){ host.innerHTML = '<div class="emem-empty">No emotes available yet.</div>'; return; }
    const cells = list.map(e => {
      const locked = !!e.locked;
      const tip = locked
        ? (e.unlock || 'Locked.')
        : ('Perform the ' + (e.name || e.id) + ' emote.');
      const esc = String(tip).replace(/"/g, '&quot;');
      return `<div class="e${locked?' locked':''}" data-id="${e.id}" title="${esc}">`
        + (locked ? '<span class="lk">🔒</span>' : '')
        + `<span class="ic">${e.icon || '❓'}</span>`
        + `<span class="nm">${e.name || e.id}</span></div>`;
    }).join('');
    host.innerHTML = `<div class="emem-grid">${cells}</div>`;
    host.querySelectorAll('.emem-grid .e[data-id]').forEach(el => {
      el.onclick = () => {
        const def = findEmote(el.dataset.id);
        if(!def || def.locked) return;          // locked emotes are inert (greyed)
        window.EMEMOTE.play(def.id);
      };
    });
  }

  /* ---------------------------------------------- TAB REGISTRY HOOK (EMTABS) */
  // Renders into the HUD\'s shared #empanel if/when the 'emotes' tab is shown.
  window.EMTABS = window.EMTABS || {};
  window.EMTABS['emotes'] = (panel /*, state */) => {
    panel.innerHTML = '<h4>Emotes</h4><div class="emem-tabhost"></div>';
    renderGrid(panel.querySelector('.emem-tabhost'));
  };

  /* --------------------------------------------- floating button + overlay */
  // Makes the grid reachable NOW (no 'emotes' tab button exists yet). Prefers
  // routing through the HUD tab if it ever knows the tab; else opens overlay.
  const ov = document.createElement('div');
  ov.id = 'emem-ov';
  ov.innerHTML = '<div class="card"><h4>Emotes<span class="x" title="Close">✕</span></h4>'
    + '<div class="emem-ovhost"></div></div>';
  document.body.appendChild(ov);
  const ovHost = ov.querySelector('.emem-ovhost');
  function openOverlay(){ renderGrid(ovHost); ov.classList.add('show'); }
  function closeOverlay(){ ov.classList.remove('show'); }
  ov.querySelector('.x').onclick = closeOverlay;
  ov.onclick = (e) => { if(e.target === ov) closeOverlay(); };   // click backdrop to dismiss

  /* NOTE (Milestone 1A): the floating 😀 FAB was removed — it duplicated the
     Emotes HUD tab and floated over gameplay on mobile. Emotes are reached via
     the Emotes tab (window.EMTABS['emotes']). The overlay (#emem-ov) is kept as
     a programmatic fallback reachable through window.EMEMOTE, but no stray
     button is mounted. */
  void openOverlay;   // retained API; not bound to a floating button anymore

  /* -------------------------------------------------- player-rig animation */
  // A live emote is a small timed pose offset applied to a rig. We read
  // window.EMRIG if a rig with named pivots is exposed; otherwise we degrade
  // honestly to a chat line. Movement interrupts an in-progress emote.
  const active = {
    id: null, t: 0, dur: 0, raf: 0,
    rig: null, // the rig object we are animating
    restore: null // () => void, resets touched pivots
  };

  // Best-effort discovery of a player rig with named limb pivots.
  function getRig(){
    const r = window.EMRIG;
    if(r && typeof r === 'object') return r;
    return null;
  }
  // Best-effort read of whether the player is currently moving (to interrupt).
  function isMoving(){
    const m = window.EMMOVE;                          // if player module exposes it
    if(m && typeof m === 'object') return !!m.moving;
    return false;
  }

  function clearAnim(){
    if(active.raf){ cancelAnimationFrame(active.raf); active.raf = 0; }
    if(typeof active.restore === 'function'){ try { active.restore(); } catch(_){} }
    active.id = null; active.t = 0; active.dur = 0; active.rig = null; active.restore = null;
  }

  // Animate a simple, register-appropriate flourish on whatever pivots exist.
  // We never assume a specific rig shape - we touch only pivots that are present
  // and always restore their original rotation when done/interrupted.
  function animateRig(rig){
    // collect available pivots (named limbs commonly present on the walk rig)
    const names = ['armL','armR','legL','legR','head','torso','body'];
    const targets = [];
    for(const n of names){
      const p = rig[n];
      if(p && p.rotation){ targets.push({ p, x0: p.rotation.x, z0: p.rotation.z }); }
    }
    if(!targets.length) return null;                  // nothing to animate → caller degrades
    active.restore = () => { targets.forEach(t => { t.p.rotation.x = t.x0; t.p.rotation.z = t.z0; }); };
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const DUR = active.dur = 900;                     // brief: ~0.9s
    const tick = () => {
      if(isMoving()){ clearAnim(); return; }          // movement interrupts
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const t = (now - start) / DUR;
      if(t >= 1){ clearAnim(); return; }
      const s = Math.sin(t * Math.PI);                // ease in/out, 0→1→0
      targets.forEach((tg, i) => {
        const dir = (i % 2 === 0) ? 1 : -1;
        tg.p.rotation.x = tg.x0 + dir * 0.55 * s;     // gentle swing
        tg.p.rotation.z = tg.z0 + dir * 0.12 * s;
      });
      active.raf = requestAnimationFrame(tick);
    };
    active.raf = requestAnimationFrame(tick);
    return true;
  }

  /* --------------------------------------------------------- public: EMEMOTE */
  window.EMEMOTE = {
    play(id){
      const def = findEmote(id);
      if(!def){ return false; }
      if(def.locked){
        if(window.EMHUD && typeof EMHUD.addChat === 'function'){
          EMHUD.addChat('You haven\'t unlocked the ' + (def.name || id) + ' emote yet.', '', true);
        }
        return false;
      }
      // interrupt any current emote, then start fresh
      clearAnim();
      active.id = id;
      closeOverlay();                                  // get the grid out of the way

      const rig = getRig();
      let animated = false;
      if(rig){ animated = !!animateRig(rig); active.rig = rig; }

      // Always log a chat line (and it\'s the sole feedback when no rig is reachable).
      if(window.EMHUD && typeof EMHUD.addChat === 'function'){
        EMHUD.addChat('You perform the ' + (def.name || id) + ' emote.', '', true);
      }
      return animated || true;
    },
    // Stop any in-progress emote (e.g. main.js may call this on movement).
    stop(){ clearAnim(); },
    // True while an emote pose is active.
    isPlaying(){ return !!active.id && !!active.raf; },
    // Re-render any open grids (e.g. after EMDATA finishes loading).
    refresh(){
      if(ov.classList.contains('show')) renderGrid(ovHost);
      if(window.EMHUD && typeof EMHUD.curTab === 'function' && EMHUD.curTab() === 'emotes' && EMHUD.refresh){
        EMHUD.refresh();
      }
    }
  };

  // Safety net: if the player starts moving, drop any active emote pose.
  // (Polls cheaply; only does work while an emote is live.)
  function watchMovement(){
    if(active.id && active.raf && isMoving()) clearAnim();
    requestAnimationFrame(watchMovement);
  }
  if(typeof requestAnimationFrame === 'function') requestAnimationFrame(watchMovement);
}
