import { useEffect, useState } from 'react'
import { backupNow, resumeAutoBackup, watchChanges } from '../db/backup'

const INTERVAL_MS = 2 * 60_000

/**
 * Runs the automatic backup in the background: every few minutes after a change and when the
 * app is hidden. When the browser has forgotten the permission, shows a strip to resume it.
 */
export function BackupManager() {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    watchChanges()
    // Asks the browser not to clear our data when space runs low.
    navigator.storage?.persist?.().catch(() => {})

    let cancelled = false
    const run = async () => {
      const result = await backupNow().catch(() => 'off' as const)
      if (!cancelled && result !== 'unchanged') setPaused(result === 'needs-permission')
    }
    run()
    const id = window.setInterval(run, INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') run()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  if (!paused) return null
  return (
    <button
      type="button"
      onClick={async () => {
        if (await resumeAutoBackup().catch(() => false)) setPaused(false)
      }}
      className="sticky top-0 z-20 -mx-4 flex w-[calc(100%+2rem)] items-center gap-2 bg-accent-soft px-4 py-2.5 text-left text-sm text-accent"
    >
      <span aria-hidden>💾</span>
      <span className="flex-1">Otomatik yedek duraklatıldı</span>
      <span className="font-medium underline">Devam ettir</span>
    </button>
  )
}
