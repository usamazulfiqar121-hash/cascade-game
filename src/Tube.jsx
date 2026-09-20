/* ═══════════ TUBE COMPONENT v2 ═══════════
   Premium glass tube. Theme-aware via CSS vars.
   Refined selection/hint/solved states. */

import { COLORS, MAX_HEIGHT } from "./constants";

export default function Tube({ balls, selected, onClick, disabled, hintFrom, hintTo, solved }) {
  /* State priority: selected > solved > hintFrom > hintTo > idle */
  const state = selected
    ? "selected"
    : solved
    ? "solved"
    : hintFrom
    ? "hintFrom"
    : hintTo
    ? "hintTo"
    : "idle";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="tube-btn"
      data-state={state}
      aria-label={`Tube${selected ? ", selected" : ""}${solved ? ", solved" : ""}`}
      style={{
        ...S.tube,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {/* Inner glass highlight */}
      <span style={S.glass} aria-hidden="true" />

      {/* Balls stack (bottom → top) */}
      {balls.map((colorIdx, i) => (
        <div
          key={i}
          style={{
            ...S.ball,
            background: `linear-gradient(180deg, ${COLORS[colorIdx]} 0%, ${shade(COLORS[colorIdx], -0.15)} 100%)`,
          }}
        >
          <span style={S.ballHighlight} />
        </div>
      ))}
    </button>
  );
}

/* Shade a hex color by amount (-1 to 1) */
function shade(hex, amount) {
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  let r = (num >> 16) + Math.round(255 * amount);
  let g = ((num >> 8) & 0xff) + Math.round(255 * amount);
  let b = (num & 0xff) + Math.round(255 * amount);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

/* ═══════════ STYLES ═══════════ */

const S = {
  tube: {
    position: "relative",
    width: 62,
    height: MAX_HEIGHT * 48 + 22,
    background: "var(--tube-bg)",
    border: "2px solid var(--tube-edge)",
    borderRadius: 32,
    padding: "10px 6px 6px",
    display: "flex",
    flexDirection: "column-reverse",
    justifyContent: "flex-start",
    alignItems: "center",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
    transition: `transform 200ms cubic-bezier(.2,1.1,.3,1),
                 border-color 200ms ease,
                 box-shadow 200ms ease,
                 background 200ms ease`,
    overflow: "hidden",
  },
  glass: {
    position: "absolute",
    top: 2,
    left: 4,
    right: 4,
    height: "40%",
    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)",
    borderRadius: "28px 28px 0 0",
    pointerEvents: "none",
  },
  ball: {
    position: "relative",
    width: "88%",
    height: 38,
    borderRadius: 19,
    marginTop: 3,
    boxShadow: `
      inset 0 -4px 8px rgba(0, 0, 0, 0.25),
      inset 0 2px 4px rgba(255, 255, 255, 0.15),
      0 2px 4px rgba(0, 0, 0, 0.15)
    `,
    flexShrink: 0,
  },
  ballHighlight: {
    position: "absolute",
    top: 4,
    left: "20%",
    right: "20%",
    height: 6,
    borderRadius: 999,
    background: "rgba(255, 255, 255, 0.35)",
    filter: "blur(1px)",
    pointerEvents: "none",
  },
};
