import { resolveAchievements, type ImportedPlan } from '../lib/aiPlan'
import { PROJECT_COLORS } from '../lib/projects'
import { db } from './db'
import { createHabit } from './habits'
import { addProjectAchievements } from './projectAchievements'
import { createMilestone, createProject } from './projects'
import { createTask } from './tasks'

/** Which items of each list to import, by index. */
export type PlanSelection = { milestones: boolean[]; habits: boolean[]; tasks: boolean[] }

/**
 * Adds the selected parts of a plan, all or nothing. Without `projectId` a new project
 * is created from the plan; returns the project the items went to. The plan's achievements
 * come along when what they point at is in the project.
 */
export async function importPlan(
  plan: ImportedPlan,
  selection: PlanSelection,
  projectId?: string,
): Promise<string> {
  const tables = [db.projects, db.milestones, db.habits, db.tasks, db.projectAchievements]
  return db.transaction('rw', tables, async () => {
    let id = projectId
    if (!id) {
      // Rotate colors so plans imported one after another are easy to tell apart.
      const count = await db.projects.count()
      id = await createProject({
        title: plan.project?.title ?? 'Yeni proje',
        description: plan.project?.description,
        targetDate: plan.project?.targetDate,
        color: PROJECT_COLORS[count % PROJECT_COLORS.length],
        status: 'active',
      })
    }
    for (const [i, m] of plan.milestones.entries()) {
      if (selection.milestones[i]) await createMilestone(id, m.title, m.dueDate)
    }
    for (const [i, h] of plan.habits.entries()) {
      if (selection.habits[i]) await createHabit({ ...h, projectId: id })
    }
    for (const [i, t] of plan.tasks.entries()) {
      if (selection.tasks[i]) await createTask({ ...t, projectId: id })
    }
    if (plan.achievements.length > 0) {
      const milestones = await db.milestones.where('projectId').equals(id).toArray()
      const habits = await db.habits.where('projectId').equals(id).toArray()
      await addProjectAchievements(id, resolveAchievements(plan.achievements, milestones, habits))
    }
    return id
  })
}
