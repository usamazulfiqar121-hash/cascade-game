/* ═══════════ HOME SCREEN ═══════════
   Landing screen: Play, Daily Challenge, Settings, Achievements.
   White card bug fixed via appearance: none reset on glass buttons. */

import { D } from "./constants";

export default function HomeScreen({
  onPlay, onDaily, onSettings,
  dailyResults, computeStreak, dailyKey,
  hasPlayedOnce, achievements, ACHIEVEMENTS,
}) {
  const todayDone = !!dailyResults[dailyKey()];
  const streak = computeStreak(dailyResults);

  /* Week strip — last 7 days, oldest → newest */
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = dailyKey(d);
    days.push({
      key: k,
      label: ["S","M","T","W","T","F","S"][d.getDay()],
      done: !!dailyResults[k],
      isToday: i === 0,
    });
  }

  return (
    <div style={S.homeRoot}>
      {/* Ambient background — static radial gradients (GPU-safe) */}
      <div aria-hidden="true" style={S.homeAmbient} />

      <div style={S.homeContent}>
        {/* Title block */}
        <div className="fade-up" style={{ ...S.homeTitleBlock, animationDelay: "60ms" }}>
          <div className="font-display" style={S.homeTitle}>CASCADE</div>
          <div className="text-overline" style={S.homeSubtitle}>ROGUELIKE SORT</div>
        </div>

        {/* Primary CTA — Play */}
        <button
          className="press fade-up"
          style={{ ...S.homePlayBtn, animationDelay: "140ms" }}
          onClick={onPlay}
        >
          <span style={S.homePlayGlow} aria-hidden="true" />
          <span style={S.homePlayInner}>
            <span style={S.homePlayIcon}>▶</span>
            <span className="font-display" style={S.homePlayText}>Play</span>
          </span>
        </button>

        {/* Daily Challenge card */}
        {hasPlayedOnce && (
          <button
            className="press fade-up"
            style={{
              ...S.homeDailyCard,
              animationDelay: "220ms",
              borderColor: todayDone ? "rgba(34, 197, 138, 0.4)" : "rgba(255, 194, 75, 0.32)",
            }}
            onClick={onDaily}
          >
            <div style={S.homeDailyHeader}>
              <span style={S.homeDailyIcon}>🎯</span>
              <span className="text-overline" style={S.homeDailyLabel}>Daily Challenge</span>
              {streak > 0 && (
                <span style={S.homeStreak}>
                  <span style={{ fontSize: 13, lineHeight: 1 }}>🔥</span>
                  <span className="font-mono" style={S.homeStreakNum}>{streak}</span>
                </span>
              )}
            </div>

            <div style={S.homeWeekRow}>
              {days.map((d) => (
                <div key={d.key} style={S.homeDayCol}>
                  <div style={S.homeDayLabel}>{d.label}</div>
                  <div style={{
                    ...S.homeDayDot,
                    background: d.done ? D.go : "transparent",
                    borderColor: d.done ? D.go : (d.isToday ? D.accent : D.textDim),
                    boxShadow: d.isToday && !d.done
                      ? `0 0 0 3px ${D.accentGlow}`
                      : (d.done ? `0 0 8px ${D.goGlow}` : "none"),
                    transform: d.isToday ? "scale(1.12)" : "scale(1)",
                  }} />
                </div>
              ))}
            </div>

            <div style={{
              ...S.homeDailyCta,
              color: todayDone ? D.go : D.textSub,
            }}>
              {todayDone ? "✓ Completed — come back tomorrow" : "Tap to play today's puzzle"}
            </div>
          </button>
        )}

        {/* Footer — settings + achievements */}
        <div className="fade-up" style={{ ...S.homeFooterRow, animationDelay: "300ms" }}>
          <button
            className="press glass-minimal"
            style={S.homeIconBtn}
            onClick={onSettings}
            aria-label="Settings"
          >⚙️</button>

          <div className="glass-minimal" style={S.homeAchPill}>
            <span style={{ fontSize: 14 }}>🏆</span>
            <span className="font-mono" style={{ fontSize: 12, fontWeight: 900, color: D.text }}>
              {achievements.length}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: D.textDim }}>
              / {ACHIEVEMENTS.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ HOME STYLES ═══════════ */
const S = {
  homeRoot: {
    position: "fixed", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#05070F", overflow: "hidden",
  },
  homeAmbient: {
    position: "absolute", inset: 0,
    background: "radial-gradient(80% 60% at 20% 15%, rgba(76, 141, 255, 0.10) 0%, transparent 55%), radial-gradient(70% 50% at 85% 75%, rgba(255, 194, 75, 0.06) 0%, transparent 55%), linear-gradient(180deg, #05070F 0%, #0A0F1F 100%)",
    pointerEvents: "none",
  },
  homeContent: {
    position: "relative",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: D.s24, padding: D.s24,
    width: "100%", maxWidth: 380,
  },
  homeTitleBlock: { textAlign: "center", marginBottom: D.s8 },
  homeTitle: { fontSize: 52, lineHeight: 1, color: D.text },
  homeSubtitle: { color: D.textSub, marginTop: D.s12 },

  homePlayBtn: {
    position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", height: 68,
    border: "none", borderRadius: D.rPill,
    background: D.accentGrad, color: "#fff",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: `${D.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
    overflow: "hidden",
    /* ── BUTTON RESET (fixes UA defaults) ── */
    appearance: "none",
    WebkitAppearance: "none",
    padding: 0,
    margin: 0,
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  homePlayGlow: {
    position: "absolute", inset: 0,
    background: "radial-gradient(60% 100% at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  homePlayInner: { position: "relative", display: "flex", alignItems: "center", gap: D.s12 },
  homePlayIcon: { fontSize: 22, lineHeight: 1 },
  homePlayText: { fontSize: 24, lineHeight: 1 },

  homeDailyCard: {
    display: "flex", flexDirection: "column", gap: D.s16,
    width: "100%",
    background: D.glassStandard,
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
    border: "1px solid rgba(255, 194, 75, 0.32)",
    borderRadius: D.rCard,
    padding: `${D.s16}px ${D.s24}px`,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    textAlign: "left", color: D.text,
    boxShadow: D.shadowMd,
    /* ── BUTTON RESET (fixes white card bug) ── */
    appearance: "none",
    WebkitAppearance: "none",
    margin: 0,
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  homeDailyHeader: { display: "flex", alignItems: "center", gap: D.s8 },
  homeDailyIcon: { fontSize: 18, lineHeight: 1 },
  homeDailyLabel: { flex: 1, color: D.gold },
  homeStreak: {
    display: "flex", alignItems: "center", gap: D.s4,
    background: "rgba(255, 194, 75, 0.18)",
    border: "1px solid rgba(255, 194, 75, 0.4)",
    padding: "4px 10px", borderRadius: D.rPill,
  },
  homeStreakNum: { fontSize: 13, color: D.gold },

  homeWeekRow: {
    display: "flex", justifyContent: "space-between", gap: D.s4,
    paddingTop: D.s4,
  },
  homeDayCol: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: D.s8, flex: 1,
  },
  homeDayLabel: {
    fontSize: 10, fontWeight: 800, color: D.textSub,
    letterSpacing: "0.08em", fontFamily: "'Inter', sans-serif",
  },
  homeDayDot: {
    width: 22, height: 22, borderRadius: "50%",
    border: "1.5px solid transparent",
    transition: `all ${D.tQuick}`,
  },
  homeDailyCta: {
    fontSize: 12, fontWeight: 700, textAlign: "center",
    letterSpacing: "0.01em", fontFamily: "'Inter', sans-serif",
  },

  homeFooterRow: { display: "flex", alignItems: "center", gap: D.s12, marginTop: D.s8 },
  homeIconBtn: {
    width: 48, height: 48, borderRadius: D.rSm,
    border: `1px solid ${D.glassBorder}`,
    color: D.textSub, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, fontFamily: "'Inter', sans-serif",
    appearance: "none", WebkitAppearance: "none", outline: "none",
  },
  homeAchPill: {
    display: "flex", alignItems: "center", gap: D.s8,
    border: `1px solid ${D.glassBorder}`,
    borderRadius: D.rPill, padding: "12px 18px",
    fontFamily: "'Inter', sans-serif",
  },
};
