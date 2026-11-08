import { format } from 'date-fns'
import type { Habit, JournalEntry } from '../db/types'
import { entryPhotos } from '../lib/journal'
import { BlobImage } from './BlobImage'

type Props = {
  entries: JournalEntry[]
  habitsById: Map<string, Habit>
  onEdit: (entry: JournalEntry) => void
}

/** Entries of one day: free writing, photos, habit notes and weekly reviews; tap to edit. */
export function JournalEntryList({ entries, habitsById, onEdit }: Props) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {entries.map((entry) => {
        const habit = entry.habitId ? habitsById.get(entry.habitId) : undefined
        const photos = entryPhotos(entry)
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="block w-full px-4 py-3 text-left"
            >
              <span className="mb-1 flex items-center gap-2 text-xs text-muted">
                {entry.habitId && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
                    {habit?.title ?? 'Silinmiş habit'}
                  </span>
                )}
                {entry.kind === 'review' && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">✨ Haftalık bakış</span>
                )}
                <span>{format(new Date(entry.createdAt), 'HH:mm')}</span>
              </span>
              {photos.length === 1 && (
                <BlobImage blob={photos[0]} alt="Günlük fotoğrafı" className="mb-2 max-h-64 rounded-xl object-cover" />
              )}
              {photos.length > 1 && (
                // Squares in two columns: a row of photos stays one glance, whatever their shape.
                <span className="mb-2 grid grid-cols-2 gap-1">
                  {photos.map((photo, i) => (
                    <BlobImage
                      key={i}
                      blob={photo}
                      alt={`${i + 1}. günlük fotoğrafı`}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ))}
                </span>
              )}
              {entry.text && <span className="block text-sm whitespace-pre-wrap">{entry.text}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
