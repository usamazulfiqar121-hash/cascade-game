# AUDIT_v2 — PHASE 2

Read pass over the eight files Phase 1 did not open, plus the fixes that pass produced.
**Source files WERE modified** — see `## Fixes applied` for the exact list and which are verified.

## Status: COMPLETE — 8 of 8 files read

`src/CodexScreen.jsx` was then opened separately — it is not one of the eight, and it was read
because V-03's player-facing fix had nowhere else to go. It produced one edit and one new finding.

| File | Lines | State |
|---|---|---|
| `src/constants.js` | 501 | ✅ read in full, traced, 4 edits |
| `src/Tube.jsx` | 340 | ✅ read in full, traced, 4 edits |
| `src/HomeScreen.jsx` | 704 | ✅ read in full, traced, 1 edit |
| `src/globalStyles.js` | 1066 | ✅ read in full, V-09 answered |
| `src/theme.js` | 160 | ✅ read in full, traced, 0 edits |
| `src/index.css` | 25 | ✅ read in full, 0 edits |
| `src/components/TodayGoal.jsx` | 107 | ✅ read in full, traced, 0 edits |
| `src/components/BottomNav.jsx` | 169 | ✅ read in full, traced, 0 edits |
| `src/CodexScreen.jsx` | 488 | ✅ read in full — opened for V-03, 1 edit, 1 new finding |

**Everything below is `SOURCE`. Nothing was built, linted, profiled or played** — the shell has been
dead for every batch (see `AUDIT_v1.md` PRE-CHECK). No timing claim in this file is a measurement.

---

## Fixes applied

Thirteen edits across six source files, plus one in `AGENTS.md`. **None is build-verified.**

| # | File | Change | Verified? |
|---|---|---|---|
| V-01 | `constants.js` | Warm Start copy → `"One extra colour starts already sorted, every round"` / `"free sorted colour"`, matching the code | source only |
| V-02 | `constants.js` | two stale `m8`-as-"+8" comments corrected | source only |
| V-03 | `constants.js` | `LUCK_CAP` behaviour documented next to the card | source only |
| V-03 | `CodexScreen.jsx` | **new `LUCKY` row in "How moves work"** — the player-facing half, cap interpolated from `LUCK_CAP` | source only |
| V-04 | `constants.js` | `COLORS` length-8 rationale documented next to the array | source only |
| V-06 | `Tube.jsx` | `aria-label` now carries tube number, ball count and visible 1-based colour numbers | source only |
| V-07 | `Tube.jsx` | `ballBackground` guard: `COLORS[colorIdx] \|\| "#888888"` | source only |
| V-08 | `Tube.jsx` | `Ball`'s `<div>` → `<span>` + `BALL_STYLE_BASE.display = "block"` | source only |
| V-10 | `Tube.jsx` | `fitTubeScale` clamps to `Math.max(base, MIN_FIT_SCALE)` | source only |
| V-11 | `HomeScreen.jsx` | hero wrapper gains `inert` (line 241) | source only |
| V-12 | `globalStyles.js` | `.glass-standard` / `.glass-elevated` now use `var(--glass)` / `var(--glass-elevated)` | source only |
| A-02 | `App.jsx` | removed 6 dead imports incl. `MAX_HEIGHT` and `MOVE_ECONOMY` | source only |
| — | `AGENTS.md` | stale "daily Lucky Day ≤50%" corrected to the shared 40% | — |

---

## The one that matters most: Warm Start is not what it says it is

**`constants.js:454` vs `gameLogic.js:1023-1026` — MED, affects daily balance. TEXT FIXED, CODE UNTOUCHED.**

```js
// constants.js:454 — the twist as the player used to read it
{ id: "warm", name: "Warm Start", …, desc: "One colour starts already sorted", short: "free colour on R1" }

// gameLogic.js:1023 — what actually happens
const autoSortCount = Math.min(BOARD_CARD_CAP, runUpgrades.filter((id) => id === "auto").length)
  + (twistId === "warm" ? 1 : 0)
  + (m && m.autoSortDelta ? m.autoSortDelta(round) : 0);
```

