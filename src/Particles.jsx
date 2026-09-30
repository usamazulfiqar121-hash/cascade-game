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
        /* How far a piece travels, in the same sense as the 30px a pour
           burst uses: the NEAR end of the spread, with the random range
           above it proportional so a bigger burst spreads wider without
           changing its shape. 30 * (22/30) reproduces the old 30-52px
           exactly, so every existing burst is untouched. Streak ceremonies
           pass a larger base (see STREAK_CEREMONY) to throw confetti
           further than a ball landing should. */
        const base = b.dist || 30;
        /* Multi-colour bursts. A single `b.color` is what every pour burst
           uses and stays the default; when a ceremony supplies a palette
           (see STREAK_CEREMONY in constants.js) pieces cycle through it.

           Cycling by `i % length` rather than picking at random is
           deliberate on both counts. It guarantees a visible alternation in
           the first few pieces, so a ceremony can't come out looking
           monochrome by chance — which a random draw genuinely can at 8
           particles and a 2-colour palette. And it keeps the assignment
           deterministic alongside the existing jitter(), which is the whole
           reason this file avoids Math.random (see the header): a burst
           still mounted across a re-render must not recolour its pieces
           mid-flight. */
        const palette = b.colors || null;
        return (
          <div key={b.id} style={{ position: "absolute", left: b.x, top: b.y }}>
            {Array.from({ length: count }).map((_, i) => {
              const color = palette ? palette[i % palette.length] : b.color;
              /* Base evenly-spaced angle, nudged by up to ±12° so the
                 spread doesn't look mechanically uniform. */
              const baseAngle = (i / count) * Math.PI * 2 + seed;
              const angle = baseAngle + (jitter(i, seed) - 0.5) * 0.42;
              const dist = base * (1 + jitter(i + 0.5, seed) * (22 / 30)); // 30–52px at base 30
              const size = 6 + jitter(i + 1.5, seed) * 4; // 6–10px, was a flat 8px
              return (
                <div key={i} className="cascade-particle" style={{
                  position: "absolute",
                  width: size, height: size, borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                  "--tx": `${Math.cos(angle) * dist}px`,
                  "--ty": `${Math.sin(angle) * dist}px`,
                  /* Per-burst lifetime, inline so it stays tied to the
                     `life` App.jsx uses to unmount the burst (see the note
                     in spawnParticles about the two not drifting apart).
                     Left undefined when unset, so the .cascade-particle
                     rule's own 600ms stands and every pour burst is
                     unchanged. */
                  animationDuration: b.life ? `${b.life}ms` : undefined,
                }} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
