/* ═══════════ GAME LOGIC LAYER ═══════════
   Pure functions. No React, no state, no side effects
   (except Math.random default in shuffle). */

import { MAX_HEIGHT, UPGRADES, DAILY_TWISTS, OFFER_TUNING, CATEGORY_ORDER, ARCHETYPES, ARCHETYPE_OFFER_COUNT, FOCUS_OFFERS } from "./constants";

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
   of pickDailyUpgrades having something this pool doesn't.

   A card that would do nothing for this run is skipped here too, not just in
   the daily. It used to be a daily-only filter, which left normal runs free to
   offer a second Perfect Clear or a second Mega Bonus — a card whose own text
   promises an effect the run already has. Offering it isn't a harmless
   dud: it's one of three slots the player turned down, so a dead card both
   wastes a choice and makes the offer read as noise. The daily already had
   this filter and is measurably better for it.

   The filter can never empty the offer. At most five cards in this pool can be
   dead for a given run (clear, mega, combo2, combo3 and lucky), so at least
   eight of the thirteen stay eligible — always more than the three an offer
   needs, which is why the relax ladder in drawOffer does not have to give up
   this rule. Super Lucky is never among them: getLuckyChance's 0.7 ceiling is
   only ever a clamp, and 0.2 + 0.35 = 0.55 never reaches it, so taking Super
   Lucky always moves the chance. */
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

/* `focus` is the categories this run opened with (see ARCHETYPES). Applied
   only while the opening bias is live, and computed from `owned` rather than
   tracked, so it costs no state and survives a reload. Pass null outside a
   run that has one. */
export function pickRandomUpgrades(count, owned = [], rng = Math.random, focus = null) {
  const pool = UPGRADES.filter((u) => u.id !== JACKPOT_ID && !u.dailyOnly);
  const roll = rng();
  let jackpot = null;
  let jackpotNearMiss = false;
  if (roll < JACKPOT_CHANCE) {
    jackpot = UPGRADES.find((u) => u.id === JACKPOT_ID) || null;
  } else if (roll < JACKPOT_CHANCE + JACKPOT_NEAR_MISS_MARGIN) {
    jackpotNearMiss = true;
  }
  const upgrades = drawOffer(pool, count, owned, rng, {
    pre: jackpot,
    isDead: isDeadUpgrade,
    pity: pityActive(owned),
    focus: activeFocus(owned, focus),
  });
  return { upgrades, jackpotNearMiss };
}

/* Category of a card, read off its UPGRADES entry. A spent "wind_used" and
   any id this build doesn't know resolve to "other", so neither can consume
   a category slot. */
function catOf(id) {
  const u = UPGRADES.find((x) => x.id === (id === "wind_used" ? "wind" : id));
  return u && u.cat ? u.cat : "other";
}

/* Rarity of a card the run already holds, 0 for an id this build doesn't
   know. wind_used is a spent Second Wind, which is still the Rare card it
   was — without the remap below, spending it would read as a non-Rare pick
   and could hand the run a pity it had already earned. */
function rarityOf(id) {
  const u = UPGRADES.find((x) => x.id === (id === "wind_used" ? "wind" : id));
  return u ? u.rarity : 0;
}

/* How many consecutive offers this run has gone without taking a card at or
   above pityMinRarity, counted back from the most recent pick. 0 means the
   last pick was a Rare+.

   Derived from the run's own card list rather than kept in its own counter,
   which is what lets pity work with no new state at all: the list is already
   in memory for a normal run and already written to disk for a daily one (see
   saveDailyRun), so a run resumed from a save counts exactly the streak it
   was on, and nothing has to be migrated. */
export function offersSinceRare(owned) {
  let n = 0;
  for (let i = owned.length - 1; i >= 0; i--) {
    if (rarityOf(owned[i]) >= OFFER_TUNING.pityMinRarity) break;
    n++;
  }
  return n;
}

/* Whether the next offer must contain a Rare or better. Exported because the
   offer screen says so when it's true: a guaranteed Rare that arrives
   unexplained reads as luck, and a player who can't tell a guarantee from a
   coincidence stops trusting either. */
export function pityActive(owned) {
  return offersSinceRare(owned) >= OFFER_TUNING.pityEvery - 1;
}

