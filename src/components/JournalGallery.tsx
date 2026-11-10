import { format } from 'date-fns'
import { useState } from 'react'
import { tr } from 'date-fns/locale'
import { fromDateKey } from '../lib/date'
import { photosByMonth, type JournalDay } from '../lib/journal'
import { BlobImage } from './BlobImage'
import { EmptyState } from './EmptyState'
import { PhotoViewer } from './PhotoViewer'

type Props = {
  /** Already filtered and sorted, so the gallery follows the search and the chips. */
  days: JournalDay[]
  onOpen: (entryId: string) => void
}

/**
 * Every journal photo as a grid, by month. Tapping one shows it on the whole screen, where
 * swiping goes on through the rest and "Yazıyı aç" opens the writing it belongs to.
 */
export function JournalGallery({ days, onOpen }: Props) {
  const months = photosByMonth(days)
  const all = months.flatMap((m) => m.photos)
  // By id rather than position: the list underneath changes as the search is typed.
  const [viewingId, setViewingId] = useState<string>()
  const viewing = viewingId === undefined ? -1 : all.findIndex((p) => p.id === viewingId)

  if (months.length === 0) {
    return (
      <EmptyState
        title="Fotoğraf yok"
        text="Günlüğe yazarken eklediğin fotoğraflar burada toplanır."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {months.map(({ month, photos }) => (
        <section key={month}>
          <h2 className="mb-2 text-sm font-medium text-muted capitalize">
            {format(fromDateKey(`${month}-01`), 'LLLL yyyy', { locale: tr })}
          </h2>
          <div className="grid grid-cols-3 gap-1">
            {photos.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setViewingId(item.id)}
                // The date is in the label, not on the picture: a grid of badges is noise.
                aria-label={`${format(fromDateKey(item.date), 'd MMMM', { locale: tr })} fotoğrafı`}
                className="aspect-square overflow-hidden rounded-lg bg-surface"
              >
                <BlobImage blob={item.photo} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      ))}
      <PhotoViewer
        photos={all.map((p) => ({ blob: p.photo, caption: format(fromDateKey(p.date), 'd MMMM yyyy', { locale: tr }) }))}
        index={viewing < 0 ? null : viewing}
        onIndex={(i) => setViewingId(all[i]?.id)}
        onClose={() => setViewingId(undefined)}
        action={{
          label: 'Yazıyı aç',
          onClick: (i) => {
            setViewingId(undefined)
            onOpen(all[i].entryId)
          },
        }}
      />
    </div>
  )
}
