import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* Default theme attribute — set BEFORE React mounts to prevent flash */
document.documentElement.setAttribute("data-theme", "dark");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
