/* =====================================================================
   ELDERMOOR - minimap navigation module (MM1 / MM3 / MM+2, OSRS-parity
   pass). Self-contained, PURELY ADDITIVE overlay on the HUD's minimap
   (`#emmap`, owned by hud.js):

     MM1  click-to-walk - a tap on the minimap converts the click pixel into
          a world {x,z} and issues a walk command. The minimap is north-up
          and centred on the player at the SHARED zoom scale (world-units →
          px; see src/minimap-render.js currentScale(), which both layers
          read so click inversion always matches what's drawn), so
          inverting it is: delta px / scale = delta world, added to the
          live player position.
     ZOOM wheel / pinch zoom on the minimap disc, clamped to
          minimap-render.js's ZOOM_BOUNDS and shared via window.EMMINIMAP
          so the HUD's own canvas (still drawn by hud.js at its own fixed
          sc=1.1) and our overlay/under-layer agree on what "near" means
          for blip placement + click inversion. (hud.js's own dots are left
          alone per the "never edit hud.js" contract; this module's own
          blip layer recolours/repositions on top at the live zoom.)
     MM3  typed blips - player (white arrow, heading-aware), NPCs (yellow),
          items (red), objects/doors (dot), recoloured by an explicit `c`,
          or a `type`/`kind` hint when present (defensive: falls back to a
          friendly amber dot). All blips are clamped to the disc rim when
          their world position would draw outside it, OSRS-style, so nearby
          off-screen things still show a direction.
     MM+2 backdrop - delegated to minimap-render.js's under-layer canvas
          (terrain bands + path/pond/chapel); this module still draws its
          own faint bounds/path/pond sketch as a defensive fallback when
          minimap-render.js hasn't attached yet, so the disc never reads as
          a void even if init order changes.

   It NEVER edits hud.js or removes hud's drawing: a transparent <canvas> is
   layered over `#emmap` for the blips, and a click/wheel listener is
   attached to `#emmap` itself. Everything no-ops gracefully when a hook is
   missing.

   Reads (all optional, never required):
     #emmap (+ its inner <canvas>)  -> the minimap the HUD owns (geometry source)
     window.EMPLAYERPOS = {x,z}     -> live player world position (preferred)
     window.EMHUD.setPlayer(x,z,a,markers) -> wrapped to capture pos + blips if
                                              EMPLAYERPOS is absent
     window.EMWORLD                 -> optional world hook (bounds/path/pond), if
                                       ever exposed; else the authored fallback
     window.EMMINIMAP.currentScale()/getZoom()/setZoom() -> shared zoom state
                                       from minimap-render.js, when present
   Walk mechanism (in priority order):
     window.EMWALK(x, z)            -> preferred (wired to walkTo during init)
     window.dispatchEvent(new CustomEvent('em-walk', {detail:{x,z}}))  -> fallback

   Exposes:
     export function initMinimapNav()   // call once from main.js
   ===================================================================== */

/* minimap geometry - MUST track hud.js #emmap + drawMap():
   108x108 canvas, centre (54,54), base sc=1.1 world units → px at zoom 1,
   north-up. Actual live scale is read from minimap-render.js when present
   (so zoom stays in sync); BASE_SC is the fallback when it isn't loaded. */
const MAP = Object.freeze({ size: 108, cx: 54, cz: 54, baseSc: 1.1 });
const RIM_R = MAP.cx - 5; // px radius blips clamp to (leaves room for the bezel)

/* authored world geometry fallback (mirrors src/worldmap.js WORLD + world.js
   BOUND defaults). Only used for the faint backdrop fallback (when
   minimap-render.js hasn't attached its own under-layer yet); never required. */
const WORLD_FALLBACK = Object.freeze({
  bound: { x0: -7, x1: 7, z0: -5, z1: 14 },
  pond:  { x: 4.6, z: 10.2, r: 2.4 },
  path: [
    { x: 0,    z: 4.4 },
    { x: 0.4,  z: 7.0 },
    { x: -0.6, z: 9.5 },
    { x: -1.2, z: 12.0 },
    { x: -1.2, z: 13.6 },
  ],
});

/* blip palette by NPC kind/type (MM3). Typed categories per the OSRS-parity
   spec: npc=yellow, item=red, object/door=neutral dot; unknown -> amber. */