There is no round condition. `+ (twistId === "warm" ? 1 : 0)` applies on **every single round of the
run**, not round 1. The old `short` said `free colour on R1` in as many words, and `desc` — "One colour
**starts** already sorted" — read as a one-time opening gift.

**Why the magnitude matters:** the code's own comment on the line above (`gameLogic.js:1027-1028`)
says an Auto-Sort "saves ~4 moves on average". So Warm Start is worth roughly **+4 moves per round,
forever**, not +4 once. That is a Legendary-tier effect on a *blessing* that reads as a warm-up. It
also stacks past the cap the cards respect: `Math.min(BOARD_CARD_CAP, …)` wraps only the Auto-Sort
*card* count, so two Auto-Sorts plus Warm Start is three free sorts a round.

**What was done, and why only that.** Both card strings now describe the every-round behaviour. The
**code was deliberately left alone.** `constants.js:433-436` records that this file's author *did* run
a player model over the twists, and the numbers there (an extra empty tube moved a run from ~9 rounds
to ~40) show these were tuned with evidence rather than guessed. Warm Start being strong may well be
intended and already-priced. Narrowing it is a balance change, and every balance change here is gated
on the C-7 measurement from Batch 2 — which has still not been run.

**Open:** if the owner decides the *code* is wrong rather than the text, that is a Batch-2-sized change
and needs the `[C7]` numbers first. It also needs a decision on the daily, since a daily run's
Warm Start must stay identical for two players with the same upgrades.

### V-01 — Warm Start's scope contradicted its own card text — **MED — text fixed**

Covered above. `short: "free colour on R1"` vs an every-round `+ 1`.

---

## Findings — `src/constants.js`

### V-02 — two comments reason about a card value that no longer exists — **LOW — fixed**

The retune that moved the tempo cards left the *justification* behind. `UPGRADES` now ships:

| id | name | value | rarity |
|---|---|---|---|
| `m8` | **+4 Moves** | 4 | 3 |
| `start` | Head Start | 6 | 4 |
| `dawn` | Dawn Bonus (`retired`) | 6 | 3 |

- **`constants.js:232-235`** — *"`start` was 10 — only +2 over Rare's m8 (8)"*. The `+2` margin still
  holds (6 over 4), but the parenthetical **`(8)` was stale**: `m8` is `+4 Moves` now. The ids kept
  their old names (`constants.js:249-250` says exactly this) and the numbers moved, so "m8" reads as
  "+8" to anyone who skims.
- **`constants.js:284-287`** — *"Dawn Bonus: +6 moves for Rare was strictly worse than +8 Moves at the
  same rarity"*. **The rationale was inverted.** Back when it was written, `m8` really was +8, so
  +6 < +8 and retiring Dawn was correct. Today `m8` is +4, so Dawn's +6 is *strictly better* than the
  Rare move card — the exact reason it was retired no longer exists.

  This one was not cosmetic. Dawn is kept in the array with `retired: true` so old saves resolve, and
  `pickDailyUpgrades` skips retired cards. The day someone re-enables it — or audits whether it
  should stay retired — the comment actively argued the wrong way. **Both comments corrected.** Note
  the underlying question ("should Dawn stay retired?") is still unanswered; only the misleading
  argument for it was removed.

### V-03 — the luck cards' own text doesn't add up when both are held — **LOW — FIXED**

`constants.js:256-257` — Lucky Drop "20% chance per pour", Super Lucky "25% chance per pour".
`getLuckyChance` sums them and clamps at `LUCK_CAP = 0.4`. Two cards is `0.45` clamped to `0.40`, so a
player holding both is refunded at 40% while their two cards' descriptions read 20% and 25%.

The direction is right and the gap is small, so this is not a trap — but it is the same class of thing
A-04 was: **the number the player is shown and the number the code uses are different.**

**The card texts were left alone, deliberately.** They are not wrong. "20%" is exactly true for a
player holding Lucky Drop alone; "25%" is exactly true for Super Lucky alone. Only the *pair* differs,
and for that case the true rate is neither 20 nor 25 — so there is no per-card wording that is both
accurate and short. Putting "capped at 40%" on either card would make a correct statement misleading
in the single-card case, which is the case almost every player is actually in.

