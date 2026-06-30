/* =====================================================================
   ELDERMOOR - Character Creation screen (CC1-3 / L0).

   A full-screen, OSRS-style character designer shown on first load when
   no appearance has been saved. Renders entirely from data:

       window.EMDATA.appearance   (assets/data/appearance.json)

   of the shape:

       {
         version,
         parts:   { head:[{id,label}], torso, arms, hands, legs, feet },
         colours: { skin:[hex,...], hair, torso, legs, feet },
         bodyTypes: ["A","B", ...],
         pronouns: [{id,label}, ...]
       }

   UI: for each part (head/torso/arms/hands/legs/feet) a Previous/Next
   cycler; for each colour group a swatch row; body type and pronoun are
   shown as cyclers too. A Confirm button commits the choice.

   On Confirm the chosen appearance is:
     - persisted to localStorage under 'eldermoor:appearance',
     - mirrored onto window.EMAPPEARANCE,
     - announced via window.dispatchEvent(new CustomEvent('em-appearance',
       { detail })),
   then the panel is removed (game continues).

   First-load gate: if a valid appearance is already saved, the screen is
   never shown (we skip straight to the game). A re-open hook is exposed:

       window.EMCHARCREATE = { open() }

   Graceful no-op: if EMDATA.appearance is absent when init runs, we wait
   for the 'em-data-ready' event and try again. Nothing here throws if
   optional globals (localStorage, EMDATA) are missing.

   Exposes:
       export function initCharCreate()   // call once from main.js
   No other files are edited; main.js wires this in.
   ===================================================================== */

const STORE_KEY = 'eldermoor:appearance';
const STYLE_ID  = 'em-charcreate-style';
const ROOT_ID   = 'em-charcreate';

// Part keys, in display order. Each maps to EMDATA.appearance.parts[key].
const PART_KEYS = ['head', 'torso', 'arms', 'hands', 'legs', 'feet'];
const PART_LABELS = {
  head:  'Head',
  torso: 'Torso',
  arms:  'Arms',
  hands: 'Hands',
  legs:  'Legs',
  feet:  'Feet',
};

// Colour groups, in display order. Each maps to appearance.colours[key].
const COLOUR_KEYS = ['skin', 'hair', 'torso', 'legs', 'feet'];
const COLOUR_LABELS = {
  skin:  'Skin',
  hair:  'Hair',
  torso: 'Torso colour',
  legs:  'Legs colour',
  feet:  'Feet colour',
};

/* --------------------------------------------------------- data access */
// EMDATA may load after init; always read it lazily, never cache.
function appearanceData(){
  const d = (typeof window !== 'undefined') && window.EMDATA;
  const a = d && d.appearance;
  if(a && a.parts && a.colours) return a;
  return null;
}

/* ------------------------------------------------------ persistence */
function readSaved(){
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    // Minimal shape check: must carry the part selections.
    if(obj && obj.parts && typeof obj.parts === 'object') return obj;
    return null;
  } catch(e){
    return null;
  }
}

function writeSaved(appearance){
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(appearance));
  } catch(e){
    /* private mode / quota - non-fatal, still mirror + dispatch below */
  }
}

/* ------------------------------------------------ default selection */
// Build a fresh selection (first option of every cycler/swatch) from data.
function defaultSelection(data){
  const parts = {};
  for(const key of PART_KEYS){
    const list = Array.isArray(data.parts[key]) ? data.parts[key] : [];
    parts[key] = list.length ? list[0].id : null;
  }
  const colours = {};
  for(const key of COLOUR_KEYS){
    const list = Array.isArray(data.colours[key]) ? data.colours[key] : [];
    colours[key] = list.length ? list[0] : null;
  }
  const bodyTypes = Array.isArray(data.bodyTypes) ? data.bodyTypes : [];
  const pronouns  = Array.isArray(data.pronouns)  ? data.pronouns  : [];
  return {
    version: data.version || 1,
    name: '',
    parts,
    colours,
    bodyType: bodyTypes.length ? bodyTypes[0] : null,
    pronoun:  pronouns.length  ? pronouns[0].id : null,
  };
}

/* ------------------------------------------------ name validation */
// Tutorial-Island display name: 1-12 chars, letters/digits/single spaces.
function validateName(raw){
  const collapsed = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  if(!collapsed)               return { ok:false, value:'', error:'Enter a name.' };
  if(collapsed.length > 12)    return { ok:false, value:collapsed, error:'Max 12 characters.' };
  if(!/^[A-Za-z0-9 ]+$/.test(collapsed)) return { ok:false, value:collapsed, error:'Letters, numbers and spaces only.' };
  return { ok:true, value:collapsed, error:'' };
}

