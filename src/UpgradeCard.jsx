/* ═══════════ UPGRADE CARD ═══════════
   Single upgrade card on the upgrade selection screen. */

import { T, RARITY, CATEGORY, rarityText, rarityTint } from "./constants";

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
    <button
      onClick={onPick}
      /* B9 note — the press states live in .upgCard (globalStyles.js), and
         every property they animate has to be REACHABLE from there. It used
         to set `border`, `background` and `boxShadow` inline, and an inline
         shorthand outranks any stylesheet rule: adding `:active` tints on
         top would have dropped the border 40→65% and the glow change
         silently, with nothing thrown and no visual clue why, leaving only
         transform/filter alive.

         So what stays inline is layout and typography — none of which change
         on press — and the rarity colour is handed over as a custom
         property for the stylesheet to build its own tints from. That also
         means the resting appearance is defined in exactly one place now
         instead of two that can disagree. */
      className="upgCard"
      data-special={isSpecial ? "" : undefined}
      style={{
        "--rarity-c": r.color,
        width: "100%", borderRadius: 16, padding: "16px 14px",
        display: "flex", alignItems: "center", gap: 14,
        cursor: "pointer", textAlign: "left",
        fontFamily: "'Nunito', sans-serif", color: T.ink,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: rarityTint(r.color, 13.3), border: `2px solid ${rarityTint(r.color, 33.3)}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
      }}>{upgrade.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{upgrade.name}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{upgrade.desc}</div>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: rarityText(r.color), marginTop: 4, textTransform: "uppercase" }}>{r.name}{upgrade.dailyOnly ? " \u00b7 Daily only" : ""}</div>
        {/* Which category this card belongs to, on its own line under the
            rarity.

            The opening archetype weights two categories up for the first few
            picks (see OFFER_TUNING.focusMult), and until a card says what TYPE
            it is, that bias is invisible at the only moment it can act: the
            offer itself. A player told "favors Luck + Tempo" has no way to
            honour or even spot it, because nothing on the card separates a
            luck card from a tempo one — the icon and the text are per-card
            flavour, not category. Naming it here also makes the run's synergy
            weighting (synergyMult) legible for the rest of the run, which is
            the reason the categories are named at all.

            Its own line rather than a suffix on the rarity, because the two
            answer different questions — rarity is what you got, category is
            what it does for the build — and jamming them together invites
            reading the second word as a qualifier on the first.

            Guarded rather than assumed: a card with no `cat`, or a cat this
            build doesn't know, is legitimate (any future entry added without
            one, or one left behind by a retune), and either must print nothing
            rather than the word "undefined". */}
        {upgrade.cat && CATEGORY[upgrade.cat] && (
          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: T.muted, marginTop: 3, textTransform: "uppercase" }}>{CATEGORY[upgrade.cat].icon} {CATEGORY[upgrade.cat].name}</div>
        )}
      </div>
    </button>
  );
}