**So it went where V-03 itself suggested as the alternative: the Codex.** A new eighth row in "How
moves work" (`CodexScreen.jsx:53`) named **LUCKY**, stating that the two cards each give their own
chance per pour but are capped in total, and that holding both therefore does not stack to the sum —
"the one rule in the game that a player cannot read off the cards they are holding."

Three deliberate choices in that row:
- The cap is interpolated (`${Math.round(LUCK_CAP * 100)}%`), not written as `40%`, matching the
  file's existing "numbers come from MOVE_ECONOMY so this cannot drift from the code" rule.
- The two card rates (20% / 25%) are **not** restated. They live in the cards' own `desc` strings;
  a second prose copy is a second thing to forget when the cards are retuned.
- It sits at the end rather than inside the NEED/CARDS/EXTRA/LOST ladder. It is a per-pour refund,
  not a term that decides a round's budget, so folding it in would misrepresent what the ladder is.

A source comment on the cards was added earlier in this pass as well, so the next reader of
`constants.js` does not have to rediscover the clamp.

### V-04 — `COLORS[7]` can never be a tube colour — **LOW / cosmetic — documented, no change**

`COLORS` has 8 entries. `colorCount` is capped at 7 (`gameLogic.js:986`, and `rainbow`/Deep Cuts clamp
to `[2, 7]`), so tube colours only ever use indices 0-6. `#FF85C8` is reachable only from
`STREAK_CEREMONY[3].colors` (`constants.js:162`), which indexes deliberately.

Not a bug, and removing it would break that confetti reference — but a ninth colour added here would
look available and silently never appear on a board. A comment now sits next to the array saying so.
An accidental duplicate of the same comment was removed in the same pass.

### V-05 — checks that came back **clean**

Recording these so the next reader does not redo them:

- **Pool size is 15, confirmed.** 18 `UPGRADES` entries, minus `jackpot` (excluded by id) and the two
  `dailyOnly` entries (`wind`, `dawn`). This confirms the count Batches 2 and 3 corrected.
- `rarityWeight`'s four values (`9/6/3/1`) correctly cover the four rarities that can appear in the
  normal pool; rarity 5 is Jackpot, which bypasses the pool entirely.
- `maxCardWeightMult: 3` genuinely fires where the comment says: `synergyMult[3] (2.5) × focusMult
  (1.5) = 3.75`, so `rarityWeight(1)=9 → 34` is cut to `27` on an ordinary opening.
- `ARCHETYPE_OFFER_COUNT: 4` against `C(6,4) = 15` — the "15 possible sets" comment is right, and the
  "six is a ceiling, not a taste call" argument (`C(4,2) = 6`) is correct.
- `STREAK_MILESTONES` derives from `ACHIEVEMENTS` via `filter().sort()` — `filter` returns a fresh
  array, so the in-place `sort` cannot mutate `ACHIEVEMENTS`. The comment's claim is safe.
- `twistMoveDelta` matches every twist's `desc` exactly: tailwind +3, thin −2, feast +5, and
  Rising Tide's −1-per-3 rounds first bites at round 4, which is what "every 3 rounds you clear"
  describes.
- The `lucky`/`combo`/`glass`/`clear`/`invest`/`tube`/`auto` descriptions all match their
  implementations and `AGENTS.md`'s stated trade-offs.
- `CATEGORY.other` exists but is absent from `CATEGORY_ORDER`, exactly as its comment claims.

---

## Findings — `src/Tube.jsx`

### V-06 — a tube's contents were never announced to a screen reader — **MED (a11y) — FIXED**

`Tube.jsx:233` used to read:

```js
aria-label={`Tube${selected ? ", selected" : ""}${solved ? ", solved" : ""}${hintFrom ? ", hint source" : ""}${hintTo ? ", hint destination" : ""}`}
```

The label described the tube's **UI state** and never its **contents** — not how many balls, not which
colours. For a puzzle game whose entire state is the distribution of balls across tubes, that is the
only thing a screen-reader user needs and the one thing they never got. The colour-blind numbers are
`aria-hidden="true"` (`Tube.jsx:129`), which is correct for the *visual* layer and means the DOM has
no accessible copy of them either.

