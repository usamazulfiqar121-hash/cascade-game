/* ═══════════ DATA LAYER ═══════════
   All static constants. No logic, no React. */

export const MAX_HEIGHT = 4;

export const COLORS = [
  "#FF4D6A", "#2F7BF6", "#0E9F6E", "#FFC24B",
  "#8B5CF6", "#F2761B", "#22C5C5", "#FF85C8",
];

/* Legacy theme tokens */
export const T = {
  bg: "var(--bg-1)",
  card: "var(--card)",
  ink: "var(--ink)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  danger: "var(--danger)",
  go: "var(--go)",
  goText: "var(--go-text)",
  gold: "var(--gold)",
  goldText: "var(--gold-text)",
  line: "var(--line)",
  edge: "var(--edge)",
  tubeBg: "var(--tube-bg)",
  tubeEdge: "var(--tube-edge)",
};

/* Design tokens — premium system */
export const D = {
  bg0: "var(--bg-0)", bg1: "var(--bg-1)", bg2: "var(--bg-2)",
  glassMinimal: "var(--glass)",
  glassStandard: "var(--glass)",
  glassPremium: "var(--glass-elevated)",
  glassBorder: "var(--glass-border)",
  glassBorderActive: "var(--glass-border-active)",
  accent: "var(--accent)",
  accentGrad: "var(--accent-grad)",
  accentGlow: "var(--accent-glow)",
  accentSoft: "var(--accent-soft)",
  gold: "var(--gold)",
  goldText: "var(--gold-text)",
  goldGlow: "var(--gold-glow)",
  go: "var(--go)",
  goText: "var(--go-text)",
  goGlow: "var(--go-glow)",
  goSoft: "var(--go-soft)",
  danger: "var(--danger)",
  text: "var(--text)",
  textSub: "var(--text-sub)",
  textDim: "var(--text-dim)",
  s4: 4, s8: 8, s12: 12, s16: 16, s24: 24, s32: 32, s48: 48,
  rPill: 999, rCard: 20, rModal: 28, rSm: 12,
  shadowSm: "var(--shadow-sm)",
  shadowMd: "var(--shadow-md)",
  shadowLg: "var(--shadow-lg)",
  tPress: "120ms cubic-bezier(0.2, 1.1, 0.3, 1)",
  tQuick: "200ms cubic-bezier(0.16, 1, 0.3, 1)",
  tScreen: "300ms cubic-bezier(0.16, 1, 0.3, 1)",
  tModal: "400ms cubic-bezier(0.16, 1, 0.3, 1)",
  tSpring: "500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/* Storage keys */
export const BEST_KEY = "cascade:best";
export const ACH_KEY = "cascade:achievements";

/* Achievements */
export const ACHIEVEMENTS = [
  { id: "first_clear", name: "First Steps", desc: "Clear your first round", icon: "🌟" },
  { id: "round_10", name: "Getting Good", desc: "Reach Round 10", icon: "🎯" },
  { id: "round_25", name: "Halfway Hero", desc: "Reach Round 25", icon: "🏅" },
  { id: "round_50", name: "Survivor", desc: "Reach Round 50", icon: "👑" },
  { id: "legendary", name: "Legendary Find", desc: "Take a Legendary upgrade", icon: "✨" },
  { id: "upgrades_10", name: "Collector", desc: "Hold 10 upgrades in one run", icon: "🎁" },
  { id: "combo_10", name: "Chain Master", desc: "Hit a 10× combo", icon: "🔥" },
  { id: "no_undo_5", name: "Purist", desc: "Clear 5 rounds without undo", icon: "🛡" },
  { id: "streak_7", name: "Week Streak", desc: "7-day daily streak", icon: "📅", tier: 1 },
  { id: "streak_30", name: "Month Streak", desc: "30-day daily streak", icon: "🌙", tier: 2 },
  { id: "streak_100", name: "Century Streak", desc: "100-day daily streak", icon: "💯", tier: 3 },
];

/* Streak milestone ceremony — one entry per tier, keyed by ACHIEVEMENTS[].tier.

   A 100-day streak is not "more of" a 7-day one, and it shouldn't be
   celebrated the way it is: a toast that looks, sounds and lasts the same
   whether you hit a week or a century trains the player to stop reading
   their streak toast entirely. Schell's point is that a milestone wants
   ceremony that is DIFFERENT, not merely bigger, and the escalation has to
   be visible before it's read — which is why duration, particle count and
   confetti spread are part of the same scale rather than one multiplier
   applied to a single toast.

   `label` replaces the toast's generic "Achievement" eyebrow at the higher
   tiers, so the toast announces what it is before the player reads the
   name. `duration` is the toast's on-screen time; the reduce-motion path in
   App.jsx subtracts CALM_DISCOUNT from it rather than skipping the toast,
   because the information is in the toast and the motion is not.

   `colors` is the confetti palette, and it lives HERE rather than in
   App.jsx/Particles so that every number describing a ceremony is in one
   readable block. null means "use the single colour the caller passed",
   which is tier 1's monochrome burst.

   The tier-3 palette reuses the game's own COLORS rather than inventing new
   hexes: the tube colours are the palette the player has already learned to
   read as "this game", so a century's confetti landing in those exact hues
   is legible without a legend, and if the tube palette is ever retuned the
   confetti follows it for free. The index order is chosen so consecutive
   pieces (Particles.jsx walks this with i % length) never land on two
   similar hues — at 6-10px, a red next to a pink is two red dots. Gold is
   `var(--gold)` and not COLORS[3] so the streak ceremony still uses the
   darker, readable light-theme gold the rest of the UI uses. */
export const STREAK_CEREMONY = {
  1: {
    label: "7-Day Streak",
    duration: 3500,
    particles: 8,
    dist: 60,
    colors: null,
    life: 600,
  },
  2: {
    label: "30-Day Streak",
    duration: 4200,
    particles: 16,
    dist: 80,
    /* Gold plus white, not two golds. A second gold piece at 8-10px on a
       gold-glowing toast is invisible — the burst reads as a slightly lumpy
       gold cloud. White is the nearest colour that actually separates at
       that size while still belonging to the ceremony; the tier-3 rainbow
       is what earns a real hue range. */
    colors: ["#FFC24B", "#FFFFFF"],
    life: 600,
  },
  3: {
    label: "Century Streak",
    duration: 5500,
    particles: 24,
    dist: 100,
    colors: ["var(--gold)", COLORS[0], COLORS[6], COLORS[4], COLORS[2], COLORS[7], COLORS[5], COLORS[1]],
    /* "Longer gravity" — the pieces hang around past the 600ms a pour burst
       gets, so a hundred days feels like it's still raining confetti after
       the other tiers have finished. `life` also sets how long the burst
       stays mounted (see spawnParticles in App.jsx), so the two can't drift
       apart and leave particles hanging in mid-air. */
    life: 950,
  },
};

/* Reduce Motion shortens the streak ceremony by this much rather than
   removing it — see `duration` above. */
export const CALM_DISCOUNT = 2000;

/* Rarity tiers. 5 (Jackpot) sits above Legendary — a distinct color so the
   rare roll in pickRandomUpgrades is instantly recognizable as a step up,
   not just another Legendary.

   `color` is a var() reference, not a literal hex, so each tier has its own
   value per theme (see --rarity-N in globalStyles.js). They used to be
   literals, which pinned every tier to the dark palette: on Light the
   Legendary/Jackpot washes, borders and glows stayed #FFC24B / #FF3DAF while
   the rarityText() label beside them and every other themed surface had
   already flipped. One knock-on: because the value is now a var(), the old
   `${r.color}22` hex-suffix trick is invalid (that's the same var()+hex-alpha
   bug the toast had). Use rarityTint() below instead. */
export const RARITY = {
  1: { name: "Common", color: "var(--rarity-1)" },
  2: { name: "Uncommon", color: "var(--rarity-2)" },
  3: { name: "Rare", color: "var(--rarity-3)" },
  4: { name: "Legendary", color: "var(--rarity-4)" },
  5: { name: "Jackpot", color: "var(--rarity-5)" },
};

/* A rarity colour as a translucent fill/border/glow. color-mix() rather than
   appending a hex byte: RARITY colours are var()s now, and "var(--rarity-4)22"
   is not a colour, so the whole declaration would be dropped. `pct` is the
   alpha as a percentage — 0x22/255 = 13.3%, 0x33/255 = 20%, 0x40/255 = 25.1%,
   0x55/255 = 33.3%, 0x66/255 = 40%. */
export const rarityTint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/* A rarity colour as *text*. The raw colours are right for fills, borders and glows
   but only 1.6-3.2:1 as 9-12px text on the light theme; --rarity-ink is 0% in dark
   (colour unchanged) and 50% in light (globalStyles.js). Since the light --rarity-N
   values are already darkened, this mix is a second nudge on top of that — it only
   ever adds contrast, so a tier label reads slightly deeper than strictly needed
   rather than falling short. */
export const rarityText = (color) => `color-mix(in srgb, ${color}, var(--ink) var(--rarity-ink))`;

/* Roguelike upgrades pool.
   "start" was 10 — only +2 over Rare's m8 (8), barely distinguishable from
   the tier below despite being Legendary. Widened to make the top tier feel
   materially different, not just differently colored (research: rarity
   should vary the actual outcome, not just its presentation).
   "jackpot" and "dawn" are pulled from this pool by id in pickRandomUpgrades/
   pickDailyUpgrades respectively — see the JACKPOT_CHANCE roll there and the
   dailyOnly flag below. */
export const UPGRADES = [
  { id: "m2", name: "+2 Moves", desc: "+2 moves every round", icon: "🏃", rarity: 1, value: 2 },
  { id: "m3", name: "+3 Moves", desc: "+3 moves every round", icon: "⚡", rarity: 1, value: 3 },
  { id: "m5", name: "+5 Moves", desc: "+5 moves every round", icon: "🔥", rarity: 2, value: 5 },
  { id: "m8", name: "+8 Moves", desc: "+8 moves every round", icon: "💎", rarity: 3, value: 8 },
  { id: "start", name: "Head Start", desc: "+16 moves every round", icon: "🚀", rarity: 4, value: 16 },
  { id: "lucky", name: "Lucky Drop", desc: "20% chance per pour: +1 move", icon: "🍀", rarity: 1 },
  { id: "lucky2", name: "Super Lucky", desc: "35% chance per pour: +1 move", icon: "🌟", rarity: 3 },
  { id: "combo3", name: "Combo Master", desc: "Every 3rd pour gives +1 move", icon: "🎯", rarity: 2 },
  { id: "combo2", name: "Combo Legend", desc: "Every 2nd pour gives +1 move", icon: "🎪", rarity: 3 },
  { id: "mega", name: "Mega Bonus", desc: "Every 5th pour gives +2 moves", icon: "🎊", rarity: 2 },
  { id: "clear", name: "Perfect Clear", desc: "Finish with 5+ moves left: +3 next round", icon: "✨", rarity: 2 },
  { id: "tube", name: "Extra Tube", desc: "+1 empty tube permanently", icon: "🔧", rarity: 3 },
  { id: "auto", name: "Auto-Sort", desc: "1 random tube starts solved each round", icon: "🎁", rarity: 4 },
  /* Rare, high-impact roll — bypasses normal weighting entirely; see
     JACKPOT_CHANCE in gameLogic.js. Never offered on a plain draw. */
  { id: "jackpot", name: "Jackpot!", desc: "+20 moves every round", icon: "🎰", rarity: 5, value: 20 },
  /* Daily-challenge exclusive — never offered by pickRandomUpgrades, so the
     daily habit has a payoff normal runs can't get, not just the same pool
     seeded differently. */
  /* Second Wind is spent by turning its id into "wind_used" in the run's
     upgrade list (App.jsx), so a saved daily run remembers it without any
     extra field. "wind_used" is not in this list on purpose: the run strip
     skips ids it doesn't know, so a spent card just disappears. */
  { id: "wind", name: "Second Wind", desc: "Once: out of moves? Get +5 and play on", icon: "💨", rarity: 3, dailyOnly: true },
  /* Retired. +6 moves for Rare was strictly worse than +8 Moves at the same
     rarity, so nobody had a reason to take the "daily exclusive". Kept in
     the list only so a run saved with it still resolves; pickDailyUpgrades
     skips retired cards. */
  { id: "dawn", name: "Dawn Bonus", desc: "+6 moves every round", icon: "🌅", rarity: 3, value: 6, dailyOnly: true, retired: true },
];

/* ═══════════ DAILY TWISTS ═══════════
   One rule change per day, the same for everyone (the day picks it, see
   pickDailyTwist in gameLogic.js) and applied to the whole run. Blessings,
   curses and one trade-off, because a day of only good news is not a rule
   and a day of only bad news is not fun. No twist gives an extra empty tube:
   in a simple player model that one change moved a run from about 9 rounds
   to about 40 (a 3-move cost did not dent it, and 5 or more made the first
   rounds unwinnable), because it removes the dead ends that end most runs.
   The effects themselves live where they act: move/board changes in
   generateLevel, Lucky Day in the pour
   handler, Feast & Famine in the upgrade offer. */
export const DAILY_TWISTS = [
  { id: "tailwind", name: "Tailwind", icon: "🌬️", kind: "blessing", desc: "+3 moves every round" },
  { id: "warm", name: "Warm Start", icon: "🌅", kind: "blessing", desc: "One colour starts already sorted" },
  { id: "lucky", name: "Lucky Day", icon: "🍀", kind: "blessing", desc: "+25% chance of a free move on every pour" },
  { id: "thin", name: "Thin Margins", icon: "⏳", kind: "curse", desc: "2 fewer moves every round" },
  { id: "rainbow", name: "Rainbow", icon: "🌈", kind: "curse", desc: "Colours ramp up two rounds sooner" },
  { id: "tide", name: "Rising Tide", icon: "🌊", kind: "curse", desc: "1 fewer move for every 3 rounds you clear" },
  { id: "feast", name: "Feast & Famine", icon: "⚖️", kind: "mixed", desc: "+5 moves every round, but only 2 cards" },
];
