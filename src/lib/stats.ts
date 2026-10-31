import { addDays } from 'date-fns'
import type { Habit, HabitLog } from '../db/types'
import { fromDateKey, toDateKey, weekRange } from './date'
import { isCompleted, isShownOn } from './today'

export type SuccessRate = {
  done: number
  planned: number
  /** done / planned, or undefined when nothing was planned yet. */
  rate?: number
}

/**
 * Completed / planned days between `from` and `to` (inclusive), per the rules in CLAUDE.md:
 * minimum counts as completed, skipped days are left out, days before the habit existed too.
 * Today counts only once completed, so an unmarked morning doesn't drag the rate down.
 * timesPerWeek: each week plans its count (fewer if the range covers only part of it);
 * the running week counts only once its target is met.
 */
export function successRate(
  habit: Habit,
  logs: HabitLog[],
  from: string,
  to: string,
  today: string,
): SuccessRate {
  if (habit.kind === 'quit') return { done: 0, planned: 0 }
  const created = toDateKey(new Date(habit.createdAt))
  const start = from > created ? from : created
  const byDate = new Map(logs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l.status]))

  const days: string[] = []
  for (let d = fromDateKey(start); toDateKey(d) <= to; d = addDays(d, 1)) days.push(toDateKey(d))

  let done = 0
  let planned = 0

  if (habit.frequency.type === 'timesPerWeek') {
    const { count } = habit.frequency
    const weeks = new Map<string, string[]>()
    for (const day of days) {
      const week = weekRange(day).start
      weeks.set(week, [...(weeks.get(week) ?? []), day])
    }
    for (const [week, weekDays] of weeks) {
      const target = Math.min(count, weekDays.length)
      const completed = weekDays.filter((d) => isCompleted(byDate.get(d))).length
      const running = weekRange(week).end > today
      if (running && completed < target) continue
      planned += target
      done += Math.min(completed, target)
    }
  } else {
    for (const day of days) {
      if (!isShownOn(habit, day)) continue
      const status = byDate.get(day)
      if (status === 'skipped') continue
      if (day >= today && !isCompleted(status)) continue
      planned++
      if (isCompleted(status)) done++
    }
  }

  return { done, planned, rate: planned === 0 ? undefined : done / planned }
}

/** The last `days` days ending today, as [from, to] day keys. */
export function lastDays(today: string, days: number): [string, string] {
  return [toDateKey(addDays(fromDateKey(today), -(days - 1))), today]
}
