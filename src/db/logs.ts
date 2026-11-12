import { todayKey, weekRange } from '../lib/date'
import { periodGoal, periodRange } from '../lib/frequency'
import { isExcused, withAmount } from '../lib/today'
import { markXpWeekDirty } from './leveling'
import { db, newId } from './db'
import type { Habit, HabitLog } from './types'

export type LogEntry = Pick<HabitLog, 'status' | 'value'>

/** Sets a habit's log for a day; `undefined` clears it. */
export async function setLog(
  habitId: string,
  date: string,
  entry: LogEntry | undefined,
): Promise<void> {
  const today = todayKey()
  await db.transaction('rw', db.habitLogs, async () => {
    const existing = await db.habitLogs.where({ habitId, date }).first()
    if (!entry) {
      if (existing) await db.habitLogs.delete(existing.id)
      return
    }
    // put replaces the whole record, so a value that no longer applies disappears.
    // loggedAt keeps the day it was first written: marking old days late earns less XP.
    const log: HabitLog = {
      id: existing?.id ?? newId(),
      habitId,
      date,
      status: entry.status,
      loggedAt: existing?.loggedAt ?? today,
    }
    if (entry.value !== undefined) log.value = entry.value
    await db.habitLogs.put(log)
  })
  // A week already frozen in the XP ledger gets worked out again.
  if (date < weekRange(today).start) await markXpWeekDirty(weekRange(date).start)
}

/** Adds to a count/duration habit's amount for a day, e.g. minutes from the timer. */
export async function addAmount(
  habitId: string,
  date: string,
  amount: number,
): Promise<Habit | undefined> {
  // meta too: a day in a frozen week marks that week for the XP ledger.
  return db.transaction('rw', db.habits, db.habitLogs, db.meta, async () => {
    const habit = await db.habits.get(habitId)
    if (!habit) return undefined
    const existing = await db.habitLogs.where({ habitId, date }).first()
    // Logging time un-skips the day, and gives back a freeze that is no longer needed.
    const status = isExcused(existing?.status) ? undefined : existing?.status
    await setLog(habitId, date, withAmount(habit, (existing?.value ?? 0) + amount, status))
    return habit
  })
}

/**
 * The logs between `from` and `to`, plus what the monthly and yearly goals need on top: for
 * those habits alone, the rest of the month or year the range starts and ends in. Their count
 * ("Bu yıl 1/2") and their success rate are about the whole period, and reading a year of
 * every habit's logs for the sake of one of them would be a waste on each tap.
 */
export async function logsCovering(from: string, to: string): Promise<HabitLog[]> {
  const [logs, habits] = await Promise.all([
    db.habitLogs.where('date').between(from, to, true, true).toArray(),
    db.habits.toArray(),
  ])
  const extra = await Promise.all(
    habits.flatMap((habit) => {
      const goal = periodGoal(habit.frequency)
      if (!goal || goal.period === 'week' || habit.kind === 'quit') return []
      const start = periodRange(goal.period, from).start
      const end = periodRange(goal.period, to).end
      const of = (lower: string, upper: string, includeLower: boolean, includeUpper: boolean) =>
        db.habitLogs.where('[habitId+date]').between([habit.id, lower], [habit.id, upper], includeLower, includeUpper).toArray()
      return [...(start < from ? [of(start, from, true, false)] : []), ...(end > to ? [of(to, end, false, true)] : [])]
    }),
  )
  return [...logs, ...extra.flat()]
}

