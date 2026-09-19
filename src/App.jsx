import React, { useState, useCallback, useEffect, useRef } from "react";

const MAX_HEIGHT = 4;
const COLORS = [
  "#FF4D6A", "#2F7BF6", "#0E9F6E", "#FFC24B",
  "#8B5CF6", "#F2761B", "#22C5C5", "#FF85C8",
];

const T = {
  bg: "#0A0F1F", card: "#141B32", ink: "#EAF0FF", muted: "#7A85A8",
  accent: "#4C8DFF", danger: "#FF5C7A", go: "#22C58A", gold: "#FFC24B",
  line: "#222E4C", edge: "rgba(140,170,255,0.10)",
  tubeBg: "rgba(255,255,255,0.04)", tubeEdge: "rgba(255,255,255,0.10)",
};

const BEST_KEY = "cascade:best";

const RARITY = {
  1: { name: "Common", color: "#8592BC" },
  2: { name: "Uncommon", color: "#22C58A" },
  3: { name: "Rare", color: "#4C8DFF" },
  4: { name: "Legendary", color: "#FFC24B" },
};

const UPGRADES = [
  { id: "m2", name: "+2 Moves", desc: "+2 moves every round", icon: "🏃", rarity: 1, value: 2 },
  { id: "m3", name: "+3 Moves", desc: "+3 moves every round", icon: "⚡", rarity: 1, value: 3 },
  { id: "m5", name: "+5 Moves", desc: "+5 moves every round", icon: "🔥", rarity: 2, value: 5 },
  { id: "m8", name: "+8 Moves", desc: "+8 moves every round", icon: "💎", rarity: 3, value: 8 },
  { id: "start", name: "Head Start", desc: "+10 moves every round", icon: "🚀", rarity: 4, value: 10 },
  { id: "lucky", name: "Lucky Drop", desc: "20% chance per pour: +1 move", icon: "🍀", rarity: 1 },
  { id: "lucky2", name: "Super Lucky", desc: "35% chance per pour: +1 move", icon: "🌟", rarity: 3 },
  { id: "combo3", name: "Combo Master", desc: "Every 3rd pour gives +1 move", icon: "🎯", rarity: 2 },
  { id: "combo2", name: "Combo Legend", desc: "Every 2nd pour gives +1 move", icon: "🎪", rarity: 3 },
  { id: "mega", name: "Mega Bonus", desc: "Every 5th pour gives +2 moves", icon: "🎊", rarity: 2 },
  { id: "clear", name: "Perfect Clear", desc: "Finish with 5+ moves left: +3 next round", icon: "✨", rarity: 2 },
  { id: "tube", name: "Extra Tube", desc: "+1 empty tube permanently", icon: "🔧", rarity: 3 },
  { id: "auto", name: "Auto-Sort", desc: "1 random tube starts solved each round", icon: "🎁", rarity: 4 },
];

function sumMoveBonus(ups) { return ups.reduce((s, id) => s + (UPGRADES.find((u) => u.id === id)?.value || 0), 0); }
function getLuckyChance(ups) { return Math.min(0.7, ups.reduce((s, id) => s + (id === "lucky" ? 0.2 : id === "lucky2" ? 0.35 : 0), 0)); }
function getComboEvery(ups) { if (ups.includes("combo2")) return 2; if (ups.includes("combo3")) return 3; return 0; }
function getMegaEvery(ups) { return ups.includes("mega") ? 5 : 0; }

function pickRandomUpgrades(count) {
  const weighted = [];
  UPGRADES.forEach((u) => {
    const weight = Math.max(1, 6 - u.rarity * 1.5) | 0;
    for (let i = 0; i < weight; i++) weighted.push(u);
  });
  const picked = [];
  const used = new Set();
  let guard = 0;
  while (picked.length < count && guard < 200) {
    const u = weighted[(Math.random() * weighted.length) | 0];
    if (used.has(u.id)) { guard++; continue; }
    used.add(u.id);
    picked.push(u);
  }
  return picked;
}

function isTubeSolved(tube) {
  return tube.length === MAX_HEIGHT && tube.every((c) => c === tube[0]);
}

