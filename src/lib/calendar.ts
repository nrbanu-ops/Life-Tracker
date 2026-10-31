import { addDays, addMonths, endOfMonth, startOfMonth } from 'date-fns'
import type { Habit, HabitLog } from '../db/types'
import { fromDateKey, toDateKey, weekRange } from './date'
import { buildToday, dayProgress } from './today'

/** First day of the month containing `key`, as a day key. */
export const monthOf = (key: string): string => toDateKey(startOfMonth(fromDateKey(key)))

export const shiftMonth = (month: string, by: number): string =>
  toDateKey(addMonths(fromDateKey(month), by))

/** Full Monday–Sunday weeks covering the month, including days from the neighbouring months. */
export function monthGrid(month: string): string[] {
  const first = fromDateKey(monthOf(month))
  const start = fromDateKey(weekRange(toDateKey(first)).start)
  const end = weekRange(toDateKey(endOfMonth(first))).end
  const days: string[] = []
  for (let day = start; toDateKey(day) <= end; day = addDays(day, 1)) days.push(toDateKey(day))
  return days
}

export type DayStatus = { done: number; total: number }

/** Habit completion for one day, by the same rules as the Today screen. */
export function dayStatus(habits: Habit[], logs: HabitLog[], date: string): DayStatus {
  return dayProgress(buildToday(habits, logs, date))
}
