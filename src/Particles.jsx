/* ═══════════ PARTICLES OVERLAY ═══════════
   Visual effect layer — pour bursts. */

export default function Particles({ bursts }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }}>
      {bursts.map((b) => (
        <div key={b.id} style={{ position: "absolute", left: b.x, top: b.y }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2 + b.seed;
            return (
              <div key={i} className="cascade-particle" style={{
                position: "absolute",
                width: 8, height: 8, borderRadius: "50%",
                background: b.color,
                boxShadow: `0 0 8px ${b.color}`,
                "--tx": `${Math.cos(angle) * 40}px`,
                "--ty": `${Math.sin(angle) * 40}px`,
              }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}
