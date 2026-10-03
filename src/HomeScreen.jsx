/* ═══════════ HOME SCREEN ═══════════
   Clean premium landing.
   v4: one honest target number, one Continue button, two small mode
   buttons. The daily card's twist disclosure, the week strip, the
   separate Continue card and the "This Week" card are all gone from here
   — see each site below for where its information went instead. */

import { D } from "./constants";
import { isTubeSolved, dateToSeed } from "./gameLogic";
import BottomNav from "./components/BottomNav";
import StreakBadge from "./components/StreakBadge";
import FriendCompare from "./components/FriendCompare";
import TodayGoal from "./components/TodayGoal";
import Tube from "./Tube";

/* The home screen used to be a title and a Play button on an otherwise
   empty gradient -- nothing on it said what kind of game this even is
   before you tapped in.

   It then carried FOUR tubes, and that was one too many. At 0.8 scale the
   row read as a small board rather than as a picture of one move, and it
   was the single widest thing on the screen — wider than the Play button
   — so it was the first thing that broke when a system font scaled up.
   One tube at 0.6 of the old size (0.8 -> 0.48) says the same thing: two
   colours out of order in a glass tube, which is the whole game in one
   object, and it now sits inside the width of the button below it.

   Still decorative only (the wrapper is aria-hidden + pointer-events:
   none), still a fixed snapshot rather than live gameplay, and still drawn
   with the real Tube component so it is pixel-for-pixel the same
   glass-and-ball look the actual board uses. */
const HERO_TUBES = [[1, 0, 1, 0]];
const HERO_SCALE = 0.48;

/* The daily twist's disclosure (B10) used to live here, in the middle of
   the daily card: a toggle that expanded a panel with the rule's full
   text. The daily card is now a single small button, so that disclosure
   has no home on this screen — and it does not need one, because the
   twist is now stated where the player actually has to obey it. App.jsx
   draws a tappable modifier badge under the round label in the game HUD
   (normal mode gets the weekly mutator, the daily gets its own twist),
   which is a disclosure the player opens while standing on the board the
   rule applies to. The same words are still in the Codex, which is where
   a player goes to browse all seven on purpose.

   What was dropped with it, and why it is not lost:
     - TWIST_PANEL_ID / TWIST_EXPAND_MS / isCalm: three module constants
       and one helper whose only consumer was that panel.
     - RULE_KIND_LABEL's import and its comment: the label is still
       exported by constants.js and still rendered by the Codex, but this
       file no longer names a rule anywhere, so it has no reason to hold
       the mapping. ruleColor below survives for the one place Home still
       draws a rule.

   .twistPanel / .twistToggle / .twistChev classes in globalStyles.js are
   now unreferenced from React and can be dropped from there too (left in
   place here rather than edited, to keep this change to one file). */

