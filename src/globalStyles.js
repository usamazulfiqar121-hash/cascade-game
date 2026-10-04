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

/* ═══ STREAK MILESTONE CEREMONY ═══
   Tier 1 (7-day) is the smallest of the three and deliberately the plainest:
   the badge bounces, the name shimmers, and that's all. Its job is to be
   noticeable WITHOUT competing with tiers 2 and 3, which add a ring and a
   shine. The bounce reuses the app's own overshoot curve (D.tSpring's
   cubic-bezier) for the same reason tutIconPop and popIn do — it's already
   established in this codebase as "something snapped into place". */
@keyframes achIconBounce {
  0%   { transform: scale(0.4); }
  55%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
.achIconBounce { animation: achIconBounce 500ms cubic-bezier(.34,1.56,.64,1) both; }
/* Shimmering gold on the achievement NAME. This is .daily-shimmer's gradient
   and slide verbatim — that class is only named for where it happened to be
   introduced, and the effect is a generic two-tone moving highlight over
   themed --shimmer-* vars, so duplicating 6 lines of gradient to avoid
   reusing a class would be the worse outcome. */
.achNameShimmer {
  background: linear-gradient(120deg, var(--shimmer-a) 0%, var(--shimmer-b) 30%, var(--shimmer-c) 50%, var(--shimmer-b) 70%, var(--shimmer-a) 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmerSlide 4s linear infinite;
}

/* Tier 2's addition over tier 1: a ring that pulses twice off the badge and
   is gone inside a second, so it's felt rather than watched.

   Two pulses is the whole point. One expansion reads as a selection state,
   which is a thing the user did rather than a thing that happened TO them;
   an endlessly repeating one is ambient motion nobody asked for and would
   sit in the reduce-motion block forever. The 100% keyframe returns to a
   zero-size, transparent ring so nothing is left painted behind the badge
   once the animation ends. */
@keyframes achRingPulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 60%, transparent); }
  70%  { box-shadow: 0 0 0 10px color-mix(in srgb, var(--gold) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 0%, transparent); }
}
.achRingPulse { animation: achRingPulse 500ms cubic-bezier(.16,1,.3,1) 2; }

/* Tier 3's addition: a shine that sweeps across the face of the badge for as
   long as the toast is up.

   Drawn as a background LAYER on the badge itself rather than as a ::after
   ring. The ring version looks like the obvious thing to write and is
   wrong: a conic gradient clipped to a border-radius'd box is a rounded
   square, not a circle, and hollowing it with a radial mask puts the visible
   band at a radius the mask has to be hand-tuned to guess (the gradient's
   default ray is farthest-corner, so the percentages don't mean what they
   look like they mean) — which leaves a ring that floats off the badge at
   the edges and vanishes entirely at the corners. As a layer over the flat
   gold fill it's just a highlight travelling over a rounded square, which is
   what a shine is, and it can't disagree with the badge's shape because it
   IS the badge's shape.

   Reuses the already-registered --daily-angle property and the same
   daily-rotate keyframes as .daily-border-wrap, because it is the same
   effect: a gold conic gradient swept by an animatable angle. --daily-angle
   is declared inherits: false, so this element's animation is its own and
   doesn't drag the Daily card's rotation with it.

   The badge's own flat gold is NOT restated as a second background layer
   here. It is already set as backgroundColor on the badge, and a
   semi-transparent layer stacked on top of it composites: with the conic
   sheen at 0 alpha the badge would show gold over gold, landing near 25%
   instead of the 13.3% the tier-1 badge uses — the tiers would disagree
   about their own base colour in exactly the corner of the sheen where
   nothing is supposed to be happening.

   NOTE: this depends on the toast render setting 'backgroundColor'
   (longhand) on the badge rather than the 'background' shorthand. The
   shorthand resets background-image, and an inline shorthand beats a
   stylesheet rule, so 'background: <color>' inline would silently delete
   the shine with no error anywhere — the same "one bad value kills the whole
   declaration" trap already documented on the in-app toast above. */
