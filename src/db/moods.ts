import type { Level } from './types'
import { db } from './db'
import type { MoodKey } from '../lib/mood'

/** Sets (or, with undefined, clears) the day's mood or energy; an empty row is removed. */
export async function setDayLevel(date: string, key: MoodKey, value: Level | undefined): Promise<void> {
  await db.transaction('rw', db.moods, async () => {
    const row = { ...((await db.moods.get(date)) ?? { date }), [key]: value }
    if (!row.mood && !row.energy) await db.moods.delete(date)
    else await db.moods.put(row)
  })
}
