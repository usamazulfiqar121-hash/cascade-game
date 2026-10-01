/* ═══════════ CODEX SCREEN ═══════════
   A reference for the three things a run is built out of — opening
   paths, upgrade categories, daily rules — plus what this player has
   actually done with them.

   It is a codex, not a trophy case. Nothing here is locked, hidden or
   earned, and that is a deliberate reversal of the usual collector
   treatment: the archetype picker offers 4 of the 6 paths, so the two it
   didn't offer are precisely the ones a player has no other way to look
   at, and a screen that hid them would be withholding the information
   that makes the next pick an informed one. Discovery is shown as a
   count, never used as a curtain.

   Everything on screen is derived from the counts in codex.js, so the
   "you've taken" figures are real totals across every run rather than a
   per-session number that would restart behind the player's back. */

import { ARCHETYPES, CATEGORY, CATEGORY_ORDER, DAILY_TWISTS, UPGRADES, RULE_KIND_COLOR, RULE_KIND_LABEL } from "./constants";
import { pickDailyTwist, MOVE_ECONOMY } from "./gameLogic";
import { loadCodex } from "./codex";
import { useMemo, useState } from "react";
import { useEnterShield } from "./useEnterShield";

/* The move budget, in the words the round-start line uses (see budgetLine in
   App.jsx). Numbers come from MOVE_ECONOMY so this cannot drift from the code. */
const MOVE_RULES = [
  { icon: "⛳", name: "Par", desc: "About the fewest moves this board needs. Your moves never drop below it, so every round can be won." },
  { icon: "🫧", name: "Spare", desc: `Extra moves on top of par: +${Math.round(MOVE_ECONOMY.bufferStart * 100)}% on round 1, shrinking to +${Math.round(MOVE_ECONOMY.bufferEnd * 100)}% by round ${MOVE_ECONOMY.bufferRound}.` },
  { icon: "🩸", name: "Drain", desc: `From round ${MOVE_ECONOMY.drainFrom + 1}, every round takes a few more moves away — and it speeds up. Your upgrades are what keep you ahead of it.` },
  { icon: "⚡", name: "Sudden death", desc: "Once the drain eats every spare move, rounds give exactly par and lucky / combo moves switch off. Move cards keep you out of it longer." },
  { icon: "↪️", name: "Carry", desc: `Half the moves you finish a round with roll into the next one, up to ${MOVE_ECONOMY.carryCap}. Solve tight, start the next board richer.` },
  { icon: "👹", name: "Boss", desc: `Every ${MOVE_ECONOMY.bossEvery}th round has half the spare moves. Clear it and you get one extra upgrade to choose from.` },
];

/* The same three-way split the daily twist disclosure already uses, so the
   rule reads identically wherever it appears — except the map itself, which
   used to be duplicated here and has moved to constants.js as
   RULE_KIND_LABEL. The colour ternary below had the same problem one level
   down: it re-derived the same three-way split from `kind` by hand, so a new
   kind would have had to be added in two places, and a miss in either one
   fails differently — the label renders `undefined`, the colour silently
   falls through to blessing-green. Both now read from the one table. */