**Now** the label carries the tube's index, the ball count and the 1-based colour numbers as drawn on
the glass, ahead of the existing state clauses. Colour numbers are 1-based here to match what the
player sees, unlike the 0-based `colorIdx` in state — a mismatch the old label had no chance to
introduce, and the reason the conversion is done inline rather than in `Ball`.

### V-07 — `ballBackground` had no bounds guard, unlike its counterpart in App.jsx — **LOW — FIXED defensively**

`Tube.jsx:118-120`:

```js
export function ballBackground(colorIdx) {
  return `linear-gradient(180deg, ${COLORS[colorIdx]} 0%, ${shade(COLORS[colorIdx], -0.15)} 100%)`;
}
```

In normal play `colorIdx` is always in range (`colorCount ≤ 7`, `COLORS.length = 8`), so this cannot
throw. But the particle path in `App.jsx` guards the same lookup — `COLORS[colorIdx] || T.accent` — so
the two halves of the same colour lookup disagreed about whether a miss is possible. With `undefined`,
`shade()` throws on `hex.replace`, and **there is no error boundary** (`C-A6`), so the React root goes
blank.

**Now:** `COLORS[colorIdx] || "#888888"` — the guard the other site already used.

**Still not established:** whether a corrupt save can actually deliver an out-of-range index. That
depends on what `validLevel` (`gameLogic.js:1179-1191`) checks, which was never traced — Phase 1
recorded it only as "treats a corrupt level as no save". The guard is correct either way and makes the
question moot, so tracing `validLevel` is now optional rather than required.

### V-08 — a `<div>` inside a `<button>` — **LOW / validity — FIXED**

`Tube` renders `<button>` (`Tube.jsx:223`) and each `Ball` rendered a `<div>` (`Tube.jsx:170`). The
`button` content model is phrasing content; `div` is flow content. Browsers tolerate it and it renders
fine, but it is invalid HTML, and it is the kind of thing that bites on a future `preact/compat` swap
or a stricter hydration pass. Now a `<span>` with `display: block` on `BALL_STYLE_BASE` — a drop-in,
because the ball's own inline styles are spread on top of that base and `display` had no other author.

### V-09 — `promoting` may never clear for balls that never animate — **RESOLVED: NOT A BUG — entry deleted**

`Tube.jsx:168-176`: every ball starts `promoting: true` (holding its own compositor layer) and clears
it in `onAnimationEnd`. The open question was whether `onAnimationEnd` fires for a ball that never
runs an animation, and whether such a ball exists.

**Answered, and the hypothesis was wrong.** `globalStyles.js:449-452`:

```css
.cascade-ball { transform-origin: 50% 100%; animation: ballDrop 300ms linear backwards; }
.cascade-ball.promoting { will-change: transform, opacity; }
.cascade-ball.landing { animation: ballLand 260ms linear backwards; }
```

`.cascade-ball` carries its **own** animation unconditionally — `ballDrop` — and `landing` only
*replaces* the name (which the `Tube.jsx` comment about "never switching animation-name later"
describes as the avoided case, correctly). So **every** ball runs an animation and every ball gets
`onAnimationEnd`. `promoting` clears. No layer is held open. **No change made; the entry should stay
deleted.**

### V-10 — `fitTubeScale` returned `MIN_FIT_SCALE` even when that is *larger* than `base` — **LOW — FIXED**

`Tube.jsx:69-86`: if `base < MIN_FIT_SCALE` the loop body never executes and the function returned
`0.5` — enlarging the tubes rather than shrinking them. Unreachable today, because `base` comes from
`tubeScaleFor`, which bottoms out at `0.56`. It became live the moment a caller passed a smaller
`base`, and it would fail in the *wrong direction* (bigger tubes, more overflow), which is the failure
the whole function exists to prevent. Now starts at `Math.max(base, MIN_FIT_SCALE)`, so the floor can
only ever hold the scale up to a minimum, never invert it.

