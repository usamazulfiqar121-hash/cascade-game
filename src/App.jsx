import React, { useState, useCallback, useEffect, useRef } from "react";
import { T, D, MAX_HEIGHT, COLORS, BEST_KEY, ACH_KEY, DAILY_KEY, PLAYED_KEY, ACHIEVEMENTS, RARITY, UPGRADES } from "./constants";
import {
  sumMoveBonus, getLuckyChance, getComboEvery, getMegaEvery,
  pickRandomUpgrades, isTubeSolved, canPour, pour, isSolved,
  shuffle, mulberry32, dailyKey, dateToSeed, computeStreak,
  applyAutoSort, generateLevel,
} from "./gameLogic";
import { S } from "./theme";
import { Snd, buzz, setVibe } from "./sound";
import Particles from "./Particles";
import Tube from "./Tube";
import UpgradeCard from "./UpgradeCard";
import HomeScreen from "./HomeScreen";
import AchievementsScreen from "./AchievementsScreen";
import Tutorial from "./Tutorial";












/* ═══════════ DAILY CHALLENGE — SEEDED RNG (UTC) ═══════════ */

/* UTC date key — same board for players worldwide.
   Local time use karne se timezone mismatch hota hai. */








/* ═══════════  SHARE CARD  ═══════════ */

function buildShareCard({ round, upgrades, best }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  // Background gradient
  const grad = ctx.createRadialGradient(540, 400, 100, 540, 960, 1400);
  grad.addColorStop(0, "#121A31");
  grad.addColorStop(1, "#0A0F1F");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Header
  ctx.fillStyle = "#4C8DFF";
  ctx.font = "900 100px 'Nunito', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CASCADE", 540, 320);

  // Subtitle
  ctx.fillStyle = "#7A85A8";
  ctx.font = "700 40px 'Nunito', sans-serif";
  ctx.fillText("ROGUELIKE SORT", 540, 380);

  // Big round number
  ctx.fillStyle = "#EAF0FF";
  ctx.font = "900 260px 'Nunito', sans-serif";
  ctx.fillText(`R${round}`, 540, 760);

  ctx.fillStyle = "#7A85A8";
  ctx.font = "800 44px 'Nunito', sans-serif";
  ctx.fillText("ROUNDS SURVIVED", 540, 830);

  // Upgrades row
  if (upgrades.length > 0) {
    ctx.fillStyle = "#7A85A8";
    ctx.font = "700 32px 'Nunito', sans-serif";
    ctx.fillText(`${upgrades.length} UPGRADES COLLECTED`, 540, 1000);

    const icons = upgrades.slice(-10).map((id) => {
      const u = UPGRADES.find((x) => x.id === id);
      return u ? u.icon : "";
    });
    ctx.font = "900 70px 'Nunito', sans-serif";
    ctx.fillStyle = "#EAF0FF";
    ctx.fillText(icons.join("  "), 540, 1100);
  }

  // Best
  if (best > 0) {
    ctx.fillStyle = "#FFC24B";
    ctx.font = "900 40px 'Nunito', sans-serif";
    ctx.fillText(`BEST: ROUND ${best}`, 540, 1300);
  }

  // Bottom CTA
  ctx.fillStyle = "#4C8DFF";
  ctx.font = "900 46px 'Nunito', sans-serif";
  ctx.fillText("Play Cascade", 540, 1600);
  ctx.fillStyle = "#7A85A8";
  ctx.font = "700 32px 'Nunito', sans-serif";
  ctx.fillText("on Google Play", 540, 1650);

  return canvas.toDataURL("image/png");
}

/* ═══════════  COMPONENTS  ═══════════ */

/* ═══════════  MAIN  ═══════════ */

