/* =====================================================================
   ELDERMOOR - combat module (SYS8 / CBT1-9 / XP1). A tick-based melee
   combat engine in the OSRS register: approach to melee range, then on each
   600ms tick roll accuracy vs defence, roll uniform damage 0..maxHit, splash
   a coloured hitsplat sprite + green/red HP bar over the target, award XP via
   window.EMHUD.addXp (4× dmg to the style skill + 1.33× dmg to hitpoints),
   let the mob retaliate, and on mob death drop bones + respawn after respawnMs.

   Self-contained + side-effect-free at import: main.js calls initCombat() once.
   Reads config from window.EMDATA.combat (assets/data/combat.json). No-ops
   gracefully whenever EMDATA / EMHUD / THREE are not yet ready.

   Public API (after initCombat()):
     window.EMCOMBAT = {
       attack(mobInstance),   // begin/continue attacking a mob instance
       tick(),                // advance one combat tick (also self-driven)
       stop(),                // disengage the current target
       cfg(),                 // the resolved combat config (or null)
       ready()                // true once a config has been resolved
     }
   ===================================================================== */

/* ---- safe global accessors (never assume load order) -------------------- */
function THREE_()  { return (typeof window !== 'undefined') ? window.THREE   : undefined; }
function HUD()     { return (typeof window !== 'undefined') ? window.EMHUD   : undefined; }
function DATA()    { return (typeof window !== 'undefined') ? window.EMDATA  : undefined; }
function EQUIP()   { return (typeof window !== 'undefined') ? window.EMEQUIP : undefined; }
function MOVE_()   { return (typeof window !== 'undefined') ? window.EMMOVE  : undefined; }
function WORLD_()  { return (typeof window !== 'undefined') ? window.EMWORLD : undefined; }

/* CBT-ANIM: trigger the lightweight, asset-free swing/death poses that player.js
   drives every frame off the existing rig pivots (see player.js's playerAnim). */
function playSwing()   { if (typeof window !== 'undefined' && window.playSwingAnim)  window.playSwingAnim(); }
function playDeath()   { if (typeof window !== 'undefined' && window.playDeathAnim)  window.playDeathAnim(); }
function clearDeath()  { if (typeof window !== 'undefined' && window.clearDeathAnim) window.clearDeathAnim(); }

/* ---- defaults (used only to fill gaps in a partial/missing config) ------- */
const FALLBACK_STYLE_DEFS = {
  accurate: { id: 'accurate', name: 'Accurate', category: 'melee', desc: 'Focuses on landing hits. Trains Attack.', trains: ['attack'], split: [1] },
};
const FALLBACK_WEAPON_CLASSES = [
  { id: 'unarmed', match: [], styles: ['accurate'], defaultStyle: 'accurate' },
];
const FALLBACK = {
  tickMs: 600,
  xpPerDamage: 4,
  hpXpPerDamage: 1.33,
  hitsplat: { hit: '#c83232', zero: '#3a64c8', max: '#36c8c8' },
  styles: [{ id: 'accurate', name: 'Accurate', trains: ['attack'], xpMode: 'attack' }],
  styleDefs: FALLBACK_STYLE_DEFS,
  weaponClasses: FALLBACK_WEAPON_CLASSES,
  mobs: [],
};

/* attack/defence/level defaults for the player when the HUD can\'t supply them.
   Kept deliberately modest so unarmed early-game combat reads like Tutorial Island. */
const PLAYER_DEFAULTS = { attack: 1, strength: 1, defence: 1, maxHit: 1, attackSpeedTicks: 4 };
const MELEE_RANGE  = 1.6;           // world units within which a melee tick can land
const RANGED_RANGE = 8.0;           // max world units for a ranged shot
const BONES_ITEM   = 'bones';       // drop id awarded on death (matches items.json)

let CFG = null;
let initialised = false;

/* subscribe fn to the shared global game tick (window.EMTICK) so combat beats on
   the same cadence as every other system. Falls back to a private setInterval at
   the configured rate if the shared clock isn't present, so combat still works
   even if tick.js failed to load. Returns an unsubscribe function. */
function onTick(fn) {
  if (typeof window !== 'undefined' && window.EMTICK && typeof window.EMTICK.subscribe === 'function') {
    return window.EMTICK.subscribe(fn);
  }
  const period = (CFG && CFG.tickMs) || FALLBACK.tickMs;
  if (typeof setInterval !== 'function') return () => {};
  const id = setInterval(fn, period);
  return () => { if (typeof clearInterval === 'function') clearInterval(id); };
}