/* The category this run is most invested in, as { cat, count }, or null
   before the first pick. This is the "build identity" the draw is nudging
   toward (see synergyMult) stated back to the player, so a run that has
   quietly become a Luck run is legible as one.

   `only` restricts the tally to a set of categories — used to answer "how is
   my opening pick going?" instead, which has to be counted inside the chosen
   archetype's own categories or it would answer a question nobody asked (a
   player who opened as Momentum and took a Luck card would be told they were
   "1 Luck" and, offered the count, never told their Momentum pick was going
   unused). Ties break on CATEGORY_ORDER rather than on object key order, so
   two players holding the same cards always see the same name. */
export function runArchetype(owned, only = null) {
  const counts = {};
  for (const id of owned) {
    const c = catOf(id);
    if (c === "other") continue;
    if (only && !only.includes(c)) continue;
    counts[c] = (counts[c] || 0) + 1;
  }
  let cat = null, best = 0;
  for (const c of CATEGORY_ORDER) {
    const n = counts[c] || 0;
    if (n > best) { cat = c; best = n; }
  }
  return cat ? { cat, count: best } : null;
}

/* How many cards the run already owns in `u`'s category, capped at the last
   entry of synergyMult. Counted from the run's own list, so it is a pure
   function of the run — no state, and the same answer for every player
   holding the same cards, which is what keeps the daily daily. */
function synergyCount(u, owned) {
  const cat = u.cat;
  if (!cat) return 0;
  let n = 0;
  for (const id of owned) if (catOf(id) === cat) n++;
  return Math.min(n, OFFER_TUNING.synergyMult.length - 1);
}

/* The categories the run was opened with, if the opening bias still applies.
   It stops applying after FOCUS_OFFERS picks: the run is meant to be able to
   become something other than what it started as, and a bias that never
   expires would quietly turn the opening pick into a lock. Keyed off
   `owned.length` rather than a counter, so it survives a reload mid-run
   without anything extra in the save. */
function activeFocus(owned, focus) {
  if (!focus || !focus.length) return null;
  return owned.length < FOCUS_OFFERS ? focus : null;
}

/* The weight table, expanded into one entry per unit of weight — the draw
   below indexes into it, so a card's chance is its share of the array.
   Rounded to an integer because the array is a repeat-count: a weight of 1.2
   would otherwise truncate back to 1 and quietly make a 20% boost a no-op. */
function buildWeighted(pool, owned, focus) {
  const weighted = [];
  for (const u of pool) {
    const base = rarityWeight(u.rarity);
    const focusBoost = focus && u.cat && focus.includes(u.cat) ? OFFER_TUNING.focusMult : 1;
    const w = Math.max(1, Math.min(
      Math.round(base * OFFER_TUNING.synergyMult[synergyCount(u, owned)] * focusBoost),
      Math.round(base * OFFER_TUNING.maxCardWeightMult),
    ));
    for (let i = 0; i < w; i++) weighted.push(u);
  }
  return weighted;
}

/* One offer, shared by both pickers so the normal and daily draws can't drift
   apart rule by rule. `pre` is a card decided outside the draw (Jackpot),
   `isDead` the per-card veto for a run that already has what the card gives.

   `pity` forces the FIRST card of the offer to be Rare or better, and only
   the first: a pity offer still offers a real choice between two Rare-or-better
   cards plus whatever else the caps allow, and the floor is released as soon
   as one such card lands.

   A rule that can't be honoured is dropped rather than allowed to leave the
   offer short. The ladder below gives up the owned cap, then the tempo cap,
   then pity, so a late run holding nearly every card still gets three offers
   instead of one. Relaxing costs no random number, which keeps the stream
   identical whichever path a given day takes. */
const RELAX = { OWNED: 1, TEMPO: 2, PITY: 3, ALL: 4 };

