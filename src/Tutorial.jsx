/* ═══════════ TUTORIAL SCREEN ═══════════
   3-step onboarding overlay. Shown automatically ~700ms after the app's
   very first launch (App.jsx's mount effect), reachable again any time
   after via Settings → How to Play, and re-armed by Reset Progress —
   whose own confirm dialog promises "this deletes your ... tutorial",
   previously true only in localStorage, never visibly, so confirming
   Reset looked like it hadn't touched the tutorial at all until some
   unrelated later cold launch surfaced it with no obvious cause.

   Entrance staggers the three rule-steps instead of revealing them as one
   flat block, and "Got it" now plays a real exit — the card used to just
   vanish the instant it was clicked. The exit's hold time is skipped
   entirely under Reduce Motion (OS-level or the in-app toggle) rather
   than leaving a dead pause where an invisible animation used to be. */

import { useEffect, useRef, useState } from "react";
import { T } from "./constants";
import { S } from "./theme";

function prefersReducedMotion() {
  try {
    if (document.documentElement.getAttribute("data-reduce-motion") === "1") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default function Tutorial({ onClose }) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);

  // Guards against the timer still being in flight if something force-
  // unmounts this component before "Got it" itself gets clicked.
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const handleClose = () => {
    if (closing) return; // one tap during the exit shouldn't queue a second onClose
    setClosing(true);
    closeTimer.current = setTimeout(onClose, prefersReducedMotion() ? 0 : 200);
  };

  const stepStyle = (i) => ({ ...S.tutStep, animationDelay: `${120 + i * 90}ms` });

  return (
    <div
      style={{ ...S.tutOverlay, pointerEvents: closing ? "none" : "auto" }}
      className={closing ? "fade-out" : "fade-in"}
    >
      <div style={S.tutCard} className={closing ? "tutOut" : "tutIn"}>
        <div style={S.tutHeader}>
          <div style={S.tutIconCircle} className={closing ? "" : "tutIconPop"}>
            <span style={{ fontSize: 28 }}>🎯</span>
          </div>
          <div style={S.tutTitle}>How to Play</div>
          <div style={S.tutSub}>Three simple rules</div>
        </div>

        <div style={S.tutSteps}>
          <div style={stepStyle(0)} className={closing ? "" : "fade-up"}>
            <div style={S.tutNum}>1</div>
            <div style={S.tutStepBody}>
              <div style={S.tutStepTitle}>Tap a tube</div>
              <div style={S.tutStepDesc}>Pick up the <b style={{ color: T.accent }}>top ball</b></div>
            </div>
          </div>

          <div style={stepStyle(1)} className={closing ? "" : "fade-up"}>
            <div style={S.tutNum}>2</div>
            <div style={S.tutStepBody}>
              <div style={S.tutStepTitle}>Tap another</div>
              <div style={S.tutStepDesc}>Pour onto a <b style={{ color: T.go }}>matching color</b> or an <b style={{ color: T.go }}>empty tube</b></div>
            </div>
          </div>

          <div style={stepStyle(2)} className={closing ? "" : "fade-up"}>
            <div style={S.tutNum}>3</div>
            <div style={S.tutStepBody}>
              <div style={S.tutStepTitle}>Sort them all</div>
              <div style={S.tutStepDesc}>Each tube one <b style={{ color: T.gold }}>single color</b></div>
            </div>
          </div>
        </div>

        <div style={S.tutWarning}>
          <span style={{ fontSize: 15 }}>⚠️</span>
          <span>Each pour costs a move. You have a limited number.</span>
        </div>

        <button style={S.primary} onClick={handleClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
