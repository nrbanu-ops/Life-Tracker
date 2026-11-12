import type { LogEntry } from '../db/logs'
import type { DayPart, Habit, HabitLog, HabitLogStatus } from '../db/types'
import { incrementOf } from './amount'
import { toDateKey, weekdayOf } from './date'
import { dayCount, intervalOf, isPlannedDaily, periodGoal, periodRange } from './frequency'
import { dueDay, plusMonths } from './interval'

/** done and minimum both count as completed; partial, skipped and frozen do not. */
export const isCompleted = (status: HabitLogStatus | undefined): boolean =>
  status === 'done' || status === 'minimum'

/**
 * Days the habit is not asked to deliver on: skipped on purpose, or held by a streak freeze.
 * Neither breaks a streak. They part ways in the success rate, where only a skip is left out.
 */
export const isExcused = (status: HabitLogStatus | undefined): boolean =>
  status === 'skipped' || status === 'frozen'

/** Whether the habit appears on the given day's list. */
export function isShownOn(habit: Habit, key: string): boolean {
  // Past days from before the habit existed stay empty in the calendar.
  if (key < toDateKey(new Date(habit.createdAt))) return false
  const { frequency } = habit
  if (frequency.type === 'weekdays') return frequency.days.includes(weekdayOf(key))
  // "X times a week / month / year" habits can be done on any day, so they show every day.
  return true
}

/** Check habits' tap cycle: empty → done → minimum → empty, skipping minimum when the habit has none. */
export function nextStatus(
  current: HabitLogStatus | undefined,
  hasMinimum: boolean,
): HabitLogStatus | undefined {
  if (current === undefined) return 'done'
  if (current === 'done' && hasMinimum) return 'minimum'
  return undefined
}

/**
 * Sets a count/duration habit's amount for the day. Reaching the target means done;
 * below it a minimum stays minimum, otherwise it is partial. Zero clears the log.
 */
export function withAmount(
  habit: Habit,
  value: number,
  current?: HabitLogStatus,
): LogEntry | undefined {
  if (value <= 0) return current === 'minimum' ? { status: 'minimum' } : undefined
  if (habit.target !== undefined && value >= habit.target) return { status: 'done', value }
  return { status: current === 'minimum' ? 'minimum' : 'partial', value }
}

/** What one tap on today's row does. */
export function tapResult(habit: Habit, log: Partial<LogEntry> | undefined): LogEntry | undefined {
  // A skipped or frozen day goes back to empty on tap, whatever the kind.
  if (isExcused(log?.status)) return undefined
  if (habit.kind === 'check') {
    const status = nextStatus(log?.status, !!habit.minimumVersion)
    return status && { status }
  }
  return withAmount(habit, (log?.value ?? 0) + incrementOf(habit), log?.status)
}

export type TodayItem = {
  habit: Habit
  status?: HabitLogStatus
  value?: number
  /** Only for "X times a week / month / year": completed days in that period, today included. */
  goalCount?: number
  /** Only for "every N months": the day it is next due, counting today if it was done today. */
  nextDue?: string
  /** Only for "every N months", and only while it is waiting to be done: days past its due day. */
  overdue?: number
  /**
   * False when skipped, when a period goal is already met and today is not completed, or
   * when an "every N months" habit is not due yet.
   */
  countsToday: boolean
}

/**
 * Builds today's list from active habits and their logs. `logs` may contain other days; it
 * has to cover the week of `today`, for a monthly or yearly goal that habit's whole month or
 * year, and for an "every N months" habit everything before (`logsCovering` reads exactly that).
 */
