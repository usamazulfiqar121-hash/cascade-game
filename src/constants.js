/* ═══════════ DATA LAYER ═══════════
   All static constants. No logic, no React. */

export const MAX_HEIGHT = 4;

export const COLORS = [
  "#FF4D6A", "#2F7BF6", "#0E9F6E", "#FFC24B",
  "#8B5CF6", "#F2761B", "#22C5C5", "#FF85C8",
];

/* Legacy theme tokens */
export const T = {
  bg: "#0A0F1F", card: "#141B32", ink: "#EAF0FF", muted: "#7A85A8",
  accent: "#4C8DFF", danger: "#FF5C7A", go: "#22C58A", gold: "#FFC24B",
  line: "#222E4C", edge: "rgba(140,170,255,0.10)",
  tubeBg: "rgba(255,255,255,0.04)", tubeEdge: "rgba(255,255,255,0.10)",
};

/* Design tokens — premium system */
export const D = {
  bg0: "#05070F", bg1: "#0A0F1F", bg2: "#121A31",
  glassMinimal: "rgba(15, 21, 40, 0.55)",
  glassStandard: "rgba(15, 21, 40, 0.72)",
  glassPremium: "rgba(20, 27, 50, 0.88)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  glassBorderActive: "rgba(255, 255, 255, 0.16)",
  accent: "#4C8DFF",
  accentGrad: "linear-gradient(135deg, #5A9BFF 0%, #3B7BF0 100%)",
  accentGlow: "0 12px 32px rgba(76, 141, 255, 0.4)",
  accentSoft: "rgba(76, 141, 255, 0.35)",
  gold: "#FFC24B",
  goldGlow: "0 12px 32px rgba(255, 194, 75, 0.35)",
  go: "#22C58A",
  goGlow: "0 12px 32px rgba(34, 197, 138, 0.35)",
  goSoft: "rgba(34, 197, 138, 0.4)",
  danger: "#FF5C7A",
  text: "#EAF0FF",
  textSub: "#7A85A8",
  textDim: "#4A5578",
  s4: 4, s8: 8, s12: 12, s16: 16, s24: 24, s32: 32, s48: 48,
  rPill: 999, rCard: 20, rModal: 28, rSm: 12,
  shadowSm: "0 4px 12px rgba(0, 0, 0, 0.35)",
  shadowMd: "0 8px 24px rgba(0, 0, 0, 0.45)",
  shadowLg: "0 20px 48px rgba(0, 0, 0, 0.55)",
  tPress: "120ms cubic-bezier(0.2, 1.1, 0.3, 1)",
  tQuick: "200ms cubic-bezier(0.16, 1, 0.3, 1)",
  tScreen: "300ms cubic-bezier(0.16, 1, 0.3, 1)",
  tModal: "400ms cubic-bezier(0.16, 1, 0.3, 1)",
  tSpring: "500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/* Storage keys */
export const BEST_KEY = "cascade:best";
export const ACH_KEY = "cascade:achievements";
export const DAILY_KEY = "cascade:dailyResults";
export const PLAYED_KEY = "cascade:hasPlayedOnce";

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
];

/* Rarity tiers */
export const RARITY = {
  1: { name: "Common", color: "#8592BC" },
  2: { name: "Uncommon", color: "#22C58A" },
  3: { name: "Rare", color: "#4C8DFF" },
  4: { name: "Legendary", color: "#FFC24B" },
};

/* Roguelike upgrades pool */
export const UPGRADES = [
  { id: "m2", name: "+2 Moves", desc: "+2 moves every round", icon: "🏃", rarity: 1, value: 2 },
  { id: "m3", name: "+3 Moves", desc: "+3 moves every round", icon: "⚡", rarity: 1, value: 3 },
  { id: "m5", name: "+5 Moves", desc: "+5 moves every round", icon: "🔥", rarity: 2, value: 5 },
  { id: "m8", name: "+8 Moves", desc: "+8 moves every round", icon: "💎", rarity: 3, value: 8 },
  { id: "start", name: "Head Start", desc: "+10 moves every round", icon: "🚀", rarity: 4, value: 10 },
  { id: "lucky", name: "Lucky Drop", desc: "20% chance per pour: +1 move", icon: "🍀", rarity: 1 },
  { id: "lucky2", name: "Super Lucky", desc: "35% chance per pour: +1 move", icon: "🌟", rarity: 3 },
  { id: "combo3", name: "Combo Master", desc: "Every 3rd pour gives +1 move", icon: "🎯", rarity: 2 },
  { id: "combo2", name: "Combo Legend", desc: "Every 2nd pour gives +1 move", icon: "🎪", rarity: 3 },
  { id: "mega", name: "Mega Bonus", desc: "Every 5th pour gives +2 moves", icon: "🎊", rarity: 2 },
  { id: "clear", name: "Perfect Clear", desc: "Finish with 5+ moves left: +3 next round", icon: "✨", rarity: 2 },
  { id: "tube", name: "Extra Tube", desc: "+1 empty tube permanently", icon: "🔧", rarity: 3 },
  { id: "auto", name: "Auto-Sort", desc: "1 random tube starts solved each round", icon: "🎁", rarity: 4 },
];
