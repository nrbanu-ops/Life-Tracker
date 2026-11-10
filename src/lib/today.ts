import type { LogEntry } from '../db/logs'
import type { DayPart, Habit, HabitLog, HabitLogStatus } from '../db/types'
import { incrementOf } from './amount'
import { toDateKey, weekRange, weekdayOf } from './date'

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
  // timesPerWeek habits can be done on any day, so they show every day.
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
  /** Only for timesPerWeek: completed days this week, today included. */
  weekCount?: number
  /** False when skipped, or when a timesPerWeek target is already met and today is not completed. */
  countsToday: boolean
}

/**
 * Builds today's list from active habits and this week's logs.
 * `weekLogs` may contain other days; only the week of `today` is used.
 */
export function buildToday(habits: Habit[], weekLogs: HabitLog[], today: string): TodayItem[] {
  const { start, end } = weekRange(today)
  return habits
    // Quit habits have their own counter cards instead of daily check-ins.
    .filter((habit) => !habit.archived && habit.kind !== 'quit' && isShownOn(habit, today))
    .map((habit) => {
      const logs = weekLogs.filter(
        (log) => log.habitId === habit.id && log.date >= start && log.date <= end,
      )
      const todayLog = logs.find((log) => log.date === today)
      const base = { habit, status: todayLog?.status, value: todayLog?.value }
      if (isExcused(base.status)) return { ...base, countsToday: false }
      if (habit.frequency.type !== 'timesPerWeek') return { ...base, countsToday: true }
      const weekCount = logs.filter((log) => isCompleted(log.status)).length
      const targetMet = weekCount >= habit.frequency.count
      return { ...base, weekCount, countsToday: isCompleted(base.status) || !targetMet }
    })
}

/** "Haftada X kez" habits are weekly goals; everything else (every day, set weekdays) is daily. */
export const isWeeklyGoal = (habit: Habit): boolean => habit.frequency.type === 'timesPerWeek'

/** Weekly goals whose target this week is already reached, out of all weekly goals shown. */
export function weekProgress(items: TodayItem[]): { done: number; total: number } {
  const weekly = items.filter((item) => item.habit.frequency.type === 'timesPerWeek')
  const done = weekly.filter(
    (item) => item.habit.frequency.type === 'timesPerWeek' && (item.weekCount ?? 0) >= item.habit.frequency.count,
  ).length
  return { done, total: weekly.length }
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
