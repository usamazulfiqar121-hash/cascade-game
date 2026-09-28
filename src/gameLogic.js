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

export function computeStreak(results, shieldedDates = []) {
  let streak = 0;
  const today = new Date();
  const todayDone = !!results[dailyKey(today)];
  const start = todayDone ? 0 : 1;
  for (let i = start; i < 365; i++) {
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
export function pickDailyUpgrades(dateSeed, count = 3) {
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
    if (used.has(u.id)) { guard++; continue; }
    used.add(u.id);
    picked.push(u);
  }
  return picked;
}
