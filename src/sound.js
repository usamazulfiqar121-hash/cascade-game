/* ═══════════ AUDIO + HAPTICS LAYER ═══════════
   Self-contained. Exports Snd (SFX), buzz (vibrate),
   setVibe (enable/disable haptics). */

/* ─── Haptics ─── */
let VIBE_ON = true;
export function setVibe(v) { VIBE_ON = v; }
export function buzz(ms) {
  if (!VIBE_ON) return;
  try { navigator?.vibrate?.(ms); } catch {}
}

/* Haptics plugin loader — caches the PROMISE, not a boolean flag, so
   concurrent calls during the first import all await the same in-flight
   load instead of racing past the guard and getting a still-null plugin.
   Old pattern set hapticsLoadAttempted=true synchronously, so any call
   between "import started" and "import resolved" got null and fell back
   to navigator.vibrate() — a no-op in Android WebView without a VIBRATE
   manifest permission. That's why the first several taps in an APK
   session felt dead. Also: on failure, reset the promise so a later call
   retries, instead of permanently disabling haptics after one transient
   chunk-load error. */
let hapticsPlugin = null;
let hapticsPromise = null;

function getHapticsPlugin() {
  if (hapticsPlugin) return Promise.resolve(hapticsPlugin);
  if (!hapticsPromise) {
    hapticsPromise = import("@capacitor/haptics")
      .then((mod) => {
        hapticsPlugin = mod.Haptics || null;
        return hapticsPlugin;
      })
      .catch(() => {
        hapticsPromise = null;
        return null;
      });
  }
  return hapticsPromise;
}

function impact(style, fallback) {
  /* TEMP DIAGNOSTIC — remove after root cause found. The Settings test
     button works but the game doesn't, and the ONLY difference is this
     wrapper (VIBE_ON gate + cached-promise path). Show exactly which
     side is broken on the very next in-game pour. */
  try {
    alert(
      "IMPACT DEBUG\n" +
      "style=" + style + "\n" +
      "VIBE_ON=" + VIBE_ON + "\n" +
      "pluginLoaded=" + (hapticsPlugin ? "yes" : "no") + "\n" +
      "promiseStarted=" + (hapticsPromise ? "yes" : "no")
    );
  } catch {}
  if (!VIBE_ON) return;
  getHapticsPlugin().then((plugin) => {
    if (plugin) {
      plugin.impact({ style }).catch((e) => {
        try { alert("plugin.impact FAILED: " + (e && e.message)); } catch {}
        buzz(fallback);
      });
    } else {
      try { alert("plugin is NULL — import failed"); } catch {}
      buzz(fallback);
    }
  });
}

function notification(type, fallback) {
  if (!VIBE_ON) return;
  getHapticsPlugin().then((plugin) => {
    if (plugin) plugin.notification({ type }).catch(() => buzz(fallback));
    else buzz(fallback);
  });
}

/* Escalated one step above the plugin's "intended" style names: on
   Samsung (confirmed via on-device testing) LIGHT impact is effectively
   imperceptible, MEDIUM is what LIGHT should feel like on a Pixel, and
   HEAVY reads as a proper tap. Using the literal LIGHT/MEDIUM here
   means every pour/tap that was supposed to tick felt like nothing on
   the target device — the plugin fires correctly, the OS just maps it
   too soft. Fallback vibrate ms bumped the same way, since some older
   WebViews route to navigator.vibrate() and had the same too-short-to-
   feel problem. */
export const Haptic = {
  light:   () => impact("MEDIUM", 15),
  medium:  () => impact("HEAVY",  25),
  heavy:   () => impact("HEAVY",  40),
  success: () => notification("SUCCESS", 30),
  warning: () => notification("WARNING", [10, 40, 10]),
  error:   () => notification("ERROR",   60),
};

