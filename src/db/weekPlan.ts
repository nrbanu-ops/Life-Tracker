import { cleanPriorities } from '../lib/weekPlan'
import { db } from './db'
import type { WeekPlan } from './types'

/** Writes the week's priorities and note; an empty plan is removed instead of stored. */
export async function saveWeekPlan(week: string, texts: string[], note: string): Promise<void> {
  await db.transaction('rw', db.weekPlans, async () => {
    const before = await db.weekPlans.get(week)
    const priorities = cleanPriorities(texts, before)
    const trimmedNote = note.trim()
    if (priorities.length === 0 && trimmedNote === '') {
      if (before) await db.weekPlans.delete(week)
      return
    }
    const plan: WeekPlan = {
      week,
      priorities,
      createdAt: before?.createdAt ?? new Date().toISOString(),
    }
    if (trimmedNote !== '') plan.note = trimmedNote
    if (before) plan.updatedAt = new Date().toISOString()
    await db.weekPlans.put(plan)
  })
}

/** Ticks one priority off, or puts it back. */
export async function setPriorityDone(week: string, index: number, done: boolean): Promise<void> {
  await db.transaction('rw', db.weekPlans, async () => {
    const plan = await db.weekPlans.get(week)
    if (!plan || !plan.priorities[index]) return
    const priorities = plan.priorities.map((p, i) => (i === index ? { ...p, done } : p))
    await db.weekPlans.put({ ...plan, priorities, updatedAt: new Date().toISOString() })
  })
}
