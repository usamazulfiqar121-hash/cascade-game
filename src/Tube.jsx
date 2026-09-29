/* ═══════════ TUBE COMPONENT v4 ═══════════
   Premium glass tube. Theme-aware via CSS vars.
   Responsive scale prop — shrinks as board grows.

   v4: the ball you pick up now rises OUT of the tube (the whole run of
   same-colored balls that a pour would move, as one column), instead of
   the tube itself nudging up 10px while the balls sat still. And a ball
   that arrives by pour stays invisible until its flight (FlyingBalls.jsx)
   actually lands, then appears with a squash — rather than fading in at
   the bottom as a semi-transparent ghost the moment you tapped. */

import { useState } from "react";
import { COLORS, MAX_HEIGHT } from "./constants";

/* Every size is derived from one place, shared with FlyingBalls so a
   flying ball is pixel-identical to a real one and lands exactly where
   the real one will sit. */
export function tubeDims(scale = 1) {
  return {
    width: 62 * scale,
    height: MAX_HEIGHT * 48 * scale + 22,
    padTop: 10 * scale,
    padSide: 6 * scale,
    padBottom: 6 * scale,
    border: 2,
    borderRadius: 32 * scale,
    glassRadius: 28 * scale,
    ballH: 38 * scale,
    ballMT: 3 * scale,
    ballRadius: 19 * scale,
    highlightTop: 4 * scale,
    highlightH: 6 * scale,
    labelSize: 13 * scale,
  };
}

/* How far a lifted ball rises: enough that the TOP ball of the run clears
   the tube's rim by a small gap. Same for every ball in the run, so the
   run rises as one rigid column. Tube is flex column-reverse, so ball i's
   bottom edge sits (i * slot) above the content box's bottom edge. */
export const LIFT_GAP = 6;
export function liftFor(ballCount, scale = 1) {
  const d = tubeDims(scale);
  const slot = d.ballH + d.ballMT;
  const topBallBottomFromTubeTop = d.height - d.border - d.padBottom - (ballCount - 1) * slot;
  return topBallBottomFromTubeTop + LIFT_GAP;
}

/* Center of ball slot i (0 = bottom) in viewport coordinates, from the
   tube's getBoundingClientRect(). Used as a pour's landing target. */
export function slotCenter(rect, i, scale = 1) {
  const d = tubeDims(scale);
  const slotBottom = rect.bottom - d.border - d.padBottom - i * (d.ballH + d.ballMT);
  return { x: rect.left + rect.width / 2, y: slotBottom - d.ballH / 2 };
}

/* Ball width: 88% of the tube's content box, same as the flex child. */
export function ballWidth(scale = 1) {
  const d = tubeDims(scale);
  return 0.88 * (d.width - 2 * d.border - 2 * d.padSide);
}

/* Length of the run of same-colored balls on top — what a pour moves. */
export function topRunLength(balls) {
  if (!balls.length) return 0;
  const c = balls[balls.length - 1];
  let n = 0;
  for (let i = balls.length - 1; i >= 0 && balls[i] === c; i--) n++;
  return n;
}

export function ballBackground(colorIdx) {
  return `linear-gradient(180deg, ${COLORS[colorIdx]} 0%, ${shade(COLORS[colorIdx], -0.15)} 100%)`;
}

/* The ball's face (gloss + optional color-blind number) — shared with the
   flying copy so the two can't drift apart visually. */
export function BallFace({ colorIdx, d, colorBlind }) {
  return (
    <>
      <span style={{ ...S.ballHighlight, top: d.highlightTop, height: d.highlightH }} />
      {colorBlind && (
        <span aria-hidden="true" style={{ ...S.ballLabel, fontSize: d.labelSize, lineHeight: `${d.ballH}px` }}>
          {colorIdx + 1}
        </span>
      )}
    </>
  );
}

export const BALL_STYLE_BASE = {
  position: "relative",
  boxShadow: `
      inset 0 -4px 8px rgba(0, 0, 0, 0.25),
      inset 0 2px 4px rgba(255, 255, 255, 0.15),
      0 2px 4px rgba(0, 0, 0, 0.15)
    `,
  flexShrink: 0,
};

/* One ball. `landAt` (a performance.now() timestamp) is read ONCE, at
   mount, via useState's initializer: balls are keyed by index, so a ball
   "mounts" exactly when a pour adds it, and must keep the delay it was
   born with. If it instead re-read landAt on every render, a second quick
   pour into the same tube would change the first ball's delay mid-flight
   and it could pop into view before its own flight had landed. */
