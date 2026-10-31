import type { LogEntry } from '../db/logs'
import type { Habit, HabitLog, HabitLogStatus } from '../db/types'
import { incrementOf } from './amount'
import { toDateKey, weekRange, weekdayOf } from './date'

/** done and minimum both count as completed; partial and skipped do not. */
export const isCompleted = (status: HabitLogStatus | undefined): boolean =>
  status === 'done' || status === 'minimum'

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
  // A skipped day goes back to empty on tap, whatever the kind.
  if (log?.status === 'skipped') return undefined
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
      if (base.status === 'skipped') return { ...base, countsToday: false }
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
