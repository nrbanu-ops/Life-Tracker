import { db, newId } from './db'

/** Adds a free journal entry for a day. Blank text is ignored. */
export async function addEntry(date: string, text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  await db.journal.add({ id: newId(), date, text: trimmed, createdAt: new Date().toISOString() })
}

/** Changes an entry's text; blank text deletes it. */
export async function updateEntry(id: string, text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return deleteEntry(id)
  await db.journal.update(id, { text: trimmed, updatedAt: new Date().toISOString() })
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