/* One place that turns a rule's `kind` into the colour it is drawn in.

   Now that Home draws exactly one rule — the saved run's, on the line
   under the Continue button — this is called once, and the three-copies
   problem the note above used to describe is gone by construction. Kept
   as a function rather than inlined at that one site because the mapping
   still has to agree with RULE_KIND_COLOR in constants.js and with the
   HUD badge in App.jsx, and a named helper is the cheapest way to keep
   that agreement visible.

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
  onPlay, onDaily, onSettings, onAwards,
  dailyResults, shieldedDates = [], computeStreak, dailyKey,
  hasPlayedOnce, todayRounds,
  dailyPhase = "new", resumeRound = 1,
  normalRun = null, onNewRun,
  savedMutator = null, savedMutatorIsCurrent = true,
  /* Score attack. onScore is required to start a run, so it has no default;
     the two data props do, because this screen is also what an install with no
     score run on disk has to render, and a bare `undefined` there would have
     thrown in the toLocaleString below on the very first launch.

     `scoreRuns` is no longer read here: the card that listed the top run is
     gone, and the full list still lives on the run-over card. App.jsx keeps
     passing it, which React ignores — but nothing on this screen should
     pretend to know a run list it no longer shows. */
  onScore, scoreBest = 0, scoreTries = 0,
}) {
  /* Two different questions, kept apart. `streakSafe`: today already counts
     for the streak — drives the streak badge in the top-right corner.
     `dailyPhase` (from App): where today's ATTEMPT stands —
       new     not started
       resume  started, still open (leaving a run keeps it; tapping resumes)
       done    over, and the streak was credited
       used    over on round 1, so the streak was NOT credited
     The daily button reads these four states from one map below, so the
     line under "Daily" always names the actual state of the attempt rather
     than a generic "tap to play" that was wrong in two of the four. */
  const streakSafe = !!dailyResults[dailyKey()];
  const attemptOver = dailyPhase === "done" || dailyPhase === "used";
  const streak = computeStreak(dailyResults, shieldedDates);
  /* The only rule Home still draws: the one the CONTINUED run is actually
     under, which is not necessarily this week's (a run left on Sunday and
     reopened on Monday keeps last week's rule). Through the same helper the
     Codex and the new HUD badge use, so a kind added to the mutators can't
     land in one and miss the others. */
  const savedRuleColor = ruleColor(savedMutator);
  /* The saved run's own need, for the line under the Continue button.

     Read off the saved level rather than recomputed, because recomputing it
     here would mean running moveBudget a fourth time and — worse — trusting
     that this render's round/carries match what the save was written with.
     The save already carries the exact level the player will resume onto
     (loadNormalRun validates it and defaults par/playPar against each
     other), so this is the number the board will actually show. playPar
     first, because that is the need of the board as played — the same
     precedence needOf() uses in App.jsx, and the same one the HUD's "NEED"
     line prints, so the two can't disagree. */
  const savedNeed = (() => {
    const lv = normalRun && normalRun.level;
    if (!lv) return null;
    const v = Number.isFinite(lv.playPar) ? lv.playPar
      : Number.isFinite(lv.par) ? lv.par
      : null;
    return v !== null && v > 0 ? Math.round(v) : null;
  })();

  /* Unified state color family — the daily button's accent and border. */
  const dailyAccent = dailyPhase === "done" ? D.goText : dailyPhase === "used" ? D.textSub : D.goldText;
  const dailySoft =
    dailyPhase === "done"
      ? `color-mix(in srgb, ${D.go} 27.8%, transparent)`
      : dailyPhase === "used"
      ? `color-mix(in srgb, ${D.textSub} 22%, transparent)`
      : `color-mix(in srgb, ${D.gold} 22%, transparent)`;
  /* The daily button's second line: what the attempt's state actually is.
     "resume" names the round because that is the one state where a number
     is the useful fact — it tells the player they are picking up a run in
     progress rather than starting over, without opening anything. "done"
     and "used" both read as finished, but for different reasons, and the
     difference is the badge's colour and the streak, not this line: a
     player who lost on round 1 has still spent the attempt, and saying
     "come back tomorrow" to them was the old bug this map exists to fix. */
  const dailyCtaText = {
    new: "Tap to play",
    resume: `Resume R${resumeRound}`,
    done: "Complete",
    used: "Complete",
  }[dailyPhase];
  /* Same shape for score attack. "Not attempted" only when nothing has ever
     been tried — after a run that scored nothing it says so, because
     "Not attempted" next to a finished run would be a lie about the
     history. The full best-runs list stays on the run-over card, where
     there is room for it. */
  const scoreCtaText = scoreBest > 0
    ? `Best ${scoreBest.toLocaleString("en-US")}`
    : scoreTries > 0 ? "No score yet" : "Not attempted";

  return (
    <div className="screen-transition" style={S.homeRoot}>
      <div style={S.homeAmbient} aria-hidden="true" />

      {/* Streak — top-right corner, absolutely positioned against homeRoot
          rather than sitting in the content column.

          It used to live inside the daily card's header, which meant three
          things were true at once and all three were wrong: it was only on
          screen for a player who had already played AND whose streak was
          live (so the one number the game most wants visible was the one
          most often missing), it moved down the card as the card grew, and
          it disappeared along with the card whenever that card was hidden.
          Cornered, it is present whenever streak > 0 regardless of what the
          rest of the screen is showing, and it costs no vertical space at
          all — which matters because this screen is tuned to a 320x568.

          Gated on streak > 0 exactly as before: a streak of zero is not a
          motivation, it is a count of nothing, and the "play the daily to
          start one" job belongs to the daily button below. */}
      {streak > 0 && (
        <div style={S.streakSlot}>
          <StreakBadge streak={streak} complete={streakSafe} size="md" />
        </div>
      )}

      <div style={S.homeContent}>
        {/* Hero + tagline only show before a player's first game — once
            hasPlayedOnce flips, someone who has already played doesn't need
            a "here's what this game is" pitch, and that vertical space goes
            to the mode buttons and today's goal instead. Both blocks are
            gated on the same flag, so they are never on screen together. */}
        {!hasPlayedOnce && (
          /* Decorative only: aria-hidden and pointer-events: none take it
             out of the tab order and the a11y tree entirely rather than
             leaving an unlabeled, do-nothing button for a screen reader to
             announce. */
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

        {/* Play / Continue — the primary CTA, and the only place a normal
            run is started or resumed.

            These were two separate things: a full-width Play button, and a
            card below it offering "Continue" plus a "New Run" that throws
            the save away. But onPlay was ALREADY wired to resume when a save
            exists (see App.jsx), so the card's Continue button and the Play
            button did the same thing in two places, and the screen spent
            ~150px of its 320x568 budget saying it twice.

            Now one button, one action, and it names itself honestly: "Play"
            with nothing saved, "Continue" with a run on disk. The label
            changing is the whole point — a player who left a run at round 16
            should not have to read a card to know the button will pick it
            up.

            The line underneath carries what the card used to say: which
            round, and how many moves that round needs. Both come off the
            saved level, so they are the same numbers the board will show on
            resume rather than a re-derivation that could drift. Nothing is
            rendered when there is no save, so the first-run screen is
            exactly as quiet as it was. */}
        <button
          className="press fade-up"
          style={{ ...S.playBtn, animationDelay: "140ms" }}
          onClick={onPlay}
          aria-label={normalRun
            ? `Continue your normal run at round ${normalRun.round}`
            : "Play — start a new run"}
        >
          <span style={S.playIcon}>▶</span>
          <span style={S.playText}>{normalRun ? "Continue" : "Play"}</span>
        </button>

        {normalRun && (
          <div className="fade-up" style={{ ...S.continueNote, animationDelay: "160ms" }}>
            <span style={S.continueNoteMain}>Round {normalRun.round}</span>
            {savedNeed !== null && (
              <span style={S.continueNoteSub}>{" · "}Need {savedNeed}</span>
            )}
            {/* The saved run's rule, and the only place Home still draws one.
                Kept because losing it would be a real regression, not just
                a missing nicety: without it, a run left on Sunday and
                reopened on Monday silently plays under last week's rule and
                nothing on this screen says so — the one fact about their own
                run a player cannot check for themselves. */}
            {savedMutator && !savedMutatorIsCurrent && (
              <span style={{ ...S.continueNoteSub, color: savedRuleColor }}>
                {" · "}{savedMutator.name} · last week&apos;s rule
              </span>
            )}
            {/* New Run, kept from the card this replaced. Not decoration: Play
                resumes the save (App.jsx wires onPlay to startNewGame(false),
                which adopts a save when one exists), so without this a player
                who wants to abandon round 16 has no way to say so and is stuck
                with the save until it happens to be overwritten by losing. It
                is a text link rather than a second button because it is the
                destructive option and must not read as the default — the same
                reason the old card drew it as an outline next to a solid
                Continue. Sits on this row instead of taking a row of its own,
                which is the vertical budget the merge was for. */}
            <button
              className="press"
              style={S.newRunLink}
              onClick={onNewRun}
              aria-label="Discard the saved run and start a new one from round 1"
            >
              New Run
            </button>
          </div>
        )}

        {/* Score attack and Daily, side by side as two small buttons.

            These were two of the biggest things on the screen — a full
            Score Attack card with its own headline, rules paragraph, best-run
            row and a "Start Run" button, and above it a "This Week" card, and
            below it the Daily card with a week strip, a twist disclosure and
            its own CTA. Together that was the reason this screen scrolled.

            Neither mode is the urgent thing on this screen. The urgent thing
            is the run in progress, which is now the Continue button above, and
            both of these always start fresh and can never be resumed — so
            neither can ever be the answer to "what was I doing". Given that,
            each is a target the player either has or hasn't beaten, which is
            one line of text, not a card.

            What was dropped, and whether it was lost:
              - Score's rules paragraph ("No undo, no hints. A run counts once
                you clear a round.") — a player who hasn't played Score Attack
                yet no longer learns those two rules before committing. The
                run-over card still states them after the fact, and the Codex
                covers them. Acceptable, but it is a real cost: this was the
                only pre-commit explanation of the mode's rules.
              - Score's top-run row — the record is still on the button, and
                the full list of runs is still on the run-over card.
              - "This Week" — deliberately, as specified. The weekly mutator
                now shows as a tappable badge under the round label in the
                game HUD (App.jsx), i.e. on the board it actually affects,
                instead of on a Home card describing a run you may not start.
                Home keeps only the "last week's rule" note for a saved run,
                which is the case where acting on the wrong assumption would
                cost the player something.
              - The daily's week strip — the seven dots. This is the one I
                would flag hardest: it was the only at-a-glance view of which
                of the last seven days had been played, and the Profile screen
                does not replace it. A player can no longer see a broken
                streak forming without opening the daily each day.
              - The daily's twist disclosure — now the HUD badge, which is
                strictly better placed (you read it while standing on the
                board the rule applies to), and still in the Codex. */}
        {hasPlayedOnce && (
          <div className="fade-up" style={{ ...S.modeRow, animationDelay: "200ms" }}>
            <button
              className="press"
              style={{ ...S.modeBtn, borderColor: `color-mix(in srgb, ${D.gold} 34%, transparent)` }}
              onClick={onScore}
              aria-label="Start a score attack run"
            >
              <span style={S.modeBtnTop}>
                <span aria-hidden="true">🏆</span> Score
              </span>
              <span style={S.modeBtnSub}>{scoreCtaText}</span>
            </button>
            <button
              className="press"
              style={{ ...S.modeBtn, borderColor: dailySoft }}
              onClick={onDaily}
              aria-label={dailyPhase === "new"
                ? "Play today's daily challenge"
                : dailyPhase === "resume"
                ? `Resume today's daily challenge at round ${resumeRound}`
                : "Today's daily challenge is already finished"}
            >
              <span style={{ ...S.modeBtnTop, color: dailyAccent }}>
                <span aria-hidden="true">🎯</span> Daily
              </span>
              <span style={S.modeBtnSub}>{dailyCtaText}</span>
            </button>
          </div>
        )}

        {/* Today's goal (see components/TodayGoal.jsx) — one number for the
            day, derived from the same date seed the puzzle uses.

            Replaces the ghost-field card, which drew an invented 24-name
            simulated leaderboard with ranks and a "Top 12% today" headline.
            The whole point of this card is a number the player can believe:
            an invented field made it a number nobody could check, sitting on
            the one screen whose subject is a score that has to be honest.

            dateToSeed() with no argument, so it is always TODAY's goal — even
            when the run that just ended belongs to yesterday (a run that
            crossed UTC midnight), which is exactly what the game-over card
            wants to show and what Home would get wrong if it followed the
            stale run. */}
        {hasPlayedOnce && (
          <div className="fade-up" style={{ width: "100%", animationDelay: "240ms" }}>
            {/* marginBottom:0 — the component's own 12px is for the
                game-over column, where blocks sit flush against each other.
                Here homeContent's 18px gap already does that job, and both
                together would open a 30px hole under the card. */}
            <TodayGoal rounds={todayRounds} dateSeed={dateToSeed()} style={{ marginBottom: 0 }} />
          </div>
        )}

        {/* A sibling block, not nested in anything above — a button can't
            legally contain another button or an input, and FriendCompare has
            both. Only shown once today's run is over, since comparing needs a
            score to compare with. */}
        {hasPlayedOnce && attemptOver && (
          <div className="fade-up" style={{ width: "100%", animationDelay: "280ms" }}>
            <FriendCompare rounds={todayRounds} dateKey={dailyKey()} />
          </div>
        )}
      </div>

      {/* Bottom navigation — Home, Profile, Settings. Codex is no longer a tab
          (see BottomNav.jsx); its entry point now lives inside Profile, so this
          bar's onCodex went with it. */}
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

  /* Streak slot: a fixed-size box in the top-right of the header, holding
     StreakBadge or nothing.

     The size is the point. StreakBadge draws its own pill and reserves no
     space, so a header that merely right-aligns it shifts about 90px to the
     left whenever streak hits 0. The word CASCADE then visibly jumps on first
     launch, and again the day after a streak dies. Pinning the slot to the
     badge's natural size makes the layout identical on both sides of that
     transition, so what the player sees change is the badge appearing, not
     the title moving.

     64x40 is the smallest box that holds the badge without clipping its glow
     at 8px of padding on each side. */
  streakSlot: {
    position: "absolute",
    top: 0, right: 0,
    width: 64, height: 40,
    display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none",
  },

  /* The saved-run line: "Round 16 · Need 18" plus New Run.
     This replaced a whole ~200px card, so it has to carry a fact AND an action
     inside ~20px of height. One row, wrap allowed, marginLeft:auto on the
     action so it goes to the far end when there is room and drops to its own
     line when there isn't — at a 2x font scale on a 320px screen the text is
     genuinely wider than the row, and a nowrap would have pushed the action
     off the right edge entirely. */
  continueNote: {
    display: "flex", alignItems: "center", flexWrap: "wrap",
    columnGap: 6, rowGap: 4,
    width: "100%",
    marginTop: -6,
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "center",
  },
  continueNoteMain: {
    fontSize: 12, fontWeight: 800, color: D.text,
  },
  continueNoteSub: {
    fontSize: 11.5, fontWeight: 600, color: D.textSub,
  },
  /* A text link, not a button. It discards a run — it should be the least
     visually available thing in this stack, and putting a filled control on
     this row would have made "throw away round 16" compete with the fact that
     a round 16 exists. 30px tall so it still clears the 24px tap floor even
     though the glyphs are 11px. */
  newRunLink: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    padding: "0 2px",
    minHeight: 30,
    display: "inline-flex", alignItems: "center",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11, fontWeight: 700,
    color: D.textSub,
    textDecoration: "underline",
    textUnderlineOffset: 3,
    cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
  },

  /* Score + Daily as two small buttons on one row.
     gap:10 and flex:1 rather than fixed widths, so they stay equal as the
     screen width changes (the stack is capped at 360px, and a 2x text scale
     narrows the usable row a lot). 58px, not the card's old ~200px: these two
     are never the urgent thing on this screen — the run in progress above is
     — and neither can be resumed, so one is never the answer to "what was I
     doing".

     minHeight rather than height, so at a large accessibility font scale the
     sub-line wraps and the button grows instead of clipping its own text. */
  modeRow: {
    display: "flex", gap: 10, width: "100%",
  },
  modeBtn: {
    flex: 1,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 4,
    minHeight: 58,
    padding: "8px 10px",
    borderRadius: 14,
    background: "var(--glass)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border: "1px solid transparent",
    boxShadow: "0 4px 18px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    outline: "none",
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "center",
    WebkitTapHighlightColor: "transparent",
  },
  modeBtnTop: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 13, fontWeight: 900, color: D.text,
    letterSpacing: "0.01em",
    lineHeight: 1.1,
  },
  /* The status line, and the reason this is a button and not a label: it is
     what changes (Best 12,340 / Done today / New / Resume round 3), so the
     player can see whether a mode is still open before spending a tap on it. */
  modeBtnSub: {
    fontSize: 10.5, fontWeight: 700, color: D.textSub,
    lineHeight: 1.2,
  },
};
