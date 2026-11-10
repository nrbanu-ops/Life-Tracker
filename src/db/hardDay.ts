import { useLiveQuery } from 'dexie-react-hooks'
import { hardDaysLeft } from '../lib/hardDay'
import { db } from './db'
import { setLog } from './logs'

export type HardDayState = {
  /** Whether that day is declared hard. */
  on: boolean
  /** How many more the month allows. */
  left: number
}

/** Whether `day` is a hard day and how many the month has left; undefined while loading. */
export function useHardDay(day: string): HardDayState | undefined {
  return useLiveQuery(async () => {
    const days = (await db.hardDays.toArray()).map((d) => d.date)
    return { on: days.includes(day), left: hardDaysLeft(days, day) }
  }, [day])
}

/**
 * Declares the day hard, or takes that back (which hands the month's allowance back too).
 * Turning it on also counts what was already half done: on a day when the minimum is enough,
 * a partial amount has met it.
 */
export async function setHardDay(day: string, on: boolean): Promise<'ok' | 'none-left'> {
  if (!on) {
    await db.hardDays.delete(day)
    return 'ok'
  }
  const days = (await db.hardDays.toArray()).map((d) => d.date)
  if (days.includes(day)) return 'ok'
  if (hardDaysLeft(days, day) <= 0) return 'none-left'
  await db.hardDays.put({ date: day })
  const partial = (await db.habitLogs.where('date').equals(day).toArray()).filter((l) => l.status === 'partial')
  for (const log of partial) await setLog(log.habitId, day, { status: 'minimum', value: log.value })
  return 'ok'
}
