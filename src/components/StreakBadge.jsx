/* ═══════════ STREAK BADGE ═══════════
   Custom shape pill. Rounded-square, animated on value change.
   Complete state = green ✓, pending = gold 🔥. */

import { D } from "../constants";
import { FireIcon, CheckIcon } from "../icons";

export default function StreakBadge({ streak = 0, complete = false, size = "md" }) {
  const sizes = {
    sm: { padding: "3px 8px", gap: 4, font: 11, icon: 12 },
    md: { padding: "4px 10px", gap: 5, font: 12, icon: 14 },
    lg: { padding: "6px 12px", gap: 6, font: 14, icon: 16 },
  };
  const s = sizes[size] || sizes.md;

  const accent = complete ? D.go : D.gold;
  const soft = complete ? "rgba(34, 197, 138, 0.16)" : "rgba(255, 194, 75, 0.16)";
  const border = complete ? "rgba(34, 197, 138, 0.35)" : "rgba(255, 194, 75, 0.35)";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: s.gap,
      padding: s.padding,
      background: soft,
      border: `1px solid ${border}`,
      /* Custom shape: rounded square with asymmetric corners */
      borderRadius: 10,
      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 2px 8px rgba(0, 0, 0, 0.2)",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {complete ? (
        <CheckIcon size={s.icon} color={D.go} />
      ) : (
        <FireIcon size={s.icon} color={D.gold} />
      )}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: s.font,
        fontWeight: 800,
        color: accent,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}>{streak}</span>
    </div>
  );
}
