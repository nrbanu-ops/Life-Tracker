import type { Habit } from '../db/types'
import { formatElapsed, milestoneProgress, pendingCelebration, quitStats } from '../lib/quit'

const DAY = 86_400_000

type Props = {
  habit: Habit
  now: Date
  onOpen: () => void
  onCelebrated: (days: number) => void
}

/** Live "time since quitting" counter with progress toward the next milestone. */
export function QuitCard({ habit, now, onOpen, onCelebrated }: Props) {
  const stats = quitStats(habit, now)
  const celebration = pendingCelebration(habit, stats)
  const daysLeft = stats.next ? Math.ceil(stats.next.days - stats.currentMs / DAY) : 0

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-surface">
      {celebration && (
        <div className="flex items-center gap-3 bg-accent-soft px-4 py-3 text-accent">
          <span className="text-xl" aria-hidden>
            🎉
          </span>
          <p className="flex-1 text-sm font-medium">
            {celebration.label} oldu! Harika gidiyorsun.
          </p>
          <button
            type="button"
            onClick={() => onCelebrated(celebration.days)}
            className="rounded-full bg-surface px-3 py-1 text-sm font-medium"
          >
            Teşekkürler
          </button>
        </div>
      )}
      <button type="button" onClick={onOpen} className="block w-full px-4 py-4 text-left">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate font-medium">{habit.title}</span>
          <span className="shrink-0 text-xs text-muted">bırakalı</span>
        </span>
        <span className="mt-1 block text-2xl font-semibold tabular-nums">
          {formatElapsed(stats.currentMs)}
        </span>
        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-bg">
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${milestoneProgress(stats) * 100}%` }}
          />
        </span>
        <span className="mt-1.5 block text-xs text-muted">
          {stats.next
            ? `Sıradaki: ${stats.next.label} · ${daysLeft === 1 ? '1 günden az' : `${daysLeft} gün`} kaldı`
            : 'Bütün dönüm noktalarını geçtin'}
        </span>
      </button>
    </li>
  )
}
