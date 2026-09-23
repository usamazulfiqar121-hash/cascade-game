/* ═══════════ GLOBAL CSS ═══════════
   Theme variables, keyframes, utility classes. Injected via
   <style>{CSS}</style> in App.jsx. Pure string — no React.
   Extracted from App.jsx during cleanup pass. */

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=Inter:wght@600;700;800;900&family=JetBrains+Mono:wght@700;800&family=Nunito:wght@600;800;900&display=swap');

/* ═══════════ THEME VARIABLES ═══════════ */
:root[data-theme="dark"] {
  --bg-0: #04060D;
  --bg-1: #0A0F1F;
  --bg-2: #121A31;
  --glass: rgba(15, 21, 40, 0.72);
  --glass-elevated: rgba(20, 27, 50, 0.88);
  --glass-modal: rgba(10, 15, 31, 0.94);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-active: rgba(255, 255, 255, 0.16);
  --text: #EAF0FF;
  --text-sub: #7A85A8;
  --text-dim: #4A5578;
  --accent: #4C8DFF;
  --accent-soft: rgba(76, 141, 255, 0.35);
  --accent-grad: linear-gradient(135deg, #5A9BFF 0%, #3B7BF0 100%);
  --accent-glow: 0 12px 32px rgba(76, 141, 255, 0.4);
  --gold: #FFC24B;
  --gold-soft: rgba(255, 194, 75, 0.35);
  --gold-glow: 0 12px 32px rgba(255, 194, 75, 0.35);
  --go: #22C58A;
  --go-soft: rgba(34, 197, 138, 0.4);
  --go-glow: 0 12px 32px rgba(34, 197, 138, 0.35);
  --danger: #FF5C7A;
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.35);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 20px 48px rgba(0, 0, 0, 0.55);
  --card: #141B32;
  --ink: #EAF0FF;
  --muted: #7A85A8;
  --line: #222E4C;
  --edge: rgba(140, 170, 255, 0.10);
  --tube-bg: rgba(255, 255, 255, 0.04);
  --tube-edge: rgba(255, 255, 255, 0.10);
  --tube-highlight: rgba(255, 255, 255, 0.08);
  --bg-grad: radial-gradient(120% 80% at 50% 30%, #121A31 0%, #0A0F1F 70%);
  --line-strong: rgba(255, 255, 255, 0.12);
  --overlay-bg: rgba(5, 7, 15, 0.85);
  --nav-bg: rgba(10, 15, 31, 0.85);
  --nav-border: rgba(10, 15, 31, 0.9);
  color-scheme: dark;
}

:root[data-theme="light"] {
  --bg-0: #F2F4FA;
  --bg-1: #FFFFFF;
  --bg-2: #F7F8FC;
  --glass: rgba(255, 255, 255, 0.72);
  --glass-elevated: rgba(255, 255, 255, 0.88);
  --glass-modal: rgba(255, 255, 255, 0.96);
  --glass-border: rgba(15, 23, 42, 0.08);
  --glass-border-active: rgba(15, 23, 42, 0.16);
  --text: #0F172A;
  --text-sub: #64748B;
  --text-dim: #94A3B8;
  --accent: #2563EB;
  --accent-soft: rgba(37, 99, 235, 0.28);
  --accent-grad: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
  --accent-glow: 0 12px 32px rgba(37, 99, 235, 0.28);
  --gold: #D97706;
  --gold-soft: rgba(217, 119, 6, 0.28);
  --gold-glow: 0 12px 32px rgba(217, 119, 6, 0.25);
  --go: #059669;
  --go-soft: rgba(5, 150, 105, 0.28);
  --go-glow: 0 12px 32px rgba(5, 150, 105, 0.25);
  --danger: #DC2626;
  --shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.08);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.10);
  --shadow-lg: 0 20px 48px rgba(15, 23, 42, 0.12);
  --card: #FFFFFF;
  --ink: #0F172A;
  --muted: #64748B;
  --line: #E2E8F0;
  --edge: rgba(15, 23, 42, 0.08);
  --tube-bg: rgba(15, 23, 42, 0.06);
  --tube-edge: rgba(15, 23, 42, 0.18);
  --tube-highlight: rgba(255, 255, 255, 0.5);
  --bg-grad: radial-gradient(120% 80% at 50% 30%, #FFFFFF 0%, #EDF1F7 70%);
  --line-strong: rgba(15, 23, 42, 0.12);
  --overlay-bg: rgba(15, 23, 42, 0.35);
  --nav-bg: rgba(255, 255, 255, 0.88);
  --nav-border: rgba(15, 23, 42, 0.10);
  color-scheme: light;
}

