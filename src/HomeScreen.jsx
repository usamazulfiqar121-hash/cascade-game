/* ═══════════ HOME SCREEN ═══════════
   Clean premium landing.
   v3: bottom navigation + custom StreakBadge. */

import { D } from "./constants";
import { isTubeSolved, pickDailyTwist } from "./gameLogic";
import BottomNav from "./components/BottomNav";
import StreakBadge from "./components/StreakBadge";
import FriendCompare from "./components/FriendCompare";
import Tube from "./Tube";

/* The home screen used to be a title and a Play button on an otherwise
   empty gradient -- nothing on it said what kind of game this even is
   before you tapped in. This is a small, fixed puzzle snapshot (not live
   gameplay -- the same four tubes every launch, so it reads as a
   deliberate little illustration rather than noise that looks different
   each time) rendered with the real Tube component, so it's pixel-for-
   pixel the same glass-and-ball look the actual board uses: one tube
   already solved (the goal), one scrambled, one half-filled, one empty
   workspace tube -- readable at a glance as "sort the colors" even to
   someone who has never opened the app before. */
const HERO_TUBES = [[2, 0, 2, 0], [1, 1, 1, 1], [3, 3], []];
const HERO_SCALE = 0.8;

export default function HomeScreen({
  onPlay, onDaily, onSettings, onAwards,
  dailyResults, shieldedDates = [], computeStreak, dailyKey,
  hasPlayedOnce, achievements, ACHIEVEMENTS, todayRounds,
  dailyPhase = "new", resumeRound = 1,
}) {
  /* Two different questions, kept apart. `streakSafe`: today already counts
     for the streak (round 1 cleared) -- drives the streak badge and the week
     strip. `dailyPhase` (from App): where today's ATTEMPT stands --
       new     not started
       resume  started, still open (leaving a run keeps it; tapping resumes)
       done    over, and the streak was credited
       used    over on round 1, so the streak was NOT credited
     The card used to read "Daily Complete / Come back tomorrow" the moment
     round 1 cleared, even though tapping it dropped you back into the run,
     and stayed "Tap to play" after a round-1 loss, when tapping only showed
     a "One Attempt Used" toast. */
  const streakSafe = !!dailyResults[dailyKey()];
  const attemptOver = dailyPhase === "done" || dailyPhase === "used";
  const streak = computeStreak(dailyResults, shieldedDates);
  /* Today's rule change, shown on the card so it's part of the reason to
     open it (see DAILY_TWISTS in constants.js). */
  const twist = pickDailyTwist();
  const twistColor = twist.kind === "curse" ? D.danger : twist.kind === "mixed" ? D.gold : D.go;

  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    days.push({
      key: dailyKey(d),
      label: ["S","M","T","W","T","F","S"][d.getUTCDay()],
      done: !!dailyResults[dailyKey(d)] || shieldedDates.includes(dailyKey(d)),
      isToday: i === 0,
    });
  }

  /* Unified state color family */
  const dailyAccent = dailyPhase === "done" ? D.go : dailyPhase === "used" ? D.textSub : D.gold;
  const dailySoft =
    dailyPhase === "done"
      ? `color-mix(in srgb, ${D.go} 27.8%, transparent)`
      : dailyPhase === "used"
      ? `color-mix(in srgb, ${D.textSub} 22%, transparent)`
      : `color-mix(in srgb, ${D.gold} 22%, transparent)`;
  const dailyLabelText = {
    new: "🎯  Daily Challenge",
    resume: "▶  Daily In Progress",
    done: "✓  Daily Complete",
    used: "Daily Attempt Used",
  }[dailyPhase];
  const dailyCtaText = {
    new: "Tap to play today's puzzle",
    resume: `Tap to resume · Round ${resumeRound}`,
    done: "Come back tomorrow",
    used: "Come back tomorrow",
  }[dailyPhase];

  return (
    <div className="screen-transition" style={S.homeRoot}>
      <div style={S.homeAmbient} aria-hidden="true" />

      <div style={S.homeContent}>
        {/* Hero + tagline only show before a player's first game -- once
            hasPlayedOnce flips, the daily card below takes over that same
            vertical space, and someone who has already played doesn't need
            a "here's what this game is" pitch anymore. Keeping both gated
            the same way as the daily card also means the two blocks are
            never on screen together, so the small-screen height budget
            this content has to fit in doesn't change from before this
            hero existed. */}
        {!hasPlayedOnce && (
          /* Decorative only: aria-hidden and pointer-events: none take it
             out of the tab order and the a11y tree entirely rather than
             leaving four unlabeled, do-nothing buttons for a screen
             reader to announce. */
          <div className="fade-up" style={{ ...S.hero, animationDelay: "0ms" }} aria-hidden="true">
            {HERO_TUBES.map((balls, i) => (
              <div
                key={i}
                className="heroFloat"
                style={{ animationDelay: `${i * 340}ms`, animationDuration: `${3000 + (i % 3) * 380}ms` }}
              >
                <Tube idx={i} balls={balls} solved={isTubeSolved(balls)} scale={HERO_SCALE} />
              </div>
            ))}
          </div>
        )}

        {/* Title */}
        <div className="fade-up" style={{ ...S.titleBlock, animationDelay: "60ms" }}>
          <div style={S.title}>CASCADE</div>
          <div style={S.subtitle}>ROGUELIKE SORT</div>
        </div>

        {/* One line spelling out the actual rule the hero above only shows
            in pictures -- there's a move limit, and color is the whole
            game. Sits in what used to be dead air between the title and
            the button. */}
        {!hasPlayedOnce && (
          <div className="fade-up" style={{ ...S.tagline, animationDelay: "100ms" }}>
            Sort every color into its own tube before you run out of moves.
          </div>
        )}

        {/* Play — primary CTA */}
        <button
          className="press fade-up"
          style={{ ...S.playBtn, animationDelay: "140ms" }}
          onClick={onPlay}
        >
          <span style={S.playIcon}>▶</span>
          <span style={S.playText}>Play</span>
        </button>

        {/* Daily card */}
        {hasPlayedOnce && (
          <button
            className="press fade-up"
            style={{
              ...S.dailyCard,
              animationDelay: "220ms",
              borderColor: dailySoft,
            }}
            onClick={onDaily}
          >
            {/* Header row */}
            <div style={S.dailyHeader}>
              <span style={{ ...S.dailyLabel, color: dailyAccent }}>
                {dailyLabelText}
              </span>
              {streak > 0 && (
                <StreakBadge streak={streak} complete={streakSafe} size="md" />
              )}
            </div>

            {/* Week strip */}
            <div style={S.weekRow}>
              {days.map((d) => {
                const dotFilled = d.done;
                const dotToday = d.isToday && !d.done;
                const labelActive = d.isToday || d.done;
                return (
                  <div key={d.key} style={S.dayCol}>
                    <div style={{
                      ...S.dayLabel,
                      color: labelActive ? D.text : `color-mix(in srgb, ${D.textSub} 54.9%, transparent)`,
                    }}>{d.label}</div>
                    <div style={{
                      ...S.dayDot,
                      background: dotFilled ? D.go : "transparent",
                      borderColor: dotFilled
                        ? D.go
                        : dotToday
                        ? `color-mix(in srgb, ${D.gold} 70.2%, transparent)`
                        : D.glassBorder,
                      boxShadow: dotFilled
                        ? `0 0 10px color-mix(in srgb, ${D.go} 34.9%, transparent)`
                        : dotToday
                        ? `0 0 0 4px color-mix(in srgb, ${D.gold} 10.2%, transparent)`
                        : "none",
                    }} />
                  </div>
                );
              })}
            </div>

            {/* Today's twist */}
            <div style={S.twistRow}>
              <span aria-hidden="true">{twist.icon}</span>
              <span>
                <span style={{ color: twistColor, fontWeight: 800 }}>{twist.name}</span>
                <span style={{ color: D.textSub }}>{" \u00b7 "}{twist.desc}</span>
              </span>
            </div>

            {/* CTA */}
            <div style={{
              ...S.dailyCta,
              color: dailyPhase === "done" ? D.go : D.textSub,
            }}>
              {dailyCtaText}
            </div>
          </button>
        )}

        {/* A sibling block, not nested in the button above — a button
            can't legally contain another button or an input, and
            FriendCompare has both. Only shown once today's run is
            over, since comparing needs a score to compare with. */}
        {hasPlayedOnce && attemptOver && (
          <div className="fade-up" style={{ width: "100%", animationDelay: "260ms" }}>
            <FriendCompare rounds={todayRounds} dateKey={dailyKey()} />
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav
        activeTab="home"
        onTabChange={() => {}}
        onAwards={onAwards}
        onSettings={onSettings}
      />
    </div>
  );
}

/* ═══════════ STYLES ═══════════ */
const S = {
  homeRoot: {
    position: "fixed", inset: 0,
    display: "flex", flexDirection: "column",
    /* Top-aligned, with the content centred by its own auto margins (see
       homeContent). justify-content:center here centred the content in
       the scroll box too, which is fine while it fits -- but once it is
       taller (a returning player with the daily card and Compare Friends
       open) the overflow spills equally off the top AND the bottom, and
       the part above the top edge can never be scrolled to: the title,
       and on short screens the Play button, were unreachable. Auto
       margins centre while there is room and collapse to zero when
       there isn't, so the scroll box then starts at the title. */
    alignItems: "center", justifyContent: "flex-start",
    background: "var(--bg-0)",
    /* auto, not hidden: hero+tagline (first-time) or the daily card +
       friend-compare (returning) are sized to comfortably fit even a
       small phone in either state, verified down to a 320x568 viewport --
       but "comfortably fits everything we tested" isn't the same
       guarantee as "can never overflow" (a larger system font size, a
       split-screen window, Compare Friends expanded), and hidden would
       silently swallow the Play button itself if that ever happened.
       Scrolling is the fallback of last resort, not the plan. */
    overflow: "auto",
  },
  homeAmbient: {
    /* fixed, not absolute: the root scrolls when the content is taller than
       the screen, and an absolute layer scrolls away with it -- leaving a
       visible seam where its bottom edge ends. */
    position: "fixed", inset: 0,
    background: `
      radial-gradient(80% 50% at 50% 0%, var(--accent-soft) 0%, transparent 60%),
      radial-gradient(60% 40% at 50% 100%, var(--accent-soft) 0%, transparent 60%),
      var(--bg-grad)
    `,
    pointerEvents: "none",
  },
  homeContent: {
    position: "relative",
    display: "flex", flexDirection: "column",
    alignItems: "center",
    gap: 18,
    padding: "24px 24px 140px",  /* extra bottom padding for nav */
    width: "100%",
    maxWidth: 360,
    margin: "auto 0",  /* centres vertically while it fits; 0 when it overflows */
  },

  hero: {
    display: "flex", justifyContent: "center", alignItems: "flex-end",
    gap: 10,
    pointerEvents: "none",
    marginTop: 4,
  },

  titleBlock: { textAlign: "center", marginTop: 12, marginBottom: 4 },
  title: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 48, fontWeight: 900, lineHeight: 1,
    color: D.text, letterSpacing: "-0.045em",
  },
  subtitle: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 10, fontWeight: 800,
    color: D.textSub, letterSpacing: "0.32em",
    marginTop: 14,
  },

  tagline: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13.5, fontWeight: 600,
    color: D.textSub, textAlign: "center",
    lineHeight: 1.4, maxWidth: 280,
    marginTop: -4, marginBottom: 4,
  },

  playBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 12,
    width: "100%", height: 64,
    border: "none",
    borderRadius: 999,
    background: D.accentGrad,
    color: "#fff",
    cursor: "pointer",
    boxShadow: `0 8px 20px color-mix(in srgb, ${D.accent} 27.8%, transparent), inset 0 1px 0 rgba(255,255,255,0.18)`,
    appearance: "none", WebkitAppearance: "none",
    padding: 0, outline: "none",
    WebkitTapHighlightColor: "transparent",
  },
  playIcon: {
    fontSize: 15, lineHeight: 1,
    opacity: 0.95,
    transform: "translateX(1px)",
  },
  playText: {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 22, fontWeight: 900, lineHeight: 1,
    letterSpacing: "-0.02em",
  },

  dailyCard: {
    display: "flex", flexDirection: "column",
    gap: 14,
    width: "100%",
    background: "var(--glass)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border: `1px solid color-mix(in srgb, ${D.gold} 22%, transparent)`,
    borderRadius: 18,
    padding: "18px 20px 18px",
    cursor: "pointer",
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "left",
    color: D.text,
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    appearance: "none", WebkitAppearance: "none",
    margin: 0, outline: "none",
    WebkitTapHighlightColor: "transparent",
    transition: `border-color ${D.tQuick}`,
  },
  dailyHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dailyLabel: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11, fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    transition: `color ${D.tQuick}`,
  },

  weekRow: {
    display: "flex", justifyContent: "space-between",
    gap: 4,
  },
  dayCol: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 9,
    flex: 1,
  },
  dayLabel: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 10, fontWeight: 800,
    letterSpacing: "0.06em",
    transition: `color ${D.tQuick}`,
  },
  dayDot: {
    width: 22, height: 22, borderRadius: "50%",
    border: "1.5px solid transparent",
    transition: `background ${D.tSpring}, border-color ${D.tQuick}, box-shadow ${D.tQuick}`,
  },

  twistRow: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11.5, fontWeight: 600, lineHeight: 1.35,
    textAlign: "left",
    margin: "12px 0 10px",
  },
  dailyCta: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11.5, fontWeight: 700,
    textAlign: "center",
    letterSpacing: "0.01em",
    transition: `color ${D.tQuick}`,
  },
};
