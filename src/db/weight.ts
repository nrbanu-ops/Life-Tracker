import { useLiveQuery } from 'dexie-react-hooks'
import type { WeightEntry } from './types'
import { db } from './db'

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
