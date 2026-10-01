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
  /* `days` is the streak length each one is earned at, and it lives HERE
     rather than as three literals in App.jsx's streak effect — which is where
     they were, so the achievement list advertised "7-day daily streak" while
     the code that actually grants it said `streak >= 7`, with nothing tying
     the two together. Retuning a milestone to 14 days would have meant
     finding that effect by memory, and missing it would have silently granted
     an achievement whose own description contradicted it.

     Unlike every other achievement, these three have REAL, DERIVABLE progress
     — the current streak is already computed from dailyResults (see
     computeStreak) and handed to the Profile screen, so a player one day
     short can be told exactly that. That is the one thing none of the other
     eight can offer, and it is why they carry a tier: the ceremony scales
     with them, and the guide can point at the nearest one still ahead. */
  { id: "streak_7", name: "Week Streak", desc: "7-day daily streak", icon: "📅", tier: 1, days: 7 },
  { id: "streak_30", name: "Month Streak", desc: "30-day daily streak", icon: "🌙", tier: 2, days: 30 },
  { id: "streak_100", name: "Century Streak", desc: "100-day daily streak", icon: "💯", tier: 3, days: 100 },
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

/* The streak achievements as one ordered list, derived from ACHIEVEMENTS
   rather than hand-written beside it — a second hand-maintained list of the
   same three entries would be free to drift out of step with the one the
   Profile screen renders, and the symptom would be a milestone that displays
   but can never be earned (or the reverse: granted with nothing to show for
   it). Filtered on `days` rather than on `tier`, because it is the streak
   LENGTH that unlocks these and tier is the ceremony's scale — they happen to
   coincide today at 3 entries, but they describe different things.

   Sorted ascending by threshold, and that order matters: App.jsx unlocks these
   in a single tick, and the ceremony defers to a microtask that keeps only the
   highest tier of the batch (see flushCeremony). Ascending is what makes the
   final call in the tick the one that wins. A copy is sorted rather than the
   ACHIEVEMENTS order being relied on, because that list is hand-authored and
   a future entry inserted at the top would otherwise silently change which
   ceremony fires. */
export const STREAK_MILESTONES = ACHIEVEMENTS
  .filter((a) => typeof a.days === "number")
  .sort((a, b) => a.days - b.days);

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
   dailyOnly flag below.

   `cat` groups cards by what they change rather than how big they are:
   "tempo" (a flat +N moves every round), "luck" (per-pour chance), "flow"
   (combo / mega / perfect-clear, i.e. cards that pay off move economy) and
   "board" (tube count, auto-sort). Offer rules key off this, so a card that
   arrives as a new balance patch is a one-word change here, not a new
   hardcoded id list in the picker. */