/* ─── Web Audio SFX ─── */
export const Snd = (() => {
  let ctx = null, sfxBus = null, sfxOn = true, noiseBuffer = null;

  function getNoiseBuffer(c) {
    if (noiseBuffer) return noiseBuffer;
    const len = Math.floor(c.sampleRate * 0.1);
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function makeImpulseResponse(c, duration = 0.7, decay = 3) {
    const len = Math.floor(c.sampleRate * duration);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return ir;
  }

  function ensure() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const m = ctx.createGain();
      m.gain.value = 0.5;
      m.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.6;
      sfxBus.connect(m);

      try {
        const send = ctx.createGain();
        send.gain.value = 0.25;
        const convolver = ctx.createConvolver();
        convolver.buffer = makeImpulseResponse(ctx);
        const ret = ctx.createGain();
        ret.gain.value = 0.45;
        sfxBus.connect(send);
        send.connect(convolver);
        convolver.connect(ret);
        ret.connect(m);
      } catch {}
    } catch { ctx = null; }
    return ctx;
  }

  function tone(freq, { type = "sine", dur = 0.15, peak = 0.25, glide = 0, delay = 0 } = {}) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(freq * glide, 20), t + dur * 0.8);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function transient({ cutoff = 2200, dur = 0.035, peak = 0.16, delay = 0 } = {}) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = getNoiseBuffer(c);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  return {
    unlock: ensure,
    pour: (n = 1) => { if (sfxOn) { transient({ cutoff: 1800, dur: 0.03, peak: 0.12 }); tone(400 + n * 80, { type: "sine", dur: 0.12, peak: 0.2, glide: 1.3 }); } },
    select: () => { if (sfxOn) { transient({ cutoff: 4000, dur: 0.02, peak: 0.08 }); tone(600, { type: "sine", dur: 0.06, peak: 0.12 }); } },
    bonus: () => { if (sfxOn) { transient({ cutoff: 3200, dur: 0.03, peak: 0.13 }); tone(880, { type: "sine", dur: 0.1, peak: 0.15 }); tone(1174, { type: "sine", dur: 0.1, peak: 0.12, delay: 0.06 }); } },
    /* Combo/mega bonus tiers — same bonus moment as bonus() above, but a
       bigger combo should sound bigger too, not just add the same ping. */
    combo: () => { if (!sfxOn) return; [740, 988, 1245].forEach((f, i) => { transient({ cutoff: 2800, dur: 0.03, peak: 0.13, delay: i * 0.045 }); tone(f, { type: "sine", dur: 0.09, peak: 0.16, delay: i * 0.045 }); }); },
    mega: () => { if (!sfxOn) return; [523.25, 659.25, 880, 1318.5].forEach((f, i) => { transient({ cutoff: 2400, dur: 0.035, peak: 0.15, delay: i * 0.055 }); tone(f, { type: "triangle", dur: 0.14, peak: 0.2, delay: i * 0.055 }); }); },
    clear: () => { if (!sfxOn) return; transient({ cutoff: 3600, dur: 0.04, peak: 0.16 }); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.18, delay: i * 0.07 })); },
    upgrade: () => { if (!sfxOn) return; transient({ cutoff: 3200, dur: 0.04, peak: 0.15 }); [523.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.4, peak: 0.18, delay: i * 0.08 })); },
    fail: () => { if (!sfxOn) return; transient({ cutoff: 700, dur: 0.05, peak: 0.14 }); [392, 311.13, 261.63].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.2, delay: i * 0.11 })); },
    setSfx: (v) => { sfxOn = v; },
  };
})();

