import { db, newId } from './db'
import type { JournalEntry } from './types'

/** Adds a free journal entry for a day: text, a photo, or both. Neither is ignored. */
export async function addEntry(date: string, text: string, photo?: Blob, kind?: JournalEntry['kind']): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed && !photo) return
  const entry: JournalEntry = { id: newId(), date, text: trimmed, createdAt: new Date().toISOString() }
  if (photo) entry.photo = photo
  if (kind) entry.kind = kind
  await db.journal.add(entry)
}

/**
 * Changes an entry's text and, when given, its photo (null removes it). An entry left
 * with neither is deleted.
 */
export async function updateEntry(id: string, text: string, photo?: Blob | null): Promise<void> {
  const trimmed = text.trim()
  const entry = await db.journal.get(id)
  if (!entry) return
  const nextPhoto = photo === undefined ? entry.photo : (photo ?? undefined)
  if (!trimmed && !nextPhoto) return deleteEntry(id)
  await db.journal.update(id, { text: trimmed, photo: nextPhoto, updatedAt: new Date().toISOString() })
}

export async function deleteEntry(id: string): Promise<void> {
  await db.journal.delete(id)
}

/** Sets the single note of a habit on a day; blank text removes it. */
export async function setHabitNote(habitId: string, date: string, text: string): Promise<void> {
  await db.transaction('rw', db.journal, async () => {
    const existing = await db.journal.where({ habitId, date }).first()
    const trimmed = text.trim()
    if (existing) {
      await updateEntry(existing.id, trimmed)
    } else if (trimmed) {
      await db.journal.add({
        id: newId(),
        date,
        habitId,
        text: trimmed,
        createdAt: new Date().toISOString(),
      })
    }
  })
}
