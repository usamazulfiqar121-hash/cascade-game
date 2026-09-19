import React, { useState, useCallback, useEffect } from "react";

const MAX_HEIGHT = 4;
const COLORS = [
  "#FF4D6A", "#2F7BF6", "#0E9F6E", "#FFC24B",
  "#8B5CF6", "#F2761B", "#22C5C5", "#FF85C8",
];

const T = {
  bg: "#0A0F1F", card: "#141B32", ink: "#EAF0FF", muted: "#7A85A8",
  accent: "#4C8DFF", danger: "#FF5C7A", go: "#22C58A",
  line: "#222E4C", edge: "rgba(140,170,255,0.10)",
  tubeBg: "rgba(255,255,255,0.04)", tubeEdge: "rgba(255,255,255,0.10)",
};

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

function generateLevel(round) {
  const colorCount = Math.min(2 + Math.floor((round - 1) / 2), 7);
  const emptyTubes = 2;
  const balls = [];
  for (let c = 0; c < colorCount; c++) for (let i = 0; i < MAX_HEIGHT; i++) balls.push(c);

  let tubes = [];
  let attempts = 0;
  do {
    const sh = shuffle(balls);
    tubes = [];
    for (let i = 0; i < colorCount; i++) tubes.push(sh.slice(i * MAX_HEIGHT, (i + 1) * MAX_HEIGHT));
    for (let i = 0; i < emptyTubes; i++) tubes.push([]);
    attempts++;
  } while (attempts < 8 && tubes.some((t) => t.length === MAX_HEIGHT && t.every((c) => c === t[0])));

  const moveLimit = Math.round(colorCount * 3 + round * 0.8) + 4;
  return { tubes, moveLimit, colorCount };
}

const Snd = (() => {
  let ctx = null, sfxBus = null, sfxOn = true;
  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return ctx; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.6;
      sfxBus.connect(master);
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
    pour: (count = 1) => { if (sfxOn) tone(400 + count * 80, { type: "sine", dur: 0.12, peak: 0.2, glide: 1.3 }); },
    select: () => { if (sfxOn) tone(600, { type: "sine", dur: 0.06, peak: 0.12 }); },
    clear: () => { if (!sfxOn) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.18, delay: i * 0.07 })); },
    fail: () => { if (!sfxOn) return; [392, 311.13, 261.63].forEach((f, i) => tone(f, { type: "triangle", dur: 0.35, peak: 0.2, delay: i * 0.11 })); },
    setSfx: (v) => { sfxOn = v; },
  };
})();

function Tube({ balls, selected, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 62, height: MAX_HEIGHT * 48 + 20,
        background: T.tubeBg,
        border: `2px solid ${selected ? T.accent : T.tubeEdge}`,
        borderRadius: 32, padding: "8px 6px 6px",
        display: "flex", flexDirection: "column-reverse", justifyContent: "flex-start",
        alignItems: "center", cursor: disabled ? "default" : "pointer",
        transition: "all 200ms cubic-bezier(.2,1.1,.3,1)",
        transform: selected ? "translateY(-8px)" : "translateY(0)",
        boxShadow: selected ? `0 12px 30px ${T.accent}44` : "none",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {balls.map((colorIdx, i) => (
        <div
          key={i}
          style={{
            width: "88%", height: 38, borderRadius: 19,
            background: COLORS[colorIdx],
            boxShadow: "inset 0 -5px 10px rgba(0,0,0,0.25), inset 0 3px 6px rgba(255,255,255,0.2)",
            marginTop: i > 0 ? 3 : 0,
          }}
        />
      ))}
    </button>
  );
}

