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
// Tutorial-Island display name: 2-12 chars, letters/digits/single spaces.
const NAME_MIN = 2, NAME_MAX = 12;
function validateName(raw){
  const collapsed = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  if(!collapsed)                       return { ok:false, value:'', error:'Enter a name.' };
  if(collapsed.length < NAME_MIN)      return { ok:false, value:collapsed, error:'At least ' + NAME_MIN + ' characters.' };
  if(collapsed.length > NAME_MAX)      return { ok:false, value:collapsed, error:'Max ' + NAME_MAX + ' characters.' };
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
#${ROOT_ID} .em-cc-hint{
  margin:4px 0 2px; font-size:11px; color:#9a8c6c; text-align:center; letter-spacing:.02em;
}
#${ROOT_ID} .em-cc-hint.em-bad{ color:#e0a23a; }
#${ROOT_ID} .em-cc-preview{
  position:sticky; top:0; z-index:3; display:flex; justify-content:center; align-items:flex-end;
  background:linear-gradient(#2a2112,#16110a); border:1px solid #6b5326; border-radius:8px;
  padding:6px; margin:0 0 10px;
}
#${ROOT_ID} .em-cc-preview svg{ width:118px; height:196px; max-height:32vh; display:block; }
#${ROOT_ID} .em-cc-preview canvas{ width:100%; height:240px; max-height:34vh; display:block; border-radius:6px; }
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

/* ------------------------------------------------ live paper-doll preview
   A 2D SVG figure that updates as the player toggles parts/colours. It shows
   part SHAPES the current static 3D model can't (hood/beard, robe/tunic/yoke,
   skirt/trousers/breeches, boots/shoes/sandals, sleeves, body type) plus the
   chosen colours — so the creator has a real live preview now, independent of
   the parameterized-model work. Shapes carry pd-* classes for testability. */
