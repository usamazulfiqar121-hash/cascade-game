import { D } from "../constants";

export default function SettingsScreen({
  soundOn, vibeOn,
  onToggleSound, onToggleVibe,
  onReset, onAwards, onClose,
  achievements, ACHIEVEMENTS,
  best = 0,
  isDaily = false,
  onExitDaily,
  theme = "dark",
  onSetTheme,
}) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <div>
            <div style={S.title}>Settings</div>
            <div style={S.subtitle}>Cascade v1.0.0</div>
          </div>
          <button onClick={onClose} style={S.closeBtn} className="press" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6L18 18M18 6L6 18" stroke={D.textSub} strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={S.scroll}>
          <Section label="PREFERENCES" />
          <Row
            icon={<SoundIcon on={soundOn} />}
            label="Sound"
            sub="SFX and effects"
            right={<Toggle on={soundOn} />}
            onClick={onToggleSound}
          />
          <Row
            icon={<VibeIcon on={vibeOn} />}
            label="Vibration"
            sub="Haptic feedback"
            right={<Toggle on={vibeOn} />}
            onClick={onToggleVibe}
          />
          <ThemeRow theme={theme} onSetTheme={onSetTheme} />

          <Section label="PROGRESS" />
          <Row
            icon={<TrophyIcon />}
            label="Achievements"
            sub={`${achievements.length} of ${ACHIEVEMENTS.length} unlocked`}
            right={<span style={S.chev}>›</span>}
            onClick={() => { onClose(); onAwards && onAwards(); }}
          />
          <Row
            icon={<BestIcon />}
            label="Best Round"
            sub="Personal record"
            right={<span style={S.statVal}>{best}</span>}
            disabled
          />

          {isDaily && (
            <>
              <Section label="SESSION" />
              <Row
                icon={<ExitIcon />}
                label="Exit Daily Mode"
                sub="Return to normal play"
                onClick={onExitDaily}
              />
            </>
          )}

          <Section label="DANGER ZONE" />
          <Row
            icon={<TrashIcon />}
            label="Reset Progress"
            sub="Cannot be undone"
            danger
            onClick={onReset}
          />
        </div>
      </div>
    </div>
  );
}

function Section({ label }) {
  return <div style={S.sectionLabel}>{label}</div>;
}

function Row({ icon, label, sub, right, onClick, danger, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={disabled ? "" : "press"}
      style={{
        ...S.row,
        cursor: disabled ? "default" : "pointer",
        background: danger ? "rgba(255, 92, 122, 0.05)" : "rgba(255, 255, 255, 0.02)",
        borderColor: danger ? "rgba(255, 92, 122, 0.15)" : "rgba(255, 255, 255, 0.05)",
      }}
    >
      <div style={{
        ...S.rowIcon,
        background: danger ? "rgba(255, 92, 122, 0.10)" : "rgba(255, 255, 255, 0.05)",
        borderColor: danger ? "rgba(255, 92, 122, 0.20)" : "rgba(255, 255, 255, 0.06)",
      }}>{icon}</div>
      <div style={S.rowBody}>
        <div style={{ ...S.rowLabel, color: danger ? D.danger : D.text }}>{label}</div>
        {sub && <div style={S.rowSub}>{sub}</div>}
      </div>
      <div style={S.rowRight}>{right}</div>
    </button>
  );
}

