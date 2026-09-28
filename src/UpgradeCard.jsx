/* ═══════════ UPGRADE CARD ═══════════
   Single upgrade card on the upgrade selection screen. */

import { T, RARITY } from "./constants";

export default function UpgradeCard({ upgrade, onPick }) {
  const r = RARITY[upgrade.rarity];
  /* Legendary and Jackpot (rarity 4-5) are already the two tiers with
     both a materially bigger effect (constants.js) and their own
     color — but on the actual pick screen they sat in an identically
     plain card as a Common +2 Moves, so nothing on screen told you a
     rare roll had even happened beyond a small uppercase label easy to
     miss mid-decision. The glow is built from the tier's own color
     (r.color), not a fixed gold value, so it's correct for Jackpot's
     pink too, not just Legendary's gold. */
  const isSpecial = upgrade.rarity >= 4;
  return (
    <button onClick={onPick} style={{
      width: "100%", background: T.card, border: `2px solid ${r.color}66`,
      borderRadius: 16, padding: "16px 14px", display: "flex", alignItems: "center",
      gap: 14, cursor: "pointer", textAlign: "left",
      fontFamily: "'Nunito', sans-serif", color: T.ink,
      transition: "all 200ms cubic-bezier(.2,1.1,.3,1)",
      boxShadow: isSpecial
        ? `0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px ${r.color}33, 0 0 22px ${r.color}40`
        : `0 4px 16px rgba(0,0,0,0.3)`,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: `${r.color}22`, border: `2px solid ${r.color}55`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
      }}>{upgrade.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{upgrade.name}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{upgrade.desc}</div>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: r.color, marginTop: 4, textTransform: "uppercase" }}>{r.name}</div>
      </div>
    </button>
  );
}
