/* =====================================================================
   ELDERMOOR - Settings tab module (ST1-5). Owns the in-game Settings
   interface tab via the HUD tab registry hook:

       window.EMTABS['settings'] = (panel, state) => { ... }

   Renders entirely from data: window.EMDATA.settings (loaded from
   assets/data/settings.json), of the shape:

       { version, groups: [ { id, label, settings: [ ctl, ... ] } ] }

   where each ctl is one of:
       { id, label, type:'toggle',  default:bool }
       { id, label, type:'slider',  default:num, min, max, step }
       { id, label, type:'select',  default:str, options:[{value,label}] }

   The tab shows a sub-tab row (Display / Audio / Chat / Controls - one
   per group) and the controls for the active group, each reflecting its
   current persisted value.

   Persistence: every value is stored in window.EMSETTINGS, a small
   { get(id), set(id, v), all() } facade created on window here, backed by
   localStorage under the key 'eldermoor:settings'. Saved values are loaded
   on init; defaults from EMDATA fill any gaps.

   Audio bridge: when an audio-group slider changes, we call
   window.EMAUDIO.setVolume(bus, v/100) if present, mapping the control id
   to a mixer bus (masterVolume->master, musicVolume->music, sfxVolume->sfx).

   Graceful no-op: if EMDATA.settings is absent the tab shows a "loading"
   notice and re-renders on the 'em-data-ready' event. Nothing here throws
   if optional globals (EMAUDIO, EMHUD, localStorage) are missing.

   Exposes:
       export function initSettingsTab()   // call once from main.js
   No other files are edited; main.js wires this in.
   ===================================================================== */

const STORE_KEY = 'eldermoor:settings';

// Map an audio control id -> mixer bus understood by EMAUDIO.setVolume.
const AUDIO_BUS = {
  masterVolume: 'master',
  musicVolume:  'music',
  sfxVolume:    'sfx',
};

// Map an audio mute toggle id -> mixer bus understood by EMAUDIO.mute().
// (areaMute has no dedicated EMAUDIO bus yet - area/ambient one-shots route
// through sfx - so it is intentionally left unmapped: persisted but inert.)
const MUTE_BUS = {
  masterMute: 'master',
  musicMute:  'music',
  sfxMute:    'sfx',
};

/* --------------------------------------------------------- data access */
// EMDATA may load after init; always read it lazily, never cache.
function settingsData(){
  const d = (typeof window !== 'undefined') && window.EMDATA;
  const s = d && d.settings;
  if(s && Array.isArray(s.groups)) return s;
  return null;
}

// Flatten all control defs across groups -> { id: ctl } for lookups.
function indexControls(data){
  const idx = {};
  if(!data) return idx;
  for(const g of data.groups){
    if(!g || !Array.isArray(g.settings)) continue;
    for(const c of g.settings){ if(c && c.id != null) idx[c.id] = c; }
  }
  return idx;
}

/* ----------------------------------------------- EMSETTINGS persistence
   A tiny store: values live in memory and mirror to localStorage. get()
   falls back to the EMDATA default for a known control; set() coerces and
   persists. Reads are defensive so a corrupt/blocked store never throws. */
function buildStore(){
  if(typeof window === 'undefined') return null;
  if(window.EMSETTINGS && typeof window.EMSETTINGS.get === 'function'){
    return window.EMSETTINGS;                  // already created (idempotent)
  }

  let values = loadRaw();                       // { id: value } from disk

  function loadRaw(){
    try {
      const raw = window.localStorage && window.localStorage.getItem(STORE_KEY);
      if(!raw) return {};
      const obj = JSON.parse(raw);
      return (obj && typeof obj === 'object') ? obj : {};
    } catch(_){ return {}; }                    // private mode / quota / bad JSON
  }
  function persist(){
    try {
      if(window.localStorage) window.localStorage.setItem(STORE_KEY, JSON.stringify(values));
    } catch(_){ /* storage unavailable - keep in-memory only */ }
  }
  function defaultFor(id){
    const c = indexControls(settingsData())[id];
    return c ? c.default : undefined;
  }

  const api = {
    // Current value for id; saved value wins, else the data default, else undefined.
    get(id){
      if(Object.prototype.hasOwnProperty.call(values, id)) return values[id];
      return defaultFor(id);
    },
    // Store + persist a new value (immutable update - new object, no mutation).
    // Also broadcasts 'em-settings-change' ({id, value}) on window so any
    // module (rendering/engine/world - none of which this file touches) can
    // opt in to applying a setting live without this module knowing about it.
    set(id, v){
      values = { ...values, [id]: v };
      persist();
      try {
        if(typeof window !== 'undefined' && typeof window.dispatchEvent === 'function'){
          window.dispatchEvent(new CustomEvent('em-settings-change', { detail:{ id, value:v } }));
        }
      } catch(_){ /* event dispatch optional */ }
      return v;
    },
    // Snapshot of every known control\'s effective value (defaults merged in).
    all(){
      const out = {};
      const idx = indexControls(settingsData());
      for(const id of Object.keys(idx)) out[id] = api.get(id);
      // include any stored ids not currently in EMDATA (forward-compat)
      for(const id of Object.keys(values)){
        if(!(id in out)) out[id] = values[id];
      }
      return out;
    },
  };

  window.EMSETTINGS = api;
  return api;
}