/* uniform integer in [0, n] inclusive */
function rollDamage(maxHit) {
  const m = Math.max(0, maxHit | 0);
  return Math.floor(Math.random() * (m + 1));
}

/* OSRS-flavoured accuracy: attacker roll vs defender roll. Both sides scale with
   their (attack/defence) stat; ties and misses are possible. Returns true on a hit.
   This is intentionally simple - a real hit-chance formula can replace it later
   without touching the tick loop. */
function rollHit(attack, defence) {
  const atkRoll = Math.random() * (Math.max(1, attack) + 1);
  const defRoll = Math.random() * (Math.max(1, defence) + 1);
  return atkRoll >= defRoll;
}

/* resolve the active combat config: EMDATA.combat first, fallback otherwise.
   Re-resolved lazily so combat works even if EMDATA arrives after initCombat(). */
function resolveCfg() {
  const d = DATA();
  const raw = (d && d.combat) ? d.combat : null;
  if (!raw) { CFG = CFG || null; return CFG; }
  CFG = {
    tickMs:        Number(raw.tickMs) > 0 ? Number(raw.tickMs) : FALLBACK.tickMs,
    xpPerDamage:   Number.isFinite(Number(raw.xpPerDamage))   ? Number(raw.xpPerDamage)   : FALLBACK.xpPerDamage,
    hpXpPerDamage: Number.isFinite(Number(raw.hpXpPerDamage)) ? Number(raw.hpXpPerDamage) : FALLBACK.hpXpPerDamage,
    hitsplat:      Object.assign({}, FALLBACK.hitsplat, raw.hitsplat || {}),
    styles:        Array.isArray(raw.styles) && raw.styles.length ? raw.styles : FALLBACK.styles,
    styleDefs:     (raw.styleDefs && typeof raw.styleDefs === 'object') ? raw.styleDefs : FALLBACK.styleDefs,
    weaponClasses: Array.isArray(raw.weaponClasses) && raw.weaponClasses.length ? raw.weaponClasses : FALLBACK.weaponClasses,
    mobs:          Array.isArray(raw.mobs) ? raw.mobs : [],
  };
  return CFG;
}

/* ---- combat styles: weapon-class aware (CB-STYLES) -----------------------
   OSRS parity: the set of available attack styles depends on the equipped
   weapon class (melee weapons offer Accurate/Aggressive/Defensive/Controlled
   or a 3-style subset, bows offer Accurate/Rapid/Longrange), and the chosen
   style determines which skill(s) actually receive XP on a hit. The selected
   style id is kept *per weapon class* so switching weapons mid-session doesn\'t
   silently reset (or carry over) a choice that doesn\'t apply to the new class,
   and is re-derived fresh from EMEQUIP.worn.weapon on every read - no event
   wiring required for it to "update when you choose different weapons". */

// last style explicitly picked per weapon-class id, e.g. { melee_sword: 'aggressive' }
const selectedStyleByClass = {};

/* resolve which weaponClasses entry matches the currently worn weapon.
   Exact item-id match first, then substring match, in config order; falls
   back to the 'unarmed' entry (or the first entry) when nothing matches. */
function weaponClassFor() {
  const cfg = CFG || FALLBACK;
  const classes = Array.isArray(cfg.weaponClasses) && cfg.weaponClasses.length ? cfg.weaponClasses : FALLBACK.weaponClasses;
  const eq = EQUIP();
  const wpn = eq && eq.worn && eq.worn.weapon;
  const id = wpn && typeof wpn.id === 'string' ? wpn.id : '';

  if (id) {
    const exact = classes.find((c) => Array.isArray(c.match) && c.match.indexOf(id) !== -1);
    if (exact) return exact;
    const partial = classes.find((c) => Array.isArray(c.match) && c.match.some((m) => m && id.indexOf(m) !== -1));
    if (partial) return partial;
  }
  return classes.find((c) => c.id === 'unarmed') || classes[0] || FALLBACK_WEAPON_CLASSES[0];
}

/* the full style definitions (id/name/desc/trains/split) available for the
   currently equipped weapon, in config order, plus which one is selected. */
function availableStyles() {
  const cfg = CFG || FALLBACK;
  const defs = cfg.styleDefs || FALLBACK_STYLE_DEFS;
  const wc = weaponClassFor();
  const ids = Array.isArray(wc.styles) && wc.styles.length ? wc.styles : Object.keys(defs);
  return ids.map((id) => defs[id]).filter(Boolean);
}

