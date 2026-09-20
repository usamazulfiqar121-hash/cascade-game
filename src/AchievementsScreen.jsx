/* ═══════════ ACHIEVEMENTS — Full Page ═══════════
   iOS-style slide-in, back arrow header, scrollable grid. */

import { D, ACHIEVEMENTS } from "./constants";

export default function AchievementsScreen({ achievements, onClose, onBack }) {
  const handleBack = onBack || onClose;
  const count = achievements.length;
  const total = ACHIEVEMENTS.length;
  const pct = (count / total) * 100;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button onClick={handleBack} className="press" style={S.backBtn} aria-label="Back">
          <ChevronLeft />
        </button>
        <div style={S.title}>Achievements</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={S.scroll}>
        <div style={S.progressCard}>
          <div style={S.progressTop}>
            <span style={S.progressNum}>{count}</span>
            <span style={S.progressTotal}> / {total} unlocked</span>
          </div>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${pct}%` }} />
          </div>
        </div>

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

        <div style={S.footer}>Keep playing to unlock all achievements</div>
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M15 6L9 12L15 18" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

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
  progressCard: {
    padding: "16px 18px",
    borderRadius: 16,
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    marginBottom: 20,
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
  footer: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 11, fontWeight: 600,
    color: "var(--text-dim)",
    letterSpacing: "0.02em",
  },
};
