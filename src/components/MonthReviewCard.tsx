import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router'
import { db } from '../db/db'
import { monthCardDue, monthReview, monthReviewRange, type HabitMonth } from '../lib/monthReview'
import type { SuccessRate } from '../lib/stats'

type Props = {
  today: string
  /** On Bugün it turns up by itself in the first days of a month; on İstatistik it is always there. */
  variant: 'today' | 'stats'
}

const DISMISSED = 'life-tracker:month-review-dismissed'

const readDismissed = (): string | null => {
  try {
    return localStorage.getItem(DISMISSED)
  } catch {
    return null
  }
}

const percent = (rate: SuccessRate) => (rate.rate === undefined ? '–' : `%${Math.round(rate.rate * 100)}`)

/** "%40 → %75": the month before, then last month. */
const moved = (row: HabitMonth) => `${percent(row.before)} → ${percent(row.last)}`

/**
 * Last month next to the one before: what improved, what slipped, and which habits to make
 * smaller. A habit that keeps not happening is information about the habit, and once a month
 * is often enough to act on it.
 */
export function MonthReviewCard({ today, variant }: Props) {
  const [dismissed, setDismissed] = useState(readDismissed)
  const habits = useLiveQuery(() => db.habits.toArray(), [], [])
  const logs = useLiveQuery(() => {
    const { from, to } = monthReviewRange(today)
    return db.habitLogs.where('date').between(from, to, true, true).toArray()
  }, [today])

  if (logs === undefined) return null
  if (variant === 'today' && !monthCardDue(today)) return null
  const review = monthReview(habits, logs, today)
  if (!review) return null
  if (variant === 'today' && dismissed === review.month) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, review.month)
    } catch {
      // Private mode: it just comes back on the next open.
    }
    setDismissed(review.month)
  }

  const diff =
    review.overall.rate !== undefined && review.overallBefore.rate !== undefined
      ? Math.round(review.overall.rate * 100) - Math.round(review.overallBefore.rate * 100)
      : undefined
  const quiet = !review.riser && !review.faller && review.shrink.length === 0

  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium">📅 {review.label} bakışı</h2>
        {variant === 'today' && (
          <button type="button" onClick={dismiss} className="shrink-0 text-sm text-muted">
            Kapat
          </button>
        )}
      </div>

      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{percent(review.overall)}</p>
      <p className="text-sm text-muted">
        {review.overall.planned} planlı günün {review.overall.done} tanesi tamam
        {diff !== undefined && (
          <>
            {' · '}
            {review.beforeLabel} {percent(review.overallBefore)}
            {diff !== 0 && ` (${diff > 0 ? '+' : '−'}${Math.abs(diff)} puan)`}
          </>
        )}
      </p>

      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {review.best && (
          <li>
            🏆 En iyi giden: <b>{review.best.habit.title}</b> {percent(review.best.last)}
          </li>
        )}
        {review.riser && (
          <li>
            📈 En çok artan: <b>{review.riser.habit.title}</b> {moved(review.riser)}
          </li>
        )}
        {review.faller && (
          <li>
            📉 En çok düşen: <b>{review.faller.habit.title}</b> {moved(review.faller)}
          </li>
        )}
        {review.shrink.map((row) => (
          <li key={row.habit.id}>
            ✂️ Küçült ya da arşivle: <b>{row.habit.title}</b> {percent(row.last)}{' '}
            <span className="text-muted">
              ({row.last.planned} günün {row.last.done} tanesi)
            </span>
          </li>
        ))}
        {quiet && <li className="text-muted">Geçen aya göre dikkat çeken bir değişiklik yok.</li>}
      </ul>

      {review.shrink.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Bir ay boyunca olmayan habit'i her gün listede görmek motivasyonu düşürür. Minimum
          versiyonunu küçült, sıklığını azalt ya da şimdilik arşivle.
        </p>
      )}
      {variant === 'today' && (
        <Link to="/istatistik" className="mt-3 inline-block text-sm text-accent underline">
          İstatistiklere git
        </Link>
      )}
    </section>
  )
}