function Ball({ colorIdx, d, colorBlind, lift, liftDelay, landAt }) {
  const [landDelay] = useState(() =>
    landAt == null ? null : Math.max(0, Math.round(landAt - performance.now())),
  );
  /* Same entrance in both motion settings: Reduce Motion makes the pour's
     flight faster (App.jsx), it doesn't swap the ball onto a different
     rendering path. */
  const landing = landDelay !== null;
  return (
    <div
      className={landing ? "cascade-ball landing" : "cascade-ball"}
      style={{
        ...BALL_STYLE_BASE,
        width: "88%",
        height: d.ballH,
        marginTop: d.ballMT,
        borderRadius: d.ballRadius,
        background: ballBackground(colorIdx),
        transform: lift ? `translateY(${-lift}px)` : undefined,
        /* Rising: a gentle spring overshoot, scaled with distance so a ball
           lifted from the bottom of an empty-ish tube doesn't whip up at
           the same speed as one that barely moves. Settling back: a plain
           ease, no bounce. */
        transition: lift
          ? `transform ${Math.round(200 + lift * 0.6)}ms cubic-bezier(.34,1.3,.64,1) ${liftDelay}ms`
          : `transform 200ms cubic-bezier(.4,0,.2,1)`,
        ...(landing ? { animationDelay: `${landDelay}ms` } : null),
      }}
    >
      <BallFace colorIdx={colorIdx} d={d} colorBlind={colorBlind} />
    </div>
  );
}

export default function Tube({
  idx, balls, selected, onClick, disabled,
  hintFrom, hintTo, solved, scale = 1,
  colorBlind = false,
  landing = null, // { from, lands: [performance.now() timestamps] } for this tube's latest incoming pour
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
}) {
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

  const d = tubeDims(scale);
  const runLen = selected ? topRunLength(balls) : 0;
  const lift = runLen ? liftFor(balls.length, scale) : 0;

  return (
    <button
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      disabled={disabled}
      className="tube-btn"
      data-state={state}
      data-tube-idx={idx}
      aria-label={`Tube${selected ? ", selected" : ""}${solved ? ", solved" : ""}`}
      style={{
        ...S.tube,
        width: d.width,
        height: d.height,
        padding: `${d.padTop}px ${d.padSide}px ${d.padBottom}px`,
        borderRadius: d.borderRadius,
        opacity: disabled ? 0.45 : 1,
        touchAction: "none",
      }}
    >
      {/* Inner glass highlight */}
      <span
        style={{ ...S.glass, borderRadius: `${d.glassRadius}px ${d.glassRadius}px 0 0` }}
        aria-hidden="true"
      />

      {/* Balls stack (bottom → top) */}
      {balls.map((colorIdx, i) => {
        const inRun = i >= balls.length - runLen;
        const k = landing ? i - landing.from : -1;
        return (
          <Ball
            key={i}
            colorIdx={colorIdx}
            d={d}
            colorBlind={colorBlind}
            lift={inRun ? lift : 0}
            /* top ball first, the rest following 28ms apart */
            liftDelay={inRun ? (balls.length - 1 - i) * 28 : 0}
            landAt={landing && k >= 0 && k < landing.lands.length ? landing.lands[k] : null}
          />
        );
      })}
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
    background: "var(--tube-bg)",
    border: "2px solid var(--tube-edge)",
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
    /* visible, not hidden: a lifted ball has to be able to rise past the
       rim. Nothing else here relied on clipping — the glass highlight is
       inset inside the border and the balls never exceed the content box
       at rest. */
    overflow: "visible",
  },
  glass: {
    position: "absolute",
    top: 2,
    left: 4,
    right: 4,
    height: "40%",
    background: "linear-gradient(180deg, var(--tube-highlight) 0%, transparent 100%)",
    pointerEvents: "none",
  },
  ballHighlight: {
    position: "absolute",
    left: "20%",
    right: "20%",
    borderRadius: 999,
    background: "rgba(255, 255, 255, 0.35)",
    filter: "blur(1px)",
    pointerEvents: "none",
  },
  ballLabel: {
    position: "absolute",
    inset: 0,
    textAlign: "center",
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 900,
    color: "#fff",
    WebkitTextStroke: "2px rgba(0, 0, 0, 0.55)",
    paintOrder: "stroke fill",
    pointerEvents: "none",
    userSelect: "none",
  },
};
