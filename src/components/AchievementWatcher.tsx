import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { db } from '../db/db'
import { storeEarned, useAchievements } from '../db/achievements'
import { newlyEarned } from '../lib/achievements'
import { todayKey } from '../lib/date'

type Toast = { emoji: string; title: string; text: string }

const TOAST_MS = 6000

/** Stores achievements as they are earned and celebrates them with a short toast. */
export function AchievementWatcher() {
  const achievements = useAchievements()
  const [toast, setToast] = useState<Toast>()
  // Ids already being stored, so a re-render before the write lands doesn't celebrate twice.
  const storing = useRef(new Set<string>())

  useEffect(() => {
    if (!achievements) return
    const fresh = newlyEarned(achievements).filter((a) => !storing.current.has(a.id))
    if (fresh.length === 0) return
    for (const a of fresh) storing.current.add(a.id)
    void (async () => {
      // The very first time, everything already earned arrives at once: one summary instead of a pile.
      const firstTime = (await db.achievements.count()) === 0
      await storeEarned(fresh.map((a) => a.id), todayKey())
      if (fresh.length === 1) {
        setToast({ emoji: fresh[0].emoji, title: 'Yeni başarım!', text: fresh[0].title })
      } else {
        setToast({
          emoji: '🏆',
          title: firstTime ? 'Başarımlar geldi!' : 'Yeni başarımlar!',
          text: firstTime ? `${fresh.length} tanesini zaten kazanmışsın` : `${fresh.length} başarım kazandın`,
        })
      }
    })()
  }, [achievements])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(undefined), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (!toast) return null
  return (
    <Link
      to="/basarimlar"
      onClick={() => setToast(undefined)}
      role="status"
      className="fixed inset-x-4 z-40 mx-auto flex max-w-sm animate-[toast-in_260ms_ease-out] items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg"
      // At the top, clear of the floating add buttons near the tab bar.
      style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      <span className="text-3xl" aria-hidden>
        {toast.emoji}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-accent">{toast.title}</span>
        <span className="block truncate font-medium">{toast.text}</span>
      </span>
    </Link>
  )
}
