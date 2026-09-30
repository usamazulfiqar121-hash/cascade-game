/* ═══════════ STREAK BADGE ═══════════
   Custom shape pill. Rounded-square, animated on value change.
   Complete state = green ✓, pending = gold 🔥.

   "Animated on value change" described the intent, not the code — there
   was no animation here at all, so the streak number (or the fire→check
   swap once today's daily is done) just silently replaced itself. Watches
   its own props and plays a brief spring pop whenever either one changes. */

import { useEffect, useRef, useState } from "react";
import { D } from "../constants";
import { FireIcon, CheckIcon } from "../icons";

export default function StreakBadge({ streak = 0, complete = false, size = "md" }) {
  const [pop, setPop] = useState(false);
  const prev = useRef({ streak, complete });

  useEffect(() => {
    if (prev.current.streak === streak && prev.current.complete === complete) return;
    prev.current = { streak, complete };
    setPop(true);
    const t = setTimeout(() => setPop(false), 360);
    return () => clearTimeout(t);
  }, [streak, complete]);

  const sizes = {
    sm: { padding: "3px 8px", gap: 4, font: 11, icon: 12 },
    md: { padding: "4px 10px", gap: 5, font: 12, icon: 14 },
    lg: { padding: "6px 12px", gap: 6, font: 14, icon: 16 },
  };
  const s = sizes[size] || sizes.md;

  const accent = complete ? D.go : D.gold;
  const soft = complete ? `color-mix(in srgb, ${D.go} 16.1%, transparent)` : `color-mix(in srgb, ${D.gold} 16.1%, transparent)`;
  const border = complete ? `color-mix(in srgb, ${D.go} 34.9%, transparent)` : `color-mix(in srgb, ${D.gold} 34.9%, transparent)`;

  return (
    /* role="img" is load-bearing, not decoration: aria-label on a plain div
       with no role is ignored by most screen readers, and this badge is a
       composite (icon + number) that should be announced as ONE labelled
       thing rather than a bare "12" followed by an unnameable graphic. */
    <div
      className={pop ? "value-pop" : undefined}
      role="img"
      aria-label={`${streak}-day streak${complete ? ", today's puzzle complete" : ""}`}
      style={{
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
      {/* The icons carry no information the label above doesn't already say,
          so they're hidden from the tree. FireIcon/CheckIcon don't forward
          props, hence the wrapper. */}
      <span aria-hidden="true" style={{ display: "flex" }}>
        {complete ? (
          <CheckIcon size={s.icon} color={D.go} />
        ) : (
          <FireIcon size={s.icon} color={D.gold} />
        )}
      </span>
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
