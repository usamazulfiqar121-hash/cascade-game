/* ═══════════ SHARE CARD ═══════════
   Pure functions — no React. buildShareCard() touches DOM via
   canvas, but only receives plain args.
   Extracted from App.jsx during cleanup pass. */

import { UPGRADES, RARITY } from "./constants";

export function estimateRank(moves, rounds) {
  if (rounds < 1 || moves < 1) return { label: "Complete" };
  const avg = moves / rounds;
  if (avg <= 4) return { label: "Top 5%" };
  if (avg <= 5) return { label: "Top 12%" };
  if (avg <= 6) return { label: "Top 25%" };
  if (avg <= 7.5) return { label: "Top 40%" };
  if (avg <= 9) return { label: "Top 60%" };
  return { label: "Top 80%" };
}

export function buildEmojiGrid(rounds, totalMoves, streak) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = ["CASCADE Daily " + today, ""];
  (rounds || []).forEach((r) => {
    const eff = r.moveLimit > 0 ? r.moves / r.moveLimit : 0.7;
    let sq = "\uD83D\uDFE9";
    if (eff > 0.75) sq = "\uD83D\uDFE5";
    else if (eff > 0.55) sq = "\uD83D\uDFE8";
    lines.push(sq + "  R" + r.round + " - " + r.moves + " moves");
  });
  lines.push("");
  lines.push("Total: " + totalMoves + " moves");
  if (streak > 0) lines.push("Streak: " + streak);
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
      ctx.fillText(upgrades.length + " UPGRADES COLLECTED", 540, cursorY);
      sp("0px");

      const items = upgrades.slice(-8);
      const PER_ROW = 4;
      const CHIP = 130;
      const GAP = 20;
      const chipsY = cursorY + 40;

      items.forEach((id, i) => {
        const u = UPGRADES.find((x) => x.id === id);
        if (!u) return;
        const rColor = (RARITY && RARITY[u.rarity]) ? RARITY[u.rarity].color : "#8592BC";
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
        ctx.strokeStyle = rColor + "80";
        ctx.lineWidth = 2.5;
        rr(x, y, CHIP, CHIP, 32);
        ctx.stroke();

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

