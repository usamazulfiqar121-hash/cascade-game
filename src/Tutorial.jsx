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
   vanish the instant it was clicked. The exit plays the same way with
   Reduce Motion on or off -- that setting only pauses looping ambient
   motion now (see globalStyles.js). */

import { useEffect, useRef, useState } from "react";
import { T } from "./constants";
import { S } from "./theme";

/* "Got it" sits exactly under Settings' "How to Play" row (y 606-654 vs 645 on a
   390x844 phone), so a double-tap on that row opened the card and dismissed it again
   with the second tap. Taps in the first TUT_TAP_GUARD_MS are ignored. */
const TUT_TAP_GUARD_MS = 500;

export default function Tutorial({ onClose }) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);
  const openedAt = useRef(performance.now());
  const closeBtn = useRef(null);

  // Guards against the timer still being in flight if something force-
  // unmounts this component before "Got it" itself gets clicked.
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  /* Put focus on "Got it" the moment the card opens. As a modal, the card
     is the only thing that should be reachable, and before this the focused
     element was still whatever the player had tapped to open it (the
     Settings "How to Play" row) — behind the scrim, on a different
     screen — so a screen-reader user landed with focus outside the dialog
     and had to hunt back in, and the first Tab press walked the page
     behind it instead of the dialog's one control. `.focus()` (not
     focus-visible) is deliberate: this is programmatic focus, not a
     keyboard user arriving by Tab, so the focus ring is suppressed
     rather than flashing on a card that just animated in. */
  useEffect(() => {
    if (closeBtn.current) closeBtn.current.focus();
  }, []);

  const handleClose = () => {
    if (closing) return; // one tap during the exit shouldn't queue a second onClose
    if (performance.now() - openedAt.current < TUT_TAP_GUARD_MS) return;
    setClosing(true);
    /* Same 200ms exit in both motion settings: Reduce Motion no longer
       squashes one-shot animations (globalStyles.js), so cutting this to 0
       would unmount the card halfway through its own fade. */
    closeTimer.current = setTimeout(onClose, 200);
  };

  const stepStyle = (i) => ({ ...S.tutStep, animationDelay: `${120 + i * 90}ms` });

  return (
    <div
      style={{ ...S.tutOverlay, pointerEvents: closing ? "none" : "auto" }}
      className={closing ? "fade-out" : "fade-in"}
    >
      {/* role="dialog" + aria-modal on the CARD, not the scrim: same
          pairing the upgrade picker and game-over card already use
          (App.jsx). Announcing the full-screen scrim as the dialog would
          hand the screen reader a label-free element sized to the whole
          viewport. */}
      <div
        style={S.tutCard}
        className={closing ? "tutOut" : "tutIn"}
        role="dialog"
        aria-modal="true"
        aria-label="How to Play"
      >
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
              <div style={S.tutStepTitle}>Tap a tube, then tap where it goes</div>
              <div style={S.tutStepDesc}>That&apos;s <b style={{ color: T.accent }}>1 move</b></div>
            </div>
          </div>

          <div style={stepStyle(1)} className={closing ? "" : "fade-up"}>
            <div style={S.tutNum}>2</div>
            <div style={S.tutStepBody}>
              <div style={S.tutStepTitle}>Finish the board</div>
              <div style={S.tutStepDesc}><b style={{ color: T.go }}>NEED</b> is the fewest moves that clear it — most rounds give you more</div>
            </div>
          </div>

          <div style={stepStyle(2)} className={closing ? "" : "fade-up"}>
            <div style={S.tutNum}>3</div>
            <div style={S.tutStepBody}>
              <div style={S.tutStepTitle}>Use fewer moves</div>
              <div style={S.tutStepDesc}>Leftover <b style={{ color: T.gold }}>carries to the next round</b></div>
            </div>
          </div>
        </div>

        {/* The fail state, which the three steps above don't state and which a
            first launch otherwise never learns about: a board can be run out of
            moves on. Kept as its own line rather than folded into a step — it is
            a consequence, not a rule, and the rules are already three. */}
        <div style={S.tutWarning}>
          <span style={{ fontSize: 15 }}>⚠️</span>
          <span>Every round has a strict limit. Run out of moves and the round ends.</span>
        </div>

        <button ref={closeBtn} style={S.primary} onClick={handleClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
