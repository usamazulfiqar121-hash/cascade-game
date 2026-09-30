/* ═══════════ BOTTOM NAVIGATION ═══════════
   Floating glass bar with custom SVG icons. 4 items, thumb-zone
   optimized. (A center Play FAB was here once — removed in cd710f0
   once Play got its own big button on Home, so onPlay/PlayIcon/
   centerFab below aren't dead weight left for someone else to trip
   over wondering what wires into them.)

   Four tabs where there were three (Codex joined the row). The bar's
   inner layout is a flex with every TabButton at flex:1, so a fourth
   item takes its own share of the same fixed width rather than
   squeezing the others — the 320px case, the tightest the Home layout
   is tuned for, leaves ~66px per tab, comfortably more than the
   10px "Profile" and "Settings" labels need. Nothing was resized to
   make room. */

import { D } from "../constants";
import { HomeIcon, TrophyIcon, SettingsIcon, CodexIcon } from "../icons";

export default function BottomNav({ activeTab, onTabChange, onAwards, onCodex, onSettings }) {
  return (
    <div style={S.navWrap}>
      <div style={S.navGlass}>
        <div style={S.navGlow} aria-hidden="true" />
        <div style={S.navInner} role="tablist" aria-label="Main">
          <TabButton
            label="Home"
            active={activeTab === "home"}
            onClick={() => onTabChange("home")}
            renderIcon={(a) => <HomeIcon size={22} active={a} />}
          />

          <TabButton
            label="Profile"
            active={activeTab === "awards"}
            onClick={() => onAwards && onAwards()}
            renderIcon={(a) => <TrophyIcon size={22} active={a} />}
          />

          {/* Codex sits next to Profile rather than after Settings: both are
              "what have I done / what does this game contain" reference
              destinations, while Settings is a fixed set of toggles, and
              grouping the two lookups together keeps the far tab — the one
              a player visits least — out of the middle of the row. */}
          <TabButton
            label="Codex"
            active={activeTab === "codex"}
            onClick={() => onCodex && onCodex()}
            renderIcon={(a) => <CodexIcon size={22} active={a} />}
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
    /* aria-selected is what the tab pattern actually keys off, so the
       screen reader announces "selected" for the current tab instead of
       three equally-weighted buttons. aria-current="page" is kept
       alongside it because these also navigate away from the screen (they
       push a history entry and open a full-page view) — and omitted, not
       set to "false", when inactive: aria-current's "false" is a real
       value that some readers still announce. */
    <button
      onClick={onClick}
      className="press"
      style={S.tabBtn}
      role="tab"
      aria-selected={active}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <div style={{
        ...S.tabIconWrap,
        background: active ? `color-mix(in srgb, ${D.accent} 12.2%, transparent)` : "transparent",
        transform: active ? "scale(1.08)" : "scale(1)",
      }}>
        {renderIcon(active)}
      </div>
      <span style={{
        ...S.tabLabel,
        color: active ? D.accent : D.textSub,
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
    /* 50, not 100. Settings (screens/SettingsScreen.jsx) and Profile
       (AchievementsScreen.jsx) are both zIndex 80, so at 100 this bar
       painted OVER them — the glass bar sat on top of the open page and
       swallowed the taps on Settings' bottom rows, including "Reset
       Progress". Dropping it below 80 puts the nav behind both screens,
       which is the whole point: they are full-page views that cover the
       Home screen this bar belongs to.

       Lowered here rather than raising the two screens to 120 on purpose.
       Everything else that has to sit ABOVE a full-page view is a modal on
       the same 100: the upgrade picker, the game-over card, the
       Exit/Reset confirm dialog (theme.js S.overlay) and the Tutorial
       (S.tutOverlay) — and the first two of those are opened *from*
       Settings. Raising Settings past 100 would have buried the very
       "Reset All Progress?" confirm it spawns, and the Tutorial behind it.
       At 50 the nav keeps every relationship it needs: above the Home
       content it floats over (which has no z-index of its own), below the
       80 screens, below the 100 modals, and well below the toast (300)
       and the tap shield (400). */
    zIndex: 50,
    pointerEvents: "none",
  },
  navGlass: {
    position: "relative",
    background: "var(--nav-bg)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
    border: `1px solid ${D.glassBorder}`,
    borderRadius: 28,
    padding: "10px 12px",
    boxShadow: "0 20px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    pointerEvents: "auto",
  },
  navGlow: {
    position: "absolute",
    inset: -2,
    borderRadius: 28,
    background: `radial-gradient(80% 100% at 50% 100%, color-mix(in srgb, ${D.accent} 14.9%, transparent) 0%, transparent 70%)`,
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
    transition: `background ${D.tQuick}, transform ${D.tSpring}`,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: "0.02em",
    transition: `color ${D.tQuick}`,
  },
};
