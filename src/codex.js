/* ═══════════ CODEX — lifetime discovery log ═══════════
   What the player has actually done, across all runs.

   Deliberately NOT a progression system: nothing here is spent, gates
   anything, or changes a number the game computes. It is a read-only
   record of three things the player can only learn by playing — which
   opening paths they have used, which cards exist in each category, and
   which daily rules they have lived through.

   The reason it can be read-only is that every one of those three is
   already a function of the player's own history, so this file only has to
   remember which ids have been touched, never a derived value that could
   go stale.

   Same corrupt-data contract as ACH_KEY (see unlockAch in App.jsx): a
   truncated write, a hand-edited value or a bare number must read as "no
   discoveries yet" rather than throwing, because this is read during
   render of a screen the player opened deliberately. */

import { ARCHETYPES, DAILY_TWISTS, UPGRADES } from "./constants";

export const CODEX_KEY = "cascade:codex";

const ARCHETYPE_IDS = new Set(ARCHETYPES.map((a) => a.id));
const TWIST_IDS = new Set(DAILY_TWISTS.map((t) => t.id));
/* Retired cards are excluded: `dawn` is strictly worse than `m8` and can
   never be offered again (see UPGRADES), so listing it would be advertising
   a card that does not exist. An old save can still hold one, which is why
   the filter is on the catalog side only — the counter for a retired id is
   simply never rendered. */
const CARD_IDS = new Set(UPGRADES.filter((u) => !u.retired).map((u) => u.id));

/* A tally map from whatever is on disk, filtered to ids THIS build knows
   about and coerced to a finite non-negative count.

   The id filter is the important half. Without it a rename or a removal in
   a future patch leaves the old id sitting in the save forever, and since
   the screen renders straight from these maps, a retired archetype would
   stay on the list as a ghost row with a permanent count. Filtering on read
   means the save can hold anything and the screen can only ever show
   reality.

   Non-objects, arrays and nulls all read as empty rather than throwing —
   `typeof [] === "object"` is exactly the case that used to slip through
   an isArray-style check on a different key. */
function tally(raw, valid) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const k of Object.keys(raw)) {
    if (!valid.has(k)) continue;
    const n = Number(raw[k]);
    if (Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
  }
  return out;
}

/* Built fresh on every call rather than returned as one shared module-level
   object. bump() below mutates what loadCodex() hands it (`next[section] =
   ...`), so a shared constant would be written through on the very first
   card of a fresh install and stay corrupted for the rest of the session —
   every later write would read its own output back as the starting state. A
   three-key literal is free; the aliasing bug is not worth the saving. */
const emptyCodex = () => ({ paths: {}, twists: {}, cards: {} });

export function loadCodex() {
  try {
    const raw = localStorage.getItem(CODEX_KEY);
    if (!raw) return emptyCodex();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyCodex();
    return {
      paths: tally(parsed.paths, ARCHETYPE_IDS),
      twists: tally(parsed.twists, TWIST_IDS),
      cards: tally(parsed.cards, CARD_IDS),
    };
  } catch {
    return emptyCodex();
  }
}

/* Read-modify-write, once per event.

   Kept as three separate small writers rather than one merged update
   because the call sites are genuinely different moments — a path is
   chosen once per run, a card once per round, a twist once per day — and a
   merged `bump({path, card, twist})` would have every caller pass the
   other two as null and then silently drop whichever key it forgot to
   forward. A whole-game pause is not a concern at this size: the payload is
   three short id->count maps.

   Every writer returns the merged object, so a caller that wants to react
   (nothing does today) doesn't have to re-read. */
function bump(section, valid, id) {
  if (!valid.has(id)) return loadCodex();
  const next = loadCodex();
  next[section] = { ...next[section], [id]: (next[section][id] || 0) + 1 };
  try { localStorage.setItem(CODEX_KEY, JSON.stringify(next)); } catch {}
  return next;
}

/* A run that actually opened with `id` — chosen in a normal run, or the
   day's path in a daily. A run the player skipped the picker on records
   nothing, because it ran with no path and claiming one would be a lie. */
export function recordCodexPath(id) {
  return bump("paths", ARCHETYPE_IDS, id);
}

export function recordCodexCard(id) {
  return bump("cards", CARD_IDS, id);
}

/* A daily rule the player was actually handed.

   Recorded at the fresh start of an attempt and NOT again on resume. Every
   daily attempt passes through the fresh-start branch exactly once (a resume
   is by definition downstream of one), so fresh-start-only is both complete
   and one-count-per-day. Crediting the resume too would inflate a single
   day's rule to two or three the moment a player left and came back, which
   is the one thing the daily's whole "one attempt a day" framing makes
   embarrassing to get wrong. */
export function recordCodexTwist(id) {
  return bump("twists", TWIST_IDS, id);
}

/* Reset All Progress clears this too, or the Codex would keep reporting a
   history the rest of the app had just told the player it deleted. */
export function clearCodex() {
  try { localStorage.removeItem(CODEX_KEY); } catch {}
}
