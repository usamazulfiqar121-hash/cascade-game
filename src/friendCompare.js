/* ═══════════ FRIEND COMPARISON (offline) ═══════════
   Pure functions — no React, no network, no accounts. Same
   constraint as src/leaderboard.js: this game has no backend, so
   "comparing with a friend" happens by trading a short text code
   through whatever the player already uses to talk to that friend
   (a text message, WhatsApp, anything navigator.share hands off to)
   rather than through a server neither of you is signed into.

   Code shape: "CSC1:YYYYMMDD:R" — a version tag, today's date (the
   same compact form dateToSeed() already parses in gameLogic.js, so
   it lines up with the date the puzzle itself was seeded from), and
   rounds cleared. Deliberately NOT base64/JSON — a friend receiving
   this is a human pasting a text message into a phone keyboard, not
   a program consuming an API, so plain digits and colons beat a
   compact-but-opaque encoding.

   decodeCompareCode() scans for the code inside arbitrary pasted
   text rather than requiring an exact match, so a friend can paste
   the WHOLE shared message (share text + code + link) instead of
   having to isolate just the code substring by hand. */

const CODE_PREFIX = "CSC1";
const CODE_RE = /CSC1:(\d{4})(\d{2})(\d{2}):(\d{1,4})/;
const FRIENDS_KEY = "cascade:friends";
const MAX_FRIENDS = 20;

export function encodeCompareCode({ dateKey, rounds }) {
  const compact = String(dateKey).replace(/-/g, "");
  const r = Math.max(0, Math.round(rounds) || 0);
  return `${CODE_PREFIX}:${compact}:${r}`;
}

export function buildCompareShareText({ dateKey, rounds }) {
  const code = encodeCompareCode({ dateKey, rounds });
  const r = Math.max(0, Math.round(rounds) || 0);
  return (
    `I cleared ${r} round${r === 1 ? "" : "s"} in today's Cascade daily! ` +
    `Beat it: ${code}\ncascade-main-rho.vercel.app`
  );
}

/* Returns { dateKey, rounds } or null. Validates the date actually
   exists (rejects e.g. month 13 or day 32 — a mistyped/garbled paste
   shouldn't produce a confidently-wrong comparison) and that rounds
   parses as a non-negative integer. */
export function decodeCompareCode(text) {
  if (typeof text !== "string") return null;
  const m = text.match(CODE_RE);
  if (!m) return null;
  const [, y, mo, d, roundsStr] = m;
  const dateKey = `${y}-${mo}-${d}`;
  const asDate = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(asDate.getTime())) return null;
  if (asDate.toISOString().slice(0, 10) !== dateKey) return null; // rejects e.g. 2026-02-30
  const rounds = parseInt(roundsStr, 10);
  if (!Number.isFinite(rounds) || rounds < 0) return null;
  return { dateKey, rounds };
}

export function loadFriends() {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    /* Being an array is not enough. FriendCompare reads f.id / f.label /
       f.rounds / f.dateKey straight off every entry while rendering, so one
       null or half-written record is a render-time TypeError that takes the
       whole game-over card down with it — a corruption the old
       Array.isArray check happily passed through. Only complete records
       survive. `f &&` matters here: typeof null is "object", so the type
       check alone would let a null through and then throw on the next
       property read. */
    return parsed.filter(
      (f) =>
        f &&
        typeof f === "object" &&
        typeof f.id === "string" &&
        typeof f.dateKey === "string" &&
        Number.isFinite(f.rounds)
    );
  } catch {
    return [];
  }
}

/* Write the list, and report whether it actually stuck. setItem throws for
   reasons a caller can neither see nor prevent — a full quota, a
   private-mode/blocked-storage WebView — and both mutators used to swallow
   that and hand back the list they had *meant* to store. The caller then
   painted the new friend on screen, cleared the paste box and reported
   "Added", while the entry was never saved and disappeared the moment
   anything re-read storage. A failed write now returns the CURRENT stored
   list (unchanged) plus a flag: the panel renders what's actually stored,
   and the player is told the write didn't happen. */
function persist(list) {
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
    return { friends: list, writeFailed: false };
  } catch {
    return { friends: loadFriends(), writeFailed: true };
  }
}

export function saveFriend({ label, dateKey, rounds }) {
  const friends = loadFriends();
  const score = Math.max(0, Math.round(rounds) || 0);
  /* Pasting the same message twice used to add the same friend twice: a
     second identical row, and at MAX_FRIENDS a duplicate could push the
     oldest real entry out just to make room for a copy of something already
     there. The code's entire payload is date + rounds, so match on exactly
     that and relabel the entry that already holds it — which is what
     re-pasting the same result under a different name actually means. An
     existing entry keeps its id (and therefore its row order and its
     savedAt), and an empty label keeps the name it already has rather than
     resetting to "Friend". */
  const existing = friends.find((f) => f.dateKey === dateKey && f.rounds === score);
  const entry = existing
    ? { ...existing, label: (label || "").trim().slice(0, 24) || existing.label }
    : {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: (label || "Friend").trim().slice(0, 24) || "Friend",
        dateKey,
        rounds: score,
        savedAt: Date.now(),
      };
  const updated = existing
    ? friends.map((f) => (f.id === existing.id ? entry : f))
    : [entry, ...friends].slice(0, MAX_FRIENDS);
  return { ...persist(updated), duplicate: Boolean(existing) };
}

export function removeFriend(id) {
  return persist(loadFriends().filter((f) => f.id !== id));
}

/* Head-to-head against the player's own result for `myDateKey`. Only
   meaningful same-day — a code from a different date is a different
   puzzle (a different seed), not a worse or better run of this one,
   so comparing the raw numbers would be comparing apples to oranges
   dressed up as a score difference. */
export function compareToFriend(friend, myRounds, myDateKey) {
  if (!friend || friend.dateKey !== myDateKey) {
    return { comparable: false };
  }
  const delta = (myRounds || 0) - friend.rounds;
  return {
    comparable: true,
    delta,
    ahead: delta > 0 ? "you" : delta < 0 ? "friend" : "tie",
  };
}