const BLIP = Object.freeze({
  // NPC-ish kinds (yellow family - OSRS NPC dots)
  npc:      '#ffd700',
  monk:     '#c9b6ff',
  villager: '#ffd700',
  merchant: '#ffd700',
  guard:    '#ffd700',
  quest:    '#7fe0a0',
  // hostile (red family, distinct from item-red via shape, see blipShape)
  enemy:    '#ff5050',
  mob:      '#ff5050',
  // items (red family - OSRS ground-item dots)
  item:     '#ff3b3b',
  ground_item: '#ff3b3b',
  drop:     '#ff3b3b',
  // objects/doors/scenery (neutral dot)
  object:   '#d8d1c0',
  door:     '#d8d1c0',
  scenery:  '#d8d1c0',
  fixture:  '#d8d1c0',
  _default: '#ffd98a',
});

/* shape family per type, independent of colour override (`c`), so a custom
   colour never accidentally loses its category glyph. */
function blipKind(m){
  const key = (m && (m.type || m.kind || '')).toString().toLowerCase();
  if (key === 'item' || key === 'ground_item' || key === 'drop') return 'item';
  if (key === 'object' || key === 'door' || key === 'scenery' || key === 'fixture') return 'object';
  if (key === 'enemy' || key === 'mob') return 'npc';
  if (key) return 'npc'; // any other explicit kind (monk/villager/merchant/guard/quest/npc) reads as an NPC dot
  return 'npc';           // legacy markers (no type field, e.g. main.js's NPCS feed) default to NPC
}

const PAL = Object.freeze({
  grass: 'rgba(120,170,96,0.16)',
  bound: 'rgba(40,52,32,0.55)',
  dirt:  'rgba(140,107,64,0.50)',
  water: 'rgba(44,106,130,0.55)',
  waterEdge: 'rgba(27,74,94,0.65)',
});

/* finite-number guard */
const num = v => typeof v === 'number' && isFinite(v);

/* ---- shared zoom (delegates to minimap-render.js when loaded; else local) ---- */
const ZOOM_MIN = 0.55, ZOOM_MAX = 2.4;
let _localZoom = 1;
function getScale(){
  const mm = (typeof window !== 'undefined') && window.EMMINIMAP;
  if (mm && typeof mm.currentScale === 'function'){
    const s = mm.currentScale();
    if (num(s) && s > 0) return s;
  }
  return MAP.baseSc * _localZoom;
}
function getZoom(){
  const mm = (typeof window !== 'undefined') && window.EMMINIMAP;
  if (mm && typeof mm.getZoom === 'function'){
    const z = mm.getZoom();
    if (num(z)) return z;
  }
  return _localZoom;
}
function setZoom(z){
  const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z || 1));
  const mm = (typeof window !== 'undefined') && window.EMMINIMAP;
  if (mm && typeof mm.setZoom === 'function'){ mm.setZoom(clamped); return clamped; }
  _localZoom = clamped;
  return clamped;
}

/* ---- player position: prefer window.EMPLAYERPOS; else last setPlayer() value ---- */
let _lastPos = null;      // {x,z} captured from setPlayer wrap (fallback source)
let _lastMarkers = [];    // markers captured from setPlayer wrap (for recolour)

function readPlayerPos(){
  const p = (typeof window !== 'undefined') && window.EMPLAYERPOS;
  if (p && num(p.x) && num(p.z)) return { x: p.x, z: p.z };
  if (_lastPos && num(_lastPos.x) && num(_lastPos.z)) return { x: _lastPos.x, z: _lastPos.z };
  return null;
}

/* Wrap EMHUD.setPlayer(px,pz,ang,markers) - additively - to record the live
   player position + markers each frame. Calls through to the original so the
   HUD keeps drawing exactly as before. No-op if EMHUD/setPlayer is absent. */
function hookSetPlayer(){
  if (typeof window === 'undefined') return;
  const hud = window.EMHUD;
  if (!hud || typeof hud.setPlayer !== 'function' || hud.__mmNavWrapped) return;
  const orig = hud.setPlayer.bind(hud);
  hud.setPlayer = function(px, pz, ang, markers){
    if (num(px) && num(pz)) _lastPos = { x: px, z: pz };
    _lastMarkers = Array.isArray(markers) ? markers : [];
    return orig(px, pz, ang, markers);
  };
  hud.__mmNavWrapped = true;
}

/* EMHUD may not exist yet at init (hud.js sets it during async data load).
   Retry the wrap a few times, then give up quietly. */
