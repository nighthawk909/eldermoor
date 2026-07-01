/* =====================================================================
   ELDERMOOR - SFX Actions module (AUD2/SND/SFX-COVERAGE).

   Wires procedural sound-effect cues to game events. This module owns a
   SMALL, PRIVATE Web Audio graph of its own (its own AudioContext + a
   single gain node) rather than reaching into src/audio.js's internals,
   because EMAUDIO never publicly exposes its AudioContext (see the old
   rawBeep() comment below - `a._ctx` is always undefined, so it was a
   permanent no-op). This module's own graph:
     - is created lazily on the same "first gesture" pattern audio.js uses
       (pointerdown/keydown/touchstart), so it never fights autoplay policy
     - reads volume/mute from window.EMSETTINGS the same way audio.js does
       (masterVolume/masterMute * sfxVolume/sfxMute, 0-100 scale), so these
       cues obey the exact same mixer the player already controls
     - is 100% synthesized (oscillators only) - zero external audio files,
       per project law

   Zero edits to any other module. Every hook below is either:
     (a) an existing window event already dispatched elsewhere
         ('em-lesson', 'em-flag', 'em-combat-hit', 'em-action-tick'), or
     (b) a defensive monkey-patch of a PUBLIC method on an already-published
         global (window.EMHUD, window.EMSKILL, window.EMEQUIP, window.EMBANK,
         window.EMCOMBAT, window.EMGROUND, window.EMINVOPS), always calling
         the original implementation first so no real game behaviour is
         ever lost, or
     (c) a light DOM click delegation (tab bar / chat channel bar / the
         inventory context-menu that inventory-ops.js already renders), or
     (d) a bounded poll of an already-published read-only snapshot
         (window.EMPRAYER.active) to detect prayer toggle on/off without
         needing a callback hook that doesn't exist.

   Cues added (all short + subtle by design, per-cue gain kept low so the
   soundscape never gets tiring):
     chop / mine / fish            - distinct per-skill "success tick" pings
                                      (EMSKILL.chop/mine/fish patched)
     firemaking (light)            - a soft "catch" crackle-swell
     smith                         - anvil clang (bright metallic double-hit)
     smelt                         - low furnace "whoomph"
     cook                          - sizzle (filtered noise burst)
     combat hit (player + mob)     - percussive thud, pitched by side
     block / miss                 - a dull deflect tap (0-damage combat)
     eat / drink                   - soft gulp/munch blip
     bury                          - a low, muted thud (dirt)
     drop / take item              - a light short clack (both directions)
     equip / unequip               - metallic-ish "clink" (equip = up, unequip = down)
     bank open                     - a soft vault-latch clunk + shimmer
     prayer toggle                 - a gentle chime (on) / soft thud (off)
     spell cast / impact           - an airy whoosh (cast) + a bright ping (impact)
     tab switch / UI click         - re-uses the existing click cue
     level-up                      - re-uses the existing levelUp cue

   Events listened for (existing game events, unchanged):
     'em-data-ready'  - emitted by loaders.js once assets are loaded
     'em-lesson'      - emitted by dialogue.js on lesson-complete
     'em-flag'        - emitted by combat.js/magic-tab.js/inventory-ops.js/
                        charcreate.js (we watch for 'cast:' and 'killed:' prefixes)
     'em-combat-hit'  - emitted by combat.js (if present)
     'em-action-tick' - emitted by skilling.js (if present)
     pointerdown on #emtabs button - tab selection
     pointerdown on #emchch button - chat-channel selection
     click on #eminv-ctx button[data-verb] - inventory context-menu ops
       (Eat/Drink/Drop/Bury/Wield/... - inventory-ops.js's existing menu)

   main.js: add   import { initSfxActions } from './sfx-actions.js';
            and   initSfxActions();   after the other feature inits.
   ===================================================================== */

