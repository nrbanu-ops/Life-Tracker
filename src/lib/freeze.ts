import { addDays } from 'date-fns'
import type { Habit, HabitLog } from '../db/types'
import { fromDateKey, toDateKey } from './date'
import { isPeriodGoal } from './frequency'
import { isCompleted, isExcused, isShownOn } from './today'

/** Freezes a month gives. Two covers illness or a trip; more and it stops meaning anything. */
export const FREEZE_PER_MONTH = 2

/** Under this there is not much of a streak to save yet, so nothing is offered. */
export const FREEZE_MIN_STREAK = 3

/** How far back a missed day is still worth offering a freeze for. */
export const FREEZE_WINDOW_DAYS = 7

const prev = (day: string): string => toDateKey(addDays(fromDateKey(day), -1))

/** The 'YYYY-MM' a day key belongs to. Freezes are counted per calendar month. */
export const monthOf = (day: string): string => day.slice(0, 7)

/** Freezes already spent in that day's month, across every habit. */
export const freezesUsed = (logs: HabitLog[], day: string): number =>
  logs.filter((log) => log.status === 'frozen' && monthOf(log.date) === monthOf(day)).length

export const freezesLeft = (logs: HabitLog[], day: string): number =>
  Math.max(0, FREEZE_PER_MONTH - freezesUsed(logs, day))

export type FreezeOffer = {
  habit: Habit
  /** The missed day a freeze would hold. */
  date: string
  /** The run of completed days right before it — what is about to be lost. */
  streak: number
}

/**
 * The one day per habit a freeze would actually buy back: the most recent planned day that
 * was missed. Anything missed before that is already gone, so when the run up to the day is
 * short — or the day is older than the window — nothing is offered. Weekly, monthly and yearly
 * goals are left out: one missed day does not break them.
 */
export function freezeOffers(habits: Habit[], logs: HabitLog[], today: string): FreezeOffer[] {
  const oldest = toDateKey(addDays(fromDateKey(today), -FREEZE_WINDOW_DAYS))
  const offers: FreezeOffer[] = []

  for (const habit of habits) {
    if (habit.archived || habit.kind === 'quit' || isPeriodGoal(habit)) continue
    const byDate = new Map(logs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l.status]))
    const created = toDateKey(new Date(habit.createdAt))

    let miss: string | undefined
    for (let day = prev(today); day >= oldest && day >= created; day = prev(day)) {
      if (!isShownOn(habit, day)) continue
      const status = byDate.get(day)
      if (isCompleted(status) || isExcused(status)) continue
      miss = day
      break
    }
    if (!miss) continue

    // Counted here rather than through `streaks`, which deliberately lets an unmarked *today*
    // pass; the day before a miss gets no such benefit of the doubt.
    let streak = 0
    for (let day = prev(miss); day >= created; day = prev(day)) {
      if (!isShownOn(habit, day)) continue
      const status = byDate.get(day)
      if (isExcused(status)) continue
      if (!isCompleted(status)) break
      streak++
    }
    if (streak < FREEZE_MIN_STREAK) continue
    offers.push({ habit, date: miss, streak })
  }

  return offers.sort((a, b) => b.streak - a.streak || a.habit.order - b.habit.order)
}
