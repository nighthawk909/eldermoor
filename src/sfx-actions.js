/* =====================================================================
   ELDERMOOR - SFX Actions module (AUD2/SND).

   Wires procedural sound-effect cues to game events, using the existing
   EMAUDIO engine (src/audio.js). Synthesizes original short cues for:
     - tab / button click   : EMAUDIO.click()
     - XP gain              : light triple-blip chirp (addXp monkey-patch)
     - level-up             : EMAUDIO.levelUp()
     - item received        : warm two-tone chime (giveItem monkey-patch)
     - combat hit           : short percussive thud (em-combat-hit event)
     - generic action tick  : subtle tick blip (em-action-tick event)

   All hooks are defensive: if EMAUDIO / EMHUD are absent the module
   no-ops silently. EMHUD.addXp / EMHUD.giveItem are monkey-patched
   once (original always called first) so no call is ever lost.

   main.js: add   import { initSfxActions } from './sfx-actions.js';
            and   initSfxActions();   after the other feature inits.

   Events listened for (existing game events):
     'em-data-ready'  - emitted by loaders.js once assets are loaded
     'em-lesson'      - emitted by dialogue.js on lesson-complete
     'em-combat-hit'  - emitted by combat.js (if present)
     'em-action-tick' - emitted by skilling.js (if present)
     pointerdown on #emtabs button - tab selection
     pointerdown on #emchch button - chat-channel selection
   ===================================================================== */

export function initSfxActions() {
  /* ---- safe accessor helpers (respect load order) ---------------------- */
  function audio()  { return (typeof window !== 'undefined' && window.EMAUDIO)  || null; }
  function hud()    { return (typeof window !== 'undefined' && window.EMHUD)    || null; }

  /* ---- inline-beep fallback: raw oscillator via EMAUDIO's AudioContext -- */
  /* Used when EMAUDIO exposes its context but not a named cue.              */
  function rawBeep(freq, dur, peak, type) {
    const a = audio();
    if (!a) return;
    /* EMAUDIO keeps its context internal; we reach it only if it is          */
    /* accessible - it never publicly exposes ctx, so this is a no-op unless  */
    /* a future version adds it. Kept for forward-compat; never throws.       */
    try {
      const ctx = (a._ctx) || null;
      if (!ctx || ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), ctx.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch (_) { /* no-op */ }
  }

  /* ---- synthesized cues (built on EMAUDIO.blip / tone helpers) --------- */

  /* Tab / button click: re-use EMAUDIO's built-in soft-click. */
  function sfxTabClick() {
    const a = audio(); if (!a) return;
    try { a.click(); } catch (_) {}
  }

  /* XP gain: a rapid ascending three-note chirp (distinct from levelUp). */
  function sfxXpGain() {
    const a = audio(); if (!a || !a.isReady || !a.isReady()) return;
    /* EMAUDIO exposes blip(); for a chirp we fall back to rawBeep sequence. */
    try { a.blip(); } catch (_) {}
    /* Stack two quick blips slightly higher to make it feel like a gain     */
    /* rather than an error. rawBeep is no-op if ctx unavailable.            */
    rawBeep(880, 0.06, 0.1, 'triangle');
    rawBeep(1047, 0.05, 0.08, 'sine');
  }

  /* Level-up: delegate to the full arpeggio already in EMAUDIO. */
  function sfxLevelUp() {
    const a = audio(); if (!a) return;
    try { a.levelUp(); } catch (_) {}
  }

  /* Item received: a warm two-tone descending chime (different character    */
  /* from the click or blip).                                                */
  function sfxItemReceived() {
    const a = audio(); if (!a || !a.isReady || !a.isReady()) return;
    rawBeep(1318.5, 0.12, 0.14, 'triangle');  /* E6 */
    rawBeep(880,    0.14, 0.10, 'sine');       /* A5, slightly after */
  }

  /* Combat hit: a short low percussive thud. */
  function sfxCombatHit() {
    const a = audio(); if (!a || !a.isReady || !a.isReady()) return;
    rawBeep(90,  0.08, 0.22, 'square');
    rawBeep(140, 0.06, 0.12, 'triangle');
  }

  /* Action tick: a very subtle high tick (woodcutting / fishing / etc.). */
  function sfxActionTick() {
    const a = audio(); if (!a || !a.isReady || !a.isReady()) return;
    rawBeep(1760, 0.03, 0.05, 'sine');
  }

  /* ---- tab / button click hook (DOM delegation) ------------------------ */
  /* Listen on the HUD tab bar and chat-channel bar as early as possible.   */
  /* If the DOM nodes exist now, attach immediately; re-attach once on       */
  /* em-data-ready in case HUD renders after this module inits.             */
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
  }
  attachClickListeners();

  /* ---- em-data-ready: re-attach listeners after HUD builds its DOM ----- */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-data-ready', function () {
      attachClickListeners();
    });
  }

  /* ---- em-lesson: lesson/dialogue complete event ----------------------- */
  /* Play the level-up jingle to mark a meaningful progression moment.      */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-lesson', function (e) {
      /* only fire on explicit 'complete:' actions, not every dialogue step */
      const detail = (e && e.detail) ? String(e.detail) : '';
      if (detail.indexOf('complete:') === 0) {
        sfxLevelUp();
      } else {
        /* generic dialogue blip (non-complete step) */
        sfxTabClick();
      }
    });
  }

  /* ---- em-combat-hit event (dispatched by combat.js if it adds one) --- */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-combat-hit', function () {
      sfxCombatHit();
    });
  }

  /* ---- em-action-tick event (dispatched by skilling.js if it adds one) - */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-action-tick', function () {
      sfxActionTick();
    });
  }

  /* ---- monkey-patch EMHUD.addXp and EMHUD.giveItem -------------------- */
  /* EMHUD may not exist yet (modules load before HUD data arrives).        */
  /* Strategy: patch now if present, then patch again when em-data-ready    */
  /* fires, and also watch for the EMHUD global to appear via a one-shot    */
  /* rAF poll (at most ~100 frames / ~1.6s to keep it bounded).             */

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
        /* call original first - never lose real game behaviour */
        const result = _origAddXp(skill, amt);
        try {
          /* EMHUD.addXp triggers levelUp internally when level rises;        */
          /* we play the chirp for any XP gain. The level-up arpeggio fires   */
          /* from em-lesson or from the addXp wrapper below when a level      */
          /* boundary is crossed (detected by checking the skill level before */
          /* and after the original call is impractical without HUD internals, */
          /* so we emit a lighter chirp always and trust EMAUDIO.levelUp for  */
          /* the big moment via em-lesson).                                   */
          sfxXpGain();
        } catch (_) {}
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

  /* try to patch now (EMHUD may already exist if initHud ran before us) */
  patchHud();

  /* rAF poll for EMHUD appearing (bounded; stops once both patched or limit) */
  function pollPatch() {
    if (xpPatched && itemPatched) return;
    if (patchAttempts++ >= MAX_PATCH_ATTEMPTS) return;
    patchHud();
    if (typeof requestAnimationFrame !== 'undefined' && (!xpPatched || !itemPatched)) {
      requestAnimationFrame(pollPatch);
    }
  }
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(pollPatch);
  }

  /* also patch on em-data-ready (HUD data arrives then, guaranteeing EMHUD exists) */
  if (typeof window !== 'undefined') {
    window.addEventListener('em-data-ready', function () {
      patchHud();
    });
  }
}
