/* ═══════════ DAILY BOARD ═══════════
   Compact "how you did today" card for the daily game-over screen.
   Top 3 of the day's (offline, seeded — see src/leaderboard.js)
   field, plus the player's own row if they didn't crack the top 3,
   under a headline rank label. Deliberately small — this sits above
   the existing countdown/share buttons, not a full scrolling list. */

import { T } from "../constants";
import { generateDailyBoard, percentileBeaten, rankLabel } from "../leaderboard";

export default function DailyBoard({ rounds, dateSeed }) {
  const board = generateDailyBoard(dateSeed, rounds);
  const pct = percentileBeaten(rounds, dateSeed);
  const label = rankLabel(pct);
  const player = board.find((e) => e.isPlayer);
  const top3 = board.slice(0, 3);
  const playerInTop3 = player.rank <= 3;

  return (
    <div style={s.card}>
      <div style={s.headline}>
        <span style={s.trophy}>🏆</span>
        <span style={s.headlineText}>{label} today</span>
      </div>

      <div style={s.rows}>
        {top3.map((e) => (
          <Row key={e.rank} entry={e} />
        ))}
        {!playerInTop3 && (
          <>
            <div style={s.divider}>···</div>
            <Row entry={player} />
          </>
        )}
      </div>
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
    background: `${T.bg}80`,
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
  row: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "4px 2px",
  },
  rowPlayer: {
    background: `${T.gold}14`,
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
