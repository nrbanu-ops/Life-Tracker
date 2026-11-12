import { addMonths } from 'date-fns'
import type { Habit } from '../db/types'
import { fromDateKey, toDateKey } from './date'
import { intervalOf } from './frequency'

// "Every N months" habits (CLAUDE.md, Hesaplama kuralları). They have no calendar period:
// the clock starts again each time the habit is done.

export const plusMonths = (day: string, months: number): string => toDateKey(addMonths(fromDateKey(day), months))

/** The day the very first one is due: the chosen start, or the day the habit was added. */
export const firstDue = (habit: Habit): string =>
  (habit.frequency.type === 'everyMonths' && habit.frequency.start) || toDateKey(new Date(habit.createdAt))

/**
 * One turn of the habit: the day it came due, the day it was done (absent for the turn still
 * open), and every deadline that went by in between. A deadline is a whole interval after
 * the due day — so being late is not a miss, letting an entire interval pass is.
 */
export type Cycle = { due: string; doneOn?: string; missed: string[] }

/**
 * The habit's history as turns, oldest first; the last one is always the open turn.
 * `completed` are the days it was done (done or minimum), in any order. A deadline counts as
 * missed once it is behind `today`; done on the deadline itself is still in time.
 */
export function intervalCycles(habit: Habit, completed: string[], today: string): Cycle[] {
  const months = intervalOf(habit.frequency) ?? 1
  const cycles: Cycle[] = []
  let due = firstDue(habit)
  const missedBefore = (limit: string): string[] => {
    const missed: string[] = []
    // Counted from the due day each time, so the day of the month does not drift (31 → 28 → 28).
    for (let k = 1, deadline = plusMonths(due, months); deadline < limit; deadline = plusMonths(due, ++k * months)) {
      missed.push(deadline)
    }
    return missed
  }
  for (const doneOn of [...new Set(completed)].sort()) {
    cycles.push({ due, doneOn, missed: missedBefore(doneOn) })
    due = plusMonths(doneOn, months)
  }
  cycles.push({ due, missed: missedBefore(today) })
  return cycles
}

/** The day the habit is next due, going by the days it was done so far. */
export const dueDay = (habit: Habit, completed: string[], today: string): string =>
  intervalCycles(habit, completed, today).at(-1)!.due
