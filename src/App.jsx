import React, { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { T, D, MAX_HEIGHT, COLORS, BEST_KEY, ACH_KEY, ACHIEVEMENTS, RARITY, UPGRADES, CATEGORY, FOCUS_OFFERS, rarityText, rarityTint, STREAK_CEREMONY, STREAK_MILESTONES, CALM_DISCOUNT } from "./constants";
import {
  sumMoveBonus, getLuckyChance, getComboEvery, getMegaEvery,
  pickRandomUpgrades, isTubeSolved, canPour, pour, isSolved,
  shuffle, mulberry32, dailyKey, dateToSeed, computeStreak,
  reconcileStreakShield, isOneMoveFromSolved, updateBestStreak,
  applyAutoSort, generateLevel, findHint,
  loadDailyState, saveDailyState,
  msUntilNextDaily, formatCountdown, pickDailyUpgrades,
  dailyRoundSeed, dailyLuckRoll, DAILY_STREAM,
  DAILY_STATE_KEY, DAILY_RUN_KEY,
  pickDailyTwist, LUCKY_DAY_BONUS, FEAST_CARD_COUNT, WIND_MOVES,
  dailyScore, DAILY_BEST_SCORE_KEY, BEST_STREAK_KEY, SHIELD_KEY,
  SCORE_BEST_KEY, SCORE_RUNS_KEY, SCORE_TRIES_KEY, loadScoreBest, loadScoreRuns, recordScoreRun,
  loadScoreTries, bumpScoreTries,
  saveDailyRun, clearDailyRun, loadDailyRun, tubesMatchLevel,
  saveNormalRun, clearNormalRun, loadNormalRun,
  pityActive, runArchetype, pickArchetypes, dailyArchetype,
  weekMutator, mutatorById,
} from "./gameLogic";
import { S } from "./theme";
import { CSS } from "./globalStyles";
import { buildEmojiGrid, buildShareCard, nativeShareText, nativeShareImage } from "./shareCard";
import { Snd, Haptic, setVibe, Music } from "./sound";
import { initNotifications, syncDailyReminders } from "./notifications";
import Particles from "./Particles";
import Tube, { tubeDims, slotCenter, LIFT_GAP, fitTubeScale } from "./Tube";
import FlyingBalls, { planFlight } from "./FlyingBalls";
import UpgradeCard from "./UpgradeCard";
import HomeScreen from "./HomeScreen";
import AchievementsScreen from "./AchievementsScreen";
import CodexScreen from "./CodexScreen";
import { recordCodexPath, recordCodexCard, recordCodexTwist, clearCodex } from "./codex";
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

/* Keeps a full-screen page (Settings, Profile/Achievements, Codex) mounted for
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

/* Celebration shake — the "yes!" counterpart to SHAKE_KEYFRAMES. Same
   mechanism (WAAPI on the board row, so it can re-fire on every pour without
   remounting anything) but the opposite meaning: SHAKE_KEYFRAMES is a
   refusal, a left-right stutter that decays over 420ms and ends where it
   started. This one is a thump — a single sharp displacement that peaks
   almost immediately and is home again inside ~150ms, so it reads as impact
   rather than rejection. Built from `amp`/`rot` instead of being a fixed
   constant because the tiers need to be distinguishable at a glance (2px vs
   6px on a phone-sized board is otherwise the same nudge), and because
   hardcoding three near-identical keyframe arrays is how they drift apart.

   Damped alternating offsets rather than a sine: the first swing is the
   one that carries the weight, and each subsequent one is a smaller
   correction, which is what a struck object actually does.

   Research: Jan Willem Nijman's "Art of Screenshake" (GDC 2019, Vlambeer)
   — screen shake's value is that it's the cheapest possible way to make a
   system feel like it has mass, and that it must be reserved for moments
   that deserve it. That's the rule applied here: the wrong-move shake is
   punishment, this is reward, and neither fires for a plain +1 bonus. */
function cheerKeyframes(amp, rot) {
  return [
    { transform: "translate(0, 0) rotate(0deg)" },
    { transform: `translate(${-amp * 0.6}px, ${amp * 0.25}px) rotate(${-rot * 0.6}deg)` },
    { transform: `translate(${amp * 0.45}px, ${-amp * 0.2}px) rotate(${rot * 0.45}deg)` },
    { transform: `translate(${-amp * 0.25}px, ${amp * 0.1}px) rotate(${-rot * 0.25}deg)` },
    { transform: `translate(${amp * 0.12}px, 0) rotate(${rot * 0.12}deg)` },
    { transform: "translate(0, 0) rotate(0deg)" },
  ];
}

/* ms of celebration shake per amplitude — a bigger hit is allowed to take
   slightly longer to settle. Kept in the 120-180ms band: long enough to be
   felt, short enough that it never delays the pour you're still making. */
const CHEER_MS = { small: 130, mid: 150, big: 180 };

/* Extra flight time given to the last ball of the pour that finishes a
   level, so the win can be watched landing. Tuned against the 85ms
   inter-ball stagger in attemptPour: 250ms is roughly three gaps, so the
   slow ball clearly separates from the cascade behind it without leaving a
   gap long enough to read as a stall. Purely visual — game state has
   already committed by the time this applies. */
const WIN_BALL_SLOW_MS = 250;

/* How long an achievement toast stays up when it isn't a streak milestone. */
const ACH_TOAST_MS = 2600;

/* How long an achievement toast stays up. A milestone uses its own ceremony
   duration instead of the flat 2.6s above — the whole point of a milestone
   is that it outlasts the moment you earned it. Under Reduce Motion the extra
   time comes OFF (CALM_DISCOUNT) rather than the toast being suppressed: the
   achievement's name is information, and reduce motion asks for things to
   stop MOVING, not to stop being shown. The 1200ms floor stops a short
   ceremony from being subtracted into something too quick to read. */
function achToastMs(meta, reduceMotion) {
  const tier = meta && meta.tier;
  const base = (tier && STREAK_CEREMONY[tier] && STREAK_CEREMONY[tier].duration) || ACH_TOAST_MS;
  return Math.max(1200, base - (reduceMotion ? CALM_DISCOUNT : 0));
}

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
    <div
      className={urgent ? "dailyUrgentPulse" : undefined}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 16, fontWeight: 800,
        color: urgent ? T.danger : T.goldText,
        marginTop: 4,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
        /* The blink moved to a class (see .dailyUrgentPulse in
           globalStyles.js). As an inline `animation` shorthand it outranked
           every stylesheet rule, so the reduce-motion block had no way to
           stop this infinite 1s loop — it kept blinking for players who had
           asked for reduced motion. The class is pausable with the rest of
           the daily decorations, and gets a static ring instead. */
      }}
    >
      {formatCountdown(ms)}
    </div>
  );
}

/* ═══════════  MAIN  ═══════════ */

/* How long after the upgrade cards appear before a tap can pick one. The cards
   fade in over ~0.5s but were tappable from the first frame -- while still
   invisible -- so a stray tap from the last pour picked an upgrade the player
   had never seen. */
const UPGRADE_TAP_GUARD_MS = 500;
const SCREEN_SHIELD_MS = 350;
const CONFIRM_SCRIM_GUARD_MS = 400;

