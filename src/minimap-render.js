/* =====================================================================
   ELDERMOOR - minimap UNDER-layer renderer (MM3 / MM+2). Additive only.

   The HUD (src/hud.js) owns #emmap and the dot canvas it draws the player
   + markers on. That canvas paints a flat grass fill + dots - no terrain.
   This module adds a SEPARATE under-layer <canvas> inside #emmap, stacked
   BELOW the HUD\'s canvas (z-index), pointer-events:none, and paints a
   simple north-up top-down of the world relative to the player each frame
   (~10 fps): the walkable bounds, the dirt-path stripe, the pond, and the
   chapel footprint - in OSRS minimap tones.

   It NEVER touches the HUD canvas or any HUD drawing. It reads only:
     window.EMPLAYERPOS         -> {x,z} live player world position (preferred)
     window.EMWORLD.bounds      -> {x0,x1,z0,z1} walkable bounds, if exposed
   and falls back to authored defaults (matching src/world.js + worldmap.js)
   when those globals are absent. No-ops gracefully (retries) until #emmap
   exists.

   Coordinate convention mirrors the HUD\'s own drawMap():
     screen = center + (world - player) * SCALE,  north-up, SCALE ~= 1.1.

   Exposes:
     export function initMinimapRender()   // call once from main.js
   ===================================================================== */

/* ----- world geometry defaults (authored to match src/world.js BOUND +
   src/worldmap.js), in WORLD units (x east, z south/forward). Used only as a
   fallback when window.EMWORLD doesn\'t expose live values. ----- */
const DEFAULTS = {
  bounds: { x0: -7, x1: 7, z0: -5, z1: 14 },          // playable rectangle
  chapel: { x0: -4.2, x1: 4.2, z0: -3.6, z1: 4.4 },   // chapel footprint
  pond:   { x: 4.6, z: 10.2, r: 2.4 },                // the pond
  // dirt path: polyline from chapel door south to the dock
  path: [
    { x: 0,    z: 4.4 },
    { x: 0.4,  z: 7.0 },
    { x: -0.6, z: 9.5 },
    { x: -1.2, z: 12.0 },
    { x: -1.2, z: 13.6 },
  ],
};

/* OSRS-style minimap tones (grass / path / water / stone). */
const PAL = {
  grass:   '#4f7a3a',   // walkable ground
  grassEdge: '#3a5e2b', // bounds edge
  outside: '#26331f',   // beyond the walkable bounds
  dirt:    '#9a7a48',   // dirt path
  water:   '#2c6a82',   // pond
  waterEdge: '#1b4a5e',
  stone:   '#b9a98a',   // chapel footprint
  stoneEdge: '#7a6a48',
};

const SIZE = 108;                 // #emmap canvas is 108×108 (see hud.js)
const HALF = SIZE / 2;
const SCALE = 1.1;                // world units → px (matches HUD drawMap)
const FRAME_MS = 100;             // ~10 fps
const RETRY_MS = 250;             // poll for #emmap until it exists

/* ---- defensive reads (numbers or null), never throw ---- */
function readPlayerPos() {
  const p = (typeof window !== 'undefined') && window.EMPLAYERPOS;
  if (p && typeof p.x === 'number' && typeof p.z === 'number' &&
      isFinite(p.x) && isFinite(p.z)) {
    return { x: p.x, z: p.z };
  }
  return null;
}

function readBounds() {
  const w = (typeof window !== 'undefined') && window.EMWORLD;
  const b = w && w.bounds;
  if (b &&
      typeof b.x0 === 'number' && typeof b.x1 === 'number' &&
      typeof b.z0 === 'number' && typeof b.z1 === 'number' &&
      isFinite(b.x0) && isFinite(b.x1) && isFinite(b.z0) && isFinite(b.z1)) {
    return { x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1 };
  }
  return DEFAULTS.bounds;
}

