import React, { useState, useCallback, useEffect, useRef } from "react";
import { T, D, MAX_HEIGHT, COLORS, BEST_KEY, ACH_KEY, DAILY_KEY, PLAYED_KEY, ACHIEVEMENTS, RARITY, UPGRADES } from "./constants";
import {
  sumMoveBonus, getLuckyChance, getComboEvery, getMegaEvery,
  pickRandomUpgrades, isTubeSolved, canPour, pour, isSolved,
  shuffle, mulberry32, dailyKey, dateToSeed, computeStreak,
  applyAutoSort, generateLevel,
  loadDailyState, saveDailyState, clearDailyState,
  msUntilNextDaily, formatCountdown, pickDailyUpgrades,
} from "./gameLogic";
import { S } from "./theme";
import { Snd, buzz, setVibe } from "./sound";
import Particles from "./Particles";
import Tube from "./Tube";
import UpgradeCard from "./UpgradeCard";
import HomeScreen from "./HomeScreen";
import AchievementsScreen from "./AchievementsScreen";
import Tutorial from "./Tutorial";
import SettingsScreen from "./screens/SettingsScreen";












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

/* ═══════════  SHARE CARD  ═══════════ */

function estimateRank(moves, rounds) {
  if (rounds < 1 || moves < 1) return { label: "Complete" };
  const avg = moves / rounds;
  if (avg <= 4) return { label: "Top 5%" };
  if (avg <= 5) return { label: "Top 12%" };
  if (avg <= 6) return { label: "Top 25%" };
  if (avg <= 7.5) return { label: "Top 40%" };
  if (avg <= 9) return { label: "Top 60%" };
  return { label: "Top 80%" };
}

function buildEmojiGrid(rounds, totalMoves, streak) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = ["CASCADE Daily " + today, ""];
  (rounds || []).forEach((r) => {
    const eff = r.moveLimit > 0 ? r.moves / r.moveLimit : 0.7;
    let sq = "\uD83D\uDFE9";
    if (eff > 0.75) sq = "\uD83D\uDFE5";
    else if (eff > 0.55) sq = "\uD83D\uDFE8";
    lines.push(sq + "  R" + r.round + " - " + r.moves + " moves");
  });
  lines.push("");
  lines.push("Total: " + totalMoves + " moves");
  if (streak > 0) lines.push("Streak: " + streak);
  lines.push("");
  lines.push("cascade-main-rho.vercel.app");
  return lines.join("\n");
}

