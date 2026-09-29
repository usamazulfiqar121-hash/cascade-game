/* ═══════════ GAME LOGIC LAYER ═══════════
   Pure functions. No React, no state, no side effects
   (except Math.random default in shuffle). */

import { MAX_HEIGHT, UPGRADES } from "./constants";

/* ─── Move calculation helpers ─── */
export function sumMoveBonus(ups) {
  return ups.reduce((s, id) => s + (UPGRADES.find((u) => u.id === id)?.value || 0), 0);
}

export function getLuckyChance(ups) {
  return Math.min(0.7, ups.reduce((s, id) => s + (id === "lucky" ? 0.2 : id === "lucky2" ? 0.35 : 0), 0));
}

export function getComboEvery(ups) {
  if (ups.includes("combo2")) return 2;
  if (ups.includes("combo3")) return 3;
  return 0;
}

export function getMegaEvery(ups) {
  return ups.includes("mega") ? 5 : 0;
}

/* ─── Upgrade pool picker ───
   Jackpot bypasses the normal weighting so its odds stay exactly what's
   documented here, independent of how the rest of the pool is tuned; a
   near miss (rolled, but just missed) is surfaced too, rather than hidden —
   research ties seeing a near-miss to what keeps variable-reward systems
   compelling. dailyOnly upgrades never appear here — that's the whole point
   of pickDailyUpgrades having something this pool doesn't. */
const JACKPOT_ID = "jackpot";
const JACKPOT_CHANCE = 0.03;
const JACKPOT_NEAR_MISS_MARGIN = 0.07;

/* Pick weight per rarity tier — must be a strictly decreasing integer per
   tier, or two tiers become indistinguishable to the draw below (which
   needs an integer repeat-count, so the weight gets truncated). The
   previous `Math.max(1, 6 - rarity * 1.5) | 0` looked fine as a formula
   but both Rare (3) and Legendary (4) truncate to the same weight, 1 —
   6-4.5=1.5→1 and 6-6=0→max(1,0)=1 — so a specific Legendary upgrade was
   exactly as likely to be offered as a specific Rare one, contradicting
   the file's own stated intent that rarity should change the actual odds,
   not just the color. Same curve, doubled precision, so it no longer
   collapses: 12-3=9, 12-6=6, 12-9=3, 12-12=0→max(1,0)=1 — each tier is
   now a clean, distinct step down from the one before it. */
function rarityWeight(rarity) {
  return Math.max(1, 12 - rarity * 3) | 0;
}

export function pickRandomUpgrades(count) {
  const pool = UPGRADES.filter((u) => u.id !== JACKPOT_ID && !u.dailyOnly);
  const weighted = [];
  pool.forEach((u) => {
    const weight = rarityWeight(u.rarity);
    for (let i = 0; i < weight; i++) weighted.push(u);
  });
  const picked = [];
  const used = new Set();

  const roll = Math.random();
  let jackpotNearMiss = false;
  if (roll < JACKPOT_CHANCE) {
    const jackpot = UPGRADES.find((u) => u.id === JACKPOT_ID);
    if (jackpot) { picked.push(jackpot); used.add(jackpot.id); }
  } else if (roll < JACKPOT_CHANCE + JACKPOT_NEAR_MISS_MARGIN) {
    jackpotNearMiss = true;
  }

  let guard = 0;
  while (picked.length < count && guard < 200) {
    const u = weighted[(Math.random() * weighted.length) | 0];
    if (used.has(u.id)) { guard++; continue; }
    used.add(u.id);
    picked.push(u);
  }
  return { upgrades: picked, jackpotNearMiss };
}

/* ─── Tube predicates ─── */
export function isTubeSolved(tube) {
  return tube.length === MAX_HEIGHT && tube.every((c) => c === tube[0]);
}