/* ------------------------------------------------------------ value I/O */
function coerce(ctl, raw){
  if(ctl.type === 'toggle') return !!raw;
  if(ctl.type === 'slider'){
    let n = Number(raw);
    if(!isFinite(n)) n = Number(ctl.default) || 0;
    if(ctl.min != null) n = Math.max(Number(ctl.min), n);
    if(ctl.max != null) n = Math.min(Number(ctl.max), n);
    return n;
  }
  // select / fallback: keep as string, but reject unknown options.
  if(ctl.type === 'select' && Array.isArray(ctl.options)){
    const ok = ctl.options.some(o => String(o.value) === String(raw));
    return ok ? String(raw) : String(ctl.default);
  }
  return raw;
}

// Effective current value for a control (store value coerced to its type).
function currentValue(store, ctl){
  const raw = store ? store.get(ctl.id) : ctl.default;
  return coerce(ctl, raw == null ? ctl.default : raw);
}

// Side-effect bridge to the audio mixer for audio-group sliders + mute
// toggles. Volume sliders -> EMAUDIO.setVolume(bus, 0..1); mute toggles ->
// EMAUDIO.mute(bus, bool). Both are guarded so a missing/optional EMAUDIO
// never breaks the settings UI.
function maybeAudio(groupId, ctl, value){
  if(groupId !== 'audio') return;
  const a = (typeof window !== 'undefined') && window.EMAUDIO;
  if(!a) return;
  if(ctl.type === 'slider'){
    const bus = AUDIO_BUS[ctl.id];
    if(!bus || typeof a.setVolume !== 'function') return;
    try { a.setVolume(bus, Number(value) / 100); } catch(_){ /* audio optional */ }
  } else if(ctl.type === 'toggle'){
    const bus = MUTE_BUS[ctl.id];
    if(!bus || typeof a.mute !== 'function') return;
    try { a.mute(bus, !!value); } catch(_){ /* audio optional */ }
  }
}

function emLog(text){
  try {
    if(typeof window !== 'undefined' && window.EMHUD && typeof window.EMHUD.addChat === 'function'){
      window.EMHUD.addChat(text, '', true);
    }
  } catch(_){ /* HUD optional */ }
}