function buildShareCard({ round, upgrades, best }) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const hasLS = "letterSpacing" in ctx;
    const sp = (v) => { if (hasLS) ctx.letterSpacing = v; };

    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const sans = (s, w) => (w || 900) + " " + s + "px 'Plus Jakarta Sans', system-ui, sans-serif";
    const body = (s, w) => (w || 700) + " " + s + "px 'Inter', system-ui, sans-serif";
    const mono = (s, w) => (w || 800) + " " + s + "px 'JetBrains Mono', ui-monospace, monospace";

    const bg = ctx.createLinearGradient(0, 0, 0, 1920);
    bg.addColorStop(0, "#05070F");
    bg.addColorStop(1, "#0A0F1F");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1920);

    const g1 = ctx.createRadialGradient(540, 200, 50, 540, 200, 900);
    g1.addColorStop(0, "rgba(76, 141, 255, 0.22)");
    g1.addColorStop(1, "rgba(76, 141, 255, 0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, 1080, 1100);

    const g2 = ctx.createRadialGradient(540, 1750, 50, 540, 1750, 800);
    g2.addColorStop(0, "rgba(255, 194, 75, 0.10)");
    g2.addColorStop(1, "rgba(255, 194, 75, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 950, 1080, 970);

    ctx.textAlign = "center";

    ctx.fillStyle = "#EAF0FF";
    ctx.font = sans(88);
    ctx.fillText("CASCADE", 540, 280);

    ctx.fillStyle = "#7A85A8";
    ctx.font = body(24, 800);
    sp("10px");
    ctx.fillText("ROGUELIKE SORT", 540, 338);
    sp("0px");

    const pillY = 480;
    const pillH = 420;

    ctx.save();
    ctx.shadowColor = "rgba(76, 141, 255, 0.15)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = "rgba(76, 141, 255, 0.06)";
    rr(140, pillY, 800, pillH, 48);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(76, 141, 255, 0.32)";
    ctx.lineWidth = 2.5;
    rr(140, pillY, 800, pillH, 48);
    ctx.stroke();

    ctx.fillStyle = "#7A85A8";
    ctx.font = body(22, 900);
    sp("8px");
    ctx.fillText("ROUNDS SURVIVED", 540, pillY + 88);
    sp("0px");

    ctx.save();
    ctx.shadowColor = "rgba(255, 255, 255, 0.15)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#EAF0FF";
    ctx.font = mono(240);
    ctx.fillText(String(round), 540, pillY + 350);
    ctx.restore();

    let cursorY = pillY + pillH + 40;

    if (best > 0) {
      const badgeW = 420;
      const badgeH = 88;
      const badgeX = (1080 - badgeW) / 2;

      ctx.fillStyle = "rgba(255, 194, 75, 0.10)";
      rr(badgeX, cursorY, badgeW, badgeH, 44);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 194, 75, 0.35)";
      ctx.lineWidth = 2;
      rr(badgeX, cursorY, badgeW, badgeH, 44);
      ctx.stroke();

      ctx.fillStyle = "#FFC24B";
      ctx.font = body(28, 900);
      sp("4px");
      ctx.fillText("BEST " + String(best), 540, cursorY + 57);
      sp("0px");

      cursorY = cursorY + badgeH + 60;
    } else {
      cursorY = pillY + pillH + 80;
    }

    if (upgrades.length > 0) {
      ctx.fillStyle = "#7A85A8";
      ctx.font = body(20, 900);
      sp("6px");
      ctx.fillText(upgrades.length + " UPGRADES COLLECTED", 540, cursorY);
      sp("0px");

      const items = upgrades.slice(-8);
      const PER_ROW = 4;
      const CHIP = 130;
      const GAP = 20;
      const chipsY = cursorY + 40;

      items.forEach((id, i) => {
        const u = UPGRADES.find((x) => x.id === id);
        if (!u) return;
        const rColor = (RARITY && RARITY[u.rarity]) ? RARITY[u.rarity].color : "#8592BC";
        const row = Math.floor(i / PER_ROW);
        const col = i % PER_ROW;
        const itemsInRow = Math.min(PER_ROW, items.length - row * PER_ROW);
        const rowW = itemsInRow * CHIP + (itemsInRow - 1) * GAP;
        const rowStartX = (1080 - rowW) / 2;
        const x = rowStartX + col * (CHIP + GAP);
        const y = chipsY + row * (CHIP + GAP);

        ctx.fillStyle = "rgba(15, 21, 40, 0.75)";
        rr(x, y, CHIP, CHIP, 32);
        ctx.fill();
        ctx.strokeStyle = rColor + "80";
        ctx.lineWidth = 2.5;
        rr(x, y, CHIP, CHIP, 32);
        ctx.stroke();

        ctx.font = body(52);
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#EAF0FF";
        ctx.fillText(u.icon, x + CHIP / 2, y + CHIP / 2);
        ctx.textBaseline = "alphabetic";
      });
    }

    const footY = 1560;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(180, footY);
    ctx.lineTo(900, footY);
    ctx.stroke();

    ctx.fillStyle = "#4C8DFF";
    ctx.font = sans(38);
    ctx.fillText("Play Cascade", 540, footY + 70);

    ctx.fillStyle = "#7A85A8";
    ctx.font = body(20, 700);
    ctx.fillText("on Google Play", 540, footY + 118);

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("[CASCADE] Share card failed:", err);
    return null;
  }
}


/* ═══════════  COMPONENTS  ═══════════ */

/* ═══════════  MAIN  ═══════════ */

