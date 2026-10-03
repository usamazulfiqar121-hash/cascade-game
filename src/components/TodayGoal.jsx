/* ═══════════ TODAY'S GOAL ═══════════
   The daily's one honest number: a target round to reach.

   This replaces components/DailyBoard.jsx, which drew a 24-name
   simulated leaderboard with ranks and a "Top 12% today" headline. That
   was invented rivals printed beside a real score, on the one screen
   whose whole subject is a number the player can check — and the module
   behind it (src/leaderboard.js) had to confess in its own header that
   the field was "not really a shared live service". Everything invented
   is gone; what remains is the single thing the code can actually
   support, which is a goal derived from the same date seed the puzzle
   itself uses (see dailyMedian in leaderboard.js).

   What it deliberately does NOT claim: that the number is a median of
   real players. It is a design constant with a small seeded jitter per
   day, so every player gets the same goal and it stays put for that day,
   but it is a target, not a statistic.

   variant:
     "home"    — before the player has committed today. Just the target,
                 because a target is what makes an attempt worth making.
     "result"  — after the run is over. The same target beside what was
                 actually cleared, and the gap named in words ("2 short")
                 so the miss reads as a number to go and beat rather than
                 as a verdict.

   rounds is deliberately allowed to be missing or 0: on Home it is 0 for
   anyone who hasn't played today, and that must render the goal rather
   than "You made 0". */

import { T, roundsText } from "../constants";
import { dailyMedian } from "../leaderboard";

export default function TodayGoal({ rounds, dateSeed, variant = "home", style }) {
  const isResult = variant === "result";
  /* Rounded HERE, at the only point that draws this, rather than inside
     dailyMedian — see the note there on why the data function stays
     unrounded. Math.round on a positive jittered value is a plain
     half-up, which is what "Round 8" should read as. */
  const goal = Math.max(1, Math.round(dailyMedian(dateSeed)));
  const made = Number.isFinite(rounds) ? Math.max(0, Math.round(rounds)) : 0;
  const short = Math.max(0, goal - made);
  const cleared = short === 0;

  return (
    <div style={{ ...s.card, ...(style || null) }}>
      <div style={s.headline}>
        <span aria-hidden="true" style={s.icon}>🎯</span>
        <span style={s.headlineText}>
          {isResult ? `Goal: Round ${goal}` : "Today's Goal"}
        </span>
        {!isResult && <span style={s.goalNum}>{" · "}Round {goal}</span>}
      </div>

      {isResult && (
        <div style={s.result}>
          <span style={{ color: T.ink, fontWeight: 800 }}>You made {roundsText(made)}</span>
          <span style={{ color: cleared ? T.goText : T.danger, fontWeight: 800 }}>
            {" · "}{cleared ? "cleared" : `${short} short`}
          </span>
        </div>
      )}
    </div>
  );
}

const s = {
  card: {
    background: `color-mix(in srgb, ${T.bg} 50.2%, transparent)`,
    border: `1px solid ${T.edge}`,
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 12,
  },
  headline: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 6,
  },
  icon: { fontSize: 13, lineHeight: 1 },
  headlineText: {
    fontSize: 11, fontWeight: 900,
    letterSpacing: "0.1em", textTransform: "uppercase",
    /* goldText, not gold: 11px uppercase on a translucent card is small text
       in both themes, and --gold is the bright fill token that does not clear
       contrast on the light theme at this size. The card's border below still
       uses the bright token for the same reason the badge keeps its tint. */
    color: T.goldText,
  },
  /* Same number, louder: on Home this is the only reason the card exists,
     so it is set in the game's own numeric face at the headline's weight
     rather than as a second piece of small caps. */
  goalNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, fontWeight: 800,
    letterSpacing: 0, textTransform: "none",
    color: T.ink,
    fontVariantNumeric: "tabular-nums",
  },
  /* Two clauses on one line, separated by colour rather than a bullet
     character: what was cleared is a fact (neutral ink) and the gap is a
     verdict (danger, or green when there isn't one). */
  result: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 5, marginTop: 8,
    fontSize: 12, fontWeight: 700,
  },
};