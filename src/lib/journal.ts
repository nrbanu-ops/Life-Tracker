import type { Habit, JournalEntry } from '../db/types'

/** Journal photos are looked at full width, so they keep more pixels than posters. */
export const JOURNAL_PHOTO_SIZE = 1200

/** Entries whose text (or habit name) contains every word of the query, ignoring case. */
export function searchEntries(entries: JournalEntry[], query: string, habitsById: Map<string, Habit>): JournalEntry[] {
  const words = query.toLocaleLowerCase('tr').split(/\s+/).filter(Boolean)
  if (words.length === 0) return entries
  return entries.filter((e) => {
    const haystack = `${e.text} ${e.habitId ? (habitsById.get(e.habitId)?.title ?? '') : ''}`.toLocaleLowerCase('tr')
    return words.every((w) => haystack.includes(w))
  })
}

/** 'all', 'free' (entries without a habit), or a habit id. */
export type JournalFilter = 'all' | 'free' | (string & {})

export function filterEntries(entries: JournalEntry[], filter: JournalFilter): JournalEntry[] {
  if (filter === 'all') return entries
  if (filter === 'free') return entries.filter((e) => !e.habitId)
  return entries.filter((e) => e.habitId === filter)
}

export type JournalDay = { date: string; entries: JournalEntry[] }

/** Newest day first; within a day, free writing first, then habit notes, each oldest first. */
export function groupByDay(entries: JournalEntry[]): JournalDay[] {
  const byDate = new Map<string, JournalEntry[]>()
  for (const entry of entries) {
    const list = byDate.get(entry.date) ?? []
    list.push(entry)
    byDate.set(entry.date, list)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({
      date,
      entries: list.sort(
        (a, b) => Number(!!a.habitId) - Number(!!b.habitId) || a.createdAt.localeCompare(b.createdAt),
      ),
    }))
}
