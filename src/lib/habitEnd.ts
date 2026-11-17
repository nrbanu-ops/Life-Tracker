import { addMonths, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Habit } from '../db/types'
import { fromDateKey, toDateKey } from './date'

// A habit can run until a set day (`Habit.endDate`, its last day). After that day it is not
// planned any more: nothing is missed, fined or broken while the app asks whether to go on
// or call it done.

/** Whether `day` lies after the habit's last day. */
export const hasEnded = (habit: Pick<Habit, 'endDate'>, day: string): boolean =>
  habit.endDate !== undefined && day > habit.endDate

/** `day`, or the habit's last day if that comes first: where a walk over its periods stops. */
export const capAtEnd = (habit: Pick<Habit, 'endDate'>, day: string): string =>
  habit.endDate !== undefined && habit.endDate < day ? habit.endDate : day

/** Active habits whose last day is behind them and that wait for an answer, the longest waiting first. */
export const endedHabits = (habits: Habit[], today: string): Habit[] =>
  habits
    .filter((h) => !h.archived && h.kind !== 'quit' && hasEnded(h, today))
    .sort((a, b) => a.endDate!.localeCompare(b.endDate!) || a.order - b.order)

/** How long a habit can be given at once, in months; the form offers these as shortcuts. */
export const EXTEND_MONTHS = [1, 3, 6] as const

/**
 * The new last day for "N more months": counted from the old one, so the run stays the
 * planned length, unless that is already behind today (the question waited), then from today.
 */
export function extendedEnd(habit: Pick<Habit, 'endDate'>, months: number, today: string): string {
  const from = habit.endDate !== undefined && habit.endDate >= today ? habit.endDate : today
  return toDateKey(addMonths(fromDateKey(from), months))
}

/** The last day counted from today, for the form's "1 ay / 3 ay / 6 ay" buttons. */
export const endIn = (months: number, today: string): string => toDateKey(addMonths(fromDateKey(today), months))

/** "bitiş 30 Kasım", "bugün son gün", "bitti (15 Kasım)": the end date as a row reads it. */
export function describeEnd(habit: Pick<Habit, 'endDate'>, today: string): string | undefined {
  const end = habit.endDate
  if (!end) return undefined
  const date = dayLabel(end, today)
  if (end === today) return 'bugün son gün'
  return end < today ? `bitti (${date})` : `bitiş ${date}`
}

/** "30 Kasım", or "1 Şubat 2027" when it is not this year. */
export const dayLabel = (day: string, today: string): string =>
  format(fromDateKey(day), day.slice(0, 4) === today.slice(0, 4) ? 'd MMMM' : 'd MMMM yyyy', { locale: tr })
