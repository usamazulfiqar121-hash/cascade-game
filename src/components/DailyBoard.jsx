/* ═══════════ DAILY BOARD ═══════════
   Compact "how you did today" card for the daily game-over screen.
   Top 3 of the day's (offline, seeded — see src/leaderboard.js)
   field, plus the player's own row if they didn't crack the top 3.
   Deliberately small — this sits above the existing countdown/share
   buttons, not a full scrolling list.

   The field is simulated, and the card says so. It used to headline a
   percentile ("Top 12% today") computed from a guessed distribution, next
   to invented player names, so it read as a real ranking of real players.
   The headline is now the one true thing the card knows -- your position
   in the field it is showing -- and a caption names the field as
   simulated. Real comparison lives in Compare Friends.

   variant:
     "full"    — the game-over card, exactly as it has always rendered:
                your position, and your row again below the cut if you
                missed the top 3. This is the default so the existing
                call site is unaffected.
     "preview" — Home, BEFORE the player has played today. Same seeded
                field (previewField in leaderboard.js reads the identical
                draw), no "You" row, because a "You · 0" against a field
                you haven't met yet reads as a score of zero rather than
                as a target. */

import { T } from "../constants";
import { generateDailyBoard, previewField } from "../leaderboard";

const TOP_N = 3;

export default function DailyBoard({ rounds, dateSeed, variant = "full", style }) {
  const isPreview = variant === "preview";
  const board = isPreview ? previewField(dateSeed) : generateDailyBoard(dateSeed, rounds);
  const player = isPreview ? null : board.find((e) => e.isPlayer);
  /* An empty field, or a board whose entries never carry the player's own
     row, would leave `player` undefined and take out `player.rank` below --
     a render-time TypeError on a card that is otherwise entirely optional.
     Say nothing rather than crash the game-over screen. Preview mode has no
     player row by construction, so the guard only applies to "full". */
  if (!isPreview && !player) return null;

  const top = board.slice(0, TOP_N);
  const playerInTop3 = !!player && player.rank <= TOP_N;
  const headline = isPreview
    ? "Today's field"
    : `Ghost field · #${player.rank} of ${board.length}`;

  return (
    <div style={{ ...s.card, ...(style || null) }}>
      <div style={s.headline}>
        <span style={s.trophy}>{isPreview ? "👥" : "🏆"}</span>
        <span style={s.headlineText}>{headline}</span>
      </div>

      <div style={s.rows}>
        {top.map((e) => (
          <Row key={e.rank} entry={e} />
        ))}
        {!isPreview && !playerInTop3 && (
          <>
            <div style={s.divider}>···</div>
            <Row entry={player} />
          </>
        )}
      </div>
      <div style={s.caption}>Simulated players, not real accounts</div>
    </div>
  );
}

function Row({ entry }) {
  return (
    <div style={{ ...s.row, ...(entry.isPlayer ? s.rowPlayer : null) }}>
      <span style={{ ...s.rank, color: entry.isPlayer ? T.gold : T.muted }}>
        #{entry.rank}
      </span>
      <span style={{ ...s.name, color: entry.isPlayer ? T.ink : T.muted, fontWeight: entry.isPlayer ? 800 : 700 }}>
        {entry.name}
      </span>
      <span style={{ ...s.rounds, color: entry.isPlayer ? T.gold : T.ink }}>
        {entry.rounds}
      </span>
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
    gap: 6, marginBottom: 10,
  },
  trophy: { fontSize: 13, lineHeight: 1 },
  headlineText: {
    fontSize: 11, fontWeight: 900,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: T.gold,
  },
  rows: { display: "flex", flexDirection: "column", gap: 6 },
  caption: {
    marginTop: 10, textAlign: "center",
    fontSize: 10, fontWeight: 600,
    color: T.muted, opacity: 0.8,
  },
  row: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "4px 2px",
  },
  rowPlayer: {
    background: `color-mix(in srgb, ${T.gold} 7.8%, transparent)`,
    borderRadius: 8,
    padding: "5px 8px",
  },
  rank: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: 800,
    width: 26, flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  },
  name: {
    fontSize: 12, flex: 1,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  rounds: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
  },
  divider: {
    textAlign: "center", color: T.muted,
    fontSize: 11, letterSpacing: "0.2em",
    margin: "-1px 0",
  },
};
