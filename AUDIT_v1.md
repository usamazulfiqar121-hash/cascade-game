# Cascade — Code Audit v1

Rules honoured while writing this file:

- **Read-only audit.** No source file was modified. This document is the only thing written.
- **Verification status of every claim.** `SOURCE` = provable by reading the code in Phase 1.
  `NEEDS RUNTIME` = depends on running the app / a solver / a phone and was NOT measured here.
- **No shell was available in this session** (`npm run build` / `npm run lint` / `grep` all timed out
  or failed). Therefore: nothing here is a build/lint/runtime result, and no timing number below is a
  measurement. Numbers are arithmetic done by hand from the constants in the source.
- Phase timestamps: **not recorded** (no reliable clock available in this session).

Severity: `CRIT` / `HIGH` / `MED` / `LOW`.
Improvement verdict: `MUST` / `SHOULD` / `COULD` / `SKIP`.

---

# PHASE 1 — `src/main.jsx`, `src/App.jsx`, `src/gameLogic.js`

| File | Lines read | Blocks traced | CRIT | HIGH | MED | LOW |
|---|---|---|---|---|---|---|
| `src/main.jsx` | 35 / 35 | 4 | 0 | 0 | 0 | 0 |
| `src/App.jsx` | 5428 / 5428 | 62 | 0 | 0 | 6 | 8 |
| `src/gameLogic.js` | 1528 / 1528 | 48 | 0 | 0 | 5 | 6 |
| **Phase 1 total** | **6991** | **114** | **0** | **0** | **11** | **14** |

No CRIT and no HIGH finding in Phase 1. The MED findings are two balance leaks, one dead legacy
branch, one undo/hint accounting hole, one misleading on-screen sum, and one callback-churn issue.

---

## FILE 1 — `src/main.jsx` (35 lines)

### 1.1 Integrity

- **Exports:** none. Side-effecting entry module only.
- **Imports:** `react` (`StrictMode`), `react-dom/client` (`createRoot`), `./index.css` (side effect),
  `./App.jsx` (default). All four exist.
- **Circular dependencies:** none. `main → App → {constants, gameLogic, theme, globalStyles, …}`;
  `gameLogic → constants` only. No cycle among the three Phase 1 files. `SOURCE`
- **Orphan exports:** n/a (no exports).
- **Global side effects:** exactly one, `document.documentElement.setAttribute("data-theme", …)`
  at line 26 or 28, plus `createRoot(...).render(...)` at 31.
- **Deleted code:** large comment blocks at lines 52-63 and 64+ are orphaned section headers with no
  code under them (the daily-UTC header at 52-55 and four blank comment runs at 56-63). Harmless,
  but they are the residue of removed functions. `SOURCE`

### 1.2 Line-by-line trace

| Lines | Block | In | Out / effect | Verdict |
|---|---|---|---|---|
| 1-4 | imports | — | module graph edges | OK |
| 20-29 | pre-paint theme resolve | `localStorage["cascade:theme"]`, `matchMedia` | `data-theme` ∈ {dark,light} on `<html>` before first paint | OK |
| 21 | read saved pref | raw string | `saved` | OK — only 3 literals accepted, anything else → `"dark"` |
| 22 | validate | `saved` | `theme` | OK — invalid value never reaches line 26 |
| 23-25 | `system` resolution | `theme === "system"` | `effective` | OK — mirrors App 1162-1173 exactly |
| 27-28 | `catch` | localStorage throw / no `matchMedia` | `dark` | OK — never leaves the attribute unset |
| 31-35 | mount | `#root` | StrictMode-wrapped `<App/>` | OK |

**Edge cases checked (`SOURCE`):**

- `localStorage` throwing (Safari private mode / disabled storage): line 27 catches it. ✔
- `window.matchMedia` missing (very old WebView): the `try` covers it, falls back to dark. ✔
- Value `"system"` stored, OS light: line 24 reads `.matches` → `light`. Matches App 1166-1168. ✔
- Garbage value (e.g. `"Dark"`, `null` JSON): line 22 rejects → dark. ✔

### 1.3 Calculations verified

| Quantity | Formula | Check |
|---|---|---|
| Theme resolution | 3-valued literal whitelist, then `system` → matchMedia | The pre-paint value equals the value App's effect (1162-1173) will write. No first-frame flicker. **VERIFIED `SOURCE`** |
| Render count | `createRoot` + StrictMode | StrictMode double-invokes render/effects in dev only. App is written to survive it (see Contracts C-A3). ✔ |

### 1.4 Improvements

| # | Finding | Verdict |
|---|---|---|
| M-1 | `document.getElementById('root')` is not null-checked. A wrong `index.html` throws a `TypeError` before React mounts, i.e. a blank page with no error UI. | `COULD` (build-time guarantee; Vite template always ships `#root`) |
| M-2 | Orphaned comment headers at 52-63. | `COULD` (delete for readability) |

### 1.5 Contracts

| # | Contract | Holds? |
|---|---|---|
| C-M1 | The `data-theme` attribute is correct before the first paint. | **YES** `SOURCE` |
| C-M2 | Theme resolution logic exists in exactly one place per layer (pre-paint + App effect) and the two agree. | **YES** — the two are byte-equivalent in behaviour. Verified by reading both. |

---

## FILE 2 — `src/App.jsx` (5428 lines)

### 2.1 Integrity

- **Default export:** `Cascade` (line 438). Only export.
- **Imports:** 6 local modules + 19 named bindings from `./gameLogic` (3-21) + 19 from `./constants` (2).
  Every name imported from `constants.js` and `gameLogic.js` was checked to exist in those two files. ✔ `SOURCE`
- **Cross-module imports NOT verified in Phase 1** (out of scope, files not read):
  `./theme` (`S`), `./globalStyles` (`CSS`), `./shareCard` (4 names), `./sound` (`Snd, Haptic, setVibe, Music`),
  `./notifications` (2), `./Tube` (4 + default), `./FlyingBalls` (1 + default), `./UpgradeCard`,
  `./HomeScreen`, `./AchievementsScreen`, `./CodexScreen`, `./codex` (4), `./Tutorial`,
  `./screens/SettingsScreen`, `./components/TodayGoal`, `./components/FriendCompare`, `./icons` (4).
- **Unused imports (dead bindings) — `SOURCE`:**

  | Name | Line | Used in App? |
  |---|---|---|
  | `sumMoveBonus` | 4 | no |
  | `shuffle` | 6 | no |
  | `mulberry32` | 6 | no |
  | `applyAutoSort` | 8 | no |
  | `MOVE_ECONOMY` | 20 | no (only in comments) |
  | `MAX_HEIGHT` | 2 | no |

- **React surface:** `useState` ×~60, `useRef` ×~25, `useEffect` ×~30, `useLayoutEffect` ×2,
  `useMemo` ×2, `useCallback` ×~25. No `useReducer`, no context, no error boundary.
- **Timers owned by the component:** `toastTimerRef`, `toastExitTimerRef`, `shieldTimerRef`,
  `ephemeralTimersRef` (a Set), `hintTimerRef`, `roundTransitionRef`, `achToastTimerRef`,
  plus a bare `setTimeout(…, 800)` at 3654 and a bare `setInterval` inside `DailyResetCountdown` (220).
- **Effect count:** 30 `useEffect` + 2 `useLayoutEffect`. Cleanup present on: 501(none needed),
  618 (interval + listener), 634, 715, 830, 1089, 1430 (both toast timers), 1894(n/a), 2701-2707
  (achToast, hint, roundTransition, ephemeral set), 3455-3458 (Capacitor listener).
- **Conditional-render roots:** `screen === "home"` (3808), `screen === "game"` (3873),
  three `useExitTransition` screens (5129/5323/5353), `showTutorial` (5360), `confirmDialog` (5375).
- **localStorage keys read:** `cascade:theme`(447-453, 1166-1172), `cascade:best`, `cascade:dailyBest`,
  `cascade:dailyBestScore`, `cascade:soundOn`, `cascade:vibeOn`, `cascade:musicOn`,
  `cascade:colorBlind`, `cascade:reduceMotion`, `cascade:tutorialSeen`, `cascade:achievements`,
  `cascade:dailyResults`, `cascade:hasPlayedOnce`, `cascade:stats`, `cascade:tipDrain`,
  `cascade:dailyState`, `cascade:dailyRun`, `cascade:normalRun`, `cascade:scoreBest`,
  `cascade:scoreRuns`, `cascade:scoreTries`, `cascade:streakShield`, `cascade:bestStreak`,
  `cascade:theme` — plus the constants imported from gameLogic.
- **No error boundary anywhere above `Cascade`.** Every `localStorage` read is therefore wrapped in
  `try/catch` or validated; the audit checked each of the 20+ read sites. Remaining un-caught throws
  would blank the React root. See Contract C-A6.

### 2.2 Line-by-line trace

#### Module scope

| Lines | Block | In | Out | Verdict |
|---|---|---|---|---|
| 1-39 | imports | — | — | OK except the 6 dead names above |
| 41-50 | blank padding | — | — | dead space, no code |
| 52-63 | orphan comment headers | — | — | residue of removed code |
| 73-79 | `tubeScaleFor(n)` | tube count | 1 / .86 / .74 / .64 / .56 | OK — monotone, no gap; `n<=7`→1 |
| 95-117 | `useExitTransition(isOpen, 280)` | flag | `{shouldRender, closing}` | OK — `shouldRender \|\| isOpen` makes open same-render; `shouldRender` correctly omitted from deps (101-105) |
| 130-145 | `SHAKE_KEYFRAMES`, `WRONG_FLASH_KEYFRAMES` | — | WAAPI keyframes | OK |
| 167-176 | `cheerKeyframes(amp, rot)` | amp, rot | 6 keyframes | OK — ends exactly where it starts |
| 181 | `CHEER_MS` | — | {130,150,180} | OK |
| 189 | `WIN_BALL_SLOW_MS` | — | 250 | OK |
| 201-205 | `achToastMs(meta, reduceMotion)` | meta, flag | ≥1200 ms | OK — floor 1200, `CALM_DISCOUNT` subtracted |
| 217-247 | `DailyResetCountdown` | clock | own 1 s interval | OK — isolated re-render, own cleanup (221) |
| 265-270 | tap-guard constants | — | 500/100/80/380/350/400 | OK — see Calc C-4 |
| 306-308 | `needOf(lvl)` | level | `playPar ?? par` | OK — `??` is load-bearing for old saves |
| 310-319 | `budgetLine(lvl)` | level | 1 line | OK |
| 344-380 | `budgetBreakdown(lvl)` | level | 4-6 line string | see **A-05** |
| 385-391 | `nextRoundInfo(nextRound)` | round | 1 line | OK — uses `moveBudget(n,0,0).drain` |
| 422-436 | `ruleChip(rule, isDaily)` | rule | chip object \| null | OK — `short \|\| desc`, unknown kind → gold |

#### State & derived values