function ensureSetPlayerHook(){
  hookSetPlayer();
  if (typeof window !== 'undefined' && window.EMHUD && window.EMHUD.__mmNavWrapped) return;
  let tries = 0;
  const id = setInterval(() => {
    hookSetPlayer();
    if (++tries >= 40 || (window.EMHUD && window.EMHUD.__mmNavWrapped)) clearInterval(id);
  }, 250);
}

/* ----------------------------- walk dispatch (MM1) ----------------------------- */
function issueWalk(x, z){
  if (!num(x) || !num(z)) return false;
  try {
    if (typeof window !== 'undefined' && typeof window.EMWALK === 'function'){
      window.EMWALK(x, z);
      return true;
    }
  } catch (_) { /* fall through to the event path */ }
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function'){
      window.dispatchEvent(new CustomEvent('em-walk', { detail: { x, z } }));
      return true;
    }
  } catch (_) { /* nothing more we can do - no-op */ }
  return false;
}

/* ----------------------- pixel → world inversion (MM1) ------------------------ */
/* The minimap canvas is 108 CSS px wide in hud.css but may be scaled by the
   border-radius container; we map the click against the canvas's REAL rendered
   box, normalise to the 108-unit drawing space, then invert the live transform:
     screenPx = centre + (world - player) * scale   (north-up)
   =>  world  = player + (screenPx - centre) / scale
   `scale` is the SHARED zoom-aware scale (getScale()) so clicking always lands
   where the disc visually shows it, at any zoom level.                        */
function clickToWorld(clientX, clientY, canvas){
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  // normalise click into the 108x108 drawing space (handle CSS scaling of the disc)
  const nx = ((clientX - r.left) / r.width)  * MAP.size;
  const nz = ((clientY - r.top)  / r.height) * MAP.size;
  const player = readPlayerPos() || { x: 0, z: 0 };
  const sc = getScale();
  return {
    x: player.x + (nx - MAP.cx) / sc,
    z: player.z + (nz - MAP.cz) / sc,
  };
}

/* ------------------------ backdrop + recoloured blips (MM+2 / MM3) ------------- */
function worldHook(){
  const w = (typeof window !== 'undefined') && window.EMWORLD;
  return (w && typeof w === 'object') ? w : null;
}
function worldGeom(){
  // prefer a live hook if it ever exposes geometry; else authored fallback
  const w = worldHook();
  const bound = (w && w.bound) || (w && w.BOUND) || WORLD_FALLBACK.bound;
  const pond  = (w && w.pond)  || WORLD_FALLBACK.pond;
  const path  = (Array.isArray(w && w.path) && w.path.length) ? w.path : WORLD_FALLBACK.path;
  return { bound, pond, path };
}

function blipColor(m){
  if (!m) return BLIP._default;
  if (typeof m.c === 'string' && m.c) return m.c;            // honour explicit colour from setPlayer
  const key = (m.type || m.kind || '').toString().toLowerCase();
  return BLIP[key] || BLIP._default;
}

/* clamp a screen-space point to the minimap rim (OSRS parity: off-screen
   blips still show direction, pinned to the disc edge). Returns the
   (possibly unmodified) point plus whether it was clamped. */
function clampToRim(sx, sy){
  const dx = sx - MAP.cx, dy = sy - MAP.cz;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= RIM_R || d === 0) return { x: sx, y: sy, clamped: false };
  const k = RIM_R / d;
  return { x: MAP.cx + dx * k, y: MAP.cz + dy * k, clamped: true };
}

/* draw a single blip glyph by kind: NPC = filled circle, item = diamond,
   object = small square dot. Clamped blips draw slightly smaller + with a
   thin dark ring so "pinned to rim" reads distinctly from "in range". */