/* --------------------------------------------------------- CSS inject */
function injectCSS(){
  if(document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
#${ROOT_ID}{
  position:fixed; inset:0; z-index:9000;
  display:flex; align-items:center; justify-content:center;
  background:radial-gradient(circle at 50% 30%, #2b2316 0%, #15110a 70%, #0b0805 100%);
  font-family:'Trebuchet MS','Segoe UI',sans-serif; color:#efe3c8;
  -webkit-user-select:none; user-select:none;
}
#${ROOT_ID} *{ box-sizing:border-box; }
#${ROOT_ID} .em-cc-panel{
  width:min(560px, 94vw); max-height:94vh; overflow:auto;
  background:linear-gradient(#3b2f1c,#2a2112);
  border:3px solid #6b5326; border-radius:10px;
  box-shadow:0 10px 40px rgba(0,0,0,.6), inset 0 0 0 1px #0006;
  padding:18px 20px 16px;
}
#${ROOT_ID} .em-cc-title{
  text-align:center; font-size:22px; font-weight:bold; letter-spacing:.5px;
  color:#f4d27a; text-shadow:1px 1px 0 #000; margin:0 0 4px;
}
#${ROOT_ID} .em-cc-sub{
  text-align:center; font-size:12px; color:#c8b487; margin:0 0 14px;
}
#${ROOT_ID} .em-cc-row{
  display:flex; align-items:center; gap:8px;
  padding:6px 8px; margin:4px 0;
  background:#0003; border:1px solid #00000040; border-radius:6px;
}
#${ROOT_ID} .em-cc-row > .em-cc-lbl{
  width:108px; flex:0 0 108px; font-size:13px; color:#d9c79a;
}
#${ROOT_ID} .em-cc-cyc{
  display:flex; align-items:center; gap:6px; flex:1 1 auto; min-width:0;
}
#${ROOT_ID} .em-cc-val{
  flex:1 1 auto; text-align:center; font-size:13px; color:#fff;
  background:#1c160c; border:1px solid #00000060; border-radius:5px;
  padding:5px 6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
