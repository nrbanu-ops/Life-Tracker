import { todayKey } from '../lib/date'
import { nextOccurrence } from '../lib/tasks'
import { db, newId } from './db'
import type { Task } from './types'

export type TaskInput = Pick<Task, 'title' | 'date' | 'time' | 'priority' | 'repeat' | 'projectId'>

export async function createTask(input: TaskInput): Promise<string> {
  const task: Task = { ...input, id: newId(), done: false, createdAt: new Date().toISOString() }
  await db.tasks.add(task)
  return task.id
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  // Every key is listed so a cleared field (undefined) is removed by Dexie.
  await db.tasks.update(id, {
    title: input.title,
    date: input.date,
    time: input.time,
    priority: input.priority,
    repeat: input.repeat,
    projectId: input.projectId,
  })
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id)
}

/**
 * Completing a repeating task keeps it as a record and creates the next occurrence;
 * undoing removes that occurrence again if it hasn't been completed itself.
 */
export async function setTaskDone(id: string, done: boolean): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    const task = await db.tasks.get(id)
    if (!task || task.done === done) return

    if (done) {
      let nextId: string | undefined
      if (task.repeat && task.date) {
        nextId = newId()
        await db.tasks.add({
          ...task,
          id: nextId,
          date: nextOccurrence(task.date, task.repeat, todayKey()),
          done: false,
          completedAt: undefined,
          nextId: undefined,
          createdAt: new Date().toISOString(),
        })
      }
      await db.tasks.update(id, { done: true, completedAt: new Date().toISOString(), nextId })
      return
    }

    if (task.nextId) {
      const next = await db.tasks.get(task.nextId)
      if (next && !next.done) await db.tasks.delete(next.id)
    }
    await db.tasks.update(id, { done: false, completedAt: undefined, nextId: undefined })
  })
}
