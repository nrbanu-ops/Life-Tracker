export type UpdateResult = 'latest' | 'updating' | 'offline' | 'unsupported' | 'failed'

/**
 * Asks the service worker to look for a new version right now.
 * A new version installs and activates by itself; the page then reloads (see `registerSW` in main.tsx).
 */
export async function checkForUpdate(): Promise<UpdateResult> {
  const registration = await navigator.serviceWorker?.getRegistration().catch(() => undefined)
  if (!registration) return 'unsupported'
  if (!navigator.onLine) return 'offline'
  try {
    await registration.update()
  } catch {
    return 'failed'
  }
  if (!registration.installing && !registration.waiting) return 'latest'
  // Normally the reload comes on its own within a second or two; this is only a safety net.
  window.setTimeout(() => location.reload(), 10_000)
  return 'updating'
}
