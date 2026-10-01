/* ═══════════ DAILY LEADERBOARD (offline) ═══════════
   Pure functions — no React, no network. There's no backend or
   accounts behind this game, so "today's board" is generated
   entirely on-device from the SAME daily seed the puzzle itself
   already uses (dateToSeed(), from gameLogic.js) — the identical
   pattern pickDailyUpgrades() and generateLevel() use to make the
   daily puzzle itself the same for everyone on a given date.

   That means: every player who opens today's board sees the same
   named entries at the same scores (it's not really a shared live
   service — it's the well-worn single-player "offline/ghost
   leaderboard" pattern, same idea as a target score or a ghost
   replay), and the SAME player looking again later today sees an
   unchanged board, because nothing here depends on wall-clock time
   beyond which day it is.

   Calibration note, flagged honestly: BASE_MEDIAN/SPREAD below are
   a design guess at "how far a typical run gets", built from
   reading generateLevel's difficulty ramp (colorCount growing every
   2 rounds, moveLimit growing slower than that) — not measured from
   real completions, because nobody has played the daily yet. Treat
   the resulting rank labels as flavor, not a verified statistic,
   and revisit the constants once real daily-completion numbers
   exist (dailyResults already has enough history for that). */

import { mulberry32 } from "./gameLogic";

/* Gamertag-style handles — invented, not real people. Enough of a
   pool (32) that a given day's 24-entry field rarely reuses one
   from a nearby day, without needing a huge list to maintain. */
const BOT_NAMES = [
  "TubeMaster99", "PourQueen", "SortWizard", "NightOwl_42", "ColorCrusher",
  "SlowAndSteady", "OneMoveWonder", "TidyChaos", "PuzzleGoblin", "LiquidLogic",
  "StackAttack", "QuietStorm", "ZenSorter", "MoveCounter", "LastDropWins",
  "Overflowed", "PatientPourer", "RoundTripper", "GlassHalfFull", "TinyVictories",
  "NoUndoNeeded", "StreakSeeker", "FluidThinker", "CascadeFan", "EarlyBird_",
  "DrySpell", "ChainReaction", "SplashZone", "TenthTry", "FirstPour",
  "MidnightSort", "SteadyHands",
];

/* "Typical" rounds-cleared for the day, before spread. Nudged by a
   small per-day jitter (seeded off the same date, but a different
   mixed value than the board itself uses, so the jitter and the
   field draw don't cancel each other out) so some days read as
   slightly tougher or easier than others — texture, not a claim
   about actual difficulty. */
const BASE_MEDIAN = 8;
const MEDIAN_JITTER = 1.5;
const SPREAD = 3.2;
const FIELD_SIZE = 24;
const MAX_BOT_ROUNDS = 30;

function dailyMedian(dateSeed) {
  const rng = mulberry32(dateSeed ^ 0x9e3779b9);
  return BASE_MEDIAN + (rng() * 2 - 1) * MEDIAN_JITTER;
}

/* Percentage of the field a `rounds` score beats (0-100), as a
   closed-form logistic curve — independent of any one sampled
   field, so it stays stable even though generateDailyBoard() below
   only ever draws a finite (24-name) sample of it. */
export function percentileBeaten(rounds, dateSeed) {
  const median = dailyMedian(dateSeed);
  const z = (rounds - median) / SPREAD;
  const p = 1 / (1 + Math.exp(-z));
  return Math.round(p * 1000) / 10;
}

export function rankLabel(pctBeaten) {
  const topPct = 100 - pctBeaten;
  if (topPct <= 5) return "Top 5%";
  if (topPct <= 12) return "Top 12%";
  if (topPct <= 25) return "Top 25%";
  if (topPct <= 40) return "Top 40%";
  if (topPct <= 60) return "Top 60%";
  if (topPct <= 80) return "Top 80%";
  return "Keep climbing";
}

/* The day's FIELD_SIZE named entries, drawn from a logistic distribution
   centered on dailyMedian() (matching the curve percentileBeaten() uses, so
   the two stay roughly consistent with each other). Shared by every public
   entry point below so that all of them describe the same day. */
function drawField(dateSeed) {
  const rng = mulberry32(dateSeed);
  const median = dailyMedian(dateSeed);

  const pool = [...BOT_NAMES];
  const bots = [];
  const n = Math.min(FIELD_SIZE, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = (rng() * pool.length) | 0;
    const name = pool.splice(idx, 1)[0];
    const u = Math.min(0.995, Math.max(0.005, rng()));
    const raw = median + SPREAD * Math.log(u / (1 - u));
    const rounds = Math.max(0, Math.min(MAX_BOT_ROUNDS, Math.round(raw)));
    bots.push({ name, rounds });
  }
  return bots;
}

/* Sort + stamp ranks. The tie-break is the load-bearing part: it used to be
   `a.isPlayer ? -1 : 1` — invalid as a comparator, because for two tied BOTS
   (neither one isPlayer) that returns 1 in BOTH directions, which breaks the
   antisymmetry Array.prototype.sort requires. Two tied bots were never
   reported as equal, so the ES2019 stable-sort guarantee didn't apply to
   them — their relative order became whatever a given engine's sort happens
   to do with an invalid comparator, not something derived from any rule here.
   That's a real problem for a board whose whole premise (see the file header)
   is "every player sees the same board": two players on different
   engine/WebView versions could see tied bots in a different order for the
   exact same dateSeed. Returning 0 for a bot-vs-bot tie correctly reports
   them as equal, so the guaranteed-stable sort preserves their original
   (deterministic, seeded draw) order on any spec-conforming engine — same
   input, same output, everywhere. Player-vs-bot ties are unaffected: -1/+1
   there was already consistent in both directions, so "ties go to the
   player" still holds exactly as before. */
function rankEntries(entries) {
  entries.sort((a, b) => b.rounds - a.rounds || (a.isPlayer ? -1 : b.isPlayer ? 1 : 0));
  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

/* The day's field WITH the real player's own entry inserted at its true sorted
   position. Ties go to the player, so a matching score reads as "you made it"
   rather than being bumped below a same-scoring bot. */
export function generateDailyBoard(dateSeed, playerRounds) {
  return rankEntries([
    ...drawField(dateSeed),
    { name: "You", rounds: Math.max(0, playerRounds || 0), isPlayer: true },
  ]);
}

/* The SAME seeded field with no player row in it — for showing the day
   before the player has played. generateDailyBoard always injects a
   "You" entry, and a "You · 0" row is worse than useless on Home for
   someone who hasn't started: it reads as a score of zero against a
   field they're about to go and try to beat.

   Both functions call the same drawField() with the same seed rather than
   each re-running the draw themselves, so the preview on Home and the
   board on the game-over card are the same field by construction — not by
   two copies of the loop happening to stay in step. That's the one property
   the file header says the whole design rests on, so it's worth spending a
   function on. */
export function previewField(dateSeed) {
  return rankEntries(drawField(dateSeed));
}