export default function Cascade() {
  const [round, setRound] = useState(1);
  const [isDaily, setIsDaily] = useState(false);
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
  const runStartRound = useRef(1);

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
      try {
        if (localStorage.getItem("cascade:hasPlayedOnce") === "1") setHasPlayedOnce(true);
      } catch {}
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

  useEffect(() => {
    setTubes(level.tubes);
    setMoves(0);
    setBonusMoves(0);
    setSelected(null);
    setComboCount(0);
    setUndoLeft(2);
    setSnapshots([]);
    setHintLeft(2);
    setHint(null);
    setPhase("playing");
  }, [level]);

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(0), 300);
    return () => clearTimeout(t);
  }, [shake]);

  const unlockAch = useCallback((id) => {
    const meta = ACHIEVEMENTS.find((a) => a.id === id);
    setAchievements((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try { localStorage.setItem(ACH_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    /* setAchToast called OUTSIDE the updater — keeps the updater pure,
       which React 19 + StrictMode requires. Previously this side effect
       inside the updater was blocking the round-clear setTimeout. */
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
          setPendingUpgrades(pickRandomUpgrades(3));
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
  }, [tubes, selected, phase, moves, bonusMoves, comboCount, level, runUpgrades, round, best, spawnParticles, unlockAch, isDaily, dailyResults, hasPlayedOnce]);

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
    setLevel(generateLevel(nextRound, newUpgrades, lastRoundMovesLeft));
    Snd.upgrade();
  }, [round, runUpgrades, lastRoundMovesLeft, pendingUpgrades]);

  const retry = useCallback(() => {
    const seed = isDaily ? dateToSeed() : null;
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

  const generateShare = useCallback(() => {
    try {
      const dataUrl = buildShareCard({ round, upgrades: runUpgrades, best });
      setShareImage(dataUrl);
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
          onPlay={() => { restartRun(); setScreen("game"); }}
          onDaily={() => {
            setIsDaily(true);
            setRound(1);
            setRunUpgrades([]);
            setLastRoundMovesLeft(0);
            setShareImage(null);
            setShared(false);
            setLevel(generateLevel(1, [], 0, dateToSeed()));
            setScreen("game");
          }}
          onSettings={() => setShowSettings(true)}
          dailyResults={dailyResults}
          computeStreak={computeStreak}
          dailyKey={dailyKey}
          hasPlayedOnce={hasPlayedOnce}
          achievements={achievements}
          ACHIEVEMENTS={ACHIEVEMENTS}
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

      {/* Undo — floats bottom-left, above the footer hint */}
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
          <button onClick={() => setShowSettings(true)} aria-label="Settings" style={{
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
            <Tube key={i} balls={balls} selected={selected === i} hintFrom={hint && hint.from === i} hintTo={hint && hint.to === i} solved={isTubeSolved(balls)} onClick={(e) => onTubeClick(i, e)} disabled={phase !== "playing"} />
          ))}
        </div>
      </div>

      <div style={S.footer}>
        {phase === "playing" && (
          <div style={S.hint}>{selected === null ? "Tap a tube to pick it up" : "Tap a destination tube"}</div>
        )}
      </div>

      {showSettings && (
        <div style={S.ovTop} onClick={() => setShowSettings(false)}>
          <div style={S.ovCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...S.ovTitle, fontSize: 22 }}>Settings</div>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={S.settingRow} onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                Snd.setSfx(next);
                try { localStorage.setItem("cascade:soundOn", next ? "1" : "0"); } catch {}
              }}>
                <span style={S.settingLabel}>🔊 Sound</span>
                <span style={{ ...S.togglePill, background: soundOn ? T.accent : T.line }}>
                  {soundOn ? "ON" : "OFF"}
                </span>
              </button>
              <button style={S.settingRow} onClick={() => {
                const next = !vibeOn;
                setVibeOn(next);
                setVibe(next);
                try { localStorage.setItem("cascade:vibeOn", next ? "1" : "0"); } catch {}
              }}>
                <span style={S.settingLabel}>📳 Vibration</span>
                <span style={{ ...S.togglePill, background: vibeOn ? T.accent : T.line }}>
                  {vibeOn ? "ON" : "OFF"}
                </span>
              </button>
              <button style={{ ...S.settingRow, borderColor: T.danger + "44" }} onClick={() => {
                if (window.confirm("Reset all progress? This deletes your best score and tutorial.")) {
                  try {
                    localStorage.removeItem(BEST_KEY);
                    localStorage.removeItem("cascade:tutorialSeen");
                  } catch {}
                  setBest(0);
                  restartRun();
                  setShowSettings(false);
                }
              }}>
                <span style={{ ...S.settingLabel, color: T.danger }}>🗑 Reset Progress</span>
              </button>
            </div>
            <button style={S.settingRow} onClick={() => { setShowSettings(false); setShowAchievements(true); }}>
              <span style={S.settingLabel}>🏆 Achievements</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: T.gold }}>{achievements.length}/{ACHIEVEMENTS.length}</span>
            </button>
            <button style={{ ...S.primary, marginTop: 20 }} onClick={() => setShowSettings(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showAchievements && (
        <AchievementsScreen
          achievements={achievements}
          onClose={() => setShowAchievements(false)}
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

                <button style={S.primary} onClick={retry}>Retry Round {round}</button>
                <button style={{ ...S.ghost, color: T.accent }} onClick={generateShare}>📤 Share Result</button>
                <button style={S.ghost} onClick={restartRun}>Start Over</button>
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
    </div>
  );
}

const CSS = `
@keyframes achSlideIn {
  0% { opacity: 0; transform: translateY(-30px); }
  60% { transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
.achSlide { animation: achSlideIn 400ms cubic-bezier(.16,1.1,.3,1); }

@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=Inter:wght@600;700;800;900&family=JetBrains+Mono:wght@700;800&family=Nunito:wght@600;800;900&display=swap');
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
.fade-in { animation: fadeIn 300ms ease both; }
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
