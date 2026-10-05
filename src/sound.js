/* ═══════════ AUDIO + HAPTICS LAYER ═══════════
   Self-contained. Exports Snd (SFX), Music (ambient bed),
   Haptic (taps), setVibe (enable/disable haptics). */

/* ─── Haptics ─── */
let VIBE_ON = true;
export function setVibe(v) { VIBE_ON = v; }

/* Haptics plugin loader — caches the PROMISE, not a boolean flag, so
   concurrent calls during the first import all await the same in-flight
   load instead of racing past the guard and getting a still-null plugin.
   Old pattern set hapticsLoadAttempted=true synchronously, so any call
   between "import started" and "import resolved" got null and produced no
   haptic at all. That's why the first several taps in an APK session felt
   dead. Also: on failure, reset the promise so a later call retries,
   instead of permanently disabling haptics after one transient chunk-load
   error. */
let hapticsPlugin = null;
let hapticsPromise = null;

function getHapticsPlugin() {
  if (hapticsPlugin) return Promise.resolve(hapticsPlugin);
  if (!hapticsPromise) {
    hapticsPromise = import("@capacitor/haptics")
      .then((mod) => {
        hapticsPlugin = mod.Haptics || null;
        /* Capability probe — LOG ONLY. This used to also raise a blocking
           alert() showing the same JSON, left behind from a device-log
           collection pass and never removed: it fired on the first haptic
           tap of every session, so a native modal popped up in the middle
           of ordinary play. Worse, that alert blurs the window, which the
           music lifecycle listeners above read as "app backgrounded" — so
           the diagnostic would have paused the music every single time it
           appeared. The numbers are just as readable in a device log.

           Now dev-only, and it no longer calls the probe methods
           unconditionally: hasAmplitudeControl()/hasVibrationEffect()/
           hasPredefinedEffect() each hit the plugin bridge, and this block
           runs the first time haptics are used in a session — i.e. in the
           middle of a tap. Three bridge round-trips plus an
           Object.keys() dump on that path was real work on the hot path of
           the first interaction, and it only ever fed a log line nobody
           reads in a release build. The alert() removal kept the block
           alive; the production build should not be paying for it. */
        if (import.meta.env && import.meta.env.DEV) {
          const plugin = hapticsPlugin;
          if (plugin) {
            const info = {
              hasAmplitudeControl: plugin.hasAmplitudeControl ? plugin.hasAmplitudeControl() : "N/A",
              hasVibrationEffect: plugin.hasVibrationEffect ? plugin.hasVibrationEffect() : "N/A",
              hasPredefinedEffect: plugin.hasPredefinedEffect ? plugin.hasPredefinedEffect() : "N/A",
              pluginKeys: Object.keys(plugin),
            };
            console.log("HAPTICS DEBUG:", info);
          }
        }
        return hapticsPlugin;
      })
      .catch(() => {
        hapticsPromise = null;
        return null;
      });
  }
  return hapticsPromise;
}

/* Taps go through Haptics.vibrate() — which is a plain one-shot
   VibrationEffect on Android — instead of Haptics.impact(), which the
   same plugin implements as a two-entry amplitude waveform
   (createWaveform({0,43},{0,180}) and friends, see
   HapticsImpactType.java). On Samsung/OneUI that short two-entry form
   is dropped without an error: no rejection, no vibration, so the
   promise resolves and the catch below never even sees it. The same
   signature shows up outside Capacitor too (flutter#144226,
   flutter#73987, tauri plugins-workspace#2023): impact/selection dead,
   notification alive, vibrate alive. notification() survives because
   its patterns are four to six entries long rather than two.
   Intensity is therefore graded by duration instead of amplitude.
   The old code worked around this by climbing the style names
   (light→MEDIUM, medium→HEAVY) on the theory that Samsung just mapped
   them too softly; that only made it worse, since MEDIUM and HEAVY
   share the same broken two-entry shape, and it flattened medium and
   heavy into the same call. Falls back to nothing on failure — the
   previous navigator.vibrate() fallback could not run in an Android
   WebView at all, so it only ever masked real plugin errors. */
