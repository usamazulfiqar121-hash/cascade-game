/* ═══════════ DAILY TARGET (offline) ═══════════
   One number, derived from the SAME daily seed the puzzle itself already
   uses (dateToSeed(), from gameLogic.js) — the identical pattern
   pickDailyUpgrades() and generateLevel() use to make the daily puzzle
   itself the same for everyone on a given date. Two players opening
   today's game therefore get the same target, and the same player
   looking again later today sees an unchanged one, because nothing here
   depends on wall-clock time beyond which day it is.

   This module used to be a 24-name simulated leaderboard: an invented
   pool of handles (BOT_NAMES), a seeded draw (drawField), a rank table
   (rankEntries), a logistic curve (percentileBeaten) and banded labels
   (rankLabel), all rendered by components/DailyBoard.jsx. It was
   invented rivals printed next to a real score, in a mode whose entire
   subject is one number that has to be honest — and the old file header
   had to admit the field was "not really a shared live service".

   All of that is gone. The only true thing this file knows is a target,
   so it is the only thing it returns, and there is no longer any way for
   a fabricated name or a "Top 12%" headline to reach a screen.

   Calibration note, flagged honestly: BASE_MEDIAN / MEDIAN_JITTER below
   are a design guess at "how far a typical run gets", built from reading
   generateLevel's difficulty ramp (colorCount growing every 2 rounds,
   moveLimit growing slower than that) — NOT measured from real
   completions, because there is no tally of finished daily runs anywhere
   in the app. Treat the number as a goal to clear, not as a statistic
   about other players, and revisit the constants once real
   daily-completion numbers exist. */

import { mulberry32 } from "./gameLogic";

/* "Typical" rounds-cleared for the day, before jitter. Nudged by a small
   per-day jitter (seeded off the same date, but a different mixed value
   than the board itself uses, so the jitter and the puzzle's own seeds
   can't cancel each other out) so some days read as slightly tougher or
   easier than others — texture, not a claim about actual difficulty. */
const BASE_MEDIAN = 8;
const MEDIAN_JITTER = 1.5;

/* Today's target, in rounds.

   Deliberately UNROUNDED here. The jitter is a smooth curve, and rounding
   it inside this function would bake a display decision into the one place
   that is supposed to be pure data; the single caller (components/
   TodayGoal.jsx) rounds for display instead, so there is exactly one
   rounding in the app rather than one here and one there.

   The xor keeps this stream independent of the seeds generateLevel() and
   pickDailyUpgrades() draw from the same dateToSeed() — same input,
   uncorrelated output — which is why changing a board's generation can
   never silently move the goal. */
export function dailyMedian(dateSeed) {
  const rng = mulberry32(dateSeed ^ 0x9e3779b9);
  return BASE_MEDIAN + (rng() * 2 - 1) * MEDIAN_JITTER;
}