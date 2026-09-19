/* ═══════════ HOME SCREEN ═══════════
   Clean premium landing. Restraint-driven design.
   v2: tightened glow, unified state colors, refined spacing. */

import { D } from "./constants";

export default function HomeScreen({
  onPlay, onDaily, onSettings,
  dailyResults, computeStreak, dailyKey,
  hasPlayedOnce, achievements, ACHIEVEMENTS,
}) {
  const todayDone = !!dailyResults[dailyKey()];
  const streak = computeStreak(dailyResults);

  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      key: dailyKey(d),
      label: ["S","M","T","W","T","F","S"][d.getDay()],
      done: !!dailyResults[dailyKey(d)],
      isToday: i === 0,
    });
  }

  /* Daily card unified color family */
  const dailyAccent = todayDone ? D.go : D.gold;
  const dailySoft = todayDone ? "rgba(34, 197, 138, 0.28)" : "rgba(255, 194, 75, 0.22)";
  const dailyBg = todayDone ? "rgba(34, 197, 138, 0.10)" : "rgba(255, 194, 75, 0.10)";
  const dailyBorderSoft = todayDone ? "rgba(34, 197, 138, 0.28)" : "rgba(255, 194, 75, 0.28)";

  return (
    <div style={S.homeRoot}>
      <div style={S.homeAmbient} aria-hidden="true" />

      <div style={S.homeContent}>
        {/* Title */}
        <div className="fade-up" style={{ ...S.titleBlock, animationDelay: "60ms" }}>
          <div style={S.title}>CASCADE</div>
          <div style={S.subtitle}>ROGUELIKE SORT</div>
        </div>

        {/* Play — primary CTA */}
        <button
          className="press fade-up"
          style={{ ...S.playBtn, animationDelay: "140ms" }}
          onClick={onPlay}
        >
          <span style={S.playIcon}>▶</span>
          <span style={S.playText}>Play</span>
        </button>

        {/* Daily card */}
        {hasPlayedOnce && (
          <button
            className="press fade-up"
            style={{
              ...S.dailyCard,
              animationDelay: "220ms",
              borderColor: dailySoft,
            }}
            onClick={onDaily}
          >
            {/* Header row */}
            <div style={S.dailyHeader}>
              <span style={{ ...S.dailyLabel, color: dailyAccent }}>
                {todayDone ? "✓  Daily Complete" : "🎯  Daily Challenge"}
              </span>
              {streak > 0 && (
                <span style={{
                  ...S.streakPill,
                  background: dailyBg,
                  borderColor: dailyBorderSoft,
                }}>
                  <span style={{ fontSize: 11, lineHeight: 1 }}>
                    {todayDone ? "✓" : "🔥"}
                  </span>
                  <span style={{ ...S.streakNum, color: dailyAccent }}>{streak}</span>
                </span>
              )}
            </div>

            {/* Week strip */}
            <div style={S.weekRow}>
              {days.map((d) => {
                const dotFilled = d.done;
                const dotToday = d.isToday && !d.done;
                const labelActive = d.isToday || d.done;
                return (
                  <div key={d.key} style={S.dayCol}>
                    <div style={{
                      ...S.dayLabel,
                      color: labelActive ? D.text : "rgba(122, 133, 168, 0.55)",
                    }}>{d.label}</div>
                    <div style={{
                      ...S.dayDot,
                      background: dotFilled ? D.go : "transparent",
                      borderColor: dotFilled
                        ? D.go
                        : dotToday
                        ? "rgba(255, 194, 75, 0.70)"
                        : "rgba(255, 255, 255, 0.10)",
                      boxShadow: dotFilled
                        ? "0 0 10px rgba(34, 197, 138, 0.35)"
                        : dotToday
                        ? "0 0 0 4px rgba(255, 194, 75, 0.10)"
                        : "none",
                    }} />
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div style={{
              ...S.dailyCta,
              color: todayDone ? D.go : D.textSub,
            }}>
              {todayDone ? "Come back tomorrow" : "Tap to play today's puzzle"}
            </div>
          </button>
        )}

        {/* Footer */}
        <div className="fade-up" style={{ ...S.footerRow, animationDelay: "300ms" }}>
          <button
            className="press"
            style={S.iconBtn}
            onClick={onSettings}
            aria-label="Settings"
          >⚙️</button>

          <div style={S.achPill}>
            <span style={{ fontSize: 13, lineHeight: 1 }}>🏆</span>
            <span style={S.achCount}>
              {achievements.length}
              <span style={S.achTotal}> / {ACHIEVEMENTS.length}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ STYLES ═══════════ */
const S = {
  homeRoot: {
    position: "fixed", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#05070F",
    overflow: "hidden",
  },
  homeAmbient: {
    position: "absolute", inset: 0,
    background: `
      radial-gradient(80% 50% at 50% 0%, rgba(76, 141, 255, 0.10) 0%, transparent 60%),
      radial-gradient(60% 40% at 50% 100%, rgba(76, 141, 255, 0.05) 0%, transparent 60%),
      linear-gradient(180deg, #05070F 0%, #0A0F1F 100%)
    `,
    pointerEvents: "none",
  },
  homeContent: {
    position: "relative",
    display: "flex", flexDirection: "column",
    alignItems: "center",
    gap: 18,
    padding: "24px 24px 0",
    width: "100%",
    maxWidth: 360,
  },

  /* Title */
  titleBlock: {
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 48, fontWeight: 900, lineHeight: 1,
    color: D.text, letterSpacing: "-0.045em",
  },
  subtitle: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 10, fontWeight: 800,
    color: D.textSub, letterSpacing: "0.32em",
    marginTop: 14,
  },

  /* Play button — subtler glow */
  playBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 12,
    width: "100%", height: 64,
    border: "none",
    borderRadius: 999,
    background: D.accentGrad,
    color: "#fff",
    cursor: "pointer",
    boxShadow: `0 8px 20px rgba(76, 141, 255, 0.28), inset 0 1px 0 rgba(255,255,255,0.18)`,
    appearance: "none", WebkitAppearance: "none",
    padding: 0, outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  playIcon: {
    fontSize: 15, lineHeight: 1,
    opacity: 0.95,
    transform: "translateX(1px)",
  },
  playText: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 22, fontWeight: 900, lineHeight: 1,
    letterSpacing: "-0.02em",
  },

  /* Daily card — tighter gap */
  dailyCard: {
    display: "flex", flexDirection: "column",
    gap: 14,
    width: "100%",
    background: "rgba(15, 21, 40, 0.62)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border: "1px solid rgba(255, 194, 75, 0.22)",
    borderRadius: 18,
    padding: "18px 20px 18px",
    cursor: "pointer",
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "left",
    color: D.text,
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.32)",
    appearance: "none", WebkitAppearance: "none",
    margin: 0, outline: "none",
    WebkitTapHighlightColor: "transparent",
    transition: `border-color ${D.tQuick}`,
  },
  dailyHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dailyLabel: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11, fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    transition: `color ${D.tQuick}`,
  },
  streakPill: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "3px 9px",
    borderRadius: 999,
    border: "1px solid transparent",
    transition: `all ${D.tQuick}`,
  },
  streakNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
    transition: `color ${D.tQuick}`,
  },

  weekRow: {
    display: "flex", justifyContent: "space-between",
    gap: 4,
  },
  dayCol: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 9,
    flex: 1,
  },
  dayLabel: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 10, fontWeight: 800,
    letterSpacing: "0.06em",
    transition: `color ${D.tQuick}`,
  },
  dayDot: {
    width: 22, height: 22, borderRadius: "50%",
    border: "1.5px solid transparent",
    transition: `all ${D.tQuick}`,
  },

  dailyCta: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11.5, fontWeight: 700,
    textAlign: "center",
    letterSpacing: "0.01em",
    transition: `color ${D.tQuick}`,
  },

  /* Footer */
  footerRow: {
    display: "flex", alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  iconBtn: {
    width: 44, height: 44,
    borderRadius: 12,
    background: "rgba(15, 21, 40, 0.55)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: D.textSub,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 17,
    appearance: "none", WebkitAppearance: "none",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  achPill: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(15, 21, 40, 0.55)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    padding: "12px 16px",
  },
  achCount: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12, fontWeight: 800,
    color: D.text,
    fontVariantNumeric: "tabular-nums",
  },
  achTotal: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11, fontWeight: 600,
    color: D.textDim,
  },
};
