/* =====================================================================
   ELDERMOOR - minimap UNDER-layer renderer (MM3 / MM+2 / OSRS-parity pass).
   Additive only.

   The HUD (src/hud.js) owns #emmap and the dot canvas it draws the player
   + markers on. That canvas paints a flat grass fill + dots - no terrain,
   no zoom, no compass. This module adds a SEPARATE under-layer <canvas>
   inside #emmap, stacked BELOW the HUD's canvas (z-index), pointer-events:
   none, and paints an OSRS-style top-down of the world relative to the
   player each frame (~10 fps): the walkable bounds, the dirt-path stripe,
   the pond, and the chapel footprint - in terrain tones standing in for a
   heightmap (no real elevation data is exposed by the world model; see
   readTerrainTone()/readElevation() - the hook is honoured if it ever
   appears, else we fall back to the authored flat tones).

   It also owns a rotating compass ring (OSRS-parity "N" needle) drawn in
   its own small canvas stacked ABOVE the HUD's dot canvas, and the shared
   ZOOM state read by minimap-nav.js for click-to-walk + blip placement.

   It NEVER touches the HUD canvas or any HUD drawing. It reads only:
     window.EMPLAYERPOS         -> {x,z} live player world position (preferred)
     window.EMWORLD.bounds      -> {x0,x1,z0,z1} walkable bounds, if exposed
     window.EMWORLD.heightAt(x,z) / .elevationAt(x,z) -> optional heightmap
     window.EMHEADING / window.EMCAMANGLE -> optional live camera/player
                                              heading (radians), for the
                                              compass to rotate against. The
                                              client's camera is currently
                                              fixed (no yaw control), so this
                                              reads 0 and the ring sits at
                                              rest - wired ahead of need.
   and falls back to authored defaults (matching src/world.js + worldmap.js)
   when those globals are absent. No-ops gracefully (retries) until #emmap
   exists.

   Coordinate convention mirrors the HUD's own drawMap():
     screen = center + (world - player) * SCALE,  north-up, SCALE ~= 1.1,
     now multiplied by the shared zoom factor (see ZOOM below).

   Exposes:
     export function initMinimapRender()   // call once from main.js
     window.EMMINIMAP.zoom                 // shared zoom state (read/write),
                                            // consumed by minimap-nav.js so
                                            // both layers always agree on scale
   ===================================================================== */

/* ----- world geometry defaults (authored to match src/world.js BOUND +
   src/worldmap.js), in WORLD units (x east, z south/forward). Used only as a
   fallback when window.EMWORLD doesn't expose live values. ----- */
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

/* OSRS-style minimap tones (grass / path / water / stone). Used as the
   terrain-tone fallback when no live heightmap/biome hook is exposed. */
const PAL = {
  grass:   '#4f7a3a',   // walkable ground
  grassLo: '#43692f',   // lower-band variant (faux-elevation shading)
  grassHi: '#5c8a46',   // higher-band variant (faux-elevation shading)
  grassEdge: '#3a5e2b', // bounds edge
  outside: '#26331f',   // beyond the walkable bounds
  dirt:    '#9a7a48',   // dirt path
  water:   '#2c6a82',   // pond
  waterEdge: '#1b4a5e',
  stone:   '#b9a98a',   // chapel footprint
  stoneEdge: '#7a6a48',
  compass: '#e7c64f',
  compassDim: 'rgba(231,198,79,0.35)',
};

const SIZE = 108;                 // #emmap canvas is 108x108 (see hud.js)
const HALF = SIZE / 2;
const BASE_SCALE = 1.1;           // world units -> px at zoom = 1 (matches HUD drawMap)
const FRAME_MS = 100;             // ~10 fps for the terrain layer
const RETRY_MS = 250;             // poll for #emmap until it exists
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.4;
const ZOOM_DEFAULT = 1;

/* ---- shared zoom state, consumed by minimap-nav.js (click inversion +
   blip placement) so every layer agrees on scale. A plain mutable object
   (not a primitive) so both modules can read the live value without an
   event bus. Exposed read-only-by-convention via window.EMMINIMAP. ---- */
const zoomState = { value: ZOOM_DEFAULT };
export function getZoom(){ return zoomState.value; }
export function setZoom(v){
  zoomState.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v || ZOOM_DEFAULT));
  return zoomState.value;
}
export function currentScale(){ return BASE_SCALE * zoomState.value; }
export const ZOOM_BOUNDS = Object.freeze({ min: ZOOM_MIN, max: ZOOM_MAX });

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