/* Smooth theme transition */
html, body {
  transition: background-color 280ms cubic-bezier(0.4, 0, 0.2, 1),
              color 280ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes achSlideIn {
  0% { opacity: 0; transform: translateY(-30px); }
  60% { transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
.achSlide { animation: achSlideIn 400ms cubic-bezier(.16,1.1,.3,1); }

html, body, #root {
  background: #0A0F1F;
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'cv11', 'ss01', 'ss03';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
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

/* ═══════════ TUBE STATES ═══════════ */
.tube-btn[data-state="selected"] {
  transform: translateY(-10px);
  border-color: var(--accent);
  box-shadow: 0 12px 32px var(--accent-soft), 0 0 0 1px var(--accent-soft);
  background: var(--glass);
}
.tube-btn[data-state="solved"] {
  border-color: var(--go);
  box-shadow: 0 0 0 2px var(--go-soft), 0 6px 20px var(--go-soft);
}
.tube-btn[data-state="solved"]::after {
  content: "✓";
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 11px;
  font-weight: 900;
  color: var(--go);
  text-shadow: 0 0 6px var(--go-soft);
}
.tube-btn[data-state="hintFrom"] {
  border-color: var(--go);
  animation: hintPulse 800ms ease-in-out infinite;
}
.tube-btn[data-state="hintTo"] {
  border-color: var(--go);
  opacity: 0.92;
  box-shadow: 0 0 0 3px var(--go-soft);
}
@keyframes hintPulse {
  0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 0 0 3px var(--go-soft); }
  50%      { transform: translateY(-3px) scale(1.02); box-shadow: 0 0 0 6px transparent; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);   opacity: 1; }
}
@keyframes slideOutRight {
  from { transform: translateX(0);   opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}

/* ═══════════ PREMIUM UTILITIES ═══════════ */
.glass-premium {
  background: rgba(20, 27, 50, 0.88);
  backdrop-filter: blur(40px) saturate(140%);
  -webkit-backdrop-filter: blur(40px) saturate(140%);
}
.glass-standard {
  background: rgba(15, 21, 40, 0.72);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}
.glass-minimal {
  background: rgba(15, 21, 40, 0.55);
}
.press {
  transition: transform 120ms cubic-bezier(0.2, 1.1, 0.3, 1);
  will-change: transform;
  transform: translateZ(0);
}
.press:active { transform: scale(0.965); }

/* ═══════════ TYPE UTILITIES ═══════════ */
.font-display {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-weight: 900;
  letter-spacing: -0.04em;
}
.font-heading {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.font-body {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 700;
}
.font-mono {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.text-overline {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 380ms cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

@keyframes toastIn {
  0% { opacity: 0; transform: translateY(-24px) scale(0.94); }
  60% { opacity: 1; transform: translateY(4px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes toastOut {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-12px) scale(0.96); }
}
.fade-in { animation: fadeIn 300ms ease both; }

/* ═══════════ DAILY PREMIUM ANIMATIONS ═══════════ */
@property --daily-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
@keyframes daily-rotate {
  to { --daily-angle: 360deg; }
}
@keyframes flamePulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(255,194,75,0.5)); }
  50% { transform: scale(1.1); filter: drop-shadow(0 0 10px rgba(255,194,75,0.9)); }
}
@keyframes dailyDotPulse {
  0% { box-shadow: 0 0 0 0 rgba(255,194,75,0.5); }
  70% { box-shadow: 0 0 0 6px rgba(255,194,75,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,194,75,0); }
}
@keyframes shimmerSlide {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes dailyBadgeGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,194,75,0.4); }
  50% { box-shadow: 0 0 0 4px rgba(255,194,75,0.1); }
}

/* Daily utility classes — applied via className */
.daily-border-wrap {
  position: relative;
  width: 100%;
  border-radius: 21.5px;
  padding: 1.5px;
  background: conic-gradient(
    from var(--daily-angle),
    rgba(255,194,75,0.7) 0deg,
    rgba(255,194,75,0.08) 90deg,
    rgba(255,194,75,0.7) 180deg,
    rgba(255,194,75,0.08) 270deg,
    rgba(255,194,75,0.7) 360deg
  );
  animation: daily-rotate 8s linear infinite;
  box-shadow: 0 8px 32px rgba(255, 194, 75, 0.12);
}
.daily-shimmer {
  background: linear-gradient(120deg, #FFD86B 0%, #FFF2C4 30%, #FFC24B 50%, #FFF2C4 70%, #FFD86B 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmerSlide 4s linear infinite;
}
.flamePulse {
  display: inline-block;
  animation: flamePulse 1.8s ease-in-out infinite;
}
.dailyDotPulse {
  animation: dailyDotPulse 2s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ═══════════ PREMIUM UTILITIES ═══════════ */
.glass {
  background: rgba(15, 21, 40, 0.72);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}
.glass-elevated {
  background: rgba(20, 27, 50, 0.85);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
}
`;
