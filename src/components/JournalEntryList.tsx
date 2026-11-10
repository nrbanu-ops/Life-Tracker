import { format } from 'date-fns'
import { useState } from 'react'
import type { Habit, JournalEntry } from '../db/types'
import { entryPhotos } from '../lib/journal'
import { AudioNote } from './AudioNote'
import { BlobImage } from './BlobImage'
import { PhotoViewer } from './PhotoViewer'

type Props = {
  entries: JournalEntry[]
  habitsById: Map<string, Habit>
  onEdit: (entry: JournalEntry) => void
}

/**
 * Entries of one day: free writing, photos, habit notes and weekly reviews. Tapping a row
 * edits it; tapping one of its photos shows that photo on the whole screen instead.
 */
export function JournalEntryList({ entries, habitsById, onEdit }: Props) {
  const [viewing, setViewing] = useState<{ entryId: string; index: number }>()
  // Looked up again on every render, so a photo removed meanwhile is not shown from memory.
  const viewed = viewing && entries.find((e) => e.id === viewing.entryId)

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {entries.map((entry) => {
          const habit = entry.habitId ? habitsById.get(entry.habitId) : undefined
          const photos = entryPhotos(entry)
          const several = photos.length > 1
          return (
            <li key={entry.id} className="relative">
              {/* The edit button lies under the whole row; only the photos are buttons of their own on top of it. */}
              <button
                type="button"
                onClick={() => onEdit(entry)}
                aria-label="Yazıyı düzenle"
                className="absolute inset-0 w-full"
              />
              <div className="pointer-events-none relative px-4 py-3">
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
                {photos.length > 0 && (
                  // Squares in two columns: a row of photos stays one glance, whatever their shape.
                  <span className={several ? 'mb-2 grid grid-cols-2 gap-1' : 'mb-2 block'}>
                    {photos.map((photo, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setViewing({ entryId: entry.id, index: i })}
                        aria-label={several ? `${i + 1}. fotoğrafı büyüt` : 'Fotoğrafı büyüt'}
                        className={`pointer-events-auto block overflow-hidden ${several ? 'rounded-lg' : 'rounded-xl'}`}
                      >
                        <BlobImage
                          blob={photo}
                          alt={several ? `${i + 1}. günlük fotoğrafı` : 'Günlük fotoğrafı'}
                          className={several ? 'aspect-square w-full object-cover' : 'max-h-64 object-cover'}
                        />
                      </button>
                    ))}
                  </span>
                )}
                {entry.text && <span className="block text-sm whitespace-pre-wrap">{entry.text}</span>}
                {/* Its controls must answer too, and must not open the editor. */}
                {entry.audio && (
                  <div className="pointer-events-auto mt-2">
                    <AudioNote audio={entry.audio} seconds={entry.audioSeconds} />
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <PhotoViewer
        photos={viewed ? entryPhotos(viewed).map((blob) => ({ blob })) : []}
        index={viewing && viewed ? viewing.index : null}
        onIndex={(index) => viewing && setViewing({ ...viewing, index })}
        onClose={() => setViewing(undefined)}
      />
    </>
  )
}
