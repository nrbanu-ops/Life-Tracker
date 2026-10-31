import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { formatMinutes } from '../lib/amount'
import { elapsedMs, formatClock, isRunning, remainingMs } from '../lib/timer'
import { useTimer } from '../lib/timerContext'
import { TimerIcon } from './icons'

const RESULT_MS = 6000

/** Top strip: the running timer on other screens, and the result when one finishes. */
export function TimerBanner() {
  const { timer, now, result, clearResult } = useTimer()
  const { pathname } = useLocation()

  useEffect(() => {
    if (!result) return
    const id = window.setTimeout(clearResult, RESULT_MS)
    return () => window.clearTimeout(id)
  }, [result, clearResult])

  if (result) {
    return (
      <div
        role="status"
        className="sticky top-0 z-20 -mx-4 flex items-center gap-3 bg-accent px-4 py-3 text-surface"
      >
        <span className="flex-1 text-sm font-medium">
          {result.habitTitle
            ? `✓ "${result.habitTitle}" kaydına ${formatMinutes(result.minutes)} eklendi`
            : `✓ ${formatMinutes(result.minutes)} tamamlandı`}
        </span>
        <button type="button" onClick={clearResult} className="text-sm underline">
          Tamam
        </button>
      </div>
    )
  }

  if (!timer || pathname === '/zamanlayici') return null
  const countdown = timer.mode === 'countdown'
  const clock = countdown ? formatClock(remainingMs(timer, now), true) : formatClock(elapsedMs(timer, now))
  return (
    <Link
      to="/zamanlayici"
      className="sticky top-0 z-20 -mx-4 flex items-center gap-2 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent"
    >
      <TimerIcon width={18} height={18} />
      <span className="tabular-nums">{clock}</span>
      <span className="text-muted">
        {isRunning(timer) ? (countdown ? 'kaldı' : 'geçti') : 'duraklatıldı'}
      </span>
    </Link>
  )
}
