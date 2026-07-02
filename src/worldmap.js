/* =====================================================================
   ELDERMOOR - world-map module (WMAP1-4). Self-contained overlay: a small
   map button docked under the minimap (top-right) opens a full-screen
   pannable / zoomable top-down map drawn on a canvas. Shows the playable
   bounds, the dirt path, the pond, the chapel footprint, a "you are here"
   marker (driven by window.EMPLAYERPOS = {x,z}; falls back to center if
   absent), a few labelled POI icons, a legend, an X button, and Esc-to-close.

   Reads (all optional, never required):
     window.EMPLAYERPOS  -> {x, z} player world position for the marker
     window.EMHUD        -> if present, EMHUD.addChat(...) logs map open/close

   Exposes:
     export function initWorldMap()   // call once from main.js
   No other files are edited; main.js wires this in.
   ===================================================================== */

/* ----- world geometry (authored to match src/world.js BOUND defaults) -----
   Eldermoor\'s playable bounds + landmark footprints, in WORLD units (x east,
   z south/forward). Drawn purely from data so the map scales by editing this. */
const WORLD = {
  bound: { x0: -7, x1: 7, z0: -5, z1: 14 },               // playable rectangle
  chapel: { x0: -4.2, x1: 4.2, z0: -3.6, z1: 4.4 },        // chapel footprint
  pond:   { x: 4.6, z: 10.2, r: 2.4 },                     // the pond
  // dirt path: a polyline (world points) from chapel door south to the dock
  path: [
    { x: 0,    z: 4.4 },
    { x: 0.4,  z: 7.0 },
    { x: -0.6, z: 9.5 },
    { x: -1.2, z: 12.0 },
    { x: -1.2, z: 13.6 },
  ],
  // points of interest - original Eldermoor places
  pois: [
    { id: 'chapel',   name: 'Chapel',        x: 0,    z: 0.4,  icon: '⛪', c: '#d8b25a' },
    { id: 'altar',    name: 'Altar',         x: 0,    z: -2.6, icon: '🕯️', c: '#e7c64f' },
    { id: 'survival', name: 'Survival Area', x: -4.8, z: 9.2,  icon: '🪓', c: '#7fb86a' },
    { id: 'dock',     name: 'Dock',          x: -1.2, z: 13.4, icon: '⚓', c: '#6fb6d8' },
  ],
};

const PAL = {
  ink:    '#f3e9cf',
  gold:   '#e7c64f',
  frame:  '#5a4a2a',
  panel:  '#211d18',
  grass:  '#3f6f3a',
  grassH: '#4f8a3c',
  dirt:   '#8c6b40',
  water:  '#2c6a82',
  stone:  '#bfae8c',
  you:    '#ffffff',
};

/* fixture type -> map icon (drawn as POI pins) */
const FIXTURE_ICONS = {
  'bank-booth':   { icon: '🏛️', name: 'Bank',    c: '#d8b25a' },
  'poll-booth':   { icon: '📜', name: 'Poll',    c: '#bfae8c' },
  'furnace':      { icon: '🔥', name: 'Furnace', c: '#c56b2e' },
  'anvil':        { icon: '⚒️', name: 'Anvil',   c: '#8a9096' },
  'range':        { icon: '🍳', name: 'Range',   c: '#b98a5a' },
  'altar':        { icon: '🕯️', name: 'Altar',   c: '#e7c64f' },
  'rune-rack':    { icon: '✨', name: 'Runes',   c: '#7a5ac8' },
  'fishing-spot': { icon: '🎣', name: 'Fishing', c: '#6fb6d8' },
  'target-butt':  { icon: '🎯', name: 'Archery', c: '#9c3030' },
};

/* Compose the map's world description from LIVE data (the manifest world.js
   stashed on window.EMWORLD plus live fixtures/mobs), falling back to the
   legacy hand-authored chapel-grounds WORLD when the manifest hasn't loaded.
   The old map was frozen at the original prototype - it showed a 14x19 lawn
   while the real island is 68x94 with nine zones (owner-reported stale map). */
