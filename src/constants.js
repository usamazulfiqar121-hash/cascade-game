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
  { id: "streak_7", name: "Week Streak", desc: "7-day daily streak", icon: "📅" },
  { id: "streak_30", name: "Month Streak", desc: "30-day daily streak", icon: "🌙" },
  { id: "streak_100", name: "Century Streak", desc: "100-day daily streak", icon: "💯" },
];

/* Rarity tiers. 5 (Jackpot) sits above Legendary — a distinct color so the
   rare roll in pickRandomUpgrades is instantly recognizable as a step up,
   not just another Legendary. */
export const RARITY = {
  1: { name: "Common", color: "#8592BC" },
  2: { name: "Uncommon", color: "#22C58A" },
  3: { name: "Rare", color: "#4C8DFF" },
  4: { name: "Legendary", color: "#FFC24B" },
  5: { name: "Jackpot", color: "#FF3DAF" },
};

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