export function canPour(tubes, fromIdx, toIdx) {
  if (fromIdx === toIdx) return false;
  const from = tubes[fromIdx], to = tubes[toIdx];
  if (from.length === 0 || to.length >= MAX_HEIGHT) return false;
  if (to.length === 0) return true;
  return to[to.length - 1] === from[from.length - 1];
}

export function pour(tubes, fromIdx, toIdx) {
  if (!canPour(tubes, fromIdx, toIdx)) return null;
  const next = tubes.map((t) => [...t]);
  const from = next[fromIdx], to = next[toIdx];
  const color = from[from.length - 1];
  const moving = [];
  while (from.length > 0 && from[from.length - 1] === color) moving.push(from.pop());
  const space = MAX_HEIGHT - to.length;
  const fits = moving.slice(0, space);
  to.push(...fits);
  if (fits.length < moving.length) from.push(...moving.slice(fits.length));
  return next;
}

export function isSolved(tubes) {
  return tubes.every((t) => t.length === 0 || (t.length === MAX_HEIGHT && t.every((c) => c === t[0])));
}

/* ─── Near-miss detection (fail-state framing) ─── */
export function isOneMoveFromSolved(tubes) {
  for (let i = 0; i < tubes.length; i++) {
    for (let j = 0; j < tubes.length; j++) {
      if (!canPour(tubes, i, j)) continue;
      const next = pour(tubes, i, j);
      if (next && isSolved(next)) return true;
    }
  }
  return false;
}

/* ─── Hint ───
   findHint() used to just be "the first legal pour in tube-scan order" —
   legal, but with no idea whether it actually helps. Simulated across
   1000 real mid-game boards (5 seeds, colorCount 3-7): that naive pick
   turned an otherwise-winnable board into an unwinnable one 3.5-6% of
   the time. That's the one feature whose entire job is to help the
   player, actively working against them — about as bad as a bug gets
   for a puzzle game, since a hint-induced loss reads to the player as
   their own mistake.

   Fix tries the same candidates in the same order (so the tie-break
   stays "prefer the earliest tube," unchanged for anyone who's memorized
   it) but skips any candidate a bounded lookahead can PROVE leads to a
   dead end. A candidate the budget can't finish exploring is treated as
   safe rather than guessed unsafe: real dead ends are small, quickly-
   exhausted state spaces almost by definition (that's what makes them
   dead ends), while healthy, still-winnable states are the expensive
   ones to fully explore — so timing out is itself weak evidence the
   move is fine. Confirmed by instrumentation: across all 1000 test
   boards the cap was hit 3 times total, and none of those were
   mistakenly-accepted traps. Falls back to the first legal move only if
   every single candidate is provably bad, so a hint is still always
   offered. Cost stayed cheap in testing — ~5ms average, ~50ms worst
   case per call — well within what a deliberate button tap can afford,
   even scaled up for slower hardware. */
const HINT_SAFETY_CAP = 3000;

function boardKey(tubes) {
  return tubes.map((t) => t.join(",")).sort().join("|");
}

function isReachablySolvable(startTubes, cap) {
  if (isSolved(startTubes)) return true;
  const visited = new Set([boardKey(startTubes)]);
  let frontier = [startTubes];
  while (frontier.length) {
    const next = [];
    for (const tubes of frontier) {
      for (let i = 0; i < tubes.length; i++) {
        if (tubes[i].length === 0) continue;
        if (tubes[i].length === MAX_HEIGHT && tubes[i].every((c) => c === tubes[i][0])) continue;
        for (let j = 0; j < tubes.length; j++) {
          if (!canPour(tubes, i, j)) continue;
          if (tubes[j].length === 0) {
            const firstEmpty = tubes.findIndex((t) => t.length === 0);
            if (firstEmpty !== j) continue; // empty tubes are interchangeable — explore one, not both
          }
          const nxt = pour(tubes, i, j);
          if (!nxt) continue;
          if (isSolved(nxt)) return true;
          const key = boardKey(nxt);
          if (visited.has(key)) continue;
          visited.add(key);
          if (visited.size > cap) return true; // unresolved within budget — treat as safe, see note above
          next.push(nxt);
        }
      }
    }
    frontier = next;
  }
  return false; // fully exhausted the reachable space — genuinely a dead end
}