### Checks that came back **clean** in `Tube.jsx`

- `tubeDims` at scale 1 and at `MIN_FIT_SCALE` both fit `MAX_HEIGHT` balls plus padding — 194px of
  content against a 164px stack at 1.0, 106px against 82px at 0.5. The arithmetic holds at both ends
  and the function is linear between them.
- `liftFor` matches its own comment: ball *i*'s bottom edge is `i × slot` above the content box's
  bottom, and it lifts the top ball (`ballCount - 1`).
- `slotCenter` and `tubeDims` agree on `border`/`padBottom`, so a flying ball lands where the real one
  will sit — which is the entire reason these two files share one source of truth.
- `topRunLength` walks from the top down, matching what `pour` moves.
- The index-as-key choice in `Ball` is deliberate and the `landAt`-read-once comment (147-152) gives
  the correct reason: a re-read would let a second pour retime an in-flight ball.
- `shade` clamps each channel to `[0,255]` and pads to 6 digits, so `#FF4D6A → -15%` stays valid hex.

---

## New findings — `src/HomeScreen.jsx`

### V-11 — the decorative hero held four real, focusable buttons — **MED (a11y) — FIXED**

`HomeScreen.jsx:241` (was 226 before this pass's comment):

```jsx
<div className="fade-up" style={{ ...S.hero, animationDelay: "0ms" }} aria-hidden="true">
```

The wrapper is `aria-hidden` and `pointer-events: none`, and the comment above it claimed this "take
it out of the tab order and the a11y tree entirely rather than leaving an unlabeled, do-nothing button
for a screen reader to announce."

**That claim was only half true, and the half that was false is the bug.** `aria-hidden` removes a
subtree from the *accessibility tree*; it does not touch the *tab order*. `pointer-events: none` stops
mouse and touch; it does not stop the keyboard. So `Tab` still walked into the four hero tubes — each
one a real `<button>`, because using the board's own `Tube` here is deliberate and documented
("pixel-for-pixel the same glass-and-ball look the actual board uses") — landing on an unlabeled
control that does nothing when pressed. Focusable-inside-`aria-hidden` is also a WCAG 4.1.2 failure,
and Chrome can log it as an aria-hidden-while-focused console error.

**Now:** `inert` added. One attribute, and it does all three things the comment claimed — out of the
tab order, out of the a11y tree, and non-interactive. The `aria-hidden` and `pointer-events: none` are
kept because `inert` does not restyle and the `Tube` animation still needs its `pointer-events` rule
to be explicit.

**Version coupling, recorded deliberately:** `inert` is a real boolean only in **React 19**; on React 18
and below it must be the empty string, and `inert={true}` would silently do nothing — reintroducing
exactly this bug while looking fixed. The comment at the call site says so. This is a reason to keep
it, not a reason to avoid it.

### Checks that came back **clean** in `HomeScreen.jsx`

- `ruleColor` really does need to exist separately from `RULE_KIND_COLOR`: it returns `-text` fill
  tokens where the constant returns `var(--go)`-style fills, and its comment correctly identifies the
  11px-on-dark legibility bug that split prevents. With Home now drawing exactly one rule, the
  "three copies" problem it describes is gone by construction.
- `savedNeed` reads `playPar` first, then `par`, and defaults to `null` rather than `0` — so the
  `Need M` line disappears instead of printing a false `Need 0` on a save with no usable par. This
  matches `needOf()`'s precedence in `App.jsx` and the HUD's own NEED line, so the three cannot
  disagree.
- `dailyCtaText`'s four states and `scoreCtaText`'s three are each internally consistent with
  `dailyPhase`, and the two label decisions documented in the comments (not saying "Complete" to a
  player who used their attempt on round 1; not saying "Not attempted" after a run that scored
  nothing) are both actually implemented.
- Every themed colour on this screen is a `D.*` token or a `var(--…)`; no hardcoded surface.
- `homeAmbient` being `position: fixed` inside a scrolling `homeRoot` is correct here, and the comment
  explains the seam that `absolute` would leave. No ancestor sets a `transform`/`filter`, so `fixed`
  is not contained.
- `todayRounds` is passed to `FriendCompare` only under `attemptOver`, so compare is never shown
  without a score to compare — and `FriendCompare` (which contains a button and an input) is a sibling
  of the button row rather than nested in it.

---

## Findings — `src/globalStyles.js`

### V-12 — two glass utilities hardcode dark-theme values — **LOW/MED — FIXED**

`globalStyles.js:541-546`:

```css
.glass-standard { background: rgba(15, 21, 40, 0.72); … }
```

`globalStyles.js:1061-1065`:

```css
.glass-elevated { background: rgba(20, 27, 50, 0.85); … }
```

Both were the **dark** theme's values, written as literals. Their two siblings in the same file did it
correctly: `.glass` used `var(--glass)` and `.glass-premium` used `var(--glass-elevated)`. Both tokens
are already defined for both themes (`globalStyles.js:62` dark, `:127` light). So a light-theme player
reaching either class got a dark navy panel — the same class of bug the `--rarity-*` and `--shimmer-*`
comments in this file describe having already been fixed once.

**Now:** both use their token. `var(--glass)` and `var(--glass-elevated)`.

**Why this was safe to do blind.** The reason to hesitate was that usage could not be established
(`ripgrep execution failed` in this environment, twice — the shell and the grep tool), and the correct
fix differs depending on the answer. It turns out the answer does not change whether the swap is safe:

| | classes used | classes unused |
|---|---|---|
| token swap | fixes the light-theme bug | edits a dead rule, no visual change |
| dark-theme delta | **zero** — `rgba(15,21,40,0.72)` *is* `--glass` exactly; `0.85`→`0.88` for the elevated one | zero |

So the swap is correct-or-neutral in both worlds, and the dark theme — the one certainly in use — does
not move. The residual 3-point alpha difference on `.glass-elevated` is noted in the code comment.

**Still open, and it is an owner decision:** whether these two rules are *live* at all. If they are
dead, deletion is better than a token swap, and this pass could not check. `HomeScreen.jsx:72-74`
documents the precedent — `.twistPanel` / `.twistToggle` / `.twistChev` were noted as "now unreferenced
from React and can be dropped from there too", so unused utility classes demonstrably exist here.
One `grep -rn "glass-standard\|glass-elevated" src/` settles it.

### Checks that came back **clean** in `globalStyles.js`

- The `--rarity-*` and `--shimmer-*` comments' claims about the light palette all hold up against the
  token values directly below them.
- `html, body, #root` uses `var(--bg-1)` and the comment's claim that `S.root`'s own div covers it is
  consistent with `theme.js:9`.
- `overscroll-behavior: none` + `touch-action: manipulation` on the root, with `position: fixed` on
  `S.root`, does block the pull-to-refresh the comment describes while leaving pan and pinch alone.
- The `:focus-visible` rule with `!important` is actually necessary, as the comment says — most
  buttons carry an inline `outline: "none"` (`theme.js`, `BottomNav.jsx:150`), and an inline value
  beats a stylesheet rule without `!important`.
- The reduce-motion block is complete for every looping animation declared in the file: `heroFloat`,
  `daily-border-wrap`, `daily-shimmer`, `flamePulse`, `dailyDotPulse`, `dailyUrgentPulse`, the four
  streak-ceremony classes, and both profile-guide classes. **No infinite animation in this file is
  missing from it** — which is the failure that block exists to prevent, and it is the reason
  `.dailyUrgentPulse` had to become a class.
- Each looping animation that is switched off has a *static* substitute that preserves its meaning
  (`achEmptyTrophy` opacity, `achRingPulse` steady ring, `achShine` steady ring, `dailyUrgentPulse`
  ring in `currentColor`, `hintFrom` glow). `achNameShimmer` correctly restores `-webkit-text-fill-color`,
  which a paused `background-clip: text` gradient would otherwise leave invisible.
- The `.achShine` / `.achIconBounce` specificity collision described at 289-304 is real and the
  combined `.achIconBounce.achShine` rule at 305 resolves it correctly; `.upgCard`'s dependence on
  source order relative to the generic `button:active` rule (766-770) is likewise real and satisfied.

---

## Findings — `src/CodexScreen.jsx`

Opened only to place V-03's fix, then read to the end. One new finding, and one thing V-03's own
rationale got slightly wrong.

### V-13 — the Codex lists every upgrade card by name and explains none of them — **LOW — REPORTED, NOT CHANGED**

`CodexScreen.jsx:226-234`, the card list inside each category:

```jsx
{list.map((u) => (
  <div key={u.id} style={S.catItem}>
    <span aria-hidden="true" style={S.catItemIcon}>{u.icon}</span>
    <span style={S.catItemName}>{u.name}</span>
    <span style={S.catItemCount}>{seen.cards[u.id] ? `${seen.cards[u.id]}×` : ""}</span>
  </div>
))}
```

Name, icon, and how many times you have taken it. **`u.desc` is not rendered.** Every card's actual
rule — "20% chance per pour", "Every 3rd pour in a row", "+6 moves every round" — exists only in the
upgrade picker, which is a screen you see once per offer and cannot browse.

The file's own header states its job as "a reference for the three things a run is built out of —
opening paths, upgrade categories, daily rules". Paths and daily rules both get a full `desc` on this
screen (`rowDesc` at line 267 and 182). Categories get none. So the section that exists to let a
player make an *informed next pick* shows them the names of their options and not what the options do,
which is the one thing the "why a player who picked Fortune has had four offers to work that out from
card names alone" comment at 194-198 is complaining about — the fix for it landed half-way.

**Not changed, and it is a design call rather than a defect.** Rendering `u.desc` for all 15 pool
cards adds real length to a screen that is already scrollable, and the category blocks are
deliberately compact (a bordered card per category, `catList` on its own tinted ground). Whether the
reference screen should carry every card's rule text is a question about what this screen is *for*,
and the owner is better placed than this pass to answer it. Cheapest middle path, if wanted: show
`desc` only on cards the player has never taken, where "what does this even do" is the live question.

### A correction to V-03's reasoning

V-03's fix landed in this file, so this pass read the whole of it — and one assumption behind the
placement did not survive. This pass initially reasoned that a Codex visitor sees both luck cards'
"20%" and "25%" side by side and can add them up. **They do not** — per V-13 the card list renders
names only, so those two numbers never appear together anywhere in the Codex. They are visible
together only in the upgrade picker, one screen at a time.

**This does not invalidate the fix.** The player's confusion is real and arises from the two card
texts themselves; the LUCKY row answers it in the one screen whose stated purpose is explaining rules.
But it does mean the Codex cannot be justified as "the place where the player adds the numbers up" —
it is justified as the rules reference. The row's own wording was checked against this and makes no
such claim.

### Checks that came back **clean** in `CodexScreen.jsx`

- The file honours its own stated rule (`var(--…)` only, never a literal colour) — verified across all
  ~30 style entries; there is no `T` import and no hardcoded hex, which is why it survives a light
  theme without a second palette.
- `MOVE_RULES` renders through a plain `.map` with no grid, no fixed column count and no index
  arithmetic, so adding the eighth row could not have broken a layout — checked before editing.
- The `today` twist is computed once via `useMemo(..., [])` and read by both the daily-rules section
  and nothing else, so it cannot disagree with itself across renders.
- `seen` is read once at mount via a lazy `useState` initializer rather than an effect, and the
  comment's reasoning (no first-paint flash of zeroes) matches what the code does.
- The `key={r.name}` / `key={t.id}` / `key={u.id}` choices are all stable — `name` and `id` are both
  fixed strings in their catalogs, so no row can be re-keyed mid-session.
- `role="group"` with an `aria-label` carrying *state* (not count) and the visible count `aria-hidden`
  is done correctly on both the paths and the daily rules, and the comment explains the
  `aria-label`-on-generic prohibition it is working around.

---

### Checks that came back **clean** in `theme.js`, `index.css`, `TodayGoal.jsx`, `BottomNav.jsx`

**No findings. All four clean.**

- `theme.js` uses `T.*` for every themed value and `var(--…)` for the two overlays; `S.tutOverlay`'s
  comment records the hardcoded-navy scrim bug already fixed here, and both overlays carry the
  `-webkit-` prefix `backdropFilter` needs on WebKit.
- `index.css` resolves `--boot-bg` off `data-theme` in both directions *including* the no-attribute
  case, which is the one that causes a light-mode dark flash; the two values match `--bg-1` in
  `globalStyles.js`, as its comment claims (manually kept in sync, and the reason is stated).
- `TodayGoal.jsx` is careful about the two places it could lie: it rounds once at the draw site rather
  than inside `dailyMedian`, and `rounds` is explicitly allowed to be missing or 0 so Home renders the
  goal rather than "You made 0". It uses `roundsText(made)` rather than raw concatenation.
- `BottomNav.jsx`'s `zIndex: 50` comment's whole argument checks out against `theme.js`: both
  overlays are `zIndex: 100` and the two full-page screens are 80, so 50 sits correctly below both,
  and the comment correctly identifies raising Settings past 100 as the move that would have buried
  its own confirm dialog.

One **cosmetic, not fixed**: `BottomNav.jsx:125` hardcodes `rgba(0, 0, 0, 0.55)` in the nav's
`boxShadow` rather than `var(--shadow-lg)`. Same for `theme.js`'s `ovCard`/`tutCard`. A dark shadow at
0.55 alpha on the light theme is heavier than `--shadow-lg` would be, but it is a shadow rather than a
surface, and there are enough of these that changing them blind (again, no screenshot possible) is a
worse trade than leaving them.

---

## What Phase 2 still does NOT establish

- **Nothing was run.** No build, no lint, no profile, no play. Every edit in this file is
  source-verified only — read back line by line after writing, which catches a misplaced edit but not
  a syntax error. If any of these thirteen edits has one, only the owner's build will say so.
- **V-12's live/dead question is open.** The swap is correct-or-neutral either way, but whether these
  two rules should be *deleted* rather than fixed could not be checked without grep.
- **V-13 is a design question, not a defect, and was left alone.** Whether the Codex should render
  every card's rule text is the owner's call about what that screen is for.
- **V-03's Codex row has never been seen on a screen.** It is 3 lines of JSX in a `.map`, and the
  surrounding rows already interpolate the same way, so the risk is low — but "no screenshot exists"
  is the honest status.
- **V-07's underlying question** — whether `validLevel` range-checks colour indices — was never
  traced. The guard makes it moot.
- **The C-7 measurement still does not exist.** V-01's balance impact is derived from the code's own
  "~4 moves" figure, not measured. Until `[C7]` lines from 5-6 real runs exist, the Warm Start *code*
  and `AGENTS.md`'s "average player dies around round 15-25" claim are both unverified.
- **`constants.js` was audited for internal consistency and against `gameLogic.js`.** Whether the
  numbers are *good* is a design judgement, and the one hard piece of evidence available —
  `constants.js:433-436` — is a "simple player model" whose code is not in the repo.
- **V-01's code half is untouched and still needs a decision** — narrow the effect, or accept it and
  leave the (now corrected) text as the record.

## Recommended next steps

1. `npm run build && npm run lint` — this pass made **thirteen** source edits and not one has been
   compiled. This is the single highest-value thing the owner can do right now.
2. Play-test the three paths this pass touched, in this order:
   - **First launch → press Tab repeatedly.** The four hero tubes must be *skipped*. Before this pass
     they were not; `aria-hidden` never did that job.
   - **Open Profile → Codex.** Confirm the new LUCKY row reads correctly and the seven ladder rows
     above it are unchanged.
   - **Light theme**, board + any screen using a glass panel.
   - **Exit mid-round → Continue**, for the saved-offer path.
3. `grep -rn "glass-standard\|glass-elevated" src/` — if both are dead, delete the two rules (V-12).
4. Run 5-6 real rounds and collect the `[C7]` lines. Then: remove the instrumentation from
   `gameLogic.js`, and settle whether `AGENTS.md`'s "dies around round 15-25" survives contact with
   the numbers. Warm Start's code (V-01) is the decision that depends on this.