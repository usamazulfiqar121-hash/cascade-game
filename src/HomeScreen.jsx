/* ═══════════ HOME SCREEN ═══════════
   Clean premium landing.
   v3: bottom navigation + custom StreakBadge. */

import { useRef, useState } from "react";
import { D, RULE_KIND_LABEL } from "./constants";
import { isTubeSolved, pickDailyTwist, dateToSeed } from "./gameLogic";
import { Haptic } from "./sound";
import BottomNav from "./components/BottomNav";
import StreakBadge from "./components/StreakBadge";
import FriendCompare from "./components/FriendCompare";
import DailyBoard from "./components/DailyBoard";
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

/* ═══════════ B10: DAILY TWIST DISCLOSURE ═══════════
   The twist row used to be a static line of text inside the daily card. It
   became a disclosure for one concrete reason: the actual rule — "1 fewer
   move for every 3 rounds you clear" — is the thing a player most needs
   before they commit an attempt, and it was being rendered at 11.5px on one
   line in the middle of a card, sharing that line with the twist's name.

   A stable id, because aria-controls has to point at the same element across
   re-renders; the panel is always mounted (see .twistPanel in globalStyles)
   so a module-level constant is the right shape here, not a useId. */
const TWIST_PANEL_ID = "dailyTwistPanel";

/* `kind` is the one piece of twist metadata that is otherwise unused. The
   collapsed row shows it as a category so the expander is offering
   something the closed state doesn't have. "Trade-off" rather than "Mixed"
   because mixed is the internal name and trade-off is what it means to the
   player — Feast & Famine gives and takes in the same breath.

   The map itself moved to constants.js as RULE_KIND_LABEL: it was duplicated
   in the Codex, and the weekly mutators need the same three-way read. */

/* Must match the expand transition in globalStyles.js (300ms, = D.tScreen).
   Duplicated rather than shared because the stylesheet is a static string
   with no access to the D tokens; the scroll-into-view below has to wait for
   the panel to finish growing, and a stale number here would either scroll
   too early (landing short of the new content) or too late (a visible hitch
   after the animation landed). */
const TWIST_EXPAND_MS = 300;

/* Reduce Motion, read the same way AchievementsScreen reads it: from the
   attribute App.jsx sets on :root, which is also what the CSS keys off, so
   the JS scroll behaviour and the CSS animation can't disagree. */
const isCalm = () =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-reduce-motion") === "1";

/* One place that turns a rule's `kind` into the colour it is drawn in.

   This existed three times on this screen already — the twist disclosure, the
   weekly card, and now the saved run's rule — which is the exact shape
   constants.js documents having already bitten the codebase once (see the note
   above RULE_KIND_LABEL, where the same map was copy-pasted into Home and the
   Codex). Three copies in one file is two more chances to add a fourth kind
   somewhere and not here.

   Deliberately NOT RULE_KIND_COLOR, which is the same three-way table and
   already resolves unknown kinds to the friendly green. The difference is
   which token each half uses: RULE_KIND_COLOR hands out the FILL tokens
   (var(--go), not var(--go-text)) because it was written for the Codex and for
   the CSS-driven badge, where the colour becomes a background. Every use here
   is type on the card's own background, which is the case the -text variants
   exist for — a fill-token green at 11px on a dark card is the legibility bug
   the split was made to avoid. So the fallback is spelled out here rather than
   inherited. */
const ruleColor = (rule) => !rule ? D.textSub
  : rule.kind === "curse" ? D.danger
  : rule.kind === "trade" || rule.kind === "mixed" ? D.goldText
  : D.goText;

