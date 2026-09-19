/* ═══════════ TUTORIAL SCREEN ═══════════
   3-step onboarding overlay. Shown on first launch only. */

import { T } from "./constants";
import { S } from "./theme";

export default function Tutorial({ onClose }) {
  return (
    <div style={S.tutOverlay} className="tutIn">
      <div style={S.tutCard}>
        <div style={S.tutHeader}>
          <div style={S.tutIconCircle}>
            <span style={{ fontSize: 28 }}>🎯</span>
          </div>
          <div style={S.tutTitle}>How to Play</div>
          <div style={S.tutSub}>Three simple rules</div>
        </div>

        <div style={S.tutSteps}>
          <div style={S.tutStep}>
            <div style={S.tutNum}>1</div>
            <div style={S.tutStepBody}>
              <div style={S.tutStepTitle}>Tap a tube</div>
              <div style={S.tutStepDesc}>Pick up the <b style={{ color: T.accent }}>top ball</b></div>
            </div>
          </div>

          <div style={S.tutStep}>
            <div style={S.tutNum}>2</div>
            <div style={S.tutStepBody}>
              <div style={S.tutStepTitle}>Tap another</div>
              <div style={S.tutStepDesc}>Pour onto a <b style={{ color: T.go }}>matching color</b> or an <b style={{ color: T.go }}>empty tube</b></div>
            </div>
          </div>

          <div style={S.tutStep}>
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

        <button style={S.primary} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
