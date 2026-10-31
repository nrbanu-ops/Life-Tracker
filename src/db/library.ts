import { db, newId } from './db'
import type { LibraryItem, LibraryKind, LibraryStatus } from './types'

/** What the item is: from a search result or typed in by hand. */
export type LibraryInput = Pick<
  LibraryItem,
  'kind' | 'title' | 'creator' | 'year' | 'language' | 'posterUrl' | 'posterBlob' | 'source' | 'externalId'
>

/** The user's own record of it. */
export type LibraryEntry = Pick<LibraryItem, 'page' | 'pageCount' | 'season' | 'episode' | 'rating' | 'review'> & {
  status: LibraryStatus
  /** Day key; only kept while done. */
  finishedAt?: string
}

/** Entry fields as stored; every key present so an update can clear them. */
const entryFields = (entry: LibraryEntry) => ({
  status: entry.status,
  page: entry.page,
  pageCount: entry.pageCount,
  season: entry.season,
  episode: entry.episode,
  rating: entry.rating,
  review: entry.review?.trim() || undefined,
})

/** Fills in the dates a status implies; `previous` is the stored item when editing. */
function datesFor(entry: LibraryEntry, today: string, previous?: LibraryItem) {
  // Only known when the user marks it in progress; an item added as finished has no start day.
  const startedAt = previous?.startedAt ?? (entry.status === 'active' ? today : undefined)
  const finishedAt = entry.status === 'done' ? (entry.finishedAt ?? today) : undefined
  return { startedAt, finishedAt }
}

export async function addLibraryItem(input: LibraryInput, entry: LibraryEntry, today: string): Promise<string> {
  const id = newId()
  await db.library.add({
    ...input,
    id,
    ...entryFields(entry),
    ...datesFor(entry, today),
    createdAt: new Date().toISOString(),
  })
  return id
}

export async function updateLibraryEntry(id: string, entry: LibraryEntry, today: string): Promise<void> {
  const previous = await db.library.get(id)
  if (!previous) return
  // Every key is listed: Dexie deletes a property whose value is undefined, which clears it.
  await db.library.update(id, { ...entryFields(entry), ...datesFor(entry, today, previous) })
}

/** Facts the user can correct; posterBlob undefined removes their own photo. */
export type LibraryDetails = Pick<LibraryItem, 'title' | 'creator' | 'year' | 'language' | 'posterBlob'>

export async function updateLibraryDetails(id: string, details: LibraryDetails): Promise<void> {
  await db.library.update(id, {
    title: details.title,
    creator: details.creator,
    year: details.year,
    language: details.language,
    posterBlob: details.posterBlob,
  })
}

export async function deleteLibraryItem(id: string): Promise<void> {
  await db.library.delete(id)
}

/** Sets the year's goals per kind at once; a missing or zero target removes that goal. */
export async function setLibraryGoals(year: number, targets: Partial<Record<LibraryKind, number>>): Promise<void> {
  await db.transaction('rw', db.libraryGoals, async () => {
    for (const kind of ['book', 'movie', 'series', 'place', 'other'] as const) {
      const id = `${year}-${kind}`
      const target = targets[kind]
      if (target && target > 0) await db.libraryGoals.put({ id, year, kind, target })
      else await db.libraryGoals.delete(id)
    }
  })
}