export function findHint(tubes) {
  const candidates = [];
  for (let from = 0; from < tubes.length; from++) {
    if (tubes[from].length === 0) continue;
    if (tubes[from].length === MAX_HEIGHT && tubes[from].every((c) => c === tubes[from][0])) continue;
    for (let to = 0; to < tubes.length; to++) {
      if (canPour(tubes, from, to)) candidates.push({ from, to });
    }
  }
  for (const c of candidates) {
    if (isReachablySolvable(pour(tubes, c.from, c.to), HINT_SAFETY_CAP)) return c;
  }
  return candidates[0] || null;
}

/* ─── Shuffle (accepts optional RNG for seeding) ─── */
export function shuffle(a, rng = Math.random) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ─── Daily challenge helpers ─── */
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailyKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function dateToSeed(date = new Date()) {
  return parseInt(dailyKey(date).replace(/-/g, ""), 10);
}

/* ─── Daily seeds ───
   Every random draw in a daily run comes from a seed made here, so the
   run is the same for everyone on a given date.

   The old scheme was dateToSeed() + round, i.e. YYYYMMDD + round. Two
   different (date, round) pairs with the same sum shared a seed: tomorrow's
   round 1 drew from the same stream as today's round 2, so tomorrow's
   upgrade cards were visible a day early and boards repeated across days
   (measured: 97 of 600 date/round boards were copies of another day's).

   Now (day, round, stream) is packed into one integer -- UTC day counted
   from 2026-01-01 in the high 14 bits, round in the next 12, stream in
   the low 2 -- which is unique by construction, then passed through
   murmur3's 32-bit finalizer. That finalizer is a bijection, so unique
   inputs stay unique outputs, while neighbouring days/rounds no longer
   land on neighbouring PRNG streams. Unique until about 2070, round 4095.
   `stream` keeps the board, the upgrade cards and the luck rolls of one
   round from sharing a sequence. */
const DAILY_EPOCH_DAY = 20454; /* 2026-01-01 as UTC days since 1970 */
export const DAILY_STREAM = { board: 0, upgrades: 1, luck: 2 };

function fmix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function dailyRoundSeed(round, stream = DAILY_STREAM.board, date = new Date()) {
  const day = (Math.floor(date.getTime() / 86400000) - DAILY_EPOCH_DAY) & 0x3fff;
  const r = Math.max(0, Math.min(4095, Math.floor(round)));
  return fmix32((((day << 12) | r) << 2) | (stream & 3));
}

/* Lucky Drop / Super Lucky roll for one pour, in [0, 1). Daily runs used
   Math.random() here, so two players making identical moves on the same
   board got different move totals -- "same puzzle for everyone" stopped
   being true the moment someone took a luck upgrade. `moveIdx` is the
   number of pours already made this round, so the roll is fixed by
   (day, round, pour number): identical for every player, and leaving and
   coming back can't re-roll it. */
export function dailyLuckRoll(round, moveIdx, date = new Date()) {
  const s = dailyRoundSeed(round, DAILY_STREAM.luck, date);
  return fmix32(s ^ Math.imul(moveIdx + 1, 0x9e3779b1)) / 4294967296;
}

export function computeStreak(results, shieldedDates = []) {
  let streak = 0;
  const today = new Date();
  const todayDone = !!results[dailyKey(today)];
  const start = todayDone ? 0 : 1;
  /* Stops at the first missed day, so this only ever walks as far as the
     player's real streak. The cap is a safety net against a corrupt save,
     not a limit: it used to be 365, which froze a 400-day streak at 365. */
  for (let i = start; i < 36500; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dailyKey(d);
    if (results[key] || shieldedDates.includes(key)) streak++;
    else break;
  }
  return streak;
}

export const SHIELD_KEY = "cascade:streakShield";