.achShine {
  background-image: conic-gradient(
    from var(--daily-angle),
    rgba(255,194,75,0.6) 0deg,
    rgba(255,194,75,0) 90deg,
    rgba(255,194,75,0.6) 180deg,
    rgba(255,194,75,0) 270deg,
    rgba(255,194,75,0.6) 360deg
  );
  animation: daily-rotate 2.4s linear infinite;
}
/* Tier 3 runs BOTH effects on the one badge, which needs this rule to exist.

   'animation' is a shorthand, not a per-effect property: two classes each
   setting it on the same element means the later rule in the sheet wins
   ENTIRELY, and .achShine comes after .achIconBounce — so shipping both
   classes as-is would have silently deleted the 500ms bounce from the
   biggest celebration in the app, with nothing thrown and no visible error,
   just a badge that no longer pops. The two animate different properties
   (transform vs --daily-angle), so there is no real conflict to resolve —
   they just have to be declared together.

   Both are listed in one 'animation' value. The fill mode stays 'both' and
   applies per-animation-list-item, which is what we want: the bounce must
   hold its final scale(1), and the rotation must stay infinite, and neither
   needs to know about the other. Specificity is (0,2,0) — above both single
   classes — so this wins on order too and needs no defensive !important. */
.achIconBounce.achShine {
  animation:
    achIconBounce 500ms cubic-bezier(.34,1.56,.64,1) both,
    daily-rotate 2.4s linear infinite;
}

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
}
/* Promote up front rather than making the browser discover mid-animation
   that this needs its own compositor layer -- every pour mounts several
   of these, and that discovery cost (Chrome calls it "Layerize") was
   measurably one of the bigger line items in a pour's frame budget.

   Scoped to .promoting instead of sitting on .cascade-ball itself. It was
   on every ball for the ball's whole life, which is a compositor layer held
   open for all 36 balls of a full board long after the 300ms entrance that
   needed it was over -- will-change is a promise to the compositor, and
   keeping it unfulfilled on elements that have stopped moving is exactly
   the accumulation the hint is meant to warn about. Ball.jsx adds the class
   at mount (so the layer still exists before the first animated frame,
   which was the point) and drops it on animationend. */
.cascade-ball.promoting {
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
  background: var(--glass-elevated);
  backdrop-filter: blur(40px) saturate(140%);
  -webkit-backdrop-filter: blur(40px) saturate(140%);
}
/* var(--glass), not a literal. This was rgba(15, 21, 40, 0.72) — the DARK
   theme's value, hardcoded, so a light-theme player who reached this class
   got a dark navy panel. Both tokens are defined per theme above, and the two
   sibling utilities in this same file already did it right: .glass uses
   var(--glass) and .glass-premium uses var(--glass-elevated). On the dark
   theme this is not a visual change at all — 0.72 is exactly what --glass
   resolves to — so the only thing that moves is light theme, which is the
   point. */
.glass-standard {
  background: var(--glass);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}
