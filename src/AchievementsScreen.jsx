/* ═══════════ PROFILE SCREEN ═══════════
   Full-page view: Best Round hero + Stats grid + Achievements list.
   iOS-style slide-in, back arrow header. */

/* D was imported here from the start and never used: every surface in this
   file is themed through var(--…) custom properties, never through the D
   token object, and an unused import in a file that is otherwise careful
   about which theme source it reads from is exactly the kind of thing that
   later gets "used" by accident and reintroduces a hardcoded-to-one-theme
   bug. */
import { ACHIEVEMENTS, STREAK_MILESTONES } from "./constants";
import { useEffect, useRef, useState } from "react";
import { useEnterShield } from "./useEnterShield";

/* Reduce Motion, read at the moment it's needed rather than from a prop.

   App.jsx sets data-reduce-motion on :root from EITHER the in-app toggle or
   the phone's own setting, and the CSS in globalStyles.js keys off that
   attribute — so this reads the same source of truth the animations do and
   can't drift from them. Reading the attribute here instead of threading a
   prop down also means an in-app toggle flip takes effect on the very next
   tap, with no re-render needed to sync it. */
const isCalm = () =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-reduce-motion") === "1";

export default function AchievementsScreen({
  achievements = [],
  stats = { gamesPlayed: 0, totalRounds: 0, totalMoves: 0, highestCombo: 0 },
  best = 0,
  streak = 0,
  bestStreak = 0,
  onClose,
  onBack,
  closing = false,
}) {
  const handleBack = onBack || onClose;
  const ready = useEnterShield();
  const count = achievements.length;
  const total = ACHIEVEMENTS.length;
  const pct = total > 0 ? (count / total) * 100 : 0;

  /* ─── B8: the early-game progress guide ───
     Three states, because the useful information is completely different in
     each and none of the other two is a degraded version of the third:

       0     — the player has no idea this screen exists as a goal. The grid
               below is 11 identical locked cards, which reads as decoration.
       1–3   — they've proved the system works. What they lack is a reason to
               open the screen again tomorrow, and the next trophy to aim at.
       4+    — the grid speaks for itself. Anything added here would be a
               card telling them something their own eyes just told them,
               which is the point at which a progress indicator stops being
               motivation and starts being friction.

     This is the Progress Principle's ordering specifically: a visible
     sub-goal that is nearly reached motivates harder than a distant one, so
     the guide is loudest at 0 and retires early rather than persisting as a
     progress bar nobody reads.

     `nextUp` is the first still-locked achievement in ACHIEVEMENTS order.
     That ordering is a guess and the honest one: nothing in the data model
     tracks per-achievement progress (see below), so there is no way to know
     which locked card the player is actually closest to. The list is
     hand-authored, so its order is the intended path through the set, and
     the first locked entry is the one the game means to suggest next.

     What this does NOT show is a number like "3/5 rounds" on that preview.
     ACHIEVEMENTS entries carry only {id, name, desc, icon} — no progress
     value is stored anywhere, and inventing one would be a plausible-looking
     lie (a static "3/5" that never moves). The bar below is the real,
     derived count/total instead, and it is kept visually attached to the
     count rather than to the preview row so it never reads as that one
     achievement's progress. */
  const locked = ACHIEVEMENTS.filter((a) => !achievements.includes(a.id));
  const nextUp = locked[0] || null;

  /* The nearest streak milestone still ahead, and how many days short of it
     the player is. These are the ONLY achievements with real, derivable
     progress: `streak` is a pure function of today's date and dailyResults
     (computeStreak), and the milestone's own threshold is its `days`. Every
     other entry would need a stored progress value that does not exist
     anywhere, which is why the bar above is a count rather than a set of
     "3/5" rows (see the note on nextUp).

     "Nearest" is the lowest still-locked threshold, which is just the first
     entry in STREAK_MILESTONES — that list is sorted ascending precisely so
     this does not have to sort anything, and so a player one day from a week
     is pointed at the WEEK and not at the century. Preferring the furthest
     milestone would make the loudest ceremony in the app the one furthest out
     of reach.

     Gated on streak > 0: with no active streak this is not "one day away", it
     is "seven days away, and you have not played at all" — which is the daily
     card's job to say, not a reason to promote an achievement here. It also
     matches StreakBadge, which Home only renders at all when streak > 0. */
  const nextStreak = streak > 0
    ? STREAK_MILESTONES.find((m) => !achievements.includes(m.id)) || null
    : null;
  const streakDaysShort = nextStreak ? Math.max(0, nextStreak.days - streak) : 0;
  /* What the NEXT UP slot shows: the streak milestone when there is one still
     ahead, else the list-order pick the slot has always shown. The fallback is
     what keeps the guide honest once all three milestones are claimed — at that
     point this screen has no streak story left to tell and must not keep
     gesturing at one. */
  const streakPick = nextStreak || nextUp;
  const showEmpty = count === 0;
  /* 1–3 was the window before a streak milestone could be reached in here at
     all, and the reasoning behind it still holds for a player with no streak
     story: the guide's job is naming the next step, and at 4+ unlocked the grid
     below already speaks for itself. But it silently covered the case the whole
     streak system was built for — a player with eight achievements and a 6-day
     streak got the bare count and bar, with the week-streak ceremony they are
     one day away from visible nowhere on the screen.

     So the window is now the earlier one OR an active, unfinished streak. Still
     bounded: a player at 4+ with no streak gets the bare card, and one who has
     claimed all three milestones loses the extension too (nextStreak is null),
     so this cannot become permanent furniture. */
  const showGuide = (count > 0 && count <= 3) || !!nextStreak;
  /* One variable for the whole block: both states render the same card, and
     the old bare progress card is suppressed for both. Leaving the old card
     up would stack its "N / 11 unlocked" + bar directly above or below a
     card saying the same number — two progress bars, same value, on one
     screen. The old card is only what remains for the 4+ case, which is
     where it's on its own and doing a real job. */
  const showGuideCard = showEmpty || showGuide;

  /* Tap the guide to find out what to do about it. The first achievement
     card is the answer to "First Steps", and it is the very next thing in
     the scroll — but "the next thing" still costs a small scroll and a
     hunting glance, so this makes the guide point at it directly. */
  const firstCardRef = useRef(null);
  const [flashFirst, setFlashFirst] = useState(false);
  const flashTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

   const revealFirst = () => {
     const el = firstCardRef.current;
     if (!el) return;
     /* Instant, not smooth, under Reduce Motion: a long animated scroll is
        exactly the kind of self-initiated movement those users are asking not
        to be subjected to, and the target is one screen-height away. */
     el.scrollIntoView({ block: "center", behavior: isCalm() ? "auto" : "smooth" });
     /* Move focus to the target so assistive tech announces and can navigate
        from it. The card already has tabIndex={-1} for programmatic focus. */
     el.focus({ preventScroll: true });
     setFlashFirst(true);
     clearTimeout(flashTimerRef.current);
     flashTimerRef.current = setTimeout(() => setFlashFirst(false), 1400);
   };

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
      aria-label="Profile"
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
      {/* Header */}
      <div style={S.header}>
        <button onClick={handleBack} className="press" style={S.backBtn} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 6L9 12L15 18" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={S.title}>Profile</div>
        <div style={{ width: 40 }} />
      </div>

      {/* Scrollable content */}
      <div style={S.scroll}>
        {/* Hero — Best Round */}
        <div style={S.hero}>
          <div style={S.heroIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.5 8.5L21 9.5L16.5 13.5L17.8 20L12 16.8L6.2 20L7.5 13.5L3 9.5L9.5 8.5L12 2Z"
                fill="var(--gold)" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={S.heroLabel}>BEST ROUND</div>
          <div style={S.heroNum}>{best}</div>
          <div style={S.heroSub}>Personal record</div>
        </div>

        {/* Streak — the daily habit's own numbers get their own row,
            not folded into STATS below, since the game already invests
            a lot elsewhere (shields, reminders, share-card callouts) in
            the daily streak specifically. */}
        <div style={S.sectionLabel}>STREAK</div>
        <div style={S.statsGrid}>
          <StatCard label="Current Streak" value={streak} />
          <StatCard label="Best Streak" value={bestStreak} />
        </div>

        {/* Stats grid */}
        <div style={S.sectionLabel}>STATS</div>
        <div style={S.statsGrid}>
          <StatCard label="Games" value={stats.gamesPlayed} />
          <StatCard label="Rounds" value={stats.totalRounds} />
          <StatCard label="Moves" value={stats.totalMoves} />
          <StatCard label="Top Combo" value={`${stats.highestCombo}×`} />
        </div>

        {/* Achievements progress — see the B8 note above. The guide card
            REPLACES the old bare progress card in the 0–3 range rather than
            stacking under it; the old card returns on its own at 4+, where
            it's the only progress display on screen. */}
        <div style={S.sectionLabel}>ACHIEVEMENTS</div>
        {showGuideCard && (
          <div style={S.guideCard}>
            {showEmpty ? (
              <>
                {/* 32px trophy at reduced opacity. The pulse is a 2.4s ease
                    in/out gold halo rather than a scale: a trophy that
                    visibly grows and shrinks is the one motion on this card
                    that would compete with the tap target below it, and
                    "this is empty" is a mood, not an event to be startled
                    by. aria-hidden — the title right under it says the same
                    thing in words. */}
                <span aria-hidden="true" className="achEmptyTrophy">🏆</span>
                <div style={S.guideTitle}>No achievements yet</div>
                <div style={S.guideSub}>
                  Clear a round to claim the first one. The rest unlock as you play.
                </div>
                <ProgressLine count={count} total={total} pct={pct} />
                <button onClick={revealFirst} className="press" style={S.guideCta}>
                  Show me First Steps
                </button>
              </>
            ) : (
              <>
                <div style={S.guideTitle}>You&apos;re doing great</div>
                <ProgressLine count={count} total={total} pct={pct} />
                {/* What fills the NEXT UP slot. A reachable streak milestone OUTRANKS the
                    list-order pick (`nextUp`, computed above), and this is the
                    one substitution in the whole guide. At a 6-day streak the
                    list order hands over "Getting Good · Reach Round 10" —
                    something the player may have no path to at all this week
                    — while the ceremony they are one day from is the loudest
                    thing the app will do for them. Pointing at the loudest
                    reachable goal is the Progress Principle's actual claim.

                    It replaces the old pick in the SAME slot rather than being
                    added beside it, so the card cannot grow a second progress
                    row saying the same kind of thing twice. And the swap only
                    ever runs one direction: a streak milestone has a real
                    progress number to show and a generic entry does not, so this
                    trades a vague "reach round 10" for a precise "1 more day",
                    never the reverse. Once all three milestones are claimed,
                    `streakPick` falls back to `nextUp` and the card reads
                    exactly as it did before any of this. */}
                {streakPick && (
                  <div style={S.nextUp}>
                    <span style={S.nextUpLabel}>NEXT UP</span>
                    <div style={S.nextUpRow}>
                      <span aria-hidden="true" style={S.nextUpIcon}>{streakPick.icon}</span>
                      <div style={S.nextUpBody}>
                        <div style={S.nextUpName}>{streakPick.name}</div>
                        <div style={S.nextUpDesc}>{streakPick.desc}</div>
                        {/* The only real progress figure in the guide, and the reason to
                            prefer this card. The zero case is a normal render,
                            not a rounding artefact: streak and the achievement
                            list are written in the same tick (App.jsx's streak
                            effect), so the card can paint once with the streak
                            already past the threshold and the unlock not yet
                            committed. "Earned" is the honest word for that
                            frame — it does, or is about to — whereas "0 more
                            days" reads as a counter that is stuck. */}
                        <div style={S.streakProgress}>
                          {streakDaysShort === 0
                            ? "Earned — tap to claim"
                            : streakDaysShort === 1
                            ? "1 more day"
                            : `${streakDaysShort} more days`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {!showGuideCard && (
          <div style={S.progressCard}>
            <div style={S.progressTop}>
              <span style={S.progressNum}>{count}</span>
              <span style={S.progressTotal}> / {total} unlocked</span>
            </div>
            <div style={S.progressBar}>
              <div style={{ ...S.progressFill, width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Achievement list */}
        <div style={S.grid}>
          {ACHIEVEMENTS.map((a, i) => {
            const unlocked = achievements.includes(a.id);
            return (
              <div
                key={a.id}
                /* Only the very first card is a flash target, and only while
                   the guide is up — a flash on any other card would point at
                   the wrong achievement. ref only on index 0. */
                ref={i === 0 ? firstCardRef : undefined}
                role="group"
                /* Unlocked vs locked was carried entirely by the gold border and
                   the ✓/🔒 glyph, so a screen reader announced both states with
                   the exact same words. State it in text. Name is left out of
                   the label on purpose: the card's own text still reads as the
                   group's contents, and repeating it would just double-speak. */
                aria-label={unlocked ? "Unlocked" : "Locked"}
                className={i === 0 && flashFirst ? "achCardFlash" : undefined}
                style={{
                  ...S.card,
                  /* These were rgba(255, 194, 75, …) — the dark theme's
                     --gold — and rgba(122, 133, 168, …) the dark theme's
                     --muted, as literals. On Light the locked/unlocked card
                     kept the dark amber wash, border and icon tile while
                     every neighbouring var(--…) sibling had already flipped.
                     Same hardcoded-to-one-theme bug already fixed in
                     icons/index.jsx. */
                  borderColor: unlocked ? "color-mix(in srgb, var(--gold) 35%, transparent)" : "var(--glass-border)",
                  background: unlocked
                    ? "linear-gradient(135deg, color-mix(in srgb, var(--gold) 8%, transparent) 0%, color-mix(in srgb, var(--gold) 2%, transparent) 100%)"
                    : "var(--glass)",
                }}>
                <div style={{
                  ...S.icon,
                  background: unlocked
                    ? "color-mix(in srgb, var(--gold) 15%, transparent)"
                    : "color-mix(in srgb, var(--muted) 8%, transparent)",
                  borderColor: unlocked ? "color-mix(in srgb, var(--gold) 35%, transparent)" : "var(--glass-border)",
                  filter: unlocked ? "none" : "grayscale(1)",
                  // Only the lock icon is dimmed. The whole card used to sit at 55% opacity, which
                  // left "how to unlock this" at ~1.6:1 contrast; the text must stay readable.
                  opacity: unlocked ? 1 : 0.6,
                }}>{unlocked ? a.icon : "🔒"}</div>
                <div style={S.body}>
                  <div style={{ ...S.name, color: unlocked ? "var(--text)" : "var(--text-sub)" }}>{a.name}</div>
                  <div style={S.desc}>{a.desc}</div>
                </div>
                {unlocked && <div style={S.check}>✓</div>}
              </div>
            );
          })}
        </div>
      </div>
      {!ready && <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 5 }} />}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={S.statCard}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

/* The count and its bar, shared by both guide states so the two can't drift
   apart — the same "N of M" sentence, the same real derived number, one
   place. `pct` is passed rather than recomputed so the bar and the number
   on screen are guaranteed to describe the same thing. */
function ProgressLine({ count, total, pct }) {
  return (
    <>
      <div style={S.progressTop}>
        <span style={S.progressNum}>{count}</span>
        <span style={S.progressTotal}> of {total} unlocked</span>
      </div>
      <div style={S.progressBar}>
        <div style={{ ...S.progressFill, width: `${pct}%` }} />
      </div>
    </>
  );
}

/* ═══════════ STYLES ═══════════ */

const S = {
  page: {
    // animation is set where this is used (the closing prop decides
    // slideInRight vs slideOutRight) rather than fixed here.
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

  /* Hero — Best Round.
     These four were literal rgba(255, 194, 75, …) — dark's --gold. On Light
     that token is darkened to #D97706 (and --gold-text to #B45309) for
     contrast against white, so a hardcoded dark gold left this panel as a
     near-invisible pale wash with a 0.25-alpha border on a white card, while
     the label right below it (heroLabel) correctly used var(--gold-text).
     Same class of bug as the rarity tiers in constants.js and the daily
     shimmer in globalStyles.js, both of which were already converted.
     The alphas stay exactly as they were; only the colour source is themed.
     --gold-soft/--gold-glow aren't used here because they sit at 0.35 —
     right for a glow, far too heavy for a large background fill. */
  hero: {
    textAlign: "center",
    padding: "24px 20px 28px",
    background: "linear-gradient(135deg, color-mix(in srgb, var(--gold) 10%, transparent) 0%, color-mix(in srgb, var(--gold) 2%, transparent) 100%)",
    border: "1px solid color-mix(in srgb, var(--gold) 25%, transparent)",
    borderRadius: 20,
    marginBottom: 24,
  },
  heroIcon: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 44, height: 44,
    borderRadius: 14,
    background: "color-mix(in srgb, var(--gold) 15%, transparent)",
    border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)",
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 10, fontWeight: 900,
    color: "var(--gold-text)",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 56, fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  heroSub: {
    fontSize: 12, fontWeight: 600,
    color: "var(--text-sub)",
    marginTop: 10,
    letterSpacing: "0.01em",
  },

  /* Section label */
  sectionLabel: {
    fontSize: 10, fontWeight: 900,
    color: "var(--text-sub)",
    letterSpacing: "0.16em",
    padding: "0 4px 10px",
    marginTop: 4,
  },

  /* Stats grid */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    padding: "16px 14px",
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    borderRadius: 14,
    textAlign: "left",
  },
  statValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 24, fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.03em",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  statLabel: {
    fontSize: 11, fontWeight: 700,
    color: "var(--text-sub)",
    marginTop: 8,
    letterSpacing: "0.02em",
  },

  /* Achievement progress */
  progressCard: {
    padding: "16px 18px",
    borderRadius: 16,
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    marginBottom: 16,
  },
  progressTop: {
    display: "flex", alignItems: "baseline", marginBottom: 12,
  },
  progressNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 28, fontWeight: 800,
    color: "var(--gold)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  progressTotal: {
    fontSize: 13, fontWeight: 600,
    color: "var(--text-sub)",
    marginLeft: 2,
  },
  progressBar: {
    height: 6,
    background: "var(--glass-border)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--gold)",
    borderRadius: 999,
    transition: "width 500ms cubic-bezier(0.16, 1, 0.3, 1)",
    boxShadow: "0 0 12px var(--gold-soft)",
  },

  /* Achievement grid */
  grid: {
    display: "flex", flexDirection: "column",
    gap: 10,
  },

  /* ─── B8: the early-game guide card ───
     Replaces progressCard's job for 0–3 unlocked, so it is deliberately a
     card of similar weight rather than a taller block sitting on top of
     something else. marginBottom matches progressCard's 16px so the gap
     down to the grid is identical in all three states — the transition into
     and out of the guide range shouldn't shift the grid. */
  guideCard: {
    padding: "18px",
    borderRadius: 16,
    background: "var(--glass)",
    border: "1px solid var(--glass-border)",
    marginBottom: 16,
    textAlign: "center",
  },
  guideTitle: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 16, fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.02em",
    lineHeight: 1.25,
    marginBottom: 6,
  },
  guideSub: {
    fontSize: 12.5, fontWeight: 600,
    color: "var(--text-sub)",
    lineHeight: 1.45,
    maxWidth: 260,
    margin: "0 auto 16px",
  },
  /* Text button, not a filled CTA. The screen is informational and the grid
     right below is the real content — a full-width gold button here would
     out-shout the achievements it is introducing. It carries the only
     affordance on the card, so it needs to be findable, and a gold text +
     underline weight gets that without a fill. */
  guideCta: {
    display: "inline-block",
    marginTop: 16,
    padding: "9px 16px",
    background: "transparent",
    border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
    borderRadius: 999,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 12.5, fontWeight: 800,
    color: "var(--gold-text)",
    cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },

  /* "Next up" preview. Left-aligned inside a centred card, because it holds
     an icon beside two lines of text — centering that group reads as ragged
     and makes the two text lines start at different x positions. */
  nextUp: {
    marginTop: 18,
    paddingTop: 14,
    borderTop: "1px solid var(--glass-border)",
    textAlign: "left",
  },
  nextUpLabel: {
    display: "block",
    fontSize: 9.5, fontWeight: 900,
    color: "var(--gold-text)",
    letterSpacing: "0.16em",
    marginBottom: 10,
  },
  nextUpRow: {
    display: "flex", alignItems: "center", gap: 12,
  },
  nextUpIcon: {
    width: 34, height: 34,
    borderRadius: 11,
    border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)",
    background: "color-mix(in srgb, var(--gold) 10%, transparent)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16,
    flexShrink: 0,
  },
  nextUpBody: { flex: 1, minWidth: 0 },
  nextUpName: {
    fontSize: 13, fontWeight: 800,
    color: "var(--text)",
    letterSpacing: "-0.01em", lineHeight: 1.2,
  },
  nextUpDesc: {
    fontSize: 11, fontWeight: 600,
    color: "var(--text-sub)",
    marginTop: 2, lineHeight: 1.35,
  },
  /* The one real progress figure in the whole guide, and the reason the streak
     milestone is allowed to outrank the list-order pick (see the NEXT UP
     block). Gold, not --text-sub: this is the number the card exists to
     deliver, and the description right above it is supporting text. --gold-text
     rather than --gold because at 11px this has to clear contrast on both
     themes, which is the same split every other label on this file uses. */
  streakProgress: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: 800,
    color: "var(--gold-text)",
    marginTop: 4, lineHeight: 1.3,
    letterSpacing: "-0.01em",
  },

  card: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px solid var(--glass-border)",
    transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
  icon: {
    width: 44, height: 44,
    borderRadius: 13,
    border: "1.5px solid",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 14.5, fontWeight: 800,
    letterSpacing: "-0.01em", lineHeight: 1.2,
  },
  desc: {
    fontSize: 11.5, fontWeight: 600,
    color: "var(--text-sub)",
    marginTop: 3, lineHeight: 1.35,
  },
  check: {
    fontSize: 16, color: "var(--gold)",
    fontWeight: 900,
    flexShrink: 0,
  },
};