/* ----------------------------------------------------------------- CSS */
function injectCss(){
  if(typeof document === 'undefined') return;
  if(document.getElementById('emset-style')) return;
  const css = `
  .emset{font-family:"Trebuchet MS",sans-serif;color:#f3e9cf;}
  .emset h4{margin:0 0 8px;color:#e7c64f;font-size:14px;letter-spacing:.04em;
    text-shadow:0 1px 2px #000;}
  .emset-subtabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;
    border-bottom:1px solid #4a3a26;padding-bottom:8px;}
  .emset-subtab{flex:1 1 auto;min-width:60px;padding:5px 8px;cursor:pointer;
    text-align:center;background:linear-gradient(#332a1d,#272019);color:#cdbf9c;
    border:1px solid #4a3a26;border-radius:5px;font-size:11px;font-weight:bold;
    letter-spacing:.03em;user-select:none;}
  .emset-subtab:hover{border-color:#8a6f3a;color:#f3e9cf;}
  .emset-subtab.on{background:linear-gradient(#5a4a2a,#3a2e1f);color:#fff;
    border-color:#e7c64f;}
  .emset-list{display:flex;flex-direction:column;gap:7px;}
  .emset-row{display:flex;align-items:center;gap:10px;justify-content:space-between;
    background:rgba(33,29,24,.55);border:1px solid #3a2e1f;border-radius:6px;
    padding:7px 10px;}
  .emset-row label.lbl{flex:1 1 auto;font-size:12px;color:#e3d6b8;line-height:1.3;}
  .emset-ctl{flex:0 0 auto;display:flex;align-items:center;gap:8px;}
  /* toggle switch */
  .emset-sw{position:relative;width:40px;height:22px;flex:0 0 auto;cursor:pointer;}
  .emset-sw input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;}
  .emset-sw .track{position:absolute;inset:0;background:#2b2620;border:1px solid #4a3a26;
    border-radius:12px;transition:background .12s,border-color .12s;}
  .emset-sw .knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;
    background:#cdbf9c;transition:transform .12s,background .12s;box-shadow:0 1px 2px #0008;}
  .emset-sw input:checked ~ .track{background:#3f6f3a;border-color:#e7c64f;}
  .emset-sw input:checked ~ .knob{transform:translateX(18px);background:#fff;}
  /* slider */
  .emset-slider{display:flex;align-items:center;gap:8px;}
  .emset-slider input[type=range]{width:120px;accent-color:#e7c64f;cursor:pointer;}
  .emset-slider .val{min-width:30px;text-align:right;font-size:11px;color:#e7c64f;
    font-weight:bold;font-variant-numeric:tabular-nums;}
  /* select */
  .emset-select{background:#272019;color:#f3e9cf;border:1px solid #4a3a26;border-radius:5px;
    padding:4px 6px;font-size:11px;font-family:inherit;cursor:pointer;}
  .emset-select:hover{border-color:#8a6f3a;}
  .emset-empty{font-size:12px;color:#bdac86;padding:10px 4px;line-height:1.5;}
  `;
  const st = document.createElement('style');
  st.id = 'emset-style';
  st.textContent = css;
  document.head.appendChild(st);
}

/* -------------------------------------------------------- control render
   Each builder returns a DOM node and wires its own change handler, which
   coerces -> persists via EMSETTINGS -> fires any audio side-effect. */
function buildToggle(store, groupId, ctl){
  const wrap = document.createElement('label');
  wrap.className = 'emset-sw';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!currentValue(store, ctl);
  const track = document.createElement('span'); track.className = 'track';
  const knob  = document.createElement('span'); knob.className = 'knob';
  wrap.appendChild(input); wrap.appendChild(track); wrap.appendChild(knob);
  input.addEventListener('change', () => {
    const v = coerce(ctl, input.checked);
    if(store) store.set(ctl.id, v);
    maybeAudio(groupId, ctl, v);
  });
  return wrap;
}

function buildSlider(store, groupId, ctl){
  const wrap = document.createElement('div');
  wrap.className = 'emset-slider';
  const input = document.createElement('input');
  input.type = 'range';
  if(ctl.min  != null) input.min  = String(ctl.min);
  if(ctl.max  != null) input.max  = String(ctl.max);
  if(ctl.step != null) input.step = String(ctl.step);
  const val = document.createElement('span');
  val.className = 'val';
  const cur = currentValue(store, ctl);
  input.value = String(cur);
  val.textContent = String(cur);
  input.addEventListener('input', () => {
    const v = coerce(ctl, input.value);
    val.textContent = String(v);
    if(store) store.set(ctl.id, v);
    maybeAudio(groupId, ctl, v);
  });
  wrap.appendChild(input);
  wrap.appendChild(val);
  return wrap;
}

function buildSelect(store, groupId, ctl){
  const sel = document.createElement('select');
  sel.className = 'emset-select';
  const cur = String(currentValue(store, ctl));
  const opts = Array.isArray(ctl.options) ? ctl.options : [];
  for(const o of opts){
    const opt = document.createElement('option');
    opt.value = String(o.value);
    opt.textContent = o.label != null ? o.label : String(o.value);
    if(String(o.value) === cur) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => {
    const v = coerce(ctl, sel.value);
    if(store) store.set(ctl.id, v);
    maybeAudio(groupId, ctl, v);
  });
  return sel;
}

function buildControl(store, groupId, ctl){
  switch(ctl.type){
    case 'toggle': return buildToggle(store, groupId, ctl);
    case 'slider': return buildSlider(store, groupId, ctl);
    case 'select': return buildSelect(store, groupId, ctl);
    default: {
      // Unknown control type - render its value read-only rather than crash.
      const span = document.createElement('span');
      span.style.cssText = 'font-size:11px;color:#bdac86;';
      span.textContent = String(currentValue(store, ctl));
      return span;
    }
  }
}