function drawBlip(ctx, sx, sy, color, kind, clamped){
  const r = (clamped ? 2.6 : 3.2);
  ctx.fillStyle = color;
  ctx.globalAlpha = clamped ? 0.85 : 0.95;
  if (kind === 'item'){
    // diamond
    ctx.beginPath();
    ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r, sy);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'object'){
    // small square dot
    const s = r * 0.85;
    ctx.fillRect(sx - s, sy - s, s * 2, s * 2);
  } else {
    // npc: circle
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (clamped){
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(20,16,10,0.8)';
    ctx.beginPath(); ctx.arc(sx, sy, r + 1, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* draw the player marker as a heading-aware arrow (white), OSRS-parity
   in place of a plain dot. Heading is optional (window.EMHEADING /
   window.EMCAMANGLE, radians); the client's camera currently has no yaw
   control so this is 0 and the arrow points due north - correct, not a
   placeholder bug. */
function drawPlayerArrow(ctx){
  const heading = (typeof window !== 'undefined')
    ? (typeof window.EMHEADING === 'number' ? window.EMHEADING
       : typeof window.EMCAMANGLE === 'number' ? window.EMCAMANGLE : 0)
    : 0;
  ctx.save();
  ctx.translate(MAP.cx, MAP.cz);
  ctx.rotate(heading);
  ctx.beginPath();
  ctx.moveTo(0, -5.2);
  ctx.lineTo(3.6, 4.2);
  ctx.lineTo(0, 2.0);
  ctx.lineTo(-3.6, 4.2);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(20,16,10,0.85)';
  ctx.stroke();
  ctx.restore();
}

function drawOverlay(octx, overlay){
  const ctx = octx;
  ctx.clearRect(0, 0, MAP.size, MAP.size);
  const player = readPlayerPos();
  const sc = getScale();
  // world -> overlay px, centred on player, north-up, zoom-aware (same
  // transform contract as the under-layer in minimap-render.js).
  const W2S = (wx, wz) => ({
    x: MAP.cx + (wx - (player ? player.x : 0)) * sc,
    y: MAP.cz + (wz - (player ? player.z : 0)) * sc,
  });

  // clip to the circular disc so nothing spills past the bezel
  ctx.save();
  ctx.beginPath();
  ctx.arc(MAP.cx, MAP.cz, MAP.cx - 1, 0, Math.PI * 2);
  ctx.clip();

  // defensive backdrop fallback: only draws if minimap-render.js's
  // under-layer canvas hasn't attached yet (avoids double-drawing terrain
  // once it has - that module is the real terrain renderer now).
  const mapEl = overlay && overlay.parentElement;
  const hasUnderLayer = !!(mapEl && mapEl.querySelector('canvas.emmap-under'));
  if (player && !hasUnderLayer){
    const { bound, pond, path } = worldGeom();

    if (bound && num(bound.x0)){
      const a = W2S(bound.x0, bound.z0), b = W2S(bound.x1, bound.z1);
      ctx.fillStyle = PAL.grass;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeStyle = PAL.bound;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }

    if (Array.isArray(path) && path.length >= 2){
      ctx.beginPath();
      path.forEach((p, i) => {
        if (!p || !num(p.x) || !num(p.z)) return;
        const s = W2S(p.x, p.z);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, sc * 1.6);
      ctx.strokeStyle = PAL.dirt;
      ctx.stroke();
    }

    if (pond && num(pond.x) && num(pond.z) && num(pond.r)){
      const pc = W2S(pond.x, pond.z);
      ctx.beginPath();
      ctx.arc(pc.x, pc.y, Math.max(1, pond.r * sc), 0, Math.PI * 2);
      ctx.fillStyle = PAL.water; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = PAL.waterEdge; ctx.stroke();
    }
  }

  // typed blips (MM3), clamped to the rim when out of range. The HUD draws
  // its own amber dots too underneath (it owns its own canvas, untouched);
  // ours sit on top as the authoritative typed/clamped representation.
  if (player && Array.isArray(_lastMarkers)){
    for (const m of _lastMarkers){
      if (!m || !num(m.x) || !num(m.z)) continue;
      const s = W2S(m.x, m.z);
      const clampedPt = clampToRim(s.x, s.y);
      drawBlip(ctx, clampedPt.x, clampedPt.y, blipColor(m), blipKind(m), clampedPt.clamped);
    }
  }

  // player marker drawn last, always on top, always at the exact centre.
  if (player) drawPlayerArrow(ctx);

  ctx.restore();
}

/* ----------------------------- public entry ----------------------------- */
/* Wire the click-to-walk + zoom + overlay onto #emmap. If the HUD hasn't
   created the minimap yet, retry on an interval until it exists (then give
   up quietly). */
export function initMinimapNav(){
  if (typeof document === 'undefined') return;            // SSR / headless guard
  if (document.getElementById('emmap')) return attachMinimapNav();
  // #emmap absent (HUD builds it during async load) → poll until it appears.
  let tries = 0, handle = null;
  const id = setInterval(() => {
    if (document.getElementById('emmap')){
      clearInterval(id);
      handle = attachMinimapNav();
    } else if (++tries >= 200){                           // ~50s ceiling, then stop
      clearInterval(id);
    }
  }, 250);
  // expose a stopper that also cancels the poll if it's still pending
  return { stop(){ clearInterval(id); if (handle && handle.stop) handle.stop(); } };
}

/* actual wiring - only runs once #emmap is present */
function attachMinimapNav(){
  const map = document.getElementById('emmap');
  if (!map){ return; }                                    // race guard → no-op
  if (map.dataset.mmNav === '1') return;                  // idempotent
  map.dataset.mmNav = '1';

  const hudCanvas = map.querySelector('canvas');          // the HUD's own minimap canvas

  /* --- MM1: click-to-walk. Listen on #emmap (the container the HUD owns) so we
     never disturb hud's canvas drawing. Use the inner canvas (or the container)
     as the geometry box for the pixel→world inversion. A short drag threshold
     distinguishes a click (walk) from a zoom-drag-free disc - we don't support
     panning (OSRS minimap is always player-centred), so any mouseup without
     significant movement issues the walk. --- */
  const geomBox = hudCanvas || map;
  map.style.cursor = 'pointer';
  map.style.touchAction = 'none'; // allow our own pinch handling on mobile

  let downPt = null;
  const DRAG_PX = 6;
  map.addEventListener('pointerdown', (e) => { downPt = { x: e.clientX, y: e.clientY }; });
  map.addEventListener('pointerup', (e) => {
    if (downPt){
      const dx = e.clientX - downPt.x, dy = e.clientY - downPt.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_PX){ downPt = null; return; } // treat as a zoom-pinch leftover, not a click
    }
    downPt = null;
    const w = clickToWorld(e.clientX, e.clientY, geomBox);
    if (!w) return;
    issueWalk(w.x, w.z);
  });
  // suppress the browser context menu on the minimap (parity with OSRS feel);
  // additive - does not interfere with hud's own handlers.
  map.addEventListener('contextmenu', (e) => { e.preventDefault(); });

  /* --- ZOOM: mouse wheel (desktop) --- */
  map.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    setZoom(getZoom() * factor);
  }, { passive: false });

  /* --- ZOOM: pinch (mobile/touch). Two-finger distance delta drives zoom;
     a single-finger touch still falls through to pointerdown/up above for
     click-to-walk (PointerEvent unifies touch+mouse in evergreen browsers,
     so the pointerdown/up handlers already cover single-touch taps; this
     listener only engages once a SECOND touch point appears). --- */
  let pinchStartDist = 0, pinchStartZoom = 1;
  map.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2){
      const [t0, t1] = e.touches;
      pinchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      pinchStartZoom = getZoom();
      downPt = null; // a pinch is never a click
    }
  }, { passive: true });
  map.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinchStartDist > 0){
      e.preventDefault();
      const [t0, t1] = e.touches;
      const d = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      setZoom(pinchStartZoom * (d / pinchStartDist));
    }
  }, { passive: false });
  map.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinchStartDist = 0;
  }, { passive: true });

  /* --- MM+2 / MM3: transparent overlay canvas layered over #emmap. It is
     pointer-events:none so all taps still reach the #emmap click handler
     above, and it sits above the HUD canvas + minimap-render.js's
     under-layer (z-index 1) so our typed/clamped blips + player arrow read
     on top of both, while staying below the compass ring (z-index 2). --- */
  let overlay = null, octx = null, rafId = 0;
  try {
    overlay = document.createElement('canvas');
    overlay.className = 'emmap-blips';
    overlay.width = MAP.size; overlay.height = MAP.size;
    overlay.style.cssText =
      'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    // #emmap is a positioned ancestor (fixed, or relative once
    // minimap-render.js's under-layer attaches) so absolute pins correctly.
    map.appendChild(overlay);
    octx = overlay.getContext('2d');
  } catch (_) { overlay = null; octx = null; }

  // capture live player pos + markers from the HUD each frame
  ensureSetPlayerHook();

  if (octx){
    const tick = () => {
      try { drawOverlay(octx, overlay); } catch (_) { /* never break the page */ }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  return {
    stop(){ if (rafId) cancelAnimationFrame(rafId); if (overlay && overlay.remove) overlay.remove(); },
  };
}
