/* ═══════════ LOCAL NOTIFICATIONS — DAILY REMINDER ═══════════ */

import { computeStreak, loadShieldedDates, loadDailyState, dailyKey } from "./gameLogic";

/* Up to three reminders are planned at a time, ids 1001..1003: the one for
   today's puzzle (only while it still needs playing) and the next two days'.
   The old code scheduled a single reminder, once per app launch, for
   "one hour before the reset". Two problems, both measured:
     - The daily reset is UTC midnight, so "one hour before" is 04:00 in
       Pakistan, 04:30 in India, 00:00 in the UK. The reminder woke people.
     - It was only ever scheduled when the app was opened, so it could
       only remind someone who had just opened the app. Skip a day and
       nothing was queued for the day after.
   Now: the reminder is moved to 20:00 local when one hour before the reset
   would land in the night (22:00-08:00), the next two days are queued too
   (rebuilt on every launch and every play, so a player who stays away
   gets at most three nudges and then silence), and nothing is queued for
   today once the streak is already safe or the attempt is over. */
const REMINDER_BASE_ID = 1001;
const REMINDER_COUNT = 3;
const HOUR = 60 * 60 * 1000;
const QUIET_START = 22; /* local hour: no reminders from here... */
const QUIET_END = 8;    /* ...until here */
const EVENING = 20;     /* where a night-time reminder is moved to */
const MIN_LEAD_MS = 60 * 1000;

/* Same loading race as sound.js's haptics loader, same fix: cache the
   promise, not a boolean flag, and reset the cached promise on failure
   so a later call retries instead of leaving notifications permanently
   disabled for the session after one transient load error. */
let cachedPlugin = null;
let cachedPromise = null;

function getPlugin() {
  if (cachedPlugin) return Promise.resolve(cachedPlugin);
  if (!cachedPromise) {
    cachedPromise = import("@capacitor/local-notifications")
      .then((mod) => {
        cachedPlugin = mod.LocalNotifications || null;
        return cachedPlugin;
      })
      .catch(() => {
        cachedPromise = null;
        return null;
      });
  }
  return cachedPromise;
}

export async function initNotifications() {
  try {
    const plugin = await getPlugin();
    if (!plugin) return false;
    const current = await plugin.checkPermissions();
    if (current.display === "granted") return true;
    if (current.display === "denied") return false;
    const requested = await plugin.requestPermissions();
    return requested.display === "granted";
  } catch {
    return false;
  }
}

/* Pure planner, exported so it can be checked without a device.
   `now` is epoch ms. Returns [{ id, at: Date, title, body }]. */
export function planDailyReminders({ now, todayNeedsPlay, streak }) {
  const n = new Date(now);
  const plan = [];
  for (let k = 0; k < REMINDER_COUNT; k++) {
    if (k === 0 && !todayNeedsPlay) continue;
    /* Per-day Date.UTC, not `nextReset + k * 24h`: adding a fixed 24 hours
       walks off UTC midnight by an hour across a DST change, so k=1/k=2
       drifted to 23:00/01:00 local and the quiet-hours test below read the
       wrong hour. */
    const reset = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1 + k);
    const lead = reset - HOUR;
    let at = new Date(lead);
    let lastHour = true;
    if (at.getHours() >= QUIET_START || at.getHours() < QUIET_END) {
      /* the hour before the reset is the middle of the night here: use the
         latest 20:00 local before it, as long as it is still inside the same
         puzzle day. Which day that 20:00 falls on is decided by the RESET,
         not by the lead time: east of UTC+1 the reset lands at 01:00-09:00
         local, so tonight's 20:00 is still before the reset and still belongs
         to this puzzle. Measuring against the lead instead pushed it back a
         day, and the guard below then dropped it outright -- leaving every
         player from UTC+1 to UTC+9 (India +5:30, Pakistan +5, SE Asia +7/+8)
         with no same-day reminder at all, and the k=1/k=2 nudges landing on
         the wrong day's puzzle. */
      const evening = new Date(at);
      evening.setHours(EVENING, 0, 0, 0);
      if (evening.getTime() >= reset) evening.setDate(evening.getDate() - 1);
      at = evening;
      lastHour = false;
    }
    /* Safety net: never let a reminder land before its own puzzle day began
       (only reachable now through a DST edge). */
    if (at.getTime() <= reset - 24 * HOUR) continue;
    if (at.getTime() < now + MIN_LEAD_MS) continue;
    let body;
    if (k === 0) {
      body =
        streak >= 2
          ? lastHour
            ? `Less than an hour left \u2014 don't lose your ${streak}-day streak.`
            : `Your ${streak}-day streak is on the line \u2014 today's puzzle is still open.`
          : lastHour
          ? "Less than an hour left to play today's challenge."
          : "Today's puzzle is still open \u2014 same board for everyone.";
    } else {
      body = "A fresh daily puzzle is ready \u2014 same board for everyone.";
    }
    plan.push({ id: REMINDER_BASE_ID + k, at, title: "Today's Cascade is waiting", body });
  }
  return plan;
}

async function doSync() {
  try {
    const plugin = await getPlugin();
    if (!plugin) return;
    const perm = await plugin.checkPermissions();
    if (perm.display !== "granted") return;
    let results = {};
    try {
      const parsed = JSON.parse(localStorage.getItem("cascade:dailyResults") || "{}");
      /* Valid JSON is not automatically a usable record: a stored "null" (or a
         number, or a bare array) parses without throwing, and the `results[key]`
         lookup below then throws a TypeError that the outer catch swallows --
         silently leaving no reminders scheduled at all. Only a plain object
         counts, so anything else falls back to "no plays yet". */
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) results = parsed;
    } catch {}
    const streak = computeStreak(results, loadShieldedDates());
    const st = loadDailyState();
    const todayNeedsPlay =
      !results[dailyKey()] && st?.status !== "failed" && st?.status !== "completed";
    const plan = planDailyReminders({ now: Date.now(), todayNeedsPlay, streak });
    /* cancel first: the plan is rebuilt from scratch every time */
    await plugin.cancel({
      notifications: Array.from({ length: REMINDER_COUNT }, (_, i) => ({ id: REMINDER_BASE_ID + i })),
    });
    if (!plan.length) return;
    await plugin.schedule({
      notifications: plan.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        schedule: { at: r.at, allowWhileIdle: true },
      })),
    });
  } catch {}
}

/* Rebuilds the reminders from the current daily state. Call after anything
   that changes what's true about today: app launch, day rollover, starting
   a run, securing the streak, losing. Calls are serialized so two quick
   ones (start, then clear round 1) can't interleave their cancel/schedule
   and leave a stale reminder behind. */
let syncChain = Promise.resolve();
export function syncDailyReminders() {
  syncChain = syncChain.then(doSync);
  return syncChain;
}
