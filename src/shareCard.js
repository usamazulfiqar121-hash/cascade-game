/* ═══════════ SHARE CARD ═══════════
   Pure functions — no React. buildShareCard() touches DOM via
   canvas, but only receives plain args.
   Extracted from App.jsx during cleanup pass. */

import { UPGRADES } from "./constants";

/* RARITY's colours are theme tokens ("var(--rarity-N)"), and canvas can't
   resolve var() — assigning one silently leaves the previous fill/stroke in
   place. So the rarity borders below can't come from RARITY. These mirror
   the DARK block of --rarity-N in globalStyles.js, which is the palette this
   whole card is already drawn in (see the literal #EAF0FF / #7A85A8 /
   rgba(255,194,75,…) literals throughout). Kept next to its one use instead
   of in constants.js because nothing outside this file needs a hex.
   If a tier's colour ever changes, this and --rarity-N change together. */
const RARITY_HEX = {
  1: "#8592BC",  // Common      — --rarity-1
  2: "#22C58A",  // Uncommon    — --rarity-2
  3: "#4C8DFF",  // Rare        — --rarity-3
  4: "#FFC24B",  // Legendary   — --rarity-4
  5: "#FF3DAF",  // Jackpot     — --rarity-5
};

/* `extra` is optional: { twist, score } of the run being shared.
   `dateKey` is the day of the puzzle that was played. It defaults to today,
   but the caller passes the run's own day: a card left open across UTC
   midnight would otherwise stamp the NEXT day's date on yesterday's run. */
/* "1 move" vs "2 moves". A round CAN be cleared in a single pour
   (App.jsx builds each entry with moves: newMovesUsed, which is moves + 1),
   so "1 moves" is reachable in a real share, and this text is what other
   people read — it reads as a bug in the result being shared. Same `=== 1`
   conditional the moves counter uses in App.jsx ("1 move left"). */
const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");

export function buildEmojiGrid(rounds, totalMoves, streak, bestStreak, dateKey, extra = {}) {
  const today = dateKey || new Date().toISOString().slice(0, 10);
  const lines = ["CASCADE Daily " + today];
  /* Same day, same twist for everyone, so it belongs in what is sent. */
  if (extra.twist) lines.push(extra.twist.icon + " " + extra.twist.name);
  lines.push("");
  (rounds || []).forEach((r) => {
    const eff = r.moveLimit > 0 ? r.moves / r.moveLimit : 0.7;
    let sq = "\uD83D\uDFE9";
    if (eff > 0.75) sq = "\uD83D\uDFE5";
    else if (eff > 0.55) sq = "\uD83D\uDFE8";
    lines.push(sq + "  R" + r.round + " - " + plural(r.moves, "move"));
  });
  lines.push("");
  lines.push("Total: " + plural(totalMoves, "move"));
  if (Number.isFinite(extra.score)) lines.push("Score: " + extra.score.toLocaleString("en-US"));

  /* No "Rank: Top X% today" line: it was a guess from average moves per
     round, not a ranking of anyone, and this text is sent to other
     people. The rounds and moves above are the real result. */

  if (streak > 0) {
    lines.push("Streak: " + streak);
    if (bestStreak > streak) {
      lines.push((bestStreak - streak) + " from your best of " + bestStreak);
    } else if (bestStreak > 0) {
      lines.push("\uD83D\uDD25 Best streak!");
    }
  }

  lines.push("");
  lines.push("cascade-main-rho.vercel.app");
  return lines.join("\n");
}

