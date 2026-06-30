/* =====================================================================
   ELDERMOOR - minimap navigation module (MM1 / MM3 / MM+2). Self-contained,
   PURELY ADDITIVE overlay on the HUD\'s minimap (`#emmap`, owned by hud.js):

     MM1  click-to-walk - a tap on the minimap converts the click pixel into a
          world {x,z} and issues a walk command. The minimap is north-up and
          centred on the player at scale `SC` (world-units → px, matching
          hud.js drawMap\'s `sc=1.1`), so inverting it is: delta px / SC = delta
          world, added to the live player position.
     MM3  better blips - NPC markers are recoloured by type if the marker data
          carries a `type` / `kind` / `c` hint (defensive: falls back to a
          friendly amber).
     MM+2 backdrop - a faint playable-bounds / dirt-path / pond sketch is drawn
          UNDER the HUD\'s own dots so the disc reads as a place, not a void.

   It NEVER edits hud.js or removes hud\'s drawing: a transparent <canvas> is
   layered over `#emmap` for the backdrop + recoloured blips, and a click
   listener is attached to `#emmap` itself. Everything no-ops gracefully when a
   hook is missing.

   Reads (all optional, never required):
     #emmap (+ its inner <canvas>)  -> the minimap the HUD owns (geometry source)
     window.EMPLAYERPOS = {x,z}     -> live player world position (preferred)
     window.EMHUD.setPlayer(x,z,a,markers) -> wrapped to capture pos + blips if
                                              EMPLAYERPOS is absent
     window.EMWORLD                 -> optional world hook (bounds/path/pond), if
                                       ever exposed; else the authored fallback
   Walk mechanism (in priority order):
     window.EMWALK(x, z)            -> preferred (wired to walkTo during init)
     window.dispatchEvent(new CustomEvent('em-walk', {detail:{x,z}}))  -> fallback

   Exposes:
     export function initMinimapNav()   // call once from main.js
   ===================================================================== */

/* minimap geometry - MUST track hud.js #emmap + drawMap():
   108x108 canvas, centre (54,54), sc=1.1 world units → px, north-up. */
const MAP = Object.freeze({ size: 108, cx: 54, cz: 54, sc: 1.1 });

/* authored world geometry fallback (mirrors src/worldmap.js WORLD + world.js
   BOUND defaults). Only used for the faint backdrop; never required. */
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

/* blip palette by NPC kind/type (MM3). Unknown -> friendly amber. */
const BLIP = Object.freeze({
  monk:     '#c9b6ff',
  villager: '#ffd98a',
  merchant: '#f0c97a',
  guard:    '#a9c7ff',
  enemy:    '#ff6b6b',
  quest:    '#7fe0a0',
  _default: '#ffd98a',
});

const PAL = Object.freeze({
  grass: 'rgba(120,170,96,0.16)',
  bound: 'rgba(40,52,32,0.55)',
  dirt:  'rgba(140,107,64,0.50)',
  water: 'rgba(44,106,130,0.55)',
  waterEdge: 'rgba(27,74,94,0.65)',
});

/* finite-number guard */
const num = v => typeof v === 'number' && isFinite(v);

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
   border-radius container; we map the click against the canvas\'s REAL rendered
   box, normalise to the 108-unit drawing space, then invert drawMap\'s transform:
     screenPx = centre + (world - player) * SC   (north-up)
   =>  world  = player + (screenPx - centre) / SC                                */
