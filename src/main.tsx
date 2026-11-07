import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { applyPalette, getPalette } from './lib/theme.ts'

// index.html already set data-palette; this also points theme-color at the palette's colours.
applyPalette(getPalette())

const UPDATE_CHECK_MS = 30 * 60_000

// Offline support and automatic updates: a new version is fetched in the background and
// applied right away (the page reloads), so the phone app never needs reinstalling.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (navigator.onLine) registration.update().catch(() => {})
    }
    window.setInterval(check, UPDATE_CHECK_MS)
    // Opening the app (or coming back to it) is the moment an update matters.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