export default function Cascade() {
  const [round, setRound] = useState(1);
  const [level, setLevel] = useState(() => generateLevel(1));
  const [tubes, setTubes] = useState(level.tubes);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("playing");
  const [shake, setShake] = useState(0);

  const movesLeft = level.moveLimit - moves;

  useEffect(() => {
    setTubes(level.tubes);
    setMoves(0);
    setSelected(null);
    setPhase("playing");
  }, [level]);

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(0), 300);
    return () => clearTimeout(t);
  }, [shake]);

  const onTubeClick = useCallback((idx) => {
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
      const beforeLen = tubes[idx].length;
      const next = pour(tubes, selected, idx);
      const movedCount = next[idx].length - beforeLen;
      setTubes(next);
      setMoves((m) => m + 1);
      setSelected(null);
      Snd.pour(movedCount);

      if (isSolved(next)) {
        setTimeout(() => { setPhase("cleared"); Snd.clear(); }, 250);
      } else if (moves + 1 >= level.moveLimit) {
        setTimeout(() => { setPhase("gameover"); Snd.fail(); }, 250);
      }
    } else {
      setShake((s) => s + 1);
      setSelected(null);
    }
  }, [tubes, selected, phase, moves, level.moveLimit]);

  const nextRound = useCallback(() => {
    const next = round + 1;
    setRound(next);
    setLevel(generateLevel(next));
  }, [round]);

  const retry = useCallback(() => setLevel(generateLevel(round)), [round]);
  const restartRun = useCallback(() => { setRound(1); setLevel(generateLevel(1)); }, []);

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      <div style={S.hud}>
        <div>
          <div style={S.roundLabel}>Round {round}</div>
          <div style={S.colorCount}>{level.colorCount} colors</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...S.movesLabel, color: movesLeft <= 3 ? T.danger : T.ink }}>
            {movesLeft} <span style={S.movesSub}>moves left</span>
          </div>
        </div>
      </div>

      <div style={S.progressTrack}>
        <div style={{ ...S.progressFill, width: `${Math.min(100, (moves / level.moveLimit) * 100)}%`, background: movesLeft <= 3 ? T.danger : T.accent }} />
      </div>

      <div style={{ ...S.board, transform: shake ? "translateX(-8px)" : "translateX(0)", transition: "transform 60ms ease" }}>
        <div style={S.tubesRow}>
          {tubes.map((balls, i) => (
            <Tube key={i} balls={balls} selected={selected === i} onClick={() => onTubeClick(i)} disabled={phase !== "playing"} />
          ))}
        </div>
      </div>

      <div style={S.footer}>
        {phase === "playing" && (
          <div style={S.hint}>{selected === null ? "Tap a tube to pick it up" : "Tap a destination tube"}</div>
        )}
      </div>

      {phase === "cleared" && (
        <div style={S.overlay}>
          <div style={S.ovCard}>
            <div style={{ ...S.ovTitle, color: T.go }}>Cleared!</div>
            <div style={S.ovSub}>{moves} moves used · {movesLeft} to spare</div>
            <button style={S.primary} onClick={nextRound}>Next Round</button>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div style={S.overlay}>
          <div style={S.ovCard}>
            <div style={{ ...S.ovTitle, color: T.danger }}>Out of moves</div>
            <div style={S.ovSub}>You reached Round {round}</div>
            <button style={S.primary} onClick={retry}>Retry Round</button>
            <button style={S.ghost} onClick={restartRun}>Start Over</button>
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
  progressTrack: { height: 4, margin: "0 20px 12px", background: T.line, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, transition: "all 300ms ease" },
  board: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  tubesRow: { display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", alignItems: "flex-end", maxWidth: 380 },
  footer: { padding: "12px 20px 32px", minHeight: 60, display: "flex", justifyContent: "center", alignItems: "center" },
  hint: { fontSize: 13, fontWeight: 700, color: T.muted, textAlign: "center" },
  overlay: { position: "fixed", inset: 0, background: "rgba(10,15,31,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(8px)" },
  ovCard: { background: T.card, border: `1px solid ${T.edge}`, borderRadius: 24, padding: 32, textAlign: "center", maxWidth: 320, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" },
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
`;