function ThemeRow({ theme, onSetTheme }) {
  const options = [
    { id: "light",  label: "Light",  Icon: SunIcon  },
    { id: "system", label: "Auto",   Icon: AutoIcon },
    { id: "dark",   label: "Dark",   Icon: MoonIcon },
  ];
  return (
    <div style={S.row}>
      <div style={{
        ...S.rowIcon,
        background: "rgba(255, 255, 255, 0.05)",
        borderColor: "rgba(255, 255, 255, 0.06)",
      }}>
        <ThemeIcon theme={theme} />
      </div>
      <div style={S.rowBody}>
        <div style={S.rowLabel}>Theme</div>
        <div style={S.rowSub}>Interface appearance</div>
      </div>
      <div style={S.themeSegment}>
        {options.map((opt) => {
          const active = theme === opt.id;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.id}
              onClick={() => onSetTheme && onSetTheme(opt.id)}
              className="press"
              style={{
                ...S.segmentBtn,
                background: active ? D.accent : "transparent",
                boxShadow: active ? `0 2px 8px ${D.accentSoft}` : "none",
              }}
              aria-label={opt.label}
            >
              <Icon active={active} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemeIcon({ theme }) {
  if (theme === "light") return <SunIcon active={true} />;
  if (theme === "system") return <AutoIcon active={true} />;
  return <MoonIcon active={true} />;
}

function SunIcon({ active }) {
  const c = active ? D.accent : D.textSub;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill={c}/>
      <path d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"
        stroke={c} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function MoonIcon({ active }) {
  const c = active ? "#FFFFFF" : D.textSub;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M21 12.79C20.11 13.28 19.11 13.55 18.06 13.55C14.5 13.55 11.61 10.66 11.61 7.1C11.61 6.05 11.88 5.05 12.37 4.16C12.61 3.73 12.29 3.19 11.81 3.25C6.94 3.85 3.14 8.06 3.14 13.14C3.14 18.6 7.55 23 13 23C18.08 23 22.29 19.2 22.89 14.33C22.95 13.85 22.41 13.53 21.98 13.77C21.66 13.94 21.34 14.09 21 14.22Z" fill={c}/>
    </svg>
  );
}

function AutoIcon({ active }) {
  const c = active ? "#FFFFFF" : D.textSub;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill={c}/>
      <path d="M2 17L12 22L22 17" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M2 12L12 17L22 12" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

function Toggle({ on }) {
  return (
    <span style={{
      ...S.toggle,
      background: on ? D.accent : "rgba(255, 255, 255, 0.08)",
      boxShadow: on ? `0 0 12px ${D.accent}55` : "none",
    }}>
      <span style={{
        ...S.toggleKnob,
        transform: on ? "translateX(18px)" : "translateX(0)",
      }} />
    </span>
  );
}

function SoundIcon({ on }) {
  const c = on ? D.accent : D.textSub;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M11 5L6 9H3V15H6L11 19V5Z" fill={on ? `${c}22` : "none"} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M15 9C15.5 9.5 16 10.7 16 12C16 13.3 15.5 14.5 15 15" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      {on && <path d="M18 6C19.2 7.2 20 9.5 20 12C20 14.5 19.2 16.8 18 18" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>}
    </svg>
  );
}

function VibeIcon({ on }) {
  const c = on ? D.accent : D.textSub;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="7" y="3" width="10" height="18" rx="2.5" fill={on ? `${c}22` : "none"} stroke={c} strokeWidth="1.8"/>
      <path d="M11 18H13" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      {on && <>
        <path d="M4 9V15" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M20 9V15" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      </>}
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M8 4H16V10C16 12.21 14.21 14 12 14C9.79 14 8 12.21 8 10V4Z" fill={`${D.gold}22`} stroke={D.gold} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M8 6H6C5 6 4 7 4 8V9C4 10.5 5.5 12 7 12" stroke={D.gold} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 6H18C19 6 20 7 20 8V9C20 10.5 18.5 12 17 12" stroke={D.gold} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 14V18M8 20H16" stroke={D.gold} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function BestIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L14.5 8.5L21 9.5L16.5 13.5L17.8 20L12 16.8L6.2 20L7.5 13.5L3 9.5L9.5 8.5L12 2Z" fill={`${D.accent}22`} stroke={D.accent} strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M15 4H19C19.55 4 20 4.45 20 5V19C20 19.55 19.55 20 19 20H15" stroke={D.gold} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 8L6 12L10 16" stroke={D.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 12H16" stroke={D.gold} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7H20" stroke={D.danger} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 7V5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5V7" stroke={D.danger} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6 7L7 19C7.05 19.55 7.5 20 8 20H16C16.5 20 16.95 19.55 17 19L18 7" fill={`${D.danger}11`} stroke={D.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 11V16M14 11V16" stroke={D.danger} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

const S = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(5, 7, 15, 0.88)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20, zIndex: 90,
    animation: "fadeIn 200ms ease",
  },
  card: {
    width: "100%", maxWidth: 380, maxHeight: "90vh",
    background: "rgba(15, 21, 40, 0.78)",
    backdropFilter: "blur(32px) saturate(160%)",
    WebkitBackdropFilter: "blur(32px) saturate(160%)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 24,
    padding: "20px 16px 16px",
    boxShadow: "0 32px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    fontFamily: "'Inter', system-ui, sans-serif",
    animation: "fadeUp 300ms cubic-bezier(0.16, 1, 0.3, 1)",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 16, padding: "0 4px",
  },
  title: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 22, fontWeight: 900,
    color: D.text, letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 11, fontWeight: 700, color: D.textDim,
    marginTop: 2, fontFamily: "'JetBrains Mono', monospace",
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", appearance: "none", WebkitAppearance: "none",
    padding: 0, outline: "none", WebkitTapHighlightColor: "transparent",
    flexShrink: 0,
  },
  scroll: { overflowY: "auto", paddingRight: 4, marginRight: -4 },
  sectionLabel: {
    fontSize: 10, fontWeight: 900, color: D.textDim,
    letterSpacing: "0.16em", padding: "16px 12px 8px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  row: {
    display: "flex", alignItems: "center", gap: 12,
    width: "100%", padding: "12px",
    border: "1px solid transparent", borderRadius: 14,
    appearance: "none", WebkitAppearance: "none",
    outline: "none", WebkitTapHighlightColor: "transparent",
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "left",
    marginBottom: 6,
    transition: `background ${D.tQuick}, border-color ${D.tQuick}`,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 11,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, border: "1px solid transparent",
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 14.5, fontWeight: 700, lineHeight: 1.2 },
  rowSub: { fontSize: 11, fontWeight: 600, color: D.textDim, marginTop: 2 },
  rowRight: { display: "flex", alignItems: "center", flexShrink: 0 },
  themeSegment: {
    display: "flex", alignItems: "center", gap: 2,
    padding: 3, borderRadius: 10,
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  segmentBtn: {
    width: 30, height: 26,
    border: "none", borderRadius: 7,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    padding: 0, outline: "none",
    WebkitTapHighlightColor: "transparent",
    transition: `background ${D.tQuick}, box-shadow ${D.tQuick}`,
  },
  chev: {
    fontSize: 22, fontWeight: 300, color: D.textDim,
    lineHeight: 1, marginTop: -2,
  },
  statVal: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 15, fontWeight: 800, color: D.accent,
    fontVariantNumeric: "tabular-nums",
  },
  toggle: {
    display: "inline-flex", alignItems: "center",
    width: 40, height: 22, borderRadius: 999, padding: 2,
    transition: `background ${D.tQuick}, box-shadow ${D.tQuick}`,
  },
  toggleKnob: {
    width: 18, height: 18, borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
    transition: `transform ${D.tQuick}`,
  },
};