#${ROOT_ID} .em-cc-btn{
  cursor:pointer; border:1px solid #6b5326; background:linear-gradient(#5a481f,#3c3015);
  color:#f4d27a; font-weight:bold; border-radius:5px; padding:5px 10px;
  font-size:14px; line-height:1; min-width:30px;
}
#${ROOT_ID} .em-cc-btn:hover{ background:linear-gradient(#6e5825,#473819); }
#${ROOT_ID} .em-cc-btn:active{ transform:translateY(1px); }
#${ROOT_ID} .em-cc-swatches{
  display:flex; flex-wrap:wrap; gap:6px; flex:1 1 auto;
}
#${ROOT_ID} .em-cc-sw{
  width:24px; height:24px; border-radius:5px; cursor:pointer;
  border:2px solid #00000080; box-shadow:inset 0 0 0 1px #ffffff20;
}
#${ROOT_ID} .em-cc-sw[aria-selected="true"]{
  border-color:#f4d27a; box-shadow:0 0 0 2px #f4d27a55, inset 0 0 0 1px #ffffff40;
}
#${ROOT_ID} .em-cc-confirm{
  display:block; width:100%; margin-top:16px;
  cursor:pointer; border:2px solid #2e7d32;
  background:linear-gradient(#3e9b43,#2c6e30); color:#fff;
  font-weight:bold; font-size:16px; letter-spacing:.5px;
  border-radius:7px; padding:11px; text-shadow:1px 1px 0 #0008;
}
#${ROOT_ID} .em-cc-confirm:hover{ background:linear-gradient(#46ad4b,#327a37); }
#${ROOT_ID} .em-cc-confirm:active{ transform:translateY(1px); }
#${ROOT_ID} .em-cc-empty{
  text-align:center; color:#c8b487; font-size:13px; padding:30px 10px;
}
#${ROOT_ID} .em-cc-name{
  width:100%; margin:2px 0 6px; padding:11px 12px; font-size:16px;
  color:#fff; background:#1c160c; border:2px solid #6b5326; border-radius:6px;
  font-family:inherit; min-height:44px;
}
#${ROOT_ID} .em-cc-name:focus{ outline:none; border-color:#f4d27a; }
#${ROOT_ID} .em-cc-name.em-bad{ border-color:#c0473a; }
#${ROOT_ID} .em-cc-err{
  min-height:15px; margin:-2px 0 6px; font-size:12px; color:#e88; text-align:center;
}
`;
  document.head.appendChild(st);
}

/* ------------------------------------------------- cycler builder */
// Build a Prev/Next cycler row over `options` (array). `current` is the
// initial value; `valueOf(opt)` -> stored value; `textOf(opt)` -> display.
// `onChange(value)` fires on each step.
function buildCycler(label, options, current, valueOf, textOf, onChange){
  const row = document.createElement('div');
  row.className = 'em-cc-row';

  const lbl = document.createElement('div');
  lbl.className = 'em-cc-lbl';
  lbl.textContent = label;
  row.appendChild(lbl);

  const cyc = document.createElement('div');
  cyc.className = 'em-cc-cyc';

  const prev = document.createElement('button');
  prev.className = 'em-cc-btn';
  prev.type = 'button';
  prev.textContent = '◀';            // ◀
  prev.setAttribute('aria-label', 'Previous ' + label);

  const val = document.createElement('div');
  val.className = 'em-cc-val';

  const next = document.createElement('button');
  next.className = 'em-cc-btn';
  next.type = 'button';
  next.textContent = '▶';            // ▶
  next.setAttribute('aria-label', 'Next ' + label);

  // Find starting index by matching stored value.
  let idx = Math.max(0, options.findIndex(o => valueOf(o) === current));
  if(idx < 0) idx = 0;

  const paint = () => {
    const opt = options[idx];
    val.textContent = opt != null ? textOf(opt) : '-';
  };

  const step = (dir) => {
    if(!options.length) return;
    idx = (idx + dir + options.length) % options.length;
    paint();
    onChange(valueOf(options[idx]));
  };

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(+1));

  paint();
  cyc.appendChild(prev);
  cyc.appendChild(val);
  cyc.appendChild(next);
  row.appendChild(cyc);
  return row;
}

/* ------------------------------------------------ swatch row builder */
function buildSwatches(label, colours, current, onChange){
  const row = document.createElement('div');
  row.className = 'em-cc-row';

  const lbl = document.createElement('div');
  lbl.className = 'em-cc-lbl';
  lbl.textContent = label;
  row.appendChild(lbl);

  const wrap = document.createElement('div');
  wrap.className = 'em-cc-swatches';

  const cells = [];
  const select = (hex) => {
    onChange(hex);
    cells.forEach(c => c.setAttribute('aria-selected', String(c.dataset.hex === hex)));
  };

  colours.forEach(hex => {
    const sw = document.createElement('div');
    sw.className = 'em-cc-sw';
    sw.dataset.hex = hex;
    sw.style.background = hex;
    sw.setAttribute('role', 'button');
    sw.setAttribute('aria-label', label + ' ' + hex);
    sw.setAttribute('aria-selected', String(hex === current));
    sw.addEventListener('click', () => select(hex));
    cells.push(sw);
    wrap.appendChild(sw);
  });

  row.appendChild(wrap);
  return row;
}

/* --------------------------------------------------------- the panel */
function buildPanel(data, onConfirm){
  // Working selection, seeded from defaults (first of everything).
  const sel = defaultSelection(data);

  const root = document.createElement('div');
  root.id = ROOT_ID;

  const panel = document.createElement('div');
  panel.className = 'em-cc-panel';

  const title = document.createElement('h2');
  title.className = 'em-cc-title';
  title.textContent = 'Design Your Adventurer';
  panel.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'em-cc-sub';
  sub.textContent = 'Name your adventurer and choose a look, then confirm to enter Eldermoor.';
  panel.appendChild(sub);

  // Name entry (validated on Confirm).
  const nameInput = document.createElement('input');
  nameInput.className = 'em-cc-name';
  nameInput.type = 'text';
  nameInput.maxLength = 12;
  nameInput.placeholder = 'Character name';
  nameInput.setAttribute('aria-label', 'Character name');
  nameInput.autocomplete = 'off';
  nameInput.spellcheck = false;
  nameInput.addEventListener('input', () => {
    sel.name = nameInput.value;
    nameInput.classList.remove('em-bad');
    errEl.textContent = '';
  });
  panel.appendChild(nameInput);

  const errEl = document.createElement('div');
  errEl.className = 'em-cc-err';
  panel.appendChild(errEl);

  // Part cyclers (head/torso/arms/hands/legs/feet).
  for(const key of PART_KEYS){
    const list = Array.isArray(data.parts[key]) ? data.parts[key] : [];
    if(!list.length) continue;
    panel.appendChild(buildCycler(
      PART_LABELS[key],
      list,
      sel.parts[key],
      o => o.id,
      o => o.label,
      v => { sel.parts[key] = v; }
    ));
  }

  // Colour swatch rows.
  for(const key of COLOUR_KEYS){
    const list = Array.isArray(data.colours[key]) ? data.colours[key] : [];
    if(!list.length) continue;
    panel.appendChild(buildSwatches(
      COLOUR_LABELS[key],
      list,
      sel.colours[key],
      v => { sel.colours[key] = v; }
    ));
  }

  // Body type cycler.
  const bodyTypes = Array.isArray(data.bodyTypes) ? data.bodyTypes : [];
  if(bodyTypes.length){
    panel.appendChild(buildCycler(
      'Body type',
      bodyTypes,
      sel.bodyType,
      o => o,
      o => 'Type ' + o,
      v => { sel.bodyType = v; }
    ));
  }

  // Pronoun cycler.
  const pronouns = Array.isArray(data.pronouns) ? data.pronouns : [];
  if(pronouns.length){
    panel.appendChild(buildCycler(
      'Pronouns',
      pronouns,
      sel.pronoun,
      o => o.id,
      o => o.label,
      v => { sel.pronoun = v; }
    ));
  }

  // Confirm.
  const confirm = document.createElement('button');
  confirm.className = 'em-cc-confirm';
  confirm.type = 'button';
  confirm.textContent = 'Confirm';
  confirm.addEventListener('click', () => {
    const v = validateName(sel.name);
    if(!v.ok){
      nameInput.classList.add('em-bad');
      errEl.textContent = v.error;
      nameInput.focus();
      if(window.EMHAPTIC && window.EMHAPTIC.error) window.EMHAPTIC.error();
      return;
    }
    sel.name = v.value;                 // store the normalised name
    if(window.EMHAPTIC && window.EMHAPTIC.success) window.EMHAPTIC.success();
    onConfirm(sel);
  });
  panel.appendChild(confirm);

  root.appendChild(panel);
  return root;
}

/* ----------------------------------------------------- empty fallback */
function buildEmptyPanel(){
  const root = document.createElement('div');
  root.id = ROOT_ID;
  const panel = document.createElement('div');
  panel.className = 'em-cc-panel';
  const msg = document.createElement('div');
  msg.className = 'em-cc-empty';
  msg.textContent = 'Loading character designer...';
  panel.appendChild(msg);
  root.appendChild(panel);
  return root;
}

/* ------------------------------------------------------- open / close */
function close(){
  const existing = document.getElementById(ROOT_ID);
  if(existing && existing.parentNode) existing.parentNode.removeChild(existing);
}

// Open the creator. Returns true if a panel was shown, false if data was
// absent (caller may wait for em-data-ready and retry).
function open(){
  injectCSS();
  close(); // never stack two panels

  const data = appearanceData();
  if(!data){
    // No data yet - show a placeholder and let init\'s listener re-open.
    document.body.appendChild(buildEmptyPanel());
    return false;
  }

  const commit = (sel) => {
    const appearance = {
      version:  sel.version,
      name:     sel.name,
      parts:    Object.assign({}, sel.parts),
      colours:  Object.assign({}, sel.colours),
      bodyType: sel.bodyType,
      pronoun:  sel.pronoun,
      createdAt: Date.now(),
    };
    writeSaved(appearance);
    // also persist the name on its own key + global for HUD/dialogue convenience
    try { window.localStorage.setItem('eldermoor:name', sel.name); } catch(e){ /* ignore */ }
    try { window.EMNAME = sel.name; } catch(e){ /* ignore */ }
    try { window.EMAPPEARANCE = appearance; } catch(e){ /* ignore */ }
    try {
      window.dispatchEvent(new CustomEvent('em-appearance', { detail: appearance }));
    } catch(e){ /* CustomEvent unsupported - non-fatal */ }
    close();
  };

  document.body.appendChild(buildPanel(data, commit));
  return true;
}

/* --------------------------------------------------------------- init */
export function initCharCreate(){
  if(typeof window === 'undefined' || typeof document === 'undefined') return;

  // Re-open hook for later (e.g. a "redesign" button in settings).
  window.EMCHARCREATE = { open };

  // If an appearance is already saved, mirror it and skip the screen.
  const saved = readSaved();
  if(saved){
    try { window.EMAPPEARANCE = saved; } catch(e){ /* ignore */ }
    try { if(saved.name) window.EMNAME = saved.name; } catch(e){ /* ignore */ }
    return;
  }

  // First load: open the designer. If data isn\'t ready, retry once it is.
  const shown = open();
  if(!shown){
    const onReady = () => {
      // Only re-open if still un-chosen and the placeholder is still up.
      if(!readSaved() && document.getElementById(ROOT_ID)){
        open();
      }
      window.removeEventListener('em-data-ready', onReady);
    };
    window.addEventListener('em-data-ready', onReady);
  }
}