function liveWorld(){
  const W = (typeof window !== 'undefined' && window.EMWORLD) || {};
  const m = W.manifest;
  if (!m){
    return {
      name: 'Chapel Grounds',
      bound: WORLD.bound,
      buildings: [{ x0: WORLD.chapel.x0, x1: WORLD.chapel.x1, z0: WORLD.chapel.z0, z1: WORLD.chapel.z1, label: 'Chapel' }],
      paths: [WORLD.path.map(p => [p.x, p.z])],
      zones: [],
      pois: WORLD.pois.slice(),
      pond: WORLD.pond,
      mobs: [], npcs: [],
    };
  }
  const bound = W.bound || m.bound || WORLD.bound;
  const buildings = (m.buildings || []).map(b => {
    const w = b.w || 8, d = b.d || 7;
    const label = (b.id || b.type || '').replace(/_/g, ' ').replace(/\bhouse\b/i, '').trim();
    return { x0: b.x - w/2, x1: b.x + w/2, z0: b.z - d/2, z1: b.z + d/2,
             label: label ? label.replace(/\b\w/g, c => c.toUpperCase()) : '' };
  });
  const paths = (m.paths || []).map(p => p.points || []).filter(p => p.length >= 2);
  const zones = (m.zones || []).filter(z => z.center && z.label)
    .map(z => ({ label: z.label, x: z.center.x, z: z.center.z }));
  const pois = [];
  (W.fixtures || []).forEach(f => {
    const d = FIXTURE_ICONS[f.fixture];
    if (d) pois.push({ name: d.name, icon: d.icon, c: d.c, x: f.x, z: f.z });
  });
  (W.nodes || []).forEach(n => {                       // scenery landmarks: the departure dock/boat
    if (n.type === 'dock') pois.push({ name: 'Dock', icon: '⚓', c: '#6fb6d8', x: n.x, z: n.z });
  });
  const mobs = ((typeof window !== 'undefined' && window.EMMOB && window.EMMOB.nodes) || [])
    .filter(mo => !mo.dead).map(mo => ({ x: mo.x, z: mo.z }));
  const name = String(m.name || 'Eldermoor Isle').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { name, bound, buildings, paths, zones, pois, pond: null, mobs };
}

/* read the live player position, defensively. {x,z} numbers or null. */
function readPlayerPos(){
  const p = (typeof window !== 'undefined') && window.EMPLAYERPOS;
  if (p && typeof p.x === 'number' && typeof p.z === 'number' &&
      isFinite(p.x) && isFinite(p.z)) {
    return { x: p.x, z: p.z };
  }
  return null;
}

function emLog(text){
  try {
    if (typeof window !== 'undefined' && window.EMHUD && typeof window.EMHUD.addChat === 'function') {
      window.EMHUD.addChat(text, '', true);
    }
  } catch (_) { /* HUD optional - never let logging break the map */ }
}