export default function CodexScreen({ onClose, onBack, closing = false }) {
  const handleBack = onBack || onClose;
  const ready = useEnterShield();

  /* Read here, on mount, rather than passed down from App. The counts can
     only change while a run is in progress, and this screen is reachable
     from Home and nowhere else — so there is no live value to subscribe to,
     and threading one through App would mean a state that has to be
     invalidated every time a card is picked. A fresh read per open is both
     correct and free.

     Lazy initialiser rather than useState(null) + useEffect(loadCodex): the
     effect version renders the screen as all-dashes first and fills it in a
     frame later, so opening the Codex on a run where you've taken 60 cards
     would visibly show 0 and then jump. The read is localStorage, and this
     is a screen the player opened deliberately. */
  const [seen] = useState(loadCodex);

  const today = useMemo(() => pickDailyTwist(), []);
  const cardsTaken = Object.values(seen.cards).reduce((a, b) => a + b, 0);

  /* Cards grouped by category, in CATEGORY_ORDER, retired ones dropped
     (see codex.js — a retired id is never offered again, so listing it
     would advertise a card that doesn't exist). Built from the catalog, not
     from the counters: a category the player has never once drawn from
     still belongs on the screen, as an empty list, because "this category
     exists and you have never touched it" is the most useful thing a
     reference can tell someone. */
  const byCat = {};
  for (const c of CATEGORY_ORDER) {
    byCat[c] = UPGRADES.filter((u) => !u.retired && u.cat === c);
  }

  return (
    <div
      style={{
        ...S.page,
        animation: closing
          ? "slideOutRight 280ms cubic-bezier(0.4, 0, 1, 1) both"
          : "slideInRight 320ms cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: closing ? "none" : "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Codex"
      tabIndex={-1}
      ref={(el) => {
        if (el && !el.dataset.focused) {
          el.dataset.focused = "1";
          const btn = el.querySelector('button[aria-label="Back"]');
          btn?.focus?.({ preventScroll: true });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleBack();
        }
      }}
    >
      <div style={S.header}>
        <button onClick={handleBack} className="press" style={S.backBtn} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 6L9 12L15 18" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={S.title}>Codex</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={S.scroll}>
        {/* One line of orientation. Three sections of reference data with no
            introduction read as a debug panel; this says what the screen is
            for and, more usefully, states the one rule that explains every
            number on it — the opening bias expires, so a path is a start and
            not a promise.

            The emphasised word is a styled span, not <strong>: the default
            bold of a body-weight sans sits heavier than anything else on the
            screen, and globalStyles.js is off-limits this pass, so it can't
            be handed a class to bring it back to the file's own scale. */}
        <div style={S.intro}>
          Every run opens with a <span style={S.introEm}>path</span> that favours two upgrade
          types for your first few picks. It&apos;s a nudge, not a lock — the cards you take
          decide where the run actually goes.
        </div>

        {/* ── HOW MOVES WORK ──
            First, because every other section is about getting more out of
            this one: paths, cards and rules are all ways of beating the move
            budget, and a player who can't see how the budget is made can't
            judge any of them. The same five words appear under the board at
            the start of every round, so this is the long form of a line the
            player has already read. */}
        <div style={S.sectionLabel}>HOW MOVES WORK</div>
        <div style={S.stack}>
          {MOVE_RULES.map((r) => (
            <div key={r.name} style={S.row}>
              <div style={S.rowIcon} aria-hidden="true">{r.icon}</div>
              <div style={S.rowBody}>
                <div style={S.rowName}>{r.name}</div>
                <div style={S.rowDesc}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── PATHS ── */}
        <div style={S.sectionLabel}>PATHS</div>
        <div style={S.stack}>
          {ARCHETYPES.map((a) => {
            const n = seen.paths[a.id] || 0;
            return (
              /* role="group" + a label carrying the STATE, not the count: the
                 row's own text (name, description, categories) is still read
                 as the group's contents, and aria-label on a bare <div> is
                 prohibited for role=generic — several screen readers drop it,
                 which would leave "3×" announced as the whole state. The
                 visible count is therefore aria-hidden, so "3×" and "Used in
                 3 runs" don't both get read. */
              <div
                key={a.id}
                role="group"
                aria-label={n ? `Used in ${n} run${n === 1 ? "" : "s"}` : "Not used yet"}
                style={{ ...S.row, borderColor: n ? "color-mix(in srgb, var(--accent) 30%, transparent)" : S.row.borderColor }}
              >
                <div style={{ ...S.rowIcon, ...(n ? { borderColor: "color-mix(in srgb, var(--accent) 34%, transparent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" } : {}) }}>{a.icon}</div>
                <div style={S.rowBody}>
                  <div style={S.rowName}>{a.name}</div>
                  <div style={S.rowDesc}>{a.desc}</div>
                  <div style={S.rowMeta}>{a.cats.map((c) => CATEGORY[c].name).join(" + ")}</div>
                </div>
                <div aria-hidden="true" style={S.count}>{n ? `${n}×` : "—"}</div>
              </div>
            );
          })}
        </div>

        {/* ── CATEGORIES ──
            The reason this screen earns its place. A player who picked
            Fortune has been told it favours Luck + Tempo and has had four
            offers to work that out from card names alone; this is where the
            whole set becomes visible at once, which is also what makes the
            next pick deliberate. */}
        <div style={S.sectionLabel}>UPGRADE CATEGORIES</div>
        <div style={S.stack}>
          {CATEGORY_ORDER.map((c) => {
            const list = byCat[c];
            const held = list.reduce((sum, u) => sum + (seen.cards[u.id] || 0), 0);
            return (
              <div key={c} style={S.catBlock}>
                <div style={S.catHead}>
                  <div style={S.catIcon} aria-hidden="true">{CATEGORY[c].icon}</div>
                  <div style={S.catBody}>
                    <div style={S.catName}>{CATEGORY[c].name}</div>
                    <div style={S.catSub}>
                      {list.length} card{list.length === 1 ? "" : "s"} · you&apos;ve taken {held}
                    </div>
                  </div>
                </div>
                <div style={S.catList}>
                  {list.map((u) => (
                    <div key={u.id} style={S.catItem}>
                      <span aria-hidden="true" style={S.catItemIcon}>{u.icon}</span>
                      <span style={S.catItemName}>{u.name}</span>
                      <span style={S.catItemCount}>{seen.cards[u.id] ? `${seen.cards[u.id]}×` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── DAILY RULES ── */}
        <div style={S.sectionLabel}>DAILY RULES</div>
        <div style={S.stack}>
          {DAILY_TWISTS.map((t) => {
            const isToday = today && t.id === today.id;
            const n = seen.twists[t.id] || 0;
            const color = RULE_KIND_COLOR[t.kind] || RULE_KIND_COLOR.blessing;
            return (
              <div
                key={t.id}
                role="group"
                aria-label={isToday
                  ? "Today's rule"
                  : n ? `Played ${n} day${n === 1 ? "" : "s"}` : "Not played yet"}
                style={isToday
                  ? { ...S.row, borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, background: `color-mix(in srgb, ${color} 7%, transparent)` }
                  : S.row}
              >
                <div style={{ ...S.rowIcon, ...(isToday ? { borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 13%, transparent)` } : {}) }}>{t.icon}</div>
                <div style={S.rowBody}>
                  <div style={S.rowName}>
                    {t.name}
                    {/* The kind is already implied by the colour above; spelled
                        out, because colour alone is exactly the channel the
                        colour-blind setting removes. */}
                    <span style={{ ...S.rowMeta, display: "inline", marginLeft: 6 }}>· {RULE_KIND_LABEL[t.kind]}</span>
                  </div>
                  <div style={S.rowDesc}>{t.desc}</div>
                </div>
                {isToday ? (
                  <div style={{ ...S.badge, color, borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 13%, transparent)` }}>Today</div>
                ) : (
                  <div aria-hidden="true" style={S.count}>{n ? `${n}×` : "—"}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lifetime total, at the end where it's a summary rather than a
            score. Sits below the last section on purpose: as a hero at the
            top it would out-shout the actual content, which is the
            reference, not the score. */}
        <div style={S.footnote}>
          {cardsTaken === 0
            ? "No upgrades taken yet. Clear a round to start filling this in."
            : `${cardsTaken} upgrade${cardsTaken === 1 ? "" : "s"} taken across all runs.`}
        </div>
      </div>
      {!ready && <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 5 }} />}
    </div>
  );
}

/* ═══════════ STYLES ═══════════
   var(--…) custom properties only, never a literal colour — the same
   hardcoded-to-dark-theme bug class the Profile screen documents twice in
   its own comments, and the reason this file has no T import at all. The
   page shell, header, back button and scroll box are deliberately
   identical to AchievementsScreen's so the two screens read as siblings
   rather than as two different apps' settings pages. */
const S = {
  page: {
    position: "fixed", inset: 0,
    background: "var(--bg-0)",
    display: "flex", flexDirection: "column",
    zIndex: 80,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "calc(env(safe-area-inset-top, 0px) + 16px) 20px 16px",
    borderBottom: "1px solid var(--glass-border)",
    background: "var(--bg-0)",
  },
  backBtn: {
    width: 44, height: 44,
    borderRadius: 12,
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    padding: 0, outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  title: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 17, fontWeight: 900,
    color: "var(--text)",
    letterSpacing: "-0.02em",
  },
  scroll: {
    flex: 1, overflowY: "auto",
    padding: "20px 20px calc(env(safe-area-inset-bottom, 0px) + 32px)",
    WebkitOverflowScrolling: "touch",
  },

  /* The one piece of prose on the screen. */
  intro: {
    fontSize: 12.5, fontWeight: 600,
    color: "var(--text-sub)",
    lineHeight: 1.5,
    padding: "14px 16px",
    marginBottom: 22,
    borderRadius: 14,
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
  },
  /* One notch above the surrounding 600 weight rather than a full bold, so
     the emphasised word separates without becoming the loudest thing in a
     paragraph of otherwise quiet grey. */
  introEm: { fontWeight: 800, color: "var(--text)" },

  sectionLabel: {
    fontSize: 10, fontWeight: 900,
    color: "var(--text-sub)",
    letterSpacing: "0.16em",
    padding: "0 4px 10px",
    marginTop: 4,
  },

  stack: {
    display: "flex", flexDirection: "column",
    gap: 10, marginBottom: 24,
  },

  /* One reference row — a path or a daily rule. */
  row: {
    display: "flex", alignItems: "center", gap: 13,
    padding: "13px 14px",
    borderRadius: 16,
    border: "1px solid var(--glass-border)",
    background: "var(--glass)",
  },
  rowIcon: {
    width: 40, height: 40,
    borderRadius: 12,
    border: "1.5px solid var(--glass-border)",
    background: "color-mix(in srgb, var(--muted) 8%, transparent)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 19, flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: {
    fontSize: 14, fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.01em", lineHeight: 1.25,
  },
  rowDesc: {
    fontSize: 11.5, fontWeight: 600,
    color: "var(--text-sub)",
    marginTop: 3, lineHeight: 1.35,
  },
  /* The category pair under a path's description. Letter-spaced caps to
     match the section labels, so "Luck + Tempo" reads as a tag rather than
     as more prose competing with the description above it. */
  rowMeta: {
    display: "block",
    fontSize: 9, fontWeight: 900,
    color: "var(--accent)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginTop: 5,
  },
  /* The count, right-aligned. A dash rather than "0×" for never-used: the
     dash reads as "not yet", which is the accurate reading, where a zero
     reads as a score of zero. */
  count: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, fontWeight: 800,
    color: "var(--text-sub)",
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  },
  badge: {
    fontSize: 9, fontWeight: 900,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid",
    flexShrink: 0,
  },

  /* ── Category blocks ──
     A bordered card containing its own list, so a category reads as one
     unit with the cards under it, rather than as a loose group of rows
     separated by the same 10px gap as the paths above. */
  catBlock: {
    borderRadius: 16,
    border: "1px solid var(--glass-border)",
    background: "var(--glass)",
    overflow: "hidden",
  },
  catHead: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "13px 14px",
  },
  catIcon: {
    width: 34, height: 34,
    borderRadius: 11,
    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 17, flexShrink: 0,
  },
  catBody: { flex: 1, minWidth: 0 },
  catName: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 15, fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.02em", lineHeight: 1.2,
  },
  catSub: {
    fontSize: 11, fontWeight: 600,
    color: "var(--text-sub)",
    marginTop: 3,
  },
  /* The list itself, on its own tinted ground. A hairline above it rather
     than a gap, so the header and the list read as one panel. */
  catList: {
    borderTop: "1px solid var(--glass-border)",
    background: "color-mix(in srgb, var(--muted) 4%, transparent)",
    padding: "4px 14px",
  },
  catItem: {
    display: "flex", alignItems: "center", gap: 9,
    padding: "7px 0",
    fontSize: 12, fontWeight: 600,
    color: "var(--text)",
  },
  catItemIcon: { fontSize: 14, lineHeight: 1, flexShrink: 0 },
  catItemName: { flex: 1, minWidth: 0 },
  catItemCount: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: 800,
    color: "var(--text-sub)",
    fontVariantNumeric: "tabular-nums",
  },

  footnote: {
    fontSize: 11.5, fontWeight: 600,
    color: "var(--text-sub)",
    textAlign: "center",
    padding: "4px 12px",
    lineHeight: 1.45,
  },
};
