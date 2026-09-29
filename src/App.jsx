import React, { useState, useCallback, useEffect, useRef } from "react";
import { T, D, MAX_HEIGHT, COLORS, BEST_KEY, ACH_KEY, ACHIEVEMENTS, RARITY, UPGRADES } from "./constants";
import {
  sumMoveBonus, getLuckyChance, getComboEvery, getMegaEvery,
  pickRandomUpgrades, isTubeSolved, canPour, pour, isSolved,
  shuffle, mulberry32, dailyKey, dateToSeed, computeStreak,
  reconcileStreakShield, isOneMoveFromSolved, updateBestStreak,
  applyAutoSort, generateLevel, findHint,
  loadDailyState, saveDailyState,
  msUntilNextDaily, formatCountdown, pickDailyUpgrades,
} from "./gameLogic";
import { S } from "./theme";
import { CSS } from "./globalStyles";
import { buildEmojiGrid, buildShareCard, nativeShareText, nativeShareImage } from "./shareCard";
import { Snd, Haptic, setVibe, Music } from "./sound";
import { initNotifications, scheduleDailyReminder, cancelDailyReminder } from "./notifications";
import Particles from "./Particles";
import Tube, { tubeDims, slotCenter, LIFT_GAP } from "./Tube";
import FlyingBalls, { planFlight } from "./FlyingBalls";
import UpgradeCard from "./UpgradeCard";
import HomeScreen from "./HomeScreen";
import AchievementsScreen from "./AchievementsScreen";
import Tutorial from "./Tutorial";
import SettingsScreen from "./screens/SettingsScreen";
import DailyBoard from "./components/DailyBoard";
import FriendCompare from "./components/FriendCompare";
import { HomeIcon, SettingsIcon, HintIcon, UndoIcon } from "./icons";












/* ═══════════ DAILY CHALLENGE — SEEDED RNG (UTC) ═══════════ */

/* UTC date key — same board for players worldwide.
   Local time use karne se timezone mismatch hota hai. */








/* ═══════════  BOARD LAYOUT  ═══════════ */

/* Tube row is capped at maxWidth 400 with a 62px tube + 12px gap, so only
   5 tubes fit per row at full size. colorCount alone caps at 7 (+2 empty
   tubes = 9 tubes by round 11), and the "Extra Tube" upgrade can push it
   well past that over a long run — with no scaling, a 3rd+ row of tubes
   ran past the board's fixed-height area and got clipped (root has
   overflow: hidden, no scroll fallback). Shrink tubes as the count grows
   so more fit per row and total board height stays in bounds. */
function tubeScaleFor(tubeCount) {
  if (tubeCount <= 7) return 1;
  if (tubeCount <= 9) return 0.86;
  if (tubeCount <= 11) return 0.74;
  if (tubeCount <= 13) return 0.64;
  return 0.56;
}

/* Keeps a full-screen page (Settings, Profile/Achievements) mounted for
   `exitMs` after its own `isOpen` flag goes false, so it has time to play
   a slide-OUT instead of just vanishing the instant the flag flips — which
   is what closing did before, since {isOpen && <Screen/>} unmounts on the
   same render the flag changes.

   Deliberately a pure observer of `isOpen`, nothing more: it doesn't call
   popNav(), doesn't know about the history/popstate stack that actually
   flips isOpen (a screen here can close via its own back arrow, the
   hardware back button, or a header X — several different call sites,
   already handled elsewhere), and doesn't change when or why isOpen
   changes. It only stretches how long the DOM node hangs around after
   that, so it's safe to bolt onto already-working nav-stack state without
   touching the logic that stack depends on. */
function useExitTransition(isOpen, exitMs = 280) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  useEffect(() => {
    if (isOpen) { setShouldRender(true); return; }
    if (!shouldRender) return;
    const t = setTimeout(() => setShouldRender(false), exitMs);
    return () => clearTimeout(t);
    /* shouldRender deliberately isn't a dependency: it's set by this same
       effect, and adding it would only cause one extra, immediately-
       no-op re-run each time (the effect would re-fire, see shouldRender
       already false, and return right away) — harmless, just unnecessary. */
  }, [isOpen, exitMs]);
  /* Returning `shouldRender || isOpen` rather than the raw state matters on
     OPEN specifically: opening from fully-closed starts from shouldRender
     still false (it only flips true once the effect above runs, a tick
     after this render commits), so the raw state alone would render as
     absent for one cycle before popping in a moment later. isOpen is
     already true by then, so OR-ing it in shows the screen on the exact
     same render as the flip — matching the old `{isOpen && <Screen/>}`
     behavior for opening — while closing/lingering/cancel-on-reopen still
     go entirely through shouldRender and are unaffected. */
  return { shouldRender: shouldRender || isOpen, closing: shouldRender && !isOpen };
}

/* A wrong move used to just nudge the board 8px sideways once — barely
   readable as a "no" versus, say, a rendering hiccup. This is a real
   decaying shake (Web Animations API, not a CSS class): several
   alternating lefts and rights of shrinking amplitude, plus a touch of
   rotation so it reads as a physical little refusal rather than a slide.
   Paired with WRONG_FLASH_KEYFRAMES, a quick red pulse over the tubes.
   Both are triggered imperatively (see the effect keyed on `shake` in
   Cascade) rather than via a CSS class, specifically so they can restart
   on every tap without remounting — and therefore without disturbing —
   the actual Tube components underneath, which carry their own live
   pour/landing state. */
const SHAKE_KEYFRAMES = [
  { transform: "translateX(0) rotate(0deg)" },
  { transform: "translateX(-11px) rotate(-1.1deg)" },
  { transform: "translateX(9px) rotate(1deg)" },
  { transform: "translateX(-8px) rotate(-0.9deg)" },
  { transform: "translateX(6px) rotate(0.7deg)" },
  { transform: "translateX(-4px) rotate(-0.5deg)" },
  { transform: "translateX(3px) rotate(0.3deg)" },
  { transform: "translateX(-1.5px) rotate(-0.15deg)" },
  { transform: "translateX(0) rotate(0deg)" },
];
const WRONG_FLASH_KEYFRAMES = [
  { opacity: 0 },
  { opacity: 1, offset: 0.15 },
  { opacity: 0 },
];

/* ═══════════  COMPONENTS  ═══════════ */

/* The daily challenge's "next puzzle in HH:MM:SS" label, on the daily
   game-over overlay. Owns its own once-a-second tick instead of reading it
   from Cascade's state, so only this small label re-renders every second --
   not the whole app. It used to be the other way around: Cascade itself
   held the live countdown in state and ticked it for its entire lifetime,
   which meant every screen (including just sitting on Home, long before
   this label is ever mounted) paid for a full top-level re-render once a
   second, forever, for a number nothing on Home even displays. */
function DailyResetCountdown() {
  const [ms, setMs] = useState(msUntilNextDaily);
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextDaily()), 1000);
    return () => clearInterval(id);
  }, []);
  /* Last-hour urgency — loss-aversion pressure applies most right before
     the reset, not evenly all day. */
  const urgent = ms > 0 && ms < 3600000;
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 16, fontWeight: 800,
      color: urgent ? T.danger : T.gold,
      marginTop: 4,
      fontVariantNumeric: "tabular-nums",
      letterSpacing: "-0.02em",
      animation: urgent ? "dailyUrgentPulse 1000ms ease-in-out infinite" : "none",
    }}>
      {formatCountdown(ms)}
    </div>
  );
}

/* ═══════════  MAIN  ═══════════ */

