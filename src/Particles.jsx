/* ═══════════ PARTICLES OVERLAY ═══════════
   Visual effect layer — pour bursts.

   Every particle used to travel exactly 40px at a perfectly even angle
   step — correct, but a burst where every piece moves the same distance
   in a perfectly regular spread reads as a computed pattern (a "flower")
   rather than something that scattered. Real bursts (confetti, sparks)
   vary in both distance and size per piece. jitter() is a small
   deterministic hash — not Math.random() — so a burst that happens to
   still be mounted across a re-render can't have its already-animating
   particles jump to new values mid-flight; the same (i, seed) pair
   always produces the same jitter. */

function jitter(a, b) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x); // deterministic pseudo-random in [0, 1)
}

export default function Particles({ bursts }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }}>
      {bursts.map((b) => {
        const count = b.count || 6;
        const seed = b.seed || 0;
        return (
          <div key={b.id} style={{ position: "absolute", left: b.x, top: b.y }}>
            {Array.from({ length: count }).map((_, i) => {
              /* Base evenly-spaced angle, nudged by up to ±12° so the
                 spread doesn't look mechanically uniform. */
              const baseAngle = (i / count) * Math.PI * 2 + seed;
              const angle = baseAngle + (jitter(i, seed) - 0.5) * 0.42;
              const dist = 30 + jitter(i + 0.5, seed) * 22; // 30–52px, was a flat 40px
              const size = 6 + jitter(i + 1.5, seed) * 4; // 6–10px, was a flat 8px
              return (
                <div key={i} className="cascade-particle" style={{
                  position: "absolute",
                  width: size, height: size, borderRadius: "50%",
                  background: b.color,
                  boxShadow: `0 0 8px ${b.color}`,
                  "--tx": `${Math.cos(angle) * dist}px`,
                  "--ty": `${Math.sin(angle) * dist}px`,
                }} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
