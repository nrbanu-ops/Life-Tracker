import type { SearchData } from '../lib/search'
import { db } from './db'

/**
 * Everything the search looks through. Journal entries and library items are walked one at a
 * time and stripped of their photos and sounds, so searching never pulls a year of blobs into
 * memory.
 */
export async function loadSearchData(): Promise<SearchData> {
  const journal: SearchData['journal'] = []
  await db.journal.each((entry) => {
    if (entry.text.trim()) {
      journal.push({ id: entry.id, date: entry.date, text: entry.text, review: entry.kind === 'review' })
    }
  })
  const library: SearchData['library'] = []
  await db.library.each((item) => {
    library.push({ id: item.id, kind: item.kind, title: item.title, creator: item.creator, review: item.review })
  })
  const [habits, projects, milestones, tasks] = await Promise.all([
    db.habits.orderBy('order').toArray(),
    db.projects.toArray(),
    db.milestones.toArray(),
    db.tasks.toArray(),
  ])
  return {
    habits: habits.map((h) => ({ id: h.id, title: h.title, archived: h.archived })),
    projects: projects.map((p) => ({ id: p.id, title: p.title, description: p.description })),
    milestones: milestones.map((m) => ({ id: m.id, projectId: m.projectId, title: m.title, done: m.done })),
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, date: t.date, done: t.done })),
    journal,
    library,
  }
}
