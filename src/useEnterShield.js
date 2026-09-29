import { useEffect, useState } from "react";

/* Full-page screens (Settings, Profile) slide in over ~320ms, but were tappable
   from the first frame. The tap that opened the page is often followed by a
   second one (a double-tap on the bottom-nav tab): it landed on whatever the new
   page had under the finger, and on a 390x844 phone that was the "Reset Progress"
   row (Chrome snaps touches to a nearby button), so double-tapping the Settings
   tab opened "Reset All Progress?".

   Returns false for the first `ms` after mount. The page renders a transparent
   full-page layer meanwhile, so those taps are swallowed by the page itself
   rather than falling through to the screen underneath (which would push a second
   history entry and make Back need two presses). */
export const ENTER_SHIELD_MS = 340;

export function useEnterShield(ms = ENTER_SHIELD_MS) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return ready;
}
