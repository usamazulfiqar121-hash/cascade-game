import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* Theme attribute — set BEFORE React mounts to prevent flash.
   Was hardcoded to "dark" unconditionally, which only "prevented" the
   flash for a first-time visitor (who defaults to dark anyway) — a
   returning Light (or System-resolving-to-light) user got dark forced
   on for at least the first paint, until App.jsx's own mount effect
   (reads localStorage) and its theme-sync effect (sets this same
   attribute) run a tick later and correct it. Both are plain
   useEffects, which fire after the browser paints, so that first
   frame was really rendered in the wrong theme, every launch — not a
   one-time flash but a guaranteed wrong-then-right flicker for anyone
   who isn't on dark. Resolving the saved preference here too (mirrors
   App.jsx's own theme + "system" resolution logic exactly) means the
   attribute is already correct before React — or the browser — ever
   paints anything. */
try {
  const saved = localStorage.getItem("cascade:theme");
  const theme = saved === "dark" || saved === "light" || saved === "system" ? saved : "dark";
  const effective = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.setAttribute("data-theme", effective);
} catch {
  document.documentElement.setAttribute("data-theme", "dark");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