export default function Cascade() {
  const [round, setRound] = useState(1);
  const [theme, setTheme] = useState("dark");   /* "dark" | "light" | "system" */
  const [stats, setStats] = useState({ gamesPlayed: 0, totalRounds: 0, totalMoves: 0, highestCombo: 0 });
  const [isDaily, setIsDaily] = useState(false);
  const [dailyState, setDailyState] = useState(null);   /* daily challenge state machine */
  const [toast, setToast] = useState(null);
  const [dailyRun, setDailyRun] = useState({ rounds: [], totalMoves: 0 });
  const [confirmDialog, setConfirmDialog] = useState(null);
  /* Today's rounds-cleared count, good across a same-day app restart —
     dailyRun resets to empty on reload (session-only React state), but
     dailyState is persisted and loadDailyState() already only returns
     it when its dateKey matches today, so falling back to dailyRun is
     just belt-and-braces for the same-session case before the very
     first setDailyState() commits. Shared by DailyBoard and
     FriendCompare so both read the exact same "today" number. */
  const todayRounds = dailyState?.rounds ?? dailyRun.rounds.length;
  const toastTimerRef = useRef(null);

  /* ═══ DAILY MODE — INITIALIZATION ═══ */

  /* Ref to avoid stale closures in level effect (before isDaily is set) */
  const isDailyRef = useRef(false);
  useEffect(() => { isDailyRef.current = isDaily; }, [isDaily]);

  /* Load persisted daily state on mount */
  useEffect(() => {
    try {
      const ds = loadDailyState();
      if (ds) setDailyState(ds);
      (async () => {
        const granted = await initNotifications();
        if (!granted) return;
        if (ds && (ds.status === "completed" || ds.status === "failed")) {
          cancelDailyReminder();
        } else {
          scheduleDailyReminder();
        }
      })();
    } catch {}
  }, []);

  /* Watches for the daily challenge's UTC-midnight rollover so dailyState
     refreshes the moment a new day's puzzle unlocks. This used to also
     store the live countdown (ms until next) in App-level state, ticking
     every second for the app's entire lifetime -- which re-rendered this
     whole component (HUD, board, every tube, every overlay) once a
     second regardless of what screen was even showing, since a top-level
     state update can't be scoped to the one small "next puzzle in..."
     label that actually displays it (and that label is only mounted at
     all on the daily game-over overlay). See DailyResetCountdown below --
     it now owns that per-second tick itself, so only it re-renders. This
     effect only needs to notice the rollover, not display it, so it
     computes ms locally without ever putting it in state. */
  useEffect(() => {
    const tick = () => {
      if (msUntilNextDaily() <= 1000) {
        try {
          const fresh = loadDailyState();
          setDailyState(fresh);
        } catch {}
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const [screen, setScreen] = useState("home");   // "home" | "game"
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [dailyResults, setDailyResults] = useState({});
  const [shieldedDates, setShieldedDates] = useState([]);
  const [runUpgrades, setRunUpgrades] = useState([]);
  const [pendingUpgrades, setPendingUpgrades] = useState([]);
  /* True when a Jackpot roll just missed but landed close — surfaced on the
     upgrade-choice screen instead of silently discarded (research: seeing a
     near-miss is part of what keeps variable-reward systems compelling). */
  const [jackpotNearMiss, setJackpotNearMiss] = useState(false);
  /* True once this round has needed at least one retry — read (and reset)
     when the NEXT round's level is generated, so that round steps back down
     in difficulty instead of continuing to climb ("hills, not stairs"). */
  const [retriedThisRound, setRetriedThisRound] = useState(false);
  const [level, setLevel] = useState(() => generateLevel(1, [], 0));
  const [tubes, setTubes] = useState(level.tubes);
  const [moves, setMoves] = useState(0);
  const [bonusMoves, setBonusMoves] = useState(0);
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("playing");
  const [comboCount, setComboCount] = useState(0);
  const [undoLeft, setUndoLeft] = useState(2);
  /* Whole-RUN undo tracking for the "Purist" achievement (no_undo_5),
     separate from undoLeft — undoLeft is a per-ROUND allowance (reset
     to 2 every round by the level-change effect below), so it can
     only ever tell you "did this round use undo", never "did any
     round in this run". See unlockAch("no_undo_5") below for why that
     distinction matters. Reset at every run-start point (restartRun,
     the daily branch of startNewGame), not on every round. */
  const [undoUsedThisRun, setUndoUsedThisRun] = useState(false);
  /* Full snapshot of the board before each pour. Undo pops the latest one.
     Only the tubes need saving — moves / bonus / combo all revert together
     with the snapshot so the counter stays honest. */
  const [snapshots, setSnapshots] = useState([]);
  const [hintLeft, setHintLeft] = useState(2);
  const [hint, setHint] = useState(null);
  /* A wrong-move counter, not a boolean: it only ever counts up, and every
     new value re-fires the shake+flash effect below even if the previous
     one hasn't visually finished (Element.animate() starts a fresh,
     independent animation on each call — it doesn't need to reset back to
     0 between taps the way the old CSS-transform version did). */
  const [shake, setShake] = useState(0);
  const tubesRowRef = useRef(null);
  const wrongFlashRef = useRef(null);
  /* Pour visuals (see FlyingBalls.jsx / Tube.jsx): balls currently in the
     air, and the most recent pour's landing schedule for its target tube
     so the real balls there stay hidden until their flight touches down.
     Both are purely presentational — game state (tubes) updates on tap. */
  const [flights, setFlights] = useState([]);
  const [landing, setLanding] = useState(null);
  const removeFlight = useCallback((id) => setFlights((f) => f.filter((x) => x.id !== id)), []);
  /* Set the moment a pour decides the round (board solved, or out of
     moves). The results overlay now waits for the last ball to land, and
     until this existed the board stayed fully interactive for that whole
     wait: on a solved board you could still pour a ball out of a finished
     tube into an empty one, and at 0 moves a second tap queued a second
     game-over (double fail sound, daily state saved twice). Every input
     path checks it; the level effect clears it for the next round. */
  const roundDecidedRef = useRef(false);
  const [lastRoundMovesLeft, setLastRoundMovesLeft] = useState(0);
  /* Shown only on the game-over overlay. Distinct from lastRoundMovesLeft
     (which is the moves left when the last round was *cleared* and feeds
     Perfect Clear). On a loss, "moves left" was still reporting the number
     from the previous clear — three or four — when the real value is 0. */
  const [finalMovesLeft, setFinalMovesLeft] = useState(0);
  /* Also shown only on the game-over overlay — the number the big
     "ROUNDS SURVIVED" display actually renders, counted up from 0 rather
     than just snapping to `round`. See the count-up effect below. */
  const [gameOverDisplayRound, setGameOverDisplayRound] = useState(0);
  const [nearMiss, setNearMiss] = useState(false);
  const [bestStreak, setBestStreak] = useState(0);
  const [particles, setParticles] = useState([]);
  const [bonusPops, setBonusPops] = useState([]);
  const [best, setBest] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [achToast, setAchToast] = useState(null);
  const [shareImage, setShareImage] = useState(null);
  const [shared, setShared] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(true); // default true = don't flash
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  /* Purely visual — see useExitTransition's own comment. showSettings/
     showAchievements above stay the single source of truth for the
     nav-stack; these two just decide how long the screen stays mounted
     after that flag goes false, so it can slide out instead of vanishing. */
  const settingsExit = useExitTransition(showSettings);
  const achievementsExit = useExitTransition(showAchievements);
  const [soundOn, setSoundOn] = useState(true);
  const [vibeOn, setVibeOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [colorBlindOn, setColorBlindOn] = useState(false);
  const [reduceMotionOn, setReduceMotionOn] = useState(false);
  /* The phone's own reduce-motion setting, kept live. Combined with the
     in-app toggle into ONE value below, so every part of the game reads the
     same answer instead of each spot re-querying matchMedia on its own. */
  const [osReduceMotion, setOsReduceMotion] = useState(() => {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
  });
  const reduceMotion = reduceMotionOn || osReduceMotion;
  /* Read by event handlers/effects that must not re-fire just because the
     setting changed (e.g. the wrong-move shake replaying on toggle). */
  const reduceMotionRef = useRef(reduceMotion);

  const movesLeft = level.moveLimit + bonusMoves - moves;

  // Load best from localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem(BEST_KEY);
      if (v) setBest(parseInt(v, 10) || 0);
      const s = localStorage.getItem("cascade:soundOn");
      if (s === "0") { setSoundOn(false); Snd.setSfx(false); }
      const vb = localStorage.getItem("cascade:vibeOn");
      if (vb === "0") { setVibeOn(false); }
      const mu = localStorage.getItem("cascade:musicOn");
      if (mu === "0") { setMusicOn(false); Music.setEnabled(false); }
      const cb = localStorage.getItem("cascade:colorBlind");
      if (cb === "1") { setColorBlindOn(true); }
      const rm = localStorage.getItem("cascade:reduceMotion");
      if (rm === "1") { setReduceMotionOn(true); }
      /* Tutorial has its own key so it never shows twice — even if the player
         never loses (so best stays 0), and even across app reinstalls. */
      const t = localStorage.getItem("cascade:tutorialSeen");
      try {
        const a = localStorage.getItem(ACH_KEY);
        if (a) setAchievements(JSON.parse(a));
      } catch {}
      try {
        const dr = localStorage.getItem("cascade:dailyResults");
        const parsedDr = dr ? JSON.parse(dr) : {};
        if (dr) setDailyResults(parsedDr);
        setShieldedDates(reconcileStreakShield(parsedDr));
      } catch {}
      try {
        if (localStorage.getItem("cascade:hasPlayedOnce") === "1") setHasPlayedOnce(true);
      } catch {}
      try {
        const raw = localStorage.getItem("cascade:stats");
        if (raw) {
          const p = JSON.parse(raw);
          setStats({
            gamesPlayed: Number(p.gamesPlayed) || 0,
            totalRounds: Number(p.totalRounds) || 0,
            totalMoves: Number(p.totalMoves) || 0,
            highestCombo: Number(p.highestCombo) || 0,
          });
        }
      } catch {}
      if (t === "1") setTutorialSeen(true);
      else {
        setTutorialSeen(false);
        const timer = setTimeout(() => setShowTutorial(true), 700);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  useEffect(() => { setVibe(vibeOn); }, [vibeOn]);
  useEffect(() => { Music.setEnabled(musicOn); }, [musicOn]);

  useEffect(() => {
    if (screen === "game") Music.start(); else Music.stop();
  }, [screen]);

  useEffect(() => { Music.setTension(movesLeft <= 3); }, [movesLeft]);

  useEffect(() => { Music.duck(phase !== "playing"); }, [phase]);

  useEffect(() => {
    let mq;
    try { mq = window.matchMedia("(prefers-reduced-motion: reduce)"); } catch { return undefined; }
    const onChange = () => setOsReduceMotion(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);

  /* The single sync point: CSS (globalStyles.js, via the attribute) and JS
     (via the ref) always see the same Reduce Motion value. */
  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
    document.documentElement.setAttribute("data-reduce-motion", reduceMotion ? "1" : "0");
  }, [reduceMotion]);

  /* Counts the game-over screen's big round number up from 0 instead of
     it just appearing — the single most-looked-at number in the game
     (it's the result of the whole run) deserves more than a static
     paint. Keyed on `phase` so it replays fresh every time a NEW run
     ends, not just once; holds its last value the rest of the time,
     which is harmless since it's only ever rendered while phase is
     actually "gameover". Skips straight to the final value under
     Reduce Motion — OS-level or the in-app toggle — same as the
     tutorial card's exit animation. */
  useEffect(() => {
    if (phase !== "gameover") return;
    if (reduceMotionRef.current) { setGameOverDisplayRound(round); return; }
    setGameOverDisplayRound(0);
    const target = round;
    const duration = 700;
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic — decelerates into the final number
      setGameOverDisplayRound(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, round]);

  /* ═══ THEME ═══ */

  /* On mount: read saved theme from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cascade:theme");
      if (saved === "dark" || saved === "light" || saved === "system") {
        setTheme(saved);
      }
    } catch {}
  }, []);

  /* Sync theme to <html data-theme="..."> attribute.
     System mode resolves via prefers-color-scheme media query. */
  useEffect(() => {
    const root = document.documentElement;
    let effective = theme;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      effective = prefersDark ? "dark" : "light";
    }
    root.setAttribute("data-theme", effective);

    /* Persist choice */
    try { localStorage.setItem("cascade:theme", theme); } catch {}
  }, [theme]);

  /* Listen for system theme changes when in "system" mode */
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  /* ═══ STATS HELPERS ═══ */
  const recordStats = useCallback((updater) => {
    setStats((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      try { localStorage.setItem("cascade:stats", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const recordGameStart = useCallback(() => recordStats((p) => ({ ...p, gamesPlayed: p.gamesPlayed + 1 })), [recordStats]);

  const showToast = useCallback((config) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(config);
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => t ? { ...t, exiting: true } : null);
      toastTimerRef.current = setTimeout(() => setToast(null), 240);
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);
  const recordRound = useCallback(() => recordStats((p) => ({ ...p, totalRounds: p.totalRounds + 1 })), [recordStats]);
  const recordMoves = useCallback((n) => recordStats((p) => ({ ...p, totalMoves: p.totalMoves + n })), [recordStats]);
  const recordCombo = useCallback((c) => recordStats((p) => c > p.highestCombo ? { ...p, highestCombo: c } : p), [recordStats]);

  useEffect(() => {
    setTubes(level.tubes.map((t) => [...t]));
    setMoves(0);
    setBonusMoves(0);
    setSelected(null);
    setComboCount(0);
    /* Daily = no undo, no hint (pure skill) */
    const daily = isDailyRef.current;
    setUndoLeft(daily ? 0 : 2);
    setSnapshots([]);
    setHintLeft(daily ? 0 : 2);
    setHint(null);
    setFlights([]);
    setLanding(null);
    roundDecidedRef.current = false;
    setPhase("playing");
  }, [level]);

  useEffect(() => {
    if (!shake) return; // 0 is the initial value, not a real wrong move
    const reduceMotion = reduceMotionRef.current;
    const row = tubesRowRef.current, flashEl = wrongFlashRef.current;
    try {
      if (!reduceMotion && row && typeof row.animate === "function") {
        row.animate(SHAKE_KEYFRAMES, { duration: 420, easing: "ease-in-out" });
      }
      /* The flash stays even under Reduce Motion — it's a plain opacity
         fade with nothing sliding or shaking, and with the shake itself
         skipped it becomes the only visual "that didn't work" signal
         besides the warning haptic. */
      if (flashEl && typeof flashEl.animate === "function") {
        flashEl.animate(WRONG_FLASH_KEYFRAMES, { duration: reduceMotion ? 220 : 420, easing: "ease-out" });
      }
    } catch {}
  }, [shake]);

  /* achToast shows one achievement at a time, but unlockAch can be called
     several times in the same synchronous tick — e.g. clearing round 10
     on a 10x combo fires both round_10 and combo_10 together, and a
     10th upgrade that's also Legendary fires upgrades_10 and legendary
     together. Two setAchToast(meta) calls in one tick used to just
     overwrite each other (React never paints the first one — only the
     last value survives the batch), and the bare `setTimeout(() =>
     setAchToast(null), 2600)` had no idea whether the toast it was
     about to clear was even still the one it was scheduled for, so it
     could also cut a newer toast's display short. Net effect: whenever
     a player was good enough to earn two unlocks at once — arguably the
     moment most worth celebrating — they'd reliably see only one toast,
     or a truncated one. A small queue instead shows every unlock, each
     for its own full 2600ms, in the order they were earned. */
  const achToastQueueRef = useRef([]);
  const achToastTimerRef = useRef(null);

  const showNextAchToast = useCallback(() => {
    const next = achToastQueueRef.current.shift();
    setAchToast(next || null);
    achToastTimerRef.current = next ? setTimeout(showNextAchToast, 2600) : null;
  }, []);

  const unlockAch = useCallback((id) => {
    /* Read from localStorage first — early return prevents repeat toasts */
    let current = [];
    try { current = JSON.parse(localStorage.getItem(ACH_KEY) || "[]"); } catch {}
    if (current.includes(id)) return;

    const next = [...current, id];
    try { localStorage.setItem(ACH_KEY, JSON.stringify(next)); } catch {}
    setAchievements(next);

    const meta = ACHIEVEMENTS.find((a) => a.id === id);
    if (meta) {
      achToastQueueRef.current.push(meta);
      if (!achToastTimerRef.current) showNextAchToast();
    }
  }, [showNextAchToast]);

  /* Streak milestones — same unlock/toast path as any other achievement.
     Re-checked whenever dailyResults or shieldedDates changes (i.e. right
     after completing today's daily, or once on load); unlockAch's own
     localStorage check makes repeat calls at the same streak a no-op. */
  useEffect(() => {
    const streak = computeStreak(dailyResults, shieldedDates);
    setBestStreak(updateBestStreak(streak));
    if (streak >= 7) unlockAch("streak_7");
    if (streak >= 30) unlockAch("streak_30");
    if (streak >= 100) unlockAch("streak_100");
  }, [dailyResults, shieldedDates, unlockAch]);

  const spawnParticles = useCallback((x, y, color, count = 6) => {
    const id = Date.now() + Math.random();
    const seed = Math.random() * Math.PI;
    setParticles((p) => [...p, { id, x, y, color, seed, count }]);
    setTimeout(() => setParticles((p) => p.filter((q) => q.id !== id)), 600);
  }, []);

  const attemptPour = useCallback((fromIdx, toIdx, e) => {
    if (roundDecidedRef.current) return;
    if (canPour(tubes, fromIdx, toIdx)) {
      /* Snapshot BEFORE the pour lands, so undo has something to restore. */
      setSnapshots((s) => [...s, { tubes: tubes.map((t) => [...t]), moves, bonusMoves, comboCount }]);
      const beforeLen = tubes[toIdx].length;
      const next = pour(tubes, fromIdx, toIdx);
      const movedCount = next[toIdx].length - beforeLen;
      /* canPour only ever allows two shapes of legal pour: onto a matching
         color (beforeLen > 0 — this always consolidates two runs into one,
         real progress) or into a tube that was completely empty (beforeLen
         === 0 — nothing to merge with, just a relocation). The combo used
         to count both the same, which meant shuttling one ball between two
         tubes it's emptying and re-emptying — always "pouring into empty"
         in both directions — built combo for free, and with a comboEvery/
         megaEvery upgrade equipped, farmed unlimited bonus moves the exact
         same way. Only a meaningful (consolidating) pour extends the
         streak now; a parking move into an empty tube is still a fine,
         sometimes-necessary play, it just doesn't build or pay out combo. */
      const meaningful = beforeLen > 0;
      const newCombo = meaningful ? comboCount + 1 : comboCount;

      /* ── Pour visuals ──
         Measured from the DOM BEFORE setTubes, while the source balls are
         still on screen in their lifted positions. Each moved ball gets a
         flight from where it is right now to its landing slot; the target
         tube is told when each will land, so it can keep them hidden till
         then. Top ball of the run leaves first and fills the lowest free
         slot, the next follows 85ms behind — a little cascade.
         Reduce Motion runs this exact same path (it used to skip flights
         and teleport the balls, which is what read as choppy) — just
         faster: every flight, stagger and landing is scaled by timeScale.
         Same keyframes, same landing sync, same sound timing. */
      const reduceMotion = reduceMotionRef.current;
      const timeScale = reduceMotion ? 0.6 : 1;
      const t0 = performance.now();
      const scale = tubeScaleFor(tubes.length);
      const colorIdx = tubes[fromIdx][tubes[fromIdx].length - 1];
      const srcEl = document.querySelector(`[data-tube-idx="${fromIdx}"]`);
      const dstEl = (e && e.currentTarget) || document.querySelector(`[data-tube-idx="${toIdx}"]`);
      const dstRect = dstEl ? dstEl.getBoundingClientRect() : null;
      /* Where (and how many ms from now) the LAST moved ball comes to rest —
         the particle burst, and the round-end overlay, key off this. */
      const impact = dstRect ? slotCenter(dstRect, beforeLen + movedCount - 1, scale) : null;
      let impactMs = 0;
      if (srcEl && dstRect) {
        const srcBalls = srcEl.querySelectorAll(".cascade-ball"); // DOM order = bottom → top
        const rimY = dstRect.top - LIFT_GAP - tubeDims(scale).ballH / 2;
        const newFlights = [];
        const lands = [];
        for (let k = 0; k < movedCount; k++) {
          const ballEl = srcBalls[tubes[fromIdx].length - 1 - k];
          if (!ballEl) break;
          const r = ballEl.getBoundingClientRect();
          const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
          const { x: x1, y: y1 } = slotCenter(dstRect, beforeLen + k, scale);
          const { arcMs, dropMs, topY, v0 } = planFlight(x0, y0, x1, rimY, y1);
          const delay = Math.round(k * 85 * timeScale);
          const flightMs = (arcMs + dropMs) * timeScale;
          newFlights.push({ id: `${t0}-${fromIdx}-${k}`, t0, delay, timeScale, x0, y0, x1, rimY, y1, topY, v0, arcMs, dropMs, colorIdx, scale, colorBlind: colorBlindOn });
          lands.push(t0 + delay + flightMs);
          /* the landing "tock", on the audio clock, at this ball's touchdown */
          Snd.land(beforeLen + k, (delay + flightMs) / 1000);
        }
        if (lands.length === movedCount) {
          setFlights((f) => [...f, ...newFlights]);
          setLanding({ tube: toIdx, from: beforeLen, lands });
          impactMs = Math.round(lands[lands.length - 1] - t0);
        }
      } else {
        Snd.land(beforeLen + movedCount - 1, 0);
      }

      setTubes(next);
      setSelected(null);
      Snd.pour(movedCount);
      if (!hasPlayedOnce) {
        setHasPlayedOnce(true);
        try { localStorage.setItem("cascade:hasPlayedOnce", "1"); } catch {}
      }
      Haptic.light();

      // Bonus + combo tier — computed before the particle burst below so a
      // bigger combo can make that same burst bigger, not just score more.
      // tier: 0 = plain pour, 1 = lucky roll, 2 = combo bonus, 3 = mega bonus.
      let bonus = 0, tier = 0;
      const luckyChance = getLuckyChance(runUpgrades);
      if (luckyChance > 0 && Math.random() < luckyChance) { bonus += 1; tier = Math.max(tier, 1); }
      /* Gated on `meaningful`, not just checked against newCombo: a parking
         move leaves newCombo unchanged, and if that unchanged value already
         happened to be a multiple of comboEvery/megaEvery (from the pour
         that actually earned it), re-running the modulo check on every
         later no-op pour would hand out the same bonus again and again for
         free — the exact free-moves exploit this whole change closes. */
      const comboEvery = getComboEvery(runUpgrades);
      if (meaningful && comboEvery && newCombo % comboEvery === 0) { bonus += 1; tier = Math.max(tier, 2); }
      const megaEvery = getMegaEvery(runUpgrades);
      if (meaningful && megaEvery && newCombo % megaEvery === 0) { bonus += 2; tier = Math.max(tier, 3); }

      // Particle burst where the last ball actually comes to rest, at the
      // moment it does — it used to fire from the tube's geometric center
      // on the tap itself, i.e. mid-air and before anything had arrived.
      // On a fresh tube-solve, the checkmark glow still gets a ~120ms beat
      // to register first (a brief "hold frame" makes a win land as a
      // win). A combo/mega-tier pour gets a bigger burst, so it reads as a
      // bigger moment, not just a bigger score.
      if (impact) {
        const color = COLORS[colorIdx] || T.accent;
        const fullBurst = tier >= 3 ? 16 : tier >= 2 ? 10 : 6;
        /* Calm mode: same burst, fewer pieces flying outward. */
        const burstCount = reduceMotion ? Math.ceil(fullBurst / 2) : fullBurst;
        const destJustSolved = isTubeSolved(next[toIdx]) && !isTubeSolved(tubes[toIdx]);
        const burstAt = impactMs + (destJustSolved ? 120 : 0);
        const { x: px, y: py } = impact;
        if (burstAt > 0) setTimeout(() => spawnParticles(px, py, color, burstCount), burstAt);
        else spawnParticles(px, py, color, burstCount);
      }

      setComboCount(newCombo);
      const newMovesUsed = moves + 1;
      recordMoves(1);
      recordCombo(newCombo);
      const newBonus = bonusMoves + bonus;
      setMoves(newMovesUsed);
      if (bonus > 0) {
        setBonusMoves(newBonus);
        setTimeout(() => {
          if (tier >= 3) { Snd.mega(); Haptic.heavy(); Music.pulse("mega"); }
          else if (tier >= 2) { Snd.combo(); Haptic.medium(); Music.pulse("combo"); }
          else Snd.bonus();
        }, 120);
        /* Fire a floating "+N" so the player can actually see the bonus
           they just earned — before this the extra moves were invisible
           and the only signal was the sound. */
        const id = Date.now() + Math.random();
        setBonusPops((p) => [...p, { id, text: `+${bonus}` }]);
        setTimeout(() => setBonusPops((p) => p.filter((q) => q.id !== id)), 900);
      }

      const newMovesLeft = level.moveLimit + newBonus - newMovesUsed;

      if (isSolved(next)) {
        roundDecidedRef.current = true;
        const remainingAtClear = newMovesLeft;
        recordRound();
        /* Daily round clear — increment streak. dailyState.status is
           deliberately NOT touched here. It used to be force-set to
           "completed" on every round clear, which finalized "today's
           attempt" the instant round 1 cleared — even though the run
           keeps going right after (upgrade pick → round 2 → ...). A
           player who cleared round 1 and then simply backed out to Home
           (without ever failing) came back to a dailyState stuck at
           status:"completed", and startNewGame's replay guard below
           treated that as "today is over," permanently blocking any
           further attempt for the rest of the day — after doing nothing
           wrong, just glancing away. The only real end state for this
           endless run is failure (see the "One attempt only" copy on the
           true game-over screen), so dailyState stays "in_progress"
           through every round clear and only becomes terminal in the
           newMovesLeft <= 0 branch below. */
        if (isDaily) {
          if (round > best) {
            setBest(round);
            try { localStorage.setItem(BEST_KEY, String(round)); } catch {}
          }
          setDailyRun((prev) => ({
            rounds: [...prev.rounds, { round, moves: newMovesUsed, moveLimit: level.moveLimit }],
            totalMoves: prev.totalMoves + newMovesUsed,
          }));
          /* Save streak day — a deliberately low bar (clearing just round 1
             keeps the streak alive), separate from whether the run itself
             is still going. See computeStreak in gameLogic.js. */
          try {
            const dr = JSON.parse(localStorage.getItem("cascade:dailyResults") || "{}");
            if (!dr[dailyKey()]) {
              dr[dailyKey()] = { completed: true, ts: Date.now() };
              localStorage.setItem("cascade:dailyResults", JSON.stringify(dr));
              setDailyResults(dr);
            }
          } catch {}
        }
        /* Schedule the round transition FIRST — an achievement hiccup
           must never block the player from advancing to the upgrade. */
        /* Daily challenge — save completion when round 1 clears.
           Guard: idempotent, StrictMode double-fire safe. */
        if (isDaily && round === 1) {
          const k = dailyKey();
          setDailyResults((prev) => {
            if (prev[k]) return prev;
            const updated = { ...prev, [k]: { completed: true, ts: Date.now() } };
            try { localStorage.setItem("cascade:dailyResults", JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
        setTimeout(() => {
          setLastRoundMovesLeft(remainingAtClear);
          /* Daily upgrade choices must be identical for every player too —
             pickRandomUpgrades() alone used Math.random even in daily mode,
             so two players clearing the same round saw different 3 cards. */
          if (isDaily) {
            setPendingUpgrades(pickDailyUpgrades(dateToSeed() + round + 1));
            setJackpotNearMiss(false);
          } else {
            const { upgrades, jackpotNearMiss } = pickRandomUpgrades(3);
            setPendingUpgrades(upgrades);
            setJackpotNearMiss(jackpotNearMiss);
          }
          setPhase("upgrade");
          Snd.clear();
          Haptic.success();
          Music.pulse("clear");
          /* Was a flat 250ms after the tap. The winning ball is now still in
             the air at that point, so the card would have covered the one
             pour that matters most. Waits for it to land, then holds ~450ms
             on the finished board — long enough for the last tube's
             checkmark and burst to register as the win — before the reward. */
        }, Math.max(250, impactMs + 450));
        /* Achievement triggers — fired after the transition is queued */
        unlockAch("first_clear");
        if (round + 1 >= 10) unlockAch("round_10");
        if (round + 1 >= 25) unlockAch("round_25");
        if (round + 1 >= 50) unlockAch("round_50");
        if (newCombo >= 10) unlockAch("combo_10");
        /* undoUsedThisRun, not undoLeft === 2 — undoLeft resets to 2
           every round (see the level-change effect above), so it only
           ever reflects THIS round's usage. Checking undoLeft here
           used to let "Clear 5 rounds without undo" fire for a run
           that undid freely in rounds 1-4 and simply happened not to
           in round 5 — the achievement's own name and description say
           the whole run, not just the round it unlocks on. Daily runs
           start at undoLeft=0 and can't use undo at all, so they're
           correctly excluded rather than trivially qualifying. */
        if (!isDaily && !undoUsedThisRun && round >= 5) unlockAch("no_undo_5");
      } else if (newMovesLeft <= 0) {
        roundDecidedRef.current = true;
        setNearMiss(isOneMoveFromSolved(next));
        setTimeout(() => {
          // Save best if this is a new best
          if (round > best) {
            setBest(round);
            try { localStorage.setItem(BEST_KEY, String(round)); } catch {}
          }

          setFinalMovesLeft(Math.max(0, newMovesLeft));

          /* Daily failure — mark state */
          if (isDaily) {
            const st = saveDailyState({
              status: "failed",
              failedAt: Date.now(),
              movesUsed: newMovesUsed,
              rounds: Math.max(0, round - 1),
            });
            setDailyState(st);
            cancelDailyReminder();
          }

          setPhase("gameover");
          Snd.fail();
          Haptic.error();
          /* same reasoning as the round-clear timer: let the final ball land
             and settle before the results card covers the board */
        }, Math.max(250, impactMs + 300));
      }
    } else {
      setShake((s) => s + 1);
      Haptic.warning();
      setSelected(null);
      setComboCount(0);
    }
  }, [tubes, moves, bonusMoves, comboCount, level, runUpgrades, round, best, spawnParticles, unlockAch, isDaily, dailyResults, hasPlayedOnce, recordRound, recordMoves, recordCombo, dailyState, undoLeft, undoUsedThisRun, colorBlindOn]);

  const onTubeClick = useCallback((idx, e) => {
    if (phase !== "playing" || roundDecidedRef.current) return;
    Snd.unlock();
    if (selected === null) {
      if (tubes[idx].length === 0) return;
      Snd.select();
      setSelected(idx);
      return;
    }
    if (selected === idx) { setSelected(null); return; }
    attemptPour(selected, idx, e);
  }, [phase, selected, tubes, attemptPour]);

  const DRAG_THRESHOLD = 10;
  const dragSourceRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const onTubePointerDown = useCallback((idx, e) => {
    if (phase !== "playing" || roundDecidedRef.current) return;
    if (tubes[idx].length === 0) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragSourceRef.current = idx;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = false;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }, [phase, tubes]);

  const onTubePointerMove = useCallback((e) => {
    if (dragSourceRef.current === null || draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      draggingRef.current = true;
      Snd.select();
      setSelected(dragSourceRef.current);
    }
  }, []);

  const onTubePointerUp = useCallback((e) => {
    const source = dragSourceRef.current;
    const wasDragging = draggingRef.current;
    dragSourceRef.current = null;
    draggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (!wasDragging || source === null) return;
    if (phase !== "playing") { setSelected(null); return; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const targetEl = el && el.closest ? el.closest("[data-tube-idx]") : null;
    const targetIdx = targetEl ? parseInt(targetEl.dataset.tubeIdx, 10) : NaN;
    if (Number.isNaN(targetIdx) || targetIdx === source) { setSelected(null); return; }
    attemptPour(source, targetIdx, { currentTarget: targetEl });
  }, [phase, attemptPour]);

  const onTubePointerCancel = useCallback((e) => {
    dragSourceRef.current = null;
    draggingRef.current = false;
    setSelected(null);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  }, []);

  const useHint = useCallback(() => {
    if (hintLeft <= 0) return;
    if (phase !== "playing" || roundDecidedRef.current) return;
    /* findHint (gameLogic.js) picks a move it can confirm keeps the board
       winnable, not just any legal move — see its own comment for why
       that distinction matters. */
    const move = findHint(tubes);
    if (!move) return;
    setHint({ from: move.from, to: move.to, key: Date.now() });
    setHintLeft((h) => h - 1);
    Snd.select();
    Haptic.light();
    setTimeout(() => setHint(null), 1600);
  }, [hintLeft, phase, tubes]);

  const undo = useCallback(() => {
    if (undoLeft <= 0) return;
    if (snapshots.length === 0) return;
    if (phase !== "playing" || roundDecidedRef.current) return;
    const last = snapshots[snapshots.length - 1];
    setSnapshots((s) => s.slice(0, -1));
    setTubes(last.tubes);
    /* Drop anything still in the air — those balls are being put back —
       and forget the last landing schedule so restored balls get a normal
       drop-in, not a leftover landing delay. */
    setFlights([]);
    setLanding(null);
    setMoves(last.moves);
    setBonusMoves(last.bonusMoves);
    /* last.comboCount, not last.combo — the snapshot (a few lines up,
       where it's pushed) stores the field as `comboCount`; there's no
       `combo` field on it, so this was reading undefined every time.
       setComboCount(undefined) doesn't just drop the combo badge for
       this round — the NEXT pour computes newCombo = comboCount + 1,
       and undefined + 1 is NaN, which then propagates pour after pour
       (NaN + 1 is still NaN). Every NaN % x === 0 and NaN >= n check
       is false, so any run using combo2/combo3/mega upgrades silently
       stopped paying out their bonus moves for the rest of that round
       after a single Undo — no error, the combo badge just quietly
       never reappears until the round ends and chooseUpgrade's own
       setComboCount(0) resets it. */
    setComboCount(last.comboCount);
    setSelected(null);
    setUndoLeft((u) => u - 1);
    setUndoUsedThisRun(true);
    Snd.select();
    Haptic.light();
  }, [undoLeft, snapshots, phase]);

  const chooseUpgrade = useCallback((upgrade) => {
    /* Guard against a double-tap racing through two upgrade cards before
       the overlay unmounts. pendingUpgrades is cleared the instant the
       first pick lands, so the second tap can never fire. */
    if (pendingUpgrades.length === 0) return;
    const newUpgrades = [...runUpgrades, upgrade.id];
    setRunUpgrades(newUpgrades);
    /* >= 4, not === 4: Jackpot (rarity 5) is rarer and strictly better
       than Legendary, so it should qualify for "take a Legendary
       upgrade" too — a strict equality check meant the single best
       possible pull in the game was the one pull that DIDN'T count. */
    if (upgrade.rarity >= 4) unlockAch("legendary");
    if (newUpgrades.length >= 10) unlockAch("upgrades_10");
    /* Reset the combo indicator here as well as in the level effect — the
       effect runs a tick later, and for that one frame the old combo badge
       would still be on screen while the new board was being built. */
    setComboCount(0);
    setPendingUpgrades([]);
    setJackpotNearMiss(false);
    const nextRound = round + 1;
    setRound(nextRound);
    /* Daily boards must be identical for every player on a given date.
       Without a per-round seed here, only round 1 was deterministic —
       round 2 onward silently fell back to Math.random, so "today's
       daily challenge" was actually a different board for everyone
       past the first round. */
    const nextSeed = isDaily ? dateToSeed() + nextRound : null;
    setLevel(generateLevel(nextRound, newUpgrades, lastRoundMovesLeft, nextSeed, retriedThisRound));
    setRetriedThisRound(false);
    Snd.upgrade();
    Music.pulse("upgrade");
  }, [round, runUpgrades, lastRoundMovesLeft, pendingUpgrades, isDaily, retriedThisRound]);

  const retry = useCallback(() => {
    const seed = isDaily ? dateToSeed() + round : null;
    setLevel(generateLevel(round, runUpgrades, lastRoundMovesLeft, seed));
    setRetriedThisRound(true);
  }, [round, runUpgrades, lastRoundMovesLeft, isDaily]);

  const restartRun = useCallback(() => {
    setRound(1);
    setRunUpgrades([]);
    setLastRoundMovesLeft(0);
    setShareImage(null);
    setShared(false);
    setIsDaily(false);
    setRetriedThisRound(false);
    setUndoUsedThisRun(false);
    setLevel(generateLevel(1, [], 0));
  }, []);

  /* Save best round reached so far. Called at every place the player can
     leave a run WITHOUT losing (Home button, Exit Daily Mode) — losing
     already saves it at the game-over trigger. Deliberately NOT called
     from inside restartRun() itself: Settings > Reset calls restartRun()
     right after setBest(0), and saving here would immediately undo that. */
  const saveBestRound = useCallback(() => {
    if (round > best) {
      setBest(round);
      try { localStorage.setItem(BEST_KEY, String(round)); } catch {}
    }
  }, [round, best]);

  /* Single entry point for starting a new run — increments stats safely.
     Used by Home Play, Home Daily, and Game Over "Start Over". */
  const startNewGame = useCallback((daily = false) => {
    /* Daily replay prevention — block only once today's attempt is truly
       over. dailyState (when one exists for today) is authoritative: it
       distinguishes an ongoing attempt (status "in_progress") from one
       that's actually finished (status "failed" — the only real end
       state for this endless run; see the "One attempt only" game-over
       copy). dailyResults[today] flips true as soon as round 1 clears,
       purely to credit the STREAK (a deliberately low bar) — it must
       NOT by itself be read as "today is over," or clearing round 1 and
       merely returning to Home would permanently lock the player out of
       the very attempt they're still in the middle of. So the legacy
       flag is only consulted when there's no dailyState at all for today
       (a save from before dailyState existed). */
    if (daily) {
      const fresh = loadDailyState();
      const isCompleted = fresh ? fresh.status === "completed" : !!dailyResults[dailyKey()];
      const isFailed = fresh && fresh.status === "failed";

      if (isCompleted || isFailed) {
        if (fresh) setDailyState(fresh);
        showToast({
          icon: isCompleted ? "✓" : "⚠",
          color: isCompleted ? "var(--go)" : "var(--gold)",
          title: isCompleted ? "Already Completed" : "One Attempt Used",
          message: "Come back tomorrow",
        });
        return false;
      }
    }
    recordGameStart();
    if (daily) {
      /* Round 1's seed follows the same dateToSeed() + round convention
         used in chooseUpgrade/retry, so every daily round (not just the
         first) is reproducible from date + round alone. */
      const seed = dateToSeed() + 1;
      /* Save "in_progress" state before starting */
      const st = saveDailyState({
        status: "in_progress",
        startedAt: Date.now(),
        seed,
      });
      setDailyState(st);
      /* The mount effect schedules a "Today's Cascade is waiting... play
         today's challenge" reminder for later today whenever there's no
         dailyState yet — correct at the time, since it only fires when
         the player genuinely hasn't played. But it's a one-shot decision
         made once at launch: nothing ever revisits it, so opening the app
         before playing, then actually playing (clearing rounds, still
         in_progress) and backing out without failing, left that reminder
         armed. Hours later it fires anyway, telling the player their
         streak is at risk and to go play a challenge they already
         started — the exact kind of factually-wrong push notification
         that trains people to ignore (or disable) a game's notifications.
         Cancelling it the moment they actually start covers that; the
         existing cancel on failure (below, in the moves-exhausted branch)
         still runs too, harmlessly, since a cancelled reminder can't be
         cancelled twice. */
      cancelDailyReminder();
      setIsDaily(true);
      setRound(1);
      setRunUpgrades([]);
      setLastRoundMovesLeft(0);
      setRetriedThisRound(false);
      setUndoUsedThisRun(false);
      setShareImage(null);
      setShared(false);
      setDailyRun({ rounds: [], totalMoves: 0 });
      setLevel(generateLevel(1, [], 0, seed));
    } else {
      restartRun();
    }
    setScreen("game");
    return true;
  }, [recordGameStart, restartRun, dailyResults, showToast]);

  /* ═══════════ NAVIGATION — Back button infra ═══════════
     Phase 1: only infrastructure. Nothing wired yet.
     Refs hold latest state so popstate handler never goes stale. */

  const navStateRef = useRef({ showSettings: false, showAchievements: false, screen: "home", confirmDialog: false });
  useEffect(() => {
    navStateRef.current = { showSettings, showAchievements, screen, confirmDialog: !!confirmDialog };
  }, [showSettings, showAchievements, screen, confirmDialog]);

  /* Android hardware back / edge-swipe → same logic as the browser
     popstate handler above. Capacitor WebView does NOT fire popstate on
     the system back gesture by default — the @capacitor/app backButton
     event is the only way to catch it. We translate it into the same
     "pop one layer or exit" behaviour the popstate handler already
     implements, so back means the same thing whether it came from an
     in-app arrow tap, Chrome's hardware back, or an Android edge swipe. */
  useEffect(() => {
    let listener = null;
    (async () => {
      try {
        const mod = await import("@capacitor/app");
        const CapApp = mod.App;
        if (!CapApp || !CapApp.addListener) return;
        listener = await CapApp.addListener("backButton", () => {
          const st = navStateRef.current;
          const anyLayerOpen =
            st.confirmDialog || st.showSettings || st.showAchievements || st.screen !== "home";
          if (anyLayerOpen) {
            /* Reuse the exact same history machinery: this pushes a
               popstate the existing handler will pick up and use to
               close the topmost layer. */
            try { window.history.back(); } catch {}
          } else {
            /* Nothing on top of Home → let the OS close the app, which
               matches every other Android app's back behaviour. */
            try { CapApp.exitApp(); } catch {}
          }
        });
      } catch {
        /* @capacitor/app not present (web build) — browser back already
           works via popstate there, nothing to install. */
      }
    })();
    return () => { if (listener) try { listener.remove(); } catch {} };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      try {
        /* A confirm dialog (Exit to Home?, Reset Progress?, ...) sits on top
           of everything and never pushes its own history entry. Without this
           check, hardware back while it's showing would fall straight
           through to closing whatever's underneath — silently bypassing the
           "progress will be lost" warning and skipping saveBestRound(). Back
           should just cancel the dialog, same as tapping outside it. */
        if (navStateRef.current.confirmDialog) {
          setConfirmDialog(null);
          /* Re-push to compensate for the back() we just consumed —
             otherwise history drifts one step behind the UI, and the
             next popNav() call becomes a silent no-op (screen sticks). */
          try { window.history.pushState(e.state, ""); } catch {}
          return;
        }
        const page = e.state?.page;
        /* An explicit "home" checkpoint always resets everything —
           nothing pushes one yet, kept for a future full checkpoint. */
        if (page === "home") {
          setShowSettings(false);
          setShowAchievements(false);
          setScreen("home");
          return;
        }
        /* Landed on an entry with no known page — normally the base
           entry from before anything was pushed. Close just the deepest
           thing that's actually open, one layer at a time, instead of
           assuming "home": Settings can be opened from inside an active
           game, and forcing screen back to home here would yank the
           player out of a run just for closing an overlay. */
        const st = navStateRef.current;
        if (st.showSettings) { setShowSettings(false); return; }
        if (st.showAchievements) { setShowAchievements(false); return; }

        /* Nothing else open but not on home — fires when hardware back
           pops the game entry. Go home so screen matches history. */
        if (st.screen !== "home") { setScreen("home"); return; }
        if (st.screen === "game") { setScreen("home"); return; }
      } catch (err) {
        console.warn("[CASCADE] popstate error:", err);
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  /* Safe push — Phase 2 mein buttons se call karenge */
  const pushNav = useCallback((page) => {
    try { window.history.pushState({ page }, ""); } catch (err) {
      console.warn("[CASCADE] pushState failed:", err);
    }
  }, []);

  /* Safe pop — back arrow click se call karenge */
  const popNav = useCallback(() => {
    try { window.history.back(); } catch (err) {
      console.warn("[CASCADE] history.back failed:", err);
    }
  }, []);

  const shareDaily = useCallback(async () => {
    try {
      const dr = JSON.parse(localStorage.getItem("cascade:dailyResults") || "{}");
      const streak = computeStreak(dr, shieldedDates);
      const text = buildEmojiGrid(dailyRun.rounds, dailyRun.totalMoves, streak, bestStreak);
      /* nativeShareText handles the WebView-vs-browser branching (native
         Share plugin on the APK, navigator.share on Chrome, clipboard as
         last resort) and returns a status string we can act on here. */
      const result = await nativeShareText({
        title: "Cascade Daily",
        text,
        url: "https://cascade-main-rho.vercel.app",
      });
      if (result === "copied") {
        showToast({ icon: "C", color: "var(--accent)", title: "Copied!", message: "Paste to share" });
      } else if (result === "failed") {
        showToast({ icon: "!", color: "var(--danger)", title: "Share failed", message: "Try again" });
      }
      /* "shared" and "cancelled" need no toast. */
    } catch (err) {
      console.warn("Share daily failed:", err);
    }
  }, [dailyRun, showToast, shieldedDates, bestStreak]);

  const generateShare = useCallback(() => {
    try {
      const dataUrl = buildShareCard({ round, upgrades: runUpgrades, best });
      if (dataUrl) setShareImage(dataUrl);
    } catch (e) {
      console.error("Share card failed:", e);
    }
  }, [round, runUpgrades, best]);

  const shareNow = useCallback(async () => {
    if (!shareImage) return;
    const shareText = `I survived ${round} rounds in Cascade! Can you beat me?`;
    const shareUrl = "https://cascade-main-rho.vercel.app";
    try {
      /* On real Chrome, navigator.canShare({files}) lets us hand the PNG
         straight to the OS sheet. In the APK's WebView, that API is
         disabled — so go through Capacitor Share (text + link) there
         instead of silently doing nothing. Both paths finally call
         setShared(true) so the button flips to "✓ Shared". */
      const canShareFiles =
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare &&
        (() => {
          try {
            return navigator.canShare({ files: [new File([new Uint8Array(1)], "x.png", { type: "image/png" })] });
          } catch {
            return false;
          }
        })();

      if (canShareFiles) {
        const blob = await (await fetch(shareImage)).blob();
        const file = new File([blob], "cascade-score.png", { type: "image/png" });
        await navigator.share({ files: [file], title: "Cascade", text: shareText });
        setShared(true);
      } else {
        const result = await nativeShareImage({
          dataUrl: shareImage,
          title: "Cascade",
          text: shareText,
        });
        if (result === "shared" || result === "copied") setShared(true);
      }
    } catch (e) {
      if (e && e.name !== "AbortError") console.warn("Share card failed:", e);
    }
  }, [shareImage, round]);

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* HOME — visible when screen === "home" */}
      {screen === "home" && (
        <HomeScreen
          onPlay={() => { if (startNewGame(false)) pushNav("game"); }}
          onAwards={() => { setShowAchievements(true); pushNav("awards"); }}
          onDaily={() => {
            /* pushNav only when startNewGame actually starts a run — it
               returns false when today's daily is already used up and it
               just shows a toast without changing screen. Pushing a
               "game" history entry unconditionally left a phantom entry
               on the back-stack whenever that happened: the visible
               screen stayed "home", but back-navigation now had one more
               step queued than what's on screen actually accounts for. */
            if (startNewGame(true)) pushNav("game");
          }}
          onSettings={() => { setShowSettings(true); pushNav("settings"); }}
          dailyResults={dailyResults}
          shieldedDates={shieldedDates}
          computeStreak={computeStreak}
          dailyKey={dailyKey}
          hasPlayedOnce={hasPlayedOnce}
          todayRounds={todayRounds}
        />
      )}

      {/* GAME — hidden when on home */}
      {screen === "game" && (
      <div className="screen-transition" style={S.gameRoot}>
      <Particles bursts={particles} />
      <FlyingBalls flights={flights} onDone={removeFlight} />

      {/* Achievement toast — slides down from top. Keyed on the
          achievement id so two unlocks shown back-to-back (the queue
          in unlockAch below) each get their own mount: without a key,
          this div persists across the swap from one achievement to the
          next (same position, same className, React just patches the
          text inside it), so achSlideIn never restarts for anything
          past the first toast in a queue — it would just silently
          change content mid-air with no entrance at all. */}
      {achToast && (
        <div key={achToast.id} style={{
          position: "fixed", top: 60, left: 0, right: 0,
          display: "flex", justifyContent: "center",
          pointerEvents: "none", zIndex: 200,
        }} className="achSlide">
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: T.card,
            border: `1.5px solid color-mix(in srgb, ${T.gold} 40%, transparent)`,
            borderRadius: 16,
            padding: "12px 18px",
            boxShadow: `0 12px 40px color-mix(in srgb, ${T.gold} 26.7%, transparent), 0 4px 12px rgba(0,0,0,0.4)`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `color-mix(in srgb, ${T.gold} 13.3%, transparent)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>{achToast.icon}</div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.15em", color: T.gold, textTransform: "uppercase" }}>Achievement</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: T.ink }}>{achToast.name}</div>
            </div>
          </div>
        </div>
      )}

      {!isDaily && (
      <button
        onClick={useHint}
        disabled={hintLeft <= 0 || phase !== "playing"}
        aria-label="Show hint"
        style={{
          position: "fixed", right: 16, bottom: 92,
          width: 54, height: 54, borderRadius: 18,
          background: T.card,
          border: "1.5px solid " + (hintLeft > 0 && phase === "playing" ? `color-mix(in srgb, ${T.go} 40%, transparent)` : T.line),
          color: hintLeft > 0 && phase === "playing" ? T.go : T.muted,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: hintLeft > 0 && phase === "playing" ? "pointer" : "default",
          opacity: hintLeft <= 0 || phase !== "playing" ? 0.4 : 1,
          fontFamily: "'Nunito', sans-serif",
          zIndex: 30,
        }}
      >
        <HintIcon size={20} />
        <span style={{ fontSize: 10, fontWeight: 900, marginTop: 2 }}>{hintLeft}</span>
      </button>
      )}

      {/* Undo — floats bottom-left, above the footer hint */}
      {!isDaily && (
      <button
        onClick={undo}
        disabled={undoLeft <= 0 || snapshots.length === 0 || phase !== "playing"}
        aria-label="Undo last pour"
        style={{
          position: "fixed",
          left: 16,
          bottom: 92,
          width: 54, height: 54, borderRadius: 18,
          background: T.card,
          border: `1.5px solid ${undoLeft > 0 && snapshots.length > 0 ? `color-mix(in srgb, ${T.accent} 40%, transparent)` : T.line}`,
          color: undoLeft > 0 && snapshots.length > 0 ? T.accent : T.muted,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: undoLeft > 0 && snapshots.length > 0 ? "pointer" : "default",
          boxShadow: undoLeft > 0 && snapshots.length > 0 ? `0 6px 20px color-mix(in srgb, ${T.accent} 20%, transparent)` : "none",
          opacity: undoLeft <= 0 || snapshots.length === 0 ? 0.4 : 1,
          fontFamily: "'Nunito', sans-serif",
          zIndex: 30,
          transition: "all 200ms cubic-bezier(.2,1.1,.3,1)",
        }}
      >
        <UndoIcon size={20} />
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.05em", marginTop: 2 }}>
          {undoLeft}
        </span>
      </button>
      )}
      {/* Floating "+N" popups for bonus moves — centered, above the tubes */}
      <div style={{ position: "fixed", top: "42%", left: 0, right: 0, pointerEvents: "none", zIndex: 60, display: "flex", justifyContent: "center" }}>
        {bonusPops.map((b) => (
          <div key={b.id} className="bonusPop" style={{
            position: "absolute",
            fontWeight: 900,
            fontSize: 28,
            color: T.gold,
            textShadow: `0 2px 12px color-mix(in srgb, ${T.gold} 53.3%, transparent), 0 0 4px rgba(0,0,0,0.8)`,
            letterSpacing: "-0.02em",
          }}>{b.text}</div>
        ))}
      </div>

      <div style={S.hud}>
        <div>
          <div style={S.roundLabel}>
            {isDaily && <span style={S.dailyBadge}>DAILY</span>}
            Round {round}
          </div>
          <div style={S.colorCount}>{level.colorCount} colors · best {best}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...S.movesLabel, color: movesLeft <= 3 ? T.danger : T.ink }}>
              {Math.max(0, movesLeft)} <span style={S.movesSub}>moves left</span>
            </div>
          </div>
          <button onClick={() => {
            if (phase === "playing" && (moves > 0 || round > 1)) {
              setConfirmDialog({
                title: "Exit to Home?",
                message: "Progress will be lost.",
                confirmLabel: "Exit",
                onConfirm: () => {
                  saveBestRound();
                  restartRun();
                  /* popNav(), not setScreen("home") directly — this "game"
                     screen was pushed via pushNav when the run started (see
                     onPlay/onDaily below), and setScreen alone left that
                     history entry un-consumed, so hardware back afterwards
                     was one press short of matching what's on screen.
                     popNav() pops it, same as the daily game-over "← Home"
                     button and onExitDaily already do — the popstate
                     handler's own fallback branch flips screen to "home"
                     from there.
                     navStateRef is updated here directly, not just via
                     setConfirmDialog(null) — confirmed with a live-React
                     repro that the ref-sync effect does NOT flush before
                     history.back()'s popstate fires in the same tick, so
                     relying on the effect alone left the ref reporting
                     confirmDialog:true when popstate arrived, which hit the
                     hardware-back-while-dialog-open branch instead and
                     silently swallowed this Exit tap (dialog closed, but
                     never navigated home). */
                  navStateRef.current = { ...navStateRef.current, confirmDialog: false };
                  setConfirmDialog(null);
                  popNav();
                },
              });
            } else {
              saveBestRound();
              restartRun();
              popNav();
            }
          }} aria-label="Home" style={{
            /* 40×40, not 34×34 — matches the Back button used on the
               Settings/Profile screens (S.backBtn there) instead of
               being the one smaller icon-only tap target in the app;
               a house glyph (HomeIcon) also says "go home" on sight,
               where the old "←" text character didn't. */
            width: 40, height: 40, borderRadius: 12,
            background: T.tubeBg, border: `1px solid ${T.tubeEdge}`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}><HomeIcon size={20} /></button>
          <button onClick={() => { setShowSettings(true); pushNav("settings"); }} aria-label="Settings" style={{
            width: 40, height: 40, borderRadius: 12,
            background: T.tubeBg, border: `1px solid ${T.tubeEdge}`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}><SettingsIcon size={20} /></button>
        </div>
      </div>

      <div style={S.progressTrack}>
        <div style={{
          ...S.progressFill,
          width: `${Math.min(100, Math.max(0, (moves / (level.moveLimit + bonusMoves)) * 100))}%`,
          background: movesLeft <= 3 ? T.danger : T.accent,
        }} />
      </div>

      {/* Live combo streak — appears once you're on a run of 2 or more.
          Without this the combo counter was invisible until it fired a bonus,
          so the player never knew a streak was building. */}
      {/* The badge's space is reserved permanently. It used to sit in the
          normal flow with nothing held open for it, so the moment a
          combo started (the 2nd pour in a row) the badge pushed the whole
          board — which is vertically centered in the space left over —
          down by half its height, 18px, and the board jumped back up the
          moment the combo broke. Measured: tube tops 286px → 304px on the
          2nd pour. That jolt happened on every combo, and with balls now
          in flight during a pour it also meant a ball could land 18px from
          where its tube had just moved to. A fixed 36px slot (the badge's
          28px + its 8px gap) means the board never moves. */}
      <div style={{ height: 36, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        {comboCount >= 2 && (
          <div style={{ ...S.comboBadge, marginBottom: 0 }} className="comboPop" key={comboCount}>
            <span style={S.comboFlame}>🔥</span>
            <span style={S.comboText}>{comboCount}× combo</span>
          </div>
        )}
      </div>

      {runUpgrades.length > 0 && (
        <div style={S.upgradeStrip}>
          {runUpgrades.slice(-10).map((id, i) => {
            const u = UPGRADES.find((x) => x.id === id);
            if (!u) return null;
            const r = RARITY[u.rarity];
            return (
              <div key={i} title={u.name} style={{
                width: 26, height: 26, borderRadius: 8,
                background: `${r.color}22`, border: `1.5px solid ${r.color}66`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
              }}>{u.icon}</div>
            );
          })}
        </div>
      )}

      {/* Padding is lopsided on purpose: a selected ball rises one
          ball-height (+ gap, + the tube's 4px dip) above its tube, so the
          top row needs that much clear space ABOVE it and nothing extra
          below. Centering the board symmetrically (the old flat 20px)
          left ~50px unused under the board on a 5-7 tube, two-row round
          while a ball lifted from the top row rose 10px into the HUD /
          combo slot. Counting the lift room as part of the board when
          centering it fixes that without shrinking anything. */}
      <div style={{ ...S.board, paddingTop: Math.ceil(tubeDims(tubeScaleFor(tubes.length)).ballH + LIFT_GAP + 4), paddingBottom: 8 }}>
        {/* rowGap: when the board wraps to two rows, a ball lifted out of a
            bottom-row tube rises one ball-height (+ gap) above its rim. At
            the old uniform 12px gap it came to rest on top of the upper
            row's bottom ball; this leaves it clear space with a few px to
            spare, including the selected tube's own 4px dip.
            ref + position: the wrong-move shake/flash (see the effect keyed
            on `shake` above) animates THIS row directly via
            Element.animate() rather than a re-rendered inline style or CSS
            class, so a rapid string of wrong taps can't stack up stale
            transitions and so the animation never needs to remount (and
            thereby reset) the Tube children living inside it. */}
        <div ref={tubesRowRef} style={{ ...S.tubesRow, position: "relative", rowGap: Math.ceil(tubeDims(tubeScaleFor(tubes.length)).ballH + LIFT_GAP + 10) }}>
          {tubes.map((balls, i) => (
            <Tube key={i} idx={i} balls={balls} selected={selected === i} hintFrom={hint && hint.from === i} hintTo={hint && hint.to === i} solved={isTubeSolved(balls)} onClick={(e) => onTubeClick(i, e)} onPointerDown={(e) => onTubePointerDown(i, e)} onPointerMove={onTubePointerMove} onPointerUp={onTubePointerUp} onPointerCancel={onTubePointerCancel} disabled={phase !== "playing"} scale={tubeScaleFor(tubes.length)} colorBlind={colorBlindOn} landing={landing && landing.tube === i ? landing : null} />
          ))}
          {/* Always mounted (never conditionally rendered) so it has a
              stable ref to animate — opacity 0 at rest, pulsed red by the
              same effect that triggers the shake above. */}
          <div ref={wrongFlashRef} aria-hidden="true" style={S.wrongFlash} />
        </div>
      </div>

      <div style={S.footer}>
        {phase === "playing" && (
          <div style={S.hint}>{selected === null ? "Tap a tube to pick it up" : "Tap a destination tube"}</div>
        )}
      </div>

      {phase === "upgrade" && pendingUpgrades.length > 0 && (
        <div style={S.overlay} className="fade-in">
          <div style={{ ...S.ovCard, maxWidth: 360 }} className="popIn">
            <div style={{ ...S.ovTitle, color: T.go, fontSize: 22 }}>Round {round} Cleared!</div>
            <div style={{ ...S.ovSub, marginBottom: jackpotNearMiss ? 8 : 20 }}>Choose an upgrade</div>
            {jackpotNearMiss && (
              <div style={{
                fontSize: 12, fontWeight: 800, textAlign: "center",
                color: RARITY[5].color, marginBottom: 12,
              }}>
                ✨ A Jackpot almost dropped!
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingUpgrades.map((u, i) => (
                <div key={u.id} className="fade-up" style={{ animationDelay: `${100 + i * 80}ms` }}>
                  <UpgradeCard upgrade={u} onPick={() => chooseUpgrade(u)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div style={S.overlay} className="fade-in">
          <div style={{ ...S.ovCard, maxWidth: 380 }} className="popIn">
            {!shareImage ? (
              <>
                {/* Big round display — each piece stages in on its own beat
                    (icon → title → number → badges → stats) instead of the
                    whole result landing on screen in one flat block, since
                    this is the one moment that sums up the entire run. */}
                <div style={{ ...S.ovIconCircle, animationDelay: "80ms" }} className="fade-up">
                  <span style={{ fontSize: 32 }}>{round >= best && round > 1 ? "🏆" : "💥"}</span>
                </div>
                <div style={{ ...S.ovTitle, animationDelay: "140ms" }} className="fade-up">Run Over</div>
                <div style={{ ...S.ovBigNum, animationDelay: "200ms" }} className="fade-up">{gameOverDisplayRound}</div>
                <div style={{ ...S.ovBigLabel, animationDelay: "240ms" }} className="fade-up">ROUNDS SURVIVED</div>
                {round >= best && round > 1 && (
                  <div style={{ ...S.ovNewBest, animationDelay: "320ms" }} className="fade-up">✨ New Personal Best</div>
                )}
                {nearMiss && (
                  <div style={{ ...S.ovNewBest, animationDelay: "320ms" }} className="fade-up">😮 1 move away!</div>
                )}

                {/* Stats grid */}
                <div style={{ ...S.ovStats, animationDelay: "380ms" }} className="fade-up">
                  <div style={S.ovStat}>
                    <div style={S.ovStatNum}>{runUpgrades.length}</div>
                    <div style={S.ovStatLabel}>Upgrades</div>
                  </div>
                  <div style={S.ovStat}>
                    <div style={S.ovStatNum}>{best}</div>
                    <div style={S.ovStatLabel}>Best</div>
                  </div>
                  <div style={S.ovStat}>
                    <div style={S.ovStatNum}>{finalMovesLeft}</div>
                    <div style={S.ovStatLabel}>Moves Left</div>
                  </div>
                </div>

                {isDaily ? (
                  <>
                    <DailyBoard rounds={todayRounds} dateSeed={dateToSeed()} />
                    <FriendCompare rounds={todayRounds} dateKey={dailyKey()} />
                    <div style={{
                      textAlign: "center",
                      padding: "16px 20px",
                      background: "rgba(255, 194, 75, 0.08)",
                      border: "1px solid rgba(255, 194, 75, 0.25)",
                      borderRadius: 14,
                      marginBottom: 12,
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 900,
                        letterSpacing: "0.14em",
                        color: T.gold,
                        textTransform: "uppercase",
                      }}>
                        One attempt only
                      </div>
                      <div style={{
                        fontSize: 15, fontWeight: 800,
                        color: T.ink, marginTop: 6,
                      }}>
                        Come back tomorrow
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        color: T.muted, marginTop: 6,
                      }}>
                        Next puzzle in
                      </div>
                      <DailyResetCountdown />
                    </div>
                    <button style={{ ...S.ghost, color: T.accent }} onClick={shareDaily}>📋 Share Result</button>
                    <button style={S.ghost} onClick={() => { popNav(); setIsDaily(false); }}>← Home</button>
                  </>
                ) : (
                  <>
                    <button style={S.primary} onClick={retry}>Retry Round {round}</button>
                    <button style={{ ...S.ghost, color: T.accent }} onClick={generateShare}>📤 Share Result</button>
                    <button style={S.ghost} onClick={() => startNewGame(false)}>Start Over</button>
                  </>
                )}
              </>
            ) : (
              <>
                <div style={{ ...S.ovTitle, color: T.go, fontSize: 22 }}>Your Result</div>
                <img src={shareImage} alt="Score" style={{ width: "100%", borderRadius: 12, marginTop: 12, marginBottom: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }} />
                <button style={S.primary} onClick={shareNow}>
                  {shared ? "✓ Shared" : "Share"}
                </button>
                <button style={S.ghost} onClick={() => { setShareImage(null); setShared(false); }}>Back</button>
              </>
            )}
          </div>
        </div>
      )}
      </div>
      )}

      {/* In-app toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 20px)",
            left: 20, right: 20,
            display: "flex", justifyContent: "center",
            pointerEvents: "none",
            zIndex: 300,
            animation: toast.exiting
              ? "toastOut 240ms ease forwards"
              : "toastIn 380ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 13,
            background: "var(--glass-modal)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1.5px solid " + (toast.color || "var(--accent)") + "55",
            borderRadius: 18,
            padding: "13px 20px 13px 14px",
            boxShadow: "0 12px 40px " + (toast.color || "var(--accent)") + "33, 0 4px 12px rgba(0,0,0,0.35)",
            fontFamily: "'Inter', system-ui, sans-serif",
            maxWidth: 380,
            width: "100%",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: "transparent",
              border: "1.5px solid " + (toast.color || "var(--accent)") + "55",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 900,
              color: toast.color || "var(--accent)",
              lineHeight: 1,
            }}>{toast.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13.5, fontWeight: 900,
                color: "var(--text)",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}>{toast.title}</div>
              {toast.message && (
                <div style={{
                  fontSize: 11.5, fontWeight: 600,
                  color: "var(--text-sub)",
                  marginTop: 3,
                  lineHeight: 1.3,
                }}>{toast.message}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {settingsExit.shouldRender && (
        <SettingsScreen
          closing={settingsExit.closing}
          soundOn={soundOn}
          vibeOn={vibeOn}
          onToggleSound={() => {
            const next = !soundOn;
            setSoundOn(next);
            Snd.setSfx(next);
            try { localStorage.setItem("cascade:soundOn", next ? "1" : "0"); } catch {}
          }}
          onToggleVibe={() => {
            const next = !vibeOn;
            setVibeOn(next);
            setVibe(next);
            try { localStorage.setItem("cascade:vibeOn", next ? "1" : "0"); } catch {}
          }}
          musicOn={musicOn}
          onToggleMusic={() => {
            const next = !musicOn;
            setMusicOn(next);
            Music.setEnabled(next);
            try { localStorage.setItem("cascade:musicOn", next ? "1" : "0"); } catch {}
          }}
          colorBlindOn={colorBlindOn}
          onToggleColorBlind={() => {
            const next = !colorBlindOn;
            setColorBlindOn(next);
            try { localStorage.setItem("cascade:colorBlind", next ? "1" : "0"); } catch {}
          }}
          reduceMotionOn={reduceMotionOn}
          onToggleReduceMotion={() => {
            const next = !reduceMotionOn;
            setReduceMotionOn(next);
            try { localStorage.setItem("cascade:reduceMotion", next ? "1" : "0"); } catch {}
          }}
          onReset={() => {
            setConfirmDialog({
              title: "Reset All Progress?",
              /* Was "...best score, stats, and tutorial" — silent on the
                 daily streak, even though the handler below has always
                 cleared cascade:dailyResults (what computeStreak reads) too.
                 A player confirming this had no way to know their streak —
                 the one thing the game otherwise goes out of its way to
                 protect, with shields and reminders — was part of the deal. */
              message: "This deletes your best score, stats, daily streak, and tutorial.",
              confirmLabel: "Reset",
              onConfirm: () => {
                try {
                  localStorage.removeItem(BEST_KEY);
                  localStorage.removeItem("cascade:tutorialSeen");
                  localStorage.removeItem("cascade:stats");
                  localStorage.removeItem("cascade:dailyResults");
                  localStorage.removeItem("cascade:dailyState");
                  localStorage.removeItem("cascade:hasPlayedOnce");
                } catch {}
                setBest(0);
                setStats({ gamesPlayed: 0, totalRounds: 0, totalMoves: 0, highestCombo: 0 });
                /* These three used to only be cleared in localStorage, never
                   in the live React state that actually drives the screen —
                   so right after confirming "Reset", the Home screen kept
                   showing the old streak, the old "Daily Complete" status,
                   and the Daily card itself (hasPlayedOnce gates whether it
                   renders at all) exactly as before, until a full app
                   reload happened to re-read storage from scratch. Resetting
                   them here too means Reset actually looks reset. */
                setDailyResults({});
                setDailyState(null);
                setDailyRun({ rounds: [], totalMoves: 0 });
                setHasPlayedOnce(false);
                setTutorialSeen(false);
                /* Re-arms the "How to Play" card right now, not just in
                   storage. The confirm message above promises this reset
                   includes the tutorial, but until now only the storage
                   flag actually cleared — the visible card stayed gone,
                   and only reappeared on some unrelated future cold
                   launch that happened to read the cleared flag, which
                   looked like Reset had silently not done what it said.
                   Batches into the same re-render as popNav() below, so
                   it appears the instant the confirm dialog closes rather
                   than after a gap or on top of it. */
                setShowTutorial(true);
                restartRun();
                popNav();
                setConfirmDialog(null);
              },
            });
          }}
          onAwards={() => setShowAchievements(true)}
          onClose={() => popNav()}
          onShowTutorial={() => setShowTutorial(true)}
          achievements={achievements}
          ACHIEVEMENTS={ACHIEVEMENTS}
          theme={theme}
          onSetTheme={setTheme}
          isDaily={isDaily}
          onExitDaily={() => {
            saveBestRound();
            restartRun();
            popNav();
          }}
        />
      )}

      {achievementsExit.shouldRender && (
        <AchievementsScreen
          closing={achievementsExit.closing}
          achievements={achievements}
          stats={stats}
          best={best}
          streak={computeStreak(dailyResults, shieldedDates)}
          bestStreak={bestStreak}
          onClose={() => popNav()}
        />
      )}

      {showTutorial && (
        <Tutorial
          onClose={() => {
            setShowTutorial(false);
            try { localStorage.setItem("cascade:tutorialSeen", "1"); } catch {}
          }}
        />
      )}

      {/* Exit-to-Home confirm — state existed but was never rendered, so the
          Home button silently did nothing whenever moves > 0 || round > 1
          (the confirm-required case, i.e. almost always). */}
      {confirmDialog && (
        <div style={S.overlay}>
          <div style={{ ...S.ovCard, maxWidth: 340 }}>
            <div style={{ ...S.ovTitle, fontSize: 20 }}>{confirmDialog.title}</div>
            <div style={{ ...S.ovSub, marginBottom: 20 }}>{confirmDialog.message}</div>
            <button style={S.primary} onClick={confirmDialog.onConfirm}>
              {confirmDialog.confirmLabel || "Confirm"}
            </button>
            <button style={S.ghost} onClick={() => setConfirmDialog(null)}>Cancel</button>
          </div>
        </div>
      )}

    </div>
  );
}