.glass-minimal {
  background: rgba(15, 21, 40, 0.55);
}
.press {
  transition: transform 120ms cubic-bezier(0.2, 1.1, 0.3, 1);
  will-change: transform;
  /* translateZ(0) removed. It was doing the same job as the will-change
     directly above it — forcing a layer — but by creating a 3D rendering
     context, which on some mobile GPUs pushes descendants onto a separate
     text rasterisation path and renders them softer. will-change alone gets
     the promotion this wanted, without the side effect. */
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
   too tight for it beside it (Daily and Score from 430px down — measured
   touching at 390px with the badge — the plain HUD from
   340px down), and at 340px and below the row tightens a little more. */
@media (max-width: 430px) {
  .hud-daily .hud-moves-sub { display: block; margin-left: 0 !important; margin-top: 3px; }
}
@media (max-width: 340px) {
  .hud-moves-sub { display: block; margin-left: 0 !important; margin-top: 3px; }
  .hud-right { gap: 6px !important; }
  .hud-round { font-size: 18px !important; }
  /* With a DAILY/SCORE badge the label still touched the moves count at 320px
     (measured gap 0px), so the badge sits on its own line above "Round N". */
  .hud-daily .hud-round > span { display: table !important; margin: 0 0 2px 0 !important; }
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
/* The last-hour reset countdown's blink. This used to be an inline
   'animation: "dailyUrgentPulse ..."' on the element itself, which no
   stylesheet rule can override — so the reduce-motion block below could
   never have stopped it, and an infinite 1s loop kept running for anyone
   who had asked for reduced motion. As a class it sits in the same system
   as the other daily decorations and is pausable with them. */
.dailyUrgentPulse {
  animation: dailyUrgentPulse 1000ms ease-in-out infinite;
}
/* ═══ PROFILE: EARLY-GAME ACHIEVEMENT GUIDE ═══
   Two one-shot effects for the 0-unlocked / 1–3-unlocked guide card
   (AchievementsScreen.jsx, B8).

   Both are classes rather than inline 'animation:' because an inline
   animation can't be reached by any stylesheet rule, and the reduce-motion
   block is a stylesheet — the same reasoning the .dailyUrgentPulse comment
   below already records. */

/* The empty-state trophy's "slight pulse". A halo, not a scale: the card's
   one call to action sits directly under this trophy, and an element that
   visibly grows and shrinks 1.12x would draw the eye away from the button
   that actually does something. 2.4s, not the 1.8s flamePulse uses — this
   one has to loop indefinitely and a 1.8s pulse next to nothing else
   moving reads as attention-grabbing rather than ambient. */
@keyframes achEmptyTrophy {
  0%, 100% { filter: drop-shadow(0 0 0 rgba(255, 194, 75, 0)); }
  50%      { filter: drop-shadow(0 0 10px rgba(255, 194, 75, 0.45)); }
}
.achEmptyTrophy {
  display: inline-block;
  /* These four were written in React inline-style syntax — camelCase names,
     comma terminators, no units. Inside a plain CSS template literal the
     parser hits the unknown property "fontSize", skips forward to the next
     semicolon, and throws away all four declarations as one bad block. Only
     the "animation" below survived, so the trophy rendered as an unstyled
     span with a pulse on it: no 32px sizing, no 0.7 opacity, no 12px gap. */
  font-size: 32px;
  line-height: 1;
  opacity: 0.7;
  margin-bottom: 12px;
  animation: achEmptyTrophy 2400ms ease-in-out infinite;
}

/* A one-shot attention flash on the "First Steps" card after the guide
   scrolls to it. 1400ms, then the class is removed by AchievementsScreen's
   timer — so it cannot stack up or fight itself if tapped repeatedly. The
   gold wash rather than a border-only change because the locked card is
   greyed to 0.6 opacity, and a border that only shifts 2% lighter is not
   visible against it. */
@keyframes achCardFlash {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 55%, transparent); }
  22%  { box-shadow: 0 0 0 7px color-mix(in srgb, var(--gold) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 0%, transparent); }
}
.achCardFlash { animation: achCardFlash 1400ms cubic-bezier(.16, 1, .3, 1); }

/* ═══ B9: UPGRADE CARD PRESS FEEDBACK ═══
   Four states, all on the button itself: at rest, pressed, released, and
   the same for Legendary/Jackpot (data-special). Pure CSS on :active —
   no React state and no re-render, so the feedback is on screen in the same
   frame as the finger lands, which is the entire point of press feedback
   and is the one thing a state-driven version would always be slightly late
   for.

   Source order matters here and it is deliberate, not luck: the global
   'button:active:not(:disabled) { transform: scale(0.97) }' above is also
   specificity (0,2,0), same as .upgCard:active, so the later rule wins.
   These rules sit ~370 lines below it on purpose. If the block is ever
   moved above that generic button rule, cards silently go back to 0.97. */