export const UPGRADES = [
  /* Values are against a board that needs ~5 (round 1) to ~22 (seven
     colours) moves: +4 every round is a fifth of a late board, every round,
     for the rest of the run. The ids keep their old names (m2, m8...) so a
     saved run still resolves; only the numbers moved. See MOVE_ECONOMY. */
  { id: "m2", name: "+1 Move", desc: "+1 move every round", icon: "🏃", rarity: 1, value: 1, cat: "tempo" },
  { id: "m3", name: "+2 Moves", desc: "+2 moves every round", icon: "⚡", rarity: 1, value: 2, cat: "tempo" },
  { id: "m5", name: "+3 Moves", desc: "+3 moves every round", icon: "🔥", rarity: 2, value: 3, cat: "tempo" },
  { id: "m8", name: "+4 Moves", desc: "+4 moves every round", icon: "💎", rarity: 3, value: 4, cat: "tempo" },
  { id: "start", name: "Head Start", desc: "+6 moves every round", icon: "🚀", rarity: 4, value: 6, cat: "tempo" },
  { id: "lucky", name: "Lucky Drop", desc: "20% chance per pour: +1 move", icon: "🍀", rarity: 1, cat: "luck" },
  { id: "lucky2", name: "Super Lucky", desc: "25% chance per pour: +1 move", icon: "🌟", rarity: 3, cat: "luck" },
  { id: "combo3", name: "Combo Master", desc: "Every 4th pour in a row: +1 move", icon: "🎯", rarity: 2, cat: "flow" },
  { id: "combo2", name: "Combo Legend", desc: "Every 3rd pour in a row: +1 move", icon: "🎪", rarity: 3, cat: "flow" },
  { id: "mega", name: "Mega Bonus", desc: "Every 8th pour in a row: +2 moves", icon: "🎊", rarity: 2, cat: "flow" },
  /* Was "Perfect Clear: finish with 5+ moves left: +3 next round". Under the
     par economy that fired on its own every early round (carry alone left 5)
     and never late, so it asked nothing of the player. Now it pays for skill:
     the id stays "clear" so saved runs keep the card. */
  { id: "clear", name: "Par Master", desc: "Solve a round within its target: +4 moves next round", icon: "🎯", rarity: 2, cat: "flow" },
  /* Trade-off cards: each one GIVES something and COSTS something, so the
     pick depends on the run and the player rather than on the bigger number.
     Balanced in simulation against the rest of the pool (see MOVE_ECONOMY). */
  { id: "glass", name: "Glass Cannon", desc: "+5 moves every round, but you lose Carry", icon: "💪", rarity: 3, value: 5, cat: "tempo" },
  { id: "invest", name: "Investment", desc: "+1 move next round, growing by +1 every round after", icon: "🌱", rarity: 2, cat: "tempo" },
  { id: "tube", name: "Extra Tube", desc: "+1 empty tube permanently (max 2)", icon: "🔧", rarity: 3, cat: "board" },
  { id: "auto", name: "Auto-Sort", desc: "1 random tube starts solved each round (max 2)", icon: "🎁", rarity: 4, cat: "board" },
  /* Rare, high-impact roll — bypasses normal weighting entirely; see
     JACKPOT_CHANCE in gameLogic.js. Never offered on a plain draw. */
  { id: "jackpot", name: "Jackpot!", desc: "+8 moves every round", icon: "🎰", rarity: 5, value: 8, cat: "tempo" },
  /* Daily-challenge exclusive — never offered by pickRandomUpgrades, so the
     daily habit has a payoff normal runs can't get, not just the same pool
     seeded differently. */
  /* Second Wind is spent by turning its id into "wind_used" in the run's
     upgrade list (App.jsx), so a saved daily run remembers it without any
     extra field. "wind_used" is not in this list on purpose: the run strip
     skips ids it doesn't know, so a spent card just disappears. */
  { id: "wind", name: "Second Wind", desc: "Once: out of moves? Get +5 and play on", icon: "💨", rarity: 3, dailyOnly: true, cat: "flow" },
  /* Retired. +6 moves for Rare was strictly worse than +8 Moves at the same
     rarity, so nobody had a reason to take the "daily exclusive". Kept in
     the list only so a run saved with it still resolves; pickDailyUpgrades
     skips retired cards. */
  { id: "dawn", name: "Dawn Bonus", desc: "+6 moves every round", icon: "🌅", rarity: 3, value: 6, dailyOnly: true, retired: true, cat: "tempo" },
];

/* Offer-draw tuning. Pure data — every number the upgrade picker in
   gameLogic.js reads lives here, so the offer rules can be retuned without
   touching the draw logic.

   The two slot caps exist because a plain draw could fill all three cards
   with "+N moves" variants, or with cards the run already stacks: the offer
   then reads as one repeated number three times rather than a choice. Each
   cap is per offer, not per run, and both are relaxed automatically if a
   late run has too few fresh cards left to honour them (see RELAX in
   drawOffer), so an offer is never short-filled because of a cap. */