function clickToWorld(clientX, clientY, canvas){
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  // normalise click into the 108x108 drawing space (handle CSS scaling of the disc)
  const nx = ((clientX - r.left) / r.width)  * MAP.size;
  const nz = ((clientY - r.top)  / r.height) * MAP.size;
  const player = readPlayerPos() || { x: 0, z: 0 };
  return {
    x: player.x + (nx - MAP.cx) / MAP.sc,
    z: player.z + (nz - MAP.cz) / MAP.sc,
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

function drawOverlay(octx, overlay){
  const ctx = octx;
  ctx.clearRect(0, 0, MAP.size, MAP.size);
  const player = readPlayerPos();
  // world -> overlay px, centred on player, north-up (same transform as drawMap)
  const W2S = (wx, wz) => ({
    x: MAP.cx + (wx - (player ? player.x : 0)) * MAP.sc,
    y: MAP.cz + (wz - (player ? player.z : 0)) * MAP.sc,
  });

  // clip to the circular disc so the backdrop never spills past the bezel
  ctx.save();
  ctx.beginPath();
  ctx.arc(MAP.cx, MAP.cz, MAP.cx - 1, 0, Math.PI * 2);
  ctx.clip();

  if (player){
    const { bound, pond, path } = worldGeom();

    // playable-bounds tint + frame
    if (bound && num(bound.x0)){
      const a = W2S(bound.x0, bound.z0), b = W2S(bound.x1, bound.z1);
      ctx.fillStyle = PAL.grass;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeStyle = PAL.bound;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }

    // dirt path polyline
    if (Array.isArray(path) && path.length >= 2){
      ctx.beginPath();
      path.forEach((p, i) => {
        if (!p || !num(p.x) || !num(p.z)) return;
        const s = W2S(p.x, p.z);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, MAP.sc * 1.6);
      ctx.strokeStyle = PAL.dirt;
      ctx.stroke();
    }

    // pond
    if (pond && num(pond.x) && num(pond.z) && num(pond.r)){
      const pc = W2S(pond.x, pond.z);
      ctx.beginPath();
      ctx.arc(pc.x, pc.y, Math.max(1, pond.r * MAP.sc), 0, Math.PI * 2);
      ctx.fillStyle = PAL.water; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = PAL.waterEdge; ctx.stroke();
    }
  }

  // recoloured NPC blips on top of the backdrop (MM3). The HUD draws its own
  // amber dots too; ours sit slightly larger underneath as a type cue and are
  // harmless duplicates if the HUD already coloured them.
  if (player && Array.isArray(_lastMarkers)){
    for (const m of _lastMarkers){
      if (!m || !num(m.x) || !num(m.z)) continue;
      const s = W2S(m.x, m.z);
      ctx.beginPath();
      ctx.arc(s.x, s.y, (m.r || 2.5) + 0.8, 0, Math.PI * 2);
      ctx.fillStyle = blipColor(m);
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

/* ----------------------------- public entry ----------------------------- */
/* Wire the click-to-walk + overlay onto #emmap. If the HUD hasn\'t created the
   minimap yet, retry on an interval until it exists (then give up quietly). */
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
  // expose a stopper that also cancels the poll if it\'s still pending
  return { stop(){ clearInterval(id); if (handle && handle.stop) handle.stop(); } };
}

/* actual wiring - only runs once #emmap is present */
function attachMinimapNav(){
  const map = document.getElementById('emmap');
  if (!map){ return; }                                    // race guard → no-op
  if (map.dataset.mmNav === '1') return;                  // idempotent
  map.dataset.mmNav = '1';

  const hudCanvas = map.querySelector('canvas');          // the HUD\'s own minimap canvas

  /* --- MM1: click-to-walk. Listen on #emmap (the container the HUD owns) so we
     never disturb hud\'s canvas drawing. Use the inner canvas (or the container)
     as the geometry box for the pixel→world inversion. --- */
  const geomBox = hudCanvas || map;
  map.style.cursor = 'pointer';
  map.addEventListener('click', (e) => {
    const w = clickToWorld(e.clientX, e.clientY, geomBox);
    if (!w) return;
    issueWalk(w.x, w.z);
  });
  // suppress the browser context menu on the minimap (parity with OSRS feel);
  // additive - does not interfere with hud\'s own handlers.
  map.addEventListener('contextmenu', (e) => { e.preventDefault(); });

  /* --- MM+2 / MM3: transparent overlay canvas layered over #emmap. It is
     pointer-events:none so all taps still reach the #emmap click handler above,
     and it sits UNDER the HUD canvas visually? No - #emmap clips children, and
     the HUD canvas is first. We append AFTER so our faint backdrop+blips draw on
     top; we keep it faint + the HUD dots remain visible. --- */
  let overlay = null, octx = null, rafId = 0;
  try {
    overlay = document.createElement('canvas');
    overlay.width = MAP.size; overlay.height = MAP.size;
    overlay.style.cssText =
      'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    // #emmap is position:fixed (a positioned ancestor) so absolute pins correctly.
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
