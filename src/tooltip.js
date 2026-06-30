// tooltip.js - Eldermoor custom hover-tooltip system (SK+1/INV+5)
//
// Replaces the native `title` attribute (which has a sluggish browser delay)
// with a single, instant, OSRS-styled floating tooltip that follows the cursor.
//
// Public API (exposed on window.EMTIP after initTooltip()):
//   EMTIP.show(html, x, y)   -> show tooltip with `html` content at viewport coords (x, y)
//   EMTIP.hide()             -> hide the tooltip
//   EMTIP.attach(el, src)    -> wire mouseenter/mousemove/mouseleave on `el`.
//                               `src` is either an HTML string, or a function
//                               (event) => htmlString resolved on each enter/move.
//                               Returns a detach() function to remove the wiring.
//
// Self-contained: CSS is injected on init; no external dependencies.

const STYLE_ID = 'em-tooltip-style';
const TIP_ID = 'em-tooltip';

// Cursor offset so the panel doesn\'t sit under the pointer.
const OFFSET_X = 14;
const OFFSET_Y = 18;
// Keep the panel inside the viewport with this margin.
const EDGE_MARGIN = 6;

const CSS = `
#${TIP_ID} {
  position: fixed;
  z-index: 100000;
  top: 0;
  left: 0;
  max-width: 280px;
  padding: 5px 9px;
  font-family: "Trebuchet MS", "Segoe UI", Tahoma, sans-serif;
  font-size: 12px;
  line-height: 1.35;
  color: #ffe9b0;
  background: #1b140c;
  border: 1px solid #d8b25a;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
  text-shadow: 1px 1px 0 #000;
  pointer-events: none;
  white-space: normal;
  opacity: 0;
  visibility: hidden;
}
#${TIP_ID}.em-tip-on {
  opacity: 1;
  visibility: visible;
}
#${TIP_ID} b,
#${TIP_ID} strong { color: #ffd86a; }
#${TIP_ID} .em-tip-sub { color: #b9a884; font-size: 11px; }
`;

let tipEl = null;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function ensureEl() {
  let el = document.getElementById(TIP_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = TIP_ID;
    el.setAttribute('role', 'tooltip');
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}

// Clamp the panel within the viewport given a desired top-left anchor.
function position(x, y) {
  if (!tipEl) return;
  let left = x + OFFSET_X;
  let top = y + OFFSET_Y;

  const rect = tipEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Flip to the left of the cursor if it would overflow the right edge.
  if (left + rect.width + EDGE_MARGIN > vw) {
    left = x - OFFSET_X - rect.width;
  }
  if (left < EDGE_MARGIN) left = EDGE_MARGIN;

  // Flip above the cursor if it would overflow the bottom edge.
  if (top + rect.height + EDGE_MARGIN > vh) {
    top = y - OFFSET_Y - rect.height;
  }
  if (top < EDGE_MARGIN) top = EDGE_MARGIN;

  tipEl.style.left = left + 'px';
  tipEl.style.top = top + 'px';
}

function show(html, x, y) {
  if (!tipEl) tipEl = ensureEl();
  tipEl.innerHTML = html == null ? '' : String(html);
  tipEl.classList.add('em-tip-on');
  tipEl.setAttribute('aria-hidden', 'false');
  position(typeof x === 'number' ? x : 0, typeof y === 'number' ? y : 0);
}

function hide() {
  if (!tipEl) return;
  tipEl.classList.remove('em-tip-on');
  tipEl.setAttribute('aria-hidden', 'true');
}

// Resolve the content source: a function gets the event; a string is used as-is.
function resolve(src, ev) {
  try {
    return typeof src === 'function' ? src(ev) : src;
  } catch (err) {
    // Never let a bad content provider break hover handling.
    if (typeof console !== 'undefined') console.error('[EMTIP] content fn failed:', err);
    return '';
  }
}

function attach(el, src) {
  if (!el || typeof el.addEventListener !== 'function') {
    if (typeof console !== 'undefined') console.warn('[EMTIP] attach: invalid element');
    return () => {};
  }

  const onEnter = (ev) => {
    const html = resolve(src, ev);
    if (html == null || html === '') { hide(); return; }
    show(html, ev.clientX, ev.clientY);
  };
  const onMove = (ev) => {
    // Only reposition while visible; refresh dynamic content cheaply on move.
    if (!tipEl || !tipEl.classList.contains('em-tip-on')) return;
    if (typeof src === 'function') {
      const html = resolve(src, ev);
      if (html == null || html === '') { hide(); return; }
      tipEl.innerHTML = String(html);
    }
    position(ev.clientX, ev.clientY);
  };
  const onLeave = () => hide();

  el.addEventListener('mouseenter', onEnter);
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseleave', onLeave);

  // Detach function to cleanly remove listeners (immutable callers can drop the el).
  return function detach() {
    el.removeEventListener('mouseenter', onEnter);
    el.removeEventListener('mousemove', onMove);
    el.removeEventListener('mouseleave', onLeave);
  };
}

export function initTooltip() {
  if (typeof document === 'undefined') {
    if (typeof console !== 'undefined') console.warn('[EMTIP] no document; init skipped');
    return null;
  }
  ensureStyle();
  tipEl = ensureEl();

  const api = { show, hide, attach };
  window.EMTIP = api;
  return api;
}

export default initTooltip;
