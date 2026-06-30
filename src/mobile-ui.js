/* =====================================================================
   ELDERMOOR - mobile UI framework (Milestone 1A). The shared responsive
   layer that makes the HUD usable on a phone. It owns NO gameplay; it only
   reshapes/coordinates the existing UI:

     • Orientation detection -> body.em-portrait / body.em-landscape, switched
       live on resize/orientationchange (no reload). Portrait is primary,
       landscape an enhanced wider layout.
     • Responsive CSS: bigger touch targets (>=44px), fluid panel widths,
       safe-area padding, a docked dialogue BOTTOM SHEET (#dlg), and the
       chat-collapse / objective-autohide styles.
     • Single active panel: the tab panel (#empanel) and the dialogue sheet
       (#dlg) are mutually exclusive (opening one closes the other) so nothing
       overlaps. Implemented by observing real DOM state — dialogue.js / hud.js
       are NOT modified.
     • Chat collapse: a header bar with a ▾/▴ toggle on #emchat.
     • Objective auto-hide: #emobj fades after a few seconds; re-shown on a new
       objective or a tap.
     • Haptic framework: window.EMHAPTIC.{tap,select,open,close,success,error}
       wrapping navigator.vibrate, with a persisted on/off switch.

   Defensive + idempotent. Reads window.EMHUD if present; everything degrades
   gracefully when a target element isn't there yet (it polls briefly).
   main.js calls initMobileUI() once, after initHud().
   ===================================================================== */

const OBJ_HIDE_MS_DEFAULT = 6000;

/* ----------------------------------------------------------- haptics */
function makeHaptics(){
  let enabled = true;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('eldermoor:haptics') === 'off') enabled = false;
  } catch (e) {}
  const canVibrate = () => enabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const fire = (pat) => { if (canVibrate()) { try { navigator.vibrate(pat); } catch (e) {} } };
  return {
    fire,
    tap:     () => fire(10),
    select:  () => fire(15),
    open:    () => fire(18),
    close:   () => fire(8),
    success: () => fire([12, 40, 24]),
    error:   () => fire([0, 30, 40, 30]),
    setEnabled(v){ enabled = !!v; try { localStorage.setItem('eldermoor:haptics', enabled ? 'on' : 'off'); } catch (e) {} return enabled; },
    enabled(){ return enabled; }
  };
}

