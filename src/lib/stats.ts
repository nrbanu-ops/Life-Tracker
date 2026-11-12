import { addDays, addMonths, endOfMonth, startOfMonth } from 'date-fns'
import type { Habit, HabitLog } from '../db/types'
import { fromDateKey, toDateKey, weekdayOf, weekRange } from './date'
import { dayCount, intervalOf, isPlannedDaily, nextPeriod, periodGoal, periodRange, type StreakUnit } from './frequency'
import { intervalCycles } from './interval'
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
 * timesPerMonth / timesPerYear: a period is judged once, on a single day — the day its target
 * was reached, or its last day when it never was — and counts in the range that holds that
 * day. So a week or a 30-day window is not charged with a goal that had the whole year to
 * happen. `logs` must reach back to the start of the period `from` falls in.
 * everyMonths: each turn is judged on one day too — the day it was done, or each deadline (a
 * whole interval past its due day) that went by without it. `logs` must hold all of the habit's.
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

  const goal = periodGoal(habit.frequency)
  if (intervalOf(habit.frequency)) {
    for (const cycle of intervalCycles(habit, completedDays(habit, logs), today)) {
      const inRange = (day: string) => day >= from && day <= to
      planned += cycle.missed.filter(inRange).length
      if (cycle.doneOn && inRange(cycle.doneOn)) {
        planned++
        done++
      }
    }
  } else if (goal && goal.period !== 'week') {
    const own = logs.filter((l) => l.habitId === habit.id).sort((a, b) => a.date.localeCompare(b.date))
    const earliest = from > created ? from : created
    for (let p = periodRange(goal.period, earliest).start; p <= to; p = nextPeriod(goal.period, p)) {
      const { end } = periodRange(goal.period, p)
      const first = p < created ? created : p
      const inPeriod = own.filter((l) => l.date >= first && l.date <= end)
      const completed = inPeriod.filter((l) => isCompleted(l.status)).map((l) => l.date)
      const target = Math.min(goal.count, dayCount(first, end) - inPeriod.filter((l) => l.status === 'skipped').length)
      if (target <= 0) continue
      const judged = completed[target - 1] ?? (end < today ? end : undefined)
      if (!judged || judged < from || judged > to) continue
      planned += target
      done += Math.min(completed.length, target)
    }
  } else if (habit.frequency.type === 'timesPerWeek') {
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

/** The days the habit was done (done or minimum). */
const completedDays = (habit: Habit, logs: HabitLog[]): string[] =>
  logs.filter((l) => l.habitId === habit.id && isCompleted(l.status)).map((l) => l.date)

function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let d = fromDateKey(from); toDateKey(d) <= to; d = addDays(d, 1)) days.push(toDateKey(d))
  return days
}

export type Streaks = {
  current: number
  longest: number
  /**
   * daily/weekdays count days; period goals count the weeks, months or years that reached the
   * target; "every N months" counts the times in a row it was done before a deadline passed.
   */
  unit: StreakUnit
}

/**
 * Current and longest streak, per CLAUDE.md: only planned days count, skipped and unplanned
 * days neither count nor break it, minimum keeps it, and an unmarked today doesn't break it.
 */
export function streaks(habit: Habit, logs: HabitLog[], today: string): Streaks {
  if (habit.kind === 'quit') return { current: 0, longest: 0, unit: 'day' }
  const own = logs.filter((l) => l.habitId === habit.id)
  const byDate = new Map(own.map((l) => [l.date, l.status]))
  const start = createdKey(habit)
  const goal = periodGoal(habit.frequency)
  let run = 0
  let longest = 0

  if (intervalOf(habit.frequency)) {
    for (const cycle of intervalCycles(habit, completedDays(habit, logs), today)) {
      // A deadline that went by ends the run; doing it afterwards starts a new one.
      if (cycle.missed.length > 0) run = 0
      if (cycle.doneOn) run++
      longest = Math.max(longest, run)
    }
    return { current: run, longest, unit: 'time' }
  }
  if (goal) {
    for (let p = periodRange(goal.period, start).start; p <= today; p = nextPeriod(goal.period, p)) {
      const { end } = periodRange(goal.period, p)
      const first = p < start ? start : p
      const inPeriod = own.filter((l) => l.date >= first && l.date <= end)
      const completed = inPeriod.filter((l) => l.date <= today && isCompleted(l.status)).length
      // Skipped and frozen days lower what the period can be asked for; one with nothing left is neutral.
      const available = dayCount(first, end) - inPeriod.filter((l) => isExcused(l.status)).length
      const target = Math.min(goal.count, available)
      const running = end >= today
      if (target <= 0) continue
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
  return { current: run, longest, unit: goal?.period ?? 'day' }
}

/** One heatmap cell: how the day went for the habit. */
export type DayState = 'done' | 'minimum' | 'partial' | 'skipped' | 'frozen' | 'missed' | 'open' | 'none'

/**
 * done/minimum/partial/skipped come from the log. missed: planned and past, nothing done.
 * open: could still be done (today, or any day of a habit not planned by the day). none: before the habit or not planned.
 */
export function dayStates(habit: Habit, logs: HabitLog[], from: string, to: string, today: string) {
  const byDate = new Map(logs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l.status]))
  const created = createdKey(habit)
  const states = new Map<string, DayState>()
  for (const day of daysBetween(from, to)) {
    const status = byDate.get(day)
    if (status) states.set(day, status)
    else if (day < created || day > today || !isShownOn(habit, day)) states.set(day, 'none')
    else if (day === today || !isPlannedDaily(habit)) states.set(day, 'open')
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
