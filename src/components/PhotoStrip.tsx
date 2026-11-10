import { useState } from 'react'
import { BlobImage } from './BlobImage'
import { PhotoViewer } from './PhotoViewer'

type Props = {
  photos: Blob[]
  onRemove: (index: number) => void
}

/** The photos waiting on a journal entry, each with an ✕; tapping one shows it large. */
export function PhotoStrip({ photos, onRemove }: Props) {
  const [viewing, setViewing] = useState<number | null>(null)
  if (photos.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((photo, i) => (
        // Blobs have no id and two can be the same picture, so the position is the key.
        <div key={i} className="relative">
          <button type="button" onClick={() => setViewing(i)} aria-label={`${i + 1}. fotoğrafı büyüt`} className="block">
            <BlobImage blob={photo} alt={`${i + 1}. fotoğraf`} className="h-24 w-24 rounded-xl object-cover" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`${i + 1}. fotoğrafı kaldır`}
            className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
          >
            ✕
          </button>
        </div>
      ))}
      <PhotoViewer
        photos={photos.map((blob) => ({ blob }))}
        index={viewing}
        onIndex={setViewing}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}