| Lines | Block | In | Out | Verdict |
|---|---|---|---|---|
| 447-453 | `theme` lazy init | storage | "dark"/"light"/"system" | OK — lazy init avoids the StrictMode overwrite bug described at 440-446 |
| 464-470 | `mode` + `isDaily`/`isScore`/`canAssist` | — | tri-state | OK — derived, never stored separately |
| 474-484 | score standings | storage | `scoreBest/scoreRuns/scoreTries/scoreResult` | OK — all four loader-validated |
| 485-511 | daily state, twist, `todayRounds` | — | — | OK — `todayRounds` correctly gated on `isDaily` (509-511) so a score run's log cannot appear on Home |
| 512-535 | toast refs + `toastPos` | — | — | OK — 3 timers, 1 sequence, 1 measured position |
| 540-566 | daily refs, `persistDailyRun`, `staleDailyRun` | run | disk write | OK — guard `dailyKey(runDate) !== dailyKey()` stops a stale day writing |
| 569-577 | mount load + notifications | storage | `dailyState`, shield | OK — `initNotifications()` has its own `.catch` (575) |
| 590-618 | day-rollover watcher | clock | re-render + shield reconcile | OK — 1 s interval + `visibilitychange`, both cleaned up |
| 619-646 | `screen`, `screenShield`, `raiseShield` | — | input shield | see **A-13** |
| 647-693 | `hasPlayedOnce`, `dailyResults`, `dailyPhase`, `resumeRound`, `savedNormal`, `savedNormalMutator` | storage | Home props | OK — see Deep dive D |
| 694-723 | shielded dates, upgrades, `archOffer`/`runPath`/`archOfferClosed` | — | picker state | OK — Escape closes without saving (710-715) |
| 725 | `retriesLeft` | `RETRIES_PER_RUN` | 2 | OK |
| 744-750 | `weeklyMutator` pin + `level` | — | run rule, round 1 board | OK — pin is settable so a resume can adopt the save's rule |
| 761 | `ruleChipData` | — | chip \| null | OK — reads the pin, never re-resolves |
| 762-876 | board/round state | — | — | OK |
| 877-887 | daily best + score + `dailyNewBest` | — | — | OK — `dailyBestAtStartRef` distinguishes a record from a tie |
| 888-923 | achievements, settings, reduce-motion | — | — | OK |
| 925 | `movesLeft` | limit, bonus, moves | number | OK — not clamped here; clamped at every render site (4154) |
| 939 | `scoreDisplay` | isScore, `dailyRun.rounds` | score | OK — `useMemo` over the one log `recordScoreRun` also scores (comment 927-938) |
| 947-962 | `runArch`, `offerPity`, `openingPath`, `shownArch` | upgrades, path | pill text | OK — 3 array walks; `openingPath` gated on `FOCUS_OFFERS`, same constant `activeFocus` uses |
| 965-1048 | mount loader | 11 storage keys | 12 `useState` setters | OK — every read in its own `try`, achievements + `dailyResults` shape-checked at 996-1014 (see C-A6) |
| 1050-1059 | music/vibe side effects | prefs | `Music`, `Vibe` | OK — no cleanup needed (idempotent setters) |
| 1063-1077 | `upgradeReady` | phase, card count | bool | OK — waits the whole stagger (1071-1074), cleanup 1076 |
| 1079-1089 | OS reduce-motion listener | `matchMedia` | `osReduceMotion` | OK — both modern and legacy `addListener` branches, cleaned up |
| 1093-1096 | reduce-motion sync point | `reduceMotion` | attribute + ref | OK — one place writes both |
| 1107-1156 | game-over count-up | phase, round, isScore | `gameOverDisplayRound` | OK — two RAFF chains, both cancelled in the cleanup (1141, 1155) |
| 1162-1173 | theme write-back | `theme` | attribute + storage | OK — mirrors `main.jsx` 23-25 |
| 1176-1184 | system-theme listener | `theme === "system"` | attribute | OK — no cleanup gap |
| 1187-1197 | `recordStats` + persist | `stats` | storage | OK — write in an effect, never in the updater (comment 1190-1194 is correct) |
| 1214-1228 | `showToast` | config | toast + 2 timers | OK — see D1; both timers nulled before re-arm |
| 1234-1239 | `dismissToast` | — | toast cleared | OK — cancels **both** timers, clears `toastPos` |
| 1251-1254 | `yieldArrivalToast` | `toast.arrival` | dismiss | OK — arrival-only, so the empty-tube reply and breakdown survive |
| 1288-1293 | score-exit exemption | `toastKeepOnExitRef` | — | OK — see D1; flag consumed on the first reader |
| 1313-1327 | arrival-toast measurement | layout | `toastPos` | OK — `useLayoutEffect`, no paint at the wrong offset; id-keyed so a stale measurement is unusable |
| 1335-1337 | `toastIsArrival` / `toastMeasured` / `toastInBand` | — | derived | OK — derived at point of use, cannot drift from the setter |
| 1344-1403 | per-board announcement | `level`, `round`, `screen` | toast | OK — declared before the `[level]` effect on purpose (1346-1350) so its own clear is not immediately undone |

#### Effects, persistence, navigation

| Lines | Block | In | Out / effect | Verdict |
|---|---|---|---|---|
| 1404-1510 | drain tip, boss toast, run briefing | `level`, `round` | arrival toasts | OK — `cascade:tipDrain` written **after** the toast is raised (1400-1403) |
| 1511-1700 | `pushNav` / `popNav` / `openScreen` | screen | history entries | OK — see D7 |
| 1701-1894 | save-on-change effects, `liveLevel` | — | disk | OK |
| 1900-1901 | `screenRef` mirror | `screen` | ref | OK — deps `[screen]`, not "always run" (contrast A-10) |
| 1906 | `roundTransitionRef` | — | one pending timer | OK — upgrade screen and game-over card are the same `if/else`, so they cannot both queue |
| 1908-1911 | `normalSaveBaseRef.current = {…}` | 8 live values | ref | see **A-09** |
| 1915-1918 | `saveNormalLive` | live position | disk | OK — gated on `canAssist`, so daily and score writes nothing here |
| 1920-2059 | `attemptPour` head: legality, flights, landing | pointer | `flights`, `landing` | OK |
| 2060-2124 | landing feedback, luck/combo/mega, burst | landed ball | bonus, particles | see **A-04**, **A-07** |
| 2125-2134 | `setComboCount`, `recordMoves`, Second Wind | pour | state | OK — `wind_used` id rewrite is what makes the save honest |
| 2135-2241 | clear detection, `recordRound`, `celebrateClearBurst` | solved board | phase, toast | see **A-07** |
| 2242-2260 | "Need met!" pop | `clearedUnderPar` | toast | OK — carry deliberately **not** announced (2248-2251), because Glass Cannon can still cancel it |
| 2261-2510 | loss path, daily failure state, run-over write | `moves === 0` | phase, storage | OK — deferred by `Math.max(250, impactMs + 300)` so the last ball lands first |
| 2533 | `attemptPour` dep array | 45 entries | — | see **A-01** |
| 2540 | `suppressClickUntilRef` | pointer | deadline | OK — `performance.now()` deadline, not state, for the right reason (comment 2542-2546) |
| 2554 | `EMPTY_TAP_GUARD_MS = 1200` | — | — | OK — 1200 ms > the re-read window, short enough not to outlive the hand movement |
| 2701-2707 | unmount timer sweep | — | 4 timers cleared | OK — the only place `ephemeralTimersRef`'s Set is drained |
| 2709-2733 | `useHint` | board | hint, `hintLeft`, save | see **A-03** |
| 2735-2780 | `undo` | snapshot | board, moves, counters | OK — refuses on `canAssist` itself (2744), not only on `undoLeft` |
| 2781-3080 | retry, `startNewGame`, resume paths | save | level, tubes | OK — daily resume regenerates and then `tubesMatchLevel`-gates the saved position (3103) |
| 3085-3114 | daily resume | `loadDailyRun()` | resumed level | see **A-06**; `dailyArchetype(runDate)` re-derived, never stored (3105-3109) |
| 3115-3300 | normal resume, `chooseUpgrade` | save | level, offer | OK — the boundary save the Exit dialog's copy relies on is written here |
| 3301-3439 | exit dialog, `saveBestRound` | mode | storage | see **A-08** |
| 3440-3459 | Capacitor back listener | platform event | minimise/exit | OK — the `cancelled` branch (3449) closes the one real leak; web build throws and is swallowed |
| 3461-3554 | browser `popstate` back handling | history | navigation | OK — confirm dialog short-circuit first (3464-3469) |
| 3555-3603 | Exit dialog copy + `danger` | mode, hasSave | dialog | see **A-08**; `danger` is only true for a genuinely unsaved loss |
| 3693-3698 | history re-push, `openExitDialog` | — | — | OK |
| 3699 | `backFromGameRef.current = onBackFromGame` | — | ref | see **A-10** |
| 3700-3705 | Escape closes the confirm dialog | `confirmDialog` | — | OK — listener only mounted while the dialog exists |
| 3707-3712 | `shareDaily` | storage | share text | OK |
| 3808 / 3873 | conditional roots: Home, Game | `screen` | — | OK — everything else is an overlay, so `screen` is the only two-state truth |
| 4110-4170 | HUD | `movesLeft` | — | OK — the display is clamped at 4154, not the state at 925 (deliberate; see C-A5) |
| 5129 / 5323 / 5353 | `useExitTransition` overlays | flags | — | OK — `closing` prop only; no screen is unmounted mid-animation |
| 5329 | `computeStreak(dailyResults, shieldedDates)` | — | prop | see **A-11** |
| 5360 | `showTutorial` | storage flag | overlay | OK — no longer auto-fired (1030-1046); Settings → How to Play and Reset still reach it |
| 5375-5422 | `confirmDialog` | — | overlay | OK — Escape (3702), outside-tap and Back all route to the same `setConfirmDialog(null)` |
| 5424 | `screenShield` layer | `screenShield` | input sink | see **A-13** |

### 2.3 Calculations verified

**C-1 — Move-economy arithmetic, recomputed by hand from `MOVE_ECONOMY` (843-854) and `moveBudget` (888-897). `SOURCE`**

`t = min(1, max(0, (round−1)/5))`, `buffer = round(par × (0.5 − 0.35·t) × (boss ? 0.5 : 1))`.

| Round | `t` | buffer factor | boss? | drain `round(1.8k + 0.05k²)`, `k = round−2` |
|---|---|---|---|---|
| 1 | 0.00 | +50% | – | 0 |
| 2 | 0.20 | +43% | – | 0 |
| 3 | 0.40 | +36% | – | 2 |
| 4 | 0.60 | +29% | – | 4 |
| 5 | 0.80 | +22% | **yes → +11%** | 6 |
| 6 | 1.00 | +15% | – | 8 |
| 7-10 | 1.00 | +15% | 10 boss at +7.5% | 10, 13, 15, 18 |
| 11-20 | 1.00 | +15% | 15 boss at +7.5% | 20, 23, 26, 29, 32, 35, 38, 42, 45, 49 |

- The "shrunken to +15% by round 6" claim in the comment at 817-818 **is** what the code does.
  `AGENTS.md` says "+20% by round 8" — that is stale. See **G-02**.
- `drainFrom: 2` means `k = round − 2`, so drain is 0 **through round 2** and first bites on round 3.
  The comment at 819-820 says "from round 3 on" — correct. `drainFrom` is an *index*, not a round number.
- `carry = min(5, floor(max(0, prevMovesLeft) × 0.5))`. `AGENTS.md` says "max 6" — stale. See **G-02**.

**C-2 — Per-pour refund ceiling. `SOURCE`, and this is the arithmetic behind A-04**

`App.jsx:2069-2091` pays, per meaningful pour: `lucky ? +1`, `combo ? +1` every `comboEvery` pours,
`mega ? +2` every `megaEvery` pours. From `gameLogic.js:19-30`: `LUCK_CAP = 0.4`,
`getComboEvery` → 3 (best) or 4, `getMegaEvery` → 8 or 0.

- **Normal run, best case:** `0.4 + 1/3 + 2/8 = 0.4 + 0.3333 + 0.25 = 0.983` moves per pour.
  That is exactly the "~0.98 only with ALL of them" the comment at 12-17 claims. ✔ The comment is right.
- **Daily on a Lucky Day:** `App.jsx:2070` re-caps at `0.5`, not `0.4`
  (`Math.min(0.5, getLuckyChance(...) + LUCKY_DAY_BONUS)` with `LUCKY_DAY_BONUS = 0.25`, `gameLogic.js:626`).
  `0.5 + 1/3 + 2/8 = 1.083` moves refunded **per pour** — more than the move it refunds.
  See **A-04**. The 12-17 comment never mentions the daily's higher cap.
- Sudden death zeroes all three (`2087-2091`), so the leak is bounded to non-sudden-death rounds.

**C-3 — `budgetBreakdown` sums to `moveLimit`. `SOURCE`, verified symbolically**

`moveLimit = max(playPar, par + buffer − drain + carry + cards + rule)` (`gameLogic.js:1035-1036`).
`budgetBreakdown` (`App.jsx:344-380`) prints `playPar`, `+cardBonus` where
`cardBonus = par − playPar`, `+(buffer+cards+rule)` or `−(drain + |buffer+cards+rule|)`, `+carry`.
`extra + lost ≡ drain + buffer + cards + rule` in **both** sign branches, so the rows always total
`par + buffer + cards + rule + drain + carry`, which equals `moveLimit` whenever the floor did not bind.
✔ Correct for every level this build writes. It breaks only for old saves — see **A-05**.

