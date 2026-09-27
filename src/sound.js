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

let hapticsPlugin = null;
let hapticsLoadAttempted = false;

async function getHapticsPlugin() {
  if (hapticsPlugin || hapticsLoadAttempted) return hapticsPlugin;
  hapticsLoadAttempted = true;
  try {
    const mod = await import("@capacitor/haptics");
    hapticsPlugin = mod.Haptics || null;
  } catch {
    hapticsPlugin = null;
  }
  return hapticsPlugin;
}

function impact(style, fallback) {
  if (!VIBE_ON) return;
  getHapticsPlugin().then((plugin) => {
    if (plugin) plugin.impact({ style }).catch(() => buzz(fallback));
    else buzz(fallback);
  }).catch(() => buzz(fallback));
}

function notification(type, fallback) {
  if (!VIBE_ON) return;
  getHapticsPlugin().then((plugin) => {
    if (plugin) plugin.notification({ type }).catch(() => buzz(fallback));
    else buzz(fallback);
  }).catch(() => buzz(fallback));
}

export const Haptic = {
  light: () => impact("LIGHT", 8),
  medium: () => impact("MEDIUM", 20),
  heavy: () => impact("HEAVY", 40),
  success: () => notification("SUCCESS", 30),
  warning: () => notification("WARNING", [10, 40, 10]),
  error: () => notification("ERROR", 60),
};

/* ─── Web Audio SFX ─── */
export const Snd = (() => {
  let ctx = null, sfxBus = null, sfxOn = true;

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

  return {
    unlock: ensure,
    pour: (n = 1) => { if (sfxOn) tone(400 + n * 80, { type: "sine", dur: 0.12, peak: 0.2, glide: 1.3 }); },
    select: () => { if (sfxOn) tone(600, { type: "sine", dur: 0.06, peak: 0.12 }); },
    bonus: () => { if (sfxOn) { tone(880, { type: "sine", dur: 0.1, peak: 0.15 }); tone(1174, { type: "sine", dur: 0.1, peak: 0.12, delay: 0.06 }); } },
    /* Combo/mega bonus tiers — same bonus moment as bonus() above, but a
       bigger combo should sound bigger too, not just add the same ping. */
    combo: () => { if (!sfxOn) return; [740, 988, 1245].forEach((f, i) => tone(f, { type: "sine", dur: 0.09, peak: 0.16, delay: i * 0.045 })); },
    mega: () => { if (!sfxOn) return; [523.25, 659.25, 880, 1318.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.14, peak: 0.2, delay: i * 0.055 })); },
    clear: () => { if (!sfxOn) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.18, delay: i * 0.07 })); },
    upgrade: () => { if (!sfxOn) return; [523.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.4, peak: 0.18, delay: i * 0.08 })); },
    fail: () => { if (!sfxOn) return; [392, 311.13, 261.63].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.2, delay: i * 0.11 })); },
    setSfx: (v) => { sfxOn = v; },
  };
})();