/* the currently selected style definition for the equipped weapon class.
   If nothing has been explicitly chosen for this class yet (or the previous
   choice doesn\'t apply to the new weapon), falls back to the class\'s
   defaultStyle (OSRS opens on Accurate-equivalent). */
function currentStyle() {
  const cfg = CFG || FALLBACK;
  const defs = cfg.styleDefs || FALLBACK_STYLE_DEFS;
  const wc = weaponClassFor();
  const styles = availableStyles();
  const chosenId = selectedStyleByClass[wc.id];
  const chosen = chosenId && styles.find((s) => s.id === chosenId);
  if (chosen) return chosen;
  const def = (wc.defaultStyle && defs[wc.defaultStyle]) || styles[0];
  return def || FALLBACK_STYLE_DEFS.accurate;
}

/* select a style by id for whichever weapon class is currently equipped.
   No-ops (returns false) if the id isn\'t valid for the current weapon. */
function setStyle(styleId) {
  const wc = weaponClassFor();
  const styles = availableStyles();
  const ok = styles.some((s) => s.id === styleId);
  if (!ok) return false;
  selectedStyleByClass[wc.id] = styleId;
  return true;
}

/* split `totalXp` across a style\'s trained skills per its `split` weights
   (falls back to an even split if weights are missing/malformed), and award
   each non-zero share via window.EMHUD.addXp. Amounts are rounded to 1dp,
   matching the existing XP1 award precision. */
function awardStyleXp(style, totalXp) {
  const hud = HUD();
  if (!hud || !hud.addXp || !style || !(totalXp > 0)) return;
  const trains = Array.isArray(style.trains) && style.trains.length ? style.trains : ['attack'];
  let weights = Array.isArray(style.split) && style.split.length === trains.length ? style.split : null;
  if (!weights) { const w = 1 / trains.length; weights = trains.map(() => w); }
  trains.forEach((skill, i) => {
    const amt = Math.round(totalXp * weights[i] * 10) / 10;
    if (amt > 0) hud.addXp(skill, amt);
  });
}

/* ---- on-screen feedback: hitsplat + HP bar as THREE sprites -------------- */

/* draw a round hitsplat (RS-style) onto a canvas → CanvasTexture → Sprite.
   colour by outcome: zero (blue), max (cyan), or normal hit (red). */
function makeHitsplatSprite(THREE, amount, colourHex) {
  const S = 64;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const x = cv.getContext('2d');
  // splat disc
  x.fillStyle = colourHex;
  x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2); x.fill();
  // subtle dark rim for contrast
  x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.45)'; x.stroke();
  // number
  x.fillStyle = '#ffffff';
  x.font = 'bold 34px Trebuchet MS, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.8)';
  const label = String(amount | 0);
  x.strokeText(label, S / 2, S / 2 + 1);
  x.fillText(label, S / 2, S / 2 + 1);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(0.7, 0.7, 1);
  spr.renderOrder = 1002;
  spr.userData._tex = tex;
  return spr;
}

/* a simple green-on-red HP bar sprite; redraw on demand as HP changes. */
function makeHpBarSprite(THREE) {
  const W = 96, H = 14;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(1.4, 0.22, 1);
  spr.renderOrder = 1001;
  spr.userData._tex = tex;
  spr.userData._cv = cv;
  return spr;
}
function drawHpBar(spr, frac) {
  const cv = spr.userData._cv; if (!cv) return;
  const x = cv.getContext('2d'); const W = cv.width, H = cv.height;
  const f = Math.max(0, Math.min(1, frac));
  x.clearRect(0, 0, W, H);
  x.fillStyle = '#000000'; x.fillRect(0, 0, W, H);          // border
  x.fillStyle = '#7a1414'; x.fillRect(1, 1, W - 2, H - 2);  // red (missing)
  x.fillStyle = '#36b234'; x.fillRect(1, 1, (W - 2) * f, H - 2); // green (current)
  spr.userData._tex.needsUpdate = true;
}

/* dispose a sprite\'s GPU resources when we remove it from the scene */
function disposeSprite(scene, spr) {
  if (!spr) return;
  if (scene && scene.remove) scene.remove(spr);
  const t = spr.userData && spr.userData._tex;
  if (t && t.dispose) t.dispose();
  if (spr.material && spr.material.dispose) spr.material.dispose();
}

/* ---- ranged helpers ------------------------------------------------------ */

/* true when the player has a bow in the weapon slot (EMEQUIP.worn.weapon.id
   contains \'bow\') AND at least one arrow in the ammo slot. */