**C-4 — Offer weighting ceiling. `SOURCE`**

`buildWeighted` (196-208) clamps each card at `min(round(base × synergyMult[n]), round(base × maxCardWeightMult))`
and at `≥ 1`. A single card therefore cannot exceed `3×` its rarity base (`OFFER_TUNING.maxCardWeightMult`),
and the integer expansion at 205 means the weight array length — not a float — is the probability.
✔ Matches the "tempo cards ~42% of offers" claim's mechanism. The 42% itself is a claim from a
simulation not reproducible here → `NEEDS RUNTIME`.

**C-5 — `movesLeft` is clamped at the render, not in state. `SOURCE`**

`App.jsx:925` computes the raw value; `4154` prints `Math.max(0, movesLeft)`.
A refund (`bonusMoves`) can in principle push the raw value above the limit; the HUD hides that,
and `attemptPour`'s loss test reads the raw value. Deliberate, and correct — but see **A-04** for
why the raw value can be *negative*.

**C-6 — Colour ramp. `SOURCE`**

`baseColorCount = min(2 + floor((round−1)/2), 7)` → r1-2: 2, r3-4: 3, r5-6: 4, r7-8: 5, r9+: 7… wait, r9-10: 6,
r11+: 7. Rainbow and Deep Cuts add 1, both clamped to `[2, 7]`. Recovery subtracts 1, floored at 2 (974).
Recovery is disabled for daily levels (971-972), which is what keeps "same board for everyone" true from round 2.

**C-7 — Sudden death is structurally reachable much earlier than the docs claim. `SOURCE` for the
inequality, `NEEDS RUNTIME` for the round it lands on**

`suddenDeath = unclamped < playPar` (1043), i.e. `buffer + carry + cards + rule < drain − (par − playPar)`.
With no cards (`cards = 0`), no rule, no carry and no board cards (`par = playPar`), that reduces to
**`buffer + carry < drain`**:

| Round | buffer (boss halved) | drain | carry needed to survive |
|---|---|---|---|
| 3 | +36% of par | 2 | ≈ 6 on a 5-move board → already dead |
| 4 | +29% of par | 4 | ≈ 10 → dead |
| 5 | +11% of par (boss) | 6 | ≈ 16 → dead |

So a **cardless** run is in sudden death from round 3. With cards at ~1.6 moves/round average
(the source's own estimate, 827-829) and carry up to 5, the crossover lands somewhere in rounds 7-9 —
materially earlier than the "round 14-15" the comment at 837-838 targets and the "round 15-25" in
`AGENTS.md`. **This is arithmetic from the constants, not a simulated run** — the real round depends on
`boardPar` for each board, which was not measured. `NEEDS RUNTIME`. Flagged because it is the single
biggest open balance question in Phase 1.

### 2.4 Improvements

| # | Finding | Lines | Severity | Verdict |
|---|---|---|---|---|
| A-01 | `attemptPour`'s dep array carries six values the closure never reads (`tubes` aside, `undoUsedThisRun`, `colorBlindOn`, `dailyBest`, `dailyBestScore`, `runPath`, `hintLeft`, `retriesLeft` are read; the churn comes from the ~20 entries that are only stable per level). Every board change re-creates the callback, which re-creates `onTubeClick`, which re-renders the whole tube row. | 2533 | MED | `SHOULD` — the fix is to delete entries the body does not use and wrap the rest; measurable win is a device profile, not a guess |
| A-02 | Six dead imports: `sumMoveBonus`, `shuffle`, `mulberry32`, `applyAutoSort`, `MOVE_ECONOMY`, `MAX_HEIGHT`. `MOVE_ECONOMY` appears only in comments, which is how a stale number survives a tuning change. | 2, 4, 6, 8, 20 | LOW | `MUST` — free, and it removes a trap |
| A-03 | `useHint` persists the spend only `if (moves > 0)`. On the last move of a round, or on any round where `moves === 0` and `phase` is still `"playing"`, the hint is deducted in memory but never written, so Exit → Continue hands the hint back. Breaks invariant 3 in `AGENTS.md`. | 2729 | MED | `MUST` — guard on the write, not on `moves` |
| A-04 | Daily Lucky Day raises the luck cap from `0.4` to `0.5`, making the expected refund `1.083` moves per pour — above 1. Invariant 4 in `AGENTS.md` ("well under 1 move per pour") is broken on exactly one twist. | `App.jsx` 2069-2091, `gameLogic.js` 12-17, 626 | MED | `MUST` — cap the combined refund at `< 1`, or exempt the daily from the `+0.25` |
| A-05 | `loadNormalRun` defaults missing `cards`/`buffer`/`drain`/`rule` to `0` but keeps the stored `moveLimit`, so an old save renders `Need N … = M Moves` where the rows do not add up to `M`. The comment at 1206-1212 asserts the sum still adds up; it does not, unless `moveLimit` is also recomputed. | `App.jsx` 344-380, `gameLogic.js` 1206-1220 | MED | `SHOULD` — either recompute `moveLimit` from the defaulted rows, or hide the `= M` line when the rows are known-incomplete |
| A-06 | The `saved.genUnderPar === undefined` compatibility branch is unreachable: `loadDailyRun` coerces the field to a boolean at `gameLogic.js:1132` before the check runs, so it is never `undefined`. Harmless today, actively misleading tomorrow. | `App.jsx` 3099-3101 | MED | `MUST` — delete, or move the coercion so the branch can fire |
| A-07 | `celebrateClearBurst` (2241) and the per-pour landing burst (2113-2122, deferred up to 120 ms on a tube solve) are scheduled independently, so on the winning pour the two can fire in either order and overlap. | 2113-2122, 2241 | LOW | `COULD` — needs a screenshot of the winning pour to judge |
| A-08 | The Exit dialog's save copy is stale in **two opposite directions at once**, and both are provable from the same code. (a) `App.jsx:3566-3568` tells the player "a normal run is saved too, but only at ROUND BOUNDARIES… a player who pours a few moves and then leaves has lost those moves" — but `saveNormalLive` (1915-1918) is called on **every pour, undo and hint** and `loadNormalRun` validates that `live` block (1244-1256), so those moves *are* saved. (b) The remaining branch, "Your run is saved exactly where you are" (3597), is shown even from the **upgrade screen**, where the save genuinely cannot cover the pending card pick and rewinds to the start of the round just cleared — which the comment at 3586-3596 explains in full and the string does not. | 3566-3568, 3586-3597, 1915-1918 | LOW | `SHOULD` — two strings, both already written in the comments beside them |
| A-09 | `normalSaveBaseRef.current` is assigned during render (1908-1911), not in an effect. Under StrictMode a discarded render still writes the ref. Harmless today because the value is pure derived state, but it is a render-phase side effect. | 1908-1911 | LOW | `COULD` — move to the same effect that writes the live save |
| A-10 | `useEffect(() => { backFromGameRef.current = onBackFromGame; })` has no dep array, so it runs on every render. | 3699 | LOW | `MUST` — one-line fix; `screenRef` at 1900-1901 is the correct pattern in the same file |
| A-11 | `computeStreak(dailyResults, shieldedDates)` runs during render at 5329 (and 411-418 / 3710), walking up to 36,500 `Date` objects. | 5329 | LOW | `COULD` — memoise on `[dailyResults, shieldedDates]`; real cost is unmeasured → `NEEDS RUNTIME` |
| A-12 | The stats persist effect writes `cascade:stats` on every `stats` change, and `stats` is touched by `recordMoves`, `recordCombo` and `recordRound` — i.e. a `localStorage` write per pour. | 1195-1197, 2127 | LOW | `SHOULD` — batch to the round boundary like the run save already is |
| A-13 | `screenShield` (5424) is raised on **every** `screen` change, including Home → game, so the first `SCREEN_SHIELD_MS` of the board is under a transparent input sink. On the upgrade screen this also covers the path picker. | 627-646, 5424 | LOW | `SHOULD` — only raise it for the transitions it exists for (dialog close, Home arrival), not for deliberate navigation |
| A-14 | `EMPTY_TAP_GUARD_MS` (2554) is declared inside the component body, so it is a **new binding on every render** rather than the module constant it reads as. Harmless today because nothing lists it in a dep array — but the first person to add it to one gets a callback that is re-created on every render, with no lint error to warn them, because `react-hooks/exhaustive-deps` treats a body-scope `const` as a legitimate dep. | 2554 | LOW | `MUST` — move it to module scope next to `SCREEN_SHIELD_MS` |

### 2.5 Contracts

| # | Contract | Holds? | Evidence |
|---|---|---|---|
| C-A1 | A daily's board, cards and move limit are identical for every player with the same upgrades. | **YES** `SOURCE` | `generateLevel` takes `seed` and threads `rng` through shuffle and auto-sort (969, 1013); `struggled`/`closeCall` recovery is disabled whenever `seed !== null` (971-972); `boardPar` takes no rng (913-945); the luck roll is `dailyLuckRoll(round, moves, date)` (2077) — `Math.random` is reachable only when `isDaily` is false |
| C-A2 | A daily resume regenerates a board whose inputs match the original run. | **YES** `SOURCE` | 3091-3102 passes `saved.round`, `saved.upgrades`, `saved.genPrevLeft`, `dailyRoundSeed(...)`, `prevUnderPar`, all of which are stored; `tubesMatchLevel` (3103) then refuses a position that is not a real position of the regenerated round |
| C-A3 | StrictMode double-invocation cannot double-apply a side effect. | **YES** `SOURCE` | Theme is resolved in a `try` and is idempotent; `stats` is written from an effect keyed on state, never from a `setStats` updater (1190-1194); `normalSaveBaseRef` is a pure snapshot; every `setTimeout`/`setInterval`/listener effect returns a cleanup |
| C-A4 | Score Attack never touches the normal or daily save. | **YES** `SOURCE` | `saveNormalLive` returns early unless `canAssist` (1916); `persistDailyRun` is gated on `isDaily`; `recordScoreRun` writes only `SCORE_RUNS_KEY` / `SCORE_BEST_KEY` (1516-1517) |
| C-A5 | Exiting mid-round and continuing restores moves spent, undo/hint counts and the already-drawn offer. | **MOSTLY — one hole** | The live position (tubes, moves, bonusMoves, combo, undoLeft, hintLeft) is written on every pour, undo and hint (1915-1918 → `loadNormalRun` 1244-1256); the offer is written at the round boundary in `chooseUpgrade`. **A-03** breaks the hint count specifically when `moves === 0` |
| C-A6 | No un-caught throw can blank the React root (there is no error boundary). | **YES, as far as reading goes** `SOURCE` | Every `localStorage` read in App is inside a `try`; `loadDailyRun`/`loadNormalRun`/`loadDailyState` all `catch` and return `null`. The two shape traps (`cascade:achievements`, `cascade:dailyResults`) are narrowed at 996-1014. Cross-module screens were **not** read in Phase 1 → `NEEDS RUNTIME` for those |
| C-A7 | Nothing gives a free retry. | **YES** `SOURCE` | `retriesLeft` is part of `normalSaveBaseRef` (1910) and is re-validated in `loadNormalRun`; `undo` and `useHint` both refuse on `canAssist` themselves (2744, 2717), not only on the counters |
| C-A8 | Hardware Back never silently destroys progress. | **YES** `SOURCE` | Capacitor listener 3440-3459 confirms before exiting; `popstate` 3461-3469 short-circuits on `confirmDialog`; 3696 re-pushes the history entry while the dialog is up |
| C-A9 | Every round is winnable. | **YES** `SOURCE` | `moveLimit = max(playPar, unclamped)` (1036). **But** see C-7: the *floor* holds while the *intent* (a comfortable buffer) does not |

### 2.6 Deep dives

**D1 — Toast lifecycle (`App.jsx:1200-1403`, `3817-3849`)**

Four moving parts: `showToast` (1214) replaces and re-arms; `dismissToast` (1234) cancels **both**
timers; the screen-change clear (1290-1293); and the per-board clear inside the first `[level]` effect
(1363). Ordering matters and is correct: the level-clear effect is declared *before* the `[level]`
effect that lays the tubes out (comment 1346-1350), so the announcement it raises is not immediately
taken down. `__id` (1217) makes every timer callback a no-op if its toast has been replaced or
dismissed early — this is the property that makes the whole thing safe, and it holds on all four paths.
One exemption, `toastKeepOnExitRef` (1288): a score run exited from the dialog raises its result toast
in the same tick it navigates, so the screen-change clear consumes the flag and returns instead of
dismissing. The level-clear honours the same flag because `restartRun` regenerates the level too.
`openExitDialog`'s 800 ms timer resets the flag if the popstate never arrives.
**Verdict: correct. `SOURCE`.** The one asymmetry worth a second opinion: `yieldArrivalToast` (1251)
reads `toast` off the render, so a tap that lands in the same frame as a replacement toast dismisses
the new one rather than the old. Sub-frame; not reachable by a human tap.

**D2 — Game state ownership (`762-923`, `1920-3080`)**

~60 `useState` in one component, no reducer. The board itself is consistent — `tubes`, `moves`,
`bonusMoves`, `comboCount`, `snapshots` are only ever written in `attemptPour`, `undo` and
`retry`/`startNewGame`. The risk is not a wrong board, it is **derived state that can disagree**:
`movesLeft` (925), `scoreDisplay` (939), `runArch` (947) and `streak` (5329). All four are recomputed
from state on every render rather than stored, which is the right call and is why none of them can
drift. The genuine ownership smell is `normalSaveBaseRef` (1908), which is a derived object held in a
ref **and** written during render — see A-09.
**Verdict: no correctness defect found. `SOURCE`.** If this file ever grows, the reducer refactor is
the first thing to do, but nothing in Phase 1 says it must be done now.

**D3 — Daily determinism and isolation (`gameLogic.js:415-463`, `576-624`; `App.jsx` throughout)**

Four streams packed into one integer — `(day << 14) | (round << 2) | stream`, run through `fmix32`,
a 32-bit bijection (441-446) — so unique inputs stay unique outputs and neighbouring days no longer
land on neighbouring PRNG streams. `DAILY_STREAM.archetype = 3` is reserved so the day's path can never
become a function of the round-1 card draw. Recovery levels are gated off for daily boards (971-972),
and `mutator` is passed `null` for every daily call site, so "same board for everyone" survives from
round 2. The mutation audit is clean: inside `isDaily` the only non-deterministic sources are
`Math.random` at 2078 (unreachable — the ternary picks `dailyLuckRoll` when `isDaily`) and the
particle spawner (cosmetic).
**Verdict: holds. `SOURCE`.** This is the best-tested area of the codebase.

**D4 — Score Attack recording (`App.jsx` 3604-3610, `gameLogic.js:1501-1528`)**

Recorded on loss, and on Exit **after** clearing at least one round; guarded by
`scoreRecordedTokenRef.current !== runTokenRef.current`, so a double exit cannot record twice, and a
restart invalidates the token. `recordScoreRun` loads the previous best from disk rather than deriving
it from the capped list (1505-1508) — correct, and an easy bug to have missed. Nothing in this path
reads or writes `cascade:normalRun` or `cascade:dailyRun`. `AGENTS.md` invariant 5 holds.
**Verdict: holds. `SOURCE`.** Only wrinkle is the same-millisecond tie at 1512 — see G-08.

**D5 — Capacitor events (`App.jsx:3440-3459`, `3461-3698`)**

The async import of `@capacitor/app` plus its `listener.add` is the shape that leaks on unmount, and
the `cancelled` branch at 3449 is the fix for it. The web build's `throw` at 3450 is swallowed, which
is correct — `popstate` already covers it. Confirm dialogs suppress Back rather than passing through
(3464-3469), and the history entry is re-pushed at 3696 so Back does not close the screen underneath
an open dialog. **Verdict: holds. `SOURCE`.** `NEEDS RUNTIME` for the real Android hardware-back path,
which cannot be exercised without a device.

**D6 — Persistence and save validation (`App.jsx:1908-1918`; `gameLogic.js:1052-1528`)**

Three independent save slots — daily state, daily run, normal run — each with its own key, its own
version tag (`v !== 1` rejects), its own shape validation, and a `catch` that returns `null` rather
than throwing. The design choice worth naming: **default, do not reject** (1206-1212, 1127-1133). A
save missing a field is repaired with a safe default so the run stays resumable; a save that is
structurally wrong is refused. That is the right line, and it is applied consistently.
The daily resume path is the strongest part: regenerate, then `tubesMatchLevel`, then adopt — never
trust a stored board. **Two holes:** A-03 (hint spend) and A-05 (breakdown vs. stored `moveLimit`).
**Verdict: sound, with the two holes above. `SOURCE`.**

**D7 — Navigation (`App.jsx:1511-1700`, `3693-3698`, `3808`, `3873`, `5129-5425`)**

Two screens (`home`, `game`) plus overlays that never change `screen`. Every overlay goes through
`useExitTransition` (95-117) so nothing unmounts mid-animation, and `screenShield` absorbs the
double-tap that used to land on whatever was underneath. The shield's cost is A-13: it fires on
deliberate navigation too, not only on the transitions it was built for.
**Verdict: correct. `SOURCE`.**

---

## FILE 3 — `src/gameLogic.js` (1528 lines)

### 3.1 Integrity

- **Module contract:** "Pure functions. No React, no state, no side effects (except Math.random default
  in shuffle)" (1-3). Checked and **true with one caveat**: the `localStorage` accessors
  (`1052-1296`, `1416-1485`) are side effects by definition, but they are all wrapped and none of them
  is reachable from a render body. `SOURCE`