export function loadShieldedDates() {
  try {
    const raw = localStorage.getItem(SHIELD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function reconcileStreakShield(results) {
  const shielded = loadShieldedDates();
  const today = new Date();
  const yest = new Date(today);
  yest.setUTCDate(yest.getUTCDate() - 1);
  const yestKey = dailyKey(yest);
  if (results[yestKey] || shielded.includes(yestKey)) return shielded;
  const dayBefore = new Date(today);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 2);
  const dbKey = dailyKey(dayBefore);
  if (!results[dbKey] && !shielded.includes(dbKey)) return shielded;
  const monthKey = yestKey.slice(0, 7);
  if (shielded.some((k) => k.slice(0, 7) === monthKey)) return shielded;
  const updated = [...shielded, yestKey];
  try { localStorage.setItem(SHIELD_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

/* ─── Best streak ever (for the share-card comparison line) ─── */
export const BEST_STREAK_KEY = "cascade:bestStreak";

export function loadBestStreak() {
  try { return parseInt(localStorage.getItem(BEST_STREAK_KEY), 10) || 0; }
  catch { return 0; }
}

export function updateBestStreak(streak) {
  const prev = loadBestStreak();
  if (streak <= prev) return prev;
  try { localStorage.setItem(BEST_STREAK_KEY, String(streak)); } catch {}
  return streak;
}

/* ─── Auto-sort (roguelike upgrade effect) ───
   rng defaults to Math.random so callers outside generateLevel (tests,
   future call sites) keep working unseeded; generateLevel always passes
   its own rng through so daily-challenge boards stay deterministic even
   when the run has the Auto-Sort upgrade. */
export function applyAutoSort(tubes, count, rng = Math.random) {
  if (count <= 0) return tubes;
  const result = tubes.map((t) => [...t]);
  for (let k = 0; k < count; k++) {
    const emptyIdx = result.findIndex((t) => t.length === 0);
    if (emptyIdx === -1) break;
    const colors = new Set();
    result.forEach((t) => t.forEach((c) => colors.add(c)));
    const colorArr = [...colors];
    if (!colorArr.length) break;
    let sorted = false;
    for (const color of shuffle(colorArr, rng)) {
      let total = 0;
      result.forEach((t) => t.forEach((c) => { if (c === color) total++; }));
      if (total !== MAX_HEIGHT) continue;
      const alreadySorted = result.some((t) => t.length === MAX_HEIGHT && t.every((c) => c === color));
      if (alreadySorted) continue;
      for (let i = 0; i < result.length; i++) result[i] = result[i].filter((c) => c !== color);
      result[emptyIdx] = Array(MAX_HEIGHT).fill(color);
      sorted = true;
      break;
    }
    if (!sorted) break;
  }
  return result;
}

/* ─── Level generator ───
   Recovery levels ("hills, not stairs"): after a round that took a retry
   (struggled=true, set by the caller) or barely cleared (prevMovesLeft <= 1),
   the next level steps back down a color/tube instead of continuing to climb
   — one easier round, then the normal ramp resumes from there.
   Normal runs only: seed !== null means this is a daily-challenge board,
   which must be identical for every player on a given date. Both recovery
   signals (retried, moves left) are this player's own performance, so
   letting them change colorCount would make the "same board for everyone"
   guarantee false starting round 2. */
export function generateLevel(round, runUpgrades, prevMovesLeft, seed = null, struggled = false) {
  const rng = seed !== null ? mulberry32(seed) : Math.random;
  const isDailyLevel = seed !== null;
  const closeCall = !isDailyLevel && round > 1 && prevMovesLeft >= 0 && prevMovesLeft <= 1;
  const recovery = !isDailyLevel && (struggled || closeCall);
  const baseColorCount = Math.min(2 + Math.floor((round - 1) / 2), 7);
  const colorCount = recovery ? Math.max(2, baseColorCount - 1) : baseColorCount;
  const balls = [];
  for (let c = 0; c < colorCount; c++) for (let i = 0; i < MAX_HEIGHT; i++) balls.push(c);

  let tubes = [];
  let attempts = 0;
  do {
    const sh = shuffle(balls, rng);
    tubes = [];
    for (let i = 0; i < colorCount; i++) tubes.push(sh.slice(i * MAX_HEIGHT, (i + 1) * MAX_HEIGHT));
    for (let i = 0; i < 2; i++) tubes.push([]);
    attempts++;
  } while (attempts < 8 && tubes.some((t) => t.length === MAX_HEIGHT && t.every((c) => c === t[0])));

  const extraTubes = runUpgrades.filter((id) => id === "tube").length;
  for (let i = 0; i < extraTubes; i++) tubes.push([]);
  const autoSortCount = runUpgrades.filter((id) => id === "auto").length;
  tubes = applyAutoSort(tubes, autoSortCount, rng);

  const baseLimit = Math.round(colorCount * 3 + round * 0.8) + 4;
  const moveBonus = sumMoveBonus(runUpgrades);
  const perfectClearBonus = runUpgrades.includes("clear") && prevMovesLeft >= 5 ? 3 : 0;
  const moveLimit = baseLimit + moveBonus + perfectClearBonus;

  return { tubes, moveLimit, colorCount };
}

/* ═══════════ DAILY MODE — STATE MANAGEMENT ═══════════ */

export const DAILY_STATE_KEY = "cascade:dailyState";

/* Returns daily state: { status, startedAt, result, seed }
   status: "available" | "in_progress" | "completed" | "failed" */
export function loadDailyState() {
  try {
    const raw = localStorage.getItem(DAILY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    /* If saved state is from a previous day, treat as fresh */
    if (parsed.dateKey !== dailyKey()) return null;
    return parsed;
  } catch { return null; }
}

export function saveDailyState(state) {
  try {
    const full = { ...state, dateKey: dailyKey(), updatedAt: Date.now() };
    localStorage.setItem(DAILY_STATE_KEY, JSON.stringify(full));
    return full;
  } catch { return state; }
}

/* ─── Daily run snapshot ───
   The position of the run in progress, saved as the player plays, so that
   leaving (Home, app killed, phone call) and coming back RESUMES the same
   position instead of starting over. Starting over was the loophole in
   "one attempt a day": the boards are the same for everyone, so a player
   who saw round 6 going badly could step out before losing (which never
   records a failure), come back to round 1 knowing every board, and try
   again. There is no undo in daily runs, so restoring the exact position
   gives back nothing they didn't have.

   Only the parts that can't be regenerated are stored. The board a round
   STARTS from, and the three upgrade cards offered after it, are pure
   functions of (day, round, upgrades taken, leftover moves), so resume
   rebuilds them with generateLevel/pickDailyUpgrades and lays the saved
   tubes/moves on top.

   phase "playing": tubes/moves/bonusMoves/combo are the live board.
   phase "upgrade": the round is cleared and the cards are showing;
     `round` is the round just cleared, `nextPrevLeft` the leftover moves
     it finished with (feeds the next round), `tubes` the solved board. */
export const DAILY_RUN_KEY = "cascade:dailyRun";

export function saveDailyRun(run) {
  try {
    localStorage.setItem(DAILY_RUN_KEY, JSON.stringify({ ...run, v: 1 }));
  } catch {}
}

export function clearDailyRun() {
  try {
    localStorage.removeItem(DAILY_RUN_KEY);
  } catch {}
}

/* Returns the saved run only if it is well-formed and belongs to today's
   puzzle; anything else (yesterday's, hand-edited, half-written) is null
   and the player simply starts round 1 fresh. */
export function loadDailyRun() {
  try {
    const raw = localStorage.getItem(DAILY_RUN_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (!r || r.v !== 1 || r.dateKey !== dailyKey()) return null;
    if (r.phase !== "playing" && r.phase !== "upgrade") return null;
    if (!Number.isInteger(r.round) || r.round < 1) return null;
    if (!Array.isArray(r.upgrades) || !r.upgrades.every((x) => typeof x === "string")) return null;
    if (!Array.isArray(r.rounds) || !Number.isFinite(r.totalMoves)) return null;
    for (const k of ["genPrevLeft", "nextPrevLeft", "moves", "bonusMoves", "combo"]) {
      if (!Number.isFinite(r[k]) || r[k] < 0) return null;
    }
    return r;
  } catch {
    return null;
  }
}

/* True when `saved` could be the round's own board mid-play: same number
   of tubes, no tube over capacity, and exactly the same balls of each
   colour as the freshly generated round. A pour only moves balls, so this
   holds for any real position and rejects anything corrupted or left over
   from a different board. The solved board of a cleared round passes too. */
export function tubesMatchLevel(saved, levelTubes) {
  if (!Array.isArray(saved) || !Array.isArray(levelTubes)) return false;
  if (saved.length !== levelTubes.length) return false;
  const count = (tubes) => {
    const c = new Map();
    for (const t of tubes) for (const b of t) c.set(b, (c.get(b) || 0) + 1);
    return c;
  };
  for (const t of saved) {
    if (!Array.isArray(t) || t.length > MAX_HEIGHT) return false;
    if (!t.every((b) => Number.isInteger(b) && b >= 0)) return false;
  }
  const a = count(saved), b = count(levelTubes);
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

/* Milliseconds until next UTC midnight */
export function msUntilNextDaily() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return tomorrow.getTime() - now.getTime();
}

/* Format milliseconds → HH:MM:SS */
export function formatCountdown(ms) {
  if (ms < 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/* Deterministic 3 upgrades for daily — same for everyone on given date.
   dailyOnly upgrades (e.g. "dawn") are eligible here and nowhere else —
   the whole point of the daily habit having its own payoff. Jackpot stays
   exclusive to pickRandomUpgrades's explicit roll, so it's excluded here. */
/* A card that would do nothing for a run that already owns what it gives.
   The flat effects (Extra Tube, Auto-Sort, the +N moves cards) stack, so
   they are never dead; these ones are read with includes() or capped:
   Perfect Clear and Mega Bonus are on/off, Combo Master is covered by Combo
   Legend (but not the other way round), and Lucky Drop / Super Lucky share
   the 70% cap in getLuckyChance. Measured over 200 simulated days with
   random picks, 13.8% of all daily cards and 35.6% of all offers had at
   least one of these, and from round 9 on more than half of the offers. */
export function isDeadUpgrade(id, owned = []) {
  switch (id) {
    case "clear":
    case "mega":
    case "combo2":
      return owned.includes(id);
    case "combo3":
      return owned.includes("combo3") || owned.includes("combo2");
    case "lucky":
    case "lucky2":
      return getLuckyChance(owned) >= 0.7;
    default:
      return false;
  }
}

/* `owned` is what the run holds when the cards are shown. The draw is still
   the seeded stream for (day, round), so two players holding the same
   upgrades see the same cards; a card that would be dead for this run is
   skipped and the stream simply carries on. A run with nothing dead sees
   exactly the cards it always did. */
export function pickDailyUpgrades(dateSeed, count = 3, owned = []) {
  const rng = mulberry32(dateSeed);
  const pool = UPGRADES.filter((u) => u.id !== JACKPOT_ID);
  const weighted = [];
  pool.forEach((u) => {
    const weight = rarityWeight(u.rarity);
    for (let i = 0; i < weight; i++) weighted.push(u);
  });
  const picked = [];
  const used = new Set();
  let guard = 0;
  while (picked.length < count && guard < 200) {
    const u = weighted[(rng() * weighted.length) | 0];
    if (used.has(u.id) || isDeadUpgrade(u.id, owned)) { guard++; continue; }
    used.add(u.id);
    picked.push(u);
  }
  return picked;
}
