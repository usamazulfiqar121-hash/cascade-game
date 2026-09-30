/* ═══════════ CUSTOM SHAPE ICONS ═══════════
   Inline SVG components. No images, no icon fonts.
   Scalable, themable, crisp on all densities. */

export function HomeIcon({ size = 24, active = false }) {
  /* var(--accent)/var(--muted), not a fixed hex — these used to be
     "#4C8DFF"/"#7A85A8" (the dark theme's own accent/muted values,
     copied in as literals), so switching to Light or Auto-in-daylight
     left the bottom-nav icons rendering in dark-theme colors while
     every surrounding label, background and border correctly flipped
     to the light palette. */
  const c = active ? "var(--accent)" : "var(--muted)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4L20 10.5V20C20 20.55 19.55 21 19 21H15V15H9V21H5C4.45 21 4 20.55 4 20V10.5Z"
        fill={active ? c : "none"} stroke={c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

export function TrophyIcon({ size = 24, active = false }) {
  /* var(--gold)/var(--muted) — same fixed-to-dark-theme bug as
     HomeIcon above. The crown's translucent active-state wash just
     below is left as a flat amber rgba(): it's a decorative tint
     under an already-gold icon, not the actual color mismatch. */
  const c = active ? "var(--gold)" : "var(--muted)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 4H16V10C16 12.21 14.21 14 12 14C9.79 14 8 12.21 8 10V4Z"
        stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? "rgba(255,194,75,0.15)" : "none"}/>
      <path d="M8 6H6C5 6 4 7 4 8V9C4 10.5 5.5 12 7 12" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 6H18C19 6 20 7 20 8V9C20 10.5 18.5 12 17 12" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 14V18" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M8 20H16" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function SettingsIcon({ size = 24, active = false }) {
  const c = active ? "var(--accent)" : "var(--muted)"; // see HomeIcon above
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8"/>
      <path d="M12 2V4M12 20V22M2 12H4M20 12H22M5 5L6.5 6.5M17.5 17.5L19 19M19 5L17.5 6.5M6.5 17.5L5 19"
        stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

/* var(--gold) / var(--go), not the dark theme's own #FFC24B / #22C58A
   copied in as literals — the same fixed-to-dark-theme bug already fixed
   on HomeIcon and SettingsIcon above, which left these two as the last
   hardcoded colors in this file. Any caller relying on the default (rather
   than passing a color) was rendering the dark palette's gold and green
   after the surrounding text, background and border had all flipped to the
   light one. */
export function FireIcon({ size = 20, color = "var(--gold)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 14 6 14 9C14 10.1 13.1 11 12 11C10.9 11 10 10.1 10 9C10 8.5 10.2 8 10.5 7.5C9 8.5 7 10.5 7 13C7 15.5 8.5 17.5 10 18.5V20H14V18.5C15.5 17.5 17 15.5 17 13C17 10 15 7 12 2Z"
        fill={color}/>
    </svg>
  );
}

export function CheckIcon({ size = 18, color = "var(--go)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12L10 17L19 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* HintIcon / UndoIcon: stroke="currentColor" on purpose, not a color
   prop — both replace an emoji/glyph inside the in-game Hint and Undo
   buttons, whose style already flips `color` between T.go/T.accent
   (enabled) and T.muted (disabled/out-of-uses). currentColor lets the
   icon track that same swap for free, same as the "N left" number
   next to it already does — a color prop here would just have to be
   handed the same value the button already computes. */
export function HintIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3C8.13 3 5 6.13 5 10C5 12.38 6.19 14.47 8 15.74V18H16V15.74C17.81 14.47 19 12.38 19 10C19 6.13 15.87 3 12 3Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 18H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 21H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9.5 10.5C9.5 8.84 10.84 7.5 12.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.55"/>
    </svg>
  );
}

export function UndoIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7.5 6.5L3 11L7.5 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 11H14C17.31 11 20 13.69 20 17V17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
