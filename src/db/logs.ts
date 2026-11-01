import { todayKey, weekRange } from '../lib/date'
import { withAmount } from '../lib/today'
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
    // Logging time un-skips the day.
    const status = existing?.status === 'skipped' ? undefined : existing?.status
    await setLog(habitId, date, withAmount(habit, (existing?.value ?? 0) + amount, status))
    return habit
  })
}
