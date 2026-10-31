import type { ProjectAchievement } from './types'
import { db, newId } from './db'

type AchievementInput = Omit<ProjectAchievement, 'id' | 'projectId' | 'order'>

/** Adds achievements after the project's existing ones. */
export async function addProjectAchievements(projectId: string, list: AchievementInput[]): Promise<void> {
  const existing = await db.projectAchievements.where('projectId').equals(projectId).count()
  await db.projectAchievements.bulkAdd(
    list.map((a, i) => ({ ...a, id: newId(), projectId, order: existing + i })),
  )
}

/** Replaces the project's AI achievements that aren't earned yet; earned ones are kept. */
export async function replaceProjectAchievements(projectId: string, list: AchievementInput[]): Promise<void> {
  await db.transaction('rw', db.projectAchievements, db.achievements, async () => {
    const earned = new Set((await db.achievements.toArray()).map((a) => a.id))
    await db.projectAchievements
      .where('projectId')
      .equals(projectId)
      .filter((a) => !earned.has(`pa:${a.id}`))
      .delete()
    await addProjectAchievements(projectId, list)
  })
}

const askedKey = (projectId: string) => `achievementsAsked:${projectId}`

/** Whether the AI was already asked for this project's achievements (so it's asked once, not on every visit). */
export async function wasAsked(projectId: string): Promise<boolean> {
  return (await db.meta.get(askedKey(projectId))) !== undefined
}

export async function markAsked(projectId: string): Promise<void> {
  await db.meta.put({ key: askedKey(projectId), value: new Date().toISOString() })
}
