/* ═══════════ CUSTOM SHAPE ICONS ═══════════
   Inline SVG components. No images, no icon fonts.
   Scalable, themable, crisp on all densities. */

export function HomeIcon({ size = 24, active = false }) {
  const c = active ? "#4C8DFF" : "#7A85A8";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4L20 10.5V20C20 20.55 19.55 21 19 21H15V15H9V21H5C4.45 21 4 20.55 4 20V10.5Z"
        fill={active ? c : "none"} stroke={c} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

export function PlayIcon({ size = 24, active = false, white = false }) {
  const c = white ? "#FFFFFF" : (active ? "#4C8DFF" : "#7A85A8");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 5.5L18.5 12L8 18.5V5.5Z" fill={c} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

export function TrophyIcon({ size = 24, active = false }) {
  const c = active ? "#FFC24B" : "#7A85A8";
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
  const c = active ? "#4C8DFF" : "#7A85A8";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8"/>
      <path d="M12 2V4M12 20V22M2 12H4M20 12H22M5 5L6.5 6.5M17.5 17.5L19 19M19 5L17.5 6.5M6.5 17.5L5 19"
        stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function FireIcon({ size = 20, color = "#FFC24B" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 14 6 14 9C14 10.1 13.1 11 12 11C10.9 11 10 10.1 10 9C10 8.5 10.2 8 10.5 7.5C9 8.5 7 10.5 7 13C7 15.5 8.5 17.5 10 18.5V20H14V18.5C15.5 17.5 17 15.5 17 13C17 10 15 7 12 2Z"
        fill={color}/>
    </svg>
  );
}

export function CheckIcon({ size = 18, color = "#22C58A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12L10 17L19 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
