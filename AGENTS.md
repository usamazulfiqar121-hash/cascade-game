# AGENTS.md — how to work on Cascade

Read this before changing anything. It is written for any AI coding agent
(OpenCode, DeepSeek, Claude, Cursor…) and for the human who owns the repo.

## The project

- **Cascade: Roguelike Sort** — a ball/tube sort puzzle with roguelike runs.
- React 19 + Vite + Capacitor 8 (Android). Package `com.aurapulse.cascade`.
- Repo: github.com/usamazulfiqar121-hash/cascade-game · web: cascade-main-rho.vercel.app
- Owner works from **Termux on an Android phone**, folder `~/Cascade_Main`.
  `sync-cascade` copies the code to `/storage/emulated/0/Cascade_Main` for the
  APK build. `android/` is gitignored (it does not exist in Termux).
- The owner writes in Roman Urdu / English. Answer in simple Roman Urdu with
  English terms. Short sentences. No jargon without explaining it.

## Files that matter

| File | What is in it |
|---|---|
| `src/App.jsx` (~4400 lines) | All game state, pour logic, saves, screens, toasts, HUD |
| `src/gameLogic.js` | Pure logic: `generateLevel`, `boardPar` (solver), `MOVE_ECONOMY`, `moveBudget`, upgrade draw, daily/weekly rules, saves |
| `src/constants.js` | `UPGRADES` (cards), `ACHIEVEMENTS`, `DAILY_TWISTS`, `ARCHETYPES` (paths), colours |
| `src/HomeScreen.jsx` | Home cards (Continue, Score Attack, This Week, Daily) |
| `src/CodexScreen.jsx` | Codex: "How moves work", paths, cards, daily rules |
| `src/leaderboard.js`, `src/components/DailyBoard.jsx` | Simulated daily leaderboard ("Today's field") |
| `resources/` | App icon + splash sources (`npm run assets` turns them into Android icons) |

## How the game works (do not break these)

**Modes** (`mode` state: `"normal" | "daily" | "score"`):
- Normal: 2 undo + 2 hints per round, **2 retries per run** (`RETRIES_PER_RUN`),
  saved every pour (live position) so Exit → Continue resumes exactly.
- Daily: same boards and same cards for every player (seeded by date).
  No undo/hints/retry. One attempt per day. Saved every pour.
- Score Attack: no undo/hints/retry, never saved mid-run. Recorded when the
  run ends (loss, or Exit after clearing ≥1 round). Recorded at most once.

**Move economy** (`MOVE_ECONOMY` in gameLogic.js) — every round:
`moves = target(par) + buffer − drain + carry + card bonus + rule (twist/mutator)`
- `par` = fewest moves to solve the board (weighted A* `boardPar`, ~1–8 ms).
  Measured on the board BEFORE Extra Tube / Auto-Sort, so those cards help.
  `playPar` = par of the board actually played. Shown to players as "target".
- buffer (was called "spare"): +50% of par on round 1 → +15% by round 6;
  halved on boss rounds (every 5th).
- drain: from round 3, `1.8k + 0.05k²` (k = round − 2).
- carry: half of last round's leftover, max 5 (0 with Glass Cannon).
- **Floor:** moves never below `playPar` → every round is winnable.
- **Sudden death:** when the budget falls below `playPar`, moves = `playPar` and
  lucky/combo/mega refunds switch off.