export default function Cascade() {
  const [round, setRound] = useState(1);
  const [theme, setTheme] = useState("dark");   /* "dark" | "light" | "system" */
  const [stats, setStats] = useState({ gamesPlayed: 0, totalRounds: 0, totalMoves: 0, highestCombo: 0 });
  const [isDaily, setIsDaily] = useState(false);
  const [dailyState, setDailyState] = useState(null);   /* daily challenge state machine */
  const [dailyCountdown, setDailyCountdown] = useState(0);   /* ms until next */
  const [toast, setToast] = useState(null);
  const [dailyRun, setDailyRun] = useState({ rounds: [], totalMoves: 0 });
  const [confirmDialog, setConfirmDialog] = useState(null);
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
    } catch {}
  }, []);

  /* Countdown to next UTC midnight — updates every second */
  useEffect(() => {
    const tick = () => {
      const ms = msUntilNextDaily();
      setDailyCountdown(ms);
      /* Day rolled over — refresh state */
      if (ms <= 1000) {
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
  const [runUpgrades, setRunUpgrades] = useState([]);
  const [pendingUpgrades, setPendingUpgrades] = useState([]);
  const [level, setLevel] = useState(() => generateLevel(1, [], 0));
  const [tubes, setTubes] = useState(level.tubes);
  const [moves, setMoves] = useState(0);
  const [bonusMoves, setBonusMoves] = useState(0);
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("playing");
  const [comboCount, setComboCount] = useState(0);
  const [undoLeft, setUndoLeft] = useState(2);
  /* Full snapshot of the board before each pour. Undo pops the latest one.
     Only the tubes need saving — moves / bonus / combo all revert together
     with the snapshot so the counter stays honest. */
  const [snapshots, setSnapshots] = useState([]);
  const [hintLeft, setHintLeft] = useState(2);
  const [hint, setHint] = useState(null);
  const [shake, setShake] = useState(0);
  const [lastRoundMovesLeft, setLastRoundMovesLeft] = useState(0);
  /* Shown only on the game-over overlay. Distinct from lastRoundMovesLeft
     (which is the moves left when the last round was *cleared* and feeds
     Perfect Clear). On a loss, "moves left" was still reporting the number
     from the previous clear — three or four — when the real value is 0. */
  const [finalMovesLeft, setFinalMovesLeft] = useState(0);
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
  const [soundOn, setSoundOn] = useState(true);
  const [vibeOn, setVibeOn] = useState(true);

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
      /* Tutorial has its own key so it never shows twice — even if the player
         never loses (so best stays 0), and even across app reinstalls. */
      const t = localStorage.getItem("cascade:tutorialSeen");
      try {
        const a = localStorage.getItem(ACH_KEY);
        if (a) setAchievements(JSON.parse(a));
      } catch {}
      try {
        const dr = localStorage.getItem("cascade:dailyResults");
        if (dr) setDailyResults(JSON.parse(dr));
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
    setPhase("playing");
  }, [level]);

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(0), 300);
    return () => clearTimeout(t);
  }, [shake]);

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
      setAchToast(meta);
      setTimeout(() => setAchToast(null), 2600);
    }
  }, []);

  const spawnParticles = useCallback((x, y, color) => {
    const id = Date.now() + Math.random();
    const seed = Math.random() * Math.PI;
    setParticles((p) => [...p, { id, x, y, color, seed }]);
    setTimeout(() => setParticles((p) => p.filter((q) => q.id !== id)), 600);
  }, []);

  const onTubeClick = useCallback((idx, e) => {
    if (phase !== "playing") return;
    Snd.unlock();

    if (selected === null) {
      if (tubes[idx].length === 0) return;
      Snd.select();
      setSelected(idx);
      return;
    }
    if (selected === idx) { setSelected(null); return; }

    if (canPour(tubes, selected, idx)) {
      /* Snapshot BEFORE the pour lands, so undo has something to restore. */
      setSnapshots((s) => [...s, { tubes: tubes.map((t) => [...t]), moves, bonusMoves, comboCount }]);
      const beforeLen = tubes[idx].length;
      const next = pour(tubes, selected, idx);
      const movedCount = next[idx].length - beforeLen;
      const newCombo = comboCount + 1;
      setTubes(next);
      setSelected(null);
      Snd.pour(movedCount);
      if (!hasPlayedOnce) {
        setHasPlayedOnce(true);
        try { localStorage.setItem("cascade:hasPlayedOnce", "1"); } catch {}
      }
      buzz(8);

      // Particle burst at destination
      if (e) {
        const rect = e.currentTarget.getBoundingClientRect();
        spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, COLORS[next[idx][next[idx].length - 1]] || T.accent);
      }

      let bonus = 0;
      const luckyChance = getLuckyChance(runUpgrades);
      if (luckyChance > 0 && Math.random() < luckyChance) bonus += 1;
      const comboEvery = getComboEvery(runUpgrades);
      if (comboEvery && newCombo % comboEvery === 0) bonus += 1;
      const megaEvery = getMegaEvery(runUpgrades);
      if (megaEvery && newCombo % megaEvery === 0) bonus += 2;

      setComboCount(newCombo);
      const newMovesUsed = moves + 1;
      recordMoves(1);
      recordCombo(newCombo);
      const newBonus = bonusMoves + bonus;
      setMoves(newMovesUsed);
      if (bonus > 0) {
        setBonusMoves(newBonus);
        setTimeout(() => Snd.bonus(), 120);
        /* Fire a floating "+N" so the player can actually see the bonus
           they just earned — before this the extra moves were invisible
           and the only signal was the sound. */
        const id = Date.now() + Math.random();
        setBonusPops((p) => [...p, { id, text: `+${bonus}` }]);
        setTimeout(() => setBonusPops((p) => p.filter((q) => q.id !== id)), 900);
      }

      const newMovesLeft = level.moveLimit + newBonus - newMovesUsed;

      if (isSolved(next)) {
        const remainingAtClear = newMovesLeft;
        recordRound();
        /* Daily completion — mark state + increment streak */
        if (isDaily) {
          if (round > best) {
            setBest(round);
            try { localStorage.setItem(BEST_KEY, String(round)); } catch {}
          }
          setDailyRun((prev) => ({
            rounds: [...prev.rounds, { round, moves: newMovesUsed, moveLimit: level.moveLimit }],
            totalMoves: prev.totalMoves + newMovesUsed,
          }));
          const st = saveDailyState({
            status: "completed",
            completedAt: Date.now(),
            movesUsed: newMovesUsed,
            movesLeft: remainingAtClear,
          });
          setDailyState(st);
          /* Save streak day */
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
          setPendingUpgrades(
            isDaily ? pickDailyUpgrades(dateToSeed() + round + 1) : pickRandomUpgrades(3)
          );
          setPhase("upgrade");
          Snd.clear();
          buzz(30);
        }, 250);
        /* Achievement triggers — fired after the transition is queued */
        unlockAch("first_clear");
        if (round + 1 >= 10) unlockAch("round_10");
        if (round + 1 >= 25) unlockAch("round_25");
        if (round + 1 >= 50) unlockAch("round_50");
        if (newCombo >= 10) unlockAch("combo_10");
      } else if (newMovesLeft <= 0) {
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
            });
            setDailyState(st);
          }

          setPhase("gameover");
          Snd.fail();
          buzz(60);
        }, 250);
      }
    } else {
      setShake((s) => s + 1);
      buzz(15);
      setSelected(null);
      setComboCount(0);
    }
  }, [tubes, selected, phase, moves, bonusMoves, comboCount, level, runUpgrades, round, best, spawnParticles, unlockAch, isDaily, dailyResults, hasPlayedOnce, recordRound, recordMoves, recordCombo, dailyState]);

  const useHint = useCallback(() => {
    if (hintLeft <= 0) return;
    if (phase !== "playing") return;
    for (let from = 0; from < tubes.length; from++) {
      if (tubes[from].length === 0) continue;
      if (tubes[from].length === MAX_HEIGHT && tubes[from].every((c) => c === tubes[from][0])) continue;
      for (let to = 0; to < tubes.length; to++) {
        if (canPour(tubes, from, to)) {
          setHint({ from, to, key: Date.now() });
          setHintLeft((h) => h - 1);
          Snd.select();
          buzz(12);
          setTimeout(() => setHint(null), 1600);
          return;
        }
      }
    }
  }, [hintLeft, phase, tubes]);

  const undo = useCallback(() => {
    if (undoLeft <= 0) return;
    if (snapshots.length === 0) return;
    if (phase !== "playing") return;
    const last = snapshots[snapshots.length - 1];
    setSnapshots((s) => s.slice(0, -1));
    setTubes(last.tubes);
    setMoves(last.moves);
    setBonusMoves(last.bonusMoves);
    setComboCount(last.combo);
    setSelected(null);
    setUndoLeft((u) => u - 1);
    Snd.select();
    buzz(10);
  }, [undoLeft, snapshots, phase]);

  const chooseUpgrade = useCallback((upgrade) => {
    /* Guard against a double-tap racing through two upgrade cards before
       the overlay unmounts. pendingUpgrades is cleared the instant the
       first pick lands, so the second tap can never fire. */
    if (pendingUpgrades.length === 0) return;
    const newUpgrades = [...runUpgrades, upgrade.id];
    setRunUpgrades(newUpgrades);
    if (upgrade.rarity === 4) unlockAch("legendary");
    if (newUpgrades.length >= 10) unlockAch("upgrades_10");
    /* Reset the combo indicator here as well as in the level effect — the
       effect runs a tick later, and for that one frame the old combo badge
       would still be on screen while the new board was being built. */
    setComboCount(0);
    setPendingUpgrades([]);
    const nextRound = round + 1;
    setRound(nextRound);
    /* Daily boards must be identical for every player on a given date.
       Without a per-round seed here, only round 1 was deterministic —
       round 2 onward silently fell back to Math.random, so "today's
       daily challenge" was actually a different board for everyone
       past the first round. */
    const nextSeed = isDaily ? dateToSeed() + nextRound : null;
    setLevel(generateLevel(nextRound, newUpgrades, lastRoundMovesLeft, nextSeed));
    Snd.upgrade();
  }, [round, runUpgrades, lastRoundMovesLeft, pendingUpgrades, isDaily]);

  const retry = useCallback(() => {
    const seed = isDaily ? dateToSeed() + round : null;
    setLevel(generateLevel(round, runUpgrades, lastRoundMovesLeft, seed));
  }, [round, runUpgrades, lastRoundMovesLeft, isDaily]);

  const restartRun = useCallback(() => {
    setRound(1);
    setRunUpgrades([]);
    setLastRoundMovesLeft(0);
    setShareImage(null);
    setShared(false);
    setIsDaily(false);
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
    /* Daily replay prevention — block if already completed/failed today */
    if (daily) {
      /* Check BOTH new state machine AND legacy dailyResults */
      const fresh = loadDailyState();
      const legacyDone = !!dailyResults[dailyKey()];
      const isCompleted = (fresh && fresh.status === "completed") || legacyDone;
      const isFailed = fresh && fresh.status === "failed";

      if (isCompleted || isFailed) {
        if (fresh) setDailyState(fresh);
        showToast({
          icon: isCompleted ? "✓" : "⚠",
          color: isCompleted ? "var(--go)" : "var(--gold)",
          title: isCompleted ? "Already Completed" : "One Attempt Used",
          message: "Come back tomorrow",
        });
        return;
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
      setIsDaily(true);
      setRound(1);
      setRunUpgrades([]);
      setLastRoundMovesLeft(0);
      setShareImage(null);
      setShared(false);
      setDailyRun({ rounds: [], totalMoves: 0 });
      setLevel(generateLevel(1, [], 0, seed));
    } else {
      restartRun();
    }
    setScreen("game");
  }, [recordGameStart, restartRun, dailyResults, showToast]);

  /* ═══════════ NAVIGATION — Back button infra ═══════════
     Phase 1: only infrastructure. Nothing wired yet.
     Refs hold latest state so popstate handler never goes stale. */

  const navStateRef = useRef({ showSettings: false, showAchievements: false, screen: "home" });
  useEffect(() => {
    navStateRef.current = { showSettings, showAchievements, screen };
  }, [showSettings, showAchievements, screen]);

  useEffect(() => {
    const handler = (e) => {
      try {
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
      const streak = computeStreak(dr);
      const text = buildEmojiGrid(dailyRun.rounds, dailyRun.totalMoves, streak);
      if (navigator.share) {
        await navigator.share({ title: "Cascade Daily", text });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast({ icon: "C", color: "var(--accent)", title: "Copied!", message: "Paste to share" });
      }
    } catch (err) {
      if (err && err.name !== "AbortError") console.warn("Share failed:", err);
    }
  }, [dailyRun, showToast]);

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
    try {
      const blob = await (await fetch(shareImage)).blob();
      const file = new File([blob], "cascade-score.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Cascade",
          text: `I survived ${round} rounds in Cascade! Can you beat me?`,
        });
        setShared(true);
      } else {
        // Fallback: download
        const a = document.createElement("a");
        a.href = shareImage;
        a.download = "cascade-score.png";
        a.click();
        setShared(true);
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    }
  }, [shareImage, round]);

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* HOME — visible when screen === "home" */}
      {screen === "home" && (
        <HomeScreen
          onPlay={() => startNewGame(false)}
          onAwards={() => { setShowAchievements(true); pushNav("awards"); }}
          onDaily={() => startNewGame(true)}
          onSettings={() => { setShowSettings(true); pushNav("settings"); }}
          dailyResults={dailyResults}
          computeStreak={computeStreak}
          dailyKey={dailyKey}
          hasPlayedOnce={hasPlayedOnce}
        />
      )}

      {/* GAME — hidden when on home */}
      {screen === "game" && (<>
      <Particles bursts={particles} />

      {/* Achievement toast — slides down from top */}
      {achToast && (
        <div style={{
          position: "fixed", top: 60, left: 0, right: 0,
          display: "flex", justifyContent: "center",
          pointerEvents: "none", zIndex: 200,
        }} className="achSlide">
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: T.card,
            border: `1.5px solid ${T.gold}66`,
            borderRadius: 16,
            padding: "12px 18px",
            boxShadow: `0 12px 40px ${T.gold}44, 0 4px 12px rgba(0,0,0,0.4)`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${T.gold}22`,
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
          border: "1.5px solid " + (hintLeft > 0 && phase === "playing" ? T.go + "66" : T.line),
          color: hintLeft > 0 && phase === "playing" ? T.go : T.muted,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: hintLeft > 0 && phase === "playing" ? "pointer" : "default",
          opacity: hintLeft <= 0 || phase !== "playing" ? 0.4 : 1,
          fontFamily: "'Nunito', sans-serif",
          zIndex: 30,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>💡</span>
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
          border: `1.5px solid ${undoLeft > 0 && snapshots.length > 0 ? T.accent + "66" : T.line}`,
          color: undoLeft > 0 && snapshots.length > 0 ? T.accent : T.muted,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: undoLeft > 0 && snapshots.length > 0 ? "pointer" : "default",
          boxShadow: undoLeft > 0 && snapshots.length > 0 ? `0 6px 20px ${T.accent}33` : "none",
          opacity: undoLeft <= 0 || snapshots.length === 0 ? 0.4 : 1,
          fontFamily: "'Nunito', sans-serif",
          zIndex: 30,
          transition: "all 200ms cubic-bezier(.2,1.1,.3,1)",
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>↶</span>
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
            textShadow: `0 2px 12px ${T.gold}88, 0 0 4px rgba(0,0,0,0.8)`,
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
                  setScreen("home");
                  setConfirmDialog(null);
                },
              });
            } else {
              saveBestRound();
              restartRun();
              setScreen("home");
            }
          }} aria-label="Home" style={{
            width: 34, height: 34, borderRadius: 12,
            background: T.tubeBg, border: `1px solid ${T.tubeEdge}`,
            color: T.muted, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>←</button>
          <button onClick={() => { setShowSettings(true); pushNav("settings"); }} aria-label="Settings" style={{
            width: 34, height: 34, borderRadius: 12,
            background: T.tubeBg, border: `1px solid ${T.tubeEdge}`,
            color: T.muted, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>⚙️</button>
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
      {comboCount >= 2 && (
        <div style={S.comboBadge} className="comboPop" key={comboCount}>
          <span style={S.comboFlame}>🔥</span>
          <span style={S.comboText}>{comboCount}× combo</span>
        </div>
      )}

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

      <div style={{ ...S.board, transform: shake ? "translateX(-8px)" : "translateX(0)", transition: "transform 60ms ease" }}>
        <div style={S.tubesRow}>
          {tubes.map((balls, i) => (
            <Tube key={i} balls={balls} selected={selected === i} hintFrom={hint && hint.from === i} hintTo={hint && hint.to === i} solved={isTubeSolved(balls)} onClick={(e) => onTubeClick(i, e)} disabled={phase !== "playing"} scale={tubeScaleFor(tubes.length)} />
          ))}
        </div>
      </div>

      <div style={S.footer}>
        {phase === "playing" && (
          <div style={S.hint}>{selected === null ? "Tap a tube to pick it up" : "Tap a destination tube"}</div>
        )}
      </div>

      {phase === "upgrade" && pendingUpgrades.length > 0 && (
        <div style={S.overlay}>
          <div style={{ ...S.ovCard, maxWidth: 360 }}>
            <div style={{ ...S.ovTitle, color: T.go, fontSize: 22 }}>Round {round} Cleared!</div>
            <div style={{ ...S.ovSub, marginBottom: 20 }}>Choose an upgrade</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingUpgrades.map((u) => (
                <UpgradeCard key={u.id} upgrade={u} onPick={() => chooseUpgrade(u)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div style={S.overlay}>
          <div style={{ ...S.ovCard, maxWidth: 380 }}>
            {!shareImage ? (
              <>
                {/* Big round display */}
                <div style={S.ovIconCircle}>
                  <span style={{ fontSize: 32 }}>{round >= best && round > 1 ? "🏆" : "💥"}</span>
                </div>
                <div style={S.ovTitle}>Run Over</div>
                <div style={S.ovBigNum}>{round}</div>
                <div style={S.ovBigLabel}>ROUNDS SURVIVED</div>
                {round >= best && round > 1 && (
                  <div style={S.ovNewBest}>✨ New Personal Best</div>
                )}

                {/* Stats grid */}
                <div style={S.ovStats}>
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
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 16, fontWeight: 800,
                        color: T.gold, marginTop: 4,
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.02em",
                      }}>
                        {formatCountdown(dailyCountdown)}
                      </div>
                    </div>
                    <button style={{ ...S.ghost, color: T.accent }} onClick={shareDaily}>📋 Share Result</button>
                    <button style={S.ghost} onClick={() => { setScreen("home"); setIsDaily(false); }}>← Home</button>
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
      </>)}

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

      {showSettings && (
        <SettingsScreen
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
          onReset={() => {
            setConfirmDialog({
              title: "Reset All Progress?",
              message: "This deletes your best score, stats, and tutorial.",
              confirmLabel: "Reset",
              onConfirm: () => {
                try {
                  localStorage.removeItem(BEST_KEY);
                  localStorage.removeItem("cascade:tutorialSeen");
                  localStorage.removeItem("cascade:stats");
                  localStorage.removeItem("cascade:dailyResults");
                  localStorage.removeItem("cascade:dailyState");
                  localStorage.removeItem("cascade:dailyRun");
                  localStorage.removeItem("cascade:hasPlayedOnce");
                } catch {}
                setBest(0);
                setStats({ gamesPlayed: 0, totalRounds: 0, totalMoves: 0, highestCombo: 0 });
                restartRun();
                popNav();
                setConfirmDialog(null);
              },
            });
          }}
          onAwards={() => setShowAchievements(true)}
          onClose={() => popNav()}
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

      {showAchievements && (
        <AchievementsScreen
          achievements={achievements}
          stats={stats}
          best={best}
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

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=Inter:wght@600;700;800;900&family=JetBrains+Mono:wght@700;800&family=Nunito:wght@600;800;900&display=swap');

/* ═══════════ THEME VARIABLES ═══════════ */
:root[data-theme="dark"] {
  --bg-0: #04060D;
  --bg-1: #0A0F1F;
  --bg-2: #121A31;
  --glass: rgba(15, 21, 40, 0.72);
  --glass-elevated: rgba(20, 27, 50, 0.88);
  --glass-modal: rgba(10, 15, 31, 0.94);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-active: rgba(255, 255, 255, 0.16);
  --text: #EAF0FF;
  --text-sub: #7A85A8;
  --text-dim: #4A5578;
  --accent: #4C8DFF;
  --accent-soft: rgba(76, 141, 255, 0.35);
  --accent-grad: linear-gradient(135deg, #5A9BFF 0%, #3B7BF0 100%);
  --accent-glow: 0 12px 32px rgba(76, 141, 255, 0.4);
  --gold: #FFC24B;
  --gold-soft: rgba(255, 194, 75, 0.35);
  --gold-glow: 0 12px 32px rgba(255, 194, 75, 0.35);
  --go: #22C58A;
  --go-soft: rgba(34, 197, 138, 0.4);
  --go-glow: 0 12px 32px rgba(34, 197, 138, 0.35);
  --danger: #FF5C7A;
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.35);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 20px 48px rgba(0, 0, 0, 0.55);
  --card: #141B32;
  --ink: #EAF0FF;
  --muted: #7A85A8;
  --line: #222E4C;
  --edge: rgba(140, 170, 255, 0.10);
  --tube-bg: rgba(255, 255, 255, 0.04);
  --tube-edge: rgba(255, 255, 255, 0.10);
  --tube-highlight: rgba(255, 255, 255, 0.08);
  --bg-grad: radial-gradient(120% 80% at 50% 30%, #121A31 0%, #0A0F1F 70%);
  --line-strong: rgba(255, 255, 255, 0.12);
  --overlay-bg: rgba(5, 7, 15, 0.85);
  --nav-bg: rgba(10, 15, 31, 0.85);
  --nav-border: rgba(10, 15, 31, 0.9);
  color-scheme: dark;
}

:root[data-theme="light"] {
  --bg-0: #F2F4FA;
  --bg-1: #FFFFFF;
  --bg-2: #F7F8FC;
  --glass: rgba(255, 255, 255, 0.72);
  --glass-elevated: rgba(255, 255, 255, 0.88);
  --glass-modal: rgba(255, 255, 255, 0.96);
  --glass-border: rgba(15, 23, 42, 0.08);
  --glass-border-active: rgba(15, 23, 42, 0.16);
  --text: #0F172A;
  --text-sub: #64748B;
  --text-dim: #94A3B8;
  --accent: #2563EB;
  --accent-soft: rgba(37, 99, 235, 0.28);
  --accent-grad: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
  --accent-glow: 0 12px 32px rgba(37, 99, 235, 0.28);
  --gold: #D97706;
  --gold-soft: rgba(217, 119, 6, 0.28);
  --gold-glow: 0 12px 32px rgba(217, 119, 6, 0.25);
  --go: #059669;
  --go-soft: rgba(5, 150, 105, 0.28);
  --go-glow: 0 12px 32px rgba(5, 150, 105, 0.25);
  --danger: #DC2626;
  --shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.08);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.10);
  --shadow-lg: 0 20px 48px rgba(15, 23, 42, 0.12);
  --card: #FFFFFF;
  --ink: #0F172A;
  --muted: #64748B;
  --line: #E2E8F0;
  --edge: rgba(15, 23, 42, 0.08);
  --tube-bg: rgba(15, 23, 42, 0.06);
  --tube-edge: rgba(15, 23, 42, 0.18);
  --tube-highlight: rgba(255, 255, 255, 0.5);
  --bg-grad: radial-gradient(120% 80% at 50% 30%, #FFFFFF 0%, #EDF1F7 70%);
  --line-strong: rgba(15, 23, 42, 0.12);
  --overlay-bg: rgba(15, 23, 42, 0.35);
  --nav-bg: rgba(255, 255, 255, 0.88);
  --nav-border: rgba(15, 23, 42, 0.10);
  color-scheme: light;
}

/* Smooth theme transition */
html, body {
  transition: background-color 280ms cubic-bezier(0.4, 0, 0.2, 1),
              color 280ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes achSlideIn {
  0% { opacity: 0; transform: translateY(-30px); }
  60% { transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
.achSlide { animation: achSlideIn 400ms cubic-bezier(.16,1.1,.3,1); }

html, body, #root {
  background: #0A0F1F;
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'cv11', 'ss01', 'ss03';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
button { transition: transform 200ms cubic-bezier(.2,1.1,.3,1); }
button:active:not(:disabled) { transform: scale(0.97); }
@keyframes tutIn {
  0% { opacity: 0; transform: scale(0.92) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.tutIn { animation: tutIn 340ms cubic-bezier(.16,1,.3,1); }
@keyframes bonusPopAnim {
  0% { opacity: 0; transform: translateY(10px) scale(0.6); }
  25% { opacity: 1; transform: translateY(-4px) scale(1.15); }
  50% { transform: translateY(-14px) scale(1); }
  100% { opacity: 0; transform: translateY(-42px) scale(0.9); }
}
.bonusPop { animation: bonusPopAnim 900ms cubic-bezier(.16,1,.3,1); }
@keyframes comboPopAnim {
  0% { transform: scale(0.7); opacity: 0; }
  60% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.comboPop { animation: comboPopAnim 320ms cubic-bezier(.16,1.2,.3,1); }
@keyframes cascadeParticle {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0.2); opacity: 0; }
}
.cascade-particle { animation: cascadeParticle 600ms cubic-bezier(.2,.8,.3,1) forwards; }

/* ═══════════ TUBE STATES ═══════════ */
.tube-btn[data-state="selected"] {
  transform: translateY(-10px);
  border-color: var(--accent);
  box-shadow: 0 12px 32px var(--accent-soft), 0 0 0 1px var(--accent-soft);
  background: var(--glass);
}
.tube-btn[data-state="solved"] {
  border-color: var(--go);
  box-shadow: 0 0 0 2px var(--go-soft), 0 6px 20px var(--go-soft);
}
.tube-btn[data-state="solved"]::after {
  content: "✓";
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 11px;
  font-weight: 900;
  color: var(--go);
  text-shadow: 0 0 6px var(--go-soft);
}
.tube-btn[data-state="hintFrom"] {
  border-color: var(--go);
  animation: hintPulse 800ms ease-in-out infinite;
}
.tube-btn[data-state="hintTo"] {
  border-color: var(--go);
  opacity: 0.92;
  box-shadow: 0 0 0 3px var(--go-soft);
}
@keyframes hintPulse {
  0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 0 0 3px var(--go-soft); }
  50%      { transform: translateY(-3px) scale(1.02); box-shadow: 0 0 0 6px transparent; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);   opacity: 1; }
}
@keyframes slideOutRight {
  from { transform: translateX(0);   opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}

/* ═══════════ PREMIUM UTILITIES ═══════════ */
.glass-premium {
  background: rgba(20, 27, 50, 0.88);
  backdrop-filter: blur(40px) saturate(140%);
  -webkit-backdrop-filter: blur(40px) saturate(140%);
}
.glass-standard {
  background: rgba(15, 21, 40, 0.72);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}
.glass-minimal {
  background: rgba(15, 21, 40, 0.55);
}
.press {
  transition: transform 120ms cubic-bezier(0.2, 1.1, 0.3, 1);
  will-change: transform;
  transform: translateZ(0);
}
.press:active { transform: scale(0.965); }

/* ═══════════ TYPE UTILITIES ═══════════ */
.font-display {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-weight: 900;
  letter-spacing: -0.04em;
}
.font-heading {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.font-body {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 700;
}
.font-mono {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.text-overline {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 380ms cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

@keyframes toastIn {
  0% { opacity: 0; transform: translateY(-24px) scale(0.94); }
  60% { opacity: 1; transform: translateY(4px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes toastOut {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-12px) scale(0.96); }
}
.fade-in { animation: fadeIn 300ms ease both; }

/* ═══════════ DAILY PREMIUM ANIMATIONS ═══════════ */
@property --daily-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
@keyframes daily-rotate {
  to { --daily-angle: 360deg; }
}
@keyframes flamePulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(255,194,75,0.5)); }
  50% { transform: scale(1.1); filter: drop-shadow(0 0 10px rgba(255,194,75,0.9)); }
}
@keyframes dailyDotPulse {
  0% { box-shadow: 0 0 0 0 rgba(255,194,75,0.5); }
  70% { box-shadow: 0 0 0 6px rgba(255,194,75,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,194,75,0); }
}
@keyframes shimmerSlide {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes dailyBadgeGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,194,75,0.4); }
  50% { box-shadow: 0 0 0 4px rgba(255,194,75,0.1); }
}

/* Daily utility classes — applied via className */
.daily-border-wrap {
  position: relative;
  width: 100%;
  border-radius: 21.5px;
  padding: 1.5px;
  background: conic-gradient(
    from var(--daily-angle),
    rgba(255,194,75,0.7) 0deg,
    rgba(255,194,75,0.08) 90deg,
    rgba(255,194,75,0.7) 180deg,
    rgba(255,194,75,0.08) 270deg,
    rgba(255,194,75,0.7) 360deg
  );
  animation: daily-rotate 8s linear infinite;
  box-shadow: 0 8px 32px rgba(255, 194, 75, 0.12);
}
.daily-shimmer {
  background: linear-gradient(120deg, #FFD86B 0%, #FFF2C4 30%, #FFC24B 50%, #FFF2C4 70%, #FFD86B 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmerSlide 4s linear infinite;
}
.flamePulse {
  display: inline-block;
  animation: flamePulse 1.8s ease-in-out infinite;
}
.dailyDotPulse {
  animation: dailyDotPulse 2s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ═══════════ PREMIUM UTILITIES ═══════════ */
.glass {
  background: rgba(15, 21, 40, 0.72);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}
.glass-elevated {
  background: rgba(20, 27, 50, 0.85);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
}
`;
