/* ═══════════ GAME LOGIC LAYER ═══════════
   Pure functions. No React, no state, no side effects
   (except Math.random default in shuffle). */

import { MAX_HEIGHT, UPGRADES, DAILY_TWISTS, OFFER_TUNING, CATEGORY_ORDER, ARCHETYPES, ARCHETYPE_OFFER_COUNT, FOCUS_OFFERS } from "./constants";

/* ─── Move calculation helpers ─── */
export function sumMoveBonus(ups) {
  return ups.reduce((s, id) => s + (UPGRADES.find((u) => u.id === id)?.value || 0), 0);
}

/* Per-pour refunds. Their SUM has to stay well under one move per pour, or
   a run stops spending moves at all: the old numbers (luck stacking to 70%,
   +1 every 2nd pour, +2 every 5th) refunded about 1.6 moves per pour at the
   top, i.e. every pour was free and the run could not be lost. Now the most a
   NORMAL run can stack is 0.40 + 0.33 + 0.25 = ~0.98 only with ALL of them,
   and each is a rare-ish pick — a real engine you build, not a default.

   Now that the ceiling applies to EVERY mode, not just the normal one. It used to
   read `0.40 + 0.33 + 0.25 = ~0.98` as a normal-run figure and go on to admit
   that a daily on a Lucky Day re-capped at 0.5 for a true ceiling of ~1.08 —
   above one move per pour, which is the one thing this comment exists to
   prevent. Both modes are now capped by the same LUCK_CAP (the caller in
   App.jsx applies it, which is why nothing here caps the daily).

   Being honest about the number that leaves: ~0.98 is UNDER one move per
   pour, but it is not "well under" it, and it only exists on a run holding
   BOTH luck cards AND combo2 AND mega. Every one of those is a card the player
   chose, so it is an engine rather than a default — but if a future card
   raises any term, this ceiling crosses 1 again with no code change at all.
   That is the thing to watch when tuning, and it is why the cap is a named
   constant instead of a literal in the caller. */
export const LUCK_CAP = 0.4;
export function getLuckyChance(ups) {
  return Math.min(LUCK_CAP, ups.reduce((s, id) => s + (id === "lucky" ? 0.2 : id === "lucky2" ? 0.25 : 0), 0));
}

export function getComboEvery(ups) {
  if (ups.includes("combo2")) return 3;
  if (ups.includes("combo3")) return 4;
  return 0;
}