/* ----------------------------------------------------------- responsive CSS */
const CSS = `
:root{ --em-safe-b: env(safe-area-inset-bottom, 0px); --em-safe-t: env(safe-area-inset-top, 0px); }

/* ---- touch targets: every interactive HUD control >= 44px tall on touch ---- */
#emtabs button{ min-height:44px; min-width:40px; font-size:18px; }
#emchch button{ min-height:34px; font-size:11px; }
#dlg button{ min-height:44px; }

/* ---- objective banner: fades out, taps to bring back ---- */
#emobj{ transition:opacity .4s ease, transform .4s ease; cursor:pointer; top:calc(8px + var(--em-safe-t)); }
#emobj.em-hidden{ opacity:0; transform:translateX(-50%) translateY(-8px); pointer-events:none; }

/* ---- chat: collapsible. EMUI injects #emchat-bar as the first child ---- */
#emchat-bar{ display:flex; align-items:center; gap:6px; padding:4px 8px; cursor:pointer;
  background:#241d14; border-bottom:1px solid #4a3a26; color:#e7c64f; font:bold 11px "Trebuchet MS",sans-serif;
  letter-spacing:.06em; text-transform:uppercase; user-select:none; }
#emchat-bar .em-ct{ margin-left:auto; font-size:14px; color:#cdbf98; }
#emchat.em-collapsed{ height:auto !important; }
#emchat.em-collapsed #emlog, #emchat.em-collapsed #emchch{ display:none !important; }

/* ---- dialogue becomes a docked BOTTOM SHEET (overrides the inline #dlg rules) ---- */
#dlg{ left:0 !important; right:0 !important; transform:none !important; z-index:33 !important;
  width:100% !important; max-width:100% !important; border-radius:14px 14px 0 0 !important;
  overflow:auto; padding-bottom:calc(14px + var(--em-safe-b)) !important;
  box-shadow:0 -8px 30px rgba(0,0,0,.5) !important; }

/* ---- single active panel: hide the dialogue sheet while a tab panel is open ---- */
body.em-panel-open #dlg{ display:none !important; }

/* =================== PORTRAIT (primary) =================== */
/* the tab bar is two rows of 7 (~112px); panel / dialogue / chat all stack ABOVE
   it in the same zone, and are mutually exclusive, so nothing overlaps. */
body.em-portrait #emtabs{ right:6px !important; left:6px !important; width:auto !important;
  grid-template-columns:repeat(7,1fr) !important; bottom:calc(6px + var(--em-safe-b)) !important; }
body.em-portrait #empanel{ right:6px !important; left:6px !important; width:auto !important;
  bottom:calc(120px + var(--em-safe-b)) !important; max-height:44vh !important; }
body.em-portrait #dlg{ bottom:calc(120px + var(--em-safe-b)) !important; max-height:40vh; }
body.em-portrait #emchat{ width:min(64vw,340px) !important; height:118px;
  bottom:calc(120px + var(--em-safe-b)) !important; }
body.em-portrait #emmap{ width:92px; height:92px; }
/* a major panel (tab panel OR dialogue sheet) owns the zone; chat yields to avoid overlap */
body.em-portrait.em-panel-open #emchat,
body.em-portrait.em-dlg-open #emchat{ display:none !important; }

/* =================== LANDSCAPE (enhanced) =================== */
/* wider screen: panel docks right, chat docks left -> both fit with no overlap */
body.em-landscape #emtabs{ width:min(52vw,360px) !important; grid-template-columns:repeat(14,1fr) !important;
  bottom:calc(8px + var(--em-safe-b)) !important; right:8px !important; }
body.em-landscape #empanel{ width:min(40vw,320px) !important; max-height:78vh !important;
  bottom:calc(64px + var(--em-safe-b)) !important; right:8px !important; }
body.em-landscape #emchat{ width:min(34vw,340px) !important; height:140px; left:8px !important; }
body.em-landscape #dlg{ bottom:calc(64px + var(--em-safe-b)) !important; max-height:48vh; }

/* small phones: shrink chrome a touch more */
@media (max-width:380px){
  body.em-portrait #emchat{ width:58vw !important; height:112px; }
  #emtabs button{ font-size:16px; }
}
`;

