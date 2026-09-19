/* ═══════════ TUBE COMPONENT ═══════════
   Single tube with stacked balls + selection/hint/solved states. */

import { T, COLORS, MAX_HEIGHT } from "./constants";

export default function Tube({ balls, selected, onClick, disabled, hintFrom, hintTo, solved }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 62, height: MAX_HEIGHT * 48 + 20,
      background: T.tubeBg,
      border: `2px solid ${selected ? T.accent : solved ? T.go + "88" : hintFrom ? T.go : hintTo ? T.go + "aa" : T.tubeEdge}`,
      borderRadius: 32, padding: "8px 6px 6px",
      display: "flex", flexDirection: "column-reverse", justifyContent: "flex-start",
      alignItems: "center", cursor: disabled ? "default" : "pointer",
      transition: "all 200ms cubic-bezier(.2,1.1,.3,1)",
      transform: selected ? "translateY(-8px)" : "translateY(0)",
      boxShadow: selected
        ? `0 12px 30px ${T.accent}44`
        : solved
        ? `0 0 0 2px ${T.go}44, 0 4px 16px ${T.go}33`
        : (hintFrom || hintTo)
        ? `0 0 0 3px ${T.go}33`
        : "none",
      opacity: disabled ? 0.4 : 1,
    }}>
      {balls.map((colorIdx, i) => (
        <div key={i} style={{
          width: "88%", height: 38, borderRadius: 19,
          background: COLORS[colorIdx],
          boxShadow: "inset 0 -5px 10px rgba(0,0,0,0.25), inset 0 3px 6px rgba(255,255,255,0.2)",
          marginTop: i > 0 ? 3 : 0,
        }} />
      ))}
    </button>
  );
}