function canPour(tubes, fromIdx, toIdx) {
  if (fromIdx === toIdx) return false;
  const from = tubes[fromIdx], to = tubes[toIdx];
  if (from.length === 0 || to.length >= MAX_HEIGHT) return false;
  if (to.length === 0) return true;
  return to[to.length - 1] === from[from.length - 1];
}

function pour(tubes, fromIdx, toIdx) {
  if (!canPour(tubes, fromIdx, toIdx)) return null;
  const next = tubes.map((t) => [...t]);
  const from = next[fromIdx], to = next[toIdx];
  const color = from[from.length - 1];
  const moving = [];
  while (from.length > 0 && from[from.length - 1] === color) moving.push(from.pop());
  const space = MAX_HEIGHT - to.length;
  const fits = moving.slice(0, space);
  to.push(...fits);
  if (fits.length < moving.length) from.push(...moving.slice(fits.length));
  return next;
}

function isSolved(tubes) {
  return tubes.every((t) => t.length === 0 || (t.length === MAX_HEIGHT && t.every((c) => c === t[0])));
}

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function applyAutoSort(tubes, count) {
  if (count <= 0) return tubes;
  const result = tubes.map((t) => [...t]);
  for (let k = 0; k < count; k++) {
    const emptyIdx = result.findIndex((t) => t.length === 0);
    if (emptyIdx === -1) break;
    const colors = new Set();
    result.forEach((t) => t.forEach((c) => colors.add(c)));
    const colorArr = [...colors];
    if (!colorArr.length) break;
    let sorted = false;
    for (const color of shuffle(colorArr)) {
      let total = 0;
      result.forEach((t) => t.forEach((c) => { if (c === color) total++; }));
      if (total !== MAX_HEIGHT) continue;
      const alreadySorted = result.some((t) => t.length === MAX_HEIGHT && t.every((c) => c === color));
      if (alreadySorted) continue;
      for (let i = 0; i < result.length; i++) result[i] = result[i].filter((c) => c !== color);
      result[emptyIdx] = Array(MAX_HEIGHT).fill(color);
      sorted = true;
      break;
    }
    if (!sorted) break;
  }
  return result;
}

function generateLevel(round, runUpgrades, prevMovesLeft) {
  const colorCount = Math.min(2 + Math.floor((round - 1) / 2), 7);
  const balls = [];
  for (let c = 0; c < colorCount; c++) for (let i = 0; i < MAX_HEIGHT; i++) balls.push(c);

  let tubes = [];
  let attempts = 0;
  do {
    const sh = shuffle(balls);
    tubes = [];
    for (let i = 0; i < colorCount; i++) tubes.push(sh.slice(i * MAX_HEIGHT, (i + 1) * MAX_HEIGHT));
    for (let i = 0; i < 2; i++) tubes.push([]);
    attempts++;
  } while (attempts < 8 && tubes.some((t) => t.length === MAX_HEIGHT && t.every((c) => c === t[0])));

  const extraTubes = runUpgrades.filter((id) => id === "tube").length;
  for (let i = 0; i < extraTubes; i++) tubes.push([]);
  const autoSortCount = runUpgrades.filter((id) => id === "auto").length;
  tubes = applyAutoSort(tubes, autoSortCount);

  const baseLimit = Math.round(colorCount * 3 + round * 0.8) + 4;
  const moveBonus = sumMoveBonus(runUpgrades);
  const perfectClearBonus = runUpgrades.includes("clear") && prevMovesLeft >= 5 ? 3 : 0;
  const moveLimit = baseLimit + moveBonus + perfectClearBonus;

  return { tubes, moveLimit, colorCount };
}

let VIBE_ON = true;
const buzz = (ms) => { if (!VIBE_ON) return; try { navigator?.vibrate?.(ms); } catch {} };

const Snd = (() => {
  let ctx = null, sfxBus = null, sfxOn = true;
  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return ctx; }
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
    clear: () => { if (!sfxOn) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.18, delay: i * 0.07 })); },
    upgrade: () => { if (!sfxOn) return; [523.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.4, peak: 0.18, delay: i * 0.08 })); },
    fail: () => { if (!sfxOn) return; [392, 311.13, 261.63].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.2, delay: i * 0.11 })); },
    setSfx: (v) => { sfxOn = v; },
  };
})();