function tick(duration) {
  if (!VIBE_ON) return;
  getHapticsPlugin().then((plugin) => {
    if (plugin) plugin.vibrate({ duration }).catch(() => {});
  });
}

/* A sequence of one-shot ticks, for celebrations that need to ESCALATE
   rather than just fire once.

   Capacitor's exposed Haptics.vibrate() takes a single duration — there is
   no waveform/pattern option on the JS surface — so a multi-pulse pattern
   has to be walked from JS. That is a real downgrade and is not equivalent
   to one VibrationEffect.createWaveform() call: every tick is its own
   bridge round-trip, so the 30ms gap is only accurate to about a frame, and
   a tick still buzzing when the next one is queued can be cut short by the
   call that follows.

   It's still the right trade. The alternative is notification("SUCCESS") —
   a single fixed pattern the OS chooses, which cannot express "climb from
   40ms to 120ms" at all, and is the same burst for a 7-day streak as for a
   100-day one. The patterns here are short (1.2s worst case), so the
   timing error has nowhere to accumulate, and the escalation is the part
   that's actually doing the communicating.

   Not cancelled on unmount, same as tick() above: a stray vibrate arriving
   after the toast is gone is harmless, and holding a handle to cancel it
   would mean this module had to know when the app is going away. */
function pulse(durations, gap) {
  if (!VIBE_ON) return;
  let at = 0;
  durations.forEach((d) => {
    setTimeout(() => tick(d), at);
    at += d + gap;
  });
}

/* notification() is left exactly as it was: its longer multi-entry
   waveforms already fire on the devices that dropped the two-entry
   impact ones, so the duration-grading workaround does not apply. */
function notification(type) {
  if (!VIBE_ON) return;
  getHapticsPlugin().then((plugin) => {
    if (plugin) plugin.notification({ type }).catch(() => {});
  });
}

/* 14/28/55ms are a starting guess at tick / tap / thud, not a tuned
   ladder — same caveat as the music mix levels further down. Retune by
   ear on a real device, particularly on Samsung, where short one-shots
   need to be longer than they do on a Pixel to read as a distinct
   tick. */
export const Haptic = {
  light:   () => tick(14),
  medium:  () => tick(28),
  heavy:   () => tick(55),
  success: () => notification("SUCCESS"),
  warning: () => notification("WARNING"),
  error:   () => notification("ERROR"),
  /* Streak-milestone ceremony — each entry is a list of PULSE LENGTHS that
     get longer as the list goes on, separated by a 30ms gap, so the buzz
     itself reads as building rather than repeating. Scales with the tier
     (see STREAK_CEREMONY in constants.js) for the same reason the toast
     does: a century and a week must not feel identical in the hand. */
  celebrate: (tier = 1) => {
    const PATTERNS = {
      1: [40, 80, 120],
      /* Note the first pulse is SHORTER than tier 1's (35 vs 40). That reads
         backwards at a glance but is deliberate: the pattern's job is to
         escalate, and a 4-pulse ladder that started higher than a 3-pulse
         one would peak lower (150 vs 120) despite doing more work. Starting
         a notch lower is what makes the extra pulse read as more rather than
         as a differently-shaped version of the same burst. */
      2: [35, 70, 110, 150],
      3: [30, 60, 100, 140, 180, 220],
    };
    const p = PATTERNS[tier];
    if (p) pulse(p, 30);
  },
};

/* ─── Web Audio SFX ─── */