function drawOffer(pool, count, owned, rng, opts = {}) {
  const { pre = null, isDead = null, pity = false, focus = null } = opts;
  const weighted = buildWeighted(pool, owned, focus);
  const picked = [];
  const used = new Set();
  let ownedSlots = 0;
  let tempoSlots = 0;
  let pityLeft = pity ? 1 : 0;

  const commit = (u) => {
    picked.push(u);
    used.add(u.id);
    if (catOf(u.id) === "tempo") tempoSlots++;
    if (owned.includes(u.id)) ownedSlots++;
    if (rarityOf(u.id) >= OFFER_TUNING.pityMinRarity) pityLeft = 0;
  };
  if (pre) commit(pre);

  let relax = 0;
  let guard = 0;
  while (picked.length < count && guard < 500) {
    guard++;
    const eligible = weighted.filter((u) => {
      if (used.has(u.id)) return false;
      if (isDead && isDead(u.id, owned)) return false;
      if (relax < RELAX.PITY && pityLeft && rarityOf(u.id) < OFFER_TUNING.pityMinRarity) return false;
      if (relax < RELAX.OWNED && owned.includes(u.id) && ownedSlots >= OFFER_TUNING.maxOwnedPerOffer) return false;
      if (relax < RELAX.TEMPO && catOf(u.id) === "tempo" && tempoSlots >= OFFER_TUNING.maxTempoPerOffer) return false;
      return true;
    });
    if (!eligible.length) {
      if (relax < RELAX.ALL) { relax++; continue; }
      break;
    }
    commit(eligible[(rng() * eligible.length) | 0]);
    relax = 0;
  }
  return picked;
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
/* stream 3 is the day's opening archetype (see dailyArchetype). It was the
   one free value in the low 2 bits, and it is deliberately NOT round 0 of
   the upgrades stream: sharing that seed would make the archetype a function
   of the round-1 card draw's stream, so changing the draw would silently
   change the archetype and vice versa. */
export const DAILY_STREAM = { board: 0, upgrades: 1, luck: 2, archetype: 3 };

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
  if (shielded.some((k) => typeof k === "string" && k.slice(0, 7) === monthKey)) return shielded;
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

/* ─── Daily score ───
   Rounds cleared says how far you got; it can't say how well, and most days
   many players end on the same round. The daily also keeps a score, which
   the main game does not have: 100 points times the round for every round
   cleared, plus 10 for every move still unspent when it was cleared. Depth
   dominates (a round is worth more than any one round's spare moves), and
   spare moves separate two runs that stopped on the same round. Rounds
   saved before the "left" field existed fall back to limit minus moves. */
export const DAILY_BEST_SCORE_KEY = "cascade:dailyBestScore";

export function dailyScore(rounds) {
  return (rounds || []).reduce((sum, r) => {
    const left = Number.isFinite(r.left) ? r.left : (r.moveLimit || 0) - (r.moves || 0);
    return sum + (r.round || 0) * 100 + Math.max(0, left) * 10;
  }, 0);
}

/* ─── Daily twist ───
   Which rule of the day it is, and what it does to a round's move limit.
   One twist a day, in a shuffled order that is re-drawn every time the whole
   set has been used (a "cycle", seven days with today's seven twists): each
   twist comes round once per cycle, none can repeat inside one, and the
   first day of a cycle is never the last day of the one before it.
   Everything is a function of the UTC day alone, so it is the same for
   every player and needs no server. */
const TWIST_SALT = 0x7a3d51;

/* A plain shuffle put five curse days in a row on the calendar (measured
   over 1,400 days), so a cycle's order is re-drawn until it passes three
   checks, all of which look only at that cycle (each cycle is drawn from its
   own number alone, so nothing has to be computed from the one before):
     - no three days of the same kind in a row;
     - neither the first two nor the last two days hold two of the same kind,
       so a run can't stretch across the seam between two cycles;
     - the cycle opens with one of the OPENERS and closes with one of the
       others, so the last day of a cycle can never be the first day of the
       next one (no twist twice in a row). */
const TWIST_OPENERS = new Set(["tailwind", "thin", "tide"]);

function orderIsFair(order) {
  const kinds = order.map((i) => DAILY_TWISTS[i].kind);
  const n = kinds.length;
  for (let i = 0; i + 2 < n; i++) if (kinds[i] === kinds[i + 1] && kinds[i] === kinds[i + 2]) return false;
  if (kinds[0] === kinds[1] && kinds[0] !== "mixed") return false;
  if (kinds[n - 1] === kinds[n - 2] && kinds[n - 1] !== "mixed") return false;
  if (!TWIST_OPENERS.has(DAILY_TWISTS[order[0]].id)) return false;
  if (TWIST_OPENERS.has(DAILY_TWISTS[order[n - 1]].id)) return false;
  return true;
}

function twistOrder(block) {
  const ids = DAILY_TWISTS.map((_, i) => i);
  let order = ids;
  for (let attempt = 0; attempt < 2000; attempt++) {
    order = shuffle(ids, mulberry32(fmix32((block ^ TWIST_SALT ^ Math.imul(attempt, 0x9e3779b1)) >>> 0)));
    if (orderIsFair(order)) break;
  }
  return order;
}

export function pickDailyTwist(date = new Date()) {
  const n = DAILY_TWISTS.length;
  const day = Math.floor(date.getTime() / 86400000) - DAILY_EPOCH_DAY;
  const block = Math.floor(day / n);
  return DAILY_TWISTS[twistOrder(block)[day - block * n]];
}

export const LUCKY_DAY_BONUS = 0.25;
export const FEAST_CARD_COUNT = 2;
export const WIND_MOVES = 5;

export function twistMoveDelta(twistId, round) {
  switch (twistId) {
    case "tailwind":
      return 3;
    case "thin":
      return -2;
    case "feast":
      return 5;
    case "tide":
      return -Math.floor((Math.max(1, round) - 1) / 3);
    default:
      return 0;
  }
}

/* ─── Weekly mutator ───
   The long-run counterpart to the daily twist: ONE rule a week, shared by
   every player, in an order that never repeats inside a six-week block. It
   gives the endless normal run a reason to start fresh each week, which the
   daily can't do for that mode (the daily is a different board every day, so
   it has no "this week's version of the same challenge" to vary).

   Deliberately NOT applied to the daily. A daily board's entire promise is
   that it is identical for every player on a given date; layering a weekly
   rule on top would make the same date play differently depending on which
   Monday it was, and nobody would see why. So every caller passes null for a
   daily and a mutator for a normal run.

   Week boundaries are Mondays in UTC, matching the daily's UTC-midnight
   reset, so the mutator always flips at the same instant the puzzle does and
   never on a local-midnight surprise. */
const MUTATOR_SALT = 0x5f3a91;

/* Each mutator describes only what it changes; every hook defaults to 0, so
   adding a rule is one object and no edits anywhere else. `kind` is purely
   for the Home card's colour — no game logic reads it.

   The three hooks are all consumed by generateLevel, and all three are
   round-aware, so a rule can ramp with the run (escalation) or only fire on
   particular rounds (gilded) rather than being a flat constant. */
export const WEEKLY_MUTATORS = [
  {
    id: "longhaul", name: "Long Haul", icon: "🏃", kind: "boon",
    desc: "+3 moves every round",
    moveDelta: () => 3,
  },
  {
    id: "squeeze", name: "Tight Squeeze", icon: "✂️", kind: "curse",
    desc: "2 fewer moves every round",
    moveDelta: () => -2,
  },
  {
    id: "deepcuts", name: "Deep Cuts", icon: "🎨", kind: "curse",
    desc: "Colours ramp up a round sooner",
    colorDelta: 1,
  },
  {
    id: "warmup", name: "Warm Start", icon: "🌅", kind: "boon",
    desc: "Round 1 opens with one colour already sorted",
    autoSortDelta: (round) => (round === 1 ? 1 : 0),
  },
  {
    id: "escalation", name: "Escalation", icon: "📈", kind: "curse",
    desc: "1 fewer move for every 3 rounds you clear",
    moveDelta: (round) => -Math.floor((Math.max(1, round) - 1) / 3),
  },
  {
    id: "gilded", name: "Gilded Round", icon: "⭐", kind: "trade",
    desc: "Every 5th round opens with +8 moves",
    moveDelta: (round) => (Math.max(1, round) % 5 === 0 ? 8 : 0),
  },
];

/* Days since the epoch, snapped back to that week's Monday (UTC).
   getUTCDay() is 0 for Sunday, so +6 then mod 7 lands Monday on 0. */
function weekIndexUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Math.floor(d.getTime() / 86400000) - DAILY_EPOCH_DAY;
}