const PD_DEF = { skin:'#e8b98e', hair:'#3a2a1c', torso:'#3f6f8c', legs:'#2f3742', feet:'#5a3f28' };
function pdCol(sel, k){ const c = sel && sel.colours && sel.colours[k]; return c || PD_DEF[k]; }
function pdDark(hex){
  try { const n = parseInt(String(hex).slice(1), 16); let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    r=(r*0.55)|0; g=(g*0.55)|0; b=(b*0.55)|0; return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }
  catch(e){ return '#222'; }
}
function paperDollSVG(sel){
  const p = (sel && sel.parts) || {};
  const head=String(p.head||''), torso=String(p.torso||''), arms=String(p.arms||''),
        hands=String(p.hands||''), legs=String(p.legs||''), feet=String(p.feet||'');
  const skin=pdCol(sel,'skin'), hair=pdCol(sel,'hair'), tcol=pdCol(sel,'torso'),
        lcol=pdCol(sel,'legs'), fcol=pdCol(sel,'feet');
  const hooded=/hood/.test(head), beard=/beard/.test(head), longB=/long/.test(head);
  const robe=/robe/.test(torso), yoke=/yoke/.test(torso), jerkin=/jerkin/.test(torso);
  const skirt=/skirt/.test(legs), breeches=/breech/.test(legs);
  const bare=/bare/.test(arms), wrapped=/wrap/.test(arms);
  const gloves=/glove/.test(hands), bracers=/bracer/.test(hands);
  const boots=/boot/.test(feet), sandals=/sandal/.test(feet);
  const wide = sel && sel.bodyType === 'B';
  const sw = wide?22:17, tx0=60-sw, tx1=60+sw, torsoBot = robe?152:106;
  const armCol = bare?skin:(wrapped?skin:tcol), handCol = gloves?pdDark(tcol):skin;
  const s = [];
  if(hooded) s.push(`<path class="pd-hood" d="M40 30 Q60 6 80 30 L80 46 Q60 36 40 46 Z" fill="${tcol}"/>`);
  else s.push(`<path class="pd-hair" d="M44 28 a16 16 0 0 1 32 0 q-16 -12 -32 0 z" fill="${hair}"/>`);
  s.push(`<circle class="pd-face" cx="60" cy="30" r="15" fill="${skin}"/>`);
  if(beard) s.push(`<rect class="pd-beard" x="48" y="34" width="24" height="${longB?16:9}" rx="5" fill="${hair}"/>`);
  s.push(`<rect x="56" y="43" width="8" height="9" fill="${skin}"/>`);
  s.push(`<rect class="pd-arm" x="${tx0-8}" y="54" width="7" height="46" rx="3" fill="${armCol}"/>`);
  s.push(`<rect class="pd-arm" x="${tx1+1}" y="54" width="7" height="46" rx="3" fill="${armCol}"/>`);
  if(wrapped){ for(let y=58;y<98;y+=10){ s.push(`<rect x="${tx0-8}" y="${y}" width="7" height="3" fill="${pdDark(skin)}"/>`); s.push(`<rect x="${tx1+1}" y="${y}" width="7" height="3" fill="${pdDark(skin)}"/>`);} }
  if(yoke) s.push(`<polygon class="pd-torso pd-yoke" points="${tx0-6},52 ${tx1+6},52 ${tx1},${torsoBot} ${tx0},${torsoBot}" fill="${tcol}"/>`);
  else s.push(`<rect class="pd-torso${robe?' pd-robe':''}" x="${tx0}" y="52" width="${tx1-tx0}" height="${torsoBot-52}" rx="5" fill="${tcol}"/>`);
  if(jerkin) s.push(`<rect class="pd-belt" x="${tx0}" y="${torsoBot-14}" width="${tx1-tx0}" height="4" fill="${pdDark(tcol)}"/>`);
  if(bracers){ s.push(`<rect x="${tx0-8}" y="98" width="7" height="4" fill="${pdDark(fcol)}"/>`); s.push(`<rect x="${tx1+1}" y="98" width="7" height="4" fill="${pdDark(fcol)}"/>`); }
  s.push(`<circle class="pd-hand" cx="${tx0-4}" cy="104" r="4.5" fill="${handCol}"/>`);
  s.push(`<circle class="pd-hand" cx="${tx1+4}" cy="104" r="4.5" fill="${handCol}"/>`);
  let footTop = robe?150:162;
  if(!robe){
    if(skirt){
      s.push(`<polygon class="pd-legs pd-skirt" points="${tx0+2},108 ${tx1-2},108 ${tx1+6},150 ${tx0-6},150" fill="${lcol}"/>`);
      s.push(`<rect x="51" y="150" width="8" height="12" fill="${skin}"/><rect x="61" y="150" width="8" height="12" fill="${skin}"/>`);
      footTop=160;
    } else if(breeches){
      s.push(`<rect class="pd-legs pd-breeches" x="50" y="108" width="9" height="32" fill="${lcol}"/><rect class="pd-legs pd-breeches" x="61" y="108" width="9" height="32" fill="${lcol}"/>`);
      s.push(`<rect x="51" y="140" width="8" height="22" fill="${skin}"/><rect x="61" y="140" width="8" height="22" fill="${skin}"/>`);
    } else {
      s.push(`<rect class="pd-legs pd-trousers" x="50" y="108" width="9" height="54" fill="${lcol}"/><rect class="pd-legs pd-trousers" x="61" y="108" width="9" height="54" fill="${lcol}"/>`);
    }
  }
  if(sandals){
    s.push(`<rect class="pd-feet pd-sandals" x="49" y="${footTop+8}" width="12" height="4" fill="${skin}"/><rect class="pd-feet pd-sandals" x="59" y="${footTop+8}" width="12" height="4" fill="${skin}"/>`);
    s.push(`<rect x="51" y="${footTop+4}" width="8" height="4" fill="${fcol}"/><rect x="61" y="${footTop+4}" width="8" height="4" fill="${fcol}"/>`);
  } else {
    const h = boots?16:9, y = footTop + (boots?0:7);
    s.push(`<rect class="pd-feet ${boots?'pd-boots':'pd-shoes'}" x="48" y="${y}" width="12" height="${h}" rx="2" fill="${fcol}"/>`);
    s.push(`<rect class="pd-feet ${boots?'pd-boots':'pd-shoes'}" x="60" y="${y}" width="12" height="${h}" rx="2" fill="${fcol}"/>`);
  }
  return `<svg viewBox="0 0 120 200" class="pd-svg" xmlns="http://www.w3.org/2000/svg">${s.join('')}</svg>`;
}
/* ---- live 3D preview: a small rotating render of the REAL in-world avatar
   (window.EMAVATAR.buildBody), built from the current selection. Falls back to
   the 2D SVG paper-doll if THREE / the avatar builder isn't available, so the
   creator can never break. */