- **Imports:** exactly one — `{ MAX_HEIGHT, UPGRADES, DAILY_TWISTS, OFFER_TUNING, CATEGORY_ORDER,
  ARCHETYPES, ARCHETYPE_OFFER_COUNT, FOCUS_OFFERS }` from `./constants` (5). All eight exist. ✔
- **Circular dependencies:** none. ✔
- **Dead code:** no unused function was found. `sumMoveBonus` is unused *by App* but used internally at
  1026. `pickDailyUpgrades` and `dailyArchetype` are used by App.
- **Export inventory (61):** 8 move helpers · 13 offer/pity helpers · 6 tube primitives · 1 hint ·
  10 daily seed/streak helpers · 6 auto-sort/score/twist · 6 weekly-mutator helpers · 13 economy
  constants/functions · 2 level generators · 11 save accessors · 4 score-attack accessors.
  Every export is either called by App or by another export in this file. ✔ `SOURCE`
- **The one thing a reader must not miss:** `DAILY_STREAM = { board: 0, upgrades: 1, luck: 2, archetype: 3 }`
  (439). All four streams fit in the low 2 bits, so the space is **full**. Adding a fifth stream
  silently requires widening the packing at 451. This is a locked invariant from `AGENTS.md` and the
  code enforces it by construction, not by a check.

### 3.2 Line-by-line trace

| Lines | Block | In | Out / effect | Verdict |
|---|---|---|---|---|
| 1-10 | header, `sumMoveBonus` | upgrades | Σ `UPGRADES.value` | OK |
| 12-30 | refund getters | upgrades | chance / every-N | see **G-01**, and the arithmetic in App C-2 |
| 33-58 | pool-filter rationale, Jackpot constants | — | — | see **G-01** (the "0.7 ceiling" text), **G-10** (the "thirteen"/"eight" counts) |
| 60-73 | `rarityWeight` | rarity | 9 / 6 / 3 / 1 | OK — the comment's post-mortem (63-70) matches the code; tiers are now distinct |
| 79-96 | `pickRandomUpgrades` | count, owned, rng, focus | `{upgrades, jackpotNearMiss}` | OK — Jackpot is drawn **before** `drawOffer` and committed as `pre`, so its odds do not depend on pool tuning (34-35) |
| 101-113 | `catOf`, `rarityOf` | id | cat / rarity | OK — both remap `wind_used` → `wind`, so a spent card still fills a category slot |
| 124-139 | `offersSinceRare`, `pityActive` | owned | n / bool | OK — derived from the card list, so it survives a reload with no extra state |
| 153-167 | `runArchetype` | owned, only? | `{cat, count}` \| null | OK — ties break on `CATEGORY_ORDER`, so two players with the same cards read the same name |
| 173-190 | `synergyCount`, `activeFocus` | owned, focus | n / focus | OK — focus expires at `FOCUS_OFFERS` cards, keyed off `owned.length` not a counter |
| 196-208 | `buildWeighted` | pool, owned, focus | repeat-count array | OK — integer weights, clamped to `3×`; see App C-4 |
| 224-264 | `drawOffer` + `RELAX` ladder | pool, count, owned, rng, opts | picked cards | OK — relaxing consumes **no random numbers** (257), so the daily stream is identical whichever path a day takes. `guard < 500` (246) is a real, if unreachable, backstop |
| 267-307 | tube predicates, `pour`, `isSolved`, `isOneMoveFromSolved` | tubes | bool / new tubes | OK — `pour` copies every tube (281) and never mutates its input; a partial pour puts the overflow back (289) |
| 309-334 | hint rationale, `HINT_SAFETY_CAP = 3000` | — | — | see **G-05** |
| 336-370 | `boardKey`, `isReachablySolvable` | tubes, cap | bool | OK — explores only one empty tube (352-355), correct because empties are interchangeable; **times out as "safe"** (362), which the comment argues for explicitly and defensibly |
| 372-385 | `findHint` | tubes | `{from, to}` \| null | see **G-05** |
| 388-395 | `shuffle` | array, rng | new array | OK — Fisher-Yates, does not mutate |
| 398-405 | `mulberry32` | seed | rng fn | OK |
| 407-413 | `dailyKey`, `dateToSeed` | date | "YYYY-MM-DD" / int | OK — UTC via `toISOString`, so it cannot shift with the device timezone |
| 415-463 | seed packing, `fmix32`, `dailyRoundSeed`, `dailyLuckRoll` | day, round, stream | uint32 | OK — see D3. `fmix32` is a bijection on 32 bits, which is what makes "unique in → unique out" true |
| 466-482 | `computeStreak` | results, shielded | number | see **G-07** |
| 484-525 | streak-shield load / reconcile / best-streak | storage | dates / int | OK — at most one shield per calendar month (505-506), and it only fires when yesterday was genuinely missed |
| 532-557 | `applyAutoSort` | tubes, count, rng | new tubes | OK — `rng` is threaded through, which is what keeps a daily's Auto-Sort deterministic |
| 559-574 | `dailyScore` | rounds log | score | OK — `100 × round + 10 × left`, with a `limit − moves` fallback for pre-`left` saves |
| 576-624 | twist cycle, `twistOrder`, `pickDailyTwist` | block | twist per day | see **G-06** |
| 626-643 | `LUCKY_DAY_BONUS = 0.25`, `twistMoveDelta` | twist, round | move delta | OK — the constant behind **A-04** |
| 645-794 | weekly mutators, legacy rotation, `weekMutator`, `mutatorById` | date / id | rule | OK — `mutatorById` exists precisely because a JSON round-trip drops the hook **functions** (774-790), and `blockOrder` swaps positions 0/1 only, so it provably cannot touch the last position (750-762) |
| 796-804 | `msUntilNextWeek` | now | ms | OK — built from the calendar, so no DST drift |
| 806-842 | the move-economy essay | — | — | see **G-02** |
| 843-857 | `MOVE_ECONOMY`, caps | — | constants | OK — this is the tuning surface; nothing else hard-codes a move number |
| 859-868 | `investmentBonus` | upgrades, round | 0…10 | OK — index in the card list **is** the round taken, so no state to persist |
| 869-886 | `RETRIES_PER_RUN`, `offerCount`, `isBossRound` | round | number | OK |
| 888-897 | `moveBudget` | round, par, prevLeft | `{base, buffer, drain, carry, boss}` | OK — see App C-1 |
| 899-946 | `boardPar` (weighted A*) | tubes, colorCount | par ≥ 1 | see **G-03** |
| 948-1050 | `generateLevel` | 8 params | level | see **G-04**; the recovery/colour math is verified in App C-6 |
| 1052-1075 | daily **state** (not the run) | — | storage | OK — date-keyed, so yesterday's state reads as `null` |
| 1077-1138 | daily **run** snapshot, save / clear / load | run | storage | OK — regenerates rather than stores the board (1087-1091); see **A-06** |
| 1140-1177 | `NORMAL_RUN_KEY`, `saveNormalRun`, `clearNormalRun` | run | storage | see **G-02** — the comment says "ROUND BOUNDARIES only" and the code now saves live positions too |
| 1179-1191 | `validLevel` | level | bool | OK — treats a corrupt level as "no save", which is the right failure mode |
| 1197-1261 | `loadNormalRun` | — | run \| null | see **A-05**, **G-02**; the live-block validation (1244-1256) is thorough, including a `moves < moveLimit + bonusMoves` off-by-one that correctly permits equality only on an offer |
| 1263-1284 | `tubesMatchLevel` | saved, level | bool | OK — multiset comparison per colour, so any real reachable position passes and nothing else does |
| 1286-1306 | `msUntilNextDaily`, `formatCountdown` | now, ms | ms, "HH:MM:SS" | OK |
| 1308-1372 | `isDeadUpgrade`, `pickDailyUpgrades` | id, owned, seed | bool / cards | see **G-01** (the stale `>= 0.7` text at 1318-1319) |
| 1374-1394 | `pickArchetypes`, `dailyArchetype` | count, rng / date | archetypes | OK — clamped (1385) so a retune past `ARCHETYPES.length` returns the whole set rather than a short picker |
| 1396-1435 | score-attack header, tries counter | — | int | OK — `bumpScoreTries` is a **read-modify-write** on localStorage (1431-1435); safe in a single-tab game, racy in two |
| 1437-1485 | `SCORE_RUNS_MAX = 8`, `loadScoreBest`, `loadScoreRuns` | storage | int / rows | OK — validated on the way **out** of storage (1478-1479), which is the correct direction |
| 1487-1528 | `recordScoreRun` | score, round | `{score, round, best, isNew, rank, ts}` | OK except the tie at 1512 — see **G-08** |

