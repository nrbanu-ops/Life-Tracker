import { entryPhotos } from '../lib/journal'
import { db, newId } from './db'
import type { JournalEntry } from './types'

/** Adds a free journal entry for a day: text, photos, or both. Neither is ignored. */
export async function addEntry(
  date: string,
  text: string,
  photos: Blob[] = [],
  kind?: JournalEntry['kind'],
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed && photos.length === 0) return
  const entry: JournalEntry = { id: newId(), date, text: trimmed, createdAt: new Date().toISOString() }
  if (photos.length > 0) entry.photos = photos
  if (kind) entry.kind = kind
  await db.journal.add(entry)
}

/**
 * Changes an entry's text and, when given, its photos (an empty list removes them all).
 * An entry left with neither is deleted.
 */
export async function updateEntry(id: string, text: string, photos?: Blob[]): Promise<void> {
  const trimmed = text.trim()
  const entry = await db.journal.get(id)
  if (!entry) return
  const next = photos ?? entryPhotos(entry)
  if (!trimmed && next.length === 0) return deleteEntry(id)
  const updated: JournalEntry = { ...entry, text: trimmed, updatedAt: new Date().toISOString() }
  // Written as a whole record so the old single-photo field goes away for good.
  delete updated.photo
  if (next.length > 0) updated.photos = next
  else delete updated.photos
  await db.journal.put(updated)
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
