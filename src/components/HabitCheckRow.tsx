import { useRef } from 'react'
import type { HabitLogStatus } from '../db/types'
import { formatAmount } from '../lib/amount'
import type { TodayItem } from '../lib/today'

type Props = {
  item: TodayItem
  onTap: () => void
  /** Long press or the ⋯ button: minimum, skip, exact amount. */
  onMore: () => void
}

const LONG_PRESS_MS = 500

export function HabitCheckRow({ item, onTap, onMore }: Props) {
  const { habit, status, value, weekCount, countsToday } = item
  const timer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)

  const cancelPress = () => window.clearTimeout(timer.current)
  const startPress = () => {
    longPressed.current = false
    timer.current = window.setTimeout(() => {
      longPressed.current = true
      navigator.vibrate?.(10)
      onMore()
    }, LONG_PRESS_MS)
  }

  const details: string[] = []
  if (status === 'skipped') details.push('Bugün atlandı')
  if (status === 'minimum') details.push(`Minimum: ${habit.minimumVersion ?? 'yapıldı'}`)
  if (habit.kind !== 'check' && habit.target && status !== 'skipped') {
    details.push(`${formatAmount(habit, value ?? 0)} / ${formatAmount(habit, habit.target)}`)
  }
  if (habit.frequency.type === 'timesPerWeek') {
    details.push(`Bu hafta ${weekCount}/${habit.frequency.count}`)
  }

  const progress =
    habit.kind !== 'check' && habit.target ? Math.min(1, (value ?? 0) / habit.target) : 0

  return (
    <li className={`flex items-center ${countsToday ? '' : 'opacity-60'}`}>
      <button
        type="button"
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          // The long press already opened the sheet; swallow the click that follows it.
          if (longPressed.current) {
            longPressed.current = false
            return
          }
          onTap()
        }}
        aria-label={`${habit.title}: ${statusLabel(status)}`}
        className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 py-3.5 pl-4 text-left select-none"
      >
        <CheckMark status={status} progress={progress} countable={habit.kind !== 'check'} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${status ? 'text-muted' : ''}`}>
            {habit.title}
          </span>
          {details.length > 0 && (
            <span className="block truncate text-sm text-muted">{details.join(' · ')}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={onMore}
        aria-label={`${habit.title}: diğer seçenekler`}
        className="self-stretch px-4 text-lg text-muted"
      >
        ⋯
      </button>
    </li>
  )
}

function statusLabel(status: HabitLogStatus | undefined) {
  switch (status) {
    case 'done':
      return 'yapıldı'
    case 'minimum':
      return 'minimum yapıldı'
    case 'partial':
      return 'kısmen yapıldı'
    case 'skipped':
      return 'atlandı'
    default:
      return 'yapılmadı'
  }
}

type CheckMarkProps = {
  status: HabitLogStatus | undefined
  /** 0–1 toward the target, for count/duration habits. */
  progress: number
  countable: boolean
}

const RING_RADIUS = 13
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

function CheckMark({ status, progress, countable }: CheckMarkProps) {
  if (status === 'done') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-surface">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  if (status === 'minimum') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent-soft text-[10px] font-bold text-accent">
        MIN
      </span>
    )
  }
  if (status === 'skipped') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border text-sm text-muted">
        »
      </span>
    )
  }
  if (countable) {
    // Empty or partial: a ring that fills toward the target, with + to hint at tapping.
    return (
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center text-accent">
        <svg viewBox="0 0 32 32" className="absolute inset-0" aria-hidden>
          <circle cx="16" cy="16" r={RING_RADIUS} fill="none" stroke="var(--color-border)" strokeWidth={3} />
          <circle
            cx="16"
            cy="16"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
            transform="rotate(-90 16 16)"
            opacity={progress === 0 ? 0 : 1}
            className="transition-[stroke-dashoffset] duration-300"
          />
        </svg>
        <span className="text-base leading-none font-medium">+</span>
      </span>
    )
  }
  return <span className="h-8 w-8 shrink-0 rounded-full border-2 border-border bg-surface" />
}