### 3.3 Calculations verified

All economy arithmetic is in **App C-1/C-2** (it lives in `MOVE_ECONOMY`, consumed here). What is
specific to this file:

| Quantity | Formula | Check |
|---|---|---|
| Daily seed uniqueness | `(day << 14) \| (round << 2) \| stream`, then `fmix32` | `day` is 14 bits (valid to ~2070), `round` is 12 (valid to round 4095), `stream` is 2 and **full**. `fmix32` is a bijection ⇒ no two inputs collide. **VERIFIED `SOURCE`** |
| Luck ceiling | `min(0.4, Σ 0.2/0.25)` | Best achievable is `0.2 + 0.25 = 0.45`, clamped to `0.4`. **The comment's "0.7 ceiling" and "0.2 + 0.35 = 0.55" (53-54, 1318-1319) are both stale** — see **G-01** |
| Investment growth | `min(10, max(0, round − 1 − indexOf("invest")))` | Taken after round `i+1`, first pays on round `i+2`. **VERIFIED `SOURCE`** |
| Streak loop | `for (i = todayDone ? 0 : 1; i < 36500; i++)` | Stops at the first missed day. A corrupt save cannot produce a 36,500-day streak, but it *can* make the loop run 36,500 iterations — see **G-07** |
| Weekly rotation seam | swap positions 0 and 1 only | `n ≥ 2`, so position `n−1` is never touched ⇒ `prevLast` needs no recursion. **VERIFIED `SOURCE`** |
| Twist cycle fairness | 4 checks, ≤2000 attempts | Falls back to the last **unfair** order — see **G-06** |
| `boardPar` fallback | `max(1, colorCount × 3 + 2)` | Reached only when the 60,000-node budget is exhausted. For `colorCount = 2` that is 8 moves, which is **plausible as a real par**, so a truncated search is not automatically an unwinnable board — but it is not a lower bound either |

### 3.4 Improvements

| # | Finding | Lines | Severity | Verdict |
|---|---|---|---|---|
| G-01 | Three comments state a luck ceiling of `0.7` and a `0.2 + 0.35` pair. The code caps at `0.4` and the cards give `0.2 + 0.25`. The `>= 0.7` test the comment says was once wrong **is** genuinely dead (a card at 0.55 could never pass it), so the fix is right and the explanation of it is wrong — a future tuner reading "0.7" would mis-scale every luck number. Separately, the 12-17 refund-ceiling comment is correct **only for normal runs**; the daily's Lucky Day raises the cap to `0.5` and breaks invariant 4 (see **A-04**). | 12-17, 53-54, 1318-1319 | MED | `MUST` — three comment fixes plus the A-04 cap change |
| G-02 | The move-economy documentation is wrong in three places, and one of the errors is load-bearing for a player-facing string. (a) `saveNormalRun`'s comment still says "Saved at ROUND BOUNDARIES only" and "Not persisting the mid-pour position is the deliberate half" (1146, 1154-1159) — both false since live saves landed; `App.jsx:3566-3568` repeats it to the player (**A-08**). (b) `AGENTS.md` says the buffer shrinks to +20% by round 8 and carry caps at 6; the code does +15% by round 6 and caps at 5. (c) The comment at 833 still reasons about "+80/+71/+63% of a 5–9 move board", which is the *pre-cut* number. | 833, 837-842, 1146-1159; `AGENTS.md` | MED | `MUST` — docs only, zero behaviour change, and (a) is a player-facing lie |
| G-03 | `boardPar`'s A* never discards a stale heap entry: `seen` is updated at 940, but `pop()` (922) can hand back a node whose `g` is worse than the best-known `g` for its key, and there is no `if (c.g > seen.get(key(c.T))) continue`. Consequence is bounded but real — the returned `par` is always **feasible** (it is a real path cost), but it is not guaranteed **minimal**, so `moveLimit` can be 1-2 moves above the true optimum. The `min()` at 1018-1021 already absorbs this for board-card rounds, which is why "~2% of Extra Tube boards, by 1-2" is described as search noise. | 921-944 | MED | `SHOULD` — one line; the error bound is the part to state, not just the fix |
| G-04 | `boardPar` runs **twice** on every round where the run holds Extra Tube or Auto-Sort (1002, then 1022), with a 60,000-node cap, synchronously, on the main thread, inside the render path that generates a board. Worst case is therefore ~120,000 expansions with a full board copy per successor (935). | 1002, 1022, 921-944 | MED | `SHOULD` — measure first. If it is over budget on a low-end phone, memoising `par` for the round removes half of it for free. **`NEEDS RUNTIME`** |
| G-05 | `findHint` runs a full bounded BFS **per candidate move** (381-383), and a 7-tube board has up to ~40 candidates, so the worst case is `40 × HINT_SAFETY_CAP` (3,000) expansions. The comment quotes ~5 ms average / ~50 ms worst **from the author's own machine**; a mid-range Android in a WebView is a different machine. | 340-385 | MED | `COULD` — the cap is one constant; measure on the target device before touching it. **`NEEDS RUNTIME`** |
| G-06 | `twistOrder` gives up after 2,000 attempts and returns whatever the last shuffle produced, with no check and no signal. Deterministic per block, so it would affect every player on that day identically rather than randomly — but the fairness rules it claims to enforce (586-595) would be silently violated, and nothing anywhere would notice. | 609-617 | LOW | `SHOULD` — one assertion or a widened attempt budget; the fallback should never be reachable |
| G-07 | `computeStreak` allocates a fresh `Date` per iteration (475) and can run 36,500 of them. Called from the render body at least three times per Home render. | 466-482; `App.jsx` 5329 | LOW | `COULD` — start from one `Date` and `setUTCDate` on a copy; memoise the caller. **`NEEDS RUNTIME`** for whether it is ever visible |
| G-08 | `recordScoreRun` identifies its own row by matching `ts` **and** `score` (1512). Two runs finishing inside the same millisecond with the same score make `findIndex` return the earlier of the two, so the results card can show the wrong rank. | 1512 | LOW | `COULD` — the returned `ts` is already the identity the card uses; the only fix needed is to carry a per-run nonce into the entry |
| G-09 | `loadNormalRun()` is called from the render body on **every Home render** (`App.jsx:684`) — a `JSON.parse` plus ~20 validations. The comment at 678-683 explains exactly why it cannot be memoised on `screen`, and is right; the cost of not memoising is never measured. | `App.jsx` 684 | LOW | `COULD` — a bump-counter, as the comment itself suggests. **`NEEDS RUNTIME`** |
| G-10 | The pool-filter comment says "at most five cards in this pool can be dead… at least eight of the thirteen stay eligible". The pool is filtered from `UPGRADES` at draw time and its size is a function of `constants.js`, so both counts are the kind of number that goes stale silently. | 49-52 | LOW | `MUST` — restate as "fewer than `count` are ever dead", or drop the numbers |
| G-11 | Per-successor full board copy in the A* inner loop (`c.T.map((t) => [...t])`, 935) and a `Set` + string-key build per node (336-338). Both are the hot path of the game's most expensive function. | 935, 336-338 | LOW | `COULD` — only after **G-04** is measured |

### 3.5 Contracts

| # | Contract | Holds? | Evidence |
|---|---|---|---|
| C-G1 | Every round is winnable — `moveLimit ≥ playPar`. | **YES** `SOURCE` | 1036. The **intent** (a playable buffer) is a separate question and is drifting early — App C-7 |
| C-G2 | Per-pour refunds stay well under one move per pour. | **NO, on daily Lucky Day** | Normal `0.983`; daily Lucky Day `1.083`. **A-04** |
| C-G3 | A daily is byte-identical for two players with the same cards. | **YES** `SOURCE` | Every draw goes through `mulberry32` seeded from `(day, round, stream)`; no `Math.random` is reachable when `seed !== null`; recovery is gated off (971-972) |
| C-G4 | A saved run from an older build still loads. | **YES, with one display defect** | Every loader defaults rather than rejects (1206-1221, 1237-1240, 1127-1133). The one defect is that defaulting `cards` while keeping `moveLimit` makes the on-screen sum wrong — **A-05** |
| C-G5 | Score Attack has no resume path. | **YES `SOURCE`** | 1405-1409: there is deliberately no `saveScoreRun`/`loadScoreRun`/`clearScoreRun`. The absence is the mechanism |
| C-G6 | The weekly rule a run resumes under is the rule it was generated under. | **YES `SOURCE`** | `mutatorId` is stored, re-resolved through `mutatorById`, and an id that no longer resolves **rejects the save** (1236) rather than silently switching rules |
| C-G7 | The daily stream space is fully allocated and `archetype = 3` is reserved. | **YES `SOURCE`** | 434-439; all four values are distinct in two bits, so the reservation is structural |

### 3.6 Deep dives

**D4 — `attemptPour` (lives in `App.jsx:1920-3080`, read for this audit)**

One `useCallback`, ~1,150 lines, and it is the only writer of `tubes`/`moves`/`comboCount` outside
`undo`. The order inside it is the thing that matters and it is correct: legality and flights →
landing simulation → landing feedback → luck/combo/mega → `setComboCount` → clear **or** loss
detection → the deferred round transition. Both outcomes are deferred behind
`Math.max(250, impactMs + 300)` so the last ball is on screen before a card covers the board (2523-2525).
The refunds are gated on `meaningful` (2081-2091), which is what stops a parking move from re-paying a
combo it did not earn — a real exploit that the comment documents and the code prevents.
**Verdict: no correctness defect. `SOURCE`.** Its structural cost is the dep array (A-01) and the
length itself, which is the strongest argument in this audit for the reducer refactor noted in D2.

**D5 — `generateLevel` (948-1050)**

