import { todayKey } from '../lib/date'
import { db, newId } from './db'
import type { Milestone, Project } from './types'

export type ProjectInput = Pick<Project, 'title' | 'description' | 'color' | 'status' | 'targetDate'>

export async function createProject(input: ProjectInput): Promise<string> {
  const now = new Date().toISOString()
  const project: Project = { ...input, id: newId(), createdAt: now }
  if (input.status === 'done') project.completedAt = now
  await db.projects.add(project)
  return project.id
}

export async function updateProject(id: string, input: ProjectInput): Promise<void> {
  const before = await db.projects.get(id)
  // Every key is listed so a cleared field (undefined) is removed by Dexie.
  await db.projects.update(id, {
    completedAt:
      input.status !== 'done' ? undefined : before?.status === 'done' ? before.completedAt : new Date().toISOString(),
    title: input.title,
    description: input.description,
    color: input.color,
    status: input.status,
    targetDate: input.targetDate,
  })
}

/** Deletes the project, its milestones and achievements; linked habits and tasks are kept, just unlinked. */
export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', [db.projects, db.milestones, db.habits, db.tasks, db.projectAchievements], async () => {
    await db.milestones.where('projectId').equals(id).delete()
    await db.projectAchievements.where('projectId').equals(id).delete()
    await db.habits.where('projectId').equals(id).modify((h) => delete h.projectId)
    await db.tasks.where('projectId').equals(id).modify((t) => delete t.projectId)
    await db.projects.delete(id)
  })
}

export async function createMilestone(
  projectId: string,
  title: string,
  dueDate?: string,
): Promise<string | undefined> {
  const trimmed = title.trim()
  if (!trimmed) return undefined
  const last = await db.milestones.where('[projectId+order]').between([projectId, -Infinity], [projectId, Infinity]).last()
  const milestone: Milestone = {
    id: newId(),
    projectId,
    title: trimmed,
    done: false,
    order: (last?.order ?? -1) + 1,
  }
  if (dueDate) milestone.dueDate = dueDate
  await db.milestones.add(milestone)
  return milestone.id
}

export async function updateMilestone(id: string, title: string, dueDate?: string): Promise<void> {
  await db.milestones.update(id, { title: title.trim(), dueDate })
}

export async function setMilestoneDone(id: string, done: boolean): Promise<void> {
  await db.milestones.update(id, { done, doneAt: done ? todayKey() : undefined })
}

export async function deleteMilestone(id: string): Promise<void> {
  await db.milestones.delete(id)
}

/** Swaps a milestone with its neighbour above (-1) or below (+1). */
export async function moveMilestone(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.milestones, async () => {
    const milestone = await db.milestones.get(id)
    if (!milestone) return
    const siblings = await db.milestones
      .where('[projectId+order]')
      .between([milestone.projectId, -Infinity], [milestone.projectId, Infinity])
      .toArray()
    const index = siblings.findIndex((m) => m.id === id)
    const other = siblings[index + direction]
    if (!other) return
    await db.milestones.update(milestone.id, { order: other.order })
    await db.milestones.update(other.id, { order: milestone.order })
  })
}

/** Links a habit to a project, or unlinks it with `undefined`. */
export async function setHabitProject(habitId: string, projectId: string | undefined): Promise<void> {
  await db.habits.update(habitId, { projectId })
}
