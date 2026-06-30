/* =====================================================================
   ELDERMOOR - Music engine (generative composer/sequencer for MUSIC-UNIQUE).

   This module owns ORIGINAL, looping, melodic per-zone compositions -
   not a sustained drone. It reads note data from
   assets/data/music-tracks.json (Claude-authored scale-degree patterns,
   zero external/stock audio - everything is synthesized) and schedules
   them on the AudioContext timeline with a lookahead scheduler so timing
   stays tight and every theme loops seamlessly.

   Each theme = { root, scale, beatSec, swing, voices:{lead,bass,arp,perc},
   pattern:{lead,bass,arp,perc} }. A "pattern" part is a list of
   [scaleDegree|null, beats, octaveOffset?] steps. Parts are scheduled
   independently and each loops on its own total-beat length, so lead/bass/
   arp/perc can be different bar lengths and still interlock cleanly
   (classic generative-loop technique - no audio files, no samples).

   Public surface consumed by src/audio.js ONLY (this module never touches
   window.EMAUDIO itself - audio.js is the mixer/bus owner):
     createComposer(ctx, busGainNode) -> {
       loadThemes(): Promise<void>          // fetch + cache music-tracks.json
       hasTheme(trackId): bool
       start(trackId, { fadeInSec, atTime }): { stop(fadeSec), nodes }
         // begins scheduling a theme's voices into busGainNode at time
         // atTime (AudioContext time), returns a handle whose stop(fadeSec)
         // fades + halts all scheduled notes/timers for that theme.
     }

   No mutation of any node passed in; the composer creates its own internal
   gain stage per theme (so audio.js can crossfade two composer instances
   exactly like it already crossfades the ambient pad) and connects that
   single stage into the busGainNode supplied by the caller.
   ===================================================================== */