export function initWorldMap(){
  if (typeof document === 'undefined') return;             // SSR / headless guard
  if (document.getElementById('emwmap-btn')) return;       // idempotent

  /* ---------------------------------------------------------- self-contained CSS */
  const css = `
  #emwmap-btn{position:fixed;right:10px;top:124px;z-index:30;width:108px;height:26px;
    display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;
    background:linear-gradient(#3a2e1f,#2b2620);color:#f3e9cf;border:2px solid #5a4a2a;
    border-radius:6px;font:bold 11px "Trebuchet MS",sans-serif;letter-spacing:.04em;
    box-shadow:0 2px 8px #0007;text-shadow:0 1px 2px #000;user-select:none;}
  #emwmap-btn:hover{border-color:#e7c64f;color:#fff;}
  #emwmap-btn .ic{font-size:13px;line-height:1;}
  #emwmap{position:fixed;inset:0;z-index:60;display:none;background:rgba(14,12,10,.86);
    font-family:"Trebuchet MS",sans-serif;color:#f3e9cf;}
  #emwmap.show{display:block;}
  #emwmap canvas{position:absolute;inset:0;width:100%;height:100%;display:block;
    cursor:grab;touch-action:none;}
  #emwmap canvas.drag{cursor:grabbing;}
  #emwmap-title{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:2;
    pointer-events:none;background:rgba(33,29,24,.92);border:1px solid #c8a24a;border-radius:8px;
    padding:6px 18px;font-size:15px;font-weight:bold;color:#f3e9cf;letter-spacing:.06em;
    text-shadow:0 1px 2px #000;}
  #emwmap-title .sub{display:block;font-size:9px;color:#e7c64f;letter-spacing:.22em;
    text-transform:uppercase;text-align:center;font-weight:normal;}
  #emwmap-close{position:absolute;top:14px;right:18px;z-index:2;width:34px;height:34px;
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    background:linear-gradient(#3a2e1f,#2b2620);color:#f3e9cf;border:2px solid #5a4a2a;
    border-radius:8px;font-size:18px;font-weight:bold;line-height:1;box-shadow:0 2px 8px #0008;}
  #emwmap-close:hover{border-color:#e7c64f;color:#fff;}
  #emwmap-legend{position:absolute;left:18px;bottom:18px;z-index:2;
    background:linear-gradient(#2b2620,#1f1b16);border:2px solid #5a4a2a;border-radius:8px;
    padding:9px 12px;font-size:12px;color:#e3d6b8;box-shadow:0 4px 16px #000a;min-width:148px;}
  #emwmap-legend h5{margin:0 0 6px;color:#e7c64f;font-size:10px;letter-spacing:.12em;
    text-transform:uppercase;font-weight:bold;}
  #emwmap-legend .row{display:flex;align-items:center;gap:7px;margin:3px 0;line-height:1.3;}
  #emwmap-legend .sw{width:13px;height:13px;border-radius:3px;border:1px solid #00000055;flex:0 0 auto;}
  #emwmap-legend .sw.you{border-radius:50%;background:#fff;}
  #emwmap-hint{position:absolute;right:18px;bottom:18px;z-index:2;
    background:rgba(33,29,24,.82);border:1px solid #4a3a26;border-radius:6px;
    padding:5px 10px;font-size:11px;color:#bdac86;box-shadow:0 2px 8px #0007;}
  `;
  const st = document.createElement('style');
  st.id = 'emwmap-style';
  st.textContent = css;
  document.head.appendChild(st);

  /* ------------------------------------------------------------------ DOM */
  const btn = document.createElement('div');
  btn.id = 'emwmap-btn';
  btn.title = 'Open world map (M)';
  btn.innerHTML = '<span class="ic">🗺️</span><span>World Map</span>';
  document.body.appendChild(btn);

  const overlay = document.createElement('div');
  overlay.id = 'emwmap';
  overlay.innerHTML = `
    <canvas></canvas>
    <div id="emwmap-title">Eldermoor<span class="sub">Chapel Grounds</span></div>
    <div id="emwmap-close" title="Close (Esc)">✕</div>
    <div id="emwmap-legend">
      <h5>Legend</h5>
      <div class="row"><span class="sw" style="background:${PAL.grassH}"></span>Playable area</div>
      <div class="row"><span class="sw" style="background:${PAL.dirt}"></span>Dirt path</div>
      <div class="row"><span class="sw" style="background:#1e4356"></span>Ocean</div>
      <div class="row"><span class="sw" style="background:${PAL.stone}"></span>Buildings</div>
      <div class="row"><span class="sw" style="background:#c8452e;border-radius:50%"></span>Creatures</div>
      <div class="row"><span class="sw you"></span>You are here</div>
    </div>
    <div id="emwmap-hint">Drag to pan · Scroll to zoom · Esc to close</div>`;
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  /* -------------------------------------------------- view (pan + zoom) state
     view.scale = pixels per world unit. view.cx/cz = world point at viewport
     center (in screen space we offset by half the canvas). pan in screen px. */
  const view = { scale: 28, panX: 0, panZ: 0 };            // panX/panZ in screen px
  let cssW = 0, cssH = 0, dpr = 1;

  // world -> screen, given current view + canvas center
  function w2s(x, z){
    return {
      x: cssW / 2 + view.panX + (x - worldCenter.x) * view.scale,
      y: cssH / 2 + view.panZ + (z - worldCenter.z) * view.scale,
    };
  }
  const worldCenter = {                                     // recentred from live bounds in fitView()
    x: (WORLD.bound.x0 + WORLD.bound.x1) / 2,
    z: (WORLD.bound.z0 + WORLD.bound.z1) / 2,
  };

  function resize(){
    dpr = window.devicePixelRatio || 1;
    cssW = overlay.clientWidth || window.innerWidth;
    cssH = overlay.clientHeight || window.innerHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);                 // draw in CSS px
    draw();
  }

  /* fit the LIVE playable bounds nicely into the viewport (called on open) */
  function fitView(){
    const LW = liveWorld();
    worldCenter.x = (LW.bound.x0 + LW.bound.x1) / 2;
    worldCenter.z = (LW.bound.z0 + LW.bound.z1) / 2;
    const wW = LW.bound.x1 - LW.bound.x0;
    const wH = LW.bound.z1 - LW.bound.z0;
    const pad = 0.82;                                        // leave a margin
    const s = Math.min((cssW * pad) / wW, (cssH * pad) / wH);
    view.scale = Math.max(4, Math.min(160, s));
    view.panX = 0;
    view.panZ = 0;
    const sub = overlay.querySelector('#emwmap-title .sub');
    if (sub) sub.textContent = LW.name;
  }

  /* --------------------------------------------------------------- drawing */
  function roundRectPath(x, y, w, h, r){
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function draw(){
    if (!cssW || !cssH) return;
    ctx.clearRect(0, 0, cssW, cssH);
    const LW = liveWorld();

    // ---- ocean backdrop (the island sits in open water) ----
    ctx.fillStyle = '#1e4356';
    ctx.fillRect(0, 0, cssW, cssH);

    // ---- island (playable bounds) ----
    const a = w2s(LW.bound.x0, LW.bound.z0);
    const b = w2s(LW.bound.x1, LW.bound.z1);
    const bx = a.x, by = a.y, bw = b.x - a.x, bh = b.y - a.y;
    ctx.save();
    roundRectPath(bx, by, bw, bh, 14);
    ctx.fillStyle = PAL.grassH;
    ctx.fill();
    // faint grass texture stripes
    ctx.clip();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = PAL.grass;
    for (let gx = LW.bound.x0; gx < LW.bound.x1; gx += 4){
      const s0 = w2s(gx, LW.bound.z0);
      ctx.fillRect(s0.x, by, Math.max(1, view.scale * 1.8), bh);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    roundRectPath(bx, by, bw, bh, 14);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d8cfa8';                             // sandy shoreline
    ctx.stroke();

    // ---- legacy pond (chapel-grounds fallback only) ----
    if (LW.pond){
      const pc = w2s(LW.pond.x, LW.pond.z);
      ctx.beginPath();
      ctx.arc(pc.x, pc.y, LW.pond.r * view.scale, 0, Math.PI * 2);
      ctx.fillStyle = PAL.water; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#1b4a5e'; ctx.stroke();
    }

    // ---- dirt paths (manifest polylines) ----
    (LW.paths || []).forEach(pts => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const s = w2s(p[0], p[1]);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, view.scale * 2.2);
      ctx.strokeStyle = PAL.dirt;
      ctx.stroke();
    });

    // ---- building footprints + labels ----
    (LW.buildings || []).forEach(bd => {
      const ca = w2s(bd.x0, bd.z0), cb = w2s(bd.x1, bd.z1);
      roundRectPath(ca.x, ca.y, cb.x - ca.x, cb.y - ca.y, 3);
      ctx.fillStyle = PAL.stone; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#7a6a48'; ctx.stroke();
      if (bd.label && view.scale > 5){
        ctx.font = 'bold 11px "Trebuchet MS",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#4a3d28';
        ctx.fillText(bd.label, (ca.x + cb.x) / 2, (ca.y + cb.y) / 2);
      }
    });

    // ---- zone name banners ----
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    (LW.zones || []).forEach(zn => {
      const s = w2s(zn.x, zn.z);
      ctx.font = 'bold 13px "Trebuchet MS",sans-serif';
      const lw = ctx.measureText(zn.label).width + 12;
      ctx.fillStyle = 'rgba(33,29,24,.66)';
      roundRectPath(s.x - lw / 2, s.y - 30, lw, 18, 5);
      ctx.fill();
      ctx.fillStyle = PAL.gold;
      ctx.fillText(zn.label, s.x, s.y - 21);
    });

    // ---- mob dots (live, alive only) ----
    (LW.mobs || []).forEach(mo => {
      const s = w2s(mo.x, mo.z);
      ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#c8452e'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#211d18'; ctx.stroke();
    });

    // ---- POI icons + labels (live fixtures + landmarks) ----
    (LW.pois || []).forEach(poi => {
      const s = w2s(poi.x, poi.z);
      // pin disc
      ctx.beginPath();
      ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = poi.c;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#211d18';
      ctx.stroke();
      // icon
      ctx.font = '13px "Trebuchet MS",sans-serif';
      ctx.fillText(poi.icon, s.x, s.y + 0.5);
      // label (only when zoomed in enough to matter)
      if (view.scale > 9){
        ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
        const lw = ctx.measureText(poi.name).width + 10;
        ctx.fillStyle = 'rgba(33,29,24,.82)';
        roundRectPath(s.x - lw / 2, s.y + 14, lw, 17, 4);
        ctx.fill();
        ctx.fillStyle = PAL.ink;
        ctx.fillText(poi.name, s.x, s.y + 23);
      }
    });

    // ---- "you are here" marker ----
    const pp = readPlayerPos() || { x: worldCenter.x, z: worldCenter.z };
    const ys = w2s(pp.x, pp.z);
    // pulse ring
    ctx.beginPath();
    ctx.arc(ys.x, ys.y, 13, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // dot
    ctx.beginPath();
    ctx.arc(ys.x, ys.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = PAL.you;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#9c3030';
    ctx.stroke();
    // "You" label
    ctx.font = 'bold 11px "Trebuchet MS",sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(readPlayerPos() ? 'You' : 'You (center)', ys.x, ys.y - 16);

    // ---- compass ----
    ctx.save();
    ctx.translate(cssW - 56, 70);
    ctx.fillStyle = PAL.gold;
    ctx.font = 'bold 14px "Trebuchet MS",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -8);
    ctx.beginPath();
    ctx.moveTo(0, -4); ctx.lineTo(-5, 8); ctx.lineTo(0, 4); ctx.lineTo(5, 8); ctx.closePath();
    ctx.fillStyle = '#9c3030';
    ctx.fill();
    ctx.restore();
  }

  /* --------------------------------------------------------- interaction */
  // pan by drag
  let dragging = false, lastX = 0, lastY = 0;
  function onDown(e){
    dragging = true;
    canvas.classList.add('drag');
    const pt = pointFrom(e);
    lastX = pt.x; lastY = pt.y;
    if (e.cancelable) e.preventDefault();
  }
  function onMove(e){
    if (!dragging) return;
    const pt = pointFrom(e);
    view.panX += pt.x - lastX;
    view.panZ += pt.y - lastY;
    lastX = pt.x; lastY = pt.y;
    draw();
  }
  function onUp(){ dragging = false; canvas.classList.remove('drag'); }
  function pointFrom(e){
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    const r = canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  // zoom by wheel, anchored at the cursor
  function onWheel(e){
    e.preventDefault();
    const pt = pointFrom(e);
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newScale = Math.max(6, Math.min(220, view.scale * factor));
    if (newScale === view.scale) return;
    // keep the world point under the cursor fixed
    const cx = cssW / 2 + view.panX;
    const cy = cssH / 2 + view.panZ;
    const ratio = newScale / view.scale;
    view.panX = pt.x - (pt.x - cx) * ratio - cssW / 2;
    view.panZ = pt.y - (pt.y - cy) * ratio - cssH / 2;
    view.scale = newScale;
    draw();
  }

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  /* ------------------------------------------------------------ open/close */
  let open = false;
  let raf = 0;
  function tick(){                                           // live-update the You marker
    if (!open) return;
    draw();
    raf = requestAnimationFrame(tick);
  }
  function openMap(){
    if (open) return;
    open = true;
    overlay.classList.add('show');
    resize();
    fitView();
    draw();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    emLog('You unfold the world map.');
  }
  function closeMap(){
    if (!open) return;
    open = false;
    overlay.classList.remove('show');
    cancelAnimationFrame(raf);
  }
  function toggle(){ open ? closeMap() : openMap(); }

  btn.addEventListener('click', toggle);
  overlay.querySelector('#emwmap-close').addEventListener('click', closeMap);
  // click on the dim backdrop (outside canvas chrome) closes too
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeMap(); });
  window.addEventListener('resize', () => { if (open) resize(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open){ closeMap(); }
    else if ((e.key === 'm' || e.key === 'M') && !e.repeat &&
             !/^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || '')){
      toggle();
    }
  });

  return { open: openMap, close: closeMap, toggle };
}