export default function HomeScreen({
  onPlay, onDaily, onSettings, onAwards, onCodex,
  dailyResults, shieldedDates = [], computeStreak, dailyKey,
  hasPlayedOnce, todayRounds,
  dailyPhase = "new", resumeRound = 1, weeklyMutator,
  normalRun = null, onContinue, onNewRun,
  savedMutator = null, savedMutatorIsCurrent = true,
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
  const twistColor = ruleColor(twist);
  /* This week's, and the saved run's one on the Continue card. All three go
     through the same helper (see ruleColor) so a kind added to the mutators
     can't land in one and miss the others. */
  const weeklyColor = ruleColor(weeklyMutator);
  const savedRuleColor = ruleColor(savedMutator);

  const [twistOpen, setTwistOpen] = useState(false);
  const panelRef = useRef(null);
  const scrollTimer = useRef(null);

  const toggleTwist = () => {
    const next = !twistOpen;
    setTwistOpen(next);
    /* Haptic.light() and not a new Haptic function, for two reasons.
       First, fit: a disclosure is a small, reversible state change, and
       light() is a 14ms tick — success() would be a lie (nothing succeeded)
       and medium()/heavy() are a whole degree of feedback too much for
       "a row got taller". Second, and the reason this isn't a
       notification()-based pattern: light() routes to tick() →
       Haptics.vibrate(), which is a one-shot effect, and that is the exact
       call shape that survives Samsung. The two-entry waveform behind
       impact()/selection() is dropped without an error there (see the note
       above tick() in sound.js) — which is also why the missing
       Haptic.selection() was never worth adding back. */
    Haptic.light();
    clearTimeout(scrollTimer.current);
    /* 320x568 is the tight case the Home layout is already tuned for
       (~588px of content in a 568px viewport, so it scrolls ~20px). The
       panel adds ~135px below the fold, and "scroll down to read the rule
       you just expanded" is the failure mode the spec calls out. `nearest`
       is the right primitive: it scrolls the minimum needed and does
       nothing at all when the content already fits, so this is invisible
       on a tall phone instead of yanking the page around. */
    if (next) {
      const calm = isCalm();
      scrollTimer.current = setTimeout(() => {
        panelRef.current?.scrollIntoView({
          block: "nearest",
          behavior: calm ? "auto" : "smooth",
        });
      }, calm ? 0 : TWIST_EXPAND_MS);
    }
  };

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
  const dailyAccent = dailyPhase === "done" ? D.goText : dailyPhase === "used" ? D.textSub : D.goldText;
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

        {/* A normal run that was left part-way through. Same placement logic as
            the weekly card below — it describes the Play button's run, not the
            daily's — and it sits ABOVE that one because a run in progress is
            the more urgent of the two things it tells you.

            Gated on hasPlayedOnce for the same reason, though here it is not
            really a gate at all: `normalRun` is only ever non-null for someone
            who has already played, since it is read from a save this app wrote
            at a round boundary. The condition is there so the two cards cannot
            disagree if a save ever outlives a reinstall.

            Two buttons, because "continue this run" and "start a different
            one" are genuinely different actions that happen to start at the
            same place: onPlay is wired to resume when a save exists, so a
            player who wants a fresh round 1 needs an explicit way to say so
            rather than being stuck with the save until it happens to be
            overwritten. */}
        {hasPlayedOnce && normalRun && (
          <div
            className="fade-up"
            style={{
              ...S.dailyCard,
              animationDelay: "180ms",
              borderColor: `color-mix(in srgb, ${D.accent} 34%, transparent)`,
            }}
          >
            <div style={S.dailyHeader}>
              <span style={{ ...S.dailyLabel, color: D.accent }}>
                RUN IN PROGRESS
              </span>
              <span style={S.dailyCta}>Normal run</span>
            </div>
            <div style={S.twistHeadline}>
              <span aria-hidden="true" style={S.twistIcon}>▶</span>
              <span style={{ color: D.text, fontWeight: 800 }}>
                Round {normalRun.round}
              </span>
            </div>
            <div style={S.twistDesc}>
              Saved at the start of this round — the board is exactly as you left it.
            </div>
            {/* Only when the saved run is NOT on this week's rule. Same
                three-way colour mapping as the weekly card below, and for the
                same reason: a curse reads as a curse at a glance, without the
                player having to work out which card they are looking at. The
                "(last week)" is load-bearing rather than decorative — without
                it this reads as a second, competing "this week" rule, and the
                two cards directly above each other would appear to disagree
                about the same fact. */}
            {savedMutator && !savedMutatorIsCurrent && (
              <div style={S.savedRuleRow}>
                <span
                  aria-hidden="true"
                  style={{ ...S.twistIcon, color: savedRuleColor }}
                >
                  {savedMutator.icon}
                </span>
                <span style={{ color: savedRuleColor, fontWeight: 800, fontSize: 12 }}>
                  {savedMutator.name}
                </span>
                <span style={{ color: D.textSub, fontSize: 11, fontWeight: 600 }}>
                  {" · last week's rule, still in force for this run"}
                </span>
              </div>
            )}
            <div style={S.continueRow}>
              <button
                className="press"
                style={{ ...S.continueBtn, ...S.continuePrimary }}
                onClick={onContinue}
                aria-label={`Continue your normal run at round ${normalRun.round}`}
              >
                Continue
              </button>
              <button
                className="press"
                style={{ ...S.continueBtn, ...S.continueGhost }}
                onClick={onNewRun}
                aria-label="Discard the saved run and start a new one from round 1"
              >
                New Run
              </button>
            </div>
          </div>
        )}

        {/* This week's mutator — the rule a NEW run gets, which is what the
            Play button starts when there is nothing saved (and what "New Run"
            starts when there is). Placed directly under Play rather than beside
            the daily card because it describes that button's run, and the daily
            card is a different mode entirely; splitting the two "rule change"
            cards apart on the screen is the point.

            "THIS WEEK" and "ENDS MONDAY" are what keep it honest next to the
            Continue card above: that one names the rule a resumed run is
            actually under, which can be last week's, and the two sitting 60px
            apart would otherwise look like a contradiction rather than two
            different questions.

            Deliberately not a disclosure like the twist below. That one needed
            to be, because its description was long and had to share a line
            with the twist's name. A mutator's description is a single short
            clause that fits on its own line, so a second expander here would
            be a tap that buys one sentence.

            No countdown, unlike the daily card: "this week" is not ambiguous
            the way "today" is, and a second interval-driven ticker on a
            screen that already has one costs renders to say nothing. It
            changes on Mondays 00:00 UTC, same as the daily.

            Gated on hasPlayedOnce to match the daily card, so a first launch
            is still just the tagline and a Play button. Flip the condition if
            you'd rather sell the depth up front. */}
        {hasPlayedOnce && weeklyMutator && (
          <div
            className="fade-up"
            style={{
              ...S.dailyCard,
              animationDelay: "220ms",
              borderColor: weeklyColor,
              /* S.twistBadge paints off var(--twist-c), and a custom property
                 only inherits DOWN — the daily sets it on its own twistWrap
                 (see the note on S.twistWrap), which is a sibling subtree of
                 this card, not an ancestor. Without setting it here the badge's
                 colour and both color-mix()s resolve against nothing and it
                 renders as borderless, untextured text. */
              "--twist-c": weeklyColor,
            }}
          >
            <div style={S.dailyHeader}>
              <span style={{ ...S.dailyLabel, color: weeklyColor }}>
                THIS WEEK
              </span>
              <span style={S.dailyCta}>Normal runs</span>
            </div>
            <div style={S.twistHeadline}>
              <span aria-hidden="true" style={S.twistIcon}>{weeklyMutator.icon}</span>
              <span style={{ color: weeklyColor, fontWeight: 800 }}>{weeklyMutator.name}</span>
              <span style={{ color: D.textSub, fontSize: 11.5, fontWeight: 600 }}>
                {" · "}{RULE_KIND_LABEL[weeklyMutator.kind]}
              </span>
            </div>
            <div style={S.twistDesc}>{weeklyMutator.desc}</div>
            <div style={S.twistMeta}>
              <span style={S.twistBadge}>ENDS MONDAY</span>
              <span style={S.twistSame}>Same for everyone</span>
            </div>
          </div>
        )}

        {/* Daily card.
            A <div>, not a <button> — the whole structural cost of B10. The
            twist row inside is now a real disclosure button, and a button
            cannot legally contain another button. The play action it used to
            carry is preserved as two sibling buttons (the header block and
            the CTA) so "tap anywhere on the card" still works, nothing is
            nested, and no click can bubble into a second onDaily() — which
            would push the same history entry twice. This is the same
            constraint FriendCompare below already had to work around. */}
        {hasPlayedOnce && (
          <div
            className="fade-up"
            style={{
              ...S.dailyCard,
              animationDelay: "260ms",
              borderColor: dailySoft,
            }}
          >
            <button
              className="press dailyCardRegion"
              style={S.dailyCardRegion}
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
            </button>

            {/* Today's twist — the one interactive thing in this card that is
                NOT "play today", so it gets its own row instead of sharing
                the card's onClick. Toggle and panel are wrapped in one div so
                the card's 14px flex gap doesn't open a 28px hole between them
                while the panel is collapsed to zero height. */}
            <div style={{ ...S.twistWrap, "--twist-c": twistColor }}>
              <button
                className="press twistToggle"
                style={S.twistToggle}
                onClick={toggleTwist}
                aria-expanded={twistOpen}
                aria-controls={TWIST_PANEL_ID}
                aria-label={`Today's twist: ${twist.name}, ${RULE_KIND_LABEL[twist.kind]}. ${twistOpen ? "Hide details" : "Show details"}`}
              >
                <span aria-hidden="true" style={S.twistIcon}>{twist.icon}</span>
                <span style={S.twistText}>
                  <span style={{ color: twistColor, fontWeight: 800 }}>{twist.name}</span>
                  <span style={{ color: D.textSub }}>{" · "}{RULE_KIND_LABEL[twist.kind]}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="twistChev"
                  data-open={twistOpen ? "1" : "0"}
                  style={S.twistChevron}
                >▾</span>
              </button>

              {/* Always mounted, because collapsing is animated and an
                  animation needs its content still in the DOM to animate
                  away. .twistPanelClip flips to visibility:hidden once the
                  collapse finishes, which also takes the content out of the
                  tab order and the accessibility tree — otherwise a screen
                  reader could read text the player can no longer see. */}
              <div
                id={TWIST_PANEL_ID}
                ref={panelRef}
                className="twistPanel"
                data-open={twistOpen ? "1" : "0"}
                role="region"
                aria-label="Today's twist details"
              >
                <div className="twistPanelClip">
                  <div style={S.twistBody}>
                    <div style={S.twistHeadline}>
                      <span aria-hidden="true" style={S.twistIcon}>{twist.icon}</span>
                      <span style={{ color: twistColor }}>{twist.name}</span>
                    </div>
                    <div style={S.twistDesc}>{twist.desc}</div>
                    <div style={S.twistMeta}>
                      <span style={S.twistBadge}>TODAY ONLY</span>
                      <span style={S.twistSame}>Same for everyone</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA — the same action as the header block above, which is why
                there are two buttons for one destination. Screen-reader and
                keyboard users get two stops instead of one, which is a normal
                card pattern; the alternative was a div with an onClick and no
                role, which would leave keyboard users no way to start a run
                at all. */}
            <button
              className="press dailyCardRegion"
              /* The header block above is ~80px tall and needs no help being
                  a target; this one is a single 16px line of text, which on
                  its own would be the smallest tap target in the app. 7px
                  either side puts it at 30px, matching the twist toggle. */
              style={{ ...S.dailyCardRegion, padding: "7px 0" }}
              onClick={onDaily}
            >
              <div style={{
                ...S.dailyCta,
                color: dailyPhase === "done" ? D.go : D.textSub,
              }}>
                {dailyCtaText}
              </div>
            </button>
          </div>
        )}

        {/* Today's ghost field (see components/DailyBoard.jsx).

            This card used to exist only on the game-over screen, which made
            it useless as the thing that makes someone play: you could only
            ever see where you'd landed AFTER the day's one attempt was spent.
            The number that drives a decision — "how far is anyone getting?" —
            was only ever available after it stopped mattering.

            The variant self-selects on todayRounds. Cleared at least one round
            and there's a real position to show, so it renders like the
            game-over card (your rank, your row again if you missed the top 3).
            Cleared none and it falls back to preview: the same seeded field,
            with no "You" row, because "You · 0" against a field you haven't
            played yet is a demotivation rather than a target.

            dateToSeed() is called here rather than passed down from App, for
            the same reason pickDailyTwist() already is: it keeps the seed
            logic in one place, and this card is about TODAY's field even when
            the run that just ended belongs to yesterday (a run that crossed
            UTC midnight) — which is exactly what the game-over card wants to
            show and not what Home would. */}
        {hasPlayedOnce && (
          <div className="fade-up" style={{ width: "100%", animationDelay: "300ms" }}>
            <DailyBoard
              rounds={todayRounds}
              dateSeed={dateToSeed()}
              variant={todayRounds > 0 ? "full" : "preview"}
            />
          </div>
        )}

        {/* A sibling block, not nested in the button above — a button
            can't legally contain another button or an input, and
            FriendCompare has both. Only shown once today's run is
            over, since comparing needs a score to compare with. */}
        {hasPlayedOnce && attemptOver && (
          <div className="fade-up" style={{ width: "100%", animationDelay: "340ms" }}>
            <FriendCompare rounds={todayRounds} dateKey={dailyKey()} />
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav
        activeTab="home"
        onTabChange={() => {}}
        onAwards={onAwards}
        onCodex={onCodex}
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
    /* Top padding is 14vh, clamped to 24-96px, not a flat 24. The in-app
       toast is position:fixed at safe-area-inset-top + 20px (the toast
       block in App.jsx), so on a 320x568 screen the toast covered y 20-86
       while this stack's title block sat at y 44.8-92.8 — a ~41px overlap
       landing right on the word CASCADE. Returning-player content totalled
       ~550px in a 568px viewport, so "auto 0" only bought ~9px of headroom
       and the whole stack began ~25px from the top; there was simply no
       room left at the top for a fixed overlay to sit in. 14vh clears the
       toast on short screens and still reads as plain top padding on tall
       ones (clamped at 96px, so a 900px phone doesn't get a 126px gap).
       Known cost: total content becomes ~588px on a 320x568, so Home
       scrolls by ~20px there — absorbed by homeRoot's overflow:auto (see
       the note there on scrolling being the fallback of last resort). */
    padding: "clamp(24px, 14vh, 96px) 24px 140px",  /* extra bottom padding for nav */
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

  /* A <div> now, not a <button> — the twist disclosure inside it is a real
     button and a button can't contain a button (see the markup). The
     button-only resets that used to live here are removed rather than left
     behind as no-ops, and the tap affordance moved down to the two child
     buttons; `cursor: pointer` in particular would have put a pointer over
     the 14px gaps between them, promising a tap that does nothing. */
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
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "left",
    color: D.text,
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    margin: 0,
    transition: `border-color ${D.tQuick}`,
  },
  /* The play action, as two of these: the header block and the CTA. They
     have to be invisible so the card still reads as one surface, which means
     outline:none here — so the focus ring is drawn from
     .dailyCardRegion:focus-visible in globalStyles.js. Without it these two
     would be focusable controls a keyboard user could land on and not see,
     which is the one thing a button cannot afford. */
  dailyCardRegion: {
    display: "flex", flexDirection: "column",
    gap: 14,
    width: "100%",
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    borderRadius: 10,
    appearance: "none", WebkitAppearance: "none",
    outline: "none",
    cursor: "pointer",
    textAlign: "left",
    color: D.text,
    fontFamily: "'Inter', system-ui, sans-serif",
    WebkitTapHighlightColor: "transparent",
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

  /* One flex child holding both the toggle and the panel. It has no styles
     of its own to speak of — it exists so the card's 14px gap is applied
     once around the pair, instead of also opening up between the toggle and
     a panel that is currently 0px tall (which would leave a permanent 28px
     hole in the card). It also carries --twist-c, which has to live on this
     shared parent rather than on the toggle: a custom property only inherits
     DOWN the tree, and the panel is the toggle's sibling, so a --twist-c on
     the button would leave every colour-mix() in twistBody resolving against
     nothing. */
  twistWrap: { width: "100%" },

  /* Was S.twistRow — the same centred icon + name row, now a button, and now
     showing the twist's KIND rather than its desc. The desc is the payoff and
     it moved into the panel, so the closed row is a label, not a summary.

     The vertical padding is what makes it a target. At 11.5px this row was
     ~16px tall, under even the 24px WCAG 2.5.5 floor; 7px either side brings
     it to 30px, which clears AA. Not the 44px AAA figure, which would cost
     the collapsed card ~14px of a 320x568 budget that already scrolls ~20px
     (see homeContent). */
  twistToggle: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%",
    background: "none",
    border: "none",
    padding: "7px 8px",
    margin: "6px 0",
    borderRadius: 10,
    appearance: "none", WebkitAppearance: "none",
    outline: "none",
    cursor: "pointer",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11.5, fontWeight: 600, lineHeight: 1.35,
    textAlign: "left",
    color: D.text,
    WebkitTapHighlightColor: "transparent",
  },
  twistIcon: { fontSize: 15, lineHeight: 1, flexShrink: 0 },
  twistText: { minWidth: 0 },
  /* The 180° rotation lives in .twistChev (globalStyles.js) because it has to
     be a transition, and a transition can't be driven from an inline style
     object without re-rendering on every frame. */
  twistChevron: {
    fontSize: 13, lineHeight: 1, flexShrink: 0,
    color: D.textSub, display: "inline-block",
  },

  /* max-height is a text-scaling guard, not the normal case: the panel is
     ~135px of content, so at any default font size it never clips and never
     scrolls. It exists so that at a large accessibility font size — where the
     desc wraps to four or five lines — the panel scrolls inside itself
     instead of pushing the card off a 320x568 screen. 34vh on the smallest
     supported viewport is 193px, still above the content's natural height.
     overscroll-behavior contains that inner scroll from chaining out to the
     page behind it, which on this screen means yanking the whole Home. */
  twistBody: {
    display: "flex", flexDirection: "column", gap: 8,
    padding: "10px 12px 12px",
    marginTop: 2,
    maxHeight: "min(34vh, 200px)",
    overflowY: "auto",
    overscrollBehavior: "contain",
    borderRadius: 12,
    background: "color-mix(in srgb, var(--twist-c) 7.8%, transparent)",
    border: "1px solid color-mix(in srgb, var(--twist-c) 20%, transparent)",
  },
  twistHeadline: {
    display: "flex", alignItems: "center", gap: 7,
    fontSize: 14, fontWeight: 900, letterSpacing: "-0.01em",
  },
  /* The rule itself, and the one thing here the player actually came to read
     — which is why it is 13px and not the 11.5px it was sharing a line with
     on the collapsed row. */
  twistDesc: {
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
    color: D.text,
  },
  twistMeta: {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  /* Two claims on this badge row, and both are ones the code can keep rather
     than decoration. "TODAY ONLY" follows from pickDailyTwist being a pure
     function of the UTC day (gameLogic.js), and "Same for everyone" follows
     from the same function taking no player input — the order is drawn from
     the cycle number, so there is nothing local to differ on. The badge
     reuses twistColor, which is already the colour the twist's name is
     drawn in, so the two never disagree about what kind of day this is. */
  twistBadge: {
    fontSize: 9, fontWeight: 900, letterSpacing: "0.12em",
    padding: "3px 6px", borderRadius: 999,
    color: "var(--twist-c)",
    background: "color-mix(in srgb, var(--twist-c) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--twist-c) 26%, transparent)",
  },
  twistSame: {
    fontSize: 10.5, fontWeight: 600, color: D.textSub,
  },
  dailyCta: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11.5, fontWeight: 700,
    textAlign: "center",
    letterSpacing: "0.01em",
    transition: `color ${D.tQuick}`,
  },

  /* The Continue card's two actions, side by side.
     38px rather than the Play button's 64px: they are a secondary pair on a
     card, not the primary CTA, and the height budget on a 320x568 is already
     spoken for (see homeContent) — 38px still clears the 24px WCAG 2.5.5
     floor with room to spare.
     flex:1 with a gap rather than fixed widths, so the two stay the same size
     as the card's inner width changes (it is capped at 360px but the card has
     its own padding, and a 2x text scale narrows the usable row a lot). */
  continueRow: {
    display: "flex", gap: 8, marginTop: 10,
  },
  /* The "still on last week's rule" line. marginTop 8 rather than 0 because it
     sits under S.twistDesc's block and would otherwise read as part of the same
     sentence. flexWrap because at a large text scale the trailing clause wraps
     to a second line, and without it that second line would sit under the icon
     instead of aligning with the clause above it. */
  savedRuleRow: {
    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
    marginTop: 8,
  },
  continueBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    border: "1px solid transparent",
    appearance: "none", WebkitAppearance: "none",
    outline: "none",
    cursor: "pointer",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13, fontWeight: 800,
    letterSpacing: "0.01em",
    WebkitTapHighlightColor: "transparent",
  },
  /* Solid, because this is the action the card exists for. --twist-c is NOT
     available here (the card does not set it), so the accent is written
     literally and the two buttons can't drift from the label colour above
     them, which is the same D.accent. */
  continuePrimary: {
    background: "var(--accent)",
    color: "#fff",
    boxShadow: `0 4px 12px color-mix(in srgb, ${D.accent} 27.8%, transparent)`,
  },
  /* Outline, not a muted fill: "New Run" discards work, and it should not be
     able to read as the safe default next to the action that keeps it. */
  continueGhost: {
    background: "transparent",
    color: D.textSub,
    borderColor: D.glassBorder,
  },
};
