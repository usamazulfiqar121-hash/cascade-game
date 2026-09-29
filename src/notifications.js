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
  const nextReset = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1);
  const plan = [];
  for (let k = 0; k < REMINDER_COUNT; k++) {
    if (k === 0 && !todayNeedsPlay) continue;
    const reset = nextReset + k * 24 * HOUR;
    const lead = new Date(reset - HOUR);
    let at = lead;
    let lastHour = true;
    if (lead.getHours() >= QUIET_START || lead.getHours() < QUIET_END) {
      /* the hour before the reset is the middle of the night here: use the
         latest 20:00 local before it, as long as it is still inside the
         same puzzle day */
      at = new Date(lead);
      at.setHours(EVENING, 0, 0, 0);
      if (at.getTime() > lead.getTime()) at.setDate(at.getDate() - 1);
      lastHour = false;
      if (at.getTime() <= reset - 24 * HOUR) continue;
    }
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
    try { results = JSON.parse(localStorage.getItem("cascade:dailyResults") || "{}"); } catch {}
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