export function initMinimapRender() {
  if (typeof document === 'undefined') return;   // SSR / headless guard

  let canvas = null, ctx = null, timer = 0;

  /* world → minimap-screen, north-up, player-relative. */
  function w2s(x, z, px, pz) {
    return {
      x: HALF + (x - px) * SCALE,
      y: HALF + (z - pz) * SCALE,
    };
  }

  function draw() {
    if (!ctx) return;
    const pp = readPlayerPos() || { x: 0, z: 8.5 };   // HUD\'s own default center
    const px = pp.x, pz = pp.z;
    const bounds = readBounds();

    ctx.clearRect(0, 0, SIZE, SIZE);

    // ---- backdrop: "outside the walkable area" tone fills the disc ----
    ctx.fillStyle = PAL.outside;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ---- walkable bounds rectangle (grass) ----
    const a = w2s(bounds.x0, bounds.z0, px, pz);
    const b = w2s(bounds.x1, bounds.z1, px, pz);
    const bx = Math.min(a.x, b.x), by = Math.min(a.y, b.y);
    const bw = Math.abs(b.x - a.x), bh = Math.abs(b.y - a.y);
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(bx, by, bw, bh);
    ctx.lineWidth = 1;
    ctx.strokeStyle = PAL.grassEdge;
    ctx.strokeRect(bx, by, bw, bh);

    // clip subsequent terrain to the walkable rect so nothing bleeds out
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.clip();

    // ---- dirt path stripe ----
    if (DEFAULTS.path.length >= 2) {
      ctx.beginPath();
      DEFAULTS.path.forEach((p, i) => {
        const s = w2s(p.x, p.z, px, pz);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, SCALE * 1.6);
      ctx.strokeStyle = PAL.dirt;
      ctx.stroke();
    }

    // ---- pond ----
    const pc = w2s(DEFAULTS.pond.x, DEFAULTS.pond.z, px, pz);
    ctx.beginPath();
    ctx.arc(pc.x, pc.y, Math.max(1, DEFAULTS.pond.r * SCALE), 0, Math.PI * 2);
    ctx.fillStyle = PAL.water;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = PAL.waterEdge;
    ctx.stroke();

    // ---- chapel footprint ----
    const ca = w2s(DEFAULTS.chapel.x0, DEFAULTS.chapel.z0, px, pz);
    const cb = w2s(DEFAULTS.chapel.x1, DEFAULTS.chapel.z1, px, pz);
    const cx = Math.min(ca.x, cb.x), cy = Math.min(ca.y, cb.y);
    const cw = Math.abs(cb.x - ca.x), ch = Math.abs(cb.y - ca.y);
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(cx, cy, cw, ch);
    ctx.lineWidth = 1;
    ctx.strokeStyle = PAL.stoneEdge;
    ctx.strokeRect(cx, cy, cw, ch);

    ctx.restore();   // drop the bounds clip
  }

  /* create + insert the under-layer canvas as the FIRST child of #emmap,
     positioned below the HUD\'s dot canvas via z-index. */
  function attach() {
    const map = document.getElementById('emmap');
    if (!map) return false;
    if (map.querySelector('canvas.emmap-under')) return true;  // idempotent

    const c = document.createElement('canvas');
    c.className = 'emmap-under';
    c.width = SIZE;
    c.height = SIZE;
    // sit under the HUD canvas, fill the disc, never intercept clicks
    c.style.position = 'absolute';
    c.style.left = '0';
    c.style.top = '0';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.display = 'block';
    c.style.zIndex = '0';
    c.style.pointerEvents = 'none';

    // #emmap is position:static in hud.js CSS; make it a positioning context
    // so absolute children stack predictably (additive style on the container
    // only - we never alter the HUD canvas itself).
    const cs = window.getComputedStyle(map);
    if (cs.position === 'static') map.style.position = 'relative';

    // ensure the HUD\'s own canvas paints ABOVE us. hud\'s canvas is the only
    // pre-existing canvas; give it a higher z-index without touching its
    // drawing. (Setting an inline style is additive; hud never reads it.)
    map.querySelectorAll('canvas').forEach((existing) => {
      if (existing === c) return;
      if (!existing.style.position) existing.style.position = 'relative';
      // raise above the under-layer
      existing.style.zIndex = '1';
    });

    // insert as first child so DOM order also favours the HUD canvas on top
    map.insertBefore(c, map.firstChild);

    canvas = c;
    ctx = c.getContext('2d');
    return true;
  }

  function loop() {
    draw();
    timer = setTimeout(loop, FRAME_MS);
  }

  function waitForMap() {
    if (attach()) {
      loop();
      return;
    }
    timer = setTimeout(waitForMap, RETRY_MS);
  }

  waitForMap();

  // small handle for callers/teardown (optional)
  return {
    redraw: draw,
    stop() { if (timer) { clearTimeout(timer); timer = 0; } },
  };
}
