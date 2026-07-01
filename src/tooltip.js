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
//
// ---- Auto-enrichment (this module only; no other files touched) ----------
// initTooltip() also wires two read-only, delegated hover sources so callers
// elsewhere don't need to change: hovering an inventory/equipment slot in the
// EMHUD panel (`.eminv .s[data-i]`, `.emeq .s`) shows name + a short stat/verb
// line (equip bonuses, value, examine snippet) pulled from window.EMHUD /
// window.EMEQUIP + the item def; hovering a world target mirrors interact.js's
// top-left `#hoverLabel` action label (verb + name) as a richer near-cursor
// panel, without duplicating its raycast/picking logic. Both auto-sources are
// skipped entirely on touch devices, where a cursor-following tooltip has no
// useful purpose and would only get in the way of taps.

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
#${TIP_ID} .em-tip-verb { color: #8fe08f; }
#${TIP_ID} .em-tip-bonus { color: #7fd0ff; }
#${TIP_ID} .em-tip-examine { color: #d8cba6; font-style: italic; }
`;

let tipEl = null;
// Which auto-enrichment source (if any) currently owns the visible tooltip,
// so the inventory/equip watcher and the world-target watcher never blindly
// hide or overwrite content the other one just showed. null = none / a
// manual EMTIP.attach() caller owns it (those manage their own show/hide).
let tipOwner = null;

// ---- XSS-safe escaping for any dynamic text this module renders itself. ---
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// Coarse-pointer / touch check: hover tooltips that trail the cursor are
// useless (and can visually get in the way) on touch-only devices, so the
// two auto-enrichment sources below skip wiring entirely there. This does
// not affect manual EMTIP.attach() calls made by other modules.
function isTouchDevice() {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      if (window.matchMedia('(pointer: coarse)').matches) return true;
    }
  } catch (_err) { /* matchMedia not available; fall through */ }
  if (typeof window !== 'undefined' && ('ontouchstart' in window)) return true;
  if (typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0) return true;
  return false;
}

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

function show(html, x, y, owner) {
  if (!tipEl) tipEl = ensureEl();
  tipEl.innerHTML = html == null ? '' : String(html);
  tipEl.classList.add('em-tip-on');
  tipEl.setAttribute('aria-hidden', 'false');
  tipOwner = owner || null;
  position(typeof x === 'number' ? x : 0, typeof y === 'number' ? y : 0);
}

function hide(owner) {
  // If a specific owner is passed, only hide when that owner (or nothing)
  // currently controls the tooltip — so one auto-source can't blank out
  // content the other source just showed.
  if (owner && tipOwner && tipOwner !== owner) return;
  if (!tipEl) return;
  tipEl.classList.remove('em-tip-on');
  tipEl.setAttribute('aria-hidden', 'true');
  tipOwner = null;
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

// ---------------------------------------------------------------- item tips
// Build the richer item-hover panel: name, a short verb/equip-bonus line,
// value, and a trimmed examine snippet. `def` is an items.json entry (may be
// missing fields); `id` is the fallback label when a def can't be found.
const BONUS_LABELS = { attack: 'Atk', strength: 'Str', defence: 'Def', ranged: 'Rng', magic: 'Mag' };
const EXAMINE_MAX = 90;

function bonusLine(def) {
  const b = def && def.equipBonus;
  if (!b) return '';
  const parts = Object.keys(b)
    .map(k => ({ k, v: Number(b[k]) || 0 }))
    .filter(p => p.v !== 0)
    .map(p => `${BONUS_LABELS[p.k] || esc(p.k)} ${p.v > 0 ? '+' : ''}${p.v}`);
  if (!parts.length) return '';
  return `<div class="em-tip-bonus">${parts.join('  ')}</div>`;
}

function examineSnippet(def) {
  const text = def && def.examine;
  if (!text) return '';
  const s = String(text);
  const trimmed = s.length > EXAMINE_MAX ? s.slice(0, EXAMINE_MAX - 1).trimEnd() + '…' : s;
  return `<div class="em-tip-examine">${esc(trimmed)}</div>`;
}

// Build the hover panel for one inventory/equipment entry. `count` is only
// shown for stackable items with count > 1 (mirrors the HUD's own display).
function itemTipHtml(def, id, count) {
  const name = esc((def && def.name) || id || 'Unknown item');
  const countTag = (count && count > 1) ? ` <span class="em-tip-sub">×${count}</span>` : '';
  const verb = (def && def.verbs && def.verbs[0]) || (def && def.equipable ? 'Wield' : 'Use');
  const verbLine = `<div class="em-tip-verb">${esc(verb)}${def && def.slot ? ' • ' + esc(def.slot) : ''}</div>`;
  const value = (def && typeof def.value === 'number')
    ? `<div class="em-tip-sub">Value: ${def.value} gp</div>` : '';
  return `<div><b>${name}</b>${countTag}${verbLine}${bonusLine(def)}${value}${examineSnippet(def)}</div>`;
}

// ------------------------------------------------------- inventory/equip auto-wire
// Delegated hover: no per-slot listeners to attach/detach as the HUD re-renders
// its panel innerHTML on every tab switch (which would orphan direct listeners).
// Reads item data only through window.EMHUD / window.EMEQUIP; never mutates them.
const EQUIP_SLOT_NAMES = ['head', 'cape', 'neck', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring', 'ammo'];

function findInvSlotEl(el) {
  return el.closest ? el.closest('.eminv .s[data-i]') : null;
}
function findEquipSlotEl(el) {
  return el.closest ? el.closest('.emeq .s') : null;
}

function invSlotTip(slotEl) {
  const hud = (typeof window !== 'undefined') ? window.EMHUD : null;
  if (!hud || typeof hud.getInv !== 'function' || typeof hud.getItems !== 'function') return '';
  const i = parseInt(slotEl.getAttribute('data-i'), 10);
  const inv = hud.getInv() || [];
  const entry = inv[i];
  if (!entry) return '';
  const items = hud.getItems() || {};
  const def = items[entry.id] || null;
  return itemTipHtml(def, entry.id, entry.count);
}

function equipSlotTip(slotEl) {
  const slotName = (slotEl.textContent || '').trim().toLowerCase();
  if (EQUIP_SLOT_NAMES.indexOf(slotName) === -1) return ''; // not a recognised slot cell
  const eq = (typeof window !== 'undefined') ? window.EMEQUIP : null;
  const hud = (typeof window !== 'undefined') ? window.EMHUD : null;
  if (!eq || !eq.worn || !hud || typeof hud.getItems !== 'function') {
    return `<div><b>${esc(slotName)}</b><div class="em-tip-sub">Nothing equipped</div></div>`;
  }
  const entry = eq.worn[slotName];
  if (!entry) return `<div><b>${esc(slotName)}</b><div class="em-tip-sub">Nothing equipped</div></div>`;
  const items = hud.getItems() || {};
  const def = items[entry.id] || null;
  return itemTipHtml(def, entry.id, entry.count);
}

const OWNER_INV = 'inv';

function wireInventoryAutoTip() {
  if (typeof document === 'undefined') return () => {};
  const onEnter = (ev) => {
    if (isTouchDevice()) return;
    const invEl = findInvSlotEl(ev.target);
    if (invEl) { const html = invSlotTip(invEl); if (html) show(html, ev.clientX, ev.clientY, OWNER_INV); else hide(OWNER_INV); return; }
    const eqEl = findEquipSlotEl(ev.target);
    if (eqEl) { const html = equipSlotTip(eqEl); if (html) show(html, ev.clientX, ev.clientY, OWNER_INV); else hide(OWNER_INV); return; }
  };
  const onMove = (ev) => {
    if (isTouchDevice()) return;
    if (!tipEl || !tipEl.classList.contains('em-tip-on') || tipOwner !== OWNER_INV) return;
    const invEl = findInvSlotEl(ev.target);
    if (invEl) { const html = invSlotTip(invEl); if (html) { tipEl.innerHTML = html; position(ev.clientX, ev.clientY); } else hide(OWNER_INV); return; }
    const eqEl = findEquipSlotEl(ev.target);
    if (eqEl) { const html = equipSlotTip(eqEl); if (html) { tipEl.innerHTML = html; position(ev.clientX, ev.clientY); } else hide(OWNER_INV); return; }
    hide(OWNER_INV);
  };
  const onLeave = (ev) => {
    // Only hide if we're leaving a slot entirely (not moving between two
    // overlapping elements inside the same slot cell, e.g. the count badge).
    const to = ev.relatedTarget;
    if (to && (findInvSlotEl(to) || findEquipSlotEl(to))) return;
    hide(OWNER_INV);
  };
  // Delegated on the document body (capture on 'over'/'out' since slot cells
  // are re-created on every HUD render and don't bubble plain mouseenter/leave).
  document.addEventListener('mouseover', onEnter, true);
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('mouseout', onLeave, true);
  return function detach() {
    document.removeEventListener('mouseover', onEnter, true);
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mouseout', onLeave, true);
  };
}

// ------------------------------------------------------- world-target auto-wire
// Mirrors interact.js's #hoverLabel (verb + target name for whatever's under
// the cursor in the 3D scene) into a richer near-cursor EMTIP panel, without
// duplicating its raycast/picking logic. Read-only: watches the existing
// #hoverLabel element via MutationObserver + polls its visibility on
// pointermove, so it never touches interact.js.
const OWNER_WORLD = 'world';

function wireWorldTargetAutoTip() {
  if (typeof document === 'undefined') return () => {};
  const hoverLabel = document.getElementById('hoverLabel');
  const worldCanvas = document.getElementById('c');
  if (!hoverLabel || !worldCanvas) return () => {}; // interact.js/engine.js not present on this page

  let lastX = 0, lastY = 0;
  let overCanvas = false; // only mirror while the cursor is actually over the 3D canvas

  function refreshFromLabel() {
    if (isTouchDevice() || !overCanvas) return;
    if (hoverLabel.style.display === 'none' || !hoverLabel.textContent.trim()) { hide(OWNER_WORLD); return; }
    // hoverLabel's own innerHTML is already a small trusted markup
    // (`<span style="color:#e7c64f">Verb</span> Name`) built by interact.js
    // from internal name/verb strings, not raw user input — safe to mirror.
    show(`<div class="em-tip-worldtarget">${hoverLabel.innerHTML}</div>`, lastX, lastY, OWNER_WORLD);
  }

  const onCanvasMove = (ev) => {
    overCanvas = true;
    lastX = ev.clientX; lastY = ev.clientY;
    if (isTouchDevice()) return;
    // Don't fight the canvas's own cursor-drag/camera handling: hoverLabel
    // itself already goes hidden while a button is held, so just mirror it.
    refreshFromLabel();
  };
  const onCanvasLeave = () => { overCanvas = false; hide(OWNER_WORLD); };

  const mo = (typeof MutationObserver !== 'undefined')
    ? new MutationObserver(refreshFromLabel)
    : null;
  if (mo) mo.observe(hoverLabel, { attributes: true, attributeFilter: ['style'], childList: true, characterData: true, subtree: true });

  // Bound to the canvas itself (not document) so this only ever engages while
  // the cursor is over the 3D view, never while hovering HUD panels/chat/etc.
  worldCanvas.addEventListener('pointermove', onCanvasMove, { passive: true });
  worldCanvas.addEventListener('pointerleave', onCanvasLeave, { passive: true });

  return function detach() {
    worldCanvas.removeEventListener('pointermove', onCanvasMove);
    worldCanvas.removeEventListener('pointerleave', onCanvasLeave);
    if (mo) mo.disconnect();
  };
}

export function initTooltip() {
  if (typeof document === 'undefined') {
    if (typeof console !== 'undefined') console.warn('[EMTIP] no document; init skipped');
    return null;
  }
  ensureStyle();
  tipEl = ensureEl();

  // Auto-enrichment sources (see module header). Kept internal — callers
  // still just use EMTIP.show/hide/attach as before; nothing new to opt into.
  wireInventoryAutoTip();
  wireWorldTargetAutoTip();

  const api = { show, hide, attach };
  window.EMTIP = api;
  return api;
}

export default initTooltip;