.upgCard {
  background: var(--card);
  border: 2px solid color-mix(in srgb, var(--rarity-c) 40%, transparent);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  /* RELEASE timings, and deliberately NOT 'all'.

     The old inline value was 'transition: all 200ms cubic-bezier(.2,1.1,.3,1)',
     which quietly made every one of these properties animate on both edges
     with a springy overshoot curve. That is the opposite of the brief on
     both counts: a press has to be near-instant or it reads as lag, and an
     overshoot curve on a press is wrong because the finger is still down
     and nothing is being released yet.

     Each property also gets its own duration, because they are not the same
     gesture: transform is the spring the player feels, while the colour and
     shadow settle faster behind it. One duration for all five would force
     the slowest one on all of them. */
  transition:
    transform 280ms cubic-bezier(0.34, 1.4, 0.64, 1),
    filter 200ms ease-out,
    border-color 150ms ease-out,
    box-shadow 200ms ease-out,
    background-color 200ms ease-out;
}
.upgCard[data-special] {
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 0 0 1px color-mix(in srgb, var(--rarity-c) 20%, transparent),
    0 0 22px color-mix(in srgb, var(--rarity-c) 25.1%, transparent);
}
.upgCard:active {
  transform: translateY(1px) scale(0.985);
  filter: brightness(1.06);
  /* Mixed with --card rather than with 'transparent'. A transparent blend
     would REPLACE the card's own background instead of tinting it, leaving
     the pressed card see-through and the board visible through it. */
  background-color: color-mix(in srgb, var(--rarity-c) 4%, var(--card));
  border-color: color-mix(in srgb, var(--rarity-c) 65%, transparent);
  /* 16px → 12.8px, i.e. the 20% the brief asked for on the blur only. The
     4px y-offset is deliberately left alone: it is the card's height above
     the surface, and shrinking it too would move the shadow as well as fade
     it, which is a second change wearing the first one's clothes. */
  box-shadow: 0 4px 12.8px rgba(0, 0, 0, 0.3);
  /* This rule's own transition governs the PRESS, because it is in effect
     for as long as the finger is down. The instant it lifts, the base
     rule's 280ms spring takes over for the release. That handoff is the
     only reason two different timings exist without any JS. */
  transition:
    transform 120ms ease-out,
    filter 120ms ease-out,
    border-color 120ms ease-out,
    box-shadow 120ms ease-out,
    background-color 120ms ease-out;
}
/* Legendary/Jackpot get a bigger response to the same press. (0,3,0) beats
   .upgCard:active, so this is a genuine override rather than a merge. */
.upgCard[data-special]:active {
  background-color: color-mix(in srgb, var(--rarity-c) 8%, var(--card));
  box-shadow:
    0 4px 12.8px rgba(0, 0, 0, 0.3),
    0 0 0 1px color-mix(in srgb, var(--rarity-c) 20%, transparent),
    0 0 32px color-mix(in srgb, var(--rarity-c) 25.1%, transparent);
}

/* ═══ B10: DAILY TWIST DISCLOSURE ═══

   Animating to an unknown height. The panel's height is the twist's desc
   wrapping to two, three or four lines depending on the day, so there is no
   px value to interpolate to and 'height: auto' is not animatable at all.
   grid-template-rows: 0fr -> 1fr is the one construct that interpolates
   between "collapsed" and "content height" without measuring anything: the
   row is sized in fractions of the content's own height, and the clip layer
   below is what actually hides the overflow.

   Both halves of the spec's timing are here, and they are the same curve at
   two lengths rather than two curves: 300ms to open (= D.tScreen) and 200ms
   to close (= D.tQuick), both cubic-bezier(0.16, 1, 0.3, 1) — the app's own
   "arrived, stop" curve, read here as decelerate for the panel.

   Deliberately NOT a spring, unlike the chevron below. A spring overshoots
   its target, and a height that overshoots ends up taller than its content
   for a few frames — the panel would visibly gape open past its own text and
   snap back. Overshoot only reads as "alive" on a transform, which is
   exactly what the chevron is. */
