import type { LogEntry } from '../db/logs'
import type { Habit } from '../db/types'
import { incrementOf } from './amount'
import { isExcused, withAmount } from './today'

/** Hard days a month allows. Enough for the bad days everyone has; not enough to live in. */
export const HARD_DAYS_PER_MONTH = 3

const monthOf = (day: string): string => day.slice(0, 7)

/** Hard days already declared in that day's month. */
export const hardDaysUsed = (days: string[], day: string): number =>
  days.filter((d) => monthOf(d) === monthOf(day)).length

export const hardDaysLeft = (days: string[], day: string): number =>
  Math.max(0, HARD_DAYS_PER_MONTH - hardDaysUsed(days, day))

/**
 * What one tap does on a hard day: the bar is the minimum, so that is what a tap marks.
 * Check habits go empty → minimum → done → empty (the full version is still there for the
 * day that turns out better than expected); count and duration habits add their step as
 * usual, but any amount short of the target counts as the minimum rather than as partial.
 */
export function hardTap(habit: Habit, log: Partial<LogEntry> | undefined): LogEntry | undefined {
  if (isExcused(log?.status)) return undefined
  if (habit.kind === 'check') {
    if (log?.status === undefined || log.status === 'partial') return { status: 'minimum' }
    return log.status === 'minimum' ? { status: 'done' } : undefined
  }
  return withAmount(habit, (log?.value ?? 0) + incrementOf(habit), 'minimum')
}