export function buildToday(habits: Habit[], logs: HabitLog[], today: string): TodayItem[] {
  return habits
    // Quit habits have their own counter cards instead of daily check-ins.
    .filter((habit) => !habit.archived && habit.kind !== 'quit' && isShownOn(habit, today))
    .map((habit) => {
      const own = logs.filter((log) => log.habitId === habit.id)
      const todayLog = own.find((log) => log.date === today)
      const base = { habit, status: todayLog?.status, value: todayLog?.value }
      const months = intervalOf(habit.frequency)
      if (months) {
        // Asked for from its due day on, until it is done; then the clock starts again.
        const before = own.filter((log) => log.date < today && isCompleted(log.status)).map((log) => log.date)
        const due = dueDay(habit, before, today)
        const doneToday = isCompleted(base.status)
        const overdue = !doneToday && due <= today ? dayCount(due, today) - 1 : undefined
        return {
          ...base,
          nextDue: doneToday ? plusMonths(today, months) : due,
          overdue,
          countsToday: doneToday || (overdue !== undefined && !isExcused(base.status)),
        }
      }
      if (isExcused(base.status)) return { ...base, countsToday: false }
      const goal = periodGoal(habit.frequency)
      if (!goal) return { ...base, countsToday: true }
      const { start, end } = periodRange(goal.period, today)
      const goalCount = own.filter((log) => log.date >= start && log.date <= end && isCompleted(log.status)).length
      return { ...base, goalCount, countsToday: isCompleted(base.status) || goalCount < goal.count }
    })
}

/** "Haftada X kez" habits are weekly goals; every day and set weekdays are daily. */
export const isWeeklyGoal = (habit: Habit): boolean => habit.frequency.type === 'timesPerWeek'

/** Planned day by day (every day, set weekdays): what the day's ring is about. */
export const isDailyGoal = (habit: Habit): boolean => isPlannedDaily(habit)

/**
 * Goals with nothing left to ask, out of all the non-daily goals given: a period goal whose
 * target is reached, an "every N months" habit that is done or not due yet.
 */
export function goalProgress(items: TodayItem[]): { done: number; total: number } {
  const goals = items.flatMap((item) => {
    const goal = periodGoal(item.habit.frequency)
    if (goal) return [(item.goalCount ?? 0) >= goal.count]
    return item.nextDue ? [item.overdue === undefined] : []
  })
  return { done: goals.filter(Boolean).length, total: goals.length }
}

/** Completed / counted items for the day ring; minimum counts as completed. */
export function dayProgress(items: TodayItem[]): { done: number; total: number } {
  const counted = items.filter((item) => item.countsToday)
  return { done: counted.filter((item) => isCompleted(item.status)).length, total: counted.length }
}

/** Today's list split for the "hide completed" switch: still to do, and already finished. */
export function splitDone(items: TodayItem[]): { open: TodayItem[]; done: TodayItem[] } {
  return {
    open: items.filter((item) => !isCompleted(item.status)),
    done: items.filter((item) => isCompleted(item.status)),
  }
}

/** At most this many habits can be keystones; more than a handful is not a focus. */
export const FOCUS_MAX = 3

/** Today's list split for focus mode: the keystone habits, and everything else. */
export function splitFocus(items: TodayItem[]): { focus: TodayItem[]; rest: TodayItem[] } {
  return {
    focus: items.filter((item) => item.habit.focus),
    rest: items.filter((item) => !item.habit.focus),
  }
}

export const DAY_PARTS: DayPart[] = ['morning', 'day', 'evening']

export const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: 'Sabah',
  day: 'Gün içi',
  evening: 'Akşam',
}

/** Which part of the day an hour (0–23) falls in. */
export function partOfDay(hour: number): DayPart {
  if (hour < 12) return 'morning'
  return hour < 18 ? 'day' : 'evening'
}

/**
 * Today's list in the order it can be acted on: what belongs to this part of the day first,
 * then the habits with no set time (they can be done now too), then what comes later today,
 * and last what already had its moment. Within each of those the list keeps its own order.
 */
export function sortByDayPart(items: TodayItem[], now: DayPart): TodayItem[] {
  const current = DAY_PARTS.indexOf(now)
  const rank = (item: TodayItem): number => {
    const { when } = item.habit
    if (!when) return 1
    const at = DAY_PARTS.indexOf(when)
    if (at === current) return 0
    return at > current ? 2 + (at - current) : 10 + at
  }
  // Array.prototype.sort is stable, so equal ranks stay as they were.
  return [...items].sort((a, b) => rank(a) - rank(b))
}
