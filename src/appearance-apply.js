/* =====================================================================
   ELDERMOOR - appearance-apply module (CC3).

   Applies the character-creator appearance (colours) to the in-world
   player model by traversing window.EMSCENE (or the player group if
   exposed via window.EMPLAYER) and tinting meshes by heuristic name
   match against both object names and material names.

   Colour mapping (colours object from em-appearance detail):
     skin    → meshes whose name contains: skin, head, face, neck, hand
     hair    → meshes whose name contains: hair, beard, brow, fringe
     torso   → meshes whose name contains: body, torso, tunic, chest, arm, sleeve, shoulder
     legs    → meshes whose name contains: leg, trouser, pant, skirt, hip
     feet    → meshes whose name contains: foot, feet, boot, shoe, sole, ankle

   Exposes:
       export function initAppearanceApply()   // call once from main.js

   Wires:
     - window 'em-appearance' event (detail = {parts, colours, bodyType, pronoun})
     - window.EMAPPEARANCE (already set by charcreate on saved load)
     - localStorage 'eldermoor:appearance' (read once on init as fallback)

   No other files are edited; main.js wires this in.
   ===================================================================== */

const STORE_KEY = 'eldermoor:appearance';

/* -------------------------------------------------------------- mapping
   Each entry is [colourKey, [...nameParts]].
   We test the LOWER-CASED object name AND the lower-cased material name.
   First match wins per mesh; checks happen in declaration order so more
   specific keys (hair, skin) are checked before broader ones (torso).   */
const COLOUR_RULES = [
  ['skin',  ['skin', 'head', 'face', 'neck', 'hand']],
  ['hair',  ['hair', 'beard', 'brow', 'fringe', 'sideburn']],
  ['torso', ['body', 'torso', 'tunic', 'chest', 'arm', 'sleeve', 'shoulder', 'cape', 'cloak']],
  ['legs',  ['leg', 'trouser', 'pant', 'skirt', 'hip', 'thigh', 'shin']],
  ['feet',  ['foot', 'feet', 'boot', 'shoe', 'sole', 'ankle']],
];

/* ------------------------------------------------------------ helpers */

/** Safely read the localStorage appearance blob. Returns null on any error. */
function readSaved() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && obj.colours && typeof obj.colours === 'object') return obj;
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Return the colour key to use for `nameLC` (lower-cased object or
 * material name), or null if no rule matches.
 * @param {string} nameLC
 * @returns {string|null}
 */
function colourKeyForName(nameLC) {
  for (const [key, parts] of COLOUR_RULES) {
    for (const part of parts) {
      if (nameLC.includes(part)) return key;
    }
  }
  return null;
}

/**
 * Apply `colours` to all meshes inside `root` (a THREE.Object3D).
 * Mutates material.color.  Skips non-mesh nodes.
 * @param {THREE.Object3D} root
 * @param {Object} colours  { skin, hair, torso, legs, feet } (hex strings)
 */
function tintRoot(root, colours) {
  if (!root || typeof root.traverse !== 'function') return;

  root.traverse(function (obj) {
    if (!obj.isMesh) return;

    // Build a combined name string: object name + material name(s).
    const objNameLC = (obj.name || '').toLowerCase();
    const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);

    // Find the colour key from the object name first; fall back to material names.
    let key = colourKeyForName(objNameLC);

    if (!key) {
      for (const m of mats) {
        const matNameLC = (m && m.name ? m.name : '').toLowerCase();
        key = colourKeyForName(matNameLC);
        if (key) break;
      }
    }

    if (!key) return; // no rule matched - leave mesh colour as authored

    const hex = colours[key];
    if (!hex || typeof hex !== 'string') return;

    // Apply tint to every material slot on this mesh.
    for (const m of mats) {
      if (m && m.color && typeof m.color.set === 'function') {
        m.color.set(hex);
        m.needsUpdate = true;
      }
    }
  });
}

/**
 * Locate the player subtree.  We check (in order):
 *  1. window.EMPLAYER  - if main.js ever exposes the player Group directly.
 *  2. window.EMSCENE   - the shared Three.js scene (fallback: scan all children).
 * Returns the root to traverse, or null if nothing is available yet.
 * @returns {THREE.Object3D|null}
 */
function findPlayerRoot() {
  if (typeof window === 'undefined') return null;

  // Prefer a direct player reference if main.js exposes one.
  if (window.EMPLAYER && typeof window.EMPLAYER.traverse === 'function') {
    return window.EMPLAYER;
  }

  // Fall back to the full scene - traverse will still match only named meshes.
  if (window.EMSCENE && typeof window.EMSCENE.traverse === 'function') {
    return window.EMSCENE;
  }

  return null;
}

/**
 * Main apply function.  Given a full appearance object, extract colours
 * and tint the player meshes.
 * @param {Object} appearance  { colours: {skin,hair,torso,legs,feet}, ... }
 */
function applyAppearance(appearance) {
  if (!appearance) return;
  const colours = appearance.colours;
  if (!colours || typeof colours !== 'object') return;

  // Guard: THREE must be present (loaded by the host page).
  if (typeof window === 'undefined' || !window.THREE) {
    console.warn('[em:appearance-apply] THREE not available - cannot tint meshes');
    return;
  }

  const root = findPlayerRoot();
  if (!root) {
    // Scene not ready yet; schedule one retry after a short delay.
    setTimeout(function () {
      const r = findPlayerRoot();
      if (r) tintRoot(r, colours);
    }, 500);
    return;
  }

  tintRoot(root, colours);
}

/* --------------------------------------------------------------- init */

/**
 * Wire up the appearance-apply system.  Call once from main.js.
 * Reads any already-saved appearance on startup, then keeps listening for
 * 'em-appearance' events fired by charcreate.js.
 */
export function initAppearanceApply() {
  if (typeof window === 'undefined') return;

  // 1. Try window.EMAPPEARANCE (set by charcreate when a save exists).
  if (window.EMAPPEARANCE) {
    applyAppearance(window.EMAPPEARANCE);
  } else {
    // 2. Fallback: read localStorage directly (covers the case where this
    //    module runs before charcreate mirrors EMAPPEARANCE).
    const saved = readSaved();
    if (saved) applyAppearance(saved);
  }

  // 3. Re-apply every time the player confirms / redesigns their character.
  window.addEventListener('em-appearance', function (e) {
    try {
      applyAppearance(e && e.detail ? e.detail : null);
    } catch (err) {
      console.warn('[em:appearance-apply] em-appearance handler error:', err);
    }
  });
}