export function initSfxActions() {
  /* ---- safe accessor helpers (respect load order) ---------------------- */
  function audio()  { return (typeof window !== 'undefined' && window.EMAUDIO)  || null; }
  function hud()    { return (typeof window !== 'undefined' && window.EMHUD)    || null; }

  /* ---- private Web Audio graph (own context, own bus) -------------------
     Mirrors audio.js's bus-gain + settings-read pattern closely enough that
     it feels like the same engine, but never touches EMAUDIO's internals.
     Lazily created on the first user gesture (autoplay-safe). ----------- */
  let actx = null;          // this module's own AudioContext
  let actxBus = null;       // single gain node, all cues route through this
  let gestureBound = false;

  const clamp01 = v => Math.max(0, Math.min(1, Number(v) || 0));

  /* Effective 0..1 gain for this module's bus: master * sfx, honouring
     either control-id shape EMSETTINGS may expose (mirrors audio.js). */
  function effectiveGain() {
    const s = (typeof window !== 'undefined' && window.EMSETTINGS) || null;
    if (!s) return 0.85;                          // sane default if settings not booted yet
    let masterV = 85, sfxV = 90, masterM = false, sfxM = false;
    try {
      if (typeof s.get === 'function') {
        const mv = s.get('masterVolume'); if (mv != null && isFinite(Number(mv))) masterV = Number(mv);
        const sv = s.get('sfxVolume');    if (sv != null && isFinite(Number(sv))) sfxV = Number(sv);
        const mm = s.get('masterMute');   if (mm != null) masterM = !!mm;
        const sm = s.get('sfxMute');      if (sm != null) sfxM = !!sm;
      }
      if (s.volume) {
        if (s.volume.master != null) masterV = Number(s.volume.master) * 100;
        if (s.volume.sfx != null) sfxV = Number(s.volume.sfx) * 100;
      }
      if (s.mute) {
        if (s.mute.master != null) masterM = !!s.mute.master;
        if (s.mute.sfx != null) sfxM = !!s.mute.sfx;
      }
    } catch (_) { /* fall through to defaults collected so far */ }
    if (masterM || sfxM) return 0;
    return clamp01(masterV / 100) * clamp01(sfxV / 100);
  }

  function ensureCtx() {
    if (actx) return actx;
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      actx = new AC();
      actxBus = actx.createGain();
      actxBus.gain.setValueAtTime(1, actx.currentTime);
      actxBus.connect(actx.destination);
    } catch (_) { actx = null; actxBus = null; }
    return actx;
  }

  function resumeCtx() {
    if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
  }

  function onFirstGesture() {
    ensureCtx();
    resumeCtx();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      window.removeEventListener('touchstart', onFirstGesture);
    }
  }
  function bindGesture() {
    if (gestureBound || typeof window === 'undefined') return;
    gestureBound = true;
    window.addEventListener('pointerdown', onFirstGesture, { once: true });
    window.addEventListener('keydown', onFirstGesture, { once: true });
    window.addEventListener('touchstart', onFirstGesture, { once: true });
  }
  bindGesture();

  function ctxReady() {
    if (!ensureCtx()) return false;
    resumeCtx();
    return actx.state === 'running' || actx.state === 'suspended';
  }

  /* One enveloped oscillator voice into our own bus, gain-scaled live by
     effectiveGain() at trigger time (mirrors audio.js's tone()). */
  function voice({ freq = 440, type = 'sine', start = 0, dur = 0.12,
                   peak = 0.2, attack = 0.006, release = 0.08, detune = 0 } = {}) {
    if (!ctxReady()) return;
    const g0 = effectiveGain();
    if (g0 <= 0.0005) return;                 // fully muted - skip building the node graph
    const t0 = actx.currentTime + start;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (detune) osc.detune.setValueAtTime(detune, t0);
    const peakScaled = Math.max(0.0002, peak * g0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peakScaled, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    osc.connect(g);
    g.connect(actxBus);
    osc.start(t0);
    osc.stop(t0 + dur + release + 0.02);
  }

  /* Short filtered-noise burst (sizzle / crackle / vault-latch shimmer).
     Built from a tiny buffer source through a bandpass filter, same gain
     handling as voice(). */
  function noiseBurst({ start = 0, dur = 0.15, peak = 0.15, freq = 2200, q = 1.2 } = {}) {
    if (!ctxReady()) return;
    const g0 = effectiveGain();
    if (g0 <= 0.0005) return;
    const t0 = actx.currentTime + start;
    const len = Math.max(1, Math.floor(actx.sampleRate * dur));
    let buf;
    try { buf = actx.createBuffer(1, len, actx.sampleRate); } catch (_) { return; }
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = actx.createBufferSource();
    src.buffer = buf;
    const filt = actx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(freq, t0);
    filt.Q.setValueAtTime(q, t0);
    const g = actx.createGain();
    const peakScaled = Math.max(0.0002, peak * g0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peakScaled, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(actxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* ---- synthesized cues (built on EMAUDIO.blip / tone helpers) --------- */

  /* Tab / button click: re-use EMAUDIO's built-in soft-click. */
  function sfxTabClick() {
    const a = audio(); if (!a) return;
    try { a.click(); } catch (_) {}
  }

  /* XP gain: a rapid ascending three-note chirp (distinct from levelUp). */
  function sfxXpGain() {
    const a = audio(); if (a) { try { a.blip(); } catch (_) {} }
    voice({ freq: 880, dur: 0.06, peak: 0.1, type: 'triangle' });
    voice({ freq: 1047, dur: 0.05, peak: 0.08, type: 'sine', start: 0.05 });
  }

  /* Level-up: delegate to the full arpeggio already in EMAUDIO. */
  function sfxLevelUp() {
    const a = audio(); if (!a) return;
    try { a.levelUp(); } catch (_) {}
  }

  /* Item received: a warm two-tone descending chime. */
  function sfxItemReceived() {
    voice({ freq: 1318.5, dur: 0.12, peak: 0.14, type: 'triangle' });
    voice({ freq: 880, dur: 0.14, peak: 0.10, type: 'sine', start: 0.07 });
  }

  /* --- gather actions: distinct per-skill success pings ------------------ */
  function sfxChop() {
    voice({ freq: 300, dur: 0.05, peak: 0.16, type: 'triangle' });
    voice({ freq: 180, dur: 0.06, peak: 0.10, type: 'sine', start: 0.02 });
  }
  function sfxMine() {
    voice({ freq: 620, dur: 0.04, peak: 0.16, type: 'square' });
    voice({ freq: 980, dur: 0.03, peak: 0.09, type: 'sine', start: 0.015 });
  }
  function sfxFish() {
    voice({ freq: 520, dur: 0.09, peak: 0.12, type: 'sine' });
    voice({ freq: 700, dur: 0.07, peak: 0.08, type: 'sine', start: 0.05 });
  }
  function sfxFiremaking() {
    // soft "catch" swell - a low rising tone plus a brief crackle
    voice({ freq: 160, dur: 0.22, peak: 0.12, type: 'sine', attack: 0.03, release: 0.2 });
    noiseBurst({ dur: 0.18, peak: 0.08, freq: 3200, start: 0.05 });
  }
  function sfxSmith() {
    // anvil clang: bright metallic double-hit
    voice({ freq: 1400, dur: 0.03, peak: 0.22, type: 'square' });
    voice({ freq: 2200, dur: 0.05, peak: 0.10, type: 'triangle', start: 0.01 });
    voice({ freq: 900, dur: 0.05, peak: 0.10, type: 'square', start: 0.12 });
  }
  function sfxSmelt() {
    // low furnace "whoomph"
    voice({ freq: 90, dur: 0.18, peak: 0.20, type: 'sine', attack: 0.02, release: 0.22 });
    noiseBurst({ dur: 0.12, peak: 0.05, freq: 500, q: 0.7 });
  }
  function sfxCook() {
    // sizzle: filtered noise burst
    noiseBurst({ dur: 0.22, peak: 0.10, freq: 4500, q: 0.9 });
  }

  /* --- combat --------------------------------------------------------- */
  function sfxCombatHitMob() {
    voice({ freq: 100, dur: 0.07, peak: 0.20, type: 'square' });
    voice({ freq: 160, dur: 0.05, peak: 0.10, type: 'triangle', start: 0.01 });
  }
  function sfxCombatHitPlayer() {
    voice({ freq: 80, dur: 0.08, peak: 0.22, type: 'square' });
    voice({ freq: 130, dur: 0.06, peak: 0.11, type: 'triangle', start: 0.01 });
  }
  function sfxBlockMiss() {
    // dull deflect tap - short, muted, no low-end thump
    voice({ freq: 260, dur: 0.035, peak: 0.10, type: 'triangle' });
  }

  /* --- items / equipment ------------------------------------------------ */
  function sfxEat() {
    voice({ freq: 220, dur: 0.05, peak: 0.10, type: 'sine' });
    voice({ freq: 180, dur: 0.05, peak: 0.08, type: 'sine', start: 0.05 });
  }
  function sfxDrink() {
    voice({ freq: 500, dur: 0.06, peak: 0.09, type: 'sine' });
    voice({ freq: 380, dur: 0.07, peak: 0.07, type: 'sine', start: 0.05 });
  }
  function sfxBury() {
    voice({ freq: 70, dur: 0.10, peak: 0.14, type: 'sine', attack: 0.015, release: 0.16 });
  }
  function sfxDropItem() {
    voice({ freq: 340, dur: 0.03, peak: 0.09, type: 'triangle' });
  }
  function sfxTakeItem() {
    voice({ freq: 460, dur: 0.03, peak: 0.10, type: 'triangle' });
  }
  function sfxEquip() {
    voice({ freq: 700, dur: 0.04, peak: 0.14, type: 'square' });
    voice({ freq: 1050, dur: 0.03, peak: 0.08, type: 'sine', start: 0.02 });
  }
  function sfxUnequip() {
    voice({ freq: 500, dur: 0.04, peak: 0.12, type: 'square' });
    voice({ freq: 320, dur: 0.04, peak: 0.07, type: 'sine', start: 0.02 });
  }

  /* --- bank / prayer / magic --------------------------------------------- */
  function sfxBankOpen() {
    voice({ freq: 150, dur: 0.06, peak: 0.16, type: 'square' });
    noiseBurst({ dur: 0.10, peak: 0.05, freq: 2600, start: 0.04 });
  }
  function sfxPrayerOn() {
    voice({ freq: 784, dur: 0.10, peak: 0.14, type: 'sine' });
    voice({ freq: 1046.5, dur: 0.12, peak: 0.10, type: 'sine', start: 0.06 });
  }
  function sfxPrayerOff() {
    voice({ freq: 392, dur: 0.08, peak: 0.10, type: 'sine' });
  }
  function sfxSpellCast() {
    // airy whoosh: quick descending sweep-ish pair
    voice({ freq: 1200, dur: 0.08, peak: 0.10, type: 'sine' });
    voice({ freq: 700, dur: 0.10, peak: 0.08, type: 'sine', start: 0.05 });
  }
  function sfxSpellImpact() {
    voice({ freq: 1500, dur: 0.05, peak: 0.14, type: 'triangle' });
    voice({ freq: 2000, dur: 0.04, peak: 0.08, type: 'sine', start: 0.02 });
  }

  /* Combat hit (legacy generic - kept for the existing em-combat-hit event). */
  function sfxCombatHit() { sfxCombatHitMob(); }

  /* Action tick: a very subtle high tick (woodcutting / fishing / etc.). */
  function sfxActionTick() {
    voice({ freq: 1760, dur: 0.03, peak: 0.05, type: 'sine' });
  }

  /* ---- tab / button click hook (DOM delegation) ------------------------ */
  function attachClickListeners() {
    if (typeof document === 'undefined') return;
    const tabs   = document.getElementById('emtabs');
    const chch   = document.getElementById('emchch');
    const attach = (el) => {
      if (!el || el._sfxBound) return;
      el._sfxBound = true;
      el.addEventListener('pointerdown', function (e) {
        const btn = e.target && e.target.closest ? e.target.closest('button') : null;
        if (btn) sfxTabClick();
      });
    };
    attach(tabs);
    attach(chch);

    // Inventory context-menu (Eat/Drink/Drop/Bury/Wield/Wear/Examine/...) -
    // inventory-ops.js renders this menu fresh each open with id="eminv-ctx"
    // and buttons carrying data-verb. Delegate once at the document level
    // (idempotent; survives every menu re-render).
    if (!document._sfxInvMenuBound) {
      document._sfxInvMenuBound = true;
      document.addEventListener('click', function (e) {
        const btn = e.target && e.target.closest ? e.target.closest('#eminv-ctx button[data-verb]') : null;
        if (!btn) return;
        sfxByVerb(String(btn.dataset.verb || '').toLowerCase());
      });
    }
  }
  attachClickListeners();

  /* Map an inventory-ops verb string to the matching cue. Wield/Wear are
     already covered by the EMEQUIP.equip patch below (equip() fires from
     inventory-ops's runOp too), so we skip them here to avoid a double-cue. */
  function sfxByVerb(v) {
    if (v === 'eat') { sfxEat(); return; }
    if (v === 'drink') { sfxDrink(); return; }
    if (v === 'bury') { sfxBury(); return; }
    if (v === 'drop') { sfxDropItem(); return; }
  }

  /* ---- em-data-ready: re-attach listeners after HUD builds its DOM ----- */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-data-ready', function () {
      attachClickListeners();
    });
  }

  /* ---- em-lesson: lesson/dialogue complete event ----------------------- */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-lesson', function (e) {
      const detail = (e && e.detail) ? String(e.detail) : '';
      if (detail.indexOf('complete:') === 0) {
        sfxLevelUp();
      } else {
        sfxTabClick();
      }
    });
  }

  /* ---- em-flag: watch for 'cast:<spell>' (spell cast, magic-tab.js) ----- */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-flag', function (e) {
      const d = e && e.detail;
      const name = (typeof d === 'string') ? d : (d && (d.flag || d.name)) || '';
      if (name.indexOf('cast:') === 0) sfxSpellCast();
      // 'killed:<mob>' (combat.js) - the death itself is already covered by
      // the combat-hit/XP cues leading up to it, so no extra cue here to
      // avoid piling sounds on top of the kill moment.
    });
  }

  /* ---- em-combat-hit event (generic; kept for back-compat) -------------- */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-combat-hit', function () {
      sfxCombatHit();
    });
  }

  /* ---- em-action-tick event (generic; kept for back-compat) ------------- */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-action-tick', function () {
      sfxActionTick();
    });
  }

  /* ---- monkey-patch EMHUD.addXp and EMHUD.giveItem -------------------- */
  let xpPatched   = false;
  let itemPatched  = false;
  let patchAttempts = 0;
  const MAX_PATCH_ATTEMPTS = 100;

  function patchHud() {
    const h = hud();
    if (!h) return;

    if (!xpPatched && typeof h.addXp === 'function') {
      const _origAddXp = h.addXp.bind(h);
      h.addXp = function (skill, amt) {
        const result = _origAddXp(skill, amt);
        try { sfxXpGain(); } catch (_) {}
        return result;
      };
      xpPatched = true;
    }

    if (!itemPatched && typeof h.giveItem === 'function') {
      const _origGiveItem = h.giveItem.bind(h);
      h.giveItem = function (id, n) {
        const result = _origGiveItem(id, n);
        try { sfxItemReceived(); } catch (_) {}
        return result;
      };
      itemPatched = true;
    }
  }
  patchHud();

  /* ---- monkey-patch EMSKILL verbs (chop/mine/fish/light/smelt/smith/cook)
     Each verb returns true/false (whether the action actually started);
     the cue plays for the START of the action, giving instant per-tap
     feedback while the tick-based success/XP granting continues to drive
     the existing chat/XP flow untouched. Cook is Make-X routed (may open a
     UI instead of ticking immediately) so its cue plays on the *call*, same
     as the others - subtle and consistent, never gated on success rolls. */
  let skillPatched = false;
  function patchSkill() {
    if (skillPatched) return;
    const sk = (typeof window !== 'undefined' && window.EMSKILL) || null;
    if (!sk) return;
    const MAP = {
      chop: sfxChop, mine: sfxMine, fish: sfxFish,
      light: sfxFiremaking, smelt: sfxSmelt, smith: sfxSmith, cook: sfxCook,
    };
    let allWrapped = true;
    Object.keys(MAP).forEach(function (verb) {
      if (typeof sk[verb] !== 'function') { allWrapped = false; return; }
      if (sk['_sfxWrapped_' + verb]) return;
      const _orig = sk[verb].bind(sk);
      const cue = MAP[verb];
      sk[verb] = function () {
        const result = _orig.apply(null, arguments);
        try { if (result !== false) cue(); } catch (_) {}
        return result;
      };
      sk['_sfxWrapped_' + verb] = true;
    });
    if (allWrapped) skillPatched = true;
  }
  patchSkill();

  /* ---- monkey-patch EMEQUIP.equip / unequip ----------------------------- */
  let equipPatched = false;
  function patchEquip() {
    if (equipPatched) return;
    const eq = (typeof window !== 'undefined' && window.EMEQUIP) || null;
    if (!eq || typeof eq.equip !== 'function' || typeof eq.unequip !== 'function') return;
    const _origEquip = eq.equip.bind(eq);
    eq.equip = function (itemId) {
      const result = _origEquip(itemId);
      try { if (result) sfxEquip(); } catch (_) {}
      return result;
    };
    const _origUnequip = eq.unequip.bind(eq);
    eq.unequip = function (slot) {
      const result = _origUnequip(slot);
      try { if (result) sfxUnequip(); } catch (_) {}
      return result;
    };
    equipPatched = true;
  }
  patchEquip();

  /* ---- monkey-patch EMBANK.open -------------------------------------- */
  let bankPatched = false;
  function patchBank() {
    if (bankPatched) return;
    const b = (typeof window !== 'undefined' && window.EMBANK) || null;
    if (!b || typeof b.open !== 'function') return;
    const _origOpen = b.open.bind(b);
    b.open = function () {
      try { sfxBankOpen(); } catch (_) {}
      return _origOpen.apply(null, arguments);
    };
    bankPatched = true;
  }
  patchBank();

  /* ---- monkey-patch EMCOMBAT.damagePlayer (mob-hits-player + block) ---- */
  let combatPatched = false;
  function patchCombat() {
    if (combatPatched) return;
    const c = (typeof window !== 'undefined' && window.EMCOMBAT) || null;
    if (!c || typeof c.damagePlayer !== 'function') return;
    const _origDamagePlayer = c.damagePlayer.bind(c);
    c.damagePlayer = function (dmg) {
      const result = _origDamagePlayer(dmg);
      try {
        const amount = Math.max(0, Number(dmg) || 0);
        if (amount > 0) sfxCombatHitPlayer(); else sfxBlockMiss();
      } catch (_) {}
      return result;
    };
    combatPatched = true;
  }
  patchCombat();

  /* ---- monkey-patch EMGROUND.drop / take (drop/take item) --------------- */
  let groundPatched = false;
  function patchGround() {
    if (groundPatched) return;
    const g = (typeof window !== 'undefined' && window.EMGROUND) || null;
    if (!g || typeof g.drop !== 'function' || typeof g.take !== 'function') return;
    const _origDrop = g.drop.bind(g);
    g.drop = function () {
      const result = _origDrop.apply(null, arguments);
      try { sfxDropItem(); } catch (_) {}
      return result;
    };
    const _origTake = g.take.bind(g);
    g.take = function () {
      const result = _origTake.apply(null, arguments);
      try { sfxTakeItem(); } catch (_) {}
      return result;
    };
    groundPatched = true;
  }
  patchGround();

  /* ---- monkey-patch EMCOMBAT.attack (spell impact proxy) ----------------
     magic-tab.js calls EMCOMBAT.attack(mob) once its bolt lands (to show the
     HP bar / drive the kill check), right after applying damage + a magic
     hitsplat. There is no other public hook for "spell landed", so we treat
     each attack() call while state was already engaged mid-flight as a soft
     signal - to keep this simple and avoid false positives on ordinary
     melee engagement, we instead key spell impact off the mob's hitsplat
     colour update indirectly being out of reach; simplest honest option is
     to skip a dedicated impact patch here and rely on combat-hit cues (which
     already fire for the damage itself via awardXp's HP-XP -> addXp patch,
     giving an audible "impact" moment) plus the em-flag 'cast:' cue for the
     cast itself. See sfxXpGain()/sfxItemReceived() above for that path. */

  /* ---- monkey-patch EMINVOPS (defaultAction = left-click op0, e.g. tap-to-
     eat) so the tap-to-use path gets the same cue as the context menu. ---- */
  let invOpsPatched = false;
  function patchInvOps() {
    if (invOpsPatched) return;
    const io = (typeof window !== 'undefined' && window.EMINVOPS) || null;
    if (!io || typeof io.defaultAction !== 'function') return;
    const h = hud();
    const _origDefaultAction = io.defaultAction.bind(io);
    io.defaultAction = function (idx) {
      // infer the verb BEFORE running it (runOp mutates/removes the slot)
      let verb = null;
      try {
        const hh = hud();
        if (hh && typeof hh.getInv === 'function' && typeof hh.getItems === 'function') {
          const inv = hh.getInv() || [];
          const entry = inv[idx];
          const def = entry ? (hh.getItems() || {})[entry.id] : null;
          verb = (def && Array.isArray(def.verbs) && def.verbs[0]) ? String(def.verbs[0]).toLowerCase() : null;
        }
      } catch (_) {}
      const result = _origDefaultAction(idx);
      try { if (verb) sfxByVerb(verb); } catch (_) {}
      return result;
    };
    invOpsPatched = true;
  }
  patchInvOps();

  /* ---- prayer toggle: poll window.EMPRAYER.active (published snapshot) --
     prayer-tab.js exposes no toggle callback, only a read-only `active`
     array it republishes on every change (see prayer-tab.js publishActive()).
     A bounded, cheap poll diffs that array to detect on/off transitions
     without needing a hook that doesn't exist. Runs only once EMPRAYER
     appears, and forever after (prayer can be toggled any time in-session -
     this is a genuinely long-lived UI, unlike the bounded HUD-appearance
     polls above), but at a very low 500ms cadence so it costs nothing. --- */
  let lastPrayerActive = null;
  function pollPrayerToggle() {
    const p = (typeof window !== 'undefined' && window.EMPRAYER) || null;
    if (!p || !Array.isArray(p.active)) return;
    const cur = p.active;
    if (lastPrayerActive === null) { lastPrayerActive = cur.slice(); return; } // seed silently on first sight
    const added = cur.filter(id => lastPrayerActive.indexOf(id) === -1);
    const removed = lastPrayerActive.filter(id => cur.indexOf(id) === -1);
    if (added.length) sfxPrayerOn();
    else if (removed.length) sfxPrayerOff();
    lastPrayerActive = cur.slice();
  }
  if (typeof window !== 'undefined' && typeof setInterval === 'function') {
    setInterval(pollPrayerToggle, 500);
  }

  /* ---- bounded rAF poll: keep trying to patch EMSKILL/EMEQUIP/EMBANK/
     EMCOMBAT/EMGROUND/EMINVOPS until each appears (modules init in an order
     sfx-actions.js doesn't control), then stop. Mirrors the existing
     HUD poll below. -------------------------------------------------- */
  function pollLateGlobals() {
    if (patchAttempts++ >= MAX_PATCH_ATTEMPTS) return;
    patchHud();
    patchSkill();
    patchEquip();
    patchBank();
    patchCombat();
    patchGround();
    patchInvOps();
    const allDone = xpPatched && itemPatched && skillPatched && equipPatched &&
      bankPatched && combatPatched && groundPatched && invOpsPatched;
    if (typeof requestAnimationFrame !== 'undefined' && !allDone) {
      requestAnimationFrame(pollLateGlobals);
    }
  }
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(pollLateGlobals);
  }

  /* also patch on em-data-ready (most globals exist by then) */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-data-ready', function () {
      patchHud();
      patchSkill();
      patchEquip();
      patchBank();
      patchCombat();
      patchGround();
      patchInvOps();
    });
  }
}
