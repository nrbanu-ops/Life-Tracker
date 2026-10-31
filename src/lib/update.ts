export type UpdateResult = 'latest' | 'updating' | 'offline' | 'unsupported' | 'failed'

/**
 * Asks the service worker to look for a new version right now.
 * A new version installs and activates by itself; the page then reloads.
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
  const fresh = registration.installing ?? registration.waiting
  if (!fresh) return 'latest'
  // Older builds' workers wait for this message instead of taking over on their own.
  fresh.postMessage({ type: 'SKIP_WAITING' })
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true })
  // Safety net in case the switch is missed.
  window.setTimeout(() => location.reload(), 10_000)
  return 'updating'
}