/* One shuffled pass of the whole set per six-week block, so every mutator
   comes round exactly once per block and never twice inside one.

   The one thing NOT guarded is the seam between two blocks — the last mutator
   of one block can repeat as the first of the next, roughly one week in six.
   The daily's twist order goes to real lengths to avoid this (see
   twistOrder / orderIsFair) because the player sees that rotation as a daily
   calendar; here it's one card, once a week, and fixing it would mean
   computing the previous block's order to test against. Judged not worth the
   complexity, and noted here so it's a known shape rather than a surprise. */
function mutatorOrder(block) {
  const ids = WEEKLY_MUTATORS.map((_, i) => i);
  return shuffle(ids, mulberry32(fmix32((block ^ MUTATOR_SALT) >>> 0)));
}

export function weekMutator(date = new Date()) {
  const n = WEEKLY_MUTATORS.length;
  const week = weekIndexUTC(date);
  const block = Math.floor(week / n);
  return WEEKLY_MUTATORS[mutatorOrder(block)[week - block * n]];
}

/* A mutator by id, or null. The mirror of weekMutator(): weekMutator is the
   forward direction (which rule is in force now), this is the backward one
   (which rule was this, again) and it exists because a saved run stores the
   mutator as an id rather than as a copy of the object.

   Storing the id is the whole point, and the copy is what makes it necessary.
   WEEKLY_MUTATORS is a module constant, so a mutator's moveDelta/autoSortDelta
   are FUNCTIONS — JSON.stringify drops every one of them, and a save written
   from a copied object would come back as a rule that changes nothing at all:
   silently, every round, with nothing on screen to say why. The id survives
   the round trip and re-resolves to the live object, so a resumed run applies
   the same rule the board it was handed was generated under.

   Lookup by id, not by index: the array is the natural thing to reach for
   (weekMutator returns a positional element), and an index into it is exactly
   the value that goes stale the moment a mutator is added, removed or
   reordered in a later build — turning a saved run into a different week. */