export const OFFER_TUNING = {
  /* At most one card the run already owns in a single offer. */
  maxOwnedPerOffer: 1,
  /* At most one "tempo" card (a flat +N moves) in a single offer. */
  maxTempoPerOffer: 1,
  /* Pity: if the run has gone this many consecutive offers without taking a
     card at or above pityMinRarity, the next offer is guaranteed to contain
     one. Counted in offers, not rounds — they are the same thing here, since
     every offer ends in exactly one pick. */
  pityEvery: 5,
  /* Rare (3) and above counts as a pity reset. Jackpot is rarity 5, so a
     Jackpot offer satisfies pity on its own. */
  pityMinRarity: 3,
  /* Synergy: a card's draw weight is multiplied by the entry for how many
     cards the run ALREADY owns in that card's category — index 0 is a
     category the run has never invested in, index 3 is three or more. Read it
     as "reinforce what the run is already good at", which is what turns a
     random card into a build: two Lucky cards in and Super Lucky is twice as
     likely to be the card on offer.

     Rising, not falling: 1.0 with no investment, 2.5 once the run has three.
     A falling reading (2.5 at zero synergy) would make the game push cards
     AWAY from what the player has built, which is the opposite of the point.
     The last entry is the cap — a fourth card in the same category buys
     nothing more, so no single category can take the pool over. */
  synergyMult: [1, 1.2, 1.6, 2.5],
  /* The opening bias: how much a card in one of the run's chosen archetype
     categories is weighted up, for the first FOCUS_OFFERS picks only (see
     ARCHETYPES). 1.5 is deliberately gentle — it reorders the offer without
     making the other two cards irrelevant, so the first choice is still a
     real choice. */
  focusMult: 1.5,
  /* Ceiling on a single card's final weight, as a multiple of its base rarity
     weight. This one is not decorative — it fires on a completely ordinary
     opening, and it fires exactly where the other two curves stack: a card
     the run has already invested in (synergyMult's last rung, 2.5) in a
     category the bias still favours (focusMult, 1.5) is a flat 3.75x its own
     rarity weight, so without the ceiling the most-committed card in the pool
     would outweigh the whole rest of the draw. With rarityWeight(1) = 9 that
     is 34 against a cap of 27, and it is reachable in the first few picks —
     take three tempo cards, open Momentum, and the fourth tempo card is
     already over the line. That case is the right place for the ceiling: a
     player who has committed to a path should be nudged toward it, not have
     the pool collapse onto it. Any single card is now at most 3x its base
     weight no matter how the multipliers are retuned. */
  maxCardWeightMult: 3,
};

/* Display names for the `cat` groups above. Kept apart from UPGRADES so the
   rule layer never has to know how a category is spelled on screen, and so
   the offer screen can name what the run is becoming without the picker
   carrying any presentation strings. Order here is also the tie-break order
   runArchetype uses, so a run with two categories tied always resolves to the
   same one. */
export const CATEGORY = {
  tempo: { name: "Tempo", icon: "⏱️" },
  luck: { name: "Luck", icon: "🍀" },
  flow: { name: "Flow", icon: "🔥" },
  board: { name: "Board", icon: "🔧" },
};

export const CATEGORY_ORDER = ["tempo", "luck", "flow", "board"];

/* The opening offers a run can start from — the "pick your god" beat, and
   the first thing that makes a run feel chosen rather than dealt.

   `cats` is what the pick actually DOES: for the first few offers of a run,
   cards in these categories are weighted up (see focusMult). Each archetype
   grants two categories, so a pick expresses a direction ("more moves AND
   more combos") instead of a single stat.

   These are exactly the six distinct pairs of CATEGORY's four categories, one
   each — and six is the CEILING, not a taste call: four categories give
   C(4,2) = 6 two-category archetypes, so a seventh would have to duplicate a
   pair. A duplicate is a dead pick. The offer can't tell the two apart, so the
   player is asked to choose between identical things and correctly concludes
   the choice is fake — which teaches them the whole screen is a formality, and
   that reading carries over to the offer picks that genuinely matter. */
