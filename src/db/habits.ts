import { db, newId } from './db'
import type { Habit } from './types'

export type HabitInput = Pick<
  Habit,
  | 'title'
  | 'kind'
  | 'target'
  | 'unit'
  | 'increment'
  | 'quitStartedAt'
  | 'frequency'
  | 'minimumVersion'
  | 'projectId'
>

export async function createHabit(input: HabitInput): Promise<string> {
  const last = await db.habits.orderBy('order').last()
  const habit: Habit = {
    ...input,
    id: newId(),
    archived: false,
    order: (last?.order ?? -1) + 1,
    createdAt: new Date().toISOString(),
  }
  await db.habits.add(habit)
  return habit.id
}

export async function updateHabit(id: string, input: HabitInput): Promise<void> {
  // Listing every key matters: Dexie deletes a property whose value is undefined,
  // which is how a cleared minimum version or project link gets removed.
  await db.habits.update(id, {
    title: input.title,
    kind: input.kind,
    target: input.target,
    unit: input.unit,
    increment: input.increment,
    quitStartedAt: input.quitStartedAt,
    frequency: input.frequency,
    minimumVersion: input.minimumVersion,
    projectId: input.projectId,
  })
}

/** Quit habit: the user started again. The counter restarts; past runs stay for the record. */
export async function recordRelapse(id: string): Promise<void> {
  const habit = await db.habits.get(id)
  if (!habit) return
  await db.habits.update(id, {
    relapses: [...(habit.relapses ?? []), new Date().toISOString()],
    celebratedMilestone: undefined,
  })
}

export async function markMilestoneCelebrated(id: string, days: number): Promise<void> {
  await db.habits.update(id, { celebratedMilestone: days })
}

/** Removes the habit for good, with its daily records and notes. */
export async function deleteHabit(id: string): Promise<void> {
  await db.transaction('rw', db.habits, db.habitLogs, db.journal, async () => {
    await db.habitLogs.where('habitId').equals(id).delete()
    await db.journal.where('habitId').equals(id).delete()
    await db.habits.delete(id)
  })
}

export async function setHabitArchived(id: string, archived: boolean): Promise<void> {
  await db.habits.update(id, { archived })
}
