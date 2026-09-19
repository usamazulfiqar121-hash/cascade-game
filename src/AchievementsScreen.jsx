/* ═══════════ ACHIEVEMENTS SCREEN ═══════════
   Grid overlay with progress bar. */

import { T, ACHIEVEMENTS } from "./constants";
import { S } from "./theme";

export default function AchievementsScreen({ achievements, onClose }) {
  return (
    <div style={S.ovTop} onClick={onClose}>
      <div style={{ ...S.ovCard, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...S.ovTitle, fontSize: 22 }}>🏆 Achievements</div>
        <div style={{ ...S.ovSub, marginBottom: 16 }}>
          {achievements.length} of {ACHIEVEMENTS.length} unlocked
        </div>

        <div style={{ height: 6, background: T.line, borderRadius: 999, overflow: "hidden", marginBottom: 20 }}>
          <div style={{
            height: "100%",
            width: `${(achievements.length / ACHIEVEMENTS.length) * 100}%`,
            background: T.gold,
            borderRadius: 999,
            transition: "width 400ms ease",
          }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "50vh", overflowY: "auto" }}>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = achievements.includes(a.id);
            return (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: unlocked ? `${T.gold}11` : `${T.bg}80`,
                border: `1px solid ${unlocked ? T.gold + "55" : T.edge}`,
                borderRadius: 14, padding: "12px 14px",
                opacity: unlocked ? 1 : 0.55,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: unlocked ? `${T.gold}22` : "transparent",
                  border: `1.5px solid ${unlocked ? T.gold + "55" : T.line}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                  filter: unlocked ? "none" : "grayscale(1)",
                }}>{unlocked ? a.icon : "🔒"}</div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontWeight: 900, fontSize: 14, color: unlocked ? T.ink : T.muted }}>{a.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginTop: 2 }}>{a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button style={{ ...S.primary, marginTop: 20 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
