import { addDays, differenceInCalendarDays, endOfMonth, endOfYear, startOfMonth, startOfYear } from 'date-fns'
import type { Habit, HabitFrequency } from '../db/types'
import { fromDateKey, toDateKey, weekRange } from './date'

/** Index 0 = Monday (1) … 6 = Sunday (7). */
export const WEEKDAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const WEEKDAYS = [1, 2, 3, 4, 5]
const WEEKEND = [6, 7]

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && a.every((d) => b.includes(d))

/** The stretch a "so many times" goal is counted over; always a calendar one. */
export type GoalPeriod = 'week' | 'month' | 'year'

export type PeriodGoal = { period: GoalPeriod; count: number }

export const GOAL_PERIODS: GoalPeriod[] = ['week', 'month', 'year']

/** "Haftada 3 kez" */
export const PERIOD_EVERY: Record<GoalPeriod, string> = { week: 'Haftada', month: 'Ayda', year: 'Yılda' }
/** "Bu ay 1/2" */
export const PERIOD_THIS: Record<GoalPeriod, string> = { week: 'Bu hafta', month: 'Bu ay', year: 'Bu yıl' }
/** "3 ay" as a streak, and the name of the stretch itself. */
export const PERIOD_NAME: Record<GoalPeriod, string> = { week: 'hafta', month: 'ay', year: 'yıl' }
/** "aylık hedef" */
export const PERIOD_ADJECTIVE: Record<GoalPeriod, string> = { week: 'haftalık', month: 'aylık', year: 'yıllık' }
/** The most that can be asked for in one period. */
export const PERIOD_MAX: Record<GoalPeriod, number> = { week: 7, month: 30, year: 99 }

/**
 * "X times a week / month / year" as one shape, so the rules are written once for all three.
 * Undefined for habits planned on set days (every day, chosen weekdays).
 */
export function periodGoal(frequency: HabitFrequency): PeriodGoal | undefined {
  switch (frequency.type) {
    case 'timesPerWeek':
      return { period: 'week', count: frequency.count }
    case 'timesPerMonth':
      return { period: 'month', count: frequency.count }
    case 'timesPerYear':
      return { period: 'year', count: frequency.count }
    default:
      return undefined
  }
}

export function frequencyOf(period: GoalPeriod, count: number): HabitFrequency {
  if (period === 'week') return { type: 'timesPerWeek', count }
  return period === 'month' ? { type: 'timesPerMonth', count } : { type: 'timesPerYear', count }
}

type WithFrequency = Pick<Habit, 'frequency'>

/** Counted over a period instead of planned day by day. */
export const isPeriodGoal = (habit: WithFrequency): boolean => periodGoal(habit.frequency) !== undefined

/** Planned day by day (every day, set weekdays): a day it is not done on is a day missed. */
export const isPlannedDaily = (habit: WithFrequency): boolean =>
  habit.frequency.type === 'daily' || habit.frequency.type === 'weekdays'

/** The gap of an "every N months" habit, in months. */
export const intervalOf = (frequency: HabitFrequency): number | undefined =>
  frequency.type === 'everyMonths' ? Math.max(1, frequency.months) : undefined

/** An "every N months" habit can be asked for between these. One month is "Ayda 1". */
export const INTERVAL_MIN = 2
export const INTERVAL_MAX = 24

/**
 * A monthly or yearly goal, or something done every few months. Unlike a weekly goal it is
 * not part of any single day: most days pass without it, so it stays out of whatever judges
 * a day (the ring, perfect days, quests).
 */
export const isLongGoal = (habit: WithFrequency): boolean => {
  const goal = periodGoal(habit.frequency)
  return goal ? goal.period !== 'week' : habit.frequency.type === 'everyMonths'
}

/** What a streak is counted in: days, calendar periods, or times in a row for "every N months". */
export type StreakUnit = 'day' | GoalPeriod | 'time'

/** "12 gün", "3 hafta", "2 kez" */
export const STREAK_UNIT: Record<StreakUnit, string> = { day: 'gün', ...PERIOD_NAME, time: 'kez' }

/** First and last day of the week (Monday–Sunday), month or year containing `key`. */
export function periodRange(period: GoalPeriod, key: string): { start: string; end: string } {
  if (period === 'week') return weekRange(key)
  const date = fromDateKey(key)
  return period === 'month'
    ? { start: toDateKey(startOfMonth(date)), end: toDateKey(endOfMonth(date)) }
    : { start: toDateKey(startOfYear(date)), end: toDateKey(endOfYear(date)) }
}

/** The first day of the period after the one containing `key`. */
export const nextPeriod = (period: GoalPeriod, key: string): string =>
  toDateKey(addDays(fromDateKey(periodRange(period, key).end), 1))

/** Days from `from` through `to`, both included. */
export const dayCount = (from: string, to: string): number =>
  differenceInCalendarDays(fromDateKey(to), fromDateKey(from)) + 1

export function describeFrequency(frequency: HabitFrequency): string {
  const goal = periodGoal(frequency)
  if (goal) return `${PERIOD_EVERY[goal.period]} ${goal.count} kez`
  if (frequency.type === 'everyMonths') return `${intervalOf(frequency)} ayda bir`
  if (frequency.type === 'weekdays') {
    const days = [...frequency.days].sort((a, b) => a - b)
    if (days.length === 7) return 'Her gün'
    if (sameDays(days, WEEKDAYS)) return 'Hafta içi'
    if (sameDays(days, WEEKEND)) return 'Hafta sonu'
    return days.map((d) => WEEKDAY_SHORT[d - 1]).join(', ')
  }
  return 'Her gün'
}
