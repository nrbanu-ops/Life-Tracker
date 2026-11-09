import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { fromDateKey } from '../lib/date'
import { photosByMonth, type JournalDay } from '../lib/journal'
import { BlobImage } from './BlobImage'
import { EmptyState } from './EmptyState'

type Props = {
  /** Already filtered and sorted, so the gallery follows the search and the chips. */
  days: JournalDay[]
  onOpen: (entryId: string) => void
}

/** Every journal photo as a grid, by month; tapping one opens the writing it belongs to. */
export function JournalGallery({ days, onOpen }: Props) {
  const months = photosByMonth(days)

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
                onClick={() => onOpen(item.entryId)}
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
    </div>
  )
}
