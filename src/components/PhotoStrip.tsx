import { BlobImage } from './BlobImage'

type Props = {
  photos: Blob[]
  onRemove: (index: number) => void
}

/** The photos waiting on a journal entry, each with an ✕. */
export function PhotoStrip({ photos, onRemove }: Props) {
  if (photos.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((photo, i) => (
        // Blobs have no id and two can be the same picture, so the position is the key.
        <div key={i} className="relative">
          <BlobImage blob={photo} alt={`${i + 1}. fotoğraf`} className="h-24 w-24 rounded-xl object-cover" />
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
    </div>
  )
}