export const ARCHETYPES = [
  { id: "momentum", name: "Momentum", icon: "⏱️", cats: ["tempo", "flow"],
    desc: "More moves, faster combos. Outlast the board." },
  { id: "fortune", name: "Fortune", icon: "🍀", cats: ["luck", "tempo"],
    desc: "Lucky pours, backed by the moves to spend them on." },
  { id: "architect", name: "Architect", icon: "🔧", cats: ["board", "tempo"],
    desc: "More tubes, more room, more moves to fill it." },
  { id: "surgeon", name: "Surgeon", icon: "🧠", cats: ["flow", "board"],
    desc: "Precision bonuses on a board that stays out of your way." },
  { id: "gambler", name: "Gambler", icon: "🎲", cats: ["luck", "board"],
    desc: "Push your luck on a wider board. High variance, high ceiling." },
  { id: "catalyst", name: "Catalyst", icon: "🔥", cats: ["luck", "flow"],
    desc: "Lucky pours that keep a combo chain running." },
];

/* Deliberately NOT a flat stat bonus. A flat bonus would have to be large
   enough to feel like a reward, and a large flat bonus is just "this run is
   easier now" with no shape to it — and it would have to be applied
   permanently, since removing a mid-run nerf is worse than never granting it.

   Biasing the DRAW instead is self-limiting: it can only reorder cards that
   already exist, so a pick the player regrets still leaves a playable run, and
   because it expires (FOCUS_OFFERS) the run can still become something the
   opening didn't predict. The cost of that choice is that a weak opening can
   produce a few unsatisfying offers — which is the correct trade, because a
   bad opening should be survivable rather than silently corrected. */

/* How many archetypes a run is offered out of the six above, and how long the
   opening bias lasts. Four offered: there are 15 possible four-of-six sets, so
   consecutive runs almost never repeat, and four is also the most a player can
   genuinely compare at a glance — a fifth and sixth would stop being a choice
   and start being a menu. (S.overlay scrolls, so this is about attention, not
   about fitting on screen.)

   The bias covers the first FOCUS_OFFERS picks and then expires, so the
   opening is a nudge rather than a lock — a player who opens as Momentum and
   then takes three Luck cards ends up a Luck run, which is the outcome that
   makes the choice feel like a start rather than a promise. */
export const ARCHETYPE_OFFER_COUNT = 4;
export const FOCUS_OFFERS = 4;

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

/* ═══════════ RULE KINDS ═══════════
   The player-facing name for each `kind`, in ONE place. This map used to be
   copy-pasted into both the Home twist disclosure and the Codex, which is
   the exact shape that goes stale: the two looked the same on the day one of
   them was written, and a fourth kind added later would have rendered as
   `undefined` in whichever copy nobody remembered to update.

   The keys are deliberately in two vocabularies — the twists say
   blessing/curse/mixed, the weekly mutators say boon/curse/trade — because
   they are different kinds of promise (a twist is the day's flavour, a mutator
   is the whole week's rule) and "Blessing" would read oddly on a card that
   says THIS WEEK. What they share is the three POSITIONS, which is why they
   resolve through the same table and the same three colours.

   Both vocabularies map onto the same colour as their counterpart, so a curse
   looks like a curse whether it lasts a day or a week. */
export const RULE_KIND_LABEL = {
  blessing: "Blessing",
  boon: "Boon",
  curse: "Curse",
  mixed: "Trade-off",
  trade: "Trade-off",
};

/* The colour half of the same table, as CSS var() strings so it can be handed
   straight to a style or a color-mix() in either theme. Deliberately NOT the
   D.* token values: D is what JSX inline styles use, but the Codex and the
   CSS-driven badge both work in var() terms, and mixing the two forms in one
   table is how a value ends up undefined in one theme and fine in the other.

   An unknown kind falls back to the blessing green, matching what both call
   sites did when their own ternary didn't recognise it — the safe direction,
   since a new kind should read as neutral-good until someone colours it. */
export const RULE_KIND_COLOR = {
  blessing: "var(--go)",
  boon: "var(--go)",
  curse: "var(--danger)",
  mixed: "var(--gold-text)",
  trade: "var(--gold-text)",
};