export default function Cascade() {
  const [round, setRound] = useState(1);
  /* "dark" | "light" | "system". Read from storage when the state is created,
     not in a mount effect: the effect version rendered the first frame with
     the default, and the effect below that writes the theme back to storage
     ran with that default BEFORE the saved value was applied -- under
     StrictMode's double-run (dev builds) it overwrote the saved theme with
     "dark" and the second run read that back, so a saved Light theme reset to
     Dark on every reload of `npm run dev`. */
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("cascade:theme");
      if (saved === "dark" || saved === "light" || saved === "system") return saved;
    } catch {}
    return "dark";
  });
  const [stats, setStats] = useState({ gamesPlayed: 0, totalRounds: 0, totalMoves: 0, highestCombo: 0 });
  /* Which of the three modes this run is. Was a bare `isDaily` boolean, which
     could only ever say "daily or not" — and the third mode needs to be
     distinguishable from BOTH of the others at once: score attack shares the
     normal run's endless structure and the daily's no-assist rule, while
     being neither of them. A boolean would have made that either two flags
     that can disagree or a tri-state string pretending to be a flag.

     isDaily and isScore below are derived, never stored, so there is exactly
     one source of truth and no way for the three to fall out of step. */
  const [mode, setMode] = useState("normal");  // "normal" | "daily" | "score"
  const isDaily = mode === "daily";
  const isScore = mode === "score";
  /* Score attack is the leaderboard mode, so it drops the assist layer the
     same way the daily does: undo and hints exist to make a run easier, and a
     mode whose entire subject is a comparable number can't hand them out. */
  const canAssist = mode === "normal";
  /* Score-attack standings. scoreBest is the number the HUD and Home card
     read; scoreResult is what the run-over card renders (set once, at the
     same moment recordScoreRun writes). Neither is written mid-run. */
  const [scoreBest, setScoreBest] = useState(() => loadScoreBest());
  const [scoreRuns, setScoreRuns] = useState(() => loadScoreRuns());
  const [scoreTries, setScoreTries] = useState(() => loadScoreTries());
  /* Identifies the current run so a score run is recorded at most ONCE. Two
     writers exist — the loss timer and the Exit dialog — and both can fire
     for the same run (lose, tap Home in the ~0.5s before the card, Exit).
     Bumped by restartRun; each writer records only if no write has been made
     for the run token it belongs to. */
  const runTokenRef = useRef(0);
  const scoreRecordedTokenRef = useRef(-1);
  const [scoreResult, setScoreResult] = useState(null);
  const [dailyState, setDailyState] = useState(null);   /* daily challenge state machine */
  const [toast, setToast] = useState(null);
  const [dailyRun, setDailyRun] = useState({ rounds: [], totalMoves: 0 });
  /* Today's rule change (see DAILY_TWISTS in constants.js), fixed when the
     run starts from the run's own date, so a run that crosses UTC midnight
     keeps the twist it began with. null outside a daily run. */
  const [dailyTwist, setDailyTwist] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  /* When the dialog opened. A tap on the dim area cancels it, but a double-tap on
     the button that opened it (the HUD Home button) sent its second tap straight to
     that dim area, so the dialog appeared and vanished again. Dim-area taps in the
     first CONFIRM_SCRIM_GUARD_MS are ignored; the buttons themselves always work. */
  const confirmOpenedAtRef = useRef(0);
  useEffect(() => {
    if (confirmDialog) confirmOpenedAtRef.current = performance.now();
  }, [confirmDialog]);
  /* Today's rounds-cleared count, good across a same-day app restart —
     dailyRun resets to empty on reload (session-only React state), but
     dailyState is persisted and loadDailyState() already only returns
     it when its dateKey matches today, so falling back to dailyRun is
     just belt-and-braces for the same-session case before the very
     first setDailyState() commits. Shared by DailyBoard and
     FriendCompare so both read the exact same "today" number. */
  /* dailyRun is ALSO score attack's round log, so the fallback is only valid
     while this is a daily run — otherwise a score run's cleared rounds showed
     on Home as "You · N" on a daily the player never played. */
  const todayRounds = dailyState?.rounds ?? (isDaily ? dailyRun.rounds.length : 0);
  const toastTimerRef = useRef(null);

  /* ═══ DAILY MODE — INITIALIZATION ═══ */

  /* Ref to avoid stale closures in level effect (before isDaily is set) */
  const isDailyRef = useRef(false);
  useEffect(() => { isDailyRef.current = isDaily; }, [isDaily]);

  /* The moment today's daily run began. Every seed and every date key the
     run uses comes from THIS date, not from "now" at the time each round
     happens to be generated or cleared. A run that starts before UTC
     midnight and carries on after it is still playing the puzzle it
     started (see gameLogic.js dailyRoundSeed), instead of drifting onto
     the next day's boards and writing its result onto a day the player
     never opened. */
  const dailyRunDateRef = useRef(null);
  /* Position to lay over the freshly generated round when a saved daily
     run is resumed. Read once, by the level effect below. */
  const pendingResumeRef = useRef(null);
  /* Saves the live daily position (see saveDailyRun in gameLogic.js).
     Does nothing outside a daily run, or once the run's day has rolled
     over, since a saved run is only ever resumed on its own day. */
  const persistDailyRun = useCallback((run) => {
    const runDate = dailyRunDateRef.current;
    if (!runDate || dailyKey(runDate) !== dailyKey()) return;
    saveDailyRun({ dateKey: dailyKey(runDate), bestAtStart: dailyBestAtStartRef.current, ...run });
  }, []);
  /* True when the run on screen belongs to an earlier UTC day than today
     (started before midnight, still playing after it). Its game-over card
     must not say "come back tomorrow": today's puzzle is already open. */
  const staleDailyRun =
    isDaily && !!dailyRunDateRef.current && dailyKey(dailyRunDateRef.current) !== dailyKey();

  /* Load persisted daily state on mount */
  useEffect(() => {
    try {
      const ds = loadDailyState();
      if (ds) setDailyState(ds);
      /* Permission first, then let notifications.js rebuild the reminders
         from what is true right now (see planDailyReminders there). */
      initNotifications().then((granted) => { if (granted) syncDailyReminders(); }).catch(() => {});  /* a rejected plugin promise escapes the try above */
    } catch {}
  }, []);

  /* Day rollover. The daily puzzle changes at UTC midnight, and everything
     on Home that depends on "today" (the card, the week strip, the streak,
     the shield) is worked out while rendering. Nothing re-renders at
     midnight by itself, and the old watcher only reloaded dailyState if a
     one-second tick happened to land in the last second before midnight.
     A phone that sleeps through midnight never gets that tick, so the app
     kept showing yesterday's "Daily Attempt Used" / "Come back tomorrow"
     card and yesterday's week (reproduced with a faked clock). Now the day
     key itself is compared, every second while the app is awake and again
     the moment it becomes visible, so it doesn't matter how the midnight
     was slept through. dayTick exists only to force that re-render. */
  const [, setDayTick] = useState(0);
  const seenDayRef = useRef(dailyKey());
  useEffect(() => {
    const refreshDay = () => {
      const k = dailyKey();
      if (k === seenDayRef.current) return;
      seenDayRef.current = k;
      try { setDailyState(loadDailyState()); } catch {}
      try {
        const parsedDr = JSON.parse(localStorage.getItem("cascade:dailyResults") || "{}");
        /* Same narrowing as the two other readers of this key. Not a crash
           risk here (a non-object would throw inside reconcileStreakShield and
           be swallowed by this catch, leaving state untouched) but it would
           silently skip the day-rollover shield reconcile, which is exactly the
           thing this interval exists to do. */
        const dr = parsedDr && typeof parsedDr === "object" && !Array.isArray(parsedDr) ? parsedDr : {};
        setShieldedDates(reconcileStreakShield(dr));
      } catch {}
      setDayTick((n) => n + 1);
      syncDailyReminders();
    };
    const onVisible = () => { if (!document.hidden) refreshDay(); };
    const id = setInterval(refreshDay, 1000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const [screen, setScreen] = useState("home");   // "home" | "game"
  /* Home <-> game switches instantly, and a confirm dialog vanishes the moment it is
     answered, so a second tap on the button that caused either (a double-tap on "Exit"
     in the Exit-to-Home dialog, on Play, or on the dialog's Cancel) landed on
     whatever the screen underneath had at that spot: coming home, the Daily Challenge
     card, which started a Daily run; after Cancel on the Reset dialog, the
     Color-Blind row, which toggled it. A transparent layer swallows input for
     SCREEN_SHIELD_MS after every screen change and every dialog close. */
  const [screenShield, setScreenShield] = useState(false);
  const shieldTimerRef = useRef(null);
  const raiseShield = useCallback(() => {
    setScreenShield(true);
    clearTimeout(shieldTimerRef.current);
    shieldTimerRef.current = setTimeout(() => setScreenShield(false), SCREEN_SHIELD_MS);
  }, []);
  useEffect(() => () => clearTimeout(shieldTimerRef.current), []);
  const shieldScreenRef = useRef(screen);
  useEffect(() => {
    if (shieldScreenRef.current === screen) return;
    shieldScreenRef.current = screen;
    raiseShield();
  }, [screen, raiseShield]);
  const shieldConfirmRef = useRef(confirmDialog);
  useEffect(() => {
    const wasOpen = !!shieldConfirmRef.current;
    shieldConfirmRef.current = confirmDialog;
    if (wasOpen && !confirmDialog) raiseShield();
  }, [confirmDialog, raiseShield]);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [dailyResults, setDailyResults] = useState({});
  /* Where today's daily ATTEMPT stands, for the Home card (HomeScreen.jsx
     explains the four phases). dailyState is authoritative once it exists;
     the streak flag alone is only consulted for a save from before
     dailyState existed. */
  const dailyPhase =
    dailyState?.status === "failed"
      ? dailyResults[dailyKey()] ? "done" : "used"
      : dailyState?.status === "in_progress"
      ? "resume"
      : dailyState?.status === "completed" || dailyResults[dailyKey()]
      ? "done"
      : "new";
  /* Round the saved run will resume on. Read from disk only while Home is
     showing (screen flips on Exit, so it refreshes when you come back). */
  const resumeRound = useMemo(
    () => (screen === "home" && dailyPhase === "resume" ? loadDailyRun()?.round ?? 1 : 1),
    [screen, dailyPhase, dailyState],
  );
  /* The normal run's Continue, by the same construction as resumeRound above:
     read from disk only while Home is showing, so it refreshes the moment the
     Exit dialog sends the player back. `null` means there is nothing to
     continue — no save, or a corrupt one loadNormalRun rejected — and the
     Play button starts a fresh run exactly as it did before Continue existed.
     The round is the only field Home needs; everything else is restored by
     startNewGame's resume branch.

     NOT memoized, deliberately, where resumeRound above is. The daily's
     resume is a primitive and its two deps change exactly when the answer
     does; this one is invalidated by clearNormalRun() from three separate
     places (the loss trigger, the Continue card's New Run button, and
     Settings > Reset), and only two of those also change `screen` — a Reset
     performed from Home leaves it "home", so a dep array keyed on `screen`
     would hand Home a save that was deleted a render earlier. A useMemo here
     needs a bump-counter in all three clear sites to be correct, which is
     more machinery than the read it saves. */
  const savedNormal = screen === "home" ? loadNormalRun() : null;
  /* The rule the CONTINUED run is actually under, which is not necessarily
     the one the card above it advertises: the save carries the mutator it was
     generated with (mutatorId), and a run left on Sunday and reopened on
     Monday is still playing last week's rule. Resolved through mutatorById so
     it is the same object the resume branch will adopt, and null when the save
     is null or has no resolvable rule. */
  const savedNormalMutator = savedNormal
    ? mutatorById(savedNormal.mutatorId) || weekMutator()
    : null;
  const [shieldedDates, setShieldedDates] = useState([]);
  const [runUpgrades, setRunUpgrades] = useState([]);
  const [pendingUpgrades, setPendingUpgrades] = useState([]);
  /* Opening archetype. `archOffer` is non-null exactly while the run-start
     picker is on screen; `runPath` is what the run actually opened with.
     In a normal run the player chooses it (archOffer), in a daily it is
     derived from the date (see dailyArchetype) and archOffer stays null, so
     nothing about it has to be saved — a resumed daily run recomputes the
     same path it started with. Both are reset by restartRun. */
  const [archOffer, setArchOffer] = useState(null);
  const [runPath, setRunPath] = useState(null);
  /* Escape cancels the picker, same as the Exit dialog — but WITHOUT saving
     or resetting anything. The pick is optional by design (see
     chooseArchetype), so dismissing it means "let me just play", and the run
     continues with no focus at all. */
  const [archOfferClosed, setArchOfferClosed] = useState(false);
  useEffect(() => {
    if (!archOffer) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setArchOfferClosed(true); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [archOffer]);
  /* True when a Jackpot roll just missed but landed close — surfaced on the
     upgrade-choice screen instead of silently discarded (research: seeing a
     near-miss is part of what keeps variable-reward systems compelling). */
  const [jackpotNearMiss, setJackpotNearMiss] = useState(false);
  /* True once this round has needed at least one retry — read (and reset)
     when the NEXT round's level is generated, so that round steps back down
     in difficulty instead of continuing to climb ("hills, not stairs"). */
  const [retriedThisRound, setRetriedThisRound] = useState(false);
  /* The weekly mutator THIS RUN is playing under, frozen for the run's
     lifetime. weekMutator() is a pure function of the current UTC week, so
     calling it at each generateLevel would return the same object all week —
     except in the one case that matters: an app left open across Monday
     midnight, where a run already halfway through would silently have its
     next round generated under different rules than its first. Pinning it
     makes the whole run consistent, which is the same reason dailyTwist is
     per-run rather than per-render.

     Settable, unlike a plain module constant, for the one case a session-wide
     pin cannot cover on its own: a run CONTINUED from a save. That run was
     started under whatever rule was in force when it was written, and it
     carries that rule's id in its save (see mutatorById) — so resuming it
     adopts the saved rule rather than this week's, or a player who put the
     app down on Sunday and came back Monday would have their next round
     generated under a different rule than their first. Reassigned only by
     restartRun (a fresh run takes this week's rule) and by the normal-run
     resume, never by a round change, so it stays stable within a run. */
  const [weeklyMutator, setWeeklyMutator] = useState(() => weekMutator());
  /* The pinned object, not a fresh weekMutator() call: the two are the same
     on a cold start, but only the state value above is guaranteed to be the
     one every later generateLevel in this run is using. Legal to read here
     because the two useState calls run in order, and the resume path
     overwrites this level wholesale anyway. */
  const [level, setLevel] = useState(() => generateLevel(1, [], 0, null, false, null, weeklyMutator));
  const [tubes, setTubes] = useState(level.tubes);
  const [moves, setMoves] = useState(0);
  const [bonusMoves, setBonusMoves] = useState(0);
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("playing");
  const [comboCount, setComboCount] = useState(0);
  /* Whether the run that just ended set a new personal best. Captured at
     the game-over trigger rather than re-derived where it's drawn: that
     trigger bumps `best` to `round` BEFORE the results card renders, so
     every comparison available at render time is already too late —
     `round > best` reads false for a genuine record (best was just raised
     to match it) and `round >= best` reads true for a plain tie. The
     answer is only knowable at the one place it's decided. */
  const [newBestThisRun, setNewBestThisRun] = useState(false);
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
  /* Round-clear flash target. Driven imperatively like `celebrate`, not
     through a counter + effect like the wrong-move shake: the clear happens at
     one known instant (the isSolved branch of attemptPour), so there is no
     "replay on an unrelated re-render" hazard for a counter to defend against,
     and the flash must fire BEFORE the ~450ms handoff to the upgrade cards
     begins — an effect would land a frame or two late for no gain. */
  const clearFlashRef = useRef(null);
  /* The combo badge, for the milestone pulse below. The badge already pops on
     every increment via the comboPop class; this is the louder, less frequent
     beat on top of it. */
  const comboBadgeRef = useRef(null);
  /* Board fit (see fitTubeScale in Tube.jsx): tubeScaleFor() picks a size from
     the tube count alone, so on a short/narrow screen the board could run off
     the bottom. The effect measures where the board starts and shrinks the
     tubes only as far as needed; layouts that already fit are untouched. */
  const boardRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const [vpTick, setVpTick] = useState(0);
  useEffect(() => {
    const bump = () => setVpTick((t) => t + 1);
    window.addEventListener("resize", bump);
    window.addEventListener("orientationchange", bump);
    /* Web fonts change the HUD's height once they load. */
    try { document.fonts && document.fonts.ready.then(bump); } catch {}
    return () => {
      window.removeEventListener("resize", bump);
      window.removeEventListener("orientationchange", bump);
    };
  }, []);
  useLayoutEffect(() => {
    const el = boardRef.current;
    const root = el && el.offsetParent;
    if (!el || !root) return;
    const next = fitTubeScale(tubes.length, tubeScaleFor(tubes.length), el.offsetTop, root.clientHeight, root.clientWidth);
    setFitScale((prev) => (prev === next ? prev : next));
  }, [tubes.length, runUpgrades.length, isDaily, dailyTwist, screen, vpTick]);
  const tubeScale = Math.min(tubeScaleFor(tubes.length), fitScale);
  const tubeScaleRef = useRef(1);
  useEffect(() => { tubeScaleRef.current = tubeScale; });
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
  /* Daily has its own personal best: most rounds CLEARED in one daily run.
     Daily runs used to write into `best`, the main game's record (and to
     count the round they LOST on), so a daily result showed up as "New
     Personal Best" against a number earned with undo and hints. */
  const [dailyBest, setDailyBest] = useState(0);
  /* Personal best daily SCORE (see dailyScore in gameLogic.js), and what the
     run that just ended scored, for the game-over card. */
  const [dailyBestScore, setDailyBestScore] = useState(0);
  const [dailyScoreResult, setDailyScoreResult] = useState(null);
  const dailyBestAtStartRef = useRef(0);  /* dailyBest when this run began, to tell a new best from a tie */
  const dailyNewBest = isDaily && todayRounds >= 1 && todayRounds > dailyBestAtStartRef.current;
  const [achievements, setAchievements] = useState([]);
  const [achToast, setAchToast] = useState(null);
  const [shareImage, setShareImage] = useState(null);
  const [shared, setShared] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(true); // default true = don't flash
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  /* Codex — a third full-page view, on exactly the same terms as the two
     above: it pushes its own history entry, so the popstate/back-button
     machinery below closes it the same way. It carries no live state of its
     own (see CodexScreen, which reads localStorage on mount), so all that
     is needed here is the open flag and the exit transition. */
  const [showCodex, setShowCodex] = useState(false);
  /* Purely visual — see useExitTransition's own comment. showSettings/
     showAchievements above stay the single source of truth for the
     nav-stack; these two just decide how long the screen stays mounted
     after that flag goes false, so it can slide out instead of vanishing. */
  const settingsExit = useExitTransition(showSettings);
  const achievementsExit = useExitTransition(showAchievements);
  const codexExit = useExitTransition(showCodex);
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

  /* The score-attack stand-in for gameOverDisplayRound, which is what the
     count-up effect and the results card both read. Kept separate from that
     round counter rather than folded into it, because the two mean different
     things and the round counter is also read by the share card and the daily
     board: one number, two purposes, and a merge would have quietly changed
     what the daily's own card displays.

     Scored from dailyRun.rounds — the same log the run-over write scores from
     (see recordScoreRun's call site) — so what counts up on the card and what
     lands on the board cannot be two different figures derived two different
     ways. Zero until the first round clears, which is also exactly when a run
     stops being recordable. */
  const scoreDisplay = useMemo(() => (isScore ? dailyScore(dailyRun.rounds) : 0), [isScore, dailyRun.rounds]);

  /* What the upgrade screen reports back about the run. Both are pure
     functions of the run's own card list (runArchetype / pityActive in
     gameLogic.js), so there is no state here to fall out of sync and nothing
     extra to persist — the offer rules and the offer screen cannot disagree
     about what the run is, because they read the same list. Recomputed on
     every render, which is three array walks over at most a few dozen ids. */
  const runArch = runArchetype(runUpgrades);
  const offerPity = pityActive(runUpgrades);
  /* While the opening bias is still live the run's own archetype is the one
     the player picked (or, in a daily, the day's), reported against the
     categories they actually chose — so the picker screen can say "your pick
     is working" or, just as usefully, "your pick is going unused". Once the
     bias expires this falls back to the organic leader and the run is
     whatever the cards in hand made it. */
  const openingPath = runPath && runUpgrades.length < FOCUS_OFFERS ? runPath : null;
  const runFocus = runPath ? runPath.cats : null;
  /* Same FOCUS_OFFERS gate as activeFocus() in gameLogic, kept in step by
     both reading the one constant — if they ever disagreed, the pill would
     claim a bias the draw was no longer applying (or hide one it was). */
  const shownArch = openingPath
    ? { cat: openingPath.cats[0], count: (runArchetype(runUpgrades, openingPath.cats) || { count: 0 }).count }
    : runArch;

  // Load best from localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem(BEST_KEY);
      if (v) setBest(parseInt(v, 10) || 0);
      const dbv = localStorage.getItem("cascade:dailyBest");
      if (dbv) setDailyBest(parseInt(dbv, 10) || 0);
      const dbs = localStorage.getItem(DAILY_BEST_SCORE_KEY);
      if (dbs) setDailyBestScore(parseInt(dbs, 10) || 0);
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
        /* Type-check the parsed value, not just that it parses. A syntactically
           valid non-array (null, {}, 123, or a bare string) survives JSON.parse
           and would be stored verbatim, then throw at the first `.length` /
           `.includes` when the achievements screen opens — and there is no
           error boundary above it, so that unmounts the React root and blanks
           the app. The single writer (unlockAch) already normalises to an
           array of strings, so mirror that guard here rather than inventing a
           second shape. */
        if (a) {
          const parsedAch = JSON.parse(a);
          if (Array.isArray(parsedAch)) setAchievements(parsedAch.filter((x) => typeof x === "string"));
        }
      } catch {}
      try {
        const dr = localStorage.getItem("cascade:dailyResults");
        const parsedDr = dr ? JSON.parse(dr) : null;
        /* Same reason as the achievements read above, and this one is worse:
           dailyResults is indexed in the RENDER body (the dailyPhase spread at
           411-418 and computeStreak at 3505), so a value that parses but isn't
           an object — a stored "null" is enough — throws there rather than in
           an effect, and with no error boundary above Cascade that unmounts the
           root and blanks the app on every launch. Narrow to a plain object
           once, here, so nothing downstream has to re-check the shape. */
        const safeDr = parsedDr && typeof parsedDr === "object" && !Array.isArray(parsedDr) ? parsedDr : {};
        if (dr) setDailyResults(safeDr);
        setShieldedDates(reconcileStreakShield(safeDr));
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

  /* false the whole time the upgrade overlay is closed, so it is already false
     on the very first frame the cards exist. */
  const [upgradeReady, setUpgradeReady] = useState(false);
  useEffect(() => {
    if (phase !== "upgrade") { setUpgradeReady(false); return undefined; }
    const t = setTimeout(() => setUpgradeReady(true), UPGRADE_TAP_GUARD_MS);
    return () => clearTimeout(t);
  }, [phase]);

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
    /* Daily counts ROUNDS CLEARED, the number the board, the share text and
       the friend code all use. `round` is the one you lost on, so the big
       number used to read one higher than everything else on the card.

       Score attack counts the SCORE instead — the number the mode is about,
       and the one everything else on its card is measured against. Counting
       rounds there and printing the score below it would put two different
       numbers on the same card with the larger one labelled "rounds".

       isScore reads state directly rather than through a ref: this effect is
       keyed on [phase, round], and it is the render that carries the new
       phase which supplies the closure — the same reasoning as canAssist in
       the level effect above.

       Score attack gets its own 900ms count-up rather than sharing the 700ms
       one: the value is up to five digits instead of one, so at the same rate
       the digits visibly blur past, and the mode's whole result is that one
       number arriving.

       The value is scoreDisplay — the one derivation shared with the run-over
       write — so the count-up and the recorded figure cannot disagree. */
    if (isScore) {
      const s = scoreDisplay;
      if (reduceMotionRef.current) { setGameOverDisplayRound(s); return; }
      setGameOverDisplayRound(0);
      const started = performance.now();
      let raf2 = requestAnimationFrame(function tick2(now) {
        const t = Math.min(1, (now - started) / 900);
        const eased = 1 - Math.pow(1 - t, 3);
        setGameOverDisplayRound(Math.round(s * eased));
        if (t < 1) raf2 = requestAnimationFrame(tick2);
      });
      return () => cancelAnimationFrame(raf2);
    }
    const shown = isDailyRef.current ? Math.max(0, round - 1) : round;
    if (reduceMotionRef.current) { setGameOverDisplayRound(shown); return; }
    setGameOverDisplayRound(0);
    const target = shown;
    const duration = 700;
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic — decelerates into the final number
      setGameOverDisplayRound(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, round, isScore, scoreDisplay]);

  /* ═══ THEME ═══ */

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
    setStats((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  }, []);
  /* Storage is written here, one commit after the state it mirrors, rather
     than inside the setStats updater above. An updater has to be pure:
     React is free to run one more than once (StrictMode runs every one
     twice in dev) and free to discard a render outright, so a write inside
     it happened twice, or happened for state that was never committed. */
  useEffect(() => {
    try { localStorage.setItem("cascade:stats", JSON.stringify(stats)); } catch {}
  }, [stats]);
  const recordGameStart = useCallback(() => recordStats((p) => ({ ...p, gamesPlayed: p.gamesPlayed + 1 })), [recordStats]);

  const showToast = useCallback((config) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(config);
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => t ? { ...t, exiting: true } : null);
      toastTimerRef.current = setTimeout(() => setToast(null), 240);
    }, config.duration ?? 2600);
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
    /* Daily and score attack = no undo, no hint (pure skill). Read from the
       mode itself rather than the isDailyRef: this effect is keyed on `level`
       and fires for the round-1 board the run started on, which is generated
       in the same tick `mode` is set — so the ref could still be holding the
       PREVIOUS run's answer here, and a run started from Score Attack would
       have opened with undo and hints before its first pour. `canAssist` is
       read straight off the render's own state instead, so it is never stale.

       Deliberately opt-OUT: a mode added later gets assists by default and
       has to say otherwise, rather than inheriting a bare `!isDaily` check
       that quietly grants them. */
    setUndoLeft(canAssist ? 2 : 0);
    setSnapshots([]);
    setHintLeft(canAssist ? 2 : 0);
    setHint(null);
    setFlights([]);
    setLanding(null);
    roundDecidedRef.current = false;
    setPhase("playing");
    /* Resuming a saved daily run: the round was just regenerated exactly as
       it started, now lay the saved position over it. */
    const resume = pendingResumeRef.current;
    pendingResumeRef.current = null;
    if (resume) {
      setTubes(resume.tubes.map((t) => [...t]));
      setMoves(resume.moves);
      setBonusMoves(resume.bonusMoves);
      setComboCount(resume.combo);
      if (resume.phase === "upgrade") {
        roundDecidedRef.current = true;
        setPendingUpgrades(resume.pendingUpgrades);
        setJackpotNearMiss(false);
        setPhase("upgrade");
      }
    }
    /* Deliberately still keyed on `level` alone. `canAssist` is read from this
       effect's own closure, which is the render's — and the render that
       produced the new level is the same render that carries the new mode,
       because both are set in the same batch at run start. Adding it as a dep
       would make this effect fire again on any mode change alone and tear down
       a live board (resetting tubes, moves and phase) to re-apply what it had
       already applied. */
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

  /* Combo milestone micro-pulse. The badge already pops on every single
     increment (the comboPop class, keyed on comboCount), so this is not "make
     the combo move" — it is a second, stronger beat every fifth link, which
     gives a long streak a rhythm instead of one flat drumroll. It matters
     because the combo counter's whole job is to make a rising streak feel like
     it is building toward something; without a milestone the numbers climb
     with no landmarks.

     An effect rather than a direct call from attemptPour, unlike `celebrate`
     and `flashClear`: the target is React-rendered and its ref is only
     populated after the render that changed comboCount, so there is nothing to
     animate at the instant attemptPour runs. Keying on comboCount is also what
     makes the multiple-of-five test exact — it fires once per increment, in
     the render that shows the new number.

     Skipped under Reduce Motion, same as `celebrate`: the badge still pops
     (comboPop is a small CSS transform) and the count is still there, so the
     milestone is not the only carrier of "you hit 5×". */
  useEffect(() => {
    if (comboCount < 5 || comboCount % 5 !== 0) return;
    if (reduceMotionRef.current) return;
    const el = comboBadgeRef.current;
    try {
      if (el && typeof el.animate === "function") {
        el.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.28)", offset: 0.4 },
            { transform: "scale(1)" },
          ],
          { duration: 420, easing: "cubic-bezier(.34,1.56,.64,1)" },
        );
      }
    } catch {}
  }, [comboCount]);

  /* Celebration thump for a combo/mega bonus — the positive twin of the
     effect above. Called from attemptPour at the same instant as
     Snd.mega()/Snd.combo(), inside the same armEphemeral deferral, so the
     shake, the sound, the particle burst and the "+N" all land together —
     after the ball has actually arrived, which is the only moment a thump
     reads as "that pour" instead of "the screen glitched".

     Driven imperatively rather than through a counter + effect like the
     wrong-move shake, because this one needs no re-render at all: `tier` is
     set only on the pour that earned it, so there's no stale value that
     could replay on an unrelated re-render. That's the one advantage the
     wrong-move shake's counter buys and this doesn't need.

     Skipped outright under Reduce Motion, rather than softened the way the
     wrong-flash is: that one keeps a plain opacity fade because it is the
     only "that didn't work" signal left once the shake is gone, and there's
     no such dependency here — a combo still gets its arpeggio, its doubled
     particle burst, its Haptic.heavy() and its floating "+2". Nothing is
     lost by dropping the motion.

     The board row is the target, not the whole screen: the HUD (round
     number, moves left) sits directly above it, and shaking that would
     blur exactly the two numbers a player is looking at on the pour that
     just rewarded them. */
  const celebrate = useCallback((amp, rot, ms) => {
    if (reduceMotionRef.current) return;
    const row = tubesRowRef.current;
    try {
      if (row && typeof row.animate === "function") {
        row.animate(cheerKeyframes(amp, rot), { duration: ms, easing: "cubic-bezier(.16,1,.3,1)" });
      }
    } catch {}
  }, []);

  /* The round-clear flash: a soft wash of the board's accent colour over the
     whole play area, at the instant the last tube solves. This is the fourth
     "something happened" signal in the pour vocabulary and the only one that
     fires on the ROUND rather than the move — the checkmark burst says "that
     tube is done", the combo arpeggio says "that was a streak", and this says
     "that was the round". Without it the win registered only as the boards
     going quiet before the upgrade cards, which is the least emphatic possible
     way to mark the most important event in the loop.

     Opacity-only, and skipped outright under Reduce Motion for the same reason
     `celebrate` is: nothing is lost by dropping it, since the clear still has
     its chime, its haptic, its Music pulse and the card transition. The
     overlay is pointer-events:none and aria-hidden, so it cannot intercept a
     tap or be announced.

     Fired with no await: the handoff to the upgrade cards is already on a
     timer (impactMs + 450), and this deliberately finishes inside that window
     rather than extending it. */
  const flashClear = useCallback(() => {
    if (reduceMotionRef.current) return;
    const el = clearFlashRef.current;
    try {
      if (el && typeof el.animate === "function") {
        el.animate(
          [
            { opacity: 0 },
            { opacity: 0.5, offset: 0.28 },
            { opacity: 0 },
          ],
          { duration: 520, easing: "ease-out" },
        );
      }
    } catch {}
  }, []);

  /* Short-lived one-shot timers whose only job is to fire a setState and
     die. They were scattered bare setTimeouts with no handle anyone kept,
     so nothing could cancel them and each one fired into a tree that had
     already unmounted. Tracked in one set, dropped by one cleanup.

     These two are declared HERE, above unlockAch, and that ordering is load-
     bearing. unlockAch runs the streak ceremony and needs spawnParticles; a
     useCallback's dependency array is evaluated where the call is written,
     so a deps list mentioning spawnParticles from above its own `const` is
     a temporal-dead-zone read on every single render. Neither of these
     depends on anything defined further down the component, so moving them
     up is free — the alternative was routing around it with a ref. */
  const ephemeralTimersRef = useRef(new Set());
  const armEphemeral = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      ephemeralTimersRef.current.delete(id);
      fn();
    }, ms);
    ephemeralTimersRef.current.add(id);
    return id;
  }, []);

  /* `count` and `dist` are the two knobs a pour burst exposes: a few sparks
     close by, versus a lot of confetti thrown wide. `colors` (a palette the
     pieces cycle through) and `life` (how long they hang around) exist for
     the streak ceremonies. All four default to the pour-burst values, so
     every existing call site is unchanged.

     `life` is passed down rather than hardcoded 600 here on purpose: it sets
     BOTH the particle animation's duration (inline, in Particles.jsx) and
     when the burst is unmounted. Deriving the two from one number is the
     only way they can't drift apart — a longer-flying piece dropped from the
     tree early would vanish mid-air, which is exactly the "longer gravity"
     tier 3 is asking for. */
  const spawnParticles = useCallback((x, y, color, count = 6, dist = 30, colors = null, life = 600) => {
    const id = Date.now() + Math.random();
    const seed = Math.random() * Math.PI;
    setParticles((p) => [...p, { id, x, y, color, seed, count, dist, colors, life }]);
    armEphemeral(() => setParticles((p) => p.filter((q) => q.id !== id)), life);
  }, [armEphemeral]);

  /* The round-clear burst — the board-wide confetti that marks a whole round
     rather than a single pour. Centred on the board row and thrown wide, so it
     reads as "that was the round", not "that tube was done" (the per-tube
     checkmark burst already covers the latter, and it fires on the same pour).

     Sized by how the round was WON, which is the one thing a clear has to
     distinguish: a round cleared with moves to spare gets the full celebration,
     a round scraped home on the last move gets a smaller one. The threshold is
     five, the same number the Perfect Clear upgrade pays out at — reaching it
     is already the game's own definition of a clear worth rewarding, so this
     borrows that line rather than inventing a second.

     reduceMotion halves the count rather than skipping the burst, matching the
     per-tube burst's own behaviour (see the `burstCount` line in attemptPour):
     a win should still visibly be a win under Reduce Motion, just calmer. The
     board rect is measured rather than assumed, with a viewport fallback, so a
     wrapped two-row board centres on the whole board and not on its top row. */
  const celebrateClearBurst = useCallback((movesLeft) => {
    let cx = null, cy = null;
    try {
      const row = tubesRowRef.current;
      if (row) {
        const r = row.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
      }
    } catch {}
    if (cx == null) { cx = window.innerWidth / 2; cy = window.innerHeight * 0.42; }
    const perfect = movesLeft >= 5;
    const base = perfect ? 28 : 16;
    const count = reduceMotionRef.current ? Math.ceil(base / 2) : base;
    spawnParticles(cx, cy, T.accent, count, perfect ? 110 : 66, COLORS, perfect ? 1000 : 760);
  }, [spawnParticles]);

  /* One ceremony per batch, for the highest tier in it.

     The streak effect calls unlockAch("streak_7"), then "streak_30", then
     "streak_100" in the same synchronous tick, and at a 100-day streak all
     three are true at once. Left alone, each would run its own ceremony on
     the spot: three arpeggios stacked on each other, three haptic patterns
     fighting, three confetti bursts. None of those is wrong on its own —
     together they're noise, and the tier the player actually earned ends up
     buried under the two smaller ones.

     Checking the toast queue for a higher tier instead does NOT work here,
     and it's worth being explicit about why: the unlocks are pushed in
     ASCENDING order, so when streak_7 is processed the queue contains only
     streak_7 — streak_30 and streak_100 haven't been added yet. The batch
     isn't knowable until the tick is over, which is what the deferral is
     for. A microtask rather than setTimeout(0) because a microtask runs as
     soon as the current synchronous block finishes: by then all three calls
     have been seen, and it still lands inside the same frame the unlock
     happened in. setTimeout(0) would wait for the next frame and read as a
     visible stutter between the toast appearing and the sound arriving.

     The lower tiers keep their toasts in the queue — the player still sees
     all three unlocks scroll past in order. What's dropped is the
     overlapping sound, buzz and confetti, not the information. */
  const ceremonyTierRef = useRef(0);
  const flushCeremony = useCallback(() => {
    const tier = ceremonyTierRef.current;
    ceremonyTierRef.current = 0;
    if (!tier) return;
    const c = STREAK_CEREMONY[tier];
    Snd.celebrate(tier);
    Haptic.celebrate(tier);
    /* Confetti from the toast's own badge rather than from the board. The
       toast renders at top:60 centred, so this is the middle of its 40px
       icon (60 + 40/2, plus a few px of the card's own padding). Spawning
       at the tube the player just used would throw the celebration
       somewhere they aren't looking.

       Palette, spread, count and lifetime are all read off the ceremony in
       constants.js rather than being decided here, so a tier's whole feel
       lives in one readable block. `T.gold` is still passed as the base
       colour for the tier-1 case, whose `colors` is null.

       Reduce Motion reduces this burst rather than removing it, which is the
       opposite trade from the celebration shake above — and deliberately so.
       The shake is decoration on a bonus the player can already see ("+2",
       the extra move counter); the confetti is the only cue that a CEREMONY
       happened, because the toast itself is the same card shape at all three
       tiers. Drop the burst and the reduce-motion path is left with a plain
       notification, where a week and a century are indistinguishable again.

       Same reduction the pour burst already uses (burstCount in attemptPour):
       roughly half the pieces, thrown a bit closer, gone sooner. Distance and
       life scale WITH the count rather than the count alone, because a burst
       that keeps tier 3's full 100px reach while holding 12 of its 24 pieces
       still reads as a large fast movement — the piece count alone is not
       what makes a burst feel big. Life is in the multiplier for the same
       reason: 950ms of tier-3 drift is precisely the ambient movement the
       setting exists to stop, and it is also the number that unmounts the
       burst (see spawnParticles), so the two cannot disagree. */
    const calm = reduceMotionRef.current;
    spawnParticles(
      window.innerWidth / 2,
      86,
      T.gold,
      calm ? Math.ceil(c.particles / 2) : c.particles,
      calm ? Math.round(c.dist * 0.7) : c.dist,
      c.colors,
      calm ? Math.max(400, Math.round(c.life * 0.6)) : c.life,
    );
  }, [spawnParticles]);

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
     for its own full duration (achToastMs below — the flat 2600ms for a
     normal unlock, longer for a streak milestone), in the order they were
     earned. */
  const achToastQueueRef = useRef([]);
  const achToastTimerRef = useRef(null);

  const showNextAchToast = useCallback(() => {
    const next = achToastQueueRef.current.shift();
    setAchToast(next || null);
    /* reduceMotionRef, not the `reduceMotionOn` state: this timer is armed
       once when a toast is shown and read whenever it later fires, so it must
       see the setting as it is now, not as it was when it was armed. */
    achToastTimerRef.current = next ? setTimeout(showNextAchToast, achToastMs(next, reduceMotionRef.current)) : null;
  }, []);

  const unlockAch = useCallback((id) => {
    /* Read from localStorage first — early return prevents repeat toasts */
    let current = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(ACH_KEY) || "[]");
      /* Anything that parses but isn't an array of ids -- a hand-edited
         value, a truncated write, a bare number -- used to fall straight
         through to current.includes() below and throw a TypeError. From
         chooseUpgrade that fired BEFORE setRunUpgrades/setLevel, so the
         pick aborted and the game stayed stuck on the upgrade overlay for
         good (every retry threw again); from the streak effect below it
         threw inside a useEffect with no error boundary above it, which
         blanks the app. Unusable data reads as "nothing unlocked yet". */
      if (Array.isArray(parsed)) current = parsed.filter((x) => typeof x === "string");
    } catch {}
    if (current.includes(id)) return;

    const next = [...current, id];
    try { localStorage.setItem(ACH_KEY, JSON.stringify(next)); } catch {}
    setAchievements(next);

    const meta = ACHIEVEMENTS.find((a) => a.id === id);
    if (meta) {
      achToastQueueRef.current.push(meta);
      if (!achToastTimerRef.current) showNextAchToast();
      /* Streak milestone, scaled off the achievement's own `tier` (see
         ACHIEVEMENTS[].tier and STREAK_CEREMONY in constants.js). Two guards
         matter: an achievement with no tier, and a tier with no ceremony
         entry, both fall through to exactly the plain unlock this used to
         be. That's what keeps the other eight achievements on the 2.6s
         toast with no sound, no buzz and no confetti.

         This is safe to run on every call because of the localStorage
         early-return above — the streak effect re-runs on every
         dailyResults change, and only the call that actually writes a NEW id
         gets this far.

         The ceremony itself is NOT fired here. See flushCeremony: at a
         100-day streak this function runs three times in one tick, and the
         decision of which one gets to be loud can only be made once the
         whole batch is known. */
      const tier = meta.tier && STREAK_CEREMONY[meta.tier] ? meta.tier : 0;
      if (tier > ceremonyTierRef.current) {
        /* `wasIdle` schedules exactly one microtask per batch. Without it
           each upgrade in the batch would queue its own flush, and while
           the ref-zeroing in flushCeremony would make the extras harmless
           no-ops, three scheduled callbacks to do one job is three chances
           to be surprised later. */
        const wasIdle = ceremonyTierRef.current === 0;
        ceremonyTierRef.current = tier;
        if (wasIdle) queueMicrotask(flushCeremony);
      }
    }
  }, [showNextAchToast, flushCeremony]);

  /* Streak milestones — same unlock/toast path as any other achievement.
     Re-checked whenever dailyResults or shieldedDates changes (i.e. right
     after completing today's daily, or once on load); unlockAch's own
     localStorage check makes repeat calls at the same streak a no-op.

     The three thresholds are read off ACHIEVEMENTS[].days rather than written
     out as literals, so the achievement that says "7-day daily streak" and the
     check that grants it cannot disagree — they used to be the same number in
     two files with nothing linking them. The filter is what makes this safe to
     extend: a milestone is now added by adding one entry to ACHIEVEMENTS, with
     its own tier, and it is picked up here automatically. Previously a fourth
     entry would have been listed on the Profile screen and never granted.

     The three unlocks stay explicit rather than looping. A loop over the
     filtered list is shorter, but the ascending order is load-bearing rather
     than cosmetic: unlockAch defers the ceremony to a microtask and keeps only
     the HIGHEST tier of a batch (see flushCeremony), so ascending is what lets
     the last call in the tick be the one that wins. Handled by the ref, but not
     worth making the reader re-derive that to save three lines. */
  useEffect(() => {
    const streak = computeStreak(dailyResults, shieldedDates);
    setBestStreak(updateBestStreak(streak));
    /* days is sorted ascending, so the LAST unlock in the batch is always the
       highest milestone the streak qualifies for. */
    STREAK_MILESTONES.forEach((m) => {
      if (streak >= m.days) unlockAch(m.id);
    });
  }, [dailyResults, shieldedDates, unlockAch]);

  /* `screen` inside a callback's closure is the value it had when the
     callback was created, so the deferred round transitions below can't
     ask it whether the game is still the thing on screen. This is the
     live answer. */
  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  /* The one pending "what happens when this round ends" timer.
     attemptPour arms exactly one: the upgrade screen and the game over
     card live in the same if/else, so they can never both be queued. */
  const roundTransitionRef = useRef(null);

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
      const scale = tubeScaleRef.current;
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
        /* The pour that finishes the level gets its LAST ball flown slowly
           (WIN_BALL_SLOW_MS) so the round-winning moment can actually be
           seen landing — everything up to that point is a cascade at speed,
           and the ball that wins the level is the one you most want to
           watch arrive. Scoped to that single ball on purpose: slowing the
           whole pour turns the win into a queue, and slowing it globally
           makes every ordinary move feel sluggish. Nothing else reads this
           — the level's own clear check stays the single source of truth.

           The extra time is added inside planFlight as a uniform time-scale
           and re-derived, so the arc keeps its shape, and because the
           landing times below are read off these same numbers the landing
           sound, the particle burst and the upgrade cards all wait for the
           slower ball automatically. */
        const isWinPour = isSolved(next);
        const newFlights = [];
        const lands = [];
        for (let k = 0; k < movedCount; k++) {
          const ballEl = srcBalls[tubes[fromIdx].length - 1 - k];
          if (!ballEl) break;
          const r = ballEl.getBoundingClientRect();
          const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
          const { x: x1, y: y1 } = slotCenter(dstRect, beforeLen + k, scale);
          const slowBy = isWinPour && k === movedCount - 1 ? WIN_BALL_SLOW_MS : 0;
          const { arcMs, dropMs, topY, v0 } = planFlight(x0, y0, x1, rimY, y1, slowBy);
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
      setHint(null);
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
      const luckyChance =
        getLuckyChance(runUpgrades) + (isDaily && dailyTwist?.id === "lucky" ? LUCKY_DAY_BONUS : 0);
      /* Daily: the roll is fixed by (day, round, pour number) so every
         player with the same luck upgrade gets the same drops. Math.random
         here made the daily a different game for each player, and let
         anyone re-roll by replaying. */
      if (luckyChance > 0) {
        const roll = isDaily
          ? dailyLuckRoll(round, moves, dailyRunDateRef.current || new Date())
          : Math.random();
        if (roll < luckyChance) { bonus += 1; tier = Math.max(tier, 1); }
      }
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
      /* How many semitones to transpose this bonus's arpeggio up by (see
         semitones() in sound.js). Two per combo earned, so every rung of the
         ladder is the same musical interval and the run climbs in tune;
         capped at an octave because past that a sine turns thin and shrill
         instead of triumphant, and a good run really does reach ten-plus
         combos. Normalised by comboEvery/megaEvery rather than keyed on the
         raw combo number, because those intervals scale with upgrades — the
         same "third combo" is nine pours in with a slow combo upgrade and
         three without, and it should land in the same place on the ladder
         either way. First combo comes out at 0, so the very first one is
         exactly the pitch this shipped with. */
      const comboStep = (every, count) =>
        every ? Math.min(12, (Math.max(1, Math.round(count / every)) - 1) * 2) : 0;

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
        if (burstAt > 0) armEphemeral(() => spawnParticles(px, py, color, burstCount), burstAt);
        else spawnParticles(px, py, color, burstCount);
      }

      setComboCount(newCombo);
      const newMovesUsed = moves + 1;
      recordMoves(1);
      recordCombo(newCombo);
      /* Second Wind (daily-only card): the pour that would end the run spends
         it instead and buys WIND_MOVES more. Spent means "wind" becomes
         "wind_used" in the upgrade list, which is also what the saved run
         stores, so leaving and coming back can't hand it back. */
      const windIdx = runUpgrades.indexOf("wind");
      const windNow =
        isDaily &&
        windIdx !== -1 &&
        !isSolved(next) &&
        level.moveLimit + bonusMoves + bonus - newMovesUsed <= 0;
      if (windNow) bonus += WIND_MOVES;
      const upgradesNow = windNow
        ? runUpgrades.map((id, i) => (i === windIdx ? "wind_used" : id))
        : runUpgrades;
      if (windNow) {
        setRunUpgrades(upgradesNow);
        showToast({
          icon: "💨",
          color: "var(--gold)",
          title: "Second Wind!",
          message: `+${WIND_MOVES} moves \u2014 play on`,
        });
      }
      const newBonus = bonusMoves + bonus;
      setMoves(newMovesUsed);
      if (bonus > 0) {
        setBonusMoves(newBonus);
        armEphemeral(() => {
          if (tier >= 3) { Snd.mega(comboStep(megaEvery, newCombo)); Haptic.heavy(); Music.pulse("mega"); celebrate(6, 0.9, CHEER_MS.big); }
          else if (tier >= 2) { Snd.combo(comboStep(comboEvery, newCombo)); Haptic.medium(); Music.pulse("combo"); celebrate(4, 0.6, CHEER_MS.mid); }
          else Snd.bonus();
        }, 120);
        /* Fire a floating "+N" so the player can actually see the bonus
           they just earned — before this the extra moves were invisible
           and the only signal was the sound. */
        const id = Date.now() + Math.random();
        setBonusPops((p) => [...p, { id, text: `+${bonus}` }]);
        armEphemeral(() => setBonusPops((p) => p.filter((q) => q.id !== id)), 900);
      }

      const newMovesLeft = level.moveLimit + newBonus - newMovesUsed;

      /* Daily: keep the live position on disk, so leaving and coming back
         resumes it (see saveDailyRun). The pours that end the round are
         saved below instead, as a cleared round or a failed run. */
      if (isDaily && !isSolved(next) && newMovesLeft > 0) {
        persistDailyRun({
          phase: "playing",
          round,
          upgrades: upgradesNow,
          genPrevLeft: lastRoundMovesLeft,
          nextPrevLeft: 0,
          tubes: next,
          moves: newMovesUsed,
          bonusMoves: newBonus,
          combo: newCombo,
          rounds: dailyRun.rounds,
          totalMoves: dailyRun.totalMoves,
        });
      }

      if (isSolved(next)) {
        roundDecidedRef.current = true;
        const remainingAtClear = newMovesLeft;
        recordRound();
        /* Fired here, at the solve, not in the timed upgrade handoff below:
           the flash belongs to the moment the board is won, and delaying it
           ~450ms would put it on top of the cards instead of on the win.

           `remainingAtClear`, not `newMovesLeft`: they are the same value here,
           but the burst is scored on how the round was won and that is exactly
           what this local was named for. */
        flashClear();
        celebrateClearBurst(remainingAtClear);
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
        /* The round log — the array dailyScore() reads at the end of a run.
           Built for score attack as well as the daily, and written in exactly
           one place for both, because the two modes are scored from the same
           shape: a copy per mode would be two places to keep in step, and the
           failure mode is a score that quietly disagrees with the rounds the
           player actually cleared.

           In-memory only for a score run. Nothing reaches disk until the run
           is over (see recordScoreRun) — that is the whole of the
           no-mid-run-persistence rule, and this is the line that makes it true. */
        const clearedRun = isDaily || isScore ? {
          rounds: [
            ...dailyRun.rounds,
            { round, moves: newMovesUsed, moveLimit: level.moveLimit, left: Math.max(0, remainingAtClear) },
          ],
          totalMoves: dailyRun.totalMoves + newMovesUsed,
        } : null;
        if (clearedRun) setDailyRun(clearedRun);
        if (isDaily) {
          if (round > dailyBest) {
            setDailyBest(round);
            try { localStorage.setItem("cascade:dailyBest", String(round)); } catch {}
          }
          /* Saved the moment the round is cleared, not when the upgrade
             cards open ~1s later: leaving in that gap resumes straight at
             the cards. */
          persistDailyRun({
            phase: "upgrade",
            round,
            upgrades: runUpgrades,
            genPrevLeft: lastRoundMovesLeft,
            nextPrevLeft: remainingAtClear,
            tubes: next,
            moves: newMovesUsed,
            bonusMoves: newBonus,
            combo: newCombo,
            rounds: clearedRun.rounds,
            totalMoves: clearedRun.totalMoves,
          });
          /* Save streak day — a deliberately low bar (clearing just round 1
             keeps the streak alive), separate from whether the run itself
             is still going. See computeStreak in gameLogic.js. */
          try {
            const k = dailyKey(dailyRunDateRef.current || new Date());
            const parsedDr = JSON.parse(localStorage.getItem("cascade:dailyResults") || "{}");
            /* Same narrowing as the load path. `dr[k] = …` on a number or a
               string throws in strict mode (ES modules are always strict) and
               the surrounding catch swallows it, so a malformed store would
               silently cost the player the streak day with no symptom at all.
               The spread also makes this a write of a fresh object rather than
               of whatever was parsed. */
            const dr = parsedDr && typeof parsedDr === "object" && !Array.isArray(parsedDr) ? parsedDr : {};
            if (!dr[k]) {
              dr[k] = { completed: true, ts: Date.now() };
              localStorage.setItem("cascade:dailyResults", JSON.stringify(dr));
              setDailyResults(dr);
              /* the streak is safe for today: drop today's reminder */
              syncDailyReminders();
            }
          } catch {}
        }
        /* Schedule the round transition FIRST — an achievement hiccup
           must never block the player from advancing to the upgrade. */
        roundTransitionRef.current = setTimeout(() => {
          /* The run can end inside this window: Home pressed and
             confirmed, the app reloaded. Everything below belongs to a
             run that is no longer on screen -- the state it sets has
             already been reset, and Snd/Haptic/Music would play over
             whatever took its place. The daily position and the streak
             day were both written synchronously above, so bailing here
             loses nothing. */
          /* Screen alone isn't enough: onHomePress opens the Exit dialog
             without changing `screen`, so tapping Home in the window above
             leaves screenRef on "game" and the clear chime, success haptic and
             music pulse fire on top of the dialog. Bail on the dialog too —
             cancelling it just reveals the upgrade cards a frame later, which
             is the correct end state anyway. Nothing is lost: the daily
             position and streak day were written synchronously above. */
          /* Screen changed = the run is gone, so bail. But an open Exit dialog
             is NOT a reason to skip the state below: returning here used to
             leave the round solved, phase stuck on "playing" and every pour
             blocked once the player tapped Cancel — nothing re-ran this. So
             the state always lands (the cards wait behind the dialog) and only
             the sound/haptic/music are held back. */
          if (screenRef.current !== "game") return;
          const quietClear = navStateRef.current.confirmDialog;
          setLastRoundMovesLeft(remainingAtClear);
          /* Daily upgrade choices must be identical for every player too —
             pickRandomUpgrades() alone used Math.random even in daily mode,
             so two players clearing the same round saw different 3 cards. */
          if (isDaily) {
            setPendingUpgrades(
              pickDailyUpgrades(
                dailyRoundSeed(round, DAILY_STREAM.upgrades, dailyRunDateRef.current || new Date()),
                dailyTwist?.id === "feast" ? FEAST_CARD_COUNT : 3,
                runUpgrades,
                runFocus,
              ),
            );
            setJackpotNearMiss(false);
          } else {
            const { upgrades, jackpotNearMiss } = pickRandomUpgrades(3, runUpgrades, Math.random, runFocus);
            setPendingUpgrades(upgrades);
            setJackpotNearMiss(jackpotNearMiss);
          }
          setPhase("upgrade");
          if (!quietClear) {
            Snd.clear();
            Haptic.success();
            Music.pulse("clear");
          }
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
           correctly excluded rather than trivially qualifying.

           canAssist, which now covers score attack too: it also starts at
           undoLeft=0, so the same reasoning applies — and under a bare
           !isDaily it would have been awarded for a run that structurally
           cannot undo, which is the achievement being free rather than earned. */
        if (canAssist && !undoUsedThisRun && round >= 5) unlockAch("no_undo_5");
      } else if (newMovesLeft <= 0) {
        roundDecidedRef.current = true;
        setNearMiss(isOneMoveFromSolved(next));
        /* Daily: the attempt is over the instant the last move is spent, so
           it's recorded now and the saved run is dropped. Waiting for the
           results card (~0.5s) left a window where closing the app would
           resume the run one move from the end. Only when the run is still
           on today's puzzle: a run that started before UTC midnight and
           failed after it belongs to the previous day, and saveDailyState
           stamps "today" -- writing it marked the player's brand-new day as
           already failed ("One Attempt Used" on a puzzle they never
           opened). */
        const failedState =
          isDaily && dailyKey(dailyRunDateRef.current || new Date()) === dailyKey()
            ? saveDailyState({
                status: "failed",
                failedAt: Date.now(),
                movesUsed: newMovesUsed,
                rounds: Math.max(0, round - 1),
              })
            : null;
        if (failedState) clearDailyRun();
        /* A normal run's save is dropped the moment the run ends, for the
           same reason the daily's is: this snapshot is of a round boundary,
           so it still describes a live run and Home would happily offer to
           continue a run the player has already lost. Written synchronously,
           before the timer below, so it happens even if they close the app in
           the ~0.5s before the results card — the same reason the daily's
           state is committed here rather than in the card's render.

           canAssist, not !isDaily. A score run wrote no save of its own, so
           there is nothing of ITS to drop — but this line used to fire for any
           non-daily run, and losing a score attack would have called
           clearNormalRun() and deleted the player's unrelated half-finished
           normal run, which they had every reason to believe was safe. */
        if (canAssist) clearNormalRun();
        const lossRunToken = runTokenRef.current;
        roundTransitionRef.current = setTimeout(() => {
          /* Unlike the upgrade transition above, the work here has to
             happen even if the player already walked away: the attempt
             really did just end, and Home's daily card is computed from
             dailyState (skip this and the card reads "Daily In Progress"
             while tapping it answers "One Attempt Used"). Only the
             presentation is conditional. */
          const stillOnGame = screenRef.current === "game";
          /* Save best if this is a new best (main game only -- see dailyBest).
             canAssist rather than !isDaily, for the same reason the clear
             above is: the main game's round record belongs to the main game,
             and a score run that cleared 40 rounds has still not beaten a
             40-round normal run. Score attack has its own record (scoreBest)
             and mixing the two would quietly redefine what "best" means. */
          if (canAssist && round > best) {
            setBest(round);
            /* Record the verdict here, where `round > best` is still a
               real comparison — the results card reads this flag instead of
               recomputing it, because by the time it draws, the setBest
               above has made `round > best` false and `round >= best` true
               for a tie. `round > 1` because dying on round 1 cleared
               nothing, so there's no record to claim. */
            setNewBestThisRun(round > 1);
            try { localStorage.setItem(BEST_KEY, String(round)); } catch {}
          }

          setFinalMovesLeft(Math.max(0, newMovesLeft));
          if (isDaily) {
            const score = dailyScore(dailyRun.rounds);
            const isNew = score > 0 && score > dailyBestScore;
            if (isNew) {
              setDailyBestScore(score);
              try { localStorage.setItem(DAILY_BEST_SCORE_KEY, String(score)); } catch {}
            }
            setDailyScoreResult({ score, isNew, best: isNew ? score : dailyBestScore });
          }
          /* Score attack: the one and only write of SCORE_BEST_KEY /
             SCORE_RUNS_KEY. Being here — inside the run-over branch, and
             BEFORE the `if (!stillOnGame) return` below — is what makes the
             mode's contract hold. It has to survive the player walking away
             in the ~0.5s before the card appears, exactly like the daily's
             state commit above: the run really did end, so it really counts,
             whether or not anyone is left to look at it.

             Deliberately unconditional on score > 0. A run that died on round
             1 still cleared nothing and scored nothing, and recording it as a
             zero would put an empty row on a board whose whole value is that
             its entries mean something — so a run is recorded only once it
             has a score worth ranking. */
          if (isScore && dailyRun.rounds.length > 0 && scoreRecordedTokenRef.current !== lossRunToken) {
            scoreRecordedTokenRef.current = lossRunToken;
            const result = recordScoreRun(scoreDisplay, dailyRun.rounds.length);
             setScoreResult(result);
             setScoreBest(result.best);
             setScoreRuns(loadScoreRuns());
           }
           /* No scoreResult at all when a run dies on round 1 — see above, and
              the card's empty state, which is told apart by scoreResult being
              null rather than by a score of 0. */


          /* Daily failure: show it (the state itself was saved above) */
          if (failedState) {
            setDailyState(failedState);
            syncDailyReminders();
          }

          if (!stillOnGame) return;
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
  }, [tubes, moves, bonusMoves, comboCount, level, runUpgrades, round, best, spawnParticles, unlockAch, isDaily, isScore, canAssist, dailyResults, hasPlayedOnce, recordRound, recordMoves, recordCombo, dailyState, undoLeft, undoUsedThisRun, colorBlindOn, lastRoundMovesLeft, dailyRun, persistDailyRun, dailyBest, dailyBestScore, dailyTwist, showToast, celebrate, flashClear, celebrateClearBurst, runFocus, scoreDisplay]);

  /* A drag ends in a pointerup, and the browser then fires a click on the
     tube the pointer was captured by (a mouse always does; a touch does if it
     moved only a little). That click is the tail of the drag, not a new tap:
     acting on it toggled the source tube back to selected right after a
     drag-pour. Drags stamp this; onTubeClick ignores clicks until it passes. */
  const suppressClickUntilRef = useRef(0);

  const onTubeClick = useCallback((idx, e) => {
    if (phase !== "playing" || roundDecidedRef.current) return;
    Snd.unlock();
    if (performance.now() < suppressClickUntilRef.current) return;
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
  const WIGGLE_MAX = 40;
  const dragSourceRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const onTubePointerDown = useCallback((idx, e) => {
    if (phase !== "playing" || roundDecidedRef.current) return;
    if (tubes[idx].length === 0) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    /* Something is already picked up and this is a different tube: the touch
       is the destination tap of a tap-tap pour, never the start of a drag.
       Arming a drag here meant a finger that drifted 10px+ during the tap
       re-picked THIS tube instead of pouring into it. */
    if (selected !== null && selected !== idx) return;
    dragSourceRef.current = idx;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = false;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }, [phase, tubes, selected]);

  const onTubePointerMove = useCallback((e) => {
    if (dragSourceRef.current === null || draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      draggingRef.current = true;
      Snd.select();
      /* A haptic for the pick-up, at the one moment we know a drag has
         actually started. Firing it on pointerdown instead isn't possible:
         down can't tell a drag from a tap yet, and taps are this game's
         most common interaction by far — select a tube, deselect it, pour
         by tap. Every one of those would have buzzed, and the buzz would
         have said "you're holding a ball" about the majority of moves that
         never hold one.

         This frame is the transition, not the motion: the guard above
         bails on every later move event once draggingRef is set, so the
         buzz fires exactly once per drag no matter how far the finger
         travels, and needs no ref of its own to enforce that.

         light() deliberately, not medium(): it pairs with Snd.select() on
         this same frame to say "ball lifted", while medium/ and heavy() are
         spoken for elsewhere in the pour — Haptic.medium() is the combo
         tier and heavy() the mega tier, and spending medium on a pick-up
         would blunt the payoff those are there to deliver. */
      Haptic.light();
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
    suppressClickUntilRef.current = performance.now() + 150;
    if (phase !== "playing") { setSelected(null); return; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const targetEl = el && el.closest ? el.closest("[data-tube-idx]") : null;
    const targetIdx = targetEl ? parseInt(targetEl.dataset.tubeIdx, 10) : NaN;
    /* Let go over empty space: cancel. Let go over its own tube after only
       a small wiggle (a finger that drifted during a tap): it stays picked
       up, the same end state a plain tap gives. Dragged well away and let
       go over its own tube (or its lifted balls): cancel, as before. */
    if (Number.isNaN(targetIdx)) { setSelected(null); return; }
    if (targetIdx === source) {
      const travelled = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
      if (travelled > WIGGLE_MAX) setSelected(null);
      return;
    }
    attemptPour(source, targetIdx, { currentTarget: targetEl });
  }, [phase, attemptPour]);

  const onTubePointerCancel = useCallback((e) => {
    dragSourceRef.current = null;
    draggingRef.current = false;
    setSelected(null);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  }, []);

  /* One timer for the highlight. Each press used to start its own 1.6s timer,
     so a second press while the first was still showing had its highlight
     cut short by the first press's timer (measured: ~0.5s instead of 1.6s)
     and spent a second hint to show the same move. */
  const hintTimerRef = useRef(null);
  const armHintTimer = useCallback(() => {
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), 1600);
  }, []);

  /* The one place the remaining timers get dropped on unmount. The ones
     that already carry their own cleanup (toast, screen shield, upgrade
     tap guard, exit transition) are deliberately left alone. */
  useEffect(() => () => {
    clearTimeout(achToastTimerRef.current);
    clearTimeout(hintTimerRef.current);
    clearTimeout(roundTransitionRef.current);
    ephemeralTimersRef.current.forEach(clearTimeout);
    ephemeralTimersRef.current.clear();
  }, []);

  const useHint = useCallback(() => {
    if (phase !== "playing" || roundDecidedRef.current) return;
    /* Defended at the handler, not only by the buttons being hidden. Both
       counters read 0 in score mode, so `hintLeft <= 0` already blocks it —
       but that is a coincidence of two values agreeing, and the first thing
       that changes hintLeft is also the first thing that could open this.
       If a keyboard shortcut, a gesture or a future button ever reaches here,
       the mode's rule has to hold on its own. */
    if (!canAssist) return;
    /* A hint is on screen (and is cleared the moment the board changes, see
       attemptPour / undo): pressing again just keeps it up, free. */
    if (hint) { armHintTimer(); return; }
    if (hintLeft <= 0) return;
    /* findHint (gameLogic.js) picks a move it can confirm keeps the board
       winnable, not just any legal move — see its own comment for why
       that distinction matters. */
    const move = findHint(tubes);
    if (!move) return;
    setHint({ from: move.from, to: move.to, key: Date.now() });
    setHintLeft((h) => h - 1);
    Snd.select();
    Haptic.light();
    armHintTimer();
  }, [hintLeft, phase, tubes, hint, armHintTimer, canAssist]);

  const undo = useCallback(() => {
    if (undoLeft <= 0) return;
    if (snapshots.length === 0) return;
    if (phase !== "playing" || roundDecidedRef.current) return;
    /* Same reasoning as useHint's guard, and it matters more here. Undo is the
       one assist that rewrites the round's own history — it can hand back a
       move the player mis-spent and re-open a board they had already lost. A
       recorded score has to mean "this was solved without rewinding it", so
       this refuses on the mode itself rather than trusting undoLeft. */
    if (!canAssist) return;
    const last = snapshots[snapshots.length - 1];
    setSnapshots((s) => s.slice(0, -1));
    setTubes(last.tubes);
    /* Drop anything still in the air — those balls are being put back —
       and forget the last landing schedule so restored balls get a normal
       drop-in, not a leftover landing delay. */
    setFlights([]);
    setLanding(null);
    setHint(null);
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
  }, [undoLeft, snapshots, phase, canAssist]);

  const chooseUpgrade = useCallback((upgrade) => {
    /* Guard against a double-tap racing through two upgrade cards before
       the overlay unmounts. pendingUpgrades is cleared the instant the
       first pick lands, so the second tap can never fire. */
    if (pendingUpgrades.length === 0) return;
    if (!upgradeReady) return;
    const newUpgrades = [...runUpgrades, upgrade.id];
    setRunUpgrades(newUpgrades);
    /* >= 4, not === 4: Jackpot (rarity 5) is rarer and strictly better
       than Legendary, so it should qualify for "take a Legendary
       upgrade" too — a strict equality check meant the single best
       possible pull in the game was the one pull that DIDN'T count. */
    if (upgrade.rarity >= 4) unlockAch("legendary");
    if (newUpgrades.length >= 10) unlockAch("upgrades_10");
    /* Codex: a lifetime tally of every card ever taken, which is what the
       per-category counts on that screen are derived from. Recorded here
       rather than at the offer, so it counts cards actually TAKEN and not
       cards merely shown — a run where a player turned down every Lucky
       card has taken no luck cards, and the Codex should say so.

       Deliberately not gated on the run surviving: the card is theirs, and
       "how many of these have I ever held" is a question about history, not
       about whether that particular run went well. */
    recordCodexCard(upgrade.id);
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
    const nextSeed = isDaily
      ? dailyRoundSeed(nextRound, DAILY_STREAM.board, dailyRunDateRef.current || new Date())
      : null;
    const nextLevel = generateLevel(
      nextRound, newUpgrades, lastRoundMovesLeft, nextSeed, retriedThisRound,
      isDaily ? dailyTwist : null,
      isDaily ? null : weeklyMutator,
    );
    setLevel(nextLevel);
    setRetriedThisRound(false);
    if (isDaily) {
      persistDailyRun({
        phase: "playing",
        round: nextRound,
        upgrades: newUpgrades,
        genPrevLeft: lastRoundMovesLeft,
        nextPrevLeft: 0,
        tubes: nextLevel.tubes,
        moves: 0,
        bonusMoves: 0,
        combo: 0,
        rounds: dailyRun.rounds,
        totalMoves: dailyRun.totalMoves,
      });
    } else if (canAssist) {
      /* The "Continue" save, written at the same instant the daily writes
         its own. Round boundary, untouched board — see saveNormalRun for why
         it is stored here and not on every pour.

         Gated on canAssist, which is exactly "is a normal run": the daily
         writes its own save in the branch above, and score attack writes none
         at all. That last one is load-bearing rather than incidental — a
         score-attack run resumed from this save would be a run that was
         abandoned and picked back up, which is precisely what the leaderboard
         is not supposed to contain. Score attack's persistence is the finished
         run alone (see recordScoreRun).

         `path` is written rather than re-derived because unlike the daily's
         there is nothing to re-derive FROM: a normal run's opening is the
         player's own pick, it is not a function of anything, and it expires
         after FOCUS_OFFERS picks, so by the time a late run is saved the
         bias may already be over. Restoring the run means restoring the
         decision that was still in force when it was left.

         Not credited to the Codex here either, and for a different reason
         than the daily's: a path is credited once, at the moment it is
         chosen (chooseArchetype), and re-saving it on every round boundary
         would multiply that count by the length of the run.

         mutatorId is what makes the resumed run the SAME run: the board in
         this save was generated under the pinned rule, and every board after
         it has to be too. An id, not the object, because the mutator's hooks
         are functions and JSON drops them (see mutatorById). */
      saveNormalRun({
        round: nextRound,
        upgrades: newUpgrades,
        level: nextLevel,
        lastRoundMovesLeft,
        path: runPath,
        mutatorId: weeklyMutator ? weeklyMutator.id : null,
      });
    }
    Snd.upgrade();
    Music.pulse("upgrade");
  }, [round, runUpgrades, lastRoundMovesLeft, pendingUpgrades, upgradeReady, isDaily, canAssist, retriedThisRound, dailyRun, persistDailyRun, dailyTwist, runPath, weeklyMutator]);

  /* A retry re-rolls the same round from the same seed, so a daily retry
     reproduces the board exactly as it was — and must NOT pick up the weekly
     mutator, or "retry" would quietly change the rules mid-round.

     For a normal run this is where a LIVE run comes back from the dead: the
     loss trigger above clears the Continue save (a run that has ended must
     not be resumable), and this button is the one way to keep playing it. So
     it re-writes the save, or the run would be back on screen with nothing
     behind it — the Exit dialog would promise "your run is saved at the start
     of this round" and be lying, and Home would offer no Continue, and the
     whole run would evaporate on the way out.

     The re-rolled board is a legitimate snapshot for the same reason
     chooseUpgrade's is: it is the start of a round, untouched, with the
     moves counter at zero. `lastRoundMovesLeft` is the run's own — the moves
     left when round-1 was cleared, still feeding this round's Perfect Clear —
     so it is unchanged by a retry, which re-rolls the round rather than
     advancing past it. */
  const retry = useCallback(() => {
    const seed = isDaily
      ? dailyRoundSeed(round, DAILY_STREAM.board, dailyRunDateRef.current || new Date())
      : null;
    const nextLevel = generateLevel(
      round, runUpgrades, lastRoundMovesLeft, seed, false,
      isDaily ? dailyTwist : null,
      isDaily ? null : weeklyMutator,
    );
    setLevel(nextLevel);
    setRetriedThisRound(true);
    /* Re-arming a round is a new attempt, so the previous run's verdict must
       not carry into it. Without this the flag is sticky: die on round 5 with
       best 4 and it is set true, retry, then die on round 5 again — but now
       `round > best` is 5 > 5 and false, so the only writer is skipped and the
       results card claims a "New Personal Best" that was never set. The game
       over which retry is reached has already been dismissed, so nothing else
       resets it; restartRun (1924) does, for every other path. */
    setNewBestThisRun(false);
    /* canAssist, not !isDaily — same gate and same reason as chooseUpgrade's:
       a score-attack retry must not write the normal run's Continue save, or
       the run it is retrying would come back from Home after a loss. */
    if (canAssist) {
      saveNormalRun({
        round,
        upgrades: runUpgrades,
        level: nextLevel,
        lastRoundMovesLeft,
        path: runPath,
        mutatorId: weeklyMutator ? weeklyMutator.id : null,
      });
    }
  }, [round, runUpgrades, lastRoundMovesLeft, isDaily, canAssist, dailyTwist, weeklyMutator, runPath]);

  /* Takes the opening archetype. Deliberately does NOT touch the board: the
     round-1 level was already generated from (round, upgrades) and the
     archetypes only bias the upgrade DRAW, so a path change can never have to
     regenerate anything — which is also why the picker could be an overlay on
     a live board instead of a gate in front of run start.

     Guarded the same way chooseUpgrade is (the offer empties on pick): two
     fast taps would otherwise set two different paths, and the second would
     silently overwrite the first. */
  const chooseArchetype = useCallback((a) => {
    if (!archOffer) return;
    setRunPath(a);
    setArchOfferClosed(false);
    setArchOffer(null);
    recordCodexPath(a.id);
    Snd.upgrade();
    Haptic.light();
  }, [archOffer]);

  const skipArchetype = useCallback(() => setArchOfferClosed(true), []);

  const restartRun = useCallback(() => {
    runTokenRef.current += 1;
    setRound(1);
    setRunUpgrades([]);
    setLastRoundMovesLeft(0);
    setShareImage(null);
    setShared(false);
    /* Normal is the reset default, which is why every abandon path lands back
       here. Score attack re-asserts its own mode on top of this (see the
       `if (score)` branch in startNewGame) — the same relationship
       startFreshNormalRun has with the resume branch. */
    setMode("normal");
    setDailyTwist(null);
    /* The round log is cleared here too, not only in the normal run-start and
       the daily's fresh branch. It is the score-attack scoring input, so a run
       that inherited the previous run's rounds would be scored for them —
       board, HUD and board-list all reading one run while dailyScore()
       counted another. Cheap to reset, and impossible to get wrong by omission. */
    setDailyRun({ rounds: [], totalMoves: 0 });
    setScoreResult(null);
    setRetriedThisRound(false);
    setUndoUsedThisRun(false);
    /* Cleared here too, not just at the game-over trigger: the flag has to
       start false for every run, or a run that never beat the old best
       would inherit the previous run's verdict and the results card would
       claim a record that wasn't set. */
    setNewBestThisRun(false);
    /* Both cleared unconditionally: this is the reset for every path that
       abandons a run (Home, back, Exit, Settings > Reset, and the normal
       run-start below), so a stale archOffer can never be left armed over a
       run that never got to pick one. The normal run-start sets a fresh
       offer right after calling this. */
    setArchOffer(null);
    setArchOfferClosed(false);
    setRunPath(null);
    /* A brand new run takes whatever rule is in force NOW, whatever rule the
       previous run was playing under. The session pin is the same thing on a
       cold start, so this is a no-op in the ordinary case — but it is what
       keeps a run CONTINUED under last week's mutator from leaking that rule
       into the next fresh run, which restartRun is also the reset for (Home,
       back, Exit, Settings > Reset, game-over Start Over). */
    setWeeklyMutator(weekMutator());
    /* Normal-run round 1, so the weekly mutator applies. Not `weeklyMutator`
       but the value just set: setState is async, so the variable still holds
       the PREVIOUS pin at this point in the closure. Calling weekMutator()
       again returns the identical object (it is a pure function of the week),
       so the two agree — and the level is overwritten by the resume path
       anyway when a run is being continued. */
    setLevel(generateLevel(1, [], 0, null, false, null, weekMutator()));
  }, []);

  /* Save best round reached so far. Called at every place the player can
     leave a run WITHOUT losing (Home button, Exit Daily Mode) — losing
     already saves it at the game-over trigger. Deliberately NOT called
     from inside restartRun() itself: Settings > Reset calls restartRun()
     right after setBest(0), and saving here would immediately undo that. */
  const saveBestRound = useCallback(() => {
    /* A daily run records its own best as it clears rounds, and must not
       leak into the main game's. Same for a score run, for the same reason:
       its record is a score (see scoreBest), not a round count. */
    if (canAssist && round > best) {
      setBest(round);
      try { localStorage.setItem(BEST_KEY, String(round)); } catch {}
    }
  }, [round, best, canAssist]);

  /* Single entry point for starting a new run — increments stats safely.
     Used by Home Play, Home Daily, Home Score Attack, and Game Over "Start Over".

     Two booleans rather than the mode string, deliberately: they only ever
     mean "which of the two NON-normal modes is this", and the normal branch
     below already exists as the fallback. Refactoring every one of the ~8
     existing `startNewGame(false)` call sites to a string would buy no
     clarity at those sites and would risk exactly the call site nobody was
     looking at. The comment that used to claim a `mode` parameter here was
     wrong — it described an API this function never had.

     The daily replay guard below is the one branch that genuinely needed a
     positive test: it asks whether this is today's daily, which `daily ===
     false` used to mean by elimination and no longer can — score attack is
     also not-daily. */
  const startNewGame = useCallback((daily = false, score = false) => {
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
    let fresh = null;
    if (daily) {
      fresh = loadDailyState();
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
    /* Daily, attempt still open, and a saved position exists: pick the run
       up where it was left, rather than starting round 1 again. Restarting
       was the hole in "one attempt a day" (the boards are the same for
       everyone, so a player could step out before losing, which records
       nothing, and retry with every board already known). The saved tubes
       are only trusted if they're a real position of the regenerated round;
       otherwise it falls through to a fresh start. */
    let resumed = false;
    if (daily && fresh && fresh.status === "in_progress") {
      const saved = loadDailyRun();
      if (saved) {
        const runDate = new Date();
        const twist = pickDailyTwist(runDate);
        const lvl = generateLevel(
          saved.round, saved.upgrades, saved.genPrevLeft,
          dailyRoundSeed(saved.round, DAILY_STREAM.board, runDate),
          false, twist,
          null,
        );
        if (tubesMatchLevel(saved.tubes, lvl.tubes)) {
          dailyRunDateRef.current = runDate;
          /* Recomputed, not stored: dailyArchetype is a pure function of the
             date, so a resumed run re-derives exactly the path it started
             with. That is also why nothing about the opening pick is written
             to the daily save — there is no state here that could go stale
             against the date, and no field for an older save to be missing. */
          const resumedPath = dailyArchetype(runDate);
          /* Deliberately NOT credited to the Codex here. This attempt already
             recorded its path and its rule when it first started, and
             startNewGame only ever reaches this resume branch downstream of
             that fresh start — so recording again would count one day twice
             for a player who simply left and came back. */
          pendingResumeRef.current = {
            phase: saved.phase,
            tubes: saved.tubes,
            moves: saved.moves,
            bonusMoves: saved.bonusMoves,
            combo: saved.combo,
            pendingUpgrades:
              saved.phase === "upgrade"
                ? pickDailyUpgrades(
                    dailyRoundSeed(saved.round, DAILY_STREAM.upgrades, runDate),
                    twist.id === "feast" ? FEAST_CARD_COUNT : 3,
                    saved.upgrades,
                    resumedPath.cats,
                  )
                : [],
          };
          dailyBestAtStartRef.current = Number.isFinite(saved.bestAtStart) ? saved.bestAtStart : dailyBest;
          setDailyState(fresh);
          setMode("daily");
          setDailyTwist(twist);
          setDailyScoreResult(null);
          setRound(saved.round);
          setRunUpgrades(saved.upgrades);
          setLastRoundMovesLeft(saved.phase === "upgrade" ? saved.nextPrevLeft : saved.genPrevLeft);
          setRetriedThisRound(false);
          setUndoUsedThisRun(false);
          setShareImage(null);
          setShared(false);
          setDailyRun({ rounds: saved.rounds, totalMoves: saved.totalMoves });
          setRunPath(resumedPath);
          setArchOffer(null);
          /* Redundant while a resumed run has no picker at all, but it means
             no run-start path can leave the "dismissed" flag set from an
             earlier run, whatever order the flows are called in. */
          setArchOfferClosed(false);
          setLevel(lvl);
          resumed = true;
        }
      }
    }
    /* Normal run, and there is a save to pick up: resume it. Deliberately
       ABOVE recordGameStart() below, so continuing a run is not counted as
       starting a new one — the same reason the daily's resume is above it
       too. The save is written at every round boundary (chooseUpgrade)
       precisely so this branch has something to restore.

       The one field that is NOT recomputed, because it cannot be, is the
       weekly mutator. Everything else here is a pure function of what was
       saved, but which mutator is in force depends on WHEN the run was
       started, and the save is the only record of that — hence mutatorId
       (see mutatorById). A save with no id at all predates the weekly rules
       and falls back to this week's, which is what such a run was generated
       under in the first place.

       Not credited to the Codex: the path and the mutator were recorded when
       this run first started, and re-recording on every resume would count
       one run once per time it was picked back up. */
    if (!daily && !score) {
      const resume = loadNormalRun();
      if (resume) {
        setMode("normal");
        setDailyTwist(null);
        setDailyScoreResult(null);
        setRound(resume.round);
        setRunUpgrades(resume.upgrades);
        setLastRoundMovesLeft(resume.lastRoundMovesLeft);
        setRetriedThisRound(false);
        setUndoUsedThisRun(false);
        setNewBestThisRun(false);
        setShareImage(null);
        setShared(false);
        setRunPath(resume.path || null);
        /* No picker: the opening decision was already made, and it is stored.
           Re-offering it would either strand the run behind a modal for a
           choice it has already made, or silently overwrite the path its
           later offers were biased by. */
        setArchOffer(null);
        setArchOfferClosed(true);
        /* The restored board is the stored one VERBATIM, not a regenerated
           one. A normal run's level comes from Math.random, so regenerating
           would hand back a different board for a round the player had
           already begun — the exact thing the save-at-round-boundaries design
           exists to prevent. That is also why there is no tubesMatchLevel
           check here, unlike the daily: there is nothing to re-derive this
           board from. */
        setLevel(resume.level);
        setWeeklyMutator(mutatorById(resume.mutatorId) || weekMutator());
        resumed = true;
      }
    }
    if (!resumed) recordGameStart();
    if (!resumed && daily) {
      /* Pin the run to today's date, then seed round 1 the same way every
         later round is seeded (dailyRoundSeed in chooseUpgrade/retry), so
         every daily round is reproducible from date + round alone. */
      const runDate = new Date();
      dailyRunDateRef.current = runDate;
      dailyBestAtStartRef.current = dailyBest;
      const seed = dailyRoundSeed(1, DAILY_STREAM.board, runDate);
      const twist = pickDailyTwist(runDate);
      /* Save "in_progress" state before starting */
      const st =
        fresh && fresh.status === "in_progress"
          ? fresh
          : saveDailyState({ status: "in_progress", startedAt: Date.now(), seed });
      setDailyState(st);
      clearDailyRun();
      syncDailyReminders();
      setMode("daily");
      setDailyTwist(twist);
      setDailyScoreResult(null);
      /* The twist and the path are both stated up front, in one toast rather
         than two back to back: the path is a fixed part of today's puzzle (see
         dailyArchetype) rather than a choice, so it belongs in the same
         briefing as the rule it modifies, not in a separate modal. */
      const path = dailyArchetype(runDate);
      recordCodexTwist(twist.id);
      recordCodexPath(path.id);
      showToast({
        icon: twist.icon,
        color: twist.kind === "curse" ? "var(--danger)" : twist.kind === "mixed" ? "var(--gold)" : "var(--go)",
        title: `Today's twist: ${twist.name}`,
        message: `${twist.desc}\n\nToday's path: ${path.icon} ${path.name} — ${path.desc}`,
        duration: 5200,
      });
      setRound(1);
      setRunUpgrades([]);
      setLastRoundMovesLeft(0);
      setRetriedThisRound(false);
      setUndoUsedThisRun(false);
      setNewBestThisRun(false);
      setShareImage(null);
      setShared(false);
      setDailyRun({ rounds: [], totalMoves: 0 });
      /* The daily's opening path is the day's, not the player's — see
         dailyArchetype for why (a choice here would give two players on the
         same cards different offers). No picker, so the run starts straight
         into round 1; it's named in the toast above, and repeated as a pill on
         the first upgrade screen, which is the first place it actually bites. */
      setRunPath(path);
      setArchOffer(null);
      setArchOfferClosed(false);
      setLevel(generateLevel(1, [], 0, seed, false, twist, null));
    } else if (!resumed) {
      /* Normal run, nothing to continue: the archetype picker over a fresh
         round 1. The board is built by restartRun() and is identical either
         way — it depends only on the round, never on the upgrades — so the
         picker can sit on top of a live board instead of the run start being
         deferred, which is what keeps every existing run-start path below
         untouched. */
      restartRun();
      /* AFTER restartRun, which sets mode back to "normal": that call is the
         reset for every abandon path, so the mode has to be re-asserted on top
         of it rather than before it. Score attack reuses the normal run's
         board, its weekly mutator and its archetype picker verbatim — the
         thing that makes it different is the no-assist rule and what happens
         at the end, not how the rounds are built. */
      if (score) {
        setMode("score");
        setScoreResult(null);
        setScoreTries(bumpScoreTries());
        showToast({
          icon: "🎯",
          color: "var(--accent)",
          title: "Score Attack",
          message: "No undo, no hints. A run counts once you clear a round — how far can you get?",
          duration: 4200,
        });
      }
      setArchOffer(pickArchetypes());
    }
    setScreen("game");
    return true;
  /* `daily`/`score` are this callback's own PARAMETERS and must not appear
     here: a useCallback dependency array is evaluated in the component's
     scope, so listing `score` threw ReferenceError on the first render
     (no such binding exists there) and blanked the whole app. Only captured
     component-scope values belong below. */
  }, [recordGameStart, restartRun, dailyResults, showToast, dailyBest]);

  /* Start a normal run from round 1, DISCARDING any save. The one way to say
     "not that one" now that startNewGame resumes when it can.

     Two call sites need it and both were getting it wrong on their own: the
     game-over card's "Start Over", and the Home Continue card's "New Run".
     Start Over is the sharper of the two — the loss trigger clears the save,
     but the "Retry Round" button above it writes one back (see retry), so a
     player who retried and then pressed Start Over would have been handed
     their own retried run back instead of a new one, which is the exact
     opposite of what the button says. The Home card's "New Run" needs the
     same clear for the same reason, and having one function means the next
     place that needs "fresh, not resumed" cannot forget it.

     Clear BEFORE startNewGame, not after: the resume branch reads the save
     synchronously inside startNewGame, so clearing afterwards would leave one
     frame of the old run on screen. */
  const startFreshNormalRun = useCallback(() => {
    clearNormalRun();
    return startNewGame(false);
  }, [startNewGame]);

  /* Score attack's own "run it again". Distinct from startFreshNormalRun
     because it must NOT touch the normal run's Continue save: a player can
     hold a half-finished normal run and go play score attack, and clearing
     the save on the way in would silently destroy that run to start a mode
     that never intended to interfere with it.

     Score attack has no save of its own to clear either — that absence is
     the mode's contract (see recordScoreRun) — so this is the whole of it:
     fresh run, no resume, nothing else disturbed.

     A score run is also defined by what it does NOT touch: no normal-run save,
     no daily save, no daily state. Global stats and the run-structure
     achievements DO still record — a cleared round is a cleared round — and
     only the assist-dependent no_undo_5 is excluded, by canAssist rather than
     by mode. What is deliberately absent is the normal run's `best` and its
     Continue save, not the profile's history.

     startNewGame(false, true) handles the board, the mode and the round log.
     Everything it doesn't reset for us has to stay put here, and the one that
     needed fixing was clearDailyRun() — it was in this function from the first
     draft, which meant starting a score attack deleted the player's in-progress
     DAILY attempt, the single most destructive thing the new mode could have
     done and entirely invisible from the screen you trigger it on. The daily
     card's "In Progress — resume" would have started answering with a wiped
     run.

     Nothing is cleared and nothing is saved: the score lives only in React
     state until recordScoreRun writes it, which is the no-mid-run-persistence
     rule stated as code rather than as a comment elsewhere. */
  const startFreshScoreRun = useCallback(() => {
    return startNewGame(false, true);
  }, [startNewGame]);

  /* ═══════════ NAVIGATION — Back button infra ═══════════
     Phase 1: only infrastructure. Nothing wired yet.
     Refs hold latest state so popstate handler never goes stale. */

  const navStateRef = useRef({ showSettings: false, showAchievements: false, showCodex: false, screen: "home", confirmDialog: false });
  useEffect(() => {
    navStateRef.current = { showSettings, showAchievements, showCodex, screen, confirmDialog: !!confirmDialog };
  }, [showSettings, showAchievements, showCodex, screen, confirmDialog]);
  /* backFromGameRef: what "back" means while a run is on screen (defined
     further down, next to the HUD Home button's handler, and kept current
     by an effect). exitConfirmedRef: set by the Exit dialog's confirm just
     before it pops history, so the popstate that follows goes straight
     home instead of asking again — navStateRef is stale at that moment
     (see the note in openExitDialog). */
  const backFromGameRef = useRef(null);
  const exitConfirmedRef = useRef(false);

  /* Android hardware back / edge-swipe → same logic as the browser
     popstate handler above. Capacitor WebView does NOT fire popstate on
     the system back gesture by default — the @capacitor/app backButton
     event is the only way to catch it. We translate it into the same
     "pop one layer or exit" behaviour the popstate handler already
     implements, so back means the same thing whether it came from an
     in-app arrow tap, Chrome's hardware back, or an Android edge swipe. */
  useEffect(() => {
    let listener = null;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@capacitor/app");
        const CapApp = mod.App;
        if (!CapApp || !CapApp.addListener) return;
        listener = await CapApp.addListener("backButton", () => {
          const st = navStateRef.current;
          /* A confirm dialog is the one layer that never owns a history
             entry — it deliberately doesn't push one (see the popstate
             handler), and the popstate handler has to re-push a
             compensating entry every time it closes one from a back press.
             Routing it through history.back() from here is what makes back
             fragile: that call is a SILENT no-op once the stack is at its
             floor, and no popstate fires, so nothing closes the dialog and
             the press looks like a dead button. The dialog has no entry to
             consume, so there is nothing to keep in step — just close it. */
          if (st.confirmDialog) {
            setConfirmDialog(null);
            return;
          }
          const anyLayerOpen =
            st.showSettings || st.showAchievements || st.showCodex || st.screen !== "home";
          if (anyLayerOpen) {
            /* Reuse the exact same history machinery: this pushes a
               popstate the existing handler will pick up and use to
               close the topmost layer. */
            try { window.history.back(); } catch {}
          } else {
            /* Nothing on top of Home. minimizeApp() backgrounds the app
               instead of killing it, which is what Android's own back
               behaviour spec asks for (a back press at the root of an app
               should not destroy the user's session) and what a player
               expects — exitApp() here tore the process down outright. */
            try { CapApp.minimizeApp(); } catch { try { CapApp.exitApp(); } catch {} }
          }
        });
        /* Unmounted while the import -- and the plugin call inside it --
           was still in flight: the cleanup has already run and saw
           listener === null, so nothing removed it. Remove it here or it
           stays attached for the rest of the process. */
        if (cancelled) { try { listener.remove(); } catch {} listener = null; }
      } catch {
        /* @capacitor/app not present (web build) — browser back already
           works via popstate there, nothing to install. */
      }
    })();
    return () => {
      cancelled = true;
      if (listener) try { listener.remove(); } catch {}
    };
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
          setShowCodex(false);
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
        if (st.showCodex) { setShowCodex(false); return; }

        /* Nothing else open but not on home — fires when hardware back
           pops the game entry. This used to flip straight to Home, which
           threw the run away with no warning and skipped saveBestRound():
           back from Round 3 left "Best Round" at 0, where the HUD's own
           Home button (dialog, then save) leaves it at 3. Now back does
           what that button does. */
        if (st.screen !== "home") {
          if (exitConfirmedRef.current) { exitConfirmedRef.current = false; setScreen("home"); return; }
          if (backFromGameRef.current) { backFromGameRef.current(); return; }
          setScreen("home");
          return;
        }
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

  /* "Exit to Home?" — shared by the HUD Home button and by hardware/gesture
     back, so the two can't drift apart again. */
  const openExitDialog = () => {
    /* Asked of the disk rather than inferred from `round > 1`, because the
       two stopped being the same thing: a run that lost on round 1 and was
       retried has a save, and telling that player "there's nothing to save"
       would be wrong in the one direction that loses their work. An event
       handler, so this is a fresh read at the moment of the tap and cannot
       go stale against the save. */
    const hasSave = canAssist && !!loadNormalRun();
    /* A score run that has cleared at least one round is a finished result the
       moment the player chooses to stop: there is no resume path, so leaving
       cannot be used to retry anything, and stopping early can only ever score
       LESS than playing on. It used to be discarded here, which meant a player
       who cleared rounds and then tapped Home came back to a card reading
       "Not attempted" — the run simply vanished. Now leaving records it, the
       same way running out of moves does. Read at tap time (event handler). */
    const scoreCleared = isScore ? dailyRun.rounds.length : 0;
    const scoreToRecord = scoreCleared > 0 ? scoreDisplay : 0;
    setConfirmDialog({
      title: "Exit to Home?",
      /* A daily run is saved as it's played and resumes from
         Home, so "will be lost" would be false there (and the
         old, true version of it pushed people to stay in).

         Score attack has no save at all, by design — but that does not make it
         the same situation as a fresh normal run with nothing on disk. This
         mode's entire subject is the score, and the run in hand has never been
         recorded; leaving here throws away the one attempt at the number the
         mode exists to produce. So it says so plainly and in the mode's own
         terms, rather than reusing the normal run's "nothing to save" line and
         letting a player walk away from a good run believing nothing was lost.

         A normal run is saved too, but only at ROUND BOUNDARIES (see
         saveNormalRun), so "saved" would overstate it in the other
         direction — a player who pours a few moves and then leaves has
         lost those moves even though the run itself is intact. The copy
         names the actual boundary rather than rounding either way, and the
         dialog is no longer `danger` for a normal run that has a save,
         because what is being confirmed is no longer a loss. It stays the
         same amber either way: the daily's version is about a resource (one
         attempt a day) and this one is about a small, definite loss, and
         neither is a destructive "are you sure" the red treatment is for. */
      message: isDaily
        ? "Your daily run is saved. Pick it up from Home any time today."
        : isScore && scoreCleared > 0
        ? `Leaving ends this run. Your score of ${scoreToRecord.toLocaleString("en-US")} (${scoreCleared} ${scoreCleared === 1 ? "round" : "rounds"} cleared) will be recorded.`
        : isScore
        ? "No round cleared yet, so this run has no score. Leaving discards it — a run counts once you clear a round."
        : !hasSave
        /* Nothing on disk at all: a run still on its opening round, which has
           not been cleared yet, so no boundary has been written. */
        ? "This run hasn't cleared a round yet, so there's nothing to save. It starts over from round 1."
        : /* The upgrade screen is a different loss, and the save cannot cover
             it. A normal run's NEXT board depends on the card the player is
             about to pick (an Extra Tube changes the board, a moves card
             changes the limit), so there is nothing to save until the pick
             happens — which is exactly why this save is written in
             chooseUpgrade. A daily escapes this because its next board is
             seedable from (date, round) alone.

             So leaving here rewinds to the START of the round they just
             cleared, and "moves made in this round are lost" would be
             badly understating it. */
          phase === "upgrade"
        ? "Your run is saved, but not this clear — the next board depends on the card you'd pick next. You'll pick this round up again from the start."
        : "Your run is saved at the start of this round, and resumes from Home. Moves made in this round are lost.",
      confirmLabel: "Exit",
      /* Danger for both kinds of real loss: a normal run with nothing on disk,
         and any score run (nothing is ever on disk for it). A score run that
         HAS cleared a round is a large number discarded, which is the same
         class of thing a red confirm is for. */
      danger: (isScore && scoreCleared === 0) || (!isDaily && !isScore && !hasSave),
      onConfirm: () => {
        saveBestRound();
        if (scoreCleared > 0 && scoreRecordedTokenRef.current !== runTokenRef.current) {
          scoreRecordedTokenRef.current = runTokenRef.current;
          const result = recordScoreRun(scoreToRecord, scoreCleared);
          setScoreBest(result.best);
          setScoreRuns(loadScoreRuns());
          showToast({
            icon: result.isNew ? "🏆" : "🎯",
            color: "var(--gold)",
            title: result.isNew ? "New High Score!" : "Score recorded",
            message: `${result.score.toLocaleString("en-US")} points · ${scoreCleared} ${scoreCleared === 1 ? "round" : "rounds"} cleared`,
          });
        }
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
           never navigated home).
           exitConfirmedRef tells that popstate this pop is the
           confirmed exit, not a fresh back press to ask about. */
        navStateRef.current = { ...navStateRef.current, confirmDialog: false };
        exitConfirmedRef.current = true;
        /* Belt and braces: if the pop never produces a popstate, don't leave
           the flag armed to swallow the next real back press. */
        setTimeout(() => { exitConfirmedRef.current = false; }, 800);
        setConfirmDialog(null);
        popNav();
      },
    });
  };

  const onHomePress = () => {
    /* The same predicate onBackFromGame uses below, deliberately. The two are
       documented as "shared by the HUD Home button and by hardware/gesture
       back, so the two can't drift apart again" — and had: this one required
       phase === "playing", so at the upgrade screen the HUD Home button
       dropped the run silently while the back button asked about it. That
       was harmless when a normal run could not be saved at all. It is not
       harmless now — the run survives to Home, and the player who walks out
       from the card screen by tapping Home is discarding a cleared round
       without ever being told. */
    const inProgress = phase === "upgrade" || moves > 0 || round > 1;
    if (inProgress) {
      openExitDialog();
    } else {
      saveBestRound();
      restartRun();
      popNav();
    }
  };

  /* Hardware / gesture back while a run is on screen. The press has already
     popped the game's history entry by the time this runs. */
  const onBackFromGame = () => {
    /* Run already over (best saved at the game-over trigger): nothing to lose. */
    if (phase === "gameover") { setScreen("home"); return; }
    const inProgress = phase === "upgrade" || moves > 0 || round > 1;
    if (!inProgress) {
      /* Fresh round 1 with no moves: same as the Home button's no-dialog path. */
      saveBestRound();
      restartRun();
      setScreen("home");
      return;
    }
    /* Put the game's entry back so history and screen stay in step while
       the dialog is up, then ask. Confirming pops it again (openExitDialog). */
    try { window.history.pushState({ page: "game" }, ""); } catch {}
    openExitDialog();
  };
  useEffect(() => { backFromGameRef.current = onBackFromGame; });
  useEffect(() => {
    if (!confirmDialog) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setConfirmDialog(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDialog]);

  const shareDaily = useCallback(async () => {
    try {
      const dr = JSON.parse(localStorage.getItem("cascade:dailyResults") || "{}");
      const streak = computeStreak(dr, shieldedDates);
      const text = buildEmojiGrid(
        dailyRun.rounds, dailyRun.totalMoves, streak, bestStreak,
        dailyKey(dailyRunDateRef.current || new Date()),
        { twist: dailyTwist, score: dailyScore(dailyRun.rounds) },
      );
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
  }, [dailyRun, showToast, shieldedDates, bestStreak, dailyTwist]);

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
    const shareText = `I survived ${round} round${round === 1 ? "" : "s"} in Cascade! Can you beat me?`;
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
          /* Resumes when there is a save, starts fresh when there isn't — see
             startNewGame's normal-run branch. The Continue card below Play
             says which of the two this will do, and its "New Run" button is
             the way to force the second without discarding anything by hand. */
          onPlay={() => { if (startNewGame(false)) pushNav("game"); }}
          onAwards={() => { setShowAchievements(true); pushNav("awards"); }}
          onCodex={() => { setShowCodex(true); pushNav("codex"); }}
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
          dailyPhase={dailyPhase}
          resumeRound={resumeRound}
          /* Per-RUN, not per-session: a cold start resolves this week's rule,
             and a continued run adopts the one its save carries, so the card
             and the boards being played always describe the same rule even if
             the app was left closed across a Monday. */
          weeklyMutator={weekMutator()}
          /* A normal run left mid-way is resumable, and this is the whole of
             that feature's surface on Home: with a save, the card under Play
             offers the round back; without one, nothing here renders and Play
             means "start fresh" like it always did. Deliberately not a
             confirm — resuming is what the player asked for by coming back,
             and the run stays on disk until the next round boundary overwrites
             it, so a mis-tap costs one round boundary, not the run. */
          normalRun={savedNormal}
          /* Only when it DIFFERS from the card above. Printing the same
             mutator twice, 60px apart, on the one screen that already stacks
             three cards, is noise — but printing only the newer one is a lie
             about which rule continuing would actually apply, which is the
             one thing on this screen a player cannot check for themselves. */
          savedMutator={savedNormalMutator}
          savedMutatorIsCurrent={savedNormalMutator === weekMutator()}
          onContinue={() => { if (startNewGame(false)) pushNav("game"); }}
          onNewRun={() => {
            /* Discard-then-start, not just start: onPlay is wired to resume
               when a save exists, so routing this through startNewGame alone
               would pick the very save this button exists to throw away. */
            if (startFreshNormalRun()) pushNav("game");
          }}
          /* Score attack's entry point. pushNav only when the run actually
             starts, matching onDaily/onContinue — startFreshScoreRun can
             return false and the Home screen must stay where it is rather than
             leaving a phantom "game" entry on the back-stack. */
          onScore={() => { if (startFreshScoreRun()) pushNav("game"); }}
          scoreBest={scoreBest}
          scoreRuns={scoreRuns}
          scoreTries={scoreTries}
        />
      )}

      {/* GAME — hidden when on home */}
      {screen === "game" && (
      <div className="screen-transition" style={S.gameRoot}>
      <Particles bursts={particles} />
      <FlyingBalls flights={flights} onDone={removeFlight} />

      {/* Round-clear flash target (see flashClear). Rendered unconditionally,
          at opacity 0, rather than mounted on clear: a node that appears only
          for the animation would be mounted in the same commit that calls
          .animate(), and the ref would still be null at that point. Always
          present and always inert — pointer-events:none, aria-hidden — it
          costs one composited layer and nothing else. The gradient is centred
          on the board (42%, just above centre) rather than the viewport, so
          the brightest part lands where the last tube actually was. */}
      <div
        ref={clearFlashRef}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          pointerEvents: "none",
          opacity: 0,
          background: `radial-gradient(circle at 50% 42%, color-mix(in srgb, ${T.accent} 55%, transparent), transparent 68%)`,
        }}
      />

      {/* Achievement toast — slides down from top. Keyed on the
          achievement id so two unlocks shown back-to-back (the queue
          in unlockAch below) each get their own mount: without a key,
          this div persists across the swap from one achievement to the
          next (same position, same className, React just patches the
          text inside it), so achSlideIn never restarts for anything
          past the first toast in a queue — it would just silently
          change content mid-air with no entrance at all. */}
      {achToast && (() => {
        /* Same two guards as unlockAch: a milestone is an achievement that
           has BOTH a tier and a ceremony entry, and `c` (the ceremony) being
           non-null is what the render keys off. Testing `achToast.tier` on
           its own would let an achievement carrying a tier number with no
           ceremony data get the milestone treatment and the milestone
           styling while still timing out at the default 2.6s. */
        const tier = achToast.tier && STREAK_CEREMONY[achToast.tier] ? achToast.tier : 0;
        const c = tier ? STREAK_CEREMONY[tier] : null;
        return (
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
                /* backgroundColor (longhand), NOT `background`. Tier 3's
                   .achShine supplies a conic-gradient `background-image`, and
                   the inline shorthand would reset background-image while
                   still winning the cascade over the class — silently
                   deleting the shine with no error anywhere. The shorthand is
                   a background *reset*, not just a background colour. */
                backgroundColor: `color-mix(in srgb, ${T.gold} 13.3%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
                /* position: relative so the ring below anchors to the badge
                   itself. It's absolutely positioned, which takes it out of
                   flow — without this it would resolve against the toast card
                   and you would get a ring the width of the whole toast. */
                position: "relative",
              }}
                className={[c ? "achIconBounce" : "", tier >= 3 ? "achShine" : ""].filter(Boolean).join(" ") || undefined}
              >
                {achToast.icon}
                {/* Tier 2+. A separate span rather than a box-shadow on the
                    badge itself: the badge is a flex container, and an
                    absolutely-positioned pseudo-element inside it would be
                    laid out as a flex item, nudging the emoji off-centre as
                    it appeared and disappeared. Out of flow here, it costs
                    the layout nothing. aria-hidden because it carries no
                    information the label doesn't already. */}
                {tier >= 2 && (
                  <span
                    aria-hidden="true"
                    className="achRingPulse"
                    style={{ position: "absolute", inset: -3, borderRadius: 14, pointerEvents: "none" }}
                  />
                )}
              </div>
              <div>
                {/* The eyebrow says what KIND of thing this is before the
                    name is read. A generic "Achievement" over "Week Streak"
                    makes the player do the classification themselves; the
                    label is the same string the player would otherwise have
                    to infer from the icon. */}
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.15em", color: T.goldText, textTransform: "uppercase" }}>{c ? c.label : "Achievement"}</div>
                <div className={c ? "achNameShimmer" : undefined} style={{ fontSize: 14, fontWeight: 900, color: T.ink }}>{achToast.name}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* canAssist, not !isDaily — the hint and the undo button were two more
          places a score run would have been handed assists it must not have
          (see canAssist). Their counters are already zero in that mode, so
          they would have rendered as permanently-dimmed 54px targets rather
          than simply being absent. */}
      {canAssist && (
      <button
        onClick={useHint}
        disabled={hintLeft <= 0 || phase !== "playing"}
        aria-label="Show hint"
        style={{
          position: "fixed", right: 16, bottom: 92,
          width: 54, height: 54, borderRadius: 18,
          background: T.card,
          border: "1.5px solid " + (hintLeft > 0 && phase === "playing" ? `color-mix(in srgb, ${T.go} 40%, transparent)` : T.line),
          color: hintLeft > 0 && phase === "playing" ? T.goText : T.muted,
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
      {canAssist && (
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

      <div style={S.hud} className={isDaily || isScore ? "hud-daily" : undefined}>
        <div>
          <div style={S.roundLabel} className="hud-round">
            {isDaily && <span style={S.dailyBadge}>DAILY</span>}
            {/* Score attack's badge is the one mode marker that genuinely has
                to be on screen: it is the mode where the assists are missing
                and the run is unsaveable, so a player who arrived here from
                Home mid-scroll is being told the rules of the run they're
                looking at. The daily's badge is inherited from an existing
                style and stays as it is. */}
            {isScore && <span style={S.dailyBadge}>SCORE</span>}
            Round {round}
          </div>
          {/* Three different records behind one word, so they can't share a
              ternary. A score run's personal best is a SCORE, not a round
              count — showing `best` there would tell a player chasing 12,000
              points that their record was 9, and would silently mix the two
              modes' records. */}
          <div style={S.colorCount}>
            {level.colorCount} colors · best{" "}
            {isDaily ? dailyBest : isScore ? scoreBest.toLocaleString("en-US") : best}
          </div>
        </div>
        <div className="hud-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...S.movesLabel, color: movesLeft <= 3 ? T.danger : T.ink }}>
              {Math.max(0, movesLeft)} <span className="hud-moves-sub" style={S.movesSub}>{movesLeft === 1 ? "move left" : "moves left"}</span>
            </div>
          </div>
          <button onClick={onHomePress} aria-label="Home" style={{
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
        {comboCount >= 2 ? (
          <div ref={comboBadgeRef} style={{ ...S.comboBadge, marginBottom: 0 }} className="comboPop" key={comboCount}>
            <span style={S.comboFlame}>🔥</span>
            <span style={S.comboText}>{comboCount}× combo</span>
          </div>
        ) : isDaily && dailyTwist ? (
          /* Today's twist lives in this same fixed slot while no combo is
             showing, so it costs no layout. Tap it to read the rule again. */
          (() => {
            const c = dailyTwist.kind === "curse" ? T.danger : dailyTwist.kind === "mixed" ? T.gold : T.go;
            return (
              <button
                onClick={() =>
                  showToast({
                    icon: dailyTwist.icon,
                    color: c,
                    title: `Today's twist: ${dailyTwist.name}`,
                    message: dailyTwist.desc,
                    duration: 4200,
                  })
                }
                aria-label={`Today's twist: ${dailyTwist.name}. ${dailyTwist.desc}`}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  height: 28, padding: "0 12px", borderRadius: 14,
                  background: `color-mix(in srgb, ${c} 14%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${c} 40%, transparent)`,
                  color: T.ink, cursor: "pointer",
                  fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 800,
                  letterSpacing: "0.01em",
                }}
              >
                <span aria-hidden="true">{dailyTwist.icon}</span>
                <span>{dailyTwist.name}</span>
              </button>
            );
          })()
        ) : null}
      </div>

      {runUpgrades.length > 0 && (
        <div style={S.upgradeStrip}>
          {runUpgrades.slice(-10).map((id, i) => {
            const u = UPGRADES.find((x) => x.id === id);
            if (!u) return null;
            const r = RARITY[u.rarity];
            return (
              /* Keyed on the ABSOLUTE index, not the window index i: the
                 slice(-10) shifts every time an 11th upgrade is taken, so key 0
                 refers to a different card than it did a render ago and React
                 patches the existing node's icon in place instead of mounting
                 the new one. Absolute index is stable for a given upgrade.
                 key={id} would NOT be right here — duplicates are legal across
                 a run (maxOwnedPerOffer caps per OFFER, not per run). */
              <div key={runUpgrades.length - 10 + i} title={u.name} style={{
                width: 26, height: 26, borderRadius: 8,
                background: rarityTint(r.color, 13.3), border: `1.5px solid ${rarityTint(r.color, 40)}`,
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
      <div ref={boardRef} style={{ ...S.board, paddingTop: Math.ceil(tubeDims(tubeScale).ballH + LIFT_GAP + 4), paddingBottom: 8 }}>
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
        <div ref={tubesRowRef} style={{ ...S.tubesRow, position: "relative", rowGap: Math.ceil(tubeDims(tubeScale).ballH + LIFT_GAP + 10) }}>
          {tubes.map((balls, i) => (
            <Tube key={i} idx={i} balls={balls} selected={selected === i} hintFrom={hint && hint.from === i} hintTo={hint && hint.to === i} solved={isTubeSolved(balls)} onClick={(e) => onTubeClick(i, e)} onPointerDown={(e) => onTubePointerDown(i, e)} onPointerMove={onTubePointerMove} onPointerUp={onTubePointerUp} onPointerCancel={onTubePointerCancel} disabled={phase !== "playing"} scale={tubeScale} colorBlind={colorBlindOn} landing={landing && landing.tube === i ? landing : null} />
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
          <div style={{ ...S.ovCard, maxWidth: 360 }} className="popIn" role="dialog" aria-modal="true" aria-label={`Round ${round} cleared. Choose an upgrade`}>
            <div style={{ ...S.ovTitle, color: T.go, fontSize: 22 }}>Round {round} Cleared!</div>
            <div style={{ ...S.ovSub, marginBottom: (jackpotNearMiss || shownArch || offerPity) ? 8 : 20 }}>Choose an upgrade</div>
            {jackpotNearMiss && (
              <div style={{
                fontSize: 12, fontWeight: 800, textAlign: "center",
                color: rarityText(RARITY[5].color), marginBottom: 12,
              }}>
                ✨ A Jackpot almost dropped!
              </div>
            )}
            {/* Run status — what the draw is doing, said out loud. Every line
                here is derived from runUpgrades and runPath (see shownArch
                and pityActive above), so it can't claim something the draw
                didn't actually do.

                The pill changes meaning while the opening bias is live: it
                names the player's own pick and counts cards inside it, so a
                run that opened as Momentum and then took three Luck cards
                is told "Path ×0" rather than being congratulated on a Luck
                build it never chose. Once FOCUS_OFFERS picks are behind it,
                it switches to the organic leader.

                The pity line matters most: an offer guaranteed to hold a
                Rare looks identical to one that rolled one by chance, and a
                player who can't tell those apart has no reason to believe
                either. Uses the same fade-up class as the cards below, which
                globalStyles already pauses under data-reduce-motion — so this
                is still legible with motion off, it just arrives without
                sliding. */}
            {(shownArch || offerPity) && (
              <div className="fade-up" style={{ animationDelay: "60ms", display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
                {shownArch && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    height: 24, padding: "0 10px", borderRadius: 12,
                    background: `color-mix(in srgb, ${T.accent} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${T.accent} 34%, transparent)`,
                    fontSize: 11, fontWeight: 900, color: T.ink,
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}
                    title={openingPath
                      ? `${runPath.name} path — ${shownArch.count} matching card${shownArch.count === 1 ? "" : "s"} so far`
                      : `${CATEGORY[shownArch.cat].name} — ${shownArch.count} card${shownArch.count === 1 ? "" : "s"} in this run`}
                  >
                    <span aria-hidden="true">{openingPath ? runPath.icon : CATEGORY[shownArch.cat].icon}</span>
                    {openingPath ? "Path" : CATEGORY[shownArch.cat].name} ×{shownArch.count}
                  </span>
                )}
                {offerPity && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    height: 24, padding: "0 10px", borderRadius: 12,
                    background: rarityTint(RARITY[3].color, 13.3),
                    border: `1px solid ${rarityTint(RARITY[3].color, 40)}`,
                    fontSize: 11, fontWeight: 900,
                    color: rarityText(RARITY[3].color),
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    <span aria-hidden="true">✨</span>
                    Rare+ guaranteed
                  </span>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingUpgrades.map((u, i) => (
                <div key={u.id} className="fade-up" style={{ animationDelay: `${100 + i * 80}ms`, pointerEvents: upgradeReady ? undefined : "none" }}>
                  <UpgradeCard upgrade={u} onPick={() => chooseUpgrade(u)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Opening archetype picker ──
          Rendered as its own overlay rather than by deferring the run start,
          because the round-1 board is already built and identical either way
          (it depends only on the round). Gated on phase === "playing" so it
          can never sit on top of the upgrade overlay, and on !showTutorial so
          the two first-run modals can't stack — the tutorial is a more
          important first impression than a build choice. */}
      {archOffer && !archOfferClosed && phase === "playing" && !showTutorial && (
        <div style={S.overlay} className="fade-in">
          <div
            style={{ ...S.ovCard, maxWidth: 380 }}
            className="popIn"
            role="dialog"
            aria-modal="true"
            aria-label="Choose your opening path"
          >
            <div style={{ ...S.ovTitle, color: T.accent, fontSize: 22 }}>Choose Your Path</div>
            <div style={{ ...S.ovSub, marginBottom: 18 }}>
              Favors two upgrade types for your first few picks. Not a lock —
              the cards you take decide where this run actually goes.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {archOffer.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => chooseArchetype(a)}
                  className="fade-up"
                  style={{
                    animationDelay: `${i * 70}ms`,
                    display: "flex", alignItems: "center", gap: 12, width: "100%",
                    padding: "12px 14px", textAlign: "left", cursor: "pointer",
                    /* An inset surface, not T.card: S.ovCard's own background IS
                       T.card, so a card-coloured button would be a
                       border-on-nothing with no fill to tell it apart from the
                       panel it sits on. This is the same inset mix S.ovStat
                       uses for the game-over stat cells. */
                    background: `color-mix(in srgb, ${T.bg} 50.2%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${T.accent} 26%, transparent)`,
                    borderRadius: 16, boxSizing: "border-box",
                    color: T.ink,
                    fontFamily: "'Nunito', sans-serif",
                    /* Press feedback is a filter, not a transform: .fade-up
                       animates `transform` on this very node, and an inline
                       transform would outrank the keyframe and either cancel
                       the stagger-in or be cancelled by it. filter is
                       untouched by that animation, so the two compose.

                       Written imperatively rather than through React state
                       because a state-backed :active would re-render the whole
                       Cascade tree on every pointerdown, and here the board is
                       already built and idle — no reason to spend a render.
                       globalStyles.js is off-limits this pass, so there is no
                       .upgCard-equivalent class to hand this to. */
                    transition: `filter ${D.tQuick}`,
                    WebkitAppearance: "none",
                    appearance: "none",
                  }}
                  onPointerDown={(e) => { e.currentTarget.style.filter = "brightness(0.88)"; }}
                  onPointerUp={(e) => { e.currentTarget.style.filter = ""; }}
                  onPointerCancel={(e) => { e.currentTarget.style.filter = ""; }}
                  onPointerLeave={(e) => { e.currentTarget.style.filter = ""; }}
                  aria-label={`${a.name}. ${a.desc}`}
                >
                  <span aria-hidden="true" style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    background: `color-mix(in srgb, ${T.accent} 12%, transparent)`,
                  }}>{a.icon}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>{a.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.muted, lineHeight: 1.35 }}>{a.desc}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
                      color: T.accent, textTransform: "uppercase",
                    }}>{a.cats.map((c) => CATEGORY[c].name).join(" + ")}</span>
                  </span>
                </button>
              ))}
            </div>
            {/* Escape does the same thing. The pick is deliberately optional:
               a run with no focus is a plain run, and forcing a choice here
               would put a build decision in front of a player who just opened
               the app — a decision they have no information to make yet. */}
            <button type="button" onClick={skipArchetype} style={S.ghost}>
              Just start playing
            </button>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div style={S.overlay} className="fade-in">
          <div style={{ ...S.ovCard, maxWidth: 380 }} className="popIn" role="dialog" aria-modal="true" aria-label="Run over">
            {!shareImage ? (
              <>
                {/* Big display — each piece stages in on its own beat
                    (icon → title → number → badges → stats) instead of the
                    whole result landing on screen in one flat block, since
                    this is the one moment that sums up the entire run.

                    Which number it counts is mode-dependent, and that decision
                    lives in the count-up effect above; here it is only
                    formatted.

                    The record flag is scoreResult.isNew rather than
                    newBestThisRun, because that flag is deliberately NOT set
                    in a score run (the main game's round record is not this
                    mode's) — reusing it would mean a score run could never
                    claim a record even when it set one. The icon and the
                    banner read the same expression as each other rather than
                    each keeping its own, so the trophy and the "New High
                    Score" can never disagree about whether one happened. */}
                <div style={{ ...S.ovIconCircle, animationDelay: "80ms" }} className="fade-up">
                  <span style={{ fontSize: 32 }}>{(isDaily ? dailyNewBest : isScore ? scoreResult?.isNew : newBestThisRun) ? "🏆" : "💥"}</span>
                </div>
                <div style={{ ...S.ovTitle, animationDelay: "140ms" }} className="fade-up">Run Over</div>
                <div style={{ ...S.ovBigNum, animationDelay: "200ms" }} className="fade-up">
                  {isScore ? gameOverDisplayRound.toLocaleString("en-US") : gameOverDisplayRound}
                </div>
                <div style={{ ...S.ovBigLabel, animationDelay: "240ms" }} className="fade-up">
                  {isScore
                    ? "SCORE"
                    : isDaily
                    ? (todayRounds === 0 ? "NO ROUNDS CLEARED" : todayRounds === 1 ? "ROUND CLEARED" : "ROUNDS CLEARED")
                    : (round === 1 ? "ROUND SURVIVED" : "ROUNDS SURVIVED")}
                </div>
                {(isDaily ? dailyNewBest : isScore ? scoreResult?.isNew : newBestThisRun) && (
                  <div style={{ ...S.ovNewBest, animationDelay: "320ms" }} className="fade-up">
                    {isDaily ? "✨ New Daily Best" : isScore ? "✨ New High Score" : "✨ New Personal Best"}
                  </div>
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
                    {/* The mode's own record, not the main game's. `best` is a
                        round count and is deliberately NOT advanced by a score
                        run (see saveBestRound), so printing it here would show
                        a player chasing 12,000 points a record of "9" and imply
                        they were nine rounds from anything. */}
                    <div style={S.ovStat}>
                      <div style={S.ovStatNum}>
                        {isDaily ? dailyBest : isScore ? scoreBest.toLocaleString("en-US") : best}
                      </div>
                      <div style={S.ovStatLabel}>{isDaily ? "Daily Best" : isScore ? "Best Score" : "Best"}</div>
                    </div>

                  <div style={S.ovStat}>
                    <div style={S.ovStatNum}>{finalMovesLeft}</div>
                    <div style={S.ovStatLabel}>Moves Left</div>
                  </div>
                </div>
                {/* Score attack gets a SECOND row, not a replacement one. The
                    three cells above are inherited from the other two modes and
                    only one of them means anything here (Upgrades); the two
                    that matter — rounds cleared, and where this run landed —
                    have nowhere to go in a row that's already full. Overwriting
                    cells would have meant losing Moves Left, which is the last
                    few moves a player was clinging to when the run ended.

                    Rounds CLEARED, read off the round log, not `round - 1`: the
                    log is what the score was computed from, so the two figures
                    on the card come from one place.
                    "N of M" rather than a bare rank, because the board below is
                    the player's own runs — a rank on its own would look like a
                    position among other people. */}
                {isScore && (
                  <div style={{ ...S.ovStats, animationDelay: "420ms" }} className="fade-up">
                    <div style={S.ovStat}>
                      <div style={S.ovStatNum}>{dailyRun.rounds.length}</div>
                      <div style={S.ovStatLabel}>Rounds Cleared</div>
                    </div>
                    <div style={S.ovStat}>
                      <div style={S.ovStatNum}>
                        {scoreResult && scoreResult.rank <= scoreRuns.length ? `${scoreResult.rank}/${scoreRuns.length}` : "—"}
                      </div>
                      <div style={S.ovStatLabel}>On Board</div>
                    </div>
                    <div style={S.ovStat}>
                      <div style={S.ovStatNum}>{round}</div>
                      <div style={S.ovStatLabel}>Reached Round</div>
                    </div>
                  </div>
                )}

                {isDaily ? (
                  <>
                    {dailyScoreResult && (
                      <div
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px 16px", marginBottom: 12, borderRadius: 14,
                          background: `color-mix(in srgb, ${T.bg} 50.2%, transparent)`,
                          border: `1px solid ${T.edge}`,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: T.muted, textTransform: "uppercase" }}>
                            Daily score
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800, color: T.gold, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
                            {dailyScoreResult.score.toLocaleString("en-US")}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 11, fontWeight: 800, color: dailyScoreResult.isNew ? T.goText : T.muted }}>
                          {dailyScoreResult.isNew
                            ? "New personal best!"
                            : `Best ${dailyScoreResult.best.toLocaleString("en-US")}`}
                          {dailyTwist && (
                            <div style={{ fontWeight: 700, color: T.muted, marginTop: 3 }}>
                              {dailyTwist.icon} {dailyTwist.name}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <DailyBoard rounds={todayRounds} dateSeed={dateToSeed(dailyRunDateRef.current || new Date())} />
                    <div style={{ marginBottom: 12 }}>
                      <FriendCompare rounds={todayRounds} dateKey={dailyKey(dailyRunDateRef.current || new Date())} />
                    </div>
                    <div style={{
                      textAlign: "center",
                      padding: "16px 20px",
                      /* rgba(255, 194, 75, …) is the DARK theme's --gold
                         copied in as a literal, so on Light this card kept
                         the dark amber wash and border while its own label
                         below (T.gold → var(--gold)) had already flipped.
                         Same "hardcoded to one theme" bug already fixed in
                         icons/index.jsx. */
                      background: "color-mix(in srgb, var(--gold) 8%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--gold) 25%, transparent)",
                      borderRadius: 14,
                      marginBottom: 12,
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 900,
                        letterSpacing: "0.14em",
                        color: T.gold,
                        textTransform: "uppercase",
                      }}>
                        {staleDailyRun ? "That was yesterday's puzzle" : "One attempt only"}
                      </div>
                      <div style={{
                        fontSize: 15, fontWeight: 800,
                        color: T.ink, marginTop: 6,
                      }}>
                        {staleDailyRun ? "Today's new puzzle is ready" : "Come back tomorrow"}
                      </div>
                      {!staleDailyRun && (
                        <>
                          <div style={{
                            fontSize: 11, fontWeight: 600,
                            color: T.muted, marginTop: 6,
                          }}>
                            Next puzzle in
                          </div>
                          <DailyResetCountdown />
                        </>
                      )}
                    </div>
                    <button style={{ ...S.ghost, color: T.accent }} onClick={shareDaily}>📋 Share Result</button>
                    {/* setMode("normal"), not the old setIsDaily(false): the
                        daily's run is over, but leaving `mode` on "daily" would
                        make the NEXT normal run start as a daily one. */}
                    <button style={S.ghost} onClick={() => { popNav(); setMode("normal"); }}>← Home</button>
                  </>
                ) : isScore ? (
                  <>
                    {/* The local board. Own runs only — there is no network and
                        no shared service behind this game (leaderboard.js
                        generates the daily's board on-device for the same
                        reason), so "leaderboard" here means the player's own
                        finished runs, which is what makes it honest: every row
                        on it is a run that was played to its end.

                        Deliberately the player's own rows and nothing else. A
                        field of invented rivals would read as other people,
                        and in the one mode whose entire claim is that its
                        number is real, inventing names next to it would
                        undercut the whole thing.

                        Cap is 8 (SCORE_RUNS_MAX) and rows are fixed height, so
                        this can't grow into a scroll on a 320x568 screen —
                        the same budget the Home screen's cards are tuned to. */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 900, letterSpacing: "0.12em",
                        color: T.muted, textTransform: "uppercase", marginBottom: 8,
                      }}>
                        Your runs
                      </div>
                      {scoreRuns.length === 0 ? (
                        <div style={{
                          padding: "14px 16px", borderRadius: 14,
                          background: `color-mix(in srgb, ${T.bg} 50.2%, transparent)`,
                          border: `1px solid ${T.edge}`,
                          fontSize: 12, fontWeight: 600, color: T.muted, textAlign: "center",
                        }}>
                          {scoreResult
                            ? "That run didn't clear a round, so there's no score to record yet. A run counts once you've cleared at least one."
                            : "No runs yet. Finish a run to put a score here."}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {scoreRuns.map((r, i) => {
                            /* Identity, not score and not position. The board
                               is sorted best-first, so this run is NOT
                               necessarily row 0 — a run that finished below the
                               player's previous best lands at the bottom, and
                               highlighting the top row there would have
                               pointed at a different run entirely. And two runs
                               can genuinely tie on score, so matching on the
                               score would highlight both of them. `ts` is the
                               one field that identifies exactly one entry, which
                               is why recordScoreRun returns it. */
                            const mine = !!scoreResult && r.ts === scoreResult.ts;
                            return (
                              <div
                                key={`${r.ts}-${r.score}-${r.round}`}
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "space-between",
                                  padding: "9px 14px", borderRadius: 12,
                                  background: mine
                                    ? `color-mix(in srgb, ${T.accent} 13%, transparent)`
                                    : `color-mix(in srgb, ${T.bg} 50.2%, transparent)`,
                                  border: `1px solid ${mine ? `color-mix(in srgb, ${T.accent} 40%, transparent)` : T.edge}`,
                                }}
                              >
                                <span style={{
                                  fontSize: 12, fontWeight: 900, color: mine ? T.accent : T.muted,
                                  width: 22, flexShrink: 0, fontVariantNumeric: "tabular-nums",
                                }}>
                                  {i + 1}
                                </span>
                                <span style={{
                                  fontSize: 11, fontWeight: 600, color: T.muted, flex: 1, textAlign: "left",
                                }}>
                                  {r.round} {r.round === 1 ? "round" : "rounds"} cleared
                                  {mine && (
                                    <span style={{ color: T.accent, fontWeight: 800 }}> · this run</span>
                                  )}
                                </span>
                                <span style={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: 13, fontWeight: 800, color: T.gold,
                                  fontVariantNumeric: "tabular-nums",
                                }}>
                                  {r.score.toLocaleString("en-US")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* Run It Again is the only action, and there is deliberately
                        no "Retry Round". Retry re-rolls the round you died on and
                        lets the run continue with its accumulated score intact —
                        so a score run could always be pushed past the round it
                        failed, and every row above would stop meaning "a run
                        that ended". Run It Again starts clean.

                        startFreshScoreRun, not startFreshNormalRun: this must not
                        touch the normal run's Continue save, which is the one
                        save that has to survive playing here.

                        Score attack gets no Share Result. The share card is
                        built from rounds survived and colours, neither of which
                        is this mode's number — a player posting one would be
                        posting a figure for a different mode under a heading
                        that says "score". */}
                    <button style={S.primary} onClick={startFreshScoreRun}>Run It Again</button>

                    {/* The Home button in the HUD is under this overlay, so without
                        this the only way out was the OS back gesture. Same route
                        back does (see onBackFromGame).

                        popNav, NOT restartRun first: this run has already been
                        recorded, and restartRun resets the round log that
                        produced the score. The mode itself does not need
                        resetting here either — the screen is Home from here, and
                        the next run's start path re-asserts its own mode (see
                        startNewGame's normal branch). The other three modes can
                        leave `mode` set, because their next start also sets it;
                        relying on that is why this is not a one-line
                        setMode("normal") that would only look tidier. */}
                    <button style={S.ghost} onClick={popNav}>← Home</button>
                  </>
                ) : (
                  <>
                    <button style={S.primary} onClick={retry}>Retry Round {round}</button>
                    <button style={{ ...S.ghost, color: T.accent }} onClick={generateShare}>📤 Share Result</button>
                    {/* No pushNav: this replaces the run that is already on
                        screen, so the existing "game" history entry still
                        describes exactly one game in the stack. Pushing
                        again would leave back needing two presses to leave. */}
                    <button style={S.ghost} onClick={startFreshNormalRun}>Start Over</button>
                    {/* The Home button in the HUD is under this overlay, so without
                        this the only way out was the OS back gesture, or Start Over
                        and then Home. Same route back does (see onBackFromGame). */}
                    <button style={S.ghost} onClick={popNav}>← Home</button>
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

      {/* Toast announcer. The visible toast below is aria-hidden to avoid duplicate announcements. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1, height: 1,
          margin: -1, padding: 0, border: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {toast && [toast.title, toast.message].filter(Boolean).join(": ")}
      </div>

      {/* In-app toast */}
      {toast && (
        <div
          aria-hidden="true"
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
            /* var() + hex-alpha is INVALID: toast.color is always a
               "var(--gold)"-style string, so appending "55" built
               "var(--gold)55", which is not a colour at all. An invalid
               value invalidates the WHOLE declaration — so the border
               vanished, and so did both halves of the box-shadow, since a
               single bad value in a comma list kills the entire property.
               color-mix() is the theme-aware way to get the same alpha
               (0x55/255 = 33.3%, 0x33/255 = 20%). Same idiom as the daily
               twist button below. */
            border: `1.5px solid color-mix(in srgb, ${toast.color || "var(--accent)"} 33.3%, transparent)`,
            borderRadius: 18,
            padding: "13px 20px 13px 14px",
            boxShadow: `0 12px 40px color-mix(in srgb, ${toast.color || "var(--accent)"} 20%, transparent), 0 4px 12px rgba(0,0,0,0.35)`,
            fontFamily: "'Inter', system-ui, sans-serif",
            maxWidth: 380,
            width: "100%",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: "transparent",
              border: `1.5px solid color-mix(in srgb, ${toast.color || "var(--accent)"} 33.3%, transparent)`,
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
                  /* pre-line, not pre-wrap: the only message that carries a
                     newline is the daily briefing (twist + the day's path),
                     and without this its two paragraphs collapse into one
                     run-on line. pre-line would also let a future long
                     message hard-wrap against this card's maxWidth instead of
                     overflowing it. Every existing single-line message renders
                     identically, since pre-line only acts on \n. */
                  whiteSpace: "pre-line",
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
              message: "This deletes your best score, stats, achievements, streaks, codex history, and tutorial.",
              confirmLabel: "Reset",
              danger: true,
              onConfirm: () => {
                try {
                  localStorage.removeItem(BEST_KEY);
                  localStorage.removeItem("cascade:dailyBest");
                  localStorage.removeItem(DAILY_BEST_SCORE_KEY);
                  localStorage.removeItem("cascade:tutorialSeen");
                  localStorage.removeItem("cascade:stats");
                  localStorage.removeItem("cascade:dailyResults");
                  /* These two were bare string literals duplicating exported
                     constants (DAILY_STATE_KEY / DAILY_RUN_KEY), so the reset
                     had a second place to forget to update the day either key
                     changed. The remaining literals here have no constant to
                     point at yet and are left alone deliberately rather than
                     half-migrated. */
                  localStorage.removeItem(DAILY_STATE_KEY);
                  localStorage.removeItem(DAILY_RUN_KEY);
                  localStorage.removeItem("cascade:hasPlayedOnce");
                  /* The title says ALL progress, but these three used to survive it: Profile
                     still showed the old Best Streak and every unlocked achievement, and a
                     leftover shield record stopped a new one being granted that month. */
                  localStorage.removeItem(ACH_KEY);
                  localStorage.removeItem(BEST_STREAK_KEY);
                  localStorage.removeItem(SHIELD_KEY);
                } catch {}
                /* The Codex's lifetime counts are a record of the same history
                   as the achievements just cleared, so they go with them. It
                   gets its own call rather than a raw removeItem because
                   clearCodex owns the key name — a literal here would be a
                   second place to forget to update the day that key changes. */
                clearCodex();
                /* The Continue-your-run save (cascade:normalRun) was never
                   removed here, so it was the one piece of gameplay state that
                   survived "Reset All Progress?" — a player who reset and then
                   reinstalled or tapped Continue got their old run back, from a
                   screen that had just promised them everything was gone. It
                   gets the same treatment as the Codex rather than a literal
                   removeItem, since clearNormalRun owns the key name and the
                   paired in-memory state has no setter to clear. */
                clearNormalRun();
                setAchievements([]);
                setBestStreak(0);
                setShieldedDates([]);
                 setBest(0);
                 setDailyBest(0);
                 setDailyBestScore(0);
                 setDailyScoreResult(null);
                 /* Score attack's standings, the same three-part treatment the
                    daily just got: keys off disk, then the live state, so the
                    Home card and the game-over board both read empty the
                    instant Reset is confirmed rather than after a reload.
                    Both keys go rather than only the best, because the runs
                    list is the record — keeping eight old scores next to a
                    Best of 0 would be a worse inconsistency than either. */
                 try {
                   localStorage.removeItem(SCORE_BEST_KEY);
                   localStorage.removeItem(SCORE_RUNS_KEY);
                   localStorage.removeItem(SCORE_TRIES_KEY);
                 } catch {}
                 setScoreTries(0);
                 setScoreBest(0);
                 setScoreRuns([]);
                 setScoreResult(null);

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
                /* Reset has to LAND on Home, not just wipe the data.
                   restartRun() only rebuilds the run (round 1, fresh
                   level) — it never touches `screen` or `phase`. That
                   was invisible while Reset was only reachable from Home,
                   but the Settings gear sits in the game HUD too (it does
                   setShowSettings(true) + pushNav("settings")), so Reset
                   is reachable from inside a live run. Confirming it there
                   left screen: "game" with a brand-new round-1 board and
                   the old run's phase still stacked on top: a "Run Over"
                   card over a board nobody ever played, or stale upgrade
                   cards over a level that no longer matches them. The
                   How-to-Play modal just above compounded it by opening a
                   Home-screen concept on top of a game board. So this
                   clears the run-phase overlays and navigates home, the
                   same way openExitDialog's onConfirm does. */
                setPhase("playing");
                setScreen("home");
                setShowSettings(false);
                setShowAchievements(false);
                setPendingUpgrades([]);
                setJackpotNearMiss(false);
                setComboCount(0);
                /* navStateRef is written by hand, for the same reason
                   openExitDialog's does: the ref-sync effect does NOT flush
                   before history.back()'s popstate fires in the same tick,
                   so without it the popstate still reads showSettings:true,
                   takes the "just close the settings layer" branch and
                   returns — which would leave Settings open on top of the
                   Home screen this just navigated to, and the back stack a
                   step ahead of the UI. */
                navStateRef.current = {
                  ...navStateRef.current,
                  confirmDialog: false,
                  showSettings: false,
                  showAchievements: false,
                  showCodex: false,
                  screen: "home",
                };
                popNav();
                setConfirmDialog(null);
              },
            });
          }}
          onClose={() => popNav()}
          onShowTutorial={() => setShowTutorial(true)}
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

      {/* Codex — same shape as the Profile screen above: mounted while the
          exit transition plays, closed by popping the history entry rather
          than by clearing the flag (popNav is what actually routes through
          the popstate handler, so hardware back and the on-screen arrow stay
          one mechanism instead of two that can disagree). */}
      {codexExit.shouldRender && (
        <CodexScreen
          closing={codexExit.closing}
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
      {/* Tapping the dim area outside the card (or pressing Escape, see the
          effect near openExitDialog) cancels, as the back-button handler's
          own comment always said it did. Destructive confirms are red. */}
       {confirmDialog && (
         <div
           style={S.overlay}
           onClick={(e) => {
             if (e.target !== e.currentTarget) return;
             if (performance.now() - confirmOpenedAtRef.current < CONFIRM_SCRIM_GUARD_MS) return;
             setConfirmDialog(null);
           }}
         >
           <div
             style={{ ...S.ovCard, maxWidth: 340 }}
             role="alertdialog"
             aria-modal="true"
             aria-label={confirmDialog.title}
             aria-describedby="confirm-dialog-message"
             tabIndex={-1}
             ref={(el) => {
               /* Move focus to the Cancel button for danger (least-destructive default),
                  or to the confirm action otherwise; run once when the dialog opens. */
               if (el && !el.dataset.focused) {
                 el.dataset.focused = "1";
                 const cancel = el.querySelector('button:last-of-type');
                 const confirmBtn = el.querySelector('button:first-of-type');
                 const target = confirmDialog.danger ? cancel : confirmBtn;
                 target?.focus?.({ preventScroll: true });
                 /* Simple focus trap while this dialog is mounted. */
                 const nodes = Array.from(el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
                 if (nodes.length) {
                   const first = nodes[0], last = nodes[nodes.length - 1];
                   el.addEventListener('keydown', (ev) => {
                     if (ev.key === 'Tab') {
                       if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
                       else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
                     }
                   });
                 }
               }
             }}
           >
             <div style={{ ...S.ovTitle, fontSize: 20 }}>{confirmDialog.title}</div>
             <div id="confirm-dialog-message" style={{ ...S.ovSub, marginBottom: 20 }}>{confirmDialog.message}</div>
             <button style={confirmDialog.danger ? S.primaryDanger : S.primary} onClick={confirmDialog.onConfirm}>
               {confirmDialog.confirmLabel || "Confirm"}
             </button>
             <button style={confirmDialog.danger ? S.cancelOutline : S.ghost} onClick={() => setConfirmDialog(null)}>Cancel</button>
           </div>
         </div>
       )}

      {screenShield && <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 400 }} />}
    </div>
  );
}