- Boss clear → one extra upgrade card. Per-pour refunds are capped at the shared
  `LUCK_CAP = 0.4` (40%) — normal **and** daily alike, so a daily Lucky Day is 40%
  too (Batch 2's A-04 removed the old 50%). Lucky Drop 20% + Super Lucky 25% =
  45%, which clamps to 40%. The cap is now stated in **both** places a player
  meets it: Super Lucky's own `desc` in `constants.js` names the ceiling on the
  pair, and the Codex "How moves work" table has a `LUCKY` row (Phase 2's V-03,
  interpolating the cap from `LUCK_CAP`) that also explains WHY it is capped.
  The card text is not interpolated — it is prose — so `LUCK_CAP` is still typed
  by hand in that one string; retuning the cap means editing both.

**Cards with trade-offs:** Glass Cannon (+5/round, no carry), Investment
(+1 growing +1/round, max +10, derived from its position in the upgrade list),
Marksman (id `"clear"`: solved within target → +4 next round, not in sudden death).
`lastRoundMovesLeft` and `lastRoundUnderPar` are inputs to the next board's
move limit — they must travel through EVERY save, retry and resume path.

**Invariants a change must keep:**
1. Daily: two players with the same upgrades get the same board, cards and limit.
   Daily resume regenerates the level — the inputs must match the original.
2. Saved runs from older builds must still load (validate, default, never crash).
3. Nothing gives a free retry: Exit → Continue restores moves spent, undo/hint
   counts, and the already-drawn upgrade offer.
4. Per-pour refunds stay well under 1 move per pour.
5. Score Attack never touches the normal Continue save or the daily save.

## Working rules (the owner set these)

1. **Show the real output before saying "done"** — measured numbers, the actual
   text on screen, a screenshot. "The build passes" is not proof it works.
2. If you cannot show it, say so plainly. Say what is uncertain.
3. **At most 5 changes per batch.** Build, test, then the next batch.
4. When changing behaviour, measure **before and after** and show both numbers.
5. A screenshot from the owner is the truth; your measurement is not.
6. Never rewrite git history on `main`. Small commits, clear messages that say
   what changed, why, and how it was verified.
7. No new feature without asking: will a new player understand it? Prefer
   explaining existing systems over adding more.

## Commands (Termux, inside ~/Cascade_Main)

```bash
npm run build                 # must finish with "✓ built"
npm run lint                  # oxlint; fix errors you introduced
git status && git log --oneline -5
git add -A && git commit -m "fix: <what> — <why>"
git push origin main
sync-cascade                  # copy to phone storage for the APK build
```
- `npm run assets` and `npm run android:sync` do NOT work in Termux
  (sharp fails, no android/ folder). Run them where the Android project lives.
- Applying a patch someone sent: `git am --3way <file>.patch`
  (if it fails: `git am --abort`, nothing is changed).

## How to test a change (minimum)

Termux has no browser automation, so test by playing in the browser
(`npm run dev`, open the URL on the phone) and check:
1. Normal run: rounds 1–5 (round 5 shows BOSS), budget line under the board
   adds up to the moves in the HUD, upgrade screen shows "Next: round N".
2. Lose 3 times in one run: Retry shows ❤️❤️ then ❤️, third loss = run over.
3. Exit mid-round → close app → Continue: same board, same moves, same undo count.
4. Exit on the upgrade screen → Continue: the SAME cards.
5. Daily: play 2 rounds, refresh the page, tap Daily → same position.
6. Score Attack: clear 1 round, tap Home → Exit → Home card shows "Best N".
7. Codex opens; first-ever run has no "Choose Your Path"; second run has it.
8. No red errors in the browser console.

Balance changes: change ONE number in `MOVE_ECONOMY`, play 3–4 runs, write
down the round you died on, compare with before. Target feel: average player
dies around round 15–25; good play/builds go further; every run ends.

⚠️ UNVERIFIED (audit finding C-7, 2026-10-04): the "15–25" above has never been
measured. Arithmetic from the constants says sudden death — the round where the
buffer stops existing — arrives far earlier: with no cards at all, round 3;
with an average card count and carry, somewhere around rounds 7–9. The floor
(`moves ≥ playPar`) still holds, so every round stays winnable; what is in doubt
is whether the buffer is doing the job it was tuned for. Log `round`,
`unclamped`, `playPar` and `suddenDeath` from `generateLevel` over 5–6 real runs
before trusting or retuning this number.

## Before you finish, report

- What changed (files, 1 line each) and why.
- How you verified it (what you played/measured, the numbers).
- What you did NOT test or are unsure about.
- The exact commands the owner should run.