/* optional live heightmap hook - honoured if the world model ever exposes
   one; otherwise null (caller falls back to flat terrain tones). Never
   throws: any hook failure is treated as "no heightmap". */
function readElevation(x, z) {
  const w = (typeof window !== 'undefined') && window.EMWORLD;
  if (!w) return null;
  try {
    if (typeof w.heightAt === 'function') { const h = w.heightAt(x, z); return isFinite(h) ? h : null; }
    if (typeof w.elevationAt === 'function') { const h = w.elevationAt(x, z); return isFinite(h) ? h : null; }
  } catch (_) { /* no-op - degrade to flat tone */ }
  return null;
}

/* optional live heading hook (radians) for the rotating compass. The
   client camera currently has no yaw control (see src/engine.js / input.js),
   so this resolves to 0 - the ring renders "at rest" pointing true north,
   which is correct parity behaviour, not a bug. */
function readHeading() {
  if (typeof window === 'undefined') return 0;
  const h = (typeof window.EMHEADING === 'number') ? window.EMHEADING
          : (typeof window.EMCAMANGLE === 'number') ? window.EMCAMANGLE
          : 0;
  return isFinite(h) ? h : 0;
}

export function initMinimapRender() {
  if (typeof document === 'undefined') return;   // SSR / headless guard

  let canvas = null, ctx = null, timer = 0;
  let compassCanvas = null, compassCtx = null, compassRaf = 0;

  /* world -> minimap-screen, north-up, player-relative, zoom-aware. */
  function w2s(x, z, px, pz) {
    const sc = currentScale();
    return {
      x: HALF + (x - px) * sc,
      y: HALF + (z - pz) * sc,
    };
  }

  function terrainTone(x, z, baseColor, loColor, hiColor) {
    const e = readElevation(x, z);
    if (e === null) return baseColor;
    if (e > 0.35) return hiColor;
    if (e < -0.35) return loColor;
    return baseColor;
  }

  function draw() {
    if (!ctx) return;
    const pp = readPlayerPos() || { x: 0, z: 8.5 };   // HUD's own default center
    const px = pp.x, pz = pp.z;
    const bounds = readBounds();
    const sc = currentScale();

    ctx.clearRect(0, 0, SIZE, SIZE);

    // ---- backdrop: "outside the walkable area" tone fills the disc ----
    ctx.fillStyle = PAL.outside;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ---- walkable bounds rectangle (grass, faux-elevation banded if a
    // heightmap hook exists) ----
    const a = w2s(bounds.x0, bounds.z0, px, pz);
    const b = w2s(bounds.x1, bounds.z1, px, pz);
    const bx = Math.min(a.x, b.x), by = Math.min(a.y, b.y);
    const bw = Math.abs(b.x - a.x), bh = Math.abs(b.y - a.y);

    ctx.fillStyle = terrainTone(px, pz, PAL.grass, PAL.grassLo, PAL.grassHi);
    ctx.fillRect(bx, by, bw, bh);

    // sample a coarse grid across the visible disc and tint by elevation
    // band when a live heightmap hook is present (cheap: ~8x8 max at the
    // current zoom range, and only runs the cell read if EMWORLD exposes it).
    if (typeof window !== 'undefined' && window.EMWORLD &&
        (typeof window.EMWORLD.heightAt === 'function' || typeof window.EMWORLD.elevationAt === 'function')) {
      const cell = Math.max(10, SIZE / 9);
      for (let gx = 0; gx < SIZE; gx += cell) {
        for (let gy = 0; gy < SIZE; gy += cell) {
          const wx = px + (gx + cell / 2 - HALF) / sc;
          const wz = pz + (gy + cell / 2 - HALF) / sc;
          if (wx < bounds.x0 || wx > bounds.x1 || wz < bounds.z0 || wz > bounds.z1) continue;
          const tone = terrainTone(wx, wz, null, PAL.grassLo, PAL.grassHi);
          if (!tone) continue;
          ctx.fillStyle = tone;
          ctx.globalAlpha = 0.55;
          ctx.fillRect(gx, gy, cell, cell);
          ctx.globalAlpha = 1;
        }
      }
    }

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
      ctx.lineWidth = Math.max(2, sc * 1.6);
      ctx.strokeStyle = PAL.dirt;
      ctx.stroke();
    }

    // ---- pond ----
    const pc = w2s(DEFAULTS.pond.x, DEFAULTS.pond.z, px, pz);
    ctx.beginPath();
    ctx.arc(pc.x, pc.y, Math.max(1, DEFAULTS.pond.r * sc), 0, Math.PI * 2);
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

  /* ---- compass ring + needle, drawn ABOVE the HUD's dot canvas so it
     reads as the topmost minimap chrome (OSRS parity: a fixed "N" tick
     plus a faint rotating ring). pointer-events:none throughout - never
     intercepts the click-to-walk handler minimap-nav.js attaches to
     #emmap itself. ---- */
  function drawCompass() {
    if (!compassCtx) return;
    const heading = readHeading();
    compassCtx.clearRect(0, 0, SIZE, SIZE);
    compassCtx.save();
    compassCtx.translate(HALF, HALF);
    compassCtx.rotate(-heading);

    // faint tick ring (N/E/S/W ticks) so rotation reads even when heading
    // is 0 (fixed camera today - ring still anchors the "N" label).
    compassCtx.strokeStyle = PAL.compassDim;
    compassCtx.lineWidth = 1;
    compassCtx.beginPath();
    compassCtx.arc(0, 0, HALF - 3, 0, Math.PI * 2);
    compassCtx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const x1 = Math.sin(a) * (HALF - 7), y1 = -Math.cos(a) * (HALF - 7);
      const x2 = Math.sin(a) * (HALF - 3), y2 = -Math.cos(a) * (HALF - 3);
      compassCtx.beginPath();
      compassCtx.moveTo(x1, y1); compassCtx.lineTo(x2, y2);
      compassCtx.stroke();
    }

    // N label, rotates with the ring (counter-rotated back to upright so
    // it always reads horizontally, OSRS-style).
    compassCtx.translate(0, -(HALF - 11));
    compassCtx.rotate(heading);
    compassCtx.fillStyle = PAL.compass;
    compassCtx.font = 'bold 11px Trebuchet MS';
    compassCtx.textAlign = 'center';
    compassCtx.textBaseline = 'middle';
    compassCtx.fillText('N', 0, 0);
    compassCtx.restore();
  }

  /* create + insert the under-layer canvas as the FIRST child of #emmap,
     positioned below the HUD's dot canvas via z-index; insert the compass
     canvas LAST so it sits above everything, including minimap-nav's blip
     overlay. */
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

    // ensure the HUD's own canvas paints ABOVE us. hud's canvas is the only
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

    // compass canvas: topmost layer (z-index above the HUD's own canvas and
    // above minimap-nav's blip overlay at z-index:1).
    const cc = document.createElement('canvas');
    cc.className = 'emmap-compass';
    cc.width = SIZE;
    cc.height = SIZE;
    cc.style.position = 'absolute';
    cc.style.left = '0';
    cc.style.top = '0';
    cc.style.width = '100%';
    cc.style.height = '100%';
    cc.style.display = 'block';
    cc.style.zIndex = '2';
    cc.style.pointerEvents = 'none';
    map.appendChild(cc);
    compassCanvas = cc;
    compassCtx = cc.getContext('2d');

    return true;
  }

  function loop() {
    draw();
    timer = setTimeout(loop, FRAME_MS);
  }

  function compassLoop() {
    drawCompass();
    compassRaf = requestAnimationFrame(compassLoop);
  }

  function waitForMap() {
    if (attach()) {
      loop();
      compassRaf = requestAnimationFrame(compassLoop);
      return;
    }
    timer = setTimeout(waitForMap, RETRY_MS);
  }

  waitForMap();

  // shared minimap API: zoom state + scale helper, read by minimap-nav.js
  // and left available for any future caller (e.g. a zoom UI button).
  if (typeof window !== 'undefined') {
    window.EMMINIMAP = Object.assign(window.EMMINIMAP || {}, {
      getZoom, setZoom, currentScale, ZOOM_BOUNDS, SIZE, HALF,
      redraw(){ draw(); drawCompass(); },
    });
  }

  // small handle for callers/teardown (optional)
  return {
    redraw() { draw(); drawCompass(); },
    stop() {
      if (timer) { clearTimeout(timer); timer = 0; }
      if (compassRaf) { cancelAnimationFrame(compassRaf); compassRaf = 0; }
    },
  };
}
