import { useEffect, useState } from 'react'
import { backupNow, retryAutoBackup, watchChanges } from '../db/backup'

const INTERVAL_MS = 2 * 60_000

/**
 * Runs the automatic backup in the background: every few minutes after a change and when the
 * app is hidden. Shows a strip when the browser has forgotten the permission, and a louder one
 * when a write failed — a backup that has quietly stopped is the one that costs the user data.
 */
export function BackupManager() {
  const [trouble, setTrouble] = useState<'needs-permission' | 'failed'>()

  useEffect(() => {
    watchChanges()
    // Asks the browser not to clear our data when space runs low.
    navigator.storage?.persist?.().catch(() => {})

    let cancelled = false
    const run = async () => {
      // Anything unexpected counts as a failed write, never as "there is no backup set up":
      // the user has to hear about it.
      const result = await backupNow().catch(() => 'failed' as const)
      if (cancelled || result === 'unchanged') return
      setTrouble(result === 'needs-permission' || result === 'failed' ? result : undefined)
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

  if (!trouble) return null
  const failed = trouble === 'failed'
  return (
    <button
      type="button"
      onClick={async () => {
        if (await retryAutoBackup().catch(() => false)) setTrouble(undefined)
      }}
      className={`sticky top-0 z-20 -mx-4 flex w-[calc(100%+2rem)] items-center gap-2 px-4 py-2.5 text-left text-sm ${
        failed ? 'bg-p1/15 text-p1' : 'bg-accent-soft text-accent'
      }`}
    >
      <span aria-hidden>{failed ? '⚠️' : '💾'}</span>
      <span className="flex-1">{failed ? 'Otomatik yedek yazılamadı' : 'Otomatik yedek duraklatıldı'}</span>
      <span className="font-medium underline">{failed ? 'Tekrar dene' : 'Devam ettir'}</span>
    </button>
  )
}