export function buildShareCard({ round, upgrades, best }) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const hasLS = "letterSpacing" in ctx;
    const sp = (v) => { if (hasLS) ctx.letterSpacing = v; };

    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const sans = (s, w) => (w || 900) + " " + s + "px 'Plus Jakarta Sans', system-ui, sans-serif";
    const body = (s, w) => (w || 700) + " " + s + "px 'Inter', system-ui, sans-serif";
    const mono = (s, w) => (w || 800) + " " + s + "px 'JetBrains Mono', ui-monospace, monospace";

    const bg = ctx.createLinearGradient(0, 0, 0, 1920);
    bg.addColorStop(0, "#05070F");
    bg.addColorStop(1, "#0A0F1F");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1920);

    const g1 = ctx.createRadialGradient(540, 200, 50, 540, 200, 900);
    g1.addColorStop(0, "rgba(76, 141, 255, 0.22)");
    g1.addColorStop(1, "rgba(76, 141, 255, 0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, 1080, 1100);

    const g2 = ctx.createRadialGradient(540, 1750, 50, 540, 1750, 800);
    g2.addColorStop(0, "rgba(255, 194, 75, 0.10)");
    g2.addColorStop(1, "rgba(255, 194, 75, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 950, 1080, 970);

    ctx.textAlign = "center";

    ctx.fillStyle = "#EAF0FF";
    ctx.font = sans(88);
    ctx.fillText("CASCADE", 540, 280);

    ctx.fillStyle = "#7A85A8";
    ctx.font = body(24, 800);
    sp("10px");
    ctx.fillText("ROGUELIKE SORT", 540, 338);
    sp("0px");

    const pillY = 480;
    const pillH = 420;

    ctx.save();
    ctx.shadowColor = "rgba(76, 141, 255, 0.15)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = "rgba(76, 141, 255, 0.06)";
    rr(140, pillY, 800, pillH, 48);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(76, 141, 255, 0.32)";
    ctx.lineWidth = 2.5;
    rr(140, pillY, 800, pillH, 48);
    ctx.stroke();

    ctx.fillStyle = "#7A85A8";
    ctx.font = body(22, 900);
    sp("8px");
    ctx.fillText("ROUNDS SURVIVED", 540, pillY + 88);
    sp("0px");

    ctx.save();
    ctx.shadowColor = "rgba(255, 255, 255, 0.15)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#EAF0FF";
    ctx.font = mono(240);
    ctx.fillText(String(round), 540, pillY + 350);
    ctx.restore();

    let cursorY = pillY + pillH + 40;

    if (best > 0) {
      const badgeW = 420;
      const badgeH = 88;
      const badgeX = (1080 - badgeW) / 2;

      ctx.fillStyle = "rgba(255, 194, 75, 0.10)";
      rr(badgeX, cursorY, badgeW, badgeH, 44);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 194, 75, 0.35)";
      ctx.lineWidth = 2;
      rr(badgeX, cursorY, badgeW, badgeH, 44);
      ctx.stroke();

      ctx.fillStyle = "#FFC24B";
      ctx.font = body(28, 900);
      sp("4px");
      ctx.fillText("BEST " + String(best), 540, cursorY + 57);
      sp("0px");

      cursorY = cursorY + badgeH + 60;
    } else {
      cursorY = pillY + pillH + 80;
    }

    if (upgrades.length > 0) {
      ctx.fillStyle = "#7A85A8";
      ctx.font = body(20, 900);
      sp("6px");
      ctx.fillText(plural(upgrades.length, "UPGRADE") + " COLLECTED", 540, cursorY);
      sp("0px");

      const items = upgrades.slice(-8);
      const PER_ROW = 4;
      const CHIP = 130;
      const GAP = 20;
      const chipsY = cursorY + 40;

      items.forEach((id, i) => {
        const u = UPGRADES.find((x) => x.id === id);
        if (!u) return;
        const rColor = RARITY_HEX[u.rarity] || RARITY_HEX[1];
        const row = Math.floor(i / PER_ROW);
        const col = i % PER_ROW;
        const itemsInRow = Math.min(PER_ROW, items.length - row * PER_ROW);
        const rowW = itemsInRow * CHIP + (itemsInRow - 1) * GAP;
        const rowStartX = (1080 - rowW) / 2;
        const x = rowStartX + col * (CHIP + GAP);
        const y = chipsY + row * (CHIP + GAP);

        ctx.fillStyle = "rgba(15, 21, 40, 0.75)";
        rr(x, y, CHIP, CHIP, 32);
        ctx.fill();
        /* 50% alpha via globalAlpha, not a "…80" suffix glued onto the hex.
           The old code did `rColor + "80"`, which worked back when RARITY
           held literal hexes; once the tiers became var() references that
           produced "var(--rarity-4)80" — not a colour — so canvas rejected
           the assignment and every chip kept whatever strokeStyle the
           previous one had set. All eight borders came out identical, and
           none of them the tier's actual colour. */
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = rColor;
        ctx.lineWidth = 2.5;
        rr(x, y, CHIP, CHIP, 32);
        ctx.stroke();
        ctx.restore();

        ctx.font = body(52);
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#EAF0FF";
        ctx.fillText(u.icon, x + CHIP / 2, y + CHIP / 2);
        ctx.textBaseline = "alphabetic";
      });
    }

    const footY = 1560;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(180, footY);
    ctx.lineTo(900, footY);
    ctx.stroke();

    ctx.fillStyle = "#4C8DFF";
    ctx.font = sans(38);
    ctx.fillText("Play Cascade", 540, footY + 70);

    ctx.fillStyle = "#7A85A8";
    ctx.font = body(20, 700);
    ctx.fillText("on Google Play", 540, footY + 118);

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("[CASCADE] Share card failed:", err);
    return null;
  }
}



