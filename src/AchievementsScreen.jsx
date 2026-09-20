/* ═══════════ PROFILE SCREEN ═══════════
   Full-page view: Best Round hero + Stats grid + Achievements list.
   iOS-style slide-in, back arrow header. */

import { D, ACHIEVEMENTS } from "./constants";

export default function AchievementsScreen({
  achievements,
  stats = { gamesPlayed: 0, totalRounds: 0, totalMoves: 0, highestCombo: 0 },
  best = 0,
  onClose,
  onBack,
}) {
  const handleBack = onBack || onClose;
  const count = achievements.length;
  const total = ACHIEVEMENTS.length;
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={handleBack} className="press" style={S.backBtn} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 6L9 12L15 18" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={S.title}>Profile</div>
        <div style={{ width: 40 }} />
      </div>

      {/* Scrollable content */}
      <div style={S.scroll}>
        {/* Hero — Best Round */}
        <div style={S.hero}>
          <div style={S.heroIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.5 8.5L21 9.5L16.5 13.5L17.8 20L12 16.8L6.2 20L7.5 13.5L3 9.5L9.5 8.5L12 2Z"
                fill="var(--gold)" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={S.heroLabel}>BEST ROUND</div>
          <div style={S.heroNum}>{best}</div>
          <div style={S.heroSub}>Personal record</div>
        </div>

        {/* Stats grid */}
        <div style={S.sectionLabel}>STATS</div>
        <div style={S.statsGrid}>
          <StatCard label="Games" value={stats.gamesPlayed} />
          <StatCard label="Rounds" value={stats.totalRounds} />
          <StatCard label="Moves" value={stats.totalMoves} />
          <StatCard label="Top Combo" value={`${stats.highestCombo}×`} />
        </div>

        {/* Achievements progress */}
        <div style={S.sectionLabel}>ACHIEVEMENTS</div>
        <div style={S.progressCard}>
          <div style={S.progressTop}>
            <span style={S.progressNum}>{count}</span>
            <span style={S.progressTotal}> / {total} unlocked</span>
          </div>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${pct}%` }} />
          </div>
        </div>

        {/* Achievement list */}
        <div style={S.grid}>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = achievements.includes(a.id);
            return (
              <div key={a.id} style={{
                ...S.card,
                borderColor: unlocked ? "rgba(255, 194, 75, 0.35)" : "var(--glass-border)",
                background: unlocked
                  ? "linear-gradient(135deg, rgba(255, 194, 75, 0.08) 0%, rgba(255, 194, 75, 0.02) 100%)"
                  : "var(--glass)",
                opacity: unlocked ? 1 : 0.55,
              }}>
                <div style={{
                  ...S.icon,
                  background: unlocked ? "rgba(255, 194, 75, 0.15)" : "rgba(122, 133, 168, 0.08)",
                  borderColor: unlocked ? "rgba(255, 194, 75, 0.35)" : "var(--glass-border)",
                  filter: unlocked ? "none" : "grayscale(1)",
                }}>{unlocked ? a.icon : "🔒"}</div>
                <div style={S.body}>
                  <div style={{ ...S.name, color: unlocked ? "var(--text)" : "var(--text-sub)" }}>{a.name}</div>
                  <div style={S.desc}>{a.desc}</div>
                </div>
                {unlocked && <div style={S.check}>✓</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={S.statCard}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

/* ═══════════ STYLES ═══════════ */

const S = {
  page: {
    position: "fixed", inset: 0,
    background: "var(--bg-0)",
    display: "flex", flexDirection: "column",
    animation: "slideInRight 320ms cubic-bezier(0.16, 1, 0.3, 1)",
    zIndex: 80,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "calc(env(safe-area-inset-top, 0px) + 16px) 20px 16px",
    borderBottom: "1px solid var(--glass-border)",
    background: "var(--bg-0)",
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    padding: 0, outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  title: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 17, fontWeight: 900,
    color: "var(--text)",
    letterSpacing: "-0.02em",
  },
  scroll: {
    flex: 1, overflowY: "auto",
    padding: "20px 20px calc(env(safe-area-inset-bottom, 0px) + 32px)",
    WebkitOverflowScrolling: "touch",
  },

  /* Hero — Best Round */
  hero: {
    textAlign: "center",
    padding: "24px 20px 28px",
    background: "linear-gradient(135deg, rgba(255, 194, 75, 0.10) 0%, rgba(255, 194, 75, 0.02) 100%)",
    border: "1px solid rgba(255, 194, 75, 0.25)",
    borderRadius: 20,
    marginBottom: 24,
  },
  heroIcon: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 44, height: 44,
    borderRadius: 14,
    background: "rgba(255, 194, 75, 0.15)",
    border: "1px solid rgba(255, 194, 75, 0.35)",
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 10, fontWeight: 900,
    color: "var(--gold)",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 56, fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  heroSub: {
    fontSize: 12, fontWeight: 600,
    color: "var(--text-sub)",
    marginTop: 10,
    letterSpacing: "0.01em",
  },

  /* Section label */
  sectionLabel: {
    fontSize: 10, fontWeight: 900,
    color: "var(--text-dim)",
    letterSpacing: "0.16em",
    padding: "0 4px 10px",
    marginTop: 4,
  },

  /* Stats grid */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    padding: "16px 14px",
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    borderRadius: 14,
    textAlign: "left",
  },
  statValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 24, fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.03em",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  statLabel: {
    fontSize: 11, fontWeight: 700,
    color: "var(--text-sub)",
    marginTop: 8,
    letterSpacing: "0.02em",
  },

  /* Achievement progress */
  progressCard: {
    padding: "16px 18px",
    borderRadius: 16,
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    marginBottom: 16,
  },
  progressTop: {
    display: "flex", alignItems: "baseline", marginBottom: 12,
  },
  progressNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 28, fontWeight: 800,
    color: "var(--gold)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  progressTotal: {
    fontSize: 13, fontWeight: 600,
    color: "var(--text-sub)",
    marginLeft: 2,
  },
  progressBar: {
    height: 6,
    background: "var(--glass-border)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--gold)",
    borderRadius: 999,
    transition: "width 500ms cubic-bezier(0.16, 1, 0.3, 1)",
    boxShadow: "0 0 12px var(--gold-soft)",
  },

  /* Achievement grid */
  grid: {
    display: "flex", flexDirection: "column",
    gap: 10,
  },
  card: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid var(--glass-border)",
    transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
  icon: {
    width: 44, height: 44,
    borderRadius: 13,
    border: "1.5px solid",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 14.5, fontWeight: 800,
    letterSpacing: "-0.01em", lineHeight: 1.2,
  },
  desc: {
    fontSize: 11.5, fontWeight: 600,
    color: "var(--text-dim)",
    marginTop: 3, lineHeight: 1.35,
  },
  check: {
    fontSize: 16, color: "var(--gold)",
    fontWeight: 900,
    flexShrink: 0,
  },
};
