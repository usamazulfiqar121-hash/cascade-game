/* ═══════════ BOTTOM NAVIGATION ═══════════
   Floating glass bar with custom SVG icons.
   Center FAB = Play. 4 items, thumb-zone optimized. */

import { D } from "../constants";
import { HomeIcon, PlayIcon, TrophyIcon, SettingsIcon } from "../icons";

export default function BottomNav({ activeTab, onTabChange, onPlay, onAwards, onSettings }) {
  return (
    <div style={S.navWrap}>
      <div style={S.navGlass}>
        <div style={S.navGlow} aria-hidden="true" />
        <div style={S.navInner}>
          <TabButton
            label="Home"
            active={activeTab === "home"}
            onClick={() => onTabChange("home")}
            renderIcon={(a) => <HomeIcon size={22} active={a} />}
          />

          <button
            onClick={onPlay}
            className="press"
            style={S.centerFab}
            aria-label="Play"
          >
            <PlayIcon size={22} white={true} />
          </button>

          <TabButton
            label="Awards"
            active={activeTab === "awards"}
            onClick={() => onAwards && onAwards()}
            renderIcon={(a) => <TrophyIcon size={22} active={a} />}
          />

          <TabButton
            label="Settings"
            active={activeTab === "settings"}
            onClick={() => onSettings && onSettings()}
            renderIcon={(a) => <SettingsIcon size={22} active={a} />}
          />
        </div>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick, renderIcon }) {
  return (
    <button
      onClick={onClick}
      className="press"
      style={S.tabBtn}
      aria-label={label}
    >
      <div style={{
        ...S.tabIconWrap,
        background: active ? "rgba(76, 141, 255, 0.12)" : "transparent",
      }}>
        {renderIcon(active)}
      </div>
      <span style={{
        ...S.tabLabel,
        color: active ? D.accent : D.textDim,
        fontWeight: active ? 900 : 700,
      }}>{label}</span>
    </button>
  );
}

const S = {
  navWrap: {
    position: "fixed",
    bottom: 0, left: 0, right: 0,
    padding: "0 16px 20px",
    zIndex: 100,
    pointerEvents: "none",
  },
  navGlass: {
    position: "relative",
    background: "rgba(10, 15, 31, 0.85)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 28,
    padding: "10px 12px",
    boxShadow: "0 20px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    pointerEvents: "auto",
  },
  navGlow: {
    position: "absolute",
    inset: -2,
    borderRadius: 28,
    background: "radial-gradient(80% 100% at 50% 100%, rgba(76, 141, 255, 0.15) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: -1,
  },
  navInner: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 4,
    padding: "8px 4px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  tabIconWrap: {
    width: 36, height: 36,
    borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: `background ${D.tQuick}`,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: "0.02em",
    transition: `color ${D.tQuick}`,
  },
  centerFab: {
    width: 56, height: 56,
    borderRadius: 999,
    background: D.accentGrad,
    border: "2px solid rgba(10, 15, 31, 0.9)",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    outline: "none",
    padding: 0,
    margin: "0 4px",
    boxShadow: "0 8px 24px rgba(76, 141, 255, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    WebkitTapHighlightColor: "transparent",
  },
};
