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

/* Largest tube scale (at most `base`, the tube-count-based scale) at which
   the whole board stays on screen. The count-based scale alone ignores the
   screen: on a 360x640 phone the 5-7 tube rounds wrap to two full-size rows
   whose bottom row ends 36px below the screen (the lowest ball of each
   bottom-row tube half hidden), and on 320px-wide screens even 4 tubes wrap.
   Pure so it can be tested without a browser.
     boardTop: y of the board's top edge in the game root (HUD + strip above it)
     viewH/viewW: the game root's size
   Vertical budget depends on how many rows the board wraps to — see
   BOTTOM_RESERVE_1ROW / BOTTOM_RESERVE_WRAPPED below. */
/* How close to the bottom edge the board is allowed to get, in px, split by
   whether it wrapped. Undo and Hint are position:fixed at bottom 92 with a
   54px height (App.jsx), so their top edge sits 146px up — a two-row board
   that runs past that sits its bottom row on the buttons. A ONE-row board
   doesn't: it sits centred in its flex:1 box (S.board, theme.js), which ends
   where the footer begins, and its single row is nowhere near the bottom, so
   charging it the full 146px only shrank tubes that were never going to
   overlap anything (a 5-tube round dropped 0.96 -> 0.86 on a 360x640 for
   exactly that reason). The old flat 10px was the opposite error: it let a
   WRAPPED board overflow ~92px past its own box and onto the buttons, because
   it assumed the board could spill into the footer's empty 110px bottom
   padding — it can't, the board's box ends where the footer starts. */
const BOTTOM_RESERVE_1ROW = 10;
const BOTTOM_RESERVE_WRAPPED = 146;

export const MIN_FIT_SCALE = 0.5;
export function fitTubeScale(count, base, boardTop, viewH, viewW) {
  const rowW = Math.min(400, viewW - 40);
  /* Clamped entry point. Without this, a caller passing base < MIN_FIT_SCALE
     skipped the loop entirely and got MIN_FIT_SCALE back — a LARGER scale than
     it asked for, so the board grew and overflowed, which is the exact failure
     this function exists to prevent. Unreachable today (tubeScaleFor bottoms
     out at 0.56) and silent if it ever isn't: no caller error, just a quietly
     wrong board. */
  const start = Math.max(base, MIN_FIT_SCALE);
  for (let s = start; s >= MIN_FIT_SCALE - 1e-9; s = Math.round((s - 0.02) * 100) / 100) {
    const d = tubeDims(s);
    const perRow = Math.max(1, Math.floor((rowW + 12) / (d.width + 12)));
    const rows = Math.ceil(count / perRow);
    /* Re-derived every step, not hoisted: perRow moves as the tubes shrink
       (at 360px wide a 5-tube round flips 4-per-row -> 5-per-row between
       0.88 and 0.86), so the row count — and therefore the reservation —
       is a function of the scale being tried. */
    const bottomReserve = count <= perRow ? BOTTOM_RESERVE_1ROW : BOTTOM_RESERVE_WRAPPED;
    const avail = viewH - bottomReserve - boardTop;
    const need =
      Math.ceil(d.ballH + LIFT_GAP + 4) + rows * d.height + (rows - 1) * Math.ceil(d.ballH + LIFT_GAP + 10);
    if (need <= avail) return s;
  }
  return MIN_FIT_SCALE;
}

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
  /* Bounded, because this is the one colour lookup in the codebase with no
     fallback. In normal play colorIdx is always in range (colorCount is capped
     at 7, COLORS has 8), so this guard never fires — but `undefined` here goes
     straight into shade(), which calls .replace on it and throws, and there is
     no error boundary, so the React root goes blank. App.jsx's particle path
     already guards the identical lookup with `COLORS[colorIdx] || T.accent`;
     these two halves of the same lookup should not disagree about whether a
     miss is possible. A hex, not T.accent, because shade() needs to parse it. */
  const hex = COLORS[colorIdx] || "#888888";
  return `linear-gradient(180deg, ${hex} 0%, ${shade(hex, -0.15)} 100%)`;
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
  /* Explicit because the ball is a <span> (see Ball): as a flex item it would
     be blockified anyway, but stating it means the element is still correct if
     it is ever rendered outside a flex parent, where a bare span would
     collapse to inline and lose its box. */
  display: "block",
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
  /* Whether this ball is still inside its entrance animation, and so still
     wants its own compositor layer (see .cascade-ball.promoting in
     globalStyles.js). True from mount — the layer has to exist before the
     first animated frame, which is the whole reason the promotion is done
     up front rather than discovered mid-animation — and dropped the moment
     the animation ends, so a settled ball stops holding a layer open for
     the rest of the level. */
  const [promoting, setPromoting] = useState(true);
  return (
    /* A <span>, not a <div>: button's content model is phrasing content, and
       div is flow content, so a div in here is invalid HTML even though every
       browser renders it. Both are flex items of the tube (column-reverse), so
       both are blockified identically — which is why BALL_STYLE_BASE can carry
       display:block and keep this correct if it is ever used outside a flex
       parent. Nothing about the layout changes. */
    <span
      className={`${landing ? "cascade-ball landing" : "cascade-ball"}${promoting ? " promoting" : ""}`}
      onAnimationEnd={(e) => {
        /* Guarded on target: animationend bubbles, and this ball's children
           could grow an animation of their own later. */
        if (e.target === e.currentTarget) setPromoting(false);
      }}
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
    </span>
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
      /* The contents are in the label now, which they were not before. The old
         label described only UI state — selected / solved / hint source /
         hint destination — so a screen-reader user knew a tube existed and
         nothing about what was in it. In a ball-sort puzzle the distribution
         of balls across tubes IS the game, so that made the board
         unplayable without sight, and the colour-blind numbers did not fill the
         gap because they are aria-hidden (correctly, for the visual layer).

         Numbers are `colorIdx + 1` because that is exactly what the
         colour-blind mode paints on the ball, so the spoken board and the seen
         board agree. They are 1-based indices into COLORS, not colour names —
         the accessible version of a colour-blind mode is numbers, and inventing
         names here would mean maintaining a second palette in a screen reader. */
      aria-label={[
        `Tube ${idx + 1}`,
        balls.length
          ? `${balls.length} ball${balls.length === 1 ? "" : "s"}, colours ${balls.map((c) => c + 1).join(" ")}`
          : "empty",
        selected ? "selected" : null,
        solved ? "solved" : null,
        hintFrom ? "hint source" : null,
        hintTo ? "hint destination" : null,
      ]
        .filter(Boolean)
        .join(", ")}
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