function isRangedReady() {
  const eq = EQUIP();
  if (!eq || !eq.worn) return false;
  const wpn = eq.worn.weapon;
  if (!wpn || typeof wpn.id !== 'string' || wpn.id.indexOf('bow') === -1) return false;
  const ammo = eq.worn.ammo;
  if (!ammo || !(ammo.qty > 0)) return false;
  return true;
}

/* consume 1 arrow from the ammo slot. Removes the stack if qty reaches 0.
   Uses EMEQUIP.wearItem(null,\'ammo\') or direct mutation, whichever is available. */
function consumeArrow() {
  const eq = EQUIP();
  if (!eq || !eq.worn || !eq.worn.ammo) return;
  const ammo = eq.worn.ammo;
  ammo.qty = (ammo.qty | 0) - 1;
  if (ammo.qty <= 0) {
    eq.worn.ammo = null;
    // notify any HUD overlay listening for equipment changes
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('em-equip-changed', { detail: { slot: 'ammo' } }));
    }
    const hud = HUD();
    if (hud && hud.addChat) hud.addChat('You have run out of arrows.', '', true);
  }
  // mirror qty into inventory if EMHUD tracks items directly
  const hud = HUD();
  if (hud && hud.updateItemQty && ammo.id) hud.updateItemQty(ammo.id, ammo.qty);
}

/* read effective ranged level from the HUD; fall back gracefully. */
function playerRangedLevel() {
  const hud = HUD();
  try {
    if (hud && hud.getSkillXp && hud.levelFromXp) {
      const xp = hud.getSkillXp();
      const lvl = hud.levelFromXp(xp.ranged || 0);
      if (typeof lvl === 'number' && lvl > 0) return lvl;
    }
  } catch (e) { /* ignore */ }
  return 1;
}

/* award Ranged-style + Hitpoints XP for ranged damage (mirrors awardXp for
   melee). The selected ranged style (Accurate/Rapid/Longrange) determines the
   skill split (CB-STYLES): Accurate/Rapid train pure Ranged, Longrange splits
   Ranged + Defence, matching OSRS. */
function awardRangedXp(dmg, xpPerDamage, hpXpPerDamage) {
  const hud = HUD();
  if (!hud || !hud.addXp || dmg <= 0) return;
  awardStyleXp(currentStyle(), dmg * xpPerDamage);
  hud.addXp('hitpoints',  Math.round(dmg * hpXpPerDamage * 10) / 10);
}

/* animate a small arrow projectile (yellow dot sprite) from origin to target,
   then call onArrive() when it lands. Duration scales with distance. */
function fireProjectile(THREE, scene, from, to, onArrive) {
  if (!THREE || !scene) { if (onArrive) onArrive(); return; }

  // tiny yellow circle canvas → sprite
  const S = 20;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0c040';
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(0.25, 0.25, 1);
  spr.renderOrder = 1003;
  spr.position.set(from.x, from.y, from.z);
  scene.add(spr);

  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const dur  = Math.max(150, Math.min(600, dist * 80)); // ~80ms per world-unit
  const born = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  (function step() {
    const now  = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const t    = Math.min(1, (now - born) / dur);
    spr.position.set(from.x + dx * t, from.y + dy * t, from.z + dz * t);
    if (t < 1) { requestAnimationFrame(step); return; }
    // landed - clean up
    scene.remove(spr);
    if (tex.dispose)            tex.dispose();
    if (spr.material.dispose)   spr.material.dispose();
    if (onArrive) onArrive();
  })();
}

/* world-space anchor of a mob instance. Tolerates several shapes:
   {x,z}, {group:{position}}, {mesh:{position}}, or a THREE.Object3D itself. */
function mobAnchor(mob) {
  if (!mob) return { x: 0, y: 1.6, z: 0 };
  const o = mob.group || mob.mesh || (mob.position ? mob : null);
  if (o && o.position) return { x: o.position.x, y: (o.position.y || 0) + 1.8, z: o.position.z };
  return { x: mob.x || 0, y: 1.8, z: mob.z || 0 };
}

