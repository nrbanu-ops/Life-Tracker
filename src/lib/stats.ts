import { addDays, addMonths, endOfMonth, startOfMonth } from 'date-fns'
import type { Habit, HabitLog } from '../db/types'
import { fromDateKey, toDateKey, weekdayOf, weekRange } from './date'
import { isCompleted, isExcused, isShownOn } from './today'

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

const createdKey = (habit: Habit) => toDateKey(new Date(habit.createdAt))

function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let d = fromDateKey(from); toDateKey(d) <= to; d = addDays(d, 1)) days.push(toDateKey(d))
  return days
}

export type Streaks = {
  current: number
  longest: number
  /** daily/weekdays count days; timesPerWeek counts weeks that reached the target. */
  unit: 'day' | 'week'
}

/**
 * Current and longest streak, per CLAUDE.md: only planned days count, skipped and unplanned
 * days neither count nor break it, minimum keeps it, and an unmarked today doesn't break it.
 */
export function streaks(habit: Habit, logs: HabitLog[], today: string): Streaks {
  const weekly = habit.frequency.type === 'timesPerWeek'
  if (habit.kind === 'quit') return { current: 0, longest: 0, unit: 'day' }
  const byDate = new Map(logs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l.status]))
  const start = createdKey(habit)
  let run = 0
  let longest = 0

  if (habit.frequency.type === 'timesPerWeek') {
    const { count } = habit.frequency
    for (let week = weekRange(start).start; week <= today; week = toDateKey(addDays(fromDateKey(week), 7))) {
      const { end } = weekRange(week)
      const days = daysBetween(week < start ? start : week, end < today ? end : today)
      const completed = days.filter((d) => isCompleted(byDate.get(d))).length
      // Skipped and frozen days lower what the week can be asked for; a week with nothing left is neutral.
      const available = (week < start ? daysBetween(start, end) : daysBetween(week, end)).filter(
        (d) => !isExcused(byDate.get(d)),
      ).length
      const target = Math.min(count, available)
      const running = end >= today
      if (target === 0) continue
      if (completed >= target) {
        run++
        longest = Math.max(longest, run)
      } else if (!running) {
        run = 0
      }
    }
  } else {
    for (const day of daysBetween(start, today)) {
      if (!isShownOn(habit, day)) continue
      const status = byDate.get(day)
      // A freeze protects the streak exactly as a skip does; that is the whole point of it.
      if (isExcused(status)) continue
      if (isCompleted(status)) {
        run++
        longest = Math.max(longest, run)
      } else if (day !== today) {
        run = 0
      }
    }
  }
  return { current: run, longest, unit: weekly ? 'week' : 'day' }
}

/** One heatmap cell: how the day went for the habit. */
export type DayState = 'done' | 'minimum' | 'partial' | 'skipped' | 'frozen' | 'missed' | 'open' | 'none'

/**
 * done/minimum/partial/skipped come from the log. missed: planned and past, nothing done.
 * open: could still be done (today, or a timesPerWeek day). none: before the habit or not planned.
 */
export function dayStates(habit: Habit, logs: HabitLog[], from: string, to: string, today: string) {
  const byDate = new Map(logs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l.status]))
  const created = createdKey(habit)
  const states = new Map<string, DayState>()
  for (const day of daysBetween(from, to)) {
    const status = byDate.get(day)
    if (status) states.set(day, status)
    else if (day < created || day > today || !isShownOn(habit, day)) states.set(day, 'none')
    else if (day === today || habit.frequency.type === 'timesPerWeek') states.set(day, 'open')
    else states.set(day, 'missed')
  }
  return states
}

export type WeekdayRate = { weekday: number; done: number; planned: number; rate?: number }

/** Success per weekday (1 = Monday): planned days per the same rules as successRate. */
export function weekdayRates(habit: Habit, logs: HabitLog[], from: string, to: string, today: string): WeekdayRate[] {
  const byDate = new Map(logs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l.status]))
  const created = createdKey(habit)
  const rates = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, done: 0, planned: 0 }))
  if (habit.kind !== 'quit') {
    for (const day of daysBetween(from > created ? from : created, to)) {
      if (!isShownOn(habit, day)) continue
      const status = byDate.get(day)
      if (status === 'skipped' || (day >= today && !isCompleted(status))) continue
      const slot = rates[weekdayOf(day) - 1]
      slot.planned++
      if (isCompleted(status)) slot.done++
    }
  }
  return rates.map((r) => ({ ...r, rate: r.planned === 0 ? undefined : r.done / r.planned }))
}

export type PeriodRate = { start: string; end: string } & SuccessRate

/** The last `count` ISO weeks ending with this one, oldest first. */
export function weeklyRates(habit: Habit, logs: HabitLog[], today: string, count = 12): PeriodRate[] {
  const thisWeek = weekRange(today).start
  return Array.from({ length: count }, (_, i) => {
    const start = toDateKey(addDays(fromDateKey(thisWeek), -7 * (count - 1 - i)))
    const end = weekRange(start).end
    return { start, end, ...successRate(habit, logs, start, end < today ? end : today, today) }
  })
}

/** The last `count` calendar months ending with this one, oldest first. */
export function monthlyRates(habit: Habit, logs: HabitLog[], today: string, count = 12): PeriodRate[] {
  const thisMonth = startOfMonth(fromDateKey(today))
  return Array.from({ length: count }, (_, i) => {
    const month = addMonths(thisMonth, -(count - 1 - i))
    const start = toDateKey(month)
    const end = toDateKey(endOfMonth(month))
    return { start, end, ...successRate(habit, logs, start, end < today ? end : today, today) }
  })
}

/** All active habits together over a range: summed done / summed planned. */
export function overallRate(habits: Habit[], logs: HabitLog[], from: string, to: string, today: string): SuccessRate {
  let done = 0
  let planned = 0
  for (const habit of habits) {
    if (habit.archived || habit.kind === 'quit') continue
    const r = successRate(habit, logs, from, to, today)
    done += r.done
    planned += r.planned
  }
  return { done, planned, rate: planned === 0 ? undefined : done / planned }
}