Deterministic whenever `seed !== null`, and the determinism is threaded properly: `rng` reaches
`shuffle` (990) and `applyAutoSort` (1013). Both recovery signals — `struggled` and a `prevMovesLeft`
of 0-1 — are the player's own performance and are disabled for daily boards (971-972), which is
exactly the invariant that keeps "same board for everyone" true from round 2 onward rather than
round 1 only. The board-shape retry loop (989-995) runs at most 8 times and can still emit a
pre-solved tube; that is harmless (it makes the round easier, never unwinnable) and is deliberate.
The `min()` at 1018-1021 is the interesting one: it exists to stop an *approximate* solver from
raising the HUD par because of a card meant to help it, and the comment says so honestly.
**Verdict: correct. `SOURCE`.** Cost is the open question (**G-04**).

**D6 — Move economy (806-897)**

The essay at 806-842 is unusually good: it states the old formula, why it was wrong, which knob is the
safe one to turn and which are not, and — importantly — that its own target numbers are model output
rather than measured play (837-841). The formulas themselves are simple and verified (App C-1).
What the essay does not do is check itself against `AGENTS.md`, and the two disagree (**G-02**).
The substantive open question is not any single formula, it is the *sum*: App C-7 shows sudden death
arriving around round 7-9 for a cardless-to-average build against a documented target of 14-15.
**Verdict: formulas correct, documentation wrong, tuning target probably wrong. `NEEDS RUNTIME`.**

**D7 — Undo and hint snapshots**

Undo stores a snapshot per meaningful pour and restores `tubes`, `moves`, `bonusMoves`, `comboCount`,
and clears `flights`/`landing`/`hint` so restored balls drop in normally rather than inheriting a stale
landing delay (`App.jsx:2748-2753`). It refuses on `canAssist` itself (2744), not only on the counter,
so a score run cannot be rewound even if a future caller reaches the handler. Hint is weaker in two
specific ways: it is **not** snapshot-based (it is recomputed from the live board, which is correct and
cheaper), and its spend is not persisted when `moves === 0` (**A-03**).
**Verdict: undo is sound; hint has the one accounting hole. `SOURCE`.**

**D8 — Retry logic (`RETRIES_PER_RUN` at 869-875; `retriesLeft` through App)**

Two per run. Stored in `normalSaveBaseRef` (1910), re-validated on load with a default back to the full
allowance when absent (1239) — the right default, since such a save never spent one. Recovery boards
are one colour/tube easier for **one** round (`struggled` at 972), which is a real second-order
effect: it makes a retry slightly *more* valuable than a plain restart, so the third loss being final
is doing more work than the constant alone suggests. That is a design property, not a bug, and it is
not mentioned anywhere in the comments.
**Verdict: works as intended. `SOURCE`.** Worth a play-test to confirm the third loss actually ends
the run end-to-end — that path was read, not played.

---

# PHASE 1 SUMMARY

## What was actually verified

- **3 files, 6,991 lines, read in full.** No gaps. 114 blocks traced line by line.
- **19 imports checked** against the two files that declare them; all exist. 6 dead (`A-02`).
- **Every `localStorage` read** in `App.jsx` and every loader in `gameLogic.js` checked for an
  un-caught throw, since there is **no error boundary**. 20+ read sites, all guarded.
- **All 5 invariants in `AGENTS.md`** traced against code: 4 hold, **invariant 4 is broken on exactly
  one daily twist** (`A-04`).
- **Every balance formula recomputed by hand** from `MOVE_ECONOMY` (App C-1, C-2, C-7).
- **Every "invariant" the code comments claim for itself** checked against the code — this is where
  `A-05`, `A-06`, `G-01`, `G-02` and `G-10` came from: five places where a comment is confidently
  wrong.

## Findings

| Severity | Count | Ids |
|---|---|---|
| CRIT | 0 | — |
| HIGH | 0 | — |
| MED | 11 | A-01…A-06, G-01…G-05 |
| LOW | 14 | A-07…A-14, G-06…G-11 |

**The four that actually matter, in order:**

1. **A-04 — daily Lucky Day refunds 1.083 moves per pour** (`App.jsx:2069-2091`, `gameLogic.js:12-17, 626`).
   The daily's luck cap is 0.5, not 0.4, so the ceiling the comment carefully computes as `~0.98`
   becomes `1.083`. Per-pour refunds then exceed the move they refund, on the one twist whose whole
   identity is extra moves. This is a one-constant fix and a real balance hole.
2. **A-03 — a hint can be re-spent after Exit → Continue** (`App.jsx:2729`). `saveNormalLive` is
   skipped when `moves === 0`, so the deduction exists only in memory. Invariant 3, one `if` away.
3. **App C-7 — sudden death arrives far earlier than documented.** With no cards, the inequality
   `buffer + carry < drain` is already true on **round 3**. With average cards and carry, the
   crossover lands around rounds **7-9**, against a target of 14-15 in the source comment and 15-25 in
   `AGENTS.md`. The `moveLimit ≥ playPar` floor still holds — every round stays winnable — but the
   *intent* of the buffer is gone by round 10. **This is arithmetic from the constants, not a
   simulated run**; `boardPar` was never executed, so the real round is `NEEDS RUNTIME`. It is the
   biggest open question in Phase 1 and it is a **one-number** question.
4. **G-04 — `boardPar` can run twice per board** (`gameLogic.js:1002, 1022`), 60,000 nodes each,
   synchronously, inside board generation. `NEEDS RUNTIME`.

## What this audit could NOT establish

Stated plainly, because a Phase 1 read-only pass cannot settle any of these:

- **Nothing was built, linted or run.** `npm run build`, `npm run lint`, `git status`, `pwd` and
  `grep` all failed or timed out in this session. There is **no** build result, **no** lint result and
  **no** runtime result anywhere in this document.
- **No timing was measured.** `G-04` (boardPar twice), `G-05` (hint BFS per candidate), `G-07`
  (streak loop), `G-09` (`loadNormalRun` per render) and `A-01`/`A-11` are all flagged
  `NEEDS RUNTIME`. The ~5 ms / ~50 ms figures quoted in `gameLogic.js:331-332` are the **author's**,
  on the author's machine, and are quoted here as claims, not measurements.
- **No gameplay was played.** The eight-point play-test list in `AGENTS.md` was not executed. D8's
  "third loss ends the run", C-A5's resume path and the toast lifecycle were verified by reading
  control flow, not by observing them.
- **No screen outside `App.jsx` was read.** `Tube`, `FlyingBalls`, `UpgradeCard`, `HomeScreen`,
  `CodexScreen`, `AchievementsScreen`, `Tutorial`, `SettingsScreen`, `TodayGoal`, `FriendCompare`,
  `shareCard`, `sound`, `notifications`, `theme`, `globalStyles`, `codex`, `icons`, `leaderboard` — all
  out of scope for Phase 1. Their props were checked for *existence* only.
- **`constants.js` was read for context, not audited.** Every number this report reasons about
  (`UPGRADES` values, `OFFER_TUNING`, `DAILY_TWISTS`, `ARCHETYPES`, `MAX_HEIGHT`) is taken on trust.
  If a tuning constant is wrong, C-1/C-2/C-4/C-6 are all wrong with it. Phase 2.
- **The Android build was not exercised.** Capacitor back/exit (`D5`) is verified as source only.

## Recommended order of work

Per `AGENTS.md` rule 3 (at most 5 changes per batch, build and test between batches):

- **Batch 1 — correctness, no balance change (5 items):** A-03, A-06, A-10, A-02, A-14.
  All five are one- or two-line deletions and one `if`. Nothing here can alter balance, so a build
  plus the 8-point play-test is a sufficient gate.
- **Batch 2 — the balance hole (2 items):** A-04's cap, then **measure** the sudden-death round before
  touching a single `MOVE_ECONOMY` number. Instrument `generateLevel` to log `round`, `unclamped`,
  `playPar` and `suddenDeath` for 5-6 real runs and write the numbers down. Rule 4: before and after.