export function initCombat() {
  if (initialised) return window.EMCOMBAT;
  initialised = true;

  resolveCfg();
  // EMDATA may arrive after init - re-resolve when it signals ready.
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('em-data-ready', resolveCfg);
  }

  /* lazy refs: pulled at call-time so the module imports cleanly even if the
     engine/player modules haven\'t put anything on window yet. */
  function getScene() {
    const w = (typeof window !== 'undefined') ? window : {};
    return w.EMSCENE || (w.EMENGINE && w.EMENGINE.scene) || null;
  }
  function getPlayerPos() {
    const w = (typeof window !== 'undefined') ? window : {};
    return w.EMPLAYERPOS || (w.EMPLAYER && w.EMPLAYER.pos) || null;
  }

  /* engagement state */
  const state = {
    target: null,        // the mob instance currently being attacked
    bar: null,           // its floating HP bar sprite
    tickTimer: null,     // unsubscribe handle for the shared game-tick subscription
    playerCd: 0,         // ticks until the player can swing again
    mobCd: 0,            // ticks until the mob can retaliate
    dying: false,        // true between HP-0 and respawn (suppresses re-engage)
  };

  /* ---- PLAYER HP + DEATH MODEL -----------------------------------------
     Player HP pool = hitpoints level × 10 (OSRS convention). The current/max
     pool is published on window.EMPLAYERHP = { cur, max } so external readers
     (the HP orb) can show real, mutating health instead of a flat level read.
     Max tracks the live hitpoints level; cur is clamped into [0, max]. */
  function hitpointsLevel() {
    const hud = HUD();
    try {
      if (hud && hud.getSkillXp && hud.levelFromXp) {
        const xp = hud.getSkillXp() || {};
        const lvl = hud.levelFromXp(xp.hitpoints || 0);
        if (typeof lvl === 'number' && lvl > 0) return lvl;
      }
    } catch (e) { /* ignore */ }
    return 1;
  }
  function playerMaxHp() { return Math.max(1, hitpointsLevel() * 10); }

  /* the live, externally-readable player HP pool. cur is full on first read. */
  function playerHp() {
    const w = (typeof window !== 'undefined') ? window : {};
    const max = playerMaxHp();
    let ph = w.EMPLAYERHP;
    if (!ph || typeof ph.cur !== 'number' || typeof ph.max !== 'number') {
      ph = { cur: max, max: max };
      w.EMPLAYERHP = ph;
    } else {
      // keep max in sync with the (possibly level-up\'d) hitpoints stat
      if (ph.max !== max) {
        // preserve damage taken: scale only the ceiling, clamp cur into range
        ph.max = max;
        if (ph.cur > max) ph.cur = max;
      }
    }
    return ph;
  }
  // publish immediately so the orb has something to read before first combat.
  playerHp();

  /* apply `dmg` to the player; returns the new current HP. Shows a hitsplat on
     the player and triggers death when the pool empties. */
  function damagePlayer(dmg, source) {
    const ph = playerHp();
    const amount = Math.max(0, dmg | 0);
    ph.cur = Math.max(0, ph.cur - amount);
    showPlayerHitsplat(amount);
    if (ph.cur <= 0 && !state.dying) playerDeath(source);
    return ph.cur;
  }

  /* restore the player to full HP (respawn / heal). */
  function restorePlayerHp() {
    const ph = playerHp();
    ph.max = playerMaxHp();
    ph.cur = ph.max;
    return ph;
  }

  /* a hitsplat over the PLAYER (mirrors the mob splat, anchored at the player). */
  function showPlayerHitsplat(amount) {
    const THREE = THREE_(); const scene = getScene();
    const cfg = CFG || FALLBACK;
    if (!THREE || !scene) return;
    const pp = getPlayerPos();
    if (!pp) return;
    const colour = amount <= 0 ? cfg.hitsplat.zero : cfg.hitsplat.hit;
    const ax = pp.x, ay = (typeof pp.y === 'number' ? pp.y : 0) + 1.8, az = pp.z;
    const spr = makeHitsplatSprite(THREE, amount, colour);
    spr.position.set(ax, ay, az);
    scene.add(spr);
    const born = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const dur = 700;
    (function rise() {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const t = (now - born) / dur;
      if (t >= 1) { disposeSprite(scene, spr); return; }
      spr.position.y = ay + t * 0.6;
      if (spr.material) spr.material.opacity = 1 - t;
      requestAnimationFrame(rise);
    })();
  }

  /* a brief full-screen red fade overlay on death; self-removes. */
  function deathFade() {
    if (typeof document === 'undefined') return;
    try {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:#7a0000;opacity:0;' +
        'pointer-events:none;z-index:99999;transition:opacity .25s ease-in-out;';
      document.body.appendChild(ov);
      requestAnimationFrame(() => { ov.style.opacity = '0.6'; });
      setTimeout(() => { ov.style.opacity = '0'; }, 600);
      setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 950);
    } catch (e) { /* ignore */ }
  }

  /* player death: message, fade + fall animation, stop combat, then after a brief
     beat respawn at the world spawn point with HP fully restored (CBT death model).
     Position reset uses world.js's respawnAtSpawn() (exposed on window.EMWORLD) so
     this stays the single honest "teleport home" path shared with initial load. */
  function playerDeath() {
    state.dying = true;
    chat('Oh dear, you are dead!');
    deathFade();
    playDeath();
    stop();
    setTimeout(() => {
      const w = WORLD_();
      if (w && typeof w.respawnAtSpawn === 'function') w.respawnAtSpawn();
      restorePlayerHp();
      clearDeath();
      state.dying = false;
      chat('You have respawned.');
    }, 700);
  }

  function chat(msg, sys) { const h = HUD(); if (h && h.addChat) h.addChat(msg, '', sys === undefined ? true : sys); }

  function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }

  /* spawn a hitsplat over a mob; it rises briefly then disposes itself. */
  function showHitsplat(mob, amount, outcome) {
    const THREE = THREE_(); const scene = getScene();
    const cfg = CFG || FALLBACK;
    if (!THREE || !scene) return;
    const colour = outcome === 'zero' ? cfg.hitsplat.zero
                 : outcome === 'max'  ? cfg.hitsplat.max
                 : cfg.hitsplat.hit;
    const a = mobAnchor(mob);
    const spr = makeHitsplatSprite(THREE, amount, colour);
    spr.position.set(a.x, a.y, a.z);
    scene.add(spr);
    const born = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const dur = 700;
    (function rise() {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const t = (now - born) / dur;
      if (t >= 1) { disposeSprite(scene, spr); return; }
      spr.position.y = a.y + t * 0.6;
      if (spr.material) spr.material.opacity = 1 - t;
      requestAnimationFrame(rise);
    })();
  }

  /* attach (or refresh) the HP bar over the current target. */
  function ensureHpBar(mob) {
    const THREE = THREE_(); const scene = getScene();
    if (!THREE || !scene) return;
    if (!state.bar) { state.bar = makeHpBarSprite(THREE); scene.add(state.bar); }
    const a = mobAnchor(mob);
    state.bar.position.set(a.x, a.y + 0.35, a.z);
    drawHpBar(state.bar, (mob.hp != null ? mob.hp : mob.maxHp) / Math.max(1, mob.maxHp));
  }
  function clearHpBar() {
    const scene = getScene();
    disposeSprite(scene, state.bar);
    state.bar = null;
  }

  /* award attack-style XP + hitpoints XP for `dmg` damage dealt (XP1).
     The selected melee style (Accurate/Aggressive/Defensive/Controlled)
     determines which skill(s) the non-HP share goes to (CB-STYLES). */
  function awardXp(dmg) {
    const hud = HUD(); const cfg = CFG || FALLBACK;
    if (!hud || !hud.addXp || dmg <= 0) return;
    const styleXp = +(dmg * cfg.xpPerDamage);
    const hpXp = +(dmg * cfg.hpXpPerDamage);
    awardStyleXp(currentStyle(), styleXp);
    hud.addXp('hitpoints', Math.round(hpXp * 10) / 10);
  }

  /* read effective player melee stats from the HUD when available. */
  function playerStats() {
    const hud = HUD();
    const lvl = (id) => {
      try {
        if (hud && hud.getSkillXp && hud.levelFromXp) {
          const xp = hud.getSkillXp(); return hud.levelFromXp(xp[id] || 0);
        }
      } catch (e) { /* ignore */ }
      return PLAYER_DEFAULTS[id] || 1;
    };
    const strength = lvl('strength');
    return {
      attack: lvl('attack'),
      defence: lvl('defence'),
      // unarmed max hit scales gently with strength
      maxHit: Math.max(1, Math.floor(strength / 2) + PLAYER_DEFAULTS.maxHit),
    };
  }

  /* mob death → bones drop + XP already awarded on the killing blow + respawn. */
  function killMob(mob) {
    chat('You have defeated the ' + (mob.name || 'creature') + '.');
    // bones drop (CBT death + bones). Prefer explicit drops, else give bones.
    const drops = Array.isArray(mob.drops) ? mob.drops : [{ item: BONES_ITEM, qty: 1, chance: 1 }];
    const hud = HUD();
    drops.forEach((d) => {
      if (!d || (d.chance != null && Math.random() > d.chance)) return;
      if (hud && hud.giveItem) hud.giveItem(d.item, d.qty || 1);
    });
    // mark dead + hide its visual if it owns one
    mob.dead = true; mob.hp = 0;
    const vis = mob.group || mob.mesh;
    if (vis) vis.visible = false;
    // respawn after respawnMs (restore HP + visibility; honest re-arm of the mob)
    const respawnMs = Number(mob.respawnMs) > 0 ? Number(mob.respawnMs) : 30000;
    setTimeout(() => {
      mob.dead = false; mob.hp = mob.maxHp;
      const v = mob.group || mob.mesh; if (v) v.visible = true;
    }, respawnMs);

    stop();
  }

  /* one combat tick: range gate → player swing (melee or ranged) → mob retaliation. */
  function tick() {
    const mob = state.target;
    if (!mob || mob.dead) { stop(); return; }
    if (mob.hp == null) mob.hp = mob.maxHp;

    const pp  = getPlayerPos();
    const a   = mobAnchor(mob);
    const d2  = pp ? dist2({ x: pp.x, z: pp.z }, { x: a.x, z: a.z }) : 0;

    // ---- determine combat mode for this tick ----
    const usingRanged = isRangedReady();
    const maxRangeSq  = usingRanged ? RANGED_RANGE * RANGED_RANGE : MELEE_RANGE * MELEE_RANGE;

    // range gate: if using melee and still too far, wait for the walk-in system.
    // ranged lets us stand up to RANGED_RANGE away; if even that is exceeded, wait.
    if (pp && d2 > maxRangeSq) {
      return; // still approaching - player module walks us in; try again next tick
    }

    ensureHpBar(mob);

    // ---- player swing (CBT accuracy + damage roll) ----
    if (state.playerCd <= 0) {
      const cfg  = CFG || FALLBACK;
      playSwing();   // CBT-ANIM: lunge on every swing, hit or miss (ranged + melee alike)

      if (usingRanged) {
        // ---- RANGED PATH ----
        const rLvl   = playerRangedLevel();
        const rMaxHit = Math.max(1, Math.floor(rLvl / 2) + 1);
        const mobDef  = mob.defence != null ? mob.defence : 1;

        if (rollHit(rLvl, mobDef)) {
          const dmg     = rollDamage(rMaxHit);
          const outcome = dmg === 0 ? 'zero' : (dmg >= rMaxHit ? 'max' : 'hit');
          // consume the arrow before the projectile flies
          consumeArrow();
          // fire projectile then apply damage + hitsplat on landing
          const fromPt = { x: pp ? pp.x : a.x, y: (pp && typeof pp.y === 'number' ? pp.y : 0) + 1.4, z: pp ? pp.z : a.z };
          const toPt   = { x: a.x, y: a.y, z: a.z };
          const THREE  = THREE_();
          const scene  = getScene();
          const mobRef = mob; // capture for the closure
          const dmgRef = dmg; const outRef = outcome;
          const cfg2   = cfg;
          fireProjectile(THREE, scene, fromPt, toPt, function () {
            mobRef.hp = Math.max(0, (mobRef.hp != null ? mobRef.hp : 0) - dmgRef);
            showHitsplat(mobRef, dmgRef, outRef);
            awardRangedXp(dmgRef, cfg2.xpPerDamage, cfg2.hpXpPerDamage);
            ensureHpBar(mobRef);
            if (mobRef.hp <= 0 && state.target === mobRef) killMob(mobRef);
          });
        } else {
          // ranged miss: still consume the arrow (OSRS behaviour)
          consumeArrow();
          showHitsplat(mob, 0, 'zero');
        }
        // Rapid style (CB-STYLES) shaves a tick off the ranged attack cadence,
        // matching OSRS; other ranged styles use the base speed.
        const rStyle = currentStyle();
        const rDelta = Number(rStyle && rStyle.attackSpeedTicksDelta) || 0;
        state.playerCd = Math.max(1, PLAYER_DEFAULTS.attackSpeedTicks + rDelta);
        // note: death check after projectile lands (async), so we don\'t return early here

      } else {
        // ---- MELEE PATH (unchanged) ----
        const ps = playerStats();
        if (rollHit(ps.attack, mob.defence != null ? mob.defence : 1)) {
          const dmg = rollDamage(ps.maxHit);
          mob.hp = Math.max(0, mob.hp - dmg);
          const outcome = dmg === 0 ? 'zero' : (dmg >= ps.maxHit ? 'max' : 'hit');
          showHitsplat(mob, dmg, outcome);
          awardXp(dmg);
        } else {
          showHitsplat(mob, 0, 'zero');   // a miss shows a 0 splat
        }
        ensureHpBar(mob);
        state.playerCd = PLAYER_DEFAULTS.attackSpeedTicks;
        if (mob.hp <= 0) { killMob(mob); return; }
      }
    }

    // ---- mob retaliation (now lands on the player HP pool) ----
    if (state.mobCd <= 0) {
      const mobMaxHit = Number(mob.maxHit) || 0;
      const pDef = playerStats().defence;
      if (mobMaxHit > 0 && rollHit(mob.attack != null ? mob.attack : 1, pDef)) {
        const dmg = rollDamage(mobMaxHit);
        damagePlayer(dmg, mob);                      // apply to player HP + splat
        if (dmg > 0) chat('The ' + (mob.name || 'creature') + ' hits you for ' + dmg + '.');
        if (state.dying) return;                     // death disengaged us this tick
      } else {
        damagePlayer(0, mob);                         // a blocked hit shows a 0 splat
      }
      state.mobCd = Number(mob.attackSpeedTicks) > 0 ? Number(mob.attackSpeedTicks) : PLAYER_DEFAULTS.attackSpeedTicks;
    }

    state.playerCd = Math.max(0, state.playerCd - 1);
    state.mobCd = Math.max(0, state.mobCd - 1);
  }

  /* start (or switch to) attacking a mob instance, starting the tick clock. */
  function attack(mob) {
    if (!mob) return;
    if (state.dying) return;                 // can\'t act while dead/respawning
    if (mob.dead) { chat('It is already dead.'); return; }
    const cfg = CFG || resolveCfg() || FALLBACK;

    // hydrate the instance from its mob definition if only an id/type was passed.
    if (mob.maxHp == null && cfg.mobs && (mob.id || mob.type)) {
      const def = cfg.mobs.find((m) => m.id === (mob.type || mob.id));
      if (def) Object.keys(def).forEach((k) => { if (mob[k] == null) mob[k] = def[k]; });
    }
    if (mob.maxHp == null) mob.maxHp = 1;
    if (mob.hp == null) mob.hp = mob.maxHp;

    if (state.target && state.target !== mob) clearHpBar();
    state.target = mob;
    state.playerCd = 0; state.mobCd = Number(mob.attackSpeedTicks) || PLAYER_DEFAULTS.attackSpeedTicks;
    chat('You attack the ' + (mob.name || 'creature') + '.');
    ensureHpBar(mob);

    // drive the player off the shared global game tick (one cadence for all systems).
    if (state.tickTimer == null) {
      state.tickTimer = onTick(tick);
    }
    tick(); // immediate first evaluation (range gate handles "still walking")
  }

  /* disengage: stop the clock, drop the HP bar, forget the target. */
  function stop() {
    if (state.tickTimer != null) { state.tickTimer(); state.tickTimer = null; }  // unsubscribe from the shared tick
    clearHpBar();
    state.target = null;
    state.playerCd = 0; state.mobCd = 0;
  }

  /* AUTO-RETALIATE: a mob (or its AI) reports it has attacked the player. If the
     player isn\'t already engaged, retaliate against the aggressor; if already
     fighting a different target, stay on the current one (OSRS behaviour). */
  function attackedBy(mob) {
    if (!mob || mob.dead || state.dying) return;
    if (state.target && !state.target.dead) return;  // already in a fight - keep it
    attack(mob);
  }

  window.EMCOMBAT = {
    attack,
    attackedBy,                  // auto-retaliate hook for mob AI
    tick,
    stop,
    cfg: () => CFG,
    ready: () => !!CFG,
    playerHp: () => playerHp(),  // read the live { cur, max } pool
    healPlayer: () => restorePlayerHp(),
    damagePlayer: (n) => damagePlayer(n),

    /* ---- combat styles (CB-STYLES): weapon-class aware, HUD-readable ---- */
    weaponClass: () => weaponClassFor(),       // { id, match, styles, defaultStyle } for the worn weapon
    availableStyles,                           // [{ id, name, category, desc, trains, split }, ...] for the worn weapon
    style: () => currentStyle(),               // the currently selected style def for the worn weapon
    setStyle,                                  // (styleId) => boolean; selects a style for the worn weapon's class
  };
  return window.EMCOMBAT;
}

/* allow direct import-and-call without a bundler global, mirroring sibling modules. */
if (typeof window !== 'undefined') window.initCombat = initCombat;