/* ═══════════ NATIVE SHARE ═══════════
   Android WebView disables navigator.share, so on the APK it just did
   nothing. @capacitor/share bridges to the native Android share sheet,
   which is the only path that actually works there. The dynamic import
   caches the promise (same pattern as sound.js / notifications.js) so
   concurrent calls during first use all await the same in-flight load,
   and a transient load failure is retried on the next call instead of
   permanently disabling share for the session.

   Falls back to navigator.share (Chrome/web), then to clipboard copy
   (older desktop browsers). Returns a status string so the caller can
   decide whether to show the "Copied!" toast. */
let sharePlugin = null;
let sharePromise = null;

function getSharePlugin() {
  if (sharePlugin) return Promise.resolve(sharePlugin);
  if (!sharePromise) {
    sharePromise = import("@capacitor/share")
      .then((mod) => {
        sharePlugin = mod.Share || null;
        return sharePlugin;
      })
      .catch(() => {
        sharePromise = null;
        return null;
      });
  }
  return sharePromise;
}

/* Share plain text. Returns "shared" | "copied" | "cancelled" | "failed". */
export async function nativeShareText({ title, text, url }) {
  try {
    const plugin = await getSharePlugin();
    if (plugin && plugin.share) {
      try {
        await plugin.share({ title, text, url, dialogTitle: title });
        return "shared";
      } catch (err) {
        /* Capacitor Share throws on user cancel too — treat that as
           cancelled, not failed, so we don't show a scary error toast. */
        const msg = String(err && err.message || "");
        if (/cancel/i.test(msg)) return "cancelled";
        /* Fall through to web fallback below */
      }
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return "shared";
      } catch (err) {
        if (err && err.name === "AbortError") return "cancelled";
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url ? text + "\n" + url : text);
      return "copied";
    }
    return "failed";
  } catch {
    return "failed";
  }
}

/* Share a PNG data-URL. On the web we can hand a File to navigator.share;
   Capacitor Share takes a filesystem URL instead, which means writing the
   bytes out first — that's a bigger change than this pass covers, so for
   now this falls back to nativeShareText() with the accompanying message.
   Share cards still work perfectly on web/Chrome; the APK gets the text
   link, which is the same promise the button already makes. */
export async function nativeShareImage({ dataUrl, title, text }) {
  if (!dataUrl) return "failed";
  return nativeShareText({ title, text });
}
