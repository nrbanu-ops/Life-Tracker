import { freezesLeft, monthOf } from '../lib/freeze'
import { db } from './db'
import { setLog } from './logs'
import type { HabitLog } from './types'

/** Every log in that day's calendar month; day keys sort, so a string range is enough. */
export function monthLogs(day: string): Promise<HabitLog[]> {
  const month = monthOf(day)
  return db.habitLogs.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray()
}

/** Holds a missed day so the streak survives it. Does nothing once the month's freezes are gone. */
export async function freezeDay(habitId: string, date: string): Promise<'ok' | 'none-left'> {
  if (freezesLeft(await monthLogs(date), date) <= 0) return 'none-left'
  await setLog(habitId, date, { status: 'frozen' })
  return 'ok'
}