.twistPanel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.twistPanel[data-open="1"] {
  grid-template-rows: 1fr;
  transition: grid-template-rows 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
/* min-height:0 is not optional — a grid item defaults to min-height:auto, so
   without it the row refuses to go below its content's height and the panel
   never actually collapses. */
.twistPanelClip {
  min-height: 0;
  overflow: hidden;
  /* Collapsed content still being in the DOM is what lets it animate away on
     the way out, but it also leaves text a screen reader can read and, if the
     panel ever grows a control, something focusable behind a closed panel.
     visibility:hidden removes it from both — and taking it out of the
     accessibility tree is the whole reason the panel is not simply
     unmounted on close. The 200ms delay is the collapse duration: the
     content stays visible for exactly as long as it is still on screen. */
  visibility: hidden;
  transition: visibility 0s linear 200ms;
}
.twistPanel[data-open="1"] .twistPanelClip {
  visibility: visible;
  transition: visibility 0s;
}

/* 180° on open. This one IS a spring, and the mild overshoot is the point:
   the chevron is the affordance, so it should lead the panel and be visibly
   settled before the content finishes arriving (120ms against 300ms).
   D.tSpring's 500ms was the other candidate and is wrong here — it would
   still be wobbling after the panel had landed. cubic-bezier(0.2, 1.1, ...)
   is the app's existing tPress curve, spring included, at press length. */
.twistChev {
  transition: transform 120ms cubic-bezier(0.2, 1.1, 0.3, 1);
}
.twistChev[data-open="1"] {
  transform: rotate(180deg);
}

/* The daily card is a div whose two play regions are real buttons with
   outline:none, so without this they are focusable and invisible — a
   keyboard user could land on "play today's puzzle" with nothing drawn.
   :focus-visible rather than :focus so a pointer tap doesn't leave a ring
   behind on a card the player just dismissed. */
.dailyCardRegion:focus-visible,
.twistToggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
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
:root[data-reduce-motion="1"] .dailyDotPulse,
:root[data-reduce-motion="1"] .dailyUrgentPulse,
/* Streak ceremony: the bounce and the shimmer are the motion. The toast
   itself still appears, still says what was earned, and still gets the
   confetti — only the movement is dropped, and the icon keeps its gold
   circle so it doesn't read as an unstyled gap. See CALM_DISCOUNT in
   constants.js for the matching duration change. */
:root[data-reduce-motion="1"] .achIconBounce,
:root[data-reduce-motion="1"] .achNameShimmer,
:root[data-reduce-motion="1"] .achRingPulse,
:root[data-reduce-motion="1"] .achShine,
/* Profile guide (B8): both are ambient or attention-seeking movement, and
   both have a static equivalent — the trophy keeps its 0.7 opacity (the
   dimming is what carries "empty" without motion), and the flash becomes a
   steady ring in the same gold, the same substitution the hint pulse and
   the reset countdown already get. */
:root[data-reduce-motion="1"] .achEmptyTrophy,
:root[data-reduce-motion="1"] .achCardFlash {
  animation: none;
}
:root[data-reduce-motion="1"] .achEmptyTrophy { opacity: 0.7; }
:root[data-reduce-motion="1"] .achCardFlash {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--gold) 55%, transparent);
}
:root[data-reduce-motion="1"] .achIconBounce { transform: none; }
:root[data-reduce-motion="1"] .achNameShimmer {
  /* shimmerSlide off means background-clip:text with a static gradient —
     which is invisible for most of the cycle if left as a plain fill, so
     the text colour is restored and the gradient dropped. */
  background: none;
  -webkit-text-fill-color: currentColor;
  color: var(--gold-text);
}
:root[data-reduce-motion="1"] .achRingPulse {
  /* Same substitution the hint pulse and the reset countdown already get: a
     steady ring in the same colour carries "this one is different" without
     anything moving. */
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--gold) 60%, transparent);
}
:root[data-reduce-motion="1"] .achShine {
  /* The rotation is the motion, so it goes, and the sheen goes with it —
     frozen at --daily-angle's 0deg initial it would be one static gold wedge
     in the top-left of a 40px square, which reads as a lighting bug rather
     than as a celebration.

     A steady 2px gold ring is the substitute: the same meaning tier 2's
     static ring carries ("this one is different"), with nothing moving. The
     badge keeps its backgroundColor fill either way, so the icon still
     reads against a solid badge. */
  background-image: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--gold) 45%, transparent);
}
/* The countdown blink can't just be switched off with the rest: the blink IS
   the "under an hour left" signal, and the colour is already set to the
   danger token inline. A steady ring in that same colour keeps the urgency
   without any motion — the same swap hintPulse gets below. currentColor
   resolves to whatever the element's themed colour is, so it follows the
   theme instead of hardcoding a gold. */
