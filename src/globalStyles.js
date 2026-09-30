/* ═══════════ GLOBAL CSS ═══════════
   Theme variables, keyframes, utility classes. Injected via
   <style>{CSS}</style> in App.jsx. Pure string — no React.
   Extracted from App.jsx during cleanup pass. */

export const CSS = `
/* ═══════════ BUNDLED FONTS ═══════════
   Used to load from Google's CDN (fonts.googleapis.com) — a real device
   offline, or with a flaky connection, fell back to plain system fonts for
   the entire run, which for a game whose whole UI is built on these four
   type families was a big, constant hit to how finished it looked. All
   four are variable fonts (one file per family covers its whole weight
   range, matching exactly what Google's own CDN would have served for the
   weights this app actually uses — Plus Jakarta Sans's own upstream axis
   tops out at 800, same as before: requesting 900 already fell back to
   800 via the CDN too, so that's not a regression), subsetted down to
   Latin + the extra punctuation/symbol ranges this UI's own copy actually
   uses (see public/fonts/OFL-LICENSES.txt for how they were built and
   their licenses — all four are SIL Open Font License, the same license
   Google Fonts itself redistributes them under). font-display: swap keeps
   first paint from blocking on the font file the way a bare @import would. */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/Inter.woff2') format('woff2-variations'),
       url('/fonts/Inter.woff2') format('woff2');
}
@font-face {
  font-family: 'Nunito';
  font-style: normal;
  font-weight: 200 1000;
  font-display: swap;
  src: url('/fonts/Nunito.woff2') format('woff2-variations'),
       url('/fonts/Nunito.woff2') format('woff2');
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url('/fonts/PlusJakartaSans.woff2') format('woff2-variations'),
       url('/fonts/PlusJakartaSans.woff2') format('woff2');
}
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 100 800;
  font-display: swap;
  src: url('/fonts/JetBrainsMono.woff2') format('woff2-variations'),
       url('/fonts/JetBrainsMono.woff2') format('woff2');
}

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
  --gold-text: #FFC24B;
  /* Rarity tier colours (see RARITY in constants.js). These used to be
     literal hexes inside RARITY itself, which pinned every tier to the dark
     palette: on Light the Legendary/Jackpot washes, borders and glows stayed
     #FFC24B / #FF3DAF while the label beside them (rarityText) and every
     other themed surface had already flipped. The light block below
     darkens each tier the same way --gold and --accent are darkened there,
     so a tint keeps enough contrast against a white card. */
  --rarity-1: #8592BC;
  --rarity-2: #22C58A;
  --rarity-3: #4C8DFF;
  --rarity-4: #FFC24B;
  --rarity-5: #FF3DAF;
  --rarity-ink: 0%;
  --gold-soft: rgba(255, 194, 75, 0.35);
  --gold-glow: 0 12px 32px rgba(255, 194, 75, 0.35);
  /* Daily badge shimmer stops (see .daily-shimmer). Only ever visible as
     background-clip:text, so every stop has to be readable as text itself. */
  --shimmer-a: #FFD86B;
  --shimmer-b: #FFF2C4;
  --shimmer-c: #FFC24B;
  --go: #22C58A;
  --go-text: #22C58A;
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
  --text-sub: #5B6B82;
  --text-dim: #94A3B8;
  --accent: #2563EB;
  --accent-soft: rgba(37, 99, 235, 0.28);
  --accent-grad: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
  --accent-glow: 0 12px 32px rgba(37, 99, 235, 0.28);
  --gold: #D97706;
  /* Text-safe variants: --gold / --go are too light to read as small text on the
     light theme (3.1:1 / 3.7:1). Same value as the fill colour in dark. */
  --gold-text: #B45309;
  /* Light-theme rarity tiers — each darkened from its dark counterpart, the
     same move --gold (#FFC24B → #D97706) and --accent (#4C8DFF → #2563EB)
     already make here. Uncommon and Rare deliberately land on the same values
     as --go and --accent: in dark those tiers were already identical to those
     tokens, so this keeps the pairing intact rather than inventing a second
     green and a second blue. Jackpot has no themed twin, so #C41E86 is
     #FF3DAF pulled down far enough to hold its own against white. */
  --rarity-1: #5B6788;
  --rarity-2: #059669;
  --rarity-3: #2563EB;
  --rarity-4: #D97706;
  --rarity-5: #C41E86;
  /* How much --ink is mixed into a rarity colour when it is used as small text (see
     rarityText in constants.js): none in dark, half in light so Legendary gold and
     Uncommon green stay above 4.5:1 on white. */
  --rarity-ink: 50%;
  --gold-soft: rgba(217, 119, 6, 0.28);
  --gold-glow: 0 12px 32px rgba(217, 119, 6, 0.25);
  /* The dark shimmer gradient was hardcoded, so on this theme its lightest
     stop (#FFF2C4) landed at roughly 1.1:1 against --bg-0 — the daily badge
     label was effectively invisible. These are the readable amber band
     instead: still a two-tone moving gradient, but every stop clears 4.5:1. */
  --shimmer-a: #B45309;
  --shimmer-b: #92400E;
  --shimmer-c: #B45309;
  --go: #059669;
  --go-text: #047857;
  --go-soft: rgba(5, 150, 105, 0.28);
  --go-glow: 0 12px 32px rgba(5, 150, 105, 0.25);
  --danger: #CF2020;
  --shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.08);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.10);
  --shadow-lg: 0 20px 48px rgba(15, 23, 42, 0.12);
  --card: #FFFFFF;
  --ink: #0F172A;
  --muted: #5B6B82;
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
  /* Was a flat #0A0F1F (dark's own --bg-1) regardless of theme — inert
     today only because S.root's own themed div (var(--bg-grad)) always
     fully covers #root once React has mounted, but wrong on its own
     terms and one layout hiccup away from showing through as a
     permanent dark patch for light-theme users. var(--bg-1) is already
     defined above in this same injected stylesheet, so this now tracks
     the theme instead of only ever matching dark's. */
  background: var(--bg-1);
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'cv11', 'ss01', 'ss03';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  /* The page never scrolls (S.root is position:fixed), so a downward drag on any
     non-tube area would start Chrome's pull-to-refresh on the web build and reload
     the game mid-run. Pan and pinch still work; only double-tap-zoom (iOS Safari)
     and the overscroll effects are switched off. */
  overscroll-behavior: none;
  touch-action: manipulation;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
/* Keyboard focus ring. Most buttons carry an inline outline:none (which beats any
   stylesheet rule, hence !important), so tabbing through the app showed nothing.
   For buttons :focus-visible only matches keyboard focus, never a tap or mouse click;
   text inputs (which had no focus indication at all) always match it. */
button:focus-visible, [role="button"]:focus-visible, input:focus-visible {
  outline: 2px solid var(--accent) !important;
  outline-offset: 2px;
}
button { transition: transform 200ms cubic-bezier(.2,1.1,.3,1); }
button:active:not(:disabled) { transform: scale(0.97); }
@keyframes tutIn {
  0% { opacity: 0; transform: scale(0.92) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.tutIn { animation: tutIn 340ms cubic-bezier(.16,1,.3,1); }
/* Exit for the tutorial card — a mirror of tutIn, not just tutIn reversed:
   entrances decelerate INTO place (ease-out, tutIn's curve above), exits
   should accelerate AWAY (ease-in) — using the same curve both ways is why
   so many hand-rolled close animations feel like they're dragging at the
   start. The "both" fill mode matters here specifically: without it the element would
   snap back to fully visible for one frame right before unmount if the
   close timer lands a frame after the animation ends. */
@keyframes tutOut {
  0% { opacity: 1; transform: scale(1) translateY(0); }
  100% { opacity: 0; transform: scale(0.94) translateY(10px); }
}
.tutOut { animation: tutOut 200ms cubic-bezier(.4,0,1,1) both; }
/* Icon-circle entrance, reusing the app's own overshoot curve (D.tSpring
   in constants.js is the same cubic-bezier) instead of inventing a new
   one — the toggle knobs and tab indicators already establish this as
   this app's "something snapped into place" feel. */
@keyframes tutIconPop {
  0% { opacity: 0; transform: scale(0.4); }
  60% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
.tutIconPop { animation: tutIconPop 420ms cubic-bezier(.34,1.56,.64,1) 60ms both; }
/* Reveal-moment entrance for the two "how did I do" cards (round-cleared
   upgrade pick, run-over summary) — same shape as tutIn but with the
   app's own spring overshoot (D.tSpring's curve) instead of a flat
   ease-out, since these are wins/results worth a little bounce rather
   than a neutral UI panel appearing. */
@keyframes popIn {
  0% { opacity: 0; transform: scale(0.88) translateY(16px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.popIn { animation: popIn 380ms cubic-bezier(.34,1.56,.64,1) both; }
/* Generic "this value just changed" pop — a badge or counter whose number
   moved gets a brief spring-scale instead of the new value silently
   replacing the old one. Reuses tutIconPop's exact keyframe/curve; named
   for its general purpose since it's no longer tutorial-specific. */
.value-pop { animation: tutIconPop 360ms cubic-bezier(.34,1.56,.64,1) both; }
/* Solved tube's checkmark — was a static ::after with no entrance at all,
   the one state-change in the whole board with zero "juice" on it. */
@keyframes checkPop {
  0% { opacity: 0; transform: scale(0.3); }
  60% { opacity: 1; transform: scale(1.25); }
  100% { opacity: 1; transform: scale(1); }
}
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

/* Ball appearing in a tube. Two cases, picked once per ball at mount (see
   Ball in Tube.jsx) so a ball never switches animation-name later — a
   name change would restart the animation on an already-settled ball.

   ballDrop — a level's starting layout, or balls restored by Undo: a short
   fall (ease-in, accelerating like gravity) into a squash on impact, a
   small rebound stretch, then rest. Replaces a 180ms slide that started
   at 40% opacity and scale 0.85, which read as a faded ghost sliding in
   rather than something with weight.

   ballLand — a ball arriving by pour. Its flight (FlyingBalls.jsx) already
   brought it to the slot, so this starts AT impact: squashed on the very
   first frame, then rebound and settle. The 0% keyframe is invisible and
   the 1% one visible, so with fill-mode "backwards" the ball stays hidden
   through its animation-delay (the flight) and appears within ~3ms of
   the flying copy touching down.

   transform-origin at the bottom so the squash compresses onto whatever
   is beneath it instead of shrinking toward its own center. Fill-mode is
   "backwards", not "both": both would keep the 100% transform applied
   forever after, overriding the inline translateY a lifted ball uses. */
@keyframes ballDrop {
  0%   { opacity: 0; transform: translateY(-18px) scale(0.96, 1.04); animation-timing-function: cubic-bezier(.55, 0, 1, .45); }
  45%  { opacity: 1; transform: translateY(0) scale(1.1, 0.88); animation-timing-function: cubic-bezier(.3, .7, .4, 1); }
  75%  { transform: translateY(-1px) scale(0.97, 1.03); }
  100% { opacity: 1; transform: translateY(0) scale(1, 1); }
}
@keyframes ballLand {
  0%   { opacity: 0; transform: translateY(0) scale(1.16, 0.8); }
  1%   { opacity: 1; transform: translateY(0) scale(1.16, 0.8); animation-timing-function: cubic-bezier(.3, .7, .4, 1); }
  45%  { transform: translateY(-1px) scale(0.95, 1.06); }
  75%  { transform: translateY(0) scale(1.02, 0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1, 1); }
}
.cascade-ball {
  transform-origin: 50% 100%;
  animation: ballDrop 300ms linear backwards;
  /* Promote up front rather than making the browser discover mid-animation
     that this needs its own compositor layer -- every pour mounts several
     of these, and that discovery cost (Chrome calls it "Layerize") was
     measurably one of the bigger line items in a pour's frame budget. */
  will-change: transform, opacity;
}
.cascade-ball.landing { animation: ballLand 260ms linear backwards; }

/* ═══════════ TUBE STATES ═══════════ */
/* The lifted balls carry the "picked up" motion now (Tube.jsx), so the
   tube itself only dips its head 4px — enough to read as responding to
   the touch, not so much that tube and balls both jump at once. */
.tube-btn[data-state="selected"] {
  transform: translateY(-4px);
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
  /* inline-block (not the default inline) so the scale transform below is
     applied predictably on WebKit — a plain inline element's transform
     support is inconsistent across older WebKit builds (Capacitor's
     bundled webview among them), inline-block isn't. */
  display: inline-block;
  animation: checkPop 320ms cubic-bezier(.34,1.56,.64,1) both;
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

/* Home screen's hero tubes (HomeScreen.jsx) -- a slow, gentle bob so the
   little illustration reads as alive rather than a pasted-in screenshot.
   Each tube gets its own animation-delay/-duration inline (a shared name
   here, individual timing there) so the four drift out of phase with each
   other instead of bobbing in robotic unison. */
@keyframes heroFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-7px); }
}
.heroFloat { animation: heroFloat 3400ms ease-in-out infinite; }

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
/* Extra touch area around a small control without changing how it looks:
   the invisible pseudo-element counts for hit-testing, so the Theme
   segments (38px wide) get a 46px-tall target instead of 26px. */
.seg-hit { position: relative; }
.seg-hit::after {
  content: "";
  position: absolute;
  top: -6px; bottom: -6px; left: -1px; right: -1px;
}

/* Game HUD on narrow screens. The Daily badge + "Round N" and the
   "N moves left" label plus two 40px buttons need ~333px; a 360px phone
   has 320, a 320px phone 280, so the labels used to break mid-phrase
   ("Round" / "1", "moves" / "left"). Labels are nowrap now (theme.js);
   here the "moves left" caption drops under its number where the row is
   too tight for it beside it (Daily from 380px down, the plain HUD from
   340px down), and at 340px and below the row tightens a little more. */
@media (max-width: 380px) {
  .hud-daily .hud-moves-sub { display: block; margin-left: 0 !important; margin-top: 3px; }
}
@media (max-width: 340px) {
  .hud-moves-sub { display: block; margin-left: 0 !important; margin-top: 3px; }
  .hud-right { gap: 6px !important; }
  .hud-round { font-size: 18px !important; }
}

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
.screen-transition { animation: fadeIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both; }

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
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
.fade-out { animation: fadeOut 200ms ease both; }

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
/* Countdown to daily reset, last hour only — a slow blink reads as "running
   out" without being distracting for the other 23 hours of the day. */
@keyframes dailyUrgentPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
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
  background: linear-gradient(120deg, var(--shimmer-a) 0%, var(--shimmer-b) 30%, var(--shimmer-c) 50%, var(--shimmer-b) 70%, var(--shimmer-a) 100%);
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
/* ═══ REDUCE MOTION = CALM MODE ═══
   One animation system for both settings. Reduce Motion used to run a
   completely different path from normal play: balls teleported instead
   of flying, and a blanket rule forced every animation/transition in the
   app down to ~0ms. Each round of patching that blanket rule still left
   the two modes looking and behaving differently.

   Now Reduce Motion ("data-reduce-motion", set by App.jsx from the in-app
   toggle OR the phone's own reduce-motion setting) only does two things,
   and everything else is identical to normal play:
     1. JS side (App.jsx): pours still fly exactly like normal, just
        faster (shorter arc time), with a smaller particle burst and no
        wrong-move shake.
     2. CSS side (here): continuous, looping, decorative motion is paused
        -- the ambient movement reduce-motion settings exist to remove.
        One-shot feedback (ball landing, button press, tube select, screen
        fades, toasts) plays exactly as in normal mode. */
:root[data-reduce-motion="1"] .heroFloat,
:root[data-reduce-motion="1"] .daily-border-wrap,
:root[data-reduce-motion="1"] .daily-shimmer,
:root[data-reduce-motion="1"] .flamePulse,
:root[data-reduce-motion="1"] .dailyDotPulse {
  animation: none;
}
/* Hint pulse loops forever -- replace with a steady glow instead. */
:root[data-reduce-motion="1"] .tube-btn[data-state="hintFrom"] {
  animation: none;
  box-shadow: 0 0 0 4px var(--go-soft);
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