/* ─── Adaptive Background Music ─── */
/* A real recorded ambient track (public/music.mp3), looped seamlessly
   in code rather than a naive `loop = true`, and reacting to what's
   happening the same way this used to (before it was a synthesized
   pad — see git history): brightens as moves run low (setTension, the
   exact movesLeft<=3 threshold App.jsx already uses to turn the moves
   counter red — one deadline, one number, same idea notifications.js
   applies to its own reminder timing), a brief lift on combo/mega/
   clear/upgrade (pulse), and ducks under the upgrade/game-over
   overlays (duck) rather than competing with them.

   Why not just loop=true: this track, like every AI-generated ambient
   track we tried, was mixed like a song with an ending — it fades
   down toward silence over roughly its last 20-30 seconds, not
   authored as a seamless bed. Looping it as-is would mean a few
   seconds of near-silence followed by an abrupt jump back to full
   volume each time around. Trimming the file wouldn't fix that either
   — the fade is a slow arc across a large chunk of the track, not a
   short flourish at the very end, so there's no single clean cut
   point. Instead this schedules a SECOND copy of the same buffer to
   start a few seconds (CROSSFADE) before the first copy's natural
   end, fading the new copy in while the old one fades out — the new
   copy is always loud, full-volume material, so it masks whatever
   state the old copy's tail is in by the time it becomes audible as a
   problem. This works regardless of the file's own internal dynamics,
   which is why no manual editing of the source file was needed.

   Deliberately its own AudioContext, not sharing Snd's, for the same
   reason as before: Snd's graph is shipped and verified, this stays
   additive. Two AudioContexts on one page is normal and inexpensive.

   The mix levels below (BASE_LEVEL/TENSE_LEVEL) are still a starting
   guess, not a verified-good balance — this can't be heard in the
   build sandbox. Retune by ear on a real device before treating them
   as settled. */