let _pv = null;
function ensurePreview3D(host){
  const T = (typeof window !== 'undefined') && window.THREE;
  if(!T || !host) return null;
  if(_pv && _pv.host === host) return _pv;
  if(_pv){ try { cancelAnimationFrame(_pv.raf); _pv.renderer.dispose(); } catch(e){} _pv = null; }
  try {
    const W = host.clientWidth || 240, H = 240;
    const renderer = new T.WebGLRenderer({ alpha:true, antialias:true });
    renderer.setPixelRatio(Math.min((typeof devicePixelRatio!=='undefined'?devicePixelRatio:1), 2));
    renderer.setSize(W, H);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(34, W/H, 0.1, 100);
    camera.position.set(0, 1.15, 3.5); camera.lookAt(0, 0.95, 0);
    scene.add(new T.HemisphereLight(0xffffff, 0x3a3326, 1.15));
    const key = new T.DirectionalLight(0xfff0d8, 0.9); key.position.set(2.5, 4, 3); scene.add(key);
    const root = new T.Group(); scene.add(root);
    host.innerHTML = ''; host.appendChild(renderer.domElement);
    _pv = { host, renderer, scene, camera, root, raf:0, T };
    const tick = () => { _pv.raf = requestAnimationFrame(tick); root.rotation.y += 0.014; renderer.render(scene, camera); };
    tick();
    return _pv;
  } catch(e){ _pv = null; return null; }
}
function drawPreview(host, sel){
  try {
    const build = (typeof window !== 'undefined') && window.EMAVATAR && window.EMAVATAR.buildBody;
    if(build){
      const pv = ensurePreview3D(host);
      if(pv){
        while(pv.root.children.length) pv.root.remove(pv.root.children[0]);
        const r = build(sel);
        if(r && r.group){ pv.root.add(r.group); return; }
      }
    }
  } catch(e){ /* fall through to the 2D paper-doll */ }
  if(host) host.innerHTML = paperDollSVG(sel);
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

  // Live preview (sticky) — updates as parts/colours change.
  const preview = document.createElement('div');
  preview.className = 'em-cc-preview';
  panel.appendChild(preview);
  const redraw = () => drawPreview(preview, sel);
  redraw();

  // Name entry (validated on Confirm).
  const nameInput = document.createElement('input');
  nameInput.className = 'em-cc-name';
  nameInput.type = 'text';
  nameInput.maxLength = NAME_MAX;
  nameInput.placeholder = 'Character name';
  nameInput.setAttribute('aria-label', 'Character name');
  nameInput.autocomplete = 'off';
  nameInput.spellcheck = false;
  const updHint = () => {
    const len = String(nameInput.value || '').replace(/\s+/g, ' ').trim().length;
    hintEl.textContent = NAME_MIN + '–' + NAME_MAX + ' letters, numbers or spaces · ' + len + '/' + NAME_MAX;
    hintEl.classList.toggle('em-bad', len > 0 && len < NAME_MIN);
  };
  nameInput.addEventListener('input', () => {
    sel.name = nameInput.value;
    nameInput.classList.remove('em-bad');
    errEl.textContent = '';
    updHint();
  });
  panel.appendChild(nameInput);

  const hintEl = document.createElement('div');
  hintEl.className = 'em-cc-hint';
  panel.appendChild(hintEl);

  const errEl = document.createElement('div');
  errEl.className = 'em-cc-err';
  panel.appendChild(errEl);
  updHint();

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
      v => { sel.parts[key] = v; redraw(); }
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
      v => { sel.colours[key] = v; redraw(); }
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
      v => { sel.bodyType = v; redraw(); }
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
      // Completes tutorial lesson L0 (complete_when: flag:appearance_confirmed) so the
      // objective advances past character creation instead of sitting on a stale step.
      window.dispatchEvent(new CustomEvent('em-flag', { detail: 'appearance_confirmed' }));
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