/* Transpose a frequency by N semitones. Equal temperament makes a semitone a
   constant ratio — 2^(1/12) — so this is one Math.pow rather than a table.

   This is what makes a rising combo read as the SAME chord getting higher
   instead of a different sound each time. Adding a flat 40Hz per step (the
   alternative) walks the pitch in fixed linear increments, so the interval
   between consecutive combos shrinks as the numbers climb: 40Hz is a major
   third at 740Hz but barely a semitone by the time you're near 1.5kHz, and
   the run's excitement curve flattens exactly when it should be steepest.
   Semitones keep every step the same interval, and keep the result in tune
   with the rest of the mix. */
const semitones = (f, n) => f * Math.pow(2, n / 12);

export const Snd = (() => {
  let ctx = null, sfxBus = null, sfxOn = true, noiseBuffer = null, reverbSend = null;

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
        /* Kept so a voice can ask for MORE wet signal without the whole
           sfxBus getting wetter (see the `wet` option in tone below). The
           default reverb every SFX already has is this bus's own 0.25 send;
           this reference is only for voices that opt in, so it is assigned
           inside the same try that builds the chain — if the convolver setup
           ever throws, it stays null and `wet` degrades to "no extra send"
           instead of connecting into a half-built graph. */
        reverbSend = send;
      } catch {}
    } catch { ctx = null; }
    return ctx;
  }

  function tone(freq, { type = "sine", dur = 0.15, peak = 0.25, glide = 0, delay = 0, wet = 0 } = {}) {
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
    /* Every voice is ALREADY reverberated: sfxBus has its own 0.25 send into
       the convolver (see ensure). `wet` is extra send on top of that, for the
       rare voice that should sit in a bigger space than its neighbours —
       currently only the 100-day ceremony.

       Default 0 means no new nodes at all, so every other SFX in this file
       is byte-for-byte unchanged. The per-voice gain is what keeps this
       additive and correct: without it there would be no way to scale one
       note's wet contribution, and raising the shared send instead would
       have made every pour, land and tap in the app wetter as a side effect
       of adding reverb to a single celebration. */
    if (wet > 0 && reverbSend) {
      const w = c.createGain();
      w.gain.value = wet;
      g.connect(w);
      w.connect(reverbSend);
    }
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
    /* A ball touching down in a tube — scheduled on the audio clock (delay
       in seconds) to the exact moment its flight lands, rather than
       playing on the tap. A short, soft "tock": a tiny click plus a low
       sine that bends slightly down. Pitch climbs with the slot it lands
       in (0 = bottom), so filling a tube sounds like filling a glass. */
    land: (slot = 0, delay = 0) => { if (sfxOn) { transient({ cutoff: 2400, dur: 0.02, peak: 0.09, delay }); tone(190 + slot * 45, { type: "sine", dur: 0.07, peak: 0.14, glide: 0.75, delay }); } },
    bonus: () => { if (sfxOn) { transient({ cutoff: 3200, dur: 0.03, peak: 0.13 }); tone(880, { type: "sine", dur: 0.1, peak: 0.15 }); tone(1174, { type: "sine", dur: 0.1, peak: 0.12, delay: 0.06 }); } },
    /* Combo/mega bonus tiers — same bonus moment as bonus() above, but a
       bigger combo should sound bigger too, not just add the same ping.
       `step` transposes the whole arpeggio up by that many semitones, so a
       run's combos climb as one recognisable chord instead of repeating an
       identical one; default 0 keeps any other caller on today's exact
       pitch. Timbre, note spacing and the transient are deliberately
       untouched — only the register moves, which is what makes it read as
       the same reward getting stronger rather than a new sound effect. */
    combo: (step = 0) => { if (!sfxOn) return; [740, 988, 1245].forEach((f, i) => { const g = semitones(f, step); transient({ cutoff: 2800, dur: 0.03, peak: 0.13, delay: i * 0.045 }); tone(g, { type: "sine", dur: 0.09, peak: 0.16, delay: i * 0.045 }); }); },
    mega: (step = 0) => { if (!sfxOn) return; [523.25, 659.25, 880, 1318.5].forEach((f, i) => { const g = semitones(f, step); transient({ cutoff: 2400, dur: 0.035, peak: 0.15, delay: i * 0.055 }); tone(g, { type: "triangle", dur: 0.14, peak: 0.2, delay: i * 0.055 }); }); },
    clear: () => { if (!sfxOn) return; transient({ cutoff: 3600, dur: 0.04, peak: 0.16 }); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.18, delay: i * 0.07 })); },
    upgrade: () => { if (!sfxOn) return; transient({ cutoff: 3200, dur: 0.04, peak: 0.15 }); [523.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.4, peak: 0.18, delay: i * 0.08 })); },
    fail: () => { if (!sfxOn) return; transient({ cutoff: 700, dur: 0.05, peak: 0.14 }); [392, 311.13, 261.63].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.2, delay: i * 0.11 })); },
    /* Streak-milestone ceremony. Deliberately NOT another pitch-shifted
       combo(): a combo climbs a major triad to celebrate being good at
       pouring, and this is the app saying "you came back every day for a
       week", which is a different claim and needs a different chord — a
       C major arpeggio, root position, resolving upward. Root-position C is
       the most widely-recognised "something completed" gesture in
       Western tonal music, which is the same reason it's the one to reach
       for when the listener may not be a musician.

       tier 1 — 7-day: C5-E5-G5, the triad, and stop. Not the full octave:
       a plain triad already says "done", and adding the top octave here
       would spend the tier-3 gesture on the first week.

       Each note keeps the transient the other arpeggios here use. The decay
       alone is soft enough that a 0.4s tone with a rounded start reads as a
       pad swell, and stacking three of them is mush rather than a
       ceremony; the transient puts the attack back so the notes stay
       separable as they roll.

       Triangle, not the sine most of the other SFX in this file use: a sine
       has no harmonic content above its fundamental, so six of them at 110ms
       spacing turn into one indistinct pitch, whereas the triangle's odd
       harmonics stay individually audible through the roll — and through
       tier 3's heavier reverb send, which is exactly where a pure sine would
       have vanished first. The waveform is deliberately identical across all
       three tiers so the escalation reads as more notes and more space, never
       as a different instrument. */
    celebrate: (tier = 1) => {
      if (!sfxOn) return;
      const STEPS = {
        1: { notes: [523.25, 659.25, 783.99], dur: 0.4, gap: 0.09, peak: 0.2 },
        /* C5-E5-G5-C6: the octave above the tier-1 triad, which is what makes
           it audibly "more" rather than just longer. A fourth note from the
           SAME scale keeps the whole run one gesture, where a different chord
           at this length would stop reading as a single arpeggio. */
        2: { notes: [523.25, 659.25, 783.99, 1046.5], dur: 0.5, gap: 0.1, peak: 0.22 },
        /* Full two octaves for the century, and the one tier that asks for
           space around it. Every tone already runs through sfxBus's 0.25
           convolver send, so tiers 1 and 2 are reverberated too and this is
           about degree, not presence: `wet` adds a second send on top (see
           tone), landing this run at roughly 0.7 of the send's full range
           against their 0.25. 0.45 rather than 1.0 because a century should
           sound bigger, not like it's in a stairwell — and because a 6-note
           run is where an over-wet mix turns to mud fastest, the top of the
           arpeggio is the first thing to disappear. */
        3: { notes: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98], dur: 0.6, gap: 0.11, peak: 0.24, wet: 0.45 },
      };
      const s = STEPS[tier];
      if (!s) return;
      s.notes.forEach((f, i) => {
        const delay = i * s.gap;
        transient({ cutoff: 3200, dur: 0.04, peak: 0.15, delay });
        tone(f, { type: "triangle", dur: s.dur, peak: s.peak, delay, wet: s.wet || 0 });
      });
    },
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

   Stops when the app is no longer frontmost. This module owns that, not
   the screens: a React screen's effect only sees navigation, so it keeps
   calling start() and leaves the bed running when the app is minimised,
   the tab is hidden, or the phone locks — with no state change anywhere
   to hang a stop() on. Two signals cover the platforms this ships to,
   both bound lazily inside start() (see bindLifecycle), and both routed
   through pause()/resume() rather than stop()/start() so that a
   backgrounded app can be resumed without a real user stop() being undone.

   The mix levels below (BASE_LEVEL/TENSE_LEVEL) are still a starting
   guess, not a verified-good balance — this can't be heard in the
   build sandbox. Retune by ear on a real device before treating them
   as settled. */