export const Music = (() => {
  let ctx = null, master = null, musicBus = null, musicOn = true;
  let padFilter = null, playing = false;
  let tension = 0;   // 0 = calm, 1 = urgent — set by setTension()
  let ducked = false;
  let buffer = null, bufferLoadPromise = null;
  let activeNodes = [];   // { node, endAt } — anything with .stop(), pending teardown
  let loopTimer = null;
  let runToken = 0;       // bumped on every stop() so a start() that's still loading
                          // when stop() is called can't resurrect playback afterward

  const BASE_LEVEL = 0.14;
  const TENSE_LEVEL = 0.19;
  const DUCK_MULT = 0.35;
  const CALM_CUTOFF = 900;
  const TENSE_CUTOFF = 2600;
  const CROSSFADE = 3.5;      // seconds of overlap between consecutive loop plays
  const MUSIC_URL = "/music.mp3";   // public/music.mp3 — served at the root, same
                                     // convention as index.html's /favicon.png

  function ensure() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = musicOn ? 1 : 0;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.0001;
      musicBus.connect(master);
    } catch { ctx = null; }
    return ctx;
  }

  function targetLevel() {
    const base = BASE_LEVEL + (TENSE_LEVEL - BASE_LEVEL) * tension;
    return ducked ? base * DUCK_MULT : base;
  }

  function rampBusTo(level, dur) {
    if (!ctx || !musicBus) return;
    const t = ctx.currentTime;
    const g = musicBus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(g.value, 0.0001), t);
    g.exponentialRampToValueAtTime(Math.max(level, 0.0001), t + dur);
  }

  /* Fetched and decoded once, then cached module-wide — every later
     start() (leaving Home and coming back, say) reuses the same
     decoded buffer instead of re-fetching. */
  function loadBuffer(c) {
    if (buffer) return Promise.resolve(buffer);
    if (bufferLoadPromise) return bufferLoadPromise;
    bufferLoadPromise = fetch(MUSIC_URL)
      .then((r) => r.arrayBuffer())
      .then((ab) => c.decodeAudioData(ab))
      .then((buf) => { buffer = buf; return buf; })
      .catch(() => null);
    return bufferLoadPromise;
  }

  /* Plays one full copy of the track starting at absolute AudioContext
     time `at`. Its own gain envelope fades in over CROSSFADE as it
     begins (so it never pops in at full volume under the previous
     copy's tail) and fades out over CROSSFADE right before its own
     natural end — belt-and-braces alongside the file's own fade, in
     case that fade doesn't reach true silence. Runs through padFilter,
     the same shared brightness control setTension()/pulse() use, so
     tension/pulses apply no matter which copy(ies) are overlapping. */
  function playSegment(c, at, dur) {
    const src = c.createBufferSource();
    src.buffer = buffer;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(1, at + CROSSFADE);
    const fadeOutStart = Math.max(at + dur - CROSSFADE, at + CROSSFADE);
    g.gain.setValueAtTime(1, fadeOutStart);
    g.gain.linearRampToValueAtTime(0.0001, at + dur);
    src.connect(g);
    g.connect(padFilter);
    src.start(at);
    src.stop(at + dur + 0.1);
    activeNodes.push({ node: src, endAt: at + dur });
  }

  function queueNext(c, myToken, startedAt, dur) {
    const nextStart = startedAt + dur - CROSSFADE;
    const fireInMs = Math.max(0, (nextStart - c.currentTime - 1) * 1000);
    loopTimer = setTimeout(() => {
      if (!playing || myToken !== runToken) return;
      playSegment(c, nextStart, dur);
      queueNext(c, myToken, nextStart, dur);
    }, fireInMs);
  }

  function start() {
    if (playing) return;
    const c = ensure();
    if (!c) return;
    playing = true;
    const myToken = runToken;

    padFilter = c.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.Q.value = 0.6;
    padFilter.frequency.setValueAtTime(CALM_CUTOFF + (TENSE_CUTOFF - CALM_CUTOFF) * tension, c.currentTime);
    padFilter.connect(musicBus);

    loadBuffer(c).then((buf) => {
      if (!playing || myToken !== runToken || !buf) return;
      const now = c.currentTime + 0.05;
      playSegment(c, now, buf.duration);
      queueNext(c, myToken, now, buf.duration);
    });

    rampBusTo(targetLevel(), 2.2);
  }

  function stop() {
    if (!playing || !ctx) return;
    playing = false;
    runToken++;   // invalidates any in-flight load/schedule from this run
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), t);
    musicBus.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    const nodesToStop = activeNodes;
    activeNodes = [];
    /* Let the fade-out actually finish before tearing the sources
       down — stopping them immediately would just chop the tail off. */
    setTimeout(() => {
      nodesToStop.forEach(({ node }) => { try { node.stop(); } catch {} });
    }, 1100);
  }

  /* urgent: true once movesLeft <= 3 for the current round, false
     otherwise — see the file-header note on why this reuses that
     exact threshold rather than inventing its own. */
  function setTension(urgent) {
    tension = urgent ? 1 : 0;
    if (!playing || !ctx || !padFilter) return;
    const t = ctx.currentTime;
    padFilter.frequency.cancelScheduledValues(t);
    padFilter.frequency.setValueAtTime(padFilter.frequency.value, t);
    padFilter.frequency.linearRampToValueAtTime(CALM_CUTOFF + (TENSE_CUTOFF - CALM_CUTOFF) * tension, t + 0.6);
    rampBusTo(targetLevel(), 0.6);
  }

  /* on: true while an overlay (upgrade picker, game-over) is showing —
     the music steps back under it instead of competing with it. */
  function duck(on) {
    ducked = on;
    if (!playing) return;
    rampBusTo(targetLevel(), 0.35);
  }

  /* One-shot brightening for a big moment (combo/mega/clear/upgrade).
     Doesn't touch playback at all — just opens the shared filter
     briefly so the music visibly "reacts", then settles back to
     wherever setTension currently has it. */
  function pulse(kind = "combo") {
    if (!playing || !ctx || !padFilter) return;
    const t = ctx.currentTime;
    const peak = kind === "mega" ? TENSE_CUTOFF + 800 : kind === "clear" ? TENSE_CUTOFF + 400 : TENSE_CUTOFF;
    const settle = CALM_CUTOFF + (TENSE_CUTOFF - CALM_CUTOFF) * tension;
    padFilter.frequency.cancelScheduledValues(t);
    padFilter.frequency.setValueAtTime(padFilter.frequency.value, t);
    padFilter.frequency.linearRampToValueAtTime(peak, t + 0.08);
    padFilter.frequency.linearRampToValueAtTime(settle, t + 0.7);
  }

  function setEnabled(v) {
    musicOn = v;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(v ? 1 : 0, t + 0.3);
  }

  return { start, stop, setTension, duck, pulse, setEnabled };
})();