function buildRow(store, groupId, ctl){
  const row = document.createElement('div');
  row.className = 'emset-row';
  const lbl = document.createElement('label');
  lbl.className = 'lbl';
  lbl.textContent = ctl.label != null ? ctl.label : ctl.id;
  const ctlWrap = document.createElement('div');
  ctlWrap.className = 'emset-ctl';
  ctlWrap.appendChild(buildControl(store, groupId, ctl));
  row.appendChild(lbl);
  row.appendChild(ctlWrap);
  return row;
}

/* ------------------------------------------------------------ tab render */
// Per-instance active sub-tab, keyed off the panel element so reopening
// the tab remembers the last group viewed for this session.
const activeGroupByPanel = new WeakMap();

function renderInto(panel, store){
  panel.innerHTML = '';
  panel.classList.add('emset');

  const data = settingsData();
  const title = document.createElement('h4');
  title.textContent = 'Settings';
  panel.appendChild(title);

  if(!data || !data.groups.length){
    const empty = document.createElement('div');
    empty.className = 'emset-empty';
    empty.textContent = 'Settings are loading...';
    panel.appendChild(empty);
    return;
  }

  // Resolve the active group (remembered, else first).
  let activeId = activeGroupByPanel.get(panel);
  if(!data.groups.some(g => g.id === activeId)) activeId = data.groups[0].id;
  activeGroupByPanel.set(panel, activeId);

  // ---- sub-tab row (one per group) ----
  const subtabs = document.createElement('div');
  subtabs.className = 'emset-subtabs';
  for(const g of data.groups){
    const tab = document.createElement('div');
    tab.className = 'emset-subtab' + (g.id === activeId ? ' on' : '');
    tab.textContent = g.label != null ? g.label : g.id;
    tab.addEventListener('click', () => {
      activeGroupByPanel.set(panel, g.id);
      renderInto(panel, store);
    });
    subtabs.appendChild(tab);
  }
  panel.appendChild(subtabs);

  // ---- controls for the active group ----
  const group = data.groups.find(g => g.id === activeId);
  const list = document.createElement('div');
  list.className = 'emset-list';
  const ctls = (group && Array.isArray(group.settings)) ? group.settings : [];
  if(!ctls.length){
    const empty = document.createElement('div');
    empty.className = 'emset-empty';
    empty.textContent = 'No options in this category.';
    list.appendChild(empty);
  } else {
    for(const ctl of ctls){
      if(!ctl || ctl.id == null) continue;
      list.appendChild(buildRow(store, group.id, ctl));
    }
  }
  panel.appendChild(list);
}

/* ----------------------------------------------------------- public init */
export function initSettingsTab(){
  if(typeof window === 'undefined') return null;
  injectCss();

  const store = buildStore();

  // On startup, push any saved (or default) audio volumes + mutes into the
  // mixer so the live game matches the persisted settings without a user
  // interaction.
  function syncAudio(){
    const data = settingsData();
    if(!data) return;
    const audio = data.groups.find(g => g.id === 'audio');
    if(!audio || !Array.isArray(audio.settings)) return;
    for(const ctl of audio.settings){
      if(!ctl) continue;
      if((ctl.type === 'slider' && AUDIO_BUS[ctl.id]) ||
         (ctl.type === 'toggle' && MUTE_BUS[ctl.id])){
        maybeAudio('audio', ctl, currentValue(store, ctl));
      }
    }
  }
  syncAudio();

  /* ---------------------------------------------- TAB REGISTRY HOOK (EMTABS) */
  // Renders into the HUD\'s shared panel whenever the 'settings' tab is shown.
  window.EMTABS = window.EMTABS || {};
  window.EMTABS['settings'] = (panel /*, state */) => {
    if(panel) renderInto(panel, store);
  };

  // If EMDATA arrives after init, re-sync audio and re-render an open tab.
  function onDataReady(){
    syncAudio();
    try {
      if(window.EMHUD && typeof window.EMHUD.curTab === 'function' &&
         window.EMHUD.curTab() === 'settings' && typeof window.EMHUD.refresh === 'function'){
        window.EMHUD.refresh();
      }
    } catch(_){ /* HUD optional */ }
  }
  window.addEventListener('em-data-ready', onDataReady);

  emLog('Settings ready.');

  return {
    render: (panel) => renderInto(panel, store),
    store,
  };
}
