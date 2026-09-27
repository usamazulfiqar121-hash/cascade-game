/* ═══════════ LOCAL NOTIFICATIONS — DAILY REMINDER ═══════════ */

import { msUntilNextDaily } from "./gameLogic";

const DAILY_REMINDER_ID = 1001;
const REMINDER_LEAD_MS = 60 * 60 * 1000;

let cached = null;
let loadAttempted = false;

async function getPlugin() {
  if (cached || loadAttempted) return cached;
  loadAttempted = true;
  try {
    const mod = await import("@capacitor/local-notifications");
    cached = mod.LocalNotifications || null;
  } catch {
    cached = null;
  }
  return cached;
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

export async function scheduleDailyReminder() {
  try {
    const plugin = await getPlugin();
    if (!plugin) return;
    const perm = await plugin.checkPermissions();
    if (perm.display !== "granted") return;
    const msLeft = msUntilNextDaily();
    if (msLeft <= REMINDER_LEAD_MS) return;
    const fireAt = new Date(Date.now() + (msLeft - REMINDER_LEAD_MS));
    await plugin.schedule({
      notifications: [{
        id: DAILY_REMINDER_ID,
        title: "Today's Cascade is waiting",
        body: "Less than an hour left to play today's challenge and keep your streak.",
        schedule: { at: fireAt, allowWhileIdle: true },
      }],
    });
  } catch {}
}

export async function cancelDailyReminder() {
  try {
    const plugin = await getPlugin();
    if (!plugin) return;
    await plugin.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
  } catch {}
}