/* ═══════════  PARTICLES  ═══════════ */

function Particles({ bursts }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }}>
      {bursts.map((b) => (
        <div key={b.id} style={{ position: "absolute", left: b.x, top: b.y }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2 + b.seed;
            return (
              <div key={i} className="cascade-particle" style={{
                position: "absolute",
                width: 8, height: 8, borderRadius: "50%",
                background: b.color,
                boxShadow: `0 0 8px ${b.color}`,
                "--tx": `${Math.cos(angle) * 40}px`,
                "--ty": `${Math.sin(angle) * 40}px`,
              }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

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

function Tube({ balls, selected, onClick, disabled, hintFrom, hintTo, solved }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 62, height: MAX_HEIGHT * 48 + 20,
      background: T.tubeBg, border: `2px solid ${selected ? T.accent : solved ? T.go + "88" : hintFrom ? T.go : hintTo ? T.go + "aa" : T.tubeEdge}`,
      borderRadius: 32, padding: "8px 6px 6px",
      display: "flex", flexDirection: "column-reverse", justifyContent: "flex-start",
      alignItems: "center", cursor: disabled ? "default" : "pointer",
      transition: "all 200ms cubic-bezier(.2,1.1,.3,1)",
      transform: selected ? "translateY(-8px)" : "translateY(0)",
      boxShadow: selected ? `0 12px 30px ${T.accent}44` : solved ? `0 0 0 2px ${T.go}44, 0 4px 16px ${T.go}33` : (hintFrom || hintTo) ? `0 0 0 3px ${T.go}33` : "none",
      opacity: disabled ? 0.4 : 1,
    }}>
      {balls.map((colorIdx, i) => (
        <div key={i} style={{
          width: "88%", height: 38, borderRadius: 19,
          background: COLORS[colorIdx],
          boxShadow: "inset 0 -5px 10px rgba(0,0,0,0.25), inset 0 3px 6px rgba(255,255,255,0.2)",
          marginTop: i > 0 ? 3 : 0,
        }} />
      ))}
    </button>
  );
}

function UpgradeCard({ upgrade, onPick }) {
  const r = RARITY[upgrade.rarity];
  return (
    <button onClick={onPick} style={{
      width: "100%", background: T.card, border: `2px solid ${r.color}66`,
      borderRadius: 16, padding: "16px 14px", display: "flex", alignItems: "center",
      gap: 14, cursor: "pointer", textAlign: "left",
      fontFamily: "'Nunito', sans-serif", color: T.ink,
      transition: "all 200ms cubic-bezier(.2,1.1,.3,1)",
      boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: `${r.color}22`, border: `2px solid ${r.color}55`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
      }}>{upgrade.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{upgrade.name}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{upgrade.desc}</div>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: r.color, marginTop: 4, textTransform: "uppercase" }}>{r.name}</div>
      </div>
    </button>
  );
}

/* ═══════════  MAIN  ═══════════ */

export default function Cascade() {
  const [round, setRound] = useState(1);
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
  const [shareImage, setShareImage] = useState(null);
  const [shared, setShared] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(true); // default true = don't flash
  const [showSettings, setShowSettings] = useState(false);
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
      if (t === "1") setTutorialSeen(true);
      else {
        setTutorialSeen(false);
        const timer = setTimeout(() => setShowTutorial(true), 700);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  useEffect(() => { VIBE_ON = vibeOn; }, [vibeOn]);

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
        setTimeout(() => {
          setLastRoundMovesLeft(remainingAtClear);
          setPendingUpgrades(pickRandomUpgrades(3));
          setPhase("upgrade");
          Snd.clear();
          buzz(30);
        }, 250);
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
  }, [tubes, selected, phase, moves, bonusMoves, comboCount, level, runUpgrades, round, best, spawnParticles]);

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
    setLevel(generateLevel(round, runUpgrades, lastRoundMovesLeft));
  }, [round, runUpgrades, lastRoundMovesLeft]);

  const restartRun = useCallback(() => {
    setRound(1);
    setRunUpgrades([]);
    setLastRoundMovesLeft(0);
    setShareImage(null);
    setShared(false);
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
      <Particles bursts={particles} />

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
          <div style={S.roundLabel}>Round {round}</div>
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
                VIBE_ON = next;
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
            <button style={{ ...S.primary, marginTop: 20 }} onClick={() => setShowSettings(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showTutorial && (
        <div style={S.tutOverlay} className="tutIn">
          <div style={S.tutCard}>
            {/* Header */}
            <div style={S.tutHeader}>
              <div style={S.tutIconCircle}>
                <span style={{ fontSize: 28 }}>🎯</span>
              </div>
              <div style={S.tutTitle}>How to Play</div>
              <div style={S.tutSub}>Three simple rules</div>
            </div>

            {/* Steps */}
            <div style={S.tutSteps}>
              <div style={S.tutStep}>
                <div style={S.tutNum}>1</div>
                <div style={S.tutStepBody}>
                  <div style={S.tutStepTitle}>Tap a tube</div>
                  <div style={S.tutStepDesc}>Pick up the <b style={{ color: T.accent }}>top ball</b></div>
                </div>
              </div>

              <div style={S.tutStep}>
                <div style={S.tutNum}>2</div>
                <div style={S.tutStepBody}>
                  <div style={S.tutStepTitle}>Tap another</div>
                  <div style={S.tutStepDesc}>Pour onto a <b style={{ color: T.go }}>matching color</b> or an <b style={{ color: T.go }}>empty tube</b></div>
                </div>
              </div>

              <div style={S.tutStep}>
                <div style={S.tutNum}>3</div>
                <div style={S.tutStepBody}>
                  <div style={S.tutStepTitle}>Sort them all</div>
                  <div style={S.tutStepDesc}>Each tube one <b style={{ color: T.gold }}>single color</b></div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div style={S.tutWarning}>
              <span style={{ fontSize: 15 }}>⚠️</span>
              <span>Each pour costs a move. You have a limited number.</span>
            </div>

            <button style={S.primary} onClick={() => {
              setShowTutorial(false);
              try { localStorage.setItem("cascade:tutorialSeen", "1"); } catch {}
            }}>
              Got it
            </button>
          </div>
        </div>
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
    </div>
  );
}

const S = {
  root: { position: "fixed", inset: 0, background: `radial-gradient(120% 80% at 50% 30%, #121A31 0%, ${T.bg} 70%)`, color: T.ink, fontFamily: "'Nunito', system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", userSelect: "none", WebkitTapHighlightColor: "transparent" },
  hud: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 10px" },
  roundLabel: { fontWeight: 900, fontSize: 18, color: T.ink },
  colorCount: { fontWeight: 700, fontSize: 12, color: T.muted, marginTop: 2 },
  movesLabel: { fontWeight: 900, fontSize: 22, fontVariantNumeric: "tabular-nums" },
  movesSub: { fontWeight: 700, fontSize: 11, color: T.muted, marginLeft: 4 },
  progressTrack: { height: 4, margin: "0 20px 8px", background: T.line, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, transition: "all 300ms ease" },
  upgradeStrip: { display: "flex", gap: 4, padding: "0 20px 8px", flexWrap: "wrap" },
  board: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  tubesRow: { display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", alignItems: "flex-end", maxWidth: 400 },
  footer: { padding: "12px 20px 32px", minHeight: 60, display: "flex", justifyContent: "center", alignItems: "center" },
  hint: { fontSize: 13, fontWeight: 700, color: T.muted, textAlign: "center" },
  ovTop: { position: "fixed", inset: 0, background: "rgba(10,15,31,0.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(8px)", zIndex: 90 },
  overlay: { position: "fixed", inset: 0, background: "rgba(10,15,31,0.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(8px)" },
  ovCard: { background: T.card, border: `1px solid ${T.edge}`, borderRadius: 24, padding: 24, textAlign: "center", maxWidth: 320, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" },
  ovIconCircle: { width: 64, height: 64, borderRadius: 20, background: `${T.danger}22`, border: `2px solid ${T.danger}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  ovBigNum: { fontSize: 72, fontWeight: 900, color: T.ink, letterSpacing: "-0.05em", lineHeight: 1, marginTop: 8 },
  ovBigLabel: { fontSize: 11, fontWeight: 900, letterSpacing: "0.15em", color: T.muted, marginTop: 6, textTransform: "uppercase" },
  ovNewBest: { display: "inline-block", background: `${T.gold}22`, border: `1px solid ${T.gold}66`, color: T.gold, fontSize: 12, fontWeight: 900, padding: "6px 14px", borderRadius: 999, marginTop: 12 },
  ovStats: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "20px 0 20px" },
  ovStat: { background: `${T.bg}80`, border: `1px solid ${T.edge}`, borderRadius: 14, padding: "12px 6px", textAlign: "center" },
  ovStatNum: { fontSize: 22, fontWeight: 900, color: T.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" },
  ovStatLabel: { fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 },
  comboBadge: { display: "flex", alignItems: "center", gap: 6, alignSelf: "center", background: `${T.gold}22`, border: `1px solid ${T.gold}66`, borderRadius: 999, padding: "5px 12px 5px 10px", marginBottom: 6 },
  comboFlame: { fontSize: 13 },
  comboText: { fontSize: 12, fontWeight: 900, color: T.gold, letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" },
  settingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: `${T.bg}80`, border: `1px solid ${T.edge}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", fontFamily: "'Nunito', sans-serif", color: T.ink },
  settingLabel: { fontWeight: 800, fontSize: 14 },
  togglePill: { fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", color: "#fff", padding: "4px 10px", borderRadius: 999 },
  tutOverlay: { position: "fixed", inset: 0, background: "rgba(10,15,31,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(10px)", zIndex: 100 },
  tutCard: { background: T.card, border: `1px solid ${T.edge}`, borderRadius: 28, padding: 28, maxWidth: 380, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" },
  tutHeader: { textAlign: "center", marginBottom: 24 },
  tutIconCircle: { width: 64, height: 64, borderRadius: 20, background: `${T.accent}22`, border: `2px solid ${T.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  tutTitle: { fontWeight: 900, fontSize: 24, color: T.ink, letterSpacing: "-0.02em" },
  tutSub: { fontSize: 13, fontWeight: 700, color: T.muted, marginTop: 4 },
  tutSteps: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 },
  tutStep: { display: "flex", alignItems: "flex-start", gap: 14 },
  tutNum: { width: 32, height: 32, borderRadius: 10, background: T.accent, color: "#fff", fontWeight: 900, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tutStepBody: { flex: 1, minWidth: 0, paddingTop: 2 },
  tutStepTitle: { fontWeight: 900, fontSize: 15, color: T.ink },
  tutStepDesc: { fontSize: 13, fontWeight: 600, color: T.muted, marginTop: 2, lineHeight: 1.45 },
  tutWarning: { display: "flex", alignItems: "center", gap: 10, background: `${T.danger}15`, border: `1px solid ${T.danger}44`, borderRadius: 14, padding: "10px 14px", marginBottom: 20, fontSize: 12, fontWeight: 700, color: T.ink, lineHeight: 1.4 },
  ovTitle: { fontWeight: 900, fontSize: 28, letterSpacing: "-0.02em" },
  ovSub: { fontSize: 14, fontWeight: 600, color: T.muted, marginTop: 8, marginBottom: 24 },
  primary: { display: "block", width: "100%", background: T.accent, color: "#fff", border: "none", borderRadius: 999, padding: "14px 24px", fontFamily: "'Nunito', sans-serif", fontWeight: 900, fontSize: 15, cursor: "pointer", boxShadow: `0 8px 24px ${T.accent}55` },
  ghost: { display: "block", width: "100%", background: "transparent", color: T.muted, border: "none", padding: 12, fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer", marginTop: 6 },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;800;900&display=swap');
html, body, #root { background: #0A0F1F; margin: 0; padding: 0; overflow: hidden; height: 100%; }
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
`;
