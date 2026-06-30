/* =====================================================================
   ELDERMOOR - Audio module (AUD1/AUD2/AUD4/SND).

   A lightweight Web Audio engine with three gain buses
   (master -> {music, sfx}). Since we have NO audio asset files yet,
   every cue is SYNTHESIZED procedurally with oscillators - 100% original,
   zero external files, no copyrighted music.

   Cues:
     - click()   : soft UI click
     - levelUp() : short ascending arpeggio jingle
     - blip()    : button / error blip
     - playZone(id): gentle, very subtle looping ambient pad (the "music")

   Autoplay-safe: the AudioContext is created/resumed on the FIRST user
   gesture (pointerdown / keydown), satisfying mobile autoplay policies.

   Volumes are read from window.EMSETTINGS if present, e.g.
     window.EMSETTINGS = { volume:{ master:0.8, music:0.5, sfx:0.9 },
                           mute:{ master:false, music:false, sfx:false } }

   main.js invokes initAudio() once; everything else talks through the
   window.EMAUDIO global (mirrors the EMHUD/EMWORLD pattern).
   ===================================================================== */
export function initAudio(){
  // ---- internal state ---------------------------------------------------
  let ctx = null;                 // AudioContext (lazily created on gesture)
  let master = null, music = null, sfx = null; // gain bus nodes
  let started = false;            // gesture bootstrap done?

  // Default bus volumes (overridden by EMSETTINGS where present).
  const DEFAULTS = { master: 0.85, music: 0.45, sfx: 0.9 };
  const vol  = { ...DEFAULTS };           // current 0..1 per bus
  const muted = { master:false, music:false, sfx:false };

  // The currently-playing ambient pad (so playZone can swap/stop it).
  let zone = null;        // { id, nodes:[], stop:fn }

  const clamp01 = v => Math.max(0, Math.min(1, Number(v)||0));

  // Pull any user-configured volumes/mutes from the global settings object.
  function readSettings(){
    const s = (typeof window !== 'undefined' && window.EMSETTINGS) || null;
    if(!s) return;
    if(s.volume){
      for(const bus of ['master','music','sfx']){
        if(s.volume[bus] != null) vol[bus] = clamp01(s.volume[bus]);
      }
    }
    if(s.mute){
      for(const bus of ['master','music','sfx']){
        if(s.mute[bus] != null) muted[bus] = !!s.mute[bus];
      }
    }
  }

  // Effective gain for a bus = configured volume unless muted.
  const busGain = bus => (muted[bus] ? 0 : clamp01(vol[bus]));

  // Push current vol/mute state into the live gain nodes.
  function applyGains(){
    if(!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(busGain('master'), t, 0.015);
    music .gain.setTargetAtTime(busGain('music'),  t, 0.015);
    sfx   .gain.setTargetAtTime(busGain('sfx'),    t, 0.015);
  }

  // ---- engine bootstrap -------------------------------------------------
  function ensureCtx(){
    if(ctx) return ctx;
    const AC = (typeof window !== 'undefined') &&
               (window.AudioContext || window.webkitAudioContext);
    if(!AC) return null;            // no Web Audio support - fail silent.
    ctx = new AC();
    readSettings();

    master = ctx.createGain();
    music  = ctx.createGain();
    sfx    = ctx.createGain();
    music.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);
    applyGains();
    return ctx;
  }

  // Resume a suspended context (mobile starts suspended until a gesture).
  function resume(){
    if(ctx && ctx.state === 'suspended'){
      ctx.resume().catch(()=>{});
    }
  }

  // First-gesture handler: create + resume, then detach the listeners.
  function onFirstGesture(){
    started = true;
    ensureCtx();
    resume();
    if(typeof window !== 'undefined'){
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      window.removeEventListener('touchstart', onFirstGesture);
    }
  }

  if(typeof window !== 'undefined'){
    window.addEventListener('pointerdown', onFirstGesture, { once:true });
    window.addEventListener('keydown',     onFirstGesture, { once:true });
    window.addEventListener('touchstart',  onFirstGesture, { once:true });
  }

  // True only when we can actually make sound right now.
  function ready(){
    if(!started) return false;        // respect autoplay: wait for gesture
    if(!ensureCtx()) return false;
    resume();
    return ctx.state === 'running' || ctx.state === 'suspended';
  }

  // ---- synthesis helpers ------------------------------------------------
  // One enveloped oscillator voice routed into a bus. All cues are built
  // from this; nothing is sampled, so everything is original + tiny.
  function tone(bus, { freq=440, type='sine', start=0, dur=0.15,
                       peak=0.3, attack=0.008, release=0.08, detune=0 } = {}){
    if(!ctx) return;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if(detune) osc.detune.setValueAtTime(detune, t0);

    // Simple AD-ish envelope (no clicks: ramp up then exponential tail).
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);

    osc.connect(g);
    g.connect(bus === 'music' ? music : sfx);
    osc.start(t0);
    osc.stop(t0 + dur + release + 0.02);
    return osc;
  }

  // ---- public cues ------------------------------------------------------
  // Soft UI click - a quick, high, very short blip with a touch of body.
  function click(){
    if(!ready()) return;
    tone('sfx', { freq: 880, type:'triangle', dur:0.03, peak:0.18,
                  attack:0.002, release:0.04 });
    tone('sfx', { freq: 1320, type:'sine', dur:0.02, peak:0.07,
                  attack:0.001, release:0.03 });
  }

  // Level-up jingle - short ascending major arpeggio (C5 E5 G5 C6).
  function levelUp(){
    if(!ready()) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      tone('sfx', { freq:f, type:'triangle', start:i*0.11, dur:0.12,
                    peak:0.26, attack:0.006, release:0.16 });
      // soft octave-down body for warmth
      tone('sfx', { freq:f/2, type:'sine', start:i*0.11, dur:0.12,
                    peak:0.08, attack:0.006, release:0.16 });
    });
    // little sparkle to close it out
    tone('sfx', { freq:1567.98, type:'sine', start:notes.length*0.11,
                  dur:0.18, peak:0.14, attack:0.004, release:0.22 });
  }

  // Button / error blip - a low, blunt square-ish double tap.
  function blip(){
    if(!ready()) return;
    tone('sfx', { freq: 220, type:'square', dur:0.06, peak:0.16,
                  attack:0.002, release:0.06 });
    tone('sfx', { freq: 174.61, type:'square', start:0.07, dur:0.07,
                  peak:0.14, attack:0.002, release:0.07 });
  }

  // ---- ambient pad (the "music") ---------------------------------------
  // A handful of detuned, slowly-LFO\'d sine voices forming a quiet drone.
  // Different zone ids pick a different root chord so areas feel distinct.
  const ZONE_CHORDS = {
    default: [110.00, 164.81, 220.00],          // A minor-ish triad-ish
    chapel:  [130.81, 196.00, 261.63],          // C major, airy
    town:    [146.83, 220.00, 293.66],          // D, brighter
    forest:  [98.00, 146.83, 196.00],           // G, low + mossy
    cave:    [82.41, 110.00, 123.47],           // E, dark + close
  };

  function stopZone(){
    if(!zone) return;
    const z = zone; zone = null;
    if(!ctx){ return; }
    const t = ctx.currentTime;
    // gentle fade then stop so swaps don\'t pop
    z.gain.gain.cancelScheduledValues(t);
    z.gain.gain.setTargetAtTime(0.0001, t, 0.4);
    z.oscs.forEach(o => { try { o.stop(t + 2.0); } catch(_){} });
    z.lfos.forEach(o => { try { o.stop(t + 2.0); } catch(_){} });
  }

  // Start (or swap to) the looping ambient pad for a zone. Very subtle.
  function playZone(id){
    if(!ready()) return;
    const key = (id && ZONE_CHORDS[id]) ? id : 'default';
    if(zone && zone.id === key) return;    // already playing this zone
    stopZone();

    const chord = ZONE_CHORDS[key];
    const t0 = ctx.currentTime;

    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, t0);
    padGain.gain.exponentialRampToValueAtTime(0.12, t0 + 3.0); // slow swell
    padGain.connect(music);

    const oscs = [], lfos = [];
    chord.forEach((f, i) => {
      // two slightly detuned voices per note → a wide, gentle chorus
      [-6, 6].forEach(cents => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t0);
        o.detune.setValueAtTime(cents, t0);

        const vg = ctx.createGain();
        vg.gain.setValueAtTime(0.5, t0);

        // a slow tremolo LFO so the pad breathes instead of sitting flat
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.06 + i*0.02, t0);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.18, t0);
        lfo.connect(lfoGain);
        lfoGain.connect(vg.gain);

        o.connect(vg);
        vg.connect(padGain);
        o.start(t0);
        lfo.start(t0);
        oscs.push(o); lfos.push(lfo);
      });
    });

    zone = { id:key, gain:padGain, oscs, lfos };
  }

  // ---- mixer controls ---------------------------------------------------
  function setVolume(bus, v){
    if(!(bus in vol)) return;
    vol[bus] = clamp01(v);
    applyGains();
  }

  function mute(bus, on){
    if(!(bus in muted)) return;
    muted[bus] = !!on;
    applyGains();
  }

  // ---- expose the global API -------------------------------------------
  const api = {
    click, levelUp, blip, playZone, setVolume, mute,
    // small extras that are handy but harmless:
    stopZone,
    isReady: ready,
    resume,                                   // manual resume hook
  };
  if(typeof window !== 'undefined') window.EMAUDIO = api;
  return api;
}
