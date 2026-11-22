import { useLiveQuery } from 'dexie-react-hooks'
import { entryPhotos, JOURNAL_PHOTO_MAX } from '../lib/journal'
import { weightPhotos, type WeightPhoto } from '../lib/weight'
import { db } from './db'
import { addEntry, updateEntry } from './journal'
import type { WeightEntry } from './types'

/** Records the day's weight, replacing any earlier one that day; undefined removes it. */
export async function setWeight(date: string, kg: number | undefined): Promise<void> {
  if (kg === undefined) await db.weights.delete(date)
  else await db.weights.put({ date, kg })
}

/** Sets the target weight; undefined clears it. */
export async function setWeightTarget(targetKg: number | undefined): Promise<void> {
  if (targetKg === undefined) await db.weightGoal.delete('current')
  else await db.weightGoal.put({ id: 'current', targetKg })
}

/** All weigh-ins oldest first, and the target; undefined while loading. */
export function useWeights(): { entries: WeightEntry[]; targetKg?: number } | undefined {
  return useLiveQuery(async () => {
    const [entries, goal] = await Promise.all([db.weights.orderBy('date').toArray(), db.weightGoal.get('current')])
    return { entries, targetKg: goal?.targetKg }
  })
}

/**
 * Saves progress photos as that day's journal entry (kind 'weight'), so they show in Günlük too.
 * One entry per day: later photos join it, up to the journal's limit.
 */
export async function addWeightPhotos(date: string, photos: Blob[]): Promise<void> {
  if (photos.length === 0) return
  await db.transaction('rw', db.journal, async () => {
    const existing = await db.journal.where('date').equals(date).filter((e) => e.kind === 'weight').first()
    if (!existing) return addEntry(date, '', { photos: photos.slice(0, JOURNAL_PHOTO_MAX), kind: 'weight' })
    const all = [...entryPhotos(existing), ...photos].slice(0, JOURNAL_PHOTO_MAX)
    await updateEntry(existing.id, existing.text, { photos: all })
  })
}

/** Removes one progress photo; an entry left with nothing in it goes too. */
export async function removeWeightPhoto(entryId: string, index: number): Promise<void> {
  const entry = await db.journal.get(entryId)
  if (!entry) return
  await updateEntry(entryId, entry.text, { photos: entryPhotos(entry).filter((_, i) => i !== index) })
}

/** All progress photos, oldest first; undefined while loading. */
export function useWeightPhotos(): WeightPhoto[] | undefined {
  return useLiveQuery(async () => weightPhotos(await db.journal.filter((e) => e.kind === 'weight').toArray()))
}