/* ----------------------------------------------------------- helpers */
function $(id){ return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
function isVisible(el){ return !!el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none'; }

export function initMobileUI(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (window.EMUI) return window.EMUI;

  window.EMHAPTIC = window.EMHAPTIC || makeHaptics();

  // inject our stylesheet (after hud.js's, so equal-specificity rules win)
  const st = document.createElement('style');
  st.id = 'em-mobile-ui';
  st.textContent = CSS;
  document.head.appendChild(st);

  /* ---------- orientation ---------- */
  function detectOrientation(){
    const portrait = (typeof matchMedia === 'function')
      ? matchMedia('(orientation: portrait)').matches
      : (innerHeight >= innerWidth);
    document.body.classList.toggle('em-portrait', portrait);
    document.body.classList.toggle('em-landscape', !portrait);
    return portrait ? 'portrait' : 'landscape';
  }
  let orientation = detectOrientation();
  const onResize = () => { orientation = detectOrientation(); };
  addEventListener('resize', onResize, { passive: true });
  addEventListener('orientationchange', onResize, { passive: true });

  /* ---------- chat collapse ---------- */
  function wireChat(){
    const chat = $('emchat');
    if (!chat || $('emchat-bar')) return !!chat;
    const bar = document.createElement('div');
    bar.id = 'emchat-bar';
    bar.innerHTML = 'Chat <span class="em-ct">▾</span>';
    chat.insertBefore(bar, chat.firstChild);
    bar.addEventListener('click', () => {
      const collapsed = chat.classList.toggle('em-collapsed');
      bar.querySelector('.em-ct').textContent = collapsed ? '▴' : '▾';
      window.EMHAPTIC.tap();
    });
    return true;
  }

  /* ---------- objective auto-hide ---------- */
  let objTimer = null;
  function objHideMs(){ return Number(window.EM_OBJ_MS) > 0 ? Number(window.EM_OBJ_MS) : OBJ_HIDE_MS_DEFAULT; }
  function showObjective(){
    const o = $('emobj'); if (!o) return;
    o.classList.remove('em-hidden');
    if (objTimer) clearTimeout(objTimer);
    objTimer = setTimeout(() => { const e = $('emobj'); if (e) e.classList.add('em-hidden'); }, objHideMs());
  }
  function wireObjective(){
    const o = $('emobj'); if (!o) return false;
    o.addEventListener('click', () => { o.classList.toggle('em-hidden'); if (!o.classList.contains('em-hidden')) showObjective(); });
    // wrap EMHUD.setObjective so a new objective re-reveals + restarts the timer
    if (window.EMHUD && typeof window.EMHUD.setObjective === 'function' && !window.EMHUD.__emObjWrapped){
      const orig = window.EMHUD.setObjective.bind(window.EMHUD);
      window.EMHUD.setObjective = (t) => { orig(t); showObjective(); };
      window.EMHUD.__emObjWrapped = true;
    }
    showObjective();
    return true;
  }

  /* ---------- single active panel (tab panel <-> dialogue sheet) ---------- */
  function wireExclusivity(){
    const panel = $('empanel');
    const dlg = $('dlg');
    if (panel){
      // reflect tab-panel open state onto the body (CSS hides #dlg while open)
      const sync = () => document.body.classList.toggle('em-panel-open', panel.classList.contains('show'));
      new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['class'] });
      sync();
    }
    if (dlg && panel){
      // dialogue sheet open -> mark body (CSS yields chat) + close any open tab panel
      const dlgSync = () => {
        const open = isVisible(dlg);
        document.body.classList.toggle('em-dlg-open', open);
        if (open) panel.classList.remove('show');
      };
      new MutationObserver(dlgSync).observe(dlg, { attributes: true, attributeFilter: ['style'] });
      dlgSync();
    }
    return !!(panel && dlg);
  }

  /* ---------- haptics on EMUI-adjacent controls (additive, passive) ---------- */
  function wireHaptics(){
    const tabs = $('emtabs');
    if (tabs && !tabs.__emHaptic){
      tabs.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) window.EMHAPTIC.select(); }, { passive: true });
      tabs.__emHaptic = true;
    }
  }

  // Some targets (#emchat etc.) exist immediately after initHud(); others (the
  // HUD finishes async). Poll briefly until everything is wired, then stop.
  let tries = 0;
  function wireAll(){
    const a = wireChat();
    const b = wireObjective();
    const c = wireExclusivity();
    wireHaptics();
    if ((a && b && c) || ++tries > 40) return;   // wired, or give up after ~6s
    setTimeout(wireAll, 150);
  }
  wireAll();

  window.EMUI = {
    orientation(){ return orientation; },
    refreshOrientation(){ return (orientation = detectOrientation()); },
    collapseChat(v){ const c = $('emchat'); if (!c) return; c.classList.toggle('em-collapsed', !!v);
      const ct = document.querySelector('#emchat-bar .em-ct'); if (ct) ct.textContent = c.classList.contains('em-collapsed') ? '▴' : '▾'; },
    showObjective,
    haptics: window.EMHAPTIC,
  };
  return window.EMUI;
}

export default initMobileUI;