export function createComposer(ctx, destBus){
  let themes = null;          // { [trackId]: themeDef } once loaded
  let loadPromise = null;

  function loadThemes(){
    if(themes) return Promise.resolve(themes);
    if(loadPromise) return loadPromise;
    loadPromise = fetch('assets/data/music-tracks.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => { themes = (d && d.themes) ? d.themes : {}; return themes; })
      .catch(() => { themes = {}; return themes; });
    return loadPromise;
  }

  function hasTheme(trackId){
    return !!(themes && themes[trackId]);
  }

  // ---- pitch helpers ------------------------------------------------
  // Scale-degree -> Hz. degree may exceed scale.length (carries octaves
  // upward); octaveOffset shifts the whole note +/-N octaves on top.
  function degreeToFreq(theme, degree, octaveOffset){
    const scale = theme.scale;
    const n = scale.length;
    const oct = Math.floor(degree / n) + (octaveOffset || 0);
    const idx = ((degree % n) + n) % n;
    const semis = scale[idx] + oct * 12;
    return theme.root * Math.pow(2, semis / 12);
  }

  // ---- one synthesized instrument voice ------------------------------
  // Builds a small osc(+detune partner)->filter->envelope->out graph for a
  // single note. `noise` voices use a buffer source (still 100% synthesized
  // in-code, not a sample file) shaped into a soft percussive tap.
  function pluckNoise(t0, dur, peak, out){
    const bufLen = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i = 0; i < bufLen; i++){
      // exponentially-decaying white noise = a soft hand-drum / tap
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2.2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(900, t0);
    filt.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0003, peak), t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(out);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  function noteVoice(t0, dur, freq, voiceDef, out, trackers){
    const peak = voiceDef.gain != null ? voiceDef.gain : 0.12;
    const attack = Math.min(0.03, dur * 0.18);
    const release = Math.min(0.22, dur * 0.6);

    if(voiceDef.type === 'noise'){
      pluckNoise(t0, Math.max(0.05, dur * 0.5), peak, out);
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = voiceDef.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if(voiceDef.detune) osc.detune.setValueAtTime((Math.random() - 0.5) * voiceDef.detune, t0);

    let vibLfo = null;
    if(voiceDef.vibrato && voiceDef.vibratoDepth){
      vibLfo = ctx.createOscillator();
      vibLfo.type = 'sine';
      vibLfo.frequency.setValueAtTime(voiceDef.vibrato, t0);
      const vibGain = ctx.createGain();
      vibGain.gain.setValueAtTime(voiceDef.vibratoDepth, t0);
      vibLfo.connect(vibGain);
      vibGain.connect(osc.detune);
      vibLfo.start(t0);
      vibLfo.stop(t0 + dur + release + 0.05);
    }

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0003, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);

    let node = osc;
    if(voiceDef.lpf){
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(voiceDef.lpf, t0);
      filt.Q.value = 0.5;
      osc.connect(filt);
      node = filt;
    }
    node.connect(g);
    g.connect(out);

    osc.start(t0);
    osc.stop(t0 + dur + release + 0.05);

    if(trackers){ trackers.push(osc); if(vibLfo) trackers.push(vibLfo); }
  }

  // ---- lookahead scheduler -------------------------------------------
  // Classic Web Audio "tight timing" pattern (Chris Wilson scheduler): a
  // setInterval ticks frequently and schedules any notes whose start time
  // falls within the lookahead window, using AudioContext time (not
  // setTimeout) for actual playback - so loops stay sample-accurate even
  // under JS jank.
  const LOOKAHEAD_MS = 100;        // how often the scheduler wakes
  const SCHEDULE_AHEAD = 0.30;     // seconds of audio to queue per tick

  function start(trackId, opts){
    opts = opts || {};
    const theme = themes && themes[trackId];
    if(!theme) return null;

    const stage = ctx.createGain();
    const fadeIn = opts.fadeInSec != null ? opts.fadeInSec : 1.2;
    const atTime = opts.atTime != null ? opts.atTime : ctx.currentTime;
    stage.gain.setValueAtTime(0.0001, atTime);
    stage.gain.exponentialRampToValueAtTime(1.0, atTime + Math.max(0.05, fadeIn));
    stage.connect(destBus);

    const beatSec = theme.beatSec || 0.5;
    const swing = theme.swing || 0;
    const parts = theme.pattern || {};
    const voices = theme.voices || {};

    // Each part loops independently on its own total-beat length (parts may
    // intentionally differ in bar length - lead/bass/arp/perc interlocking
    // generatively rather than all sharing one fixed bar grid).
    const cursors = {};
    Object.keys(parts).forEach(part => {
      const steps = parts[part];
      const totalBeats = steps.reduce((s, st) => s + (st[1] || 0), 0) || 1;
      cursors[part] = { steps, idx: 0, totalBeats, nextTime: atTime };
    });

    let stopped = false;
    const liveNodes = [];
    let timer = null;

    function scheduleStep(part, cur){
      const step = cur.steps[cur.idx];
      const degree = step[0];
      const beats = step[1] || 1;
      let dur = beats * beatSec;
      // gentle swing: delay every other step slightly for a human pocket
      const isOdd = (cur.idx % 2) === 1;
      const t0 = cur.nextTime + (swing && isOdd ? swing * beatSec * 0.5 : 0);

      if(degree !== null && degree !== undefined && degree !== '.'){
        const freq = degreeToFreq(theme, degree, step[2] || 0);
        const voiceDef = voices[part] || { type: 'sine', gain: 0.1 };
        noteVoice(t0, Math.max(0.04, dur * 0.92), freq, voiceDef, stage, liveNodes);
      }

      cur.nextTime += dur;
      cur.idx = (cur.idx + 1) % cur.steps.length;
    }

    function tick(){
      if(stopped) return;
      const horizon = ctx.currentTime + SCHEDULE_AHEAD;
      Object.keys(cursors).forEach(part => {
        const cur = cursors[part];
        if(!cur.steps.length) return;
        let guard = 0;
        while(cur.nextTime < horizon && guard < 64){
          scheduleStep(part, cur);
          guard++;
        }
      });
    }

    tick();
    timer = setInterval(tick, LOOKAHEAD_MS);

    function stop(fadeSec){
      if(stopped) return;
      stopped = true;
      clearInterval(timer);
      const t = ctx.currentTime;
      const f = fadeSec != null ? fadeSec : 0.6;
      try {
        stage.gain.cancelScheduledValues(t);
        stage.gain.setTargetAtTime(0.0001, t, Math.max(0.05, f / 3));
      } catch(_){}
      const killAt = t + f + 1.5;
      liveNodes.forEach(n => { try { n.stop(killAt); } catch(_){} });
      setTimeout(() => { try { stage.disconnect(); } catch(_){} }, (f + 2.0) * 1000);
    }

    return { stop, stage, trackId };
  }

  return { loadThemes, hasTheme, start };
}