export function mutatorById(id) {
  if (typeof id !== "string") return null;
  return WEEKLY_MUTATORS.find((m) => m.id === id) || null;
}

/* Milliseconds until the next Monday 00:00 UTC. Built from the calendar
   rather than "+7 days" so it can't drift across a DST boundary or a month
   change — the same reasoning msUntilNextDaily uses. */
export function msUntilNextWeek() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 7);
  return d.getTime() - now.getTime();
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
    guarantee false starting round 2.

    `mutator` is the weekly rule for normal runs (see WEEKLY_MUTATORS). It is
    a separate parameter from `twist` rather than folded into it on purpose:
    both feed the same three numbers, but one is a per-day daily guarantee and
    the other is a per-week normal-run flavour, and they must never both apply
    to the same board. Callers pass `null` for a daily. Every hook is optional
    and defaults to 0, so a mutator object that defines none of them changes
    nothing. */
export function generateLevel(round, runUpgrades, prevMovesLeft, seed = null, struggled = false, twist = null, mutator = null) {
  const twistId = twist && typeof twist === "object" ? twist.id : twist;
  const m = mutator && typeof mutator === "object" ? mutator : null;
  const rng = seed !== null ? mulberry32(seed) : Math.random;
  const isDailyLevel = seed !== null;
  const closeCall = !isDailyLevel && round > 1 && prevMovesLeft >= 0 && prevMovesLeft <= 1;
  const recovery = !isDailyLevel && (struggled || closeCall);
  const baseColorCount = Math.min(2 + Math.floor((round - 1) / 2), 7);
  let colorCount = recovery ? Math.max(2, baseColorCount - 1) : baseColorCount;
  /* Rainbow: one colour more than the round would normally have, which is
     the board two rounds further on. Capped at the 7 colours the game has
     always topped out at, so from round 9 on it changes nothing. */
  if (twistId === "rainbow") colorCount = Math.min(7, colorCount + 1);
  /* Deep Cuts: the same +1 the Rainbow twist gives, but a week at a time.
     Bounded below at 2 as well as above at 7 — a negative colorDelta (none
     ship today) would otherwise walk the count under the two colours the
     generator assumes it always has. */
  if (m && m.colorDelta) colorCount = Math.min(7, Math.max(2, colorCount + m.colorDelta));
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
  /* Warm Start is one free Auto-Sort, on top of any the run has taken.
     A mutator gets its own count here rather than sharing the twist's +1 —
     they can't both be active, and adding them together would hand out two
     free sorts if that ever changed. */
  const autoSortCount = runUpgrades.filter((id) => id === "auto").length
    + (twistId === "warm" ? 1 : 0)
    + (m && m.autoSortDelta ? m.autoSortDelta(round) : 0);
  tubes = applyAutoSort(tubes, autoSortCount, rng);

  const baseLimit = Math.round(colorCount * 3 + round * 0.8) + 4;
  const moveBonus = sumMoveBonus(runUpgrades);
  const perfectClearBonus = runUpgrades.includes("clear") && prevMovesLeft >= 5 ? 3 : 0;
  const moveLimit = Math.max(
    1,
    baseLimit + moveBonus + perfectClearBonus + twistMoveDelta(twistId, round)
      + (m && m.moveDelta ? m.moveDelta(round) : 0),
  );

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

/* ─── Normal-run save (the run "Continue" picks back up) ───
   A daily could already be put down and picked up again (see saveDailyRun).
   The one mode with no equivalent was the one the archetype and upgrade
   system actually lives in: leaving a normal run threw the whole thing away,
   and the Exit dialog's "Progress will be lost" meant exactly that.

   Saved at ROUND BOUNDARIES only — right after an upgrade is taken, while
   the board on screen is one nobody has poured into yet. That single
   decision is what keeps this cheap: the level is stored verbatim rather
   than regenerated, because a normal run's level comes from Math.random, so
   regenerating it would hand the player a DIFFERENT board for a round they
   had already begun thinking about — sometimes kinder, sometimes much
   worse, and never the one they actually left.

   Not persisting the mid-pour position is the deliberate half. It would
   need the same tubesMatchLevel-style validation the daily has, and it
   would restore a half-played board, which in a puzzle game hands the
   player very little and costs a lot of surface to get right. Losing the
   moves inside one round is the price, and it is a small one — rounds are
   short, and someone who leaves mid-round has barely invested in it yet.

   `mutatorId` is this run's weekly rule, and it is what makes a resumed run
   the same run. Without it the pinned mutator would be re-resolved from
   whatever week the player comes back in: a run saved on Sunday and opened
   on Monday would have its next round generated under a different rule than
   its first, which is the exact seam the session pin in App.jsx exists to
   close and would reopen for anyone who put the app down for a week. Stored
   as an id rather than the object for the reason in mutatorById — the hooks
   are functions and would not survive JSON. */
export const NORMAL_RUN_KEY = "cascade:normalRun";

export function saveNormalRun(run) {
  try { localStorage.setItem(NORMAL_RUN_KEY, JSON.stringify({ ...run, v: 1 })); } catch {}
}

export function clearNormalRun() {
  try { localStorage.removeItem(NORMAL_RUN_KEY); } catch {}
}

/* A stored level is only usable if it has the shape generateLevel returns: a
   board of tubes of bounded colour ids, a positive move limit, a colour
   count. Anything else is a truncated write or a hand-edited value, and
   reads as no save at all — the player starts a fresh run, which is exactly
   where a corrupt save would otherwise have dumped them anyway. */
function validLevel(l) {
  return !!l
    && Array.isArray(l.tubes) && l.tubes.length > 0
    && l.tubes.every((t) => Array.isArray(t) && t.length <= MAX_HEIGHT
      && t.every((b) => Number.isInteger(b) && b >= 0))
    && Number.isFinite(l.moveLimit) && l.moveLimit >= 1
    && Number.isFinite(l.colorCount) && l.colorCount >= 1;
}

/* The run to continue, or null. The tubes themselves are trusted rather than
   re-validated against a fresh draw the way the daily's are: nothing between
   the write and this read can modify them, and there is no regeneration here
   to check them against. */
export function loadNormalRun() {
  try {
    const raw = localStorage.getItem(NORMAL_RUN_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (!r || r.v !== 1) return null;
    if (!Number.isInteger(r.round) || r.round < 1) return null;
    if (!Array.isArray(r.upgrades) || !r.upgrades.every((x) => typeof x === "string")) return null;
    if (!validLevel(r.level)) return null;
    /* A run opened without a path (the picker was skipped) stores null, which
       is legal. A non-null one has to be a whole archetype, because runFocus
       reads .cats off it on every draw. */
    if (r.path && (typeof r.path.id !== "string" || !Array.isArray(r.path.cats))) return null;
    if (!Number.isFinite(r.lastRoundMovesLeft) || r.lastRoundMovesLeft < 0) return null;
    /* The week's rule has to still exist, or resuming under a different one
       is the one outcome worse than not resuming at all. An id that no longer
       resolves is a save from a build that shipped a different mutator set.
       `undefined` is legal rather than rejected: that is a save written before
       this field existed, and there was no pinned rule in it to preserve, so
       the resume path falls back to the current week. `null` is the shape this
       build writes when a run somehow had no rule at all, and is equally fine
       to fall back from — what is NOT fine is a non-empty id that resolves to
       nothing, so only that case throws the save away. */
    if (r.mutatorId != null && !mutatorById(r.mutatorId)) return null;
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
   dailyOnly upgrades (e.g. "wind") are eligible here and nowhere else —
   the whole point of the daily habit having its own payoff. Jackpot stays
   exclusive to pickRandomUpgrades's explicit roll, so it's excluded here. */
/* A card that would do nothing for a run that already owns what it gives.
   The flat effects (Extra Tube, Auto-Sort, the +N moves cards) stack, so
   they are never dead; these ones are read with includes() or capped:
   Perfect Clear and Mega Bonus are on/off, Combo Master is covered by Combo
   Legend (but not the other way round), and Lucky Drop / Super Lucky are
   judged by whether taking them actually moves the chance — not by
   getLuckyChance's 0.7 ceiling, which is only ever a CLAMP: the two luck
   cards sum to 0.2 + 0.35 = 0.55, so the old `>= 0.7` test could never be
   true and silently filtered nothing. Measured over 200 simulated days with
   random picks, 13.8% of all daily cards and 35.6% of all offers had at
   least one of these, and from round 9 on more than half of the offers. */
export function isDeadUpgrade(id, owned = []) {
  switch (id) {
    case "clear":
    case "mega":
    case "combo2":
      return owned.includes(id);
    /* Second Wind is spent by rewriting its id to "wind_used" in the run's
       upgrade list (see App.jsx), NOT by removing it — so a plain
       includes(id) reported a spent card as still un-owned, and the daily
       picker happily offered it a second time, breaking the "Once" its own
       description promises. */
    case "wind":
      return owned.includes("wind") || owned.includes("wind_used");
    case "combo3":
      return owned.includes("combo3") || owned.includes("combo2");
    case "lucky":
    case "lucky2":
      return getLuckyChance([...owned, id]) === getLuckyChance(owned);
    default:
      return false;
  }
}

/* `owned` is what the run holds when the cards are shown. The draw is still
   the seeded stream for (day, round), so two players holding the same
   upgrades see the same cards; a card that would be dead for this run is
   skipped and the stream simply carries on. A run with nothing dead sees
   exactly the cards it always did. The offer slot caps in drawOffer apply
   here too — the daily is the same game, and it is where players are most
   likely to notice three identical offers in a row.

   Pity reads `owned` the same way it does in a normal run, which is what
   keeps this deterministic: the streak is a function of the run's own cards,
   and those are identical for every player who reached this round the same
   way, so the forced Rare+ lands on the same offer for all of them. */
export function pickDailyUpgrades(dateSeed, count = 3, owned = [], focus = null) {
  const rng = mulberry32(dateSeed);
  const pool = UPGRADES.filter((u) => u.id !== JACKPOT_ID && !u.retired);
  return drawOffer(pool, count, owned, rng, {
    isDead: isDeadUpgrade,
    pity: pityActive(owned),
    focus: activeFocus(owned, focus),
  });
}

/* ─── Opening archetype ───
   The run's starting direction. In a normal run the player picks one of
   ARCHETYPE_OFFER_COUNT; in a daily they don't, because a choice would make
   two players on the same cards see different offers — the one thing the
   daily cannot give up. The day's archetype is therefore a pure function of
   the date, which is also why nothing about it needs saving (see
   dailyArchetype). */
export function pickArchetypes(count = ARCHETYPE_OFFER_COUNT, rng = Math.random) {
  /* Clamped rather than trusted: ARCHETYPE_OFFER_COUNT is a tuning constant
     and a retune past ARCHETYPES.length would otherwise return a short offer
     (a 2-card picker with no explanation) rather than the whole set. */
  return shuffle(ARCHETYPES, rng).slice(0, Math.max(0, Math.min(count, ARCHETYPES.length)));
}

/* The daily's opening archetype — same for every player on a given date, and
   the same on a resumed run as on a straight-through one, because it depends
   on nothing but the date. Round 0 of the dedicated archetype stream: no round
   0 board exists, so this seed cannot collide with a board or a card draw. */
export function dailyArchetype(date = new Date()) {
  return pickArchetypes(1, mulberry32(dailyRoundSeed(0, DAILY_STREAM.archetype, date)))[0];
}

/* ═══════════ SCORE ATTACK ═══════════

   The leaderboard mode. Two rules make its number mean something, and both
   are enforced by this file's callers rather than here:

     1. No assists. No undo, no hints — an assisted run and an unassisted run
        are not comparable, and a leaderboard that mixed them would be
        reporting nothing. See canAssist in App.jsx.

     2. Nothing is written until the run ends. There is deliberately NO
        saveScoreRun / loadScoreRun / clearScoreRun: the absence of a resume
        path is the mechanism, not a missing feature. A saved score run could
        be picked back up after a loss, and then "your runs" would be a list
        of attempts rather than of runs.

   The two keys are separate from the normal run's best and the daily's best on
   purpose. Three different "records" for three different modes, and the whole
   reason this mode can be trusted is that its record means the same thing
   every time it is read — a score, never a round count. */

export const SCORE_BEST_KEY = "cascade:scoreBest";
export const SCORE_RUNS_KEY = "cascade:scoreRuns";
/* How many score runs have been STARTED. Not part of the standings (a try that
   never cleared a round scores nothing and is never ranked) — it exists only so
   Home can tell "never tried" from "tried, no score yet". Without it a player
   who had just lost a run on round 1 was told "Not attempted". */
export const SCORE_TRIES_KEY = "cascade:scoreTries";
export function loadScoreTries() {
  try {
    const n = parseInt(localStorage.getItem(SCORE_TRIES_KEY), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}
export function bumpScoreTries() {
  const n = loadScoreTries() + 1;
  try { localStorage.setItem(SCORE_TRIES_KEY, String(n)); } catch {}
  return n;
}

/* Eight, not ten or "all of them": the board is rendered as fixed-height rows
   with no scrolling (it lives on the game-over card, where the viewport is
   already occupied by the result and two buttons), and a list that outgrows
   its card is worse than a list that ends. The score is cumulative in the
   sense that matters — one player's own best survives every overwrite below,
   because SCORE_BEST_KEY is written independently of this cap. */
export const SCORE_RUNS_MAX = 8;

/* The personal best, or 0. Math.max with 0 and the || 0 are both load-bearing:
   a hand-edited or truncated value must never be able to render as "best
   NaN" or a negative best in the HUD. */
export function loadScoreBest() {
  try {
    const n = parseInt(localStorage.getItem(SCORE_BEST_KEY), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/* The runs list, newest-best first, already trimmed and validated.

   Validated on the way OUT of storage rather than trusted: this key is the one
   piece of the mode's state a future build, a devtools session or a partial
   write could put a non-number in, and every consumer renders it — so
   .toLocaleString() on a string, or `r.score - a.score` sorting by string
   concatenation, would both surface as visibly wrong output on the card that
   the player is looking at precisely to check their score.

   Sorted here rather than at each render so every reader (the card, and
   anything added later) sees one order, and so the order is fixed by what is
   ON DISK rather than by how long ago the run happened. ts breaks ties, newest
   first — two runs can genuinely tie on score, and without it their relative
   order would depend on the sort implementation. */
export function loadScoreRuns() {
  try {
    const raw = localStorage.getItem(SCORE_RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => r && Number.isFinite(r.score) && r.score > 0 && Number.isFinite(r.round) && r.round > 0)
      .map((r) => ({ score: Math.floor(r.score), round: Math.floor(r.round), ts: Number.isFinite(r.ts) ? r.ts : 0 }))
      .sort((a, b) => b.score - a.score || b.ts - a.ts)
      .slice(0, SCORE_RUNS_MAX);
  } catch {
    return [];
  }
}

/* Records one finished run, and returns everything the results card needs to
   render without a second read of storage.

   The `best` reported is read BEFORE this run is appended, so `isNew` is a
   real comparison and a tie correctly does not claim a record. That ordering
   is also why a failed write cannot produce a "New High Score" on a card whose
   board does not contain the run — recordScoreRun can report a run that never
   reached storage (quota, private-mode), and the card's own empty state covers
   that rather than the two disagreeing.

   `rank` is computed against the FULL merged list, not the trimmed one, so it
   is this run's true position rather than its index in a list that dropped the
   bottom — though with the cap applied to the merge below, every run that
   survives to disk is rank 1..8 by construction. */
export function recordScoreRun(score, round) {
  const s = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const r = Number.isFinite(round) ? Math.max(0, Math.floor(round)) : 0;
  const entry = { score: s, round: r, ts: Date.now() };
  /* Load the best from disk rather than only from the list: the list is capped,
     so a record-setting run is written and then evicted from the list by eight
     better runs in the same session, and deriving the best from the list alone
     would let the record silently fall back. */
  const prevBest = loadScoreBest();
  const merged = [entry, ...loadScoreRuns()]
    .sort((a, b) => b.score - a.score || b.ts - a.ts);
  const rank = merged.findIndex((e) => e.ts === entry.ts && e.score === entry.score) + 1;
  const isNew = s > prevBest;
  const best = Math.max(prevBest, s);
  try {
    localStorage.setItem(SCORE_RUNS_KEY, JSON.stringify(merged.slice(0, SCORE_RUNS_MAX)));
    if (isNew) localStorage.setItem(SCORE_BEST_KEY, String(best));
  } catch {
    /* Storage full or unavailable. The caller still gets a coherent verdict
       from the in-memory values above; only the board on disk is missing. */
  }
  /* ts is returned so the results card can identify THIS run's own row by
     identity. It cannot use its score or its position: the board is sorted by
     score, so a run that beat the previous best and a run that finished below
     it are two different cases, and a tie puts two runs on the same figure.
     Matching on the timestamp is exact in all three. */
  return { score: s, round: r, best, isNew, rank, ts: entry.ts };
}