- **Batch 3 — documentation only, zero behaviour (5 items):** G-01, G-02, G-10, plus the `App.jsx`
  half of G-02 (A-08's two strings). Fixing these *before* Batch 2 is deliberate: rule 4 asks for
  before/after numbers, and the current docs would misstate both.
- **Batch 4 — measure, then maybe change:** G-04 (profile board generation), G-05 (profile a hint),
  G-09/G-07 (profile Home). Change nothing until there is a number.
- **Not recommended without a design discussion:** A-01 (needs a dep-array cleanup pass), the
  reducer refactor in D2, A-12 (batching stats writes changes when stats are recorded).

---

**Phase 1 complete. 11 MED, 14 LOW, 0 CRIT/HIGH. No source file was modified.**
**Phase 2 has not been started.**

---
---

# PHASE 1 — FIX BATCHES

## PRE-CHECK — SHELL STATUS

**SHELL DEAD — build/lint not possible.**

Every command in this session hangs and is killed by the tool timeout, including
a bare `true` and `echo alive`:

| Command | Timeout | Output |
|---|---|---|
| `echo alive` | 20,000 ms | none |
| `true` | 15,000 ms | none |
| `npm run build 2>&1` | 600,000 ms | none |
| `npm run lint` | 45,000 ms | none |
| `git status`, `git log` | 60,000 ms | none |
| `grep` / `rg` | — | `ripgrep execution failed` |

**Consequence, stated once and applying to every batch below:** there is **no
build result, no lint result and no runtime result** in this file. Every fix is
`VERIFICATION SKIPPED — shell dead`. Each one was verified by **reading the
edited region back after writing it**, which catches a botched edit but cannot
catch a syntax error, a typo'd identifier or a broken import. The owner must run
the build. Nothing here is a claim that the app works.

---

## BATCH 3 — DOCUMENTATION

Status: **DONE (verification skipped)**

Run first, deliberately: the balance batches compute before/after numbers from
these numbers, and three of them were wrong.

### Fixes applied

| # | File:Line | Before | After | Verified? |
|---|---|---|---|---|
| G-01a | `gameLogic.js:12-17` | "the most a run can stack is 0.40 + 0.33 + 0.25 = ~0.98" — stated as if it were the global ceiling | Same, narrowed to **NORMAL run**, plus a new paragraph stating the daily Lucky Day's actual ceiling is `0.50 + 0.33 + 0.25 = ~1.08`, i.e. **above** one move per pour, and naming `App.jsx`'s `luckyChance` as where the cap lives | read back ✔ · SKIPPED build |
| G-01b | `gameLogic.js:53-55` | "Super Lucky is never among them: getLuckyChance's 0.7 ceiling is only ever a clamp, and 0.2 + 0.35 = 0.55 never reaches it" | Pool/dead counts corrected (see G-10), and Super Lucky corrected: it **is** dead when Lucky Drop is already owned, because the chance is `LUCK_CAP` (0.4) either way | read back ✔ · SKIPPED build |
| G-01c | `gameLogic.js:1331-1339` | "getLuckyChance's 0.7 ceiling, which is only ever a CLAMP: the two luck cards sum to 0.2 + 0.35 = 0.55, so the old `>= 0.7` test could never be true" | `LUCK_CAP` is **0.4 and reachable** (`0.2 + 0.25 = 0.45` clamps to 0.4), which is why the test is an **equality** on before/after chance. Records that a threshold test would now be wrong in the *opposite* direction | read back ✔ · SKIPPED build |
| G-02a | `AGENTS.md:44` | `spare: +80% of par on round 1 → +20% by round 8` | `buffer (was called "spare"): +50% of par on round 1 → +15% by round 6` — matches `bufferStart`/`bufferEnd`/`bufferRound` | read back ✔ |
| G-02b | `AGENTS.md:47` | `carry: … max 6` | `max 5` — matches `carryCap` | read back ✔ |
| G-02c | `AGENTS.md:51` | `Per-pour refunds are capped (luck ≤ 40%)` | `luck ≤ 40% in a normal run, ≤ 50% on a daily Lucky Day` — the second number is what `App.jsx:2070` does | read back ✔ |
| G-02d | `AGENTS.md:40` | `+ spare − drain` | `+ buffer − drain`, matching the renamed bullet | read back ✔ |
| G-02e | `AGENTS.md:109-111` | "Target feel: average player dies around round 15–25" — stated as fact | Kept, with a `⚠️ UNVERIFIED (C-7)` block below it recording that the number has never been measured and that the constants' arithmetic puts sudden death at round 3 cardless / rounds 7–9 average. Names the four fields to log | read back ✔ |
| G-10 | `gameLogic.js:56-62` | "At most five cards in this pool can be dead … at least eight of the thirteen stay eligible" | Corrected by **counting `UPGRADES`**: the normal pool is **fifteen** (18 cards, minus `jackpot`, `wind` and `dawn`), and at most **ten** can be dead at once (`clear`, `mega`, `combo3`, `combo2`, `glass`, `invest`, `tube`, `auto`, `lucky`, `lucky2`), leaving **at least five** eligible. The conclusion still holds (5 > 3 needed); the margin is 5, not 8. The parenthetical records the old numbers | read back ✔ · SKIPPED build |
| G-02f | `gameLogic.js:1159-1176` | "Saved at ROUND BOUNDARIES only … Not persisting the mid-pour position is the deliberate half" | Rewritten: the **level** is stored verbatim (still true, still the reason it is cheap), and the **live position** is stored on every pour/undo/hint — which it has been since `App.jsx:2205-2206` | read back ✔ · SKIPPED build |
| A-08a | `App.jsx:3566-3577` | "A normal run is saved too, but only at ROUND BOUNDARIES … a player who pours a few moves and then leaves has lost those moves" | Corrected to what the code does: live saves on every pour/undo/hint, plus the solved board **with the offer** at the clear; the boundary save in `chooseUpgrade` re-writes the same thing with the pick resolved | read back ✔ · SKIPPED build |
| A-08b | `App.jsx:3588-3603` | Comment claimed the save "cannot cover" the upgrade screen | Comment corrected — see the correction below. **The player-facing string was left exactly as it was** | read back ✔ · SKIPPED build |

### Correction made DURING this batch — read this

The audit's A-08 was **wrong**, and the original string was **right**.

I drafted A-08 from `gameLogic.js:1146-1159` and `App.jsx:3586-3596` alone and concluded the Exit
dialog was lying to the player on the upgrade screen. Before shipping a replacement string I went to
find what actually happens at a normal round's solve — and found `App.jsx:2222-2227`:

```js
if (solvedOffer && canAssist) {
  saveNormalLive({
    tubes: next, moves: newMovesUsed, /* … */
    offer: solvedOffer.upgrades.map((u) => u.id),
    jackpotNearMiss: solvedOffer.jackpotNearMiss,
    clearedLeft: …, clearedUnderPar,
  });
}
```

**The offer IS persisted, at the moment the board is solved**, before the upgrade screen exists. The
comment above it (2208-2211) says why: a live save one pour *before* the solve used to let a player
leave, come back, pour once, and re-roll the cards as often as they liked. So:

- "Your run is saved exactly where you are, and resumes from Home" is **literally true** on the
  upgrade screen — the save holds the cleared board, the offer, and the moves left at the clear.
- What is *not* saved is the **pick**, which is correct by design: the next board depends on it.
- I had already written a replacement string claiming the player "loses that round's moves and the
  card you hadn't picked yet". **That string was untrue and was reverted.** Only the surrounding
  comment was corrected.

**What this changes in the audit:** A-08 is not "the string lies". It is **three comments in two files
that contradict each other and the code** — `gameLogic.js:1146`, `App.jsx:3566-3568` and
`App.jsx:3586-3596` were all describing a design that the live-save work replaced. All three are now
correct. The finding's *severity* was right (LOW, copy-only) but its *content* was wrong.

**Still unverified, and it is the thing to actually test:** whether resuming from a saved `offer`
restores the three cards *and* feeds the next round the correct `lastRoundMovesLeft`. Those two are
set at `App.jsx:2363-2364`, i.e. inside the transition timer that runs **after** the offer is saved,
so the saved snapshot carries the *previous* round's leftover. Whether that matters is a runtime
question and is now **AUD-v2 item 1**. I have not traced the resume-from-offer branch far enough to
answer it, and I am not going to guess.

### Build

SKIPPED — shell dead.

### Lint

SKIPPED — shell dead.

### Notes

- **Zero logic changed. Zero constants changed.** Every edit above is inside a `/* … */` comment, a
  markdown file, or the comment attached to a string I then left untouched. `App.jsx` went 5428 →
  5434 lines and `gameLogic.js` 1528 → 1550, both comment-only growth.
- **Not verified:** that any of these files still parse. A stray `*/` inside a comment would break
  the build and I cannot run one. The owner should build before anything else.
- **Not verified:** that the new Exit-dialog wording is what the owner wants to read. It is my
  sentence, and the owner is the one who decides what the game says to players.
- **One thing I chose not to do:** `gameLogic.js:12-17` now documents the daily Lucky Day's 1.08
  refund ceiling as a live bug. That is accurate today, and it becomes **wrong the moment Batch 2
  fixes A-04**. Batch 2 must revisit that paragraph.

---

## BATCH 1 — CORRECTNESS

Status: **PARTIAL — 4 of 5 items done. A-02 deferred.**

Ordered second despite being "batch 1", because Batch 3 was the one the owner asked to run first.

### PRE-CHECK — SHELL STILL DEAD

**SHELL DEAD — build/lint not possible.** Re-checked at the start of this batch, not assumed:

| Command | Timeout | Output |
|---|---|---|
| `echo alive && date` | 20,000 ms | none |
| `echo alive` (re-check) | 15,000 ms | none |
| Grep tool, `src/App.jsx` | — | `ripgrep execution failed` (twice) |

**Worse than Batch 3: the grep tool is now dead as well**, which is why one item is deferred below.
Read and Edit both still work, so every change here was verified by reading the edited region back
after writing it. That catches a botched edit and a wrong line reference. It cannot catch a syntax
error, a typo'd identifier, or a build break. **There is no build result, no lint result and no
runtime result anywhere in this section.**

### Fixes applied

| # | File:Line | Before | After | Verified? |
|---|---|---|---|---|
| A-03 | `App.jsx:2743-2763` | `if (moves > 0) saveNormalLive({ …, hintLeft: hintLeft - 1, … })` | Guard removed; the save is written unconditionally | read back ✔ · SKIPPED build |
| A-06 | `App.jsx:3128-3145` | `saved.genUnderPar === undefined ? saved.upgrades.includes("clear") && saved.genPrevLeft >= 5 : saved.genUnderPar === true` | `saved.genUnderPar === true` — the unreachable arm deleted | read back ✔ · SKIPPED build |
| A-14 | `App.jsx:207-229` (moved) + `2566-2569` | `const EMPTY_TAP_GUARD_MS = 1200;` declared inside the component body | Moved to module scope, in the timing-constant block next to `WIN_BALL_SLOW_MS` / `ACH_TOAST_MS`, with its reasoning | read back ✔ · usage confirmed still resolves (`App.jsx:2593`) · SKIPPED build |
| A-10 | `App.jsx:3752-3774` | Missing dep array on `useEffect(() => { backFromGameRef.current = onBackFromGame; })` | **Deliberately NOT changed** — see the deviation below. Comment added recording why | read back ✔ · behaviour identical |

### A-03 is worse than the audit recorded — read this

The finding says the hint spend is lost "on the last move of a round, or on any round where
`moves === 0`". **That reading is wrong, and it makes the bug sound like an edge case when it is the
opposite.**

`moves` in this file is moves **USED**, not moves remaining — `attemptPour` calls
`setMoves(newMovesUsed)` (`App.jsx:2162`), and `movesLeft` is derived separately. So
`if (moves > 0)` does not mean "the player has moves left"; it means **"the player has poured at
least once this round"**.

Which means the gate skipped the save for the whole of move zero — **the first hint of every round**.
That is the most-tapped button in the game, not a corner case. Exit → Continue returned the hint, on
the most common hint, in every normal run. `saveNormalLive` was never the problem: it guards only on
`canAssist` (`App.jsx:1916`) and was happy to write `moves: 0`.

The fix removes the guard rather than widening it. The guard it was imitating does not apply:
`attemptPour` gates on `!isSolved(next) && newMovesLeft > 0` because saving an already-solved board,
or one with no moves left, would resurrect a finished round. A hint can do neither — the board is
unchanged and legal by construction, since `findHint` only returns a move that keeps it winnable.

### Deviation: A-10 was left unchanged, against the audit's `MUST`

The audit's verdict is `MUST` — add a dep array, copying `screenRef` (`App.jsx:1900-1901`). **I did
not, and this is a considered disagreement rather than an oversight.**

`screenRef` holds a primitive with one enumerable dependency, so `[screen]` can be exhaustive by
inspection. `backFromGameRef` holds a **function**. `onBackFromGame` reads `phase`, `moves` and
`round`, then calls `saveBestRound`, `restartRun`, `setScreen` and `openExitDialog` — which between
them reach `round`, `best`, `canAssist` and more.

A dep array on any honest *subset* of that list turns this line from **always current** into **current
until I forget something**. A missed entry is a stale closure on the hardware-back path: Back reading
a pre-gameover `phase`, or invoking a stale `openExitDialog`. And `react-hooks/exhaustive-deps` is
exactly the check I cannot run right now, so a wrong list would ship **unflagged**.

One assignment per render to one ref field is not a performance problem; it is the standard
latest-ref idiom. Leaving it is the lower-risk choice *given no linter*. If the owner wants it
changed, it should be done in the same pass as a real `npm run lint` so the dependency list can be
checked rather than guessed.

### A-02 — DEFERRED, and the honest reason

Six dead imports (`sumMoveBonus`, `shuffle`, `mulberry32`, `applyAutoSort`, `MOVE_ECONOMY`,
`MAX_HEIGHT`). The audit marks this `MUST` and calls it free.

**I did not do it, because I cannot prove the symbols are unused.** Deleting an import that is still
referenced is an immediate build break, and proof of absence needs a search across all 5,503 lines.
The grep tool is dead and the shell is dead, so the only way to search is to read the entire file by
hand. That is not a good use of the remaining budget in a batch, and it would very likely have run
the context out mid-batch.

The deciding factor is that **this audit has already been caught being wrong once, by me, in this
same session** — A-08's central claim ("the save cannot cover the upgrade screen") is false, because
`App.jsx:2222-2227` persists the offer at the solve. So "Phase 1 read the whole file" is evidence,
but it is not proof, and `MAX_HEIGHT` in particular is plausible in tube-slot maths.

**This is one command for the owner, and it settles it in a second:**

```bash
for s in sumMoveBonus shuffle mulberry32 applyAutoSort MOVE_ECONOMY MAX_HEIGHT; do
  echo "== $s: $(grep -c "\b$s\b" src/App.jsx) in App.jsx, $(grep -c "\b$s\b" src/gameLogic.js) in gameLogic"
done
```

Anything with a count of exactly 1 in `App.jsx` is import-only and safe to delete. Anything higher —
including a count that is only comments — needs a look first. The audit's specific warning that
`MOVE_ECONOMY` appears *only in comments* is the one to re-check, because comments referencing a
deleted import are harmless but also mean the name is worth keeping in mind.

### Build

SKIPPED — shell dead. The owner is running this.

### Lint

SKIPPED — shell dead. This matters more than usual for this batch: **A-10 is a lint-shaped finding**
and the fix I declined is exactly the kind exhaustive-deps would flag. Expect at least that one
warning from the linter, and treat it as already-adjudicated above rather than as a new problem.

### Notes

- **Three of the four changes are behaviour changes**, and one is not. A-03 removes a guard that was
  suppressing a write; A-06 deletes a branch that could never execute; A-14 moves a constant and
  cannot change behaviour at all. None of them touches balance, which was the gate for this batch.
- **Not verified:** that this file still parses. If a `*/` landed inside one of these comments the
  build breaks and I cannot detect it. **Build first, before Batch 2.**
- **A-05 (`Need N … = M Moves` not adding up on old saves) was deliberately left alone** — it was not
  in this batch's five, it changes what a player sees, and it needs a decision about whether to
  recompute `moveLimit` or hide the line.
- **A-04 and C-7 are still open** and are Batch 2. Batch 2 must also revisit the `gameLogic.js:12-17`
  paragraph written in Batch 3, which documents the daily refund ceiling as a live bug and becomes
  wrong the moment A-04 is fixed.

---

## BATCH 2 — THE BALANCE HOLE

Status: **DONE (measurement still owed by the owner)**

### PRE-CHECK — SHELL DEAD

**SHELL DEAD — build/lint not possible.** Unchanged from Batches 3 and 1: `echo alive && date` (20s)
and `echo alive` (15s) both hang with no output, and the grep tool fails outright. Read/Edit work.

**This is the batch where that hurts most.** Batch 2 was supposed to open with *measure, then
change*. The measurement is the one thing only the owner can do. So the ordering constraint from
`AGENTS.md` rule 4 was inverted by necessity: **A-04 was fixed (it is a provable arithmetic bug, not
a judgement call), and `MOVE_ECONOMY` was left completely untouched** — C-7 still has to be measured
before any tuning number moves.

### Fixes applied

| # | File:Line | Before | After | Verified? |
|---|---|---|---|---|
| A-04 | `App.jsx:2120-2121` | `Math.min(0.5, getLuckyChance(runUpgrades) + (… LUCKY_DAY_BONUS : 0))` | `Math.min(LUCK_CAP, …)` | read back ✔ |
| A-04 | `App.jsx:20` | `LUCK_CAP` not imported | Added to the `./gameLogic` import list | read back ✔ |
| C-7 | `gameLogic.js:1058-1093` | No instrumentation | One `console.log` per `generateLevel`, printing `round`, `mode`, `unclamped`, `playPar`, `limit`, `suddenDeath`, `buffer`, `carry`, `drain`, `boss`, `cards`, `rule` | read back ✔ · **not yet run** |
| G-01/G-10 | `gameLogic.js:15-29` | Batch 3's text described the 1.08 daily ceiling as a live bug | Rewritten to describe the fixed state, and to be honest that ~0.98 is *under* 1 but not "well under" it | read back ✔ |
| G-01/G-10 | `gameLogic.js:64-93` | **Batch 3's dead-card count was wrong** — see below | Corrected, with the reasoning written out | read back ✔ |

### A-04 — before and after (rule 4)

The ceiling on a Lucky Day, per meaningful pour, with both luck cards + Combo Master + Mega Bonus
(the only build that reaches the ceiling):

| | Luck | Combo Master | Mega Bonus | **Total per pour** |
|---|---|---|---|---|
| **Before** | 0.50 | 1/3 = 0.333 | 2/8 = 0.25 | **1.083 — over 1** |
| **After** | 0.40 | 1/3 = 0.333 | 2/8 = 0.25 | **0.983 — under 1** |

Over 24 meaningful pours, which divides evenly by 3 and 8 and so is the honest comparison:

| | Lucky drops | Combo bonuses | Mega bonuses | Moves back | Spent |
|---|---|---|---|---|---|
| **Before** | 12 | 8 | 3 × 2 = 6 | **26** | 24 |
| **After** | 9.6 | 8 | 3 × 2 = 6 | **23.6** | 24 |

Before, every pour came back with more than it cost and the round was unwinnable. That is invariant 4
in `AGENTS.md` broken on exactly one twist — on the twist whose entire identity is giving away extra
moves.

**Why the cap, and not "drop the twist's bonus":** `twistMoveDelta` has no `case "lucky"`; it falls
to `default: return 0`. So the +0.25 chance **is** the whole twist. Removing it (the audit's second
option) would ship a daily twist that does nothing at all, on a day every player can look up.

**Lucky Day keeps its meaning under the new cap.** With no luck card it is 0.25 against a normal 0.
With Lucky Drop it is the full 0.4 against a normal 0.2. It adds nothing only on a run already
holding *both* luck cards, because that run is already at the cap.

**One constant, not a literal.** The bug existed because the caller had its own `0.5`. Typing `0.4`
would leave two copies of the same fact to drift apart again, which is exactly the trap A-02 records
about `MOVE_ECONOMY` surviving as a number in a comment. `getLuckyChance` already clamps to
`LUCK_CAP`, so the outer clamp is only ever about the twist's bonus on top.

**Daily determinism is untouched.** `dailyLuckRoll` is unchanged, so the roll for a given (day, round,
pour) is identical, and two players on the same day with the same cards still see the same drops.
Invariant 1 holds.

### C-7 — instrumented, but NOT measured

The log prints the full inequality (`buffer + carry + cards + rule` vs `drain`) rather than only the
four fields the audit asked for, because `unclamped` and `playPar` alone cannot be acted on: you
cannot tell from them whether a round crossed because the drain grew, the carry ran out, or the cards
stopped paying. `mode` separates daily from normal, and a daily regenerates its level on resume, so
its boards repeat and would otherwise be double-counted.

**This is instrumentation, not a result.** No number in this document is a measurement of when sudden
death actually lands. Phase 1's arithmetic (round 3 cardless, rounds 7-9 average) remains
`NEEDS RUNTIME`, and the C-7 warning added to `AGENTS.md` in Batch 3 still stands.

**Owner: play 5-6 runs, paste the `[C7]` lines.** The block is fenced by
`C-7 INSTRUMENT` / `END C-7 INSTRUMENT` comments so it can be deleted in one go. It is a bare
`console.log` — no `debugger`, no dev-only gate, no behaviour change.

### Correction: Batch 3's dead-card count was wrong, and I caught it mid-edit

Batch 3 recorded G-10 as "at most **ten** of the fifteen can be dead, leaving at least **five**". That
number was taken on trust from the audit's prose and never checked against `isDeadUpgrade`. Reading
the actual switch (`gameLogic.js:1392-1419`) shows **at most THREE** can ever be removed:

- `clear`, `mega`, `combo2`, `glass`, `invest` are all `owned.includes(id)`, and a card can only be a
  *candidate* if the run does not own it — so for a candidate those tests are false by construction.
  A run owning Perfect Clear does not get it filtered out; it never sees it as a candidate at all,
  which is `drawOffer`'s `owned` handling doing a different job.
- `lucky` and `lucky2` can **never** be filtered. The test is
  `getLuckyChance([...owned, id]) === getLuckyChance(owned)`, and a candidate is always unowned, so at
  most one of the pair is owned and the chance is at most 0.25; adding the other always moves it
  (0→0.25, 0.2→0.4, 0.25→0.4). Never a tie.
- Only `combo3` (once `combo2` is owned), `tube` and `auto` (at `BOARD_CARD_CAP`) can fire.

So: three of fifteen removed, **twelve** eligible against the three an offer needs. Batch 3 also
claimed Super Lucky is dead whenever Lucky Drop is owned — wrong, and self-contradictory two
sentences later in the same comment. Both are corrected in place now.

**And a near-miss worth reporting:** while fixing that comment I dropped its closing `*/`, which
would have made the file fail to parse on the very next build. Read-back caught it immediately and it
is fixed (verified: the block closes at `gameLogic.js:93`). This is the whole argument for not
skipping read-back when there is no compiler — it caught, in about ten seconds, exactly the class of
error nothing else here could have.

### Build

SKIPPED — shell dead. **Run this before anything else; `App.jsx` gained an import and both files
gained comment blocks.**

### Lint

SKIPPED — shell dead. Expect the `A-10` exhaustive-deps warning from Batch 1, already adjudicated.

### Notes

- **`MOVE_ECONOMY` was not touched.** That was the point of the batch order, and it is deliberate, not
  an omission. Nothing here retunes buffer, drain, carry or the buffer taper.
- **Two changes are behaviour, two are documentation, one is instrumentation.** Only A-04 touches
  gameplay, and only for the daily Lucky Day.
- **The daily's own `isDeadUpgrade` path is different** — it filters `dailyOnly` cards through the
  same function, so `wind` is in scope there and `wind_used` handling matters. Not touched here.
- **Not verified:** that either file still parses beyond the one block I re-read. The `*/` slip above
  is a live demonstration that this is a real risk, not a theoretical one.
- **Not tested:** Lucky Day specifically. Nobody has played a Lucky Day before and after this change
  to confirm the twist still *feels* like the generous day it is meant to be. The arithmetic is
  right; the feel is unmeasured.

---

## BATCH 4 — PERFORMANCE

Status: **BLOCKED — and deliberately so. Nothing changed.**

The batch's own instruction was "measure, then maybe change: G-04, G-05, G-09/G-07. **Change nothing
until there is a number.**" There is no number, because the shell is dead and nothing can be profiled
or played. So this batch changes nothing, and the one thing worth recording is *why* each item is not
already obviously fixable.

| # | Item | Status | Why it is not a safe blind fix |
|---|---|---|---|
| G-04 | `boardPar` can run twice per board | **Not a redundancy** — see below | The two calls are on **different boards**, so "call it once" would be a bug |
| G-05 | `findHint`'s BFS per candidate | `NEEDS RUNTIME` | The cap (`HINT_SAFETY_CAP = 3000`) is a deliberate timeout-as-safe trade; lowering it changes which hints exist |
| G-09 | `loadNormalRun` on every Home render | **Deliberate, documented** | `App.jsx:699-707` already explains why a `useMemo` here would be *wrong* |
| G-07 | `computeStreak` walking up to 36,500 `Date`s | `NEEDS RUNTIME` | Needs a real streak history to cost anything measurable; a fresh install has one entry |

### G-04 is the one that would have been easy to get wrong

The audit reported "`boardPar` can run twice per board, 60,000 nodes each, synchronously, inside board
generation" and rated it the fourth-biggest finding. Read against the code
(`gameLogic.js:1035` and the `par` assignment above it), the two calls are **not** redundant:

```js
const playPar = extraTubes || autoSortCount ? Math.min(par, boardPar(tubes, colorCount)) : par;
```

The first `boardPar` measures the board **before** board cards apply; this one measures **after**
`applyAutoSort` has run. They are different positions, so collapsing them into a single call would
make `playPar` wrong — and `playPar` is what the HUD shows as "target", what Perfect Clear compares
against, and what the `moveLimit ≥ playPar` floor is built on. Saving one search would silently change
the target the player is shown on every board with Auto-Sort or Extra Tube.

When `autoSortCount === 0` and there is no Extra Tube, the ternary already skips the second call
entirely. So the common early board pays one search, not two.

**This is not a finding to fix. It is a finding to measure.** If it turns out to be slow, the fix
belongs in `boardPar`'s node budget, not in removing a call. Do not "optimise" this one.

### G-09 is already a documented decision, not an oversight

`App.jsx:708` reads `loadNormalRun()` on every render while Home is showing. That looks like a missing
`useMemo` next to `resumeRound` directly above it, which has one. The comment at 699-707 gives the
reason it must not have one: `clearNormalRun()` is called from three places and only two of them also
change `screen`, so a `screen`-keyed memo would hand Home a save that was deleted a render earlier.
Making the memo correct needs a bump-counter threaded through all three clear sites — more machinery
than the read it saves.

**Left alone deliberately.** If a profile ever shows it matters, the fix is that counter, and it
should be built with the measurement in hand.

### What Batch 4 actually needs

One number per item, from a real device — this is `NEEDS RUNTIME` in the Phase 1 sense, and it is not
obtainable from a source read:

1. Time `generateLevel` for a round-1, round-10 and round-20 board, normal mode.
2. Time one `findHint` call on a crowded board.
3. Time a Home render with a long `dailyResults` history (this is the only one where G-07 could
   plausibly matter; with one or two entries it is free).

The C-7 log added in Batch 2 does not help here — it measures the *economy*, not the *time*. The ~5 ms
and ~50 ms figures in `gameLogic.js:331-332` are the original author's, on the author's machine, and
are still quotes rather than measurements.

### Build

SKIPPED — shell dead. Nothing changed in this batch.

### Lint

SKIPPED — shell dead. Nothing changed in this batch.

### Notes

- **Zero edits.** The honest outcome of a "measure first" batch with no way to measure is that nothing
  happens, and saying so is more useful than a speculative optimisation.
- **One audit item was downgraded in the process.** G-04 was reported as the fourth-most-important
  finding in Phase 1; read against the code it is a *measurement request*, not a defect. G-09 was
  reported as a finding; it turns out to be a documented trade-off with a correctness argument
  against the fix. Both are recorded so the next reader does not repeat the work.