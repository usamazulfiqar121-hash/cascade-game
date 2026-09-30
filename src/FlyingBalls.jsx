/* ═══════════ FLYING BALLS ═══════════
   The visible journey of a pour. A pour used to be a teleport: the ball
   vanished from the source tube and reappeared in the target the same
   frame. Now each moved ball flies — up and over in an arc to a point
   just above the target's rim, then drops in under gravity — and the real
   ball in the target (Tube.jsx) stays hidden until its flight touches
   down, then appears with a squash.

   Purely visual. Game state still updates instantly on tap, so this never
   slows play down or blocks the next move; it only draws the in-between.

   Positions are ball CENTERS in viewport pixels; each flying element is
   positioned at (0,0) and moved with transform only (compositor-friendly,
   no layout per frame). */

import { useLayoutEffect, useRef } from "react";
import { tubeDims, ballWidth, ballBackground, BallFace, BALL_STYLE_BASE } from "./Tube";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* Gravity for the drop into the tube, in px/ms²: a 150px fall from rest
   takes 160ms. Every ball, every pour, falls under the same g. */
const G = (2 * 150) / (160 * 160);
/* Arc speed profile: accelerate for the first A of the arc (the ball
   starts from rest, hovering), then hold that speed — deliberately NOT an
   ease-in-out. Easing to a stop at the rim made a multi-ball pour pile up
   there: each ball paused at the same point while the next caught up,
   and two balls merged into one blob above the tube. Carrying speed
   through the rim and into the drop keeps them strung out. */
const A = 0.35;
const arcU = (t) => (t < A ? (t * t) / (A * (2 - A)) : (2 * t - A) / (2 - A));
const ARC_END_SPEED = 2 / (2 - A); // du/dt at t = 1

/* Solve for the uniform time-scale that makes a flight exactly `extra` ms
   longer than it would otherwise take.

   The obvious implementation — hand the extra time to the drop — is wrong,
   and wrong in a way that only shows up on screen. The drop's duration is
   derived from the speed the ball leaves the arc at, so lengthening it
   without re-deriving that speed overshoots the slot badly; and because
   buildKeyframes pins the final frame to the slot regardless, a bad drop
   doesn't error, it renders as the ball visibly decelerating in mid-air
   right before it reaches the tube. Scaling the arc and the drop together
   and re-deriving the drop keeps the path geometrically identical and
   changes only the clock, which is what slow motion is. The function is
   monotonic in k, so bisection converges on the exact figure in a few
   steps. */
function scaleForExtra(extra, arcMs0, v00, d) {
  const totalFor = (k) => {
    const v = v00 / k;
    return arcMs0 * k + Math.max(1, Math.round((-v + Math.sqrt(v * v + 2 * G * d)) / G));
  };
  if (extra <= 0) return 1;
  const base = totalFor(1);
  let lo = 1;
  let hi = 8;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (totalFor(mid) < base + extra) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/* Plan one ball's flight: start (x0,y0) → a hop up, over, and straight
   down to the hover point above the target (x1, rimY) → a gravity drop to
   its slot (x1, y1). The arc is a cubic bezier whose first control point
   is directly above the start and second directly above the target, so
   the ball leaves straight up and arrives travelling straight down — no
   sideways kink where the arc hands over to the fall. The fall then
   starts at the exact speed the arc ended with (v0), so the whole path is
   one continuous motion.

   `slowBy` stretches the whole flight by that many ms (see scaleForExtra);
   it's how the round-winning ball is given time to be watched. Default 0
   reproduces the previous timing exactly, k stays 1 and the maths below
   collapses to the original expression.

   Exported so App schedules the landing, the impact sound and the
   particle burst from the same numbers the animation uses. */
export function planFlight(x0, y0, x1, rimY, y1, slowBy = 0) {
  const arcH = clamp(Math.abs(x1 - x0) * 0.22, 16, 46);
  const topY = Math.min(y0, rimY) - arcH;
  /* rough path length: up + across + down */
  const len = (y0 - topY) + Math.abs(x1 - x0) + (rimY - topY);
  const arcMs0 = Math.round(clamp(140 + len * 0.24, 190, 330));
  /* vertical speed at the end of the arc: dB/du at u=1 is 3·(P3 − P2),
     which here is purely vertical (P2 sits right above P3) */
  const v00 = (3 * (rimY - topY) * ARC_END_SPEED) / arcMs0;
  const d = Math.max(0, y1 - rimY);
  const k = scaleForExtra(slowBy, arcMs0, v00, d);
  const arcMs = Math.round(arcMs0 * k);
  const v0 = v00 / k;
  const dropMs = Math.max(1, Math.round((-v0 + Math.sqrt(v0 * v0 + 2 * G * d)) / G));
  return { arcMs, dropMs, topY, v0 };
}

function buildKeyframes(f, w, h) {
  const { x0, y0, x1, rimY, topY, v0, arcMs, dropMs } = f;
  const total = arcMs + dropMs;
  const frames = [];
  const at = (x, y, offset) =>
    frames.push({ transform: `translate(${(x - w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px)`, offset });
  /* cubic bezier: P0 = start, P1 = above start, P2 = above target, P3 = rim */
  const bez = (p0, p1, p2, p3, u) => {
    const m = 1 - u;
    return m * m * m * p0 + 3 * m * m * u * p1 + 3 * m * u * u * p2 + u * u * u * p3;
  };
  const ARC_STEPS = 18;
  for (let i = 0; i <= ARC_STEPS; i++) {
    const u = arcU(i / ARC_STEPS);
    at(bez(x0, x0, x1, x1, u), bez(y0, topY, topY, rimY, u), ((i / ARC_STEPS) * arcMs) / total);
  }
  /* y = rim + v0·τ + ½·g·τ² */
  const DROP_STEPS = 8;
  for (let i = 1; i <= DROP_STEPS; i++) {
    const tau = (i / DROP_STEPS) * dropMs;
    /* last frame pinned to the slot exactly (dropMs is rounded to whole ms) */
    const y = i === DROP_STEPS ? f.y1 : rimY + v0 * tau + 0.5 * G * tau * tau;
    at(x1, y, (arcMs + tau) / total);
  }
  return frames;
}

function FlyingBall({ f, onDone }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") {
      onDone(f.id);
      return undefined;
    }
    const d = tubeDims(f.scale);
    /* timeScale < 1 under Reduce Motion: the exact same path and keyframes,
       played faster. Keyframe offsets are fractions of the total, so
       scaling only the duration keeps the arc and the gravity drop
       continuous -- nothing jumps. */
    const anim = el.animate(buildKeyframes(f, ballWidth(f.scale), d.ballH), {
      duration: (f.arcMs + f.dropMs) * (f.timeScale || 1),
      delay: f.delay,
      fill: "both",
      easing: "linear",
    });
    /* Anchor the animation to the tap itself (f.t0, a performance.now()
       stamp), not to whenever this effect happens to run a frame later.
       document.timeline shares performance.now()'s time origin, and the
       real ball's reveal in Tube.jsx is computed from the same t0 — so the
       flight touching down and the real ball appearing use one clock. */
    try {
      if (document.timeline && typeof f.t0 === "number") anim.startTime = f.t0;
    } catch {
      /* older engines without a settable startTime just start "now" —
         at most a frame of drift, still correct */
    }
    anim.onfinish = () => onDone(f.id);
    return () => anim.cancel();
    /* Runs once per flight: a flight's numbers never change after it's
       created, and onDone is a stable callback from App. */
  }, []);

  const d = tubeDims(f.scale);
  return (
    <div
      ref={ref}
      style={{
        ...BALL_STYLE_BASE,
        position: "absolute",
        left: 0,
        top: 0,
        width: ballWidth(f.scale),
        height: d.ballH,
        borderRadius: d.ballRadius,
        background: ballBackground(f.colorIdx),
        willChange: "transform",
      }}
    >
      <BallFace colorIdx={f.colorIdx} d={d} colorBlind={f.colorBlind} />
    </div>
  );
}

export default function FlyingBalls({ flights, onDone }) {
  if (!flights.length) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 45 }}>
      {flights.map((f) => (
        <FlyingBall key={f.id} f={f} onDone={onDone} />
      ))}
    </div>
  );
}
