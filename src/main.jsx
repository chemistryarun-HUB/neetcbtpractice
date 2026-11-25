import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installTapDebug } from './lib/tapDebug'

installTapDebug()

// After a deploy, a page that was already open still asks for the old build's
// lazy files (PDF maker, KaTeX...), which no longer exist on the server:
// "Failed to fetch dynamically imported module". Reloading picks up the new
// build. Only once per 30 s, so a real network failure can't loop forever.
const RELOAD_KEY = 'neetcbt_chunk_reload'
window.addEventListener('vite:preloadError', event => {
  let last = 0
  try { last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0 } catch { /* storage blocked */ }
  if (Date.now() - last < 30000) return
  event.preventDefault()
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())) } catch { /* storage blocked */ }
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
