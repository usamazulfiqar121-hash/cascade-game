/* ═══════════ THEME LAYER ═══════════
   Style objects (S). Design system consumers. */

import { T, D } from "./constants";

export const S = {
  root: {
    position: "fixed", inset: 0,
    background: "var(--bg-grad)",
    color: "var(--text)",
    fontFamily: "'Inter', system-ui, sans-serif",
    display: "flex", flexDirection: "column",
    overflow: "hidden", userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transition: "background 280ms cubic-bezier(0.4, 0, 0.2, 1), color 280ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  gameRoot: {
    position: "fixed", inset: 0,
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  hud: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "calc(env(safe-area-inset-top, 0px) + 14px) 20px 10px",
  },
  roundLabel: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontWeight: 900, fontSize: 20, color: "var(--text)",
    letterSpacing: "-0.02em", lineHeight: 1.1, whiteSpace: "nowrap",
  },
  colorCount: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: 600, fontSize: 11.5, color: "var(--text-sub)", marginTop: 3,
    letterSpacing: "0.01em",
  },
  movesLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 800, fontSize: 22,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap",
  },
  movesSub: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontWeight: 600, fontSize: 11, color: "var(--text-sub)", marginLeft: 6,
    letterSpacing: "0.01em",
  },
  progressTrack: {
    height: 3, margin: "0 20px 12px",
    background: "var(--line-strong)", borderRadius: 999, overflow: "hidden",
  },
  progressFill: {
    height: "100%", borderRadius: 999,
    transition: "width 400ms cubic-bezier(0.16, 1, 0.3, 1), background 300ms ease",
  },
  upgradeStrip: { display: "flex", gap: 4, padding: "0 20px 8px", flexWrap: "wrap" },
  board: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  tubesRow: { display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", alignItems: "flex-end", maxWidth: 400 },
  /* A wrong move's red pulse. Always mounted at opacity 0 and pulsed by
     Element.animate() in App.jsx (see the effect keyed on `shake`) rather
     than toggled via React state, so a quick second wrong tap can restart
     it mid-fade instead of queuing behind a class-based animation. Sized
     past the row's own edges since the tubes it overlays can be lifted
     (mid-pour) or lightly rotated by the shake itself. */
  wrongFlash: {
    position: "absolute", inset: -24,
    borderRadius: 32,
    background: `radial-gradient(ellipse at center, color-mix(in srgb, ${T.danger} 50%, transparent) 0%, transparent 72%)`,
    opacity: 0,
    pointerEvents: "none",
  },
  footer: {
    padding: "12px 20px calc(env(safe-area-inset-bottom, 0px) + 110px)",
    minHeight: 60,
    display: "flex", justifyContent: "center", alignItems: "center",
  },
  hint: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 12.5, fontWeight: 600, color: "var(--text-sub)",
    textAlign: "center", letterSpacing: "0.02em",
  },
  /* Scrolls, and centres its card with margin: auto instead of
     align-items: center. With align-items: center a card taller than the
     screen overflows equally off the top AND the bottom of a container that
     can't scroll, so nothing past the edge was reachable: the Daily
     game-over card (score card + ghost field + friends + one-attempt card)
     is ~960px tall, which cut off its own top on a 390x844 phone and put
     "Share Result" and "Home" out of reach on a 360x640 one. Auto margins
     centre the card when there is spare room and collapse to zero when
     there isn't, so a short card looks exactly as before and a tall one
     starts at the top and scrolls. */
  overlay: { position: "fixed", inset: 0, background: "var(--overlay-bg)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto", overscrollBehavior: "contain", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 100 },
  ovCard: { background: T.card, border: `1px solid ${T.edge}`, borderRadius: 24, padding: 24, textAlign: "center", maxWidth: 320, width: "100%", margin: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" },
  ovIconCircle: { width: 64, height: 64, borderRadius: 20, background: `color-mix(in srgb, ${T.danger} 13.3%, transparent)`, border: `2px solid color-mix(in srgb, ${T.danger} 33.3%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  ovBigNum: { fontSize: 72, fontWeight: 900, color: T.ink, letterSpacing: "-0.05em", lineHeight: 1, marginTop: 8 },
  ovBigLabel: { fontSize: 11, fontWeight: 900, letterSpacing: "0.15em", color: T.muted, marginTop: 6, textTransform: "uppercase" },
  ovNewBest: { display: "inline-block", background: `color-mix(in srgb, ${T.gold} 13.3%, transparent)`, border: `1px solid color-mix(in srgb, ${T.gold} 40%, transparent)`, color: T.goldText, fontSize: 12, fontWeight: 900, padding: "6px 14px", borderRadius: 999, marginTop: 12 },
  ovStats: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "20px 0 20px" },
  ovStat: { background: `color-mix(in srgb, ${T.bg} 50.2%, transparent)`, border: `1px solid ${T.edge}`, borderRadius: 14, padding: "12px 6px", textAlign: "center" },
  ovStatNum: { fontSize: 22, fontWeight: 900, color: T.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" },
  ovStatLabel: { fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 },
  dailyBadge: { display: "inline-block", fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: T.goldText, background: `color-mix(in srgb, ${T.gold} 13.3%, transparent)`, border: `1px solid color-mix(in srgb, ${T.gold} 40%, transparent)`, padding: "2px 6px", borderRadius: 6, marginRight: 6, verticalAlign: "middle" },
  comboBadge: {
    display: "flex", alignItems: "center", gap: 6,
    alignSelf: "center",
    background: "var(--gold-soft)",
    border: "1px solid var(--gold)",
    borderRadius: 999, padding: "5px 12px 5px 10px",
    marginBottom: 8,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },
  comboFlame: { fontSize: 13 },
  comboText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12, fontWeight: 800, color: "var(--gold-text)",
    letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums",
  },
  /* ─── HOME SCREEN ─── */
  settingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: `color-mix(in srgb, ${T.bg} 50.2%, transparent)`, border: `1px solid ${T.edge}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", fontFamily: "'Nunito', sans-serif", color: T.ink },
  settingLabel: { fontWeight: 800, fontSize: 14 },
  togglePill: { fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", color: "#fff", padding: "4px 10px", borderRadius: 999 },
  /* Was a flat rgba(10,15,31,0.95) — dark's own scrim color, hardcoded
     regardless of data-theme, unlike every other overlay in this file
     (see S.overlay just above, which already uses var(--overlay-bg)).
     A light-theme player got a near-opaque navy backdrop behind a white
     card — the exact bug already fixed twice elsewhere this session
     (index.css, globalStyles.js), just missed here. Also added the
     -webkit- prefix S.overlay already carries: without it, backdrop-filter
     silently no-ops on WebKit (Capacitor iOS's webview), leaving a flat
     scrim with no blur at all on that platform. */
  tutOverlay: { position: "fixed", inset: 0, background: "var(--overlay-bg)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto", overscrollBehavior: "contain", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 100 },
  tutCard: { background: T.card, border: `1px solid ${T.edge}`, borderRadius: 28, padding: 28, maxWidth: 380, width: "100%", margin: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" },
  tutHeader: { textAlign: "center", marginBottom: 24 },
  tutIconCircle: { width: 64, height: 64, borderRadius: 20, background: `color-mix(in srgb, ${T.accent} 13.3%, transparent)`, border: `2px solid color-mix(in srgb, ${T.accent} 33.3%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  tutTitle: { fontWeight: 900, fontSize: 24, color: T.ink, letterSpacing: "-0.02em" },
  tutSub: { fontSize: 13, fontWeight: 700, color: T.muted, marginTop: 4 },
  tutSteps: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 },
  tutStep: { display: "flex", alignItems: "flex-start", gap: 14 },
  tutNum: { width: 32, height: 32, borderRadius: 10, background: T.accent, color: "#fff", fontWeight: 900, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tutStepBody: { flex: 1, minWidth: 0, paddingTop: 2 },
  tutStepTitle: { fontWeight: 900, fontSize: 15, color: T.ink },
  tutStepDesc: { fontSize: 13, fontWeight: 600, color: T.muted, marginTop: 2, lineHeight: 1.45 },
  tutWarning: { display: "flex", alignItems: "center", gap: 10, background: `color-mix(in srgb, ${T.danger} 8.2%, transparent)`, border: `1px solid color-mix(in srgb, ${T.danger} 26.7%, transparent)`, borderRadius: 14, padding: "10px 14px", marginBottom: 20, fontSize: 12, fontWeight: 700, color: T.ink, lineHeight: 1.4 },
  ovTitle: { fontWeight: 900, fontSize: 28, letterSpacing: "-0.02em" },
  ovSub: { fontSize: 14, fontWeight: 600, color: T.muted, marginTop: 8, marginBottom: 24 },
  primary: { display: "block", width: "100%", background: T.accent, color: "#fff", border: "none", borderRadius: 999, padding: "14px 24px", fontFamily: "'Nunito', sans-serif", fontWeight: 900, fontSize: 15, cursor: "pointer", boxShadow: `0 8px 24px color-mix(in srgb, ${T.accent} 33.3%, transparent)` },
  ghost: { display: "block", width: "100%", background: "transparent", color: T.muted, border: "none", padding: 12, fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer", marginTop: 6 },
  /* Confirm buttons for actions that destroy something (Exit with progress,
     Reset): red instead of the friendly accent blue every harmless confirm
     uses, and a Cancel that reads as a real button rather than faint text. */
  primaryDanger: { display: "block", width: "100%", background: T.danger, color: "#fff", border: "none", borderRadius: 999, padding: "14px 24px", fontFamily: "'Nunito', sans-serif", fontWeight: 900, fontSize: 15, cursor: "pointer", boxShadow: `0 8px 24px color-mix(in srgb, ${T.danger} 33.3%, transparent)` },
  cancelOutline: { display: "block", width: "100%", background: "transparent", color: T.ink, border: `1.5px solid ${T.edge}`, borderRadius: 999, padding: "12px 24px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 10 },
};
