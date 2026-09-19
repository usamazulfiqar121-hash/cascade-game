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

/* ─── Upgrade pool picker ─── */
export function pickRandomUpgrades(count) {
  const weighted = [];
  UPGRADES.forEach((u) => {
    const weight = Math.max(1, 6 - u.rarity * 1.5) | 0;
    for (let i = 0; i < weight; i++) weighted.push(u);
  });
  const picked = [];
  const used = new Set();
  let guard = 0;
  while (picked.length < count && guard < 200) {
    const u = weighted[(Math.random() * weighted.length) | 0];
    if (used.has(u.id)) { guard++; continue; }
    used.add(u.id);
    picked.push(u);
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

export function computeStreak(results) {
  let streak = 0;
  const today = new Date();
  const todayDone = !!results[dailyKey(today)];
  const start = todayDone ? 0 : 1;
  for (let i = start; i < 365; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    if (results[dailyKey(d)]) streak++;
    else break;
  }
  return streak;
}

/* ─── Auto-sort (roguelike upgrade effect) ─── */
export function applyAutoSort(tubes, count) {
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
    for (const color of shuffle(colorArr)) {
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

/* ─── Level generator ─── */
export function generateLevel(round, runUpgrades, prevMovesLeft, seed = null) {
  const rng = seed !== null ? mulberry32(seed) : Math.random;
  const colorCount = Math.min(2 + Math.floor((round - 1) / 2), 7);
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
  tubes = applyAutoSort(tubes, autoSortCount);

  const baseLimit = Math.round(colorCount * 3 + round * 0.8) + 4;
  const moveBonus = sumMoveBonus(runUpgrades);
  const perfectClearBonus = runUpgrades.includes("clear") && prevMovesLeft >= 5 ? 3 : 0;
  const moveLimit = baseLimit + moveBonus + perfectClearBonus;

  return { tubes, moveLimit, colorCount };
}