:root[data-reduce-motion="1"] .dailyUrgentPulse {
  box-shadow: 0 0 0 1px currentColor;
  border-radius: 4px;
}
/* Hint pulse loops forever -- replace with a steady glow instead. */
:root[data-reduce-motion="1"] .tube-btn[data-state="hintFrom"] {
  animation: none;
  box-shadow: 0 0 0 4px var(--go-soft);
}

/* ─── B9: upgrade card under Reduce Motion ───
   Press feedback reduced to the scale alone, and the base transition
   flattened too — the spring's 0.34,1.4 overshoot IS a spring, so there is
   no reduced form of it to keep; what is left is a 0.985 scale on a linear
   120ms, which still confirms the touch registered without animating
   anything toward or past its resting state.

   The 1px nudge, the brighten, the border lift, the wash and the glow
   growth all go. They are additive decoration on a gesture, not the
   gesture, which is why the scale alone is an honest reduction rather than
   a lossy one.

   These have to restate the resting values explicitly rather than just
   "not overriding" them: they are overrides of the .upgCard rules further
   up, so removing the override would fall back to whatever the cascade
   happens to pick, not to the resting state. */
:root[data-reduce-motion="1"] .upgCard,
:root[data-reduce-motion="1"] .upgCard:active {
  transition: transform 120ms linear;
}
:root[data-reduce-motion="1"] .upgCard:active {
  transform: scale(0.985);
  filter: none;
  background-color: var(--card);
  border-color: color-mix(in srgb, var(--rarity-c) 40%, transparent);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
:root[data-reduce-motion="1"] .upgCard[data-special]:active {
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 0 0 1px color-mix(in srgb, var(--rarity-c) 20%, transparent),
    0 0 22px color-mix(in srgb, var(--rarity-c) 25.1%, transparent);
}

/* ─── B10: twist disclosure, no motion ───
   Instant in both directions, per the brief.

   The clip's delayed visibility switch has to go with the panel transition,
   not just alongside it: 'transition: none' collapses the 200ms delay to 0
   as well, which is correct here — with nothing animating there is no window
   during which the collapsed content needs to stay visible. Leaving the
   delay in place would hide the text 200ms after it stopped being on screen
   anyway, which for an instant expand means the text vanishes after the fact.

   The chevron is the one thing deliberately NOT instant. It is not movement,
   it is state: it points down when the panel is closed and up when it is
   open, and dropping the rotation would leave it pointing the wrong way with
   no way for the player to read which way it went. A 180° flip that appears
   instantly is a change of glyph, not an animation — it is the same
   information the expansion itself already gives. */
:root[data-reduce-motion="1"] .twistPanel,
:root[data-reduce-motion="1"] .twistPanel[data-open="1"],
:root[data-reduce-motion="1"] .twistPanelClip,
:root[data-reduce-motion="1"] .twistPanel[data-open="1"] .twistPanelClip {
  transition: none;
}

/* ═══════════ PREMIUM UTILITIES ═══════════ */
.glass {
  background: var(--glass);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}
/* var(--glass-elevated), same reasoning as .glass-standard above, and the
   same dark-theme value (0.85 vs the token's 0.88 — a 3-point alpha
   difference on the one theme where this class is certainly still
   reachable). Light theme gets the white panel the token already holds. */
.glass-elevated {
  background: var(--glass-elevated);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
}
`;