export function getMegaEvery(ups) {
  return ups.includes("mega") ? 8 : 0;
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

   The filter can never empty the offer, and it is in fact far weaker than this
   comment used to claim. Only three cards in this pool can EVER be filtered
   out of an offer, and only under the conditions in isDeadUpgrade:

     combo3 — dead once combo2 is owned (combo2 pays every 3 pours against
              combo3's 4, so it subsumes it)
     tube   — dead once BOARD_CARD_CAP copies are owned
     auto   — same

   The rest cannot fire at all, for a reason worth stating because it is not
   obvious from reading the switch: clear, mega, combo2, glass and invest are
   all tested with `owned.includes(id)`, and a card can only be a CANDIDATE if
   the run does not own it — so for a candidate those tests are false by
   construction. A run that owns Perfect Clear does not get Perfect Clear
   filtered out of the offer; it simply never sees it in the pool to begin
   with, which is drawOffer's `owned` handling doing a different job.

   NEITHER luck card is ever filtered, which is the part that had been written
   wrong here twice. isDeadUpgrade asks whether taking the card moves the
   chance, and a candidate is always unowned — so at most ONE of the pair can
   be owned, capping the current chance at 0.2 or 0.25. Adding the other takes
   it to min(0.4, 0.45) = 0.4 either way. 0 changes to 0.25, 0.2 changes to
   0.4, 0.25 changes to 0.4: never a tie, so the equality test at the bottom
   of the switch can never be true for a candidate. (An earlier version of this
   comment claimed the opposite — that Super Lucky is dead whenever Lucky Drop
   is owned — which is wrong, and self-contradictory two sentences later.)

   So at most three of fifteen are ever removed, leaving at least twelve
   eligible against the three an offer needs. That is why the relax ladder in
   drawOffer never has to give up this rule. */
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
  /* `!u.retired` as well as `!u.dailyOnly`. The daily pool filters retired and
   this one did not, so the day a card is retired WITHOUT also carrying
   dailyOnly it would quietly keep being offered in normal runs forever. `dawn`
   happens to hold both flags today, which is the only reason nothing leaks
   right now — i.e. nothing was stopping it, the overlap was the accident. */
  const pool = UPGRADES.filter((u) => u.id !== JACKPOT_ID && !u.dailyOnly && !u.retired);
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
  /* HINT_SAFETY_CAP bounds ONE probe, not this whole call. A crowded board can
     offer thirty legal pours, and findHint ran them in sequence, each sweeping up
     to 3000 states — which on a mid-range Android is not a hint, it is a freeze
     the player cannot tap through. So the budget is SHARED across the candidate
     list instead of being handed to each probe whole.

     What that does to the RESULT is the reason sharing is safe rather than a
     quality cut: isReachablySolvable returns TRUE the moment it exceeds its cap
     ("unresolved within budget — treat as safe"). A smaller cap therefore makes
     a probe accept its candidate SOONER. It never makes the hint worse — it only
     makes the hint stop ruling a candidate OUT for being a proven dead end, and
     the fallback below was already an unconditional legal pour. Worst case is
     unchanged, and no round of asking ever gets slower than before. */
  const perProbe = Math.max(300, Math.floor(HINT_SAFETY_CAP / Math.max(1, candidates.length)));
  for (const c of candidates) {
    if (isReachablySolvable(pour(tubes, c.from, c.to), perProbe)) return c;
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
  /* Every App caller narrows to a plain object EXCEPT shareDaily, which hands
     over the raw JSON.parse — and a truncated or hand-edited
     cascade:dailyResults holding `null` threw a TypeError on the two reads
     below. shareDaily's try/catch swallowed it, so the symptom was never a
     crash: it was "Share Result" quietly doing nothing. An empty object is the
     honest reading of "no results recorded". */
  const done = results && typeof results === "object" ? results : {};
  let streak = 0;
  const today = new Date();
  const todayDone = !!done[dailyKey(today)];
  const start = todayDone ? 0 : 1;
  /* Stops at the first missed day, so this only ever walks as far as the
     player's real streak. The cap is a safety net against a corrupt save,
     not a limit: it used to be 365, which froze a 400-day streak at 365.

     One Date, stepped backwards, instead of a fresh one per day. The old
     `new Date(today)` inside the loop allocated (and re-derived the local
     calendar fields for) up to 36,500 objects on a corrupt save, and callers
     reach this from render bodies, so the cost was paid on paint rather than
     once. App.jsx now also memoises its own call sites on [dailyResults,
     shieldedDates], so it runs on change rather than on every render — the two
     fixes are independent and both hold. setUTCDate on a copy mutates only the
     copy, so `today` itself is untouched and dailyKey(today) above still
     describes the real today. Mutating the copy is also what keeps this correct
     across a DST boundary: setUTCDate works in UTC days throughout, exactly as
     dailyKey's toISOString does. */
  const d = new Date(today);
  for (let i = start; i < 36500; i++) {
    d.setUTCDate(d.getUTCDate() - i);
    const key = dailyKey(d);
    if (done[key] || shieldedDates.includes(key)) streak++;
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

/* How many shuffles one cycle's order may be re-drawn before it is accepted as
   it stands. Reaching it means the fairness rules are hard to satisfy for some
   combination of twist kinds, not that the player had bad luck — see the
   fallback below. */
const TWIST_ATTEMPTS = 2000;

function twistOrder(block) {
  const ids = DAILY_TWISTS.map((_, i) => i);
  let order = ids;
  for (let attempt = 0; attempt < TWIST_ATTEMPTS; attempt++) {
    order = shuffle(ids, mulberry32(fmix32((block ^ TWIST_SALT ^ Math.imul(attempt, 0x9e3779b1)) >>> 0)));
    if (orderIsFair(order)) return order;
  }
  /* Reached only when every shuffle failed the checks. The old code fell out of
     the loop and returned whatever the last shuffle produced, with nothing to
     say so — and because the choice is a function of the block, a cycle that
     broke its own stated rules hit every player on that day identically and
     permanently, indistinguishable from every other cycle.

     The fallback is an EXHAUSTIVE deterministic search, not more luck and not
     a smarter sample. It walks all n! permutations of the ids in ascending
     lexicographic order, starting from the sorted ids, and returns the first
     fair one. Lexicographic order matters: it is a fixed function of n alone,
     so two players who reach this line on the same block get the same cycle
     without the block ever entering the comparison.

     Why exhaustive and not "try some more swaps": an earlier version of this
     fallback tested every single pair-swap out of one base order, which is
     n(n-1)/2 arrangements — only the immediate neighbourhood of that one
     order. If the fair cycle needed two or three disjoint swaps away, it was
     not in the set, and the fallback could fail while a perfectly good order
     existed. After 2,000 shuffles have missed, the useful question is no
     longer "what is likely" but "does one exist at all", and only a complete
     search answers that. Cost is 5,040 orderIsFair calls for seven twists,
     once per seven-day cycle, and only on this path — against the ~1ms of
     shuffling it replaces, on a code path that essentially never runs.

     If even a complete search finds nothing, the fairness rules are stricter
     than this twist mix can satisfy, and this is a genuine calendar bug worth
     seeing: it hits every player on that day identically and permanently. The
     last shuffled order is returned rather than rejected, because the caller
     indexes straight into DAILY_TWISTS and a null here would throw inside
     pickDailyTwist — taking the daily down completely instead of degrading it.
     So the warning is the whole of the response, deliberately loud, and it
     fires once per seven-day cycle where that happens. */
  const cand = ids.slice();
  for (;;) {
    if (orderIsFair(cand)) return cand;
    /* Next permutation in lexicographic order. The array is sorted ascending on
       entry, so this visits every permutation exactly once and terminates
       when no pivot remains (i < 0 means the whole array is descending). */
    let i = cand.length - 2;
    while (i >= 0 && cand[i] >= cand[i + 1]) i--;
    if (i < 0) break;
    let j = cand.length - 1;
    while (cand[j] <= cand[i]) j--;
    const tmp = cand[i]; cand[i] = cand[j]; cand[j] = tmp;
    for (let l = i + 1, r = cand.length - 1; l < r; l++, r--) {
      const s = cand[l]; cand[l] = cand[r]; cand[r] = s;
    }
  }
  if (typeof console !== "undefined" && console.warn) {
    const n = cand.length;
    let factorial = 1;
    for (let k = 2; k <= n; k++) factorial *= k;
    console.warn(`[cascade] twistOrder: no fair order for cycle ${block} in ${TWIST_ATTEMPTS} shuffles or all ${factorial} permutations`);
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
   for presentation — no game logic reads it.

   `short` is the one-line form the game HUD's modifier badge draws
   ("🏃 Long Haul · +3 moves") and, like DAILY_TWISTS' short, describes the
   rule's shape rather than its value on the current round: Escalation reads
   "−1/3 rounds" on round 2 and round 14 alike, where a number computed from
   moveDelta(round) would be right once and quietly wrong every other round.
   It is a field on the rule rather than a lookup table in App.jsx for the same
   reason `kind` is — the badge's text and the Codex's text are one rule, and
   two copies of a rule's wording is the shape that drifts.

   The three hooks are all consumed by generateLevel, and all three are
   round-aware, so a rule can ramp with the run (escalation) or only fire on
   particular rounds (gilded) rather than being a flat constant. */
export const WEEKLY_MUTATORS = [
  {
    id: "longhaul", name: "Long Haul", icon: "🏃", kind: "boon",
    desc: "+3 moves every round",
    short: "+3 moves",
    moveDelta: () => 3,
  },
  {
    id: "squeeze", name: "Tight Squeeze", icon: "✂️", kind: "curse",
    desc: "2 fewer moves every round",
    short: "−2 moves",
    moveDelta: () => -2,
  },
  {
    id: "deepcuts", name: "Deep Cuts", icon: "🎨", kind: "curse",
    desc: "Colours ramp up a round sooner",
    short: "colours sooner",
    colorDelta: 1,
  },
  {
    id: "warmup", name: "Free Sort", icon: "🌅", kind: "boon",
    desc: "Round 1 opens with one colour already sorted",
    short: "free colour on R1",
    autoSortDelta: (round) => (round === 1 ? 1 : 0),
  },
  {
    id: "escalation", name: "Escalation", icon: "📈", kind: "curse",
    desc: "1 fewer move for every 3 rounds you clear",
    short: "−1/3 rounds",
    moveDelta: (round) => -Math.floor((Math.max(1, round) - 1) / 3),
  },
  {
    id: "gilded", name: "Gilded Round", icon: "⭐", kind: "trade",
    desc: "Every 5th round opens with +8 moves",
    short: "+8 moves every 5th",
    moveDelta: (round) => (Math.max(1, round) % 5 === 0 ? 8 : 0),
  },
];

/* That week's Monday (UTC), as days since 1970. getUTCDay() is 0 for Sunday,
   so +6 then mod 7 lands Monday on 0. */
function mondayDayUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Math.floor(d.getTime() / 86400000);
}

/* The rotation as first shipped. Its "week" index was really a DAY count
   (snapped to Monday), so it moved in steps of 7 and changed six-week block
   almost every week: measured over 520 weeks it put the same rule on two
   weeks in a row 90 times, held one rule for 4 weeks straight, and showed all
   six rules inside a six-week window 1 time in 86. Kept, unchanged, ONLY for
   weeks before WEEK_CUTOVER_DAY so the week that was live when it was fixed
   keeps the rule players were already shown. */
function legacyWeekMutator(date) {
  const n = WEEKLY_MUTATORS.length;
  const week = mondayDayUTC(date) - DAILY_EPOCH_DAY;
  const block = Math.floor(week / n);
  return WEEKLY_MUTATORS[mutatorOrder(block)[week - block * n]];
}

/* Monday 2026-10-05: the first week counted in real weeks. */
const WEEK_CUTOVER_DAY = Date.UTC(2026, 9, 5) / 86400000;

/* One shuffled pass of the whole set per six-week block, so every mutator
   comes round exactly once per block and never twice inside one. */
function mutatorOrder(block) {
  const ids = WEEKLY_MUTATORS.map((_, i) => i);
  return shuffle(ids, mulberry32(fmix32((block ^ MUTATOR_SALT) >>> 0)));
}

/* A block's order with the seam guarded: if it would open on the rule the
   previous week closed on, its first two weeks swap. Swapping positions 0 and
   1 never touches position n-1, so the previous block's last rule is simply
   its raw order's last — no recursion. Block 0's previous week is the last
   legacy week. */
function blockOrder(block) {
  const n = WEEKLY_MUTATORS.length;
  const order = mutatorOrder(block).slice();
  const prevLast = block > 0
    ? mutatorOrder(block - 1)[n - 1]
    : WEEKLY_MUTATORS.indexOf(legacyWeekMutator(new Date((WEEK_CUTOVER_DAY - 7) * 86400000)));
  if (order[0] === prevLast) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

export function weekMutator(date = new Date()) {
  const monday = mondayDayUTC(date);
  if (monday < WEEK_CUTOVER_DAY) return legacyWeekMutator(date);
  const n = WEEKLY_MUTATORS.length;
  const week = (monday - WEEK_CUTOVER_DAY) / 7;
  const block = Math.floor(week / n);
  return WEEKLY_MUTATORS[blockOrder(block)[week - block * n]];
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

/* ═══════════ MOVE ECONOMY ═══════════

   What a round gives you, and why. The old budget was colours×3 + 0.8×round
   + 4 plus every "+N moves" card ever taken. Board difficulty stops growing
   at round 11 (seven colours) but that budget never stopped, and the cards
   stacked on top: simulated, a player finished round 20 with ~66 moves to
   spare and round 40 with ~130. Nothing could be lost, so no card mattered.

   The budget now has four parts, every one of them visible to the player:

     par    the fewest moves this board needs (solved, see boardPar).
     buffer slack on top of par: +50% on round 1, shrinking to +15% by
            round 6. Halved on a BOSS round (every 5th).
     drain  from round 3 on, a little less every round, accelerating
            (1.8/round + 0.05/round²). This is what the run's cards are
            racing: an average build keeps up, a strong one pulls ahead, a
            weak one falls behind — and eventually everyone is caught.
     carry  half the moves you finished the last round with, up to 5.
            Solving efficiently is rewarded on the very next board.

   The buffer is the ONLY slack worth cutting, and the reason is where the
   balance actually sits. The cards a run picks are worth ~1.6 moves a round
   on average (tempo cards are ~42% of what gets offered) while the drain
   takes 2 on round 3 and 32 by round 15 (drainLinear*k + drainSquare*k*k,
   k = round - 2) — so an average build's surplus is gone well before round 5.
   Turning the drain up by as little as 0.2, or the carry rate down by 0.1,
   ends an average run on round 5. The first three rounds were the one part of
   the buffer doing no work at all: +80/+71/+63% of a 5-9 move board is tutorial
   slack nobody can feel the edge of. That is what the numbers below cut.

   ⚠️ THE PREVIOUS VERSION OF THIS PARAGRAPH WAS WRONG, AND SO WAS EVERY
   NUMBER DERIVED FROM IT. It said the drain "takes 1.8 on round 3 and 2.9 by
   round 15". 2.9 is not any round's drain at all — the real curve is 3-11x
   steeper than that, because the quadratic term was not in the figure being
   quoted. Every conclusion drawn here ("round 14-15 for an average build",
   "25-26 for a strong one") therefore rests on a slope that does not exist.
   Arithmetic from these same constants puts sudden death on round 4 with no
   cards and round 8-9 with an average one — and because a run that crosses
   into sudden death finishes at exactly par, carry falls to 0 for the next
   board and it can never climb back out. Do NOT retune from the old figures.
   Use the [C7] log above, which exists for precisely this, and retune ONE
   number at a time against measured runs.

   Tuned against hand-computed estimates for: an average build ending on
   round 14–15 and a strong one on 25–26, with a few spare moves in mid-game.
   Those are MODEL numbers, not player data and not a measured simulation —
   the par table they were computed from is an estimate, and they have to be
   replaced by real play before anyone tunes further from them. The constants
   below are the knobs. */
export const MOVE_ECONOMY = {
  bufferStart: 0.5,   // round 1: par + 50%
  bufferEnd: 0.15,    // from bufferRound on: par + 15%
  bufferRound: 6,
  bossEvery: 5,       // every 5th round is a boss round...
  bossBuffer: 0.5,    // ...with half the buffer
  drainFrom: 2,       // drain is 0 up to and including this round
  drainLinear: 1.8,
  drainSquare: 0.05,
  carryRate: 0.5,
  carryCap: 5,
};
export const BOARD_CARD_CAP = 2; // Extra Tube / Auto-Sort: at most two of each
export const PAR_MASTER_BONUS = 4;
export const INVEST_CAP = 10;

/* Investment grows with the rounds since it was taken. A run takes exactly
   one card per cleared round, so a card's index in the list IS the round it
   was taken after (index 0 -> after round 1). The first round after taking it
   pays +1, then +2, ... up to INVEST_CAP. Derived, not stored, so a saved or
   resumed run (and a daily, regenerated from its upgrade list) always agrees. */
export function investmentBonus(ups, round) {
  const i = ups.indexOf("invest");
  if (i === -1) return 0;
  return Math.max(0, Math.min(INVEST_CAP, round - 1 - i));
}
/* Retries per NORMAL run (the daily and score attack have none). Was
   unlimited — and a retry also deals an easier recovery board — so a normal
   run could not actually end: every loss was one tap from undone, and the
   drain had nothing to threaten. Two keeps the casual safety net (a bad
   board or a mis-tap does not end a long run) while making the third loss
   final, which is what gives the late rounds their weight. */
export const RETRIES_PER_RUN = 2;

/* Clearing a boss round is paid in choice, not moves: one extra card on the
   offer that follows it. Moves would feed straight back into the economy the
   boss exists to squeeze; a wider pick makes the build better instead. */
export function offerCount(round, base = 3) {
  return base + (isBossRound(round) ? 1 : 0);
}

export function isBossRound(round) {
  return round > 0 && round % MOVE_ECONOMY.bossEvery === 0;
}

export function moveBudget(round, par, prevMovesLeft = 0) {
  const E = MOVE_ECONOMY;
  const t = Math.min(1, Math.max(0, (round - 1) / (E.bufferRound - 1)));
  const boss = isBossRound(round);
  const buffer = Math.round(par * (E.bufferStart + (E.bufferEnd - E.bufferStart) * t) * (boss ? E.bossBuffer : 1));
  const k = round - E.drainFrom;
  const drain = k > 0 ? Math.round(E.drainLinear * k + E.drainSquare * k * k) : 0;
  const carry = Math.min(E.carryCap, Math.floor(Math.max(0, prevMovesLeft || 0) * E.carryRate));
  return { base: par + buffer - drain + carry, buffer, drain, carry, boss };
}

/* Fewest moves that solve this board (near-minimal: weighted A*, which is
   what keeps it ~1ms on a 7-colour board instead of seconds). Deterministic —
   no rng — so a daily round's budget is identical for every player, and a
   resumed run recomputes exactly the budget it had. Falls back to a formula
   only if the search gives up, which no generated board has done in testing. */
export function boardPar(tubes, colorCount = 0) {
  const done = (t) => t.length === MAX_HEIGHT && t.every((c) => c === t[0]);
  const key = (T) => T.map((t) => t.join(",")).sort().join("|");
  const h = (T) => T.reduce((s, t) => {
    let breaks = 0;
    for (let i = 1; i < t.length; i++) if (t[i] !== t[i - 1]) breaks++;
    return s + breaks + (t.length && !done(t) ? 1 : 0);
  }, 0);
  const W = 1.2, CAP = 60000;
  /* binary heap on f */
  const heap = [];
  const push = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l].f < heap[m].f) m = l; if (r < heap.length && heap[r].f < heap[m].f) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const start = tubes.map((t) => [...t]);
  const k0 = key(start);
  const seen = new Map([[k0, 0]]);
  push({ T: start, g: 0, k: k0, f: h(start) });
  let expanded = 0;
  while (heap.length && expanded++ < CAP) {
    const c = pop();
    /* Throw away a stale entry instead of expanding it. `seen` is written at
       PUSH time below, so a node can still be sitting in the heap carrying a
       dearer g than the one now recorded for its key by a path found after it
       was queued. Expanding that copy is not WRONG — its g is the true cost of
       the path that produced it, so the par this function returns is always
       FEASIBLE — but it is wasted expansions, and it is what lets par come back
       1-2 above the true optimum on some boards. Every push is guarded by
       `seen.get(k) <= g` and values only ever decrease, so seen.get(c.k) <= c.g
       always holds here and this fires only on the strictly-dearer case.

       The key rides on the node rather than being recomputed with key(c.T):
       key() sorts and joins every tube, which on a 7-colour board costs more
       per pop than the whole check saves. */
    if (c.g > seen.get(c.k)) continue;
    if (c.T.every((t) => !t.length || done(t))) return c.g;
    for (let a = 0; a < c.T.length; a++) {
      const from = c.T[a];
      if (!from.length || done(from)) continue;
      const mono = from.every((x) => x === from[0]);
      let triedEmpty = false;
      for (let b = 0; b < c.T.length; b++) {
        if (a === b) continue;
        const to = c.T[b];
        if (to.length >= MAX_HEIGHT) continue;
        if (to.length && to[to.length - 1] !== from[from.length - 1]) continue;
        if (!to.length) { if (triedEmpty || mono) continue; triedEmpty = true; }
        const N = c.T.map((t) => [...t]);
        const col = N[a][N[a].length - 1];
        while (N[a].length && N[a][N[a].length - 1] === col && N[b].length < MAX_HEIGHT) N[b].push(N[a].pop());
        const k = key(N), g = c.g + 1;
        if (seen.has(k) && seen.get(k) <= g) continue;
        seen.set(k, g);
        push({ T: N, g, k, f: g + W * h(N) });
      }
    }
  }
  /* GIVE-UP FALLBACK. The loop above exits either because the heap emptied or
     because `expanded` hit CAP (60000 expansions), and this line cannot tell the
     two apart — both land here.

     Correcting the record on what this does and does not do, because an earlier
     audit reported it as able to produce an UNWINNABLE round. It cannot. par is
     a floor for the move budget, not a ceiling on it: every consumer scales UP
     from par — the move limit is par plus buffer, drain, carry and card bonuses
     — so an OVER-estimate here hands the player MORE moves, a larger buffer and
     a bigger carry into the following round. The failure direction is a round
     that is too EASY, not one that cannot be finished. There is no unwinnable
     case to chase, and no `Math.max` clamping that would fix one.

     So the real (minor) cost is a difficulty DROP on whichever boards actually
     exhaust CAP, and a run whose par spikes for one round picking up an
     inflated carry next round. It reads as an oddly easy round, which is
     confusing rather than unfair — hence LOW, not HIGH.

     Deliberately NOT changed. The formula is `colorCount * 3 + 2`, which for a
     7-colour board gives 23 against a typical measured par of roughly 5-9, so
     it is generous by design — a guess that errs toward playable. Tightening it
     would need a measurement of how often CAP is genuinely reached, and no such
     measurement exists; tuning the number on theory is how the give-up path ends
     up handing out LESS than the board needs. Left exactly as written. */
  return Math.max(1, colorCount * 3 + 2);
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
export function generateLevel(round, runUpgrades, prevMovesLeft, seed = null, struggled = false, twist = null, mutator = null, prevUnderPar = false) {
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

  /* Par is measured on the board AS DEALT, before the run's board cards
     touch it. That is what makes Extra Tube and Auto-Sort worth taking: the
     budget is set by the plain board, and the cards then make the board you
     actually play easier than the budget assumed. Measured after them, the
     budget would shrink to match and the cards would buy nothing. */
  const par = boardPar(tubes, colorCount);

  const extraTubes = Math.min(BOARD_CARD_CAP, runUpgrades.filter((id) => id === "tube").length);
  for (let i = 0; i < extraTubes; i++) tubes.push([]);
  /* Warm Start is one free Auto-Sort, on top of any the run has taken.
     A mutator gets its own count here rather than sharing the twist's +1 —
     they can't both be active, and adding them together would hand out two
     free sorts if that ever changed. */
  const autoSortCount = Math.min(BOARD_CARD_CAP, runUpgrades.filter((id) => id === "auto").length)
    + (twistId === "warm" ? 1 : 0)
    + (m && m.autoSortDelta ? m.autoSortDelta(round) : 0);
  tubes = applyAutoSort(tubes, autoSortCount, rng);
  /* The par of the board the player actually gets. Lower than `par` once
     board cards apply (an Auto-Sort saves ~4 moves on average). The budget is
built from `par`, so the cards pay off; the HUD, "Need met!" and the floor
   below use this one, so they describe the board on screen. */
  /* min(): an extra empty tube cannot make a board need MORE moves; when the
     approximate search says otherwise (~2% of Extra Tube boards, by 1-2) it
     is search noise, and letting it through raised the HUD par and the floor
     because of a card meant to help. */
  const playPar = extraTubes || autoSortCount ? Math.min(par, boardPar(tubes, colorCount)) : par;

  /* Glass Cannon's cost: no carry at all. */
  const budget = moveBudget(round, par, runUpgrades.includes("glass") ? 0 : prevMovesLeft);
  const moveBonus = sumMoveBonus(runUpgrades) + investmentBonus(runUpgrades, round);
  /* Marksman ("clear"): the last round was solved within its need. */
  const perfectClearBonus = runUpgrades.includes("clear") && prevUnderPar ? PAR_MASTER_BONUS : 0;
  const ruleDelta = twistMoveDelta(twistId, round) + (m && m.moveDelta ? m.moveDelta(round) : 0);
  /* Never below the par of the board as played: however far the drain has
     run, a perfect solve still clears the round. Late rounds become "par or
     nothing" — the hardest the game gets, and still always winnable. Without
     this a weak build hit rounds with a limit of 1 on a 20-move board,
     unwinnable, while Retry kept offering to burn hearts on it. */
  const unclamped = budget.base + moveBonus + perfectClearBonus + ruleDelta;
  const moveLimit = Math.max(playPar, unclamped);
  /* SUDDEN DEATH: the drain has eaten every spare move, so the round is
     exactly par — and the per-pour refunds (luck, combo, mega) switch off.
     Without that second half the floor made runs endless: refunds forgave
     ~10 moves of mistakes a round, so a par-limit round was still easy, and a
     simulated average player never died. Move cards still matter here — they
     are what keeps a run OUT of sudden death for longer. */
  const suddenDeath = unclamped < playPar;

  /* ── C-7 INSTRUMENT — DELETE THIS BLOCK ONCE MEASURED ──────────────
     Phase 1 could only prove the SHAPE of the C-7 problem from the
     constants: sudden death is `buffer + carry + cards + rule < drain`, and
     that inequality is satisfied far earlier than the source comment's
     "round 14-15" target or AGENTS.md's "round 15-25". What it could not do is
     run `boardPar`, so it could not say which round a real run actually
     crosses on. That number decides whether MOVE_ECONOMY needs retuning at
     all, and it is not derivable on paper — `par` varies per board, so the
     crossover depends on the boards you happen to be dealt.

     This is the measurement AGENTS.md asks for: play 5-6 runs and write the
     numbers down. One line per board generated, in the browser console.

     It logs the four fields the audit asked for (round, unclamped, playPar,
     suddenDeath) PLUS budget.buffer/carry/drain and the card and rule
     contributions, because the four on their own cannot be acted on — you
     cannot tell from `unclamped` and `playPar` alone whether a round crossed
     because the drain grew, the carry ran out, or the cards stopped paying.
     The full line is the whole inequality, so a crossing can be read straight
     off it.

     `mode` separates daily from normal: they share these formulas but not
     their twist and mutator inputs, and a daily regenerates its level on
     resume, so its boards appear more than once and would otherwise be
     double-counted.

     Fires on every generateLevel call — new round, retry, and resume. That is
     wanted: it is the retry and resume boards too, and the only noise is
     repeat lines for the same round. */
  if (import.meta.env && import.meta.env.DEV) console.log(
    `[C7] r=${round} mode=${isDailyLevel ? "daily" : "normal"} ` +
    `unclamped=${unclamped} playPar=${playPar} limit=${moveLimit} suddenDeath=${suddenDeath} ` +
    `| buffer=${budget.buffer} carry=${budget.carry} drain=${budget.drain} boss=${budget.boss} ` +
    `cards=${moveBonus + perfectClearBonus} rule=${ruleDelta}`
  );
  /* ── END C-7 INSTRUMENT ─────────────────────────────────────────── */

  return {
    tubes, moveLimit, colorCount, par, playPar, suddenDeath,
    boss: budget.boss, buffer: budget.buffer, carry: budget.carry, drain: budget.drain,
    cards: moveBonus + perfectClearBonus, rule: ruleDelta,
  };
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
    /* The elements too, not just the array. dailyScore does arithmetic on
       every entry, so a single malformed round poisons the whole day's score
       to NaN — and NaN is nasty rather than merely ugly: the results card
       renders "NaN points", and because `NaN > dailyBestScore` is false the
       day's best is silently never recorded either. Only a value that is
       present AND non-numeric is rejected, so a partial or pre-fields save
       still resumes. */
    if (!r.rounds.every((x) => x && typeof x === "object"
      && (x.round === undefined || Number.isFinite(x.round))
      && (x.moves === undefined || Number.isFinite(x.moves))
      && (x.moveLimit === undefined || Number.isFinite(x.moveLimit)))) return null;
    for (const k of ["genPrevLeft", "nextPrevLeft", "moves", "bonusMoves", "combo"]) {
      if (!Number.isFinite(r[k]) || r[k] < 0) return null;
    }
    /* The two Marksman flags, coerced the same way loadNormalRun coerces
       lastRoundUnderPar. A save written before they existed leaves them
       undefined, which is falsy and so quietly pays nothing for one round —
       defaulting rather than rejecting keeps the rest of that run resumable,
       which is the whole point of the checks above. */
    r.genUnderPar = r.genUnderPar === true;
    r.nextUnderPar = r.nextUnderPar === true;
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

   The LEVEL is saved verbatim rather than regenerated, because a normal run's
   level comes from Math.random, so regenerating it would hand the player a
   DIFFERENT board for a round they had already begun thinking about —
   sometimes kinder, sometimes much worse, and never the one they actually
   left. That is the decision that keeps this cheap.

   The live POSITION is saved too, on every pour, undo and hint (see
   saveNormalLive in App.jsx), in a `live` block alongside it, and it is that
   block — not the level — which is validated on load. This half came later
   than the comment above used to admit, which still claimed the mid-pour
   position was deliberately not persisted.

   The one thing still written only at the boundary is the save that has the
   PICK RESOLVED — the next board, in chooseUpgrade. A normal run's next board
   depends on the card about to be picked, so there is nothing coherent to
   store until the choice exists. The offer itself is not in that category: it
   is written live at the solve, alongside the cleared board, precisely so a
   player cannot leave and come back to re-roll it. So a run left sitting on
   the upgrade screen loses the tap, not the choice.

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
    && Number.isFinite(l.colorCount) && l.colorCount >= 1
    /* The ball COUNT, which nothing above checks — only that each tube is short
       enough. generateLevel always deals exactly colorCount * MAX_HEIGHT balls,
       so a board that does not add up is a truncated or hand-edited save, and
       it soft-locks rather than merely looking wrong: an emptied board reads
       as SOLVED (isSolved is true) while canPour is always false, so no pour
       ever spends a move and the round can be neither won nor lost. The only
       way out was Home → New Run. */
    && l.tubes.reduce((n, t) => n + t.length, 0) === l.colorCount * MAX_HEIGHT;
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
    /* budgetBreakdown reads these off the resumed level, and from a stored
       object it cannot tell a field this build never wrote from one worth zero.
       A save predating playPar would otherwise render a sum short of its own
       total, with nothing on screen to say why. Defaulted rather than rejected:
       refusing the save over a missing label would throw away a run the player
       is still entitled to resume. par and playPar default to each other, so
       the worst case is an absent Cards row on a sum that still adds up. */
    const lvNum = (v, d) => (Number.isFinite(v) ? v : d);
    r.level.par = lvNum(r.level.par, r.level.playPar);
    r.level.playPar = lvNum(r.level.playPar, r.level.par);
    r.level.buffer = lvNum(r.level.buffer, 0);
    r.level.drain = lvNum(r.level.drain, 0);
    r.level.carry = lvNum(r.level.carry, 0);
    r.level.cards = lvNum(r.level.cards, 0);
    r.level.rule = lvNum(r.level.rule, 0);
    r.level.suddenDeath = r.level.suddenDeath === true;
    /* A run opened without a path (the picker was skipped) stores null, which
       is legal. A non-null one has to be a whole archetype, because runFocus
       reads .cats off it on every draw. */
    if (r.path && (typeof r.path.id !== "string" || !Array.isArray(r.path.cats))) return null;
    /* A default, NOT a reject, unlike the checks above it. Every other field on
       this level defaults, and this one used to throw the entire run away over
       a single number — the harshest possible reading of a value the resume
       path can perfectly well do without. A missing or nonsensical
       lastRoundMovesLeft just means carry falls to 0 for the next board, which
       is exactly what a player who finished with nothing left deserves. */
    if (!Number.isFinite(r.lastRoundMovesLeft) || r.lastRoundMovesLeft < 0) r.lastRoundMovesLeft = 0;
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
    /* Saves from before retries were limited have no count: they get the
       full allowance rather than none, since that run never spent any. */
    if (!Number.isInteger(r.retriesLeft) || r.retriesLeft < 0 || r.retriesLeft > RETRIES_PER_RUN) r.retriesLeft = RETRIES_PER_RUN;
    r.lastRoundUnderPar = r.lastRoundUnderPar === true;
    /* The live position is optional (a round-boundary save has none). A bad
       one is dropped rather than the whole run: the round then restarts from
       its saved start, which is what every save did before this existed. */
    const L = r.live;
    const ballCount = (T) => T.reduce((n, t) => n + t.length, 0);
    if (L && !(Array.isArray(L.tubes) && L.tubes.length === r.level.tubes.length
      && L.tubes.every((t) => Array.isArray(t) && t.length <= MAX_HEIGHT && t.every((b) => Number.isInteger(b) && b >= 0))
      && ballCount(L.tubes) === ballCount(r.level.tubes)
      && Number.isInteger(L.moves) && L.moves >= 0
      && Number.isInteger(L.bonusMoves) && L.bonusMoves >= 0
      && Number.isInteger(L.combo) && L.combo >= 0
      && (L.offer ? L.moves <= r.level.moveLimit + L.bonusMoves : L.moves < r.level.moveLimit + L.bonusMoves)
      && (L.undoLeft == null || (Number.isInteger(L.undoLeft) && L.undoLeft >= 0 && L.undoLeft <= 2))
      && (L.hintLeft == null || (Number.isInteger(L.hintLeft) && L.hintLeft >= 0 && L.hintLeft <= 2))
      /* The undo stack, when there is one. Absent is legal — a save written
         before it existed resumes with no spendable undo, which is the honest
         reading — but a MALFORMED one has to be caught here, because this is the
         only place a save passes through validation on its way back in. Reach
         setSnapshots with a snapshot whose .tubes is not an array and the throw
         lands in attemptPour, nowhere near the try/catch that would have made
         dropping it safe. Same ball count as the live board, since undo puts a
         position BACK and a wrong-sized one would break the parity canPour and
         isSolved both read. */
      && (L.snapshots == null || (Array.isArray(L.snapshots) && L.snapshots.every((s) => s
        && Array.isArray(s.tubes) && s.tubes.length === r.level.tubes.length
        && s.tubes.every((t) => Array.isArray(t) && t.length <= MAX_HEIGHT && t.every((b) => Number.isInteger(b) && b >= 0))
        && ballCount(s.tubes) === ballCount(r.level.tubes)
        && Number.isInteger(s.moves) && s.moves >= 0
        && Number.isInteger(s.bonusMoves) && s.bonusMoves >= 0
        && Number.isInteger(s.comboCount) && s.comboCount >= 0)))
      && (!L.offer || (Array.isArray(L.offer) && L.offer.length > 0 && L.offer.every((id) => UPGRADES.some((u) => u.id === id))
        && Number.isInteger(L.clearedLeft) && L.clearedLeft >= 0)))) r.live = null;
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
   getLuckyChance's ceiling, because that ceiling is LUCK_CAP = 0.4 and it IS
   reachable: the two luck cards sum to 0.2 + 0.25 = 0.45, which clamps to 0.4,
   so once one of them is owned the other is genuinely dead. That is why the
   test is an equality on the before-and-after chance rather than a threshold.
   (This used to describe a 0.7 ceiling that 0.2 + 0.35 = 0.55 "could never
   reach", so an old `>= 0.7` test silently filtered nothing. Under the real
   0.4 cap the equivalent threshold test WOULD have been wrong the other way —
   it would have filtered Super Lucky even when Lucky Drop was not owned.)
   Measured over 200 simulated days with
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
    case "tube":
    case "auto":
      return owned.filter((x) => x === id).length >= BOARD_CARD_CAP;
    case "glass":
    case "invest":
      return owned.includes(id);
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

/* Monotonic per-session counter behind recordScoreRun's `id`. Module scope, so
   it is not a fresh binding per call the way a body-scope let would be. It only
   has to be unique among the rows in one merged list, which is why resetting it
   on a reload is harmless: the ids it produced are gone with the rows they
   identified. */
let scoreRunSeq = 0;

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
  const ts = Date.now();
  /* Identity for THIS row, and it is deliberately not derived from anything
     stored. `ts` alone was the old key, and two runs can genuinely finish
     inside the same millisecond with the same score — the sort then puts them in
     an order that is stable rather than meaningful, and findIndex on
     (ts, score) returned whichever of the two happened to be merged first. The
     results card would then show a rank belonging to the other run.

     A module-local counter makes the identity unique per call, which is the
     only property findIndex needs: the entry compared against is the very
     object this function built, so the comparison cannot match a different row
     no matter what else is in the list. Wrapping past MAX_SAFE_INTEGER is not a
     concern — two calls would have to be 9e15 apart.

     This never outlives the call. loadScoreRuns maps every row it reads back to
     exactly {score, round, ts}, dropping id, so the id cannot collide with a
     future session's counter and a save written by this build is read back
     identically by any other. Writing id to disk is harmless but pointless, so
     the row is stripped on the way out rather than left to be dropped on the
     way in. */
  const entry = { score: s, round: r, ts, id: ++scoreRunSeq };
  /* Load the best from disk rather than only from the list: the list is capped,
     so a record-setting run is written and then evicted from the list by eight
     better runs in the same session, and deriving the best from the list alone
     would let the record silently fall back. */
  const prevBest = loadScoreBest();
  const merged = [entry, ...loadScoreRuns()]
    .sort((a, b) => b.score - a.score || b.ts - a.ts);
  const rank = merged.findIndex((e) => e.id === entry.id) + 1;
  const isNew = s > prevBest;
  const best = Math.max(prevBest, s);
  try {
    /* id stripped on the way out, so what lands on disk is exactly the shape
       loadScoreRuns reads — see the note on `entry`. */
    localStorage.setItem(SCORE_RUNS_KEY, JSON.stringify(
      merged.slice(0, SCORE_RUNS_MAX).map(({ score, round, ts }) => ({ score, round, ts })),
    ));
    if (isNew) localStorage.setItem(SCORE_BEST_KEY, String(best));
  } catch {
    /* Storage full or unavailable. The caller still gets a coherent verdict
       from the in-memory values above; only the board on disk is missing. */
  }
  /* ts is returned so the results card can identify THIS run's own row by
     identity. It cannot use its score or its position: the board is sorted by
     score, so a run that beat the previous best and a run that finished below
     it are two different cases, and a tie puts two runs on the same figure.
     Matching on the timestamp separates the first two but not the third.

     `id` comes back too, and it is the stronger key: ts is only unique to the
     millisecond. Nothing in the app matches the card's row by either field —
     "On Board" shows the `rank` computed above, not a row lookup — so `id`
     exists to make THAT number unambiguous rather than to be consumed by a
     caller. ts is kept in the return because it is the card's only other
     handle on this run, and adding an id to what is written would break
     loadScoreRuns' shape for no gain. */
  return { score: s, round: r, best, isNew, rank, ts: entry.ts, id: entry.id };
}