export const Music = (() => {
  let ctx = null, master = null, musicBus = null, musicOn = true;
  let padFilter = null, playing = false;
  let wantPlaying = false;   // the CALLER's intent — true from start() until stop().
                              // Deliberately left standing across pause()/resume() so a
                              // resume can tell "app was backgrounded" apart from
                              // "the user stopped the music", and only restart the former.
  let paused = false;        // true only while a lifecycle event holds us off the air
  let tension = 0;   // 0 = calm, 1 = urgent — set by setTension()
  let ducked = false;
  let buffer = null, bufferLoadPromise = null;
  let activeNodes = [];   // { node, endAt } — anything with .stop(), pending teardown
  let loopTimer = null;
  let runToken = 0;       // bumped on every teardown so a start() that's still loading
                          // when it happens can't resurrect playback afterward
  let lifecycleBound = false;
  let appStateListener = null;

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
      .catch(() => {
        /* Clear the cache on failure. Both guards above are keyed on
           buffer/bufferLoadPromise, so a promise that resolved to null
           short-circuits every later start() for the rest of the session:
           one network blip and the bed never comes back. Nulling it here
           makes the next start() re-fetch, same as the haptics loader at
           the top of this file already does. */
        bufferLoadPromise = null;
        return null;
      });
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

  /* setTimeout is wall-clock, c.currentTime is the audio clock, and the two
     drift apart every time the tab is throttled or the phone sleeps: the
     timer then fires late, leaving the absolute `nextStart` in the PAST. A
     BufferSource whose start AND stop are both in the past renders nothing
     at all, so the bed would stay silent for the rest of the run. So the
     target is re-anchored on the audio clock whenever the absolute time has
     already gone by, and the delay is always measured from that clock rather
     than from a stale reading. LEAD is the headroom that gets the next copy
     onto the audio clock before it's due, so ordinary jitter still can't
     cause a dropout. */
  const LEAD = 1;

  function queueNext(c, myToken, startedAt, dur) {
    const nextStart = startedAt + dur - CROSSFADE;
    const audibleAt = nextStart > c.currentTime ? nextStart : c.currentTime + LEAD;
    loopTimer = setTimeout(() => {
      if (!playing || myToken !== runToken) return;
      playSegment(c, audibleAt, dur);
      queueNext(c, myToken, audibleAt, dur);
    }, Math.max(0, (audibleAt - LEAD - c.currentTime) * 1000));
  }

  /* These listeners fire on the highest-frequency events in the app's life —
     every tab/app switch, focus change and page hide/show. The per-event
     console.log that used to sit in each of them was debug scaffolding left
     in from working out which signal the Android WebView actually delivers,
     and it costs a real logcat write on every one of them in the shipped
     APK. Gated rather than deleted: the diagnostic is genuinely useful if
     pause/resume ever regresses on a new WebView, and `npm run dev` is
     exactly when you'd want it. Also trimmed to the event name — the
     previous form dumped Object.keys() of the whole plugin module, which is
     a module-internals leak into a user-facing log, not a diagnostic. */
  const DEV = typeof import.meta !== "undefined" && !!import.meta.env && !!import.meta.env.DEV;
  const trace = (...a) => { if (DEV) console.log("[Music]", ...a); };

  /* Bound on the first start(), not at import. Registering at module
     scope would keep two listeners alive for the whole session including
     the ones that never play music, and on web would attach before any
     user gesture, so the very first (silent) AudioContext would be
     created from a background callback the browser is entitled to block.
     The Capacitor plugin is pulled with a dynamic import for the same
     reason the haptics loader at the top of this file does: it isn't
     installed in a browser build, and a static import would fail the
     whole module rather than just skipping the native path. */
  function bindLifecycle() {
    if (lifecycleBound) return;
    lifecycleBound = true;

    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", () => {
        trace("visibilitychange hidden=", document.hidden);
        if (document.hidden) pause(); else resume();
      });
      trace("visibilitychange bound");
    }

    /* blur/focus and pagehide/pageshow as backstops for the case
       visibilitychange misses — window losing focus is the signal an
       Android WebView gives more reliably when the app is minimised.
       All four funnel through pause()/resume(), which are both
       idempotent, so overlapping signals (pagehide AND blur on the
       same backgrounding) collapse into a single teardown. */
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("blur", () => {
        trace("blur");
        pause();
      });
      window.addEventListener("focus", () => {
        trace("focus");
        resume();
      });
      window.addEventListener("pagehide", () => {
        trace("pagehide");
        pause();
      });
      window.addEventListener("pageshow", () => {
        trace("pageshow");
        resume();
      });
    }

    import("@capacitor/app")
      .then((mod) => {
        trace("App plugin loaded");
        const App = mod && mod.App;
        if (!App || typeof App.addListener !== "function") return;
        appStateListener = App.addListener("appStateChange", ({ isActive }) => {
          trace("appStateChange isActive=", isActive);
          if (isActive) resume(); else pause();
        });
      })
      .catch((err) => {
        trace("App plugin FAILED:", err);
      });
  }

  /* Real start. Split out of start() so resume() can re-enter it without
     having to fake a user intent change, and so the "ctx unavailable"
     bail-out is reported upward (start() uses it to stay retryable the
     way it was before the split). */
  function begin() {
    if (playing) return true;
    const c = ensure();
    if (!c) return false;
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
    return true;
  }

  function start() {
    if (wantPlaying) return;
    wantPlaying = true;
    paused = false;
    /* The lifecycle listeners (visibilitychange, blur/focus, pagehide/
       pageshow and the Capacitor appStateChange) are bound HERE, on the
       first start() — not at import, see bindLifecycle's own note. This
       call was simply missing: bindLifecycle was defined and then never
       invoked from anywhere in the module, so not one listener ever
       attached and the entire music-lifecycle fix was inert — the bed
       kept playing after the app was minimised, tab hidden or the phone
       locked. Bound only once a start() actually got off the ground, so
       a first start() that bails on a missing AudioContext doesn't pay
       for listeners it has no use for. bindLifecycle's own
       lifecycleBound guard makes repeat starts a no-op. */
    if (!begin()) wantPlaying = false;   // no AudioContext at all — stay retryable
    else bindLifecycle();
  }

  /* Real stop — shared by the user-facing stop() and by pause(), so
     "backgrounded" and "user stopped" tear the graph down identically.
     wantPlaying is what tells them apart afterwards. */
  function teardown() {
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

  function stop() {
    if (!wantPlaying) return;
    wantPlaying = false;
    paused = false;
    teardown();
  }

  /* Backgrounded / tab hidden / phone locked. wantPlaying is left alone,
     which is the whole point: a screen that started the music and then
     got torn down by the OS will still resume it, while a user who
     stopped it (or an app that never started it) is left alone —
     otherwise the next appStateChange would resurrect a bed nobody
     asked for, which is the bug in reverse. */
  function pause() {
    if (!wantPlaying || paused) return;
    paused = true;
    teardown();
  }

  function resume() {
    if (!paused || !wantPlaying) return;
    paused = false;
    begin();
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

  return { start, stop, pause, resume, setTension, duck, pulse, setEnabled };
})();
