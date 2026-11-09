import { entryPhotos } from '../lib/journal'
import { db, newId } from './db'
import type { JournalEntry } from './types'

/** Everything an entry can hold besides its text. */
export type EntryContent = {
  /** Left out on an update: keep the ones already there. */
  photos?: Blob[]
  /** A spoken note. On an update, null removes the one already there. */
  audio?: Blob | null
  audioSeconds?: number
  kind?: JournalEntry['kind']
}

/** Adds a free journal entry for a day: text, photos, a voice note, or any of them. */
export async function addEntry(date: string, text: string, content: EntryContent = {}): Promise<void> {
  const trimmed = text.trim()
  const photos = content.photos ?? []
  const audio = content.audio ?? undefined
  if (!trimmed && photos.length === 0 && !audio) return
  const entry: JournalEntry = { id: newId(), date, text: trimmed, createdAt: new Date().toISOString() }
  if (photos.length > 0) entry.photos = photos
  if (audio) {
    entry.audio = audio
    if (content.audioSeconds !== undefined) entry.audioSeconds = content.audioSeconds
  }
  if (content.kind) entry.kind = content.kind
  await db.journal.add(entry)
}

/**
 * Changes an entry's text and, where given, its photos (an empty list removes them all) and its
 * voice note (null removes it). An entry left with none of the three is deleted.
 */
export async function updateEntry(id: string, text: string, content: EntryContent = {}): Promise<void> {
  const trimmed = text.trim()
  const entry = await db.journal.get(id)
  if (!entry) return
  const photos = content.photos ?? entryPhotos(entry)
  const audio = content.audio === undefined ? entry.audio : (content.audio ?? undefined)
  if (!trimmed && photos.length === 0 && !audio) return deleteEntry(id)
  const updated: JournalEntry = { ...entry, text: trimmed, updatedAt: new Date().toISOString() }
  // Written as a whole record so the old single-photo field goes away for good.
  delete updated.photo
  if (photos.length > 0) updated.photos = photos
  else delete updated.photos
  if (audio) {
    updated.audio = audio
    const seconds = content.audio === undefined ? entry.audioSeconds : content.audioSeconds
    if (seconds === undefined) delete updated.audioSeconds
    else updated.audioSeconds = seconds
  } else {
    delete updated.audio
    delete updated.audioSeconds
  }
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
