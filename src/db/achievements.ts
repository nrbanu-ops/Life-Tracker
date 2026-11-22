import { useLiveQuery } from 'dexie-react-hooks'
import { evaluateAchievements, type Achievement } from '../lib/achievements'
import { useTodayKey } from '../lib/useTodayKey'
import { db } from './db'

/** Every achievement with its progress, kept live; undefined while loading. */
export function useAchievements(): Achievement[] | undefined {
  const today = useTodayKey()
  return useLiveQuery(async () => {
    const [habits, logs, projects, milestones, tasks, journal, library, libraryGoals, projectAchievements, unlocked, weights, weightGoal] =
      await Promise.all([
        db.habits.toArray(),
        db.habitLogs.toArray(),
        db.projects.toArray(),
        db.milestones.toArray(),
        db.tasks.toArray(),
        db.journal.toArray(),
        db.library.toArray(),
        db.libraryGoals.toArray(),
        db.projectAchievements.toArray(),
        db.achievements.toArray(),
        db.weights.toArray(),
        db.weightGoal.get('current'),
      ])
    const data = {
      habits,
      logs,
      projects,
      milestones,
      tasks,
      journal,
      library,
      libraryGoals,
      projectAchievements,
      weights,
      weightTargetKg: weightGoal?.targetKg,
    }
    return evaluateAchievements(data, unlocked, today, new Date())
  }, [today])
}

/** Stores achievements as earned today; once stored they stay earned. */
export async function storeEarned(ids: string[], today: string): Promise<void> {
  await db.achievements.bulkPut(ids.map((id) => ({ id, unlockedAt: today })))
}
