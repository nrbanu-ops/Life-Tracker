import { useState } from 'react'
import type { LibraryItem } from '../db/types'
import { KIND_EMOJI } from '../lib/library'
import { BlobImage } from './BlobImage'

type Props = {
  item: Pick<LibraryItem, 'kind' | 'title' | 'posterUrl' | 'posterBlob'>
  /** Small tag in the top-right corner, e.g. the book's language. */
  badge?: string
  /** Thumbnail size, e.g. in a calendar cell: tighter corners, no title in the placeholder. */
  compact?: boolean
  className?: string
}

/**
 * 2:3 poster (square for places, whose photos are mostly landscapes); the user's own photo
 * wins over a search poster, with a placeholder underneath.
 */
export function Poster({ item, badge, compact = false, className = '' }: Props) {
  const shape = item.kind === 'place' ? 'aspect-square' : 'aspect-[2/3]'
  return (
    <div
      className={`relative ${shape} overflow-hidden bg-accent-soft ${compact ? 'rounded' : 'rounded-xl'} ${className}`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
        <span className={compact ? 'text-xs' : 'text-2xl'} aria-hidden>
          {KIND_EMOJI[item.kind]}
        </span>
        {!compact && <span className="line-clamp-3 text-xs text-muted">{item.title}</span>}
      </div>
      {/* Keyed so a new picture gets a fresh chance after an earlier one failed. */}
      {item.posterBlob ? (
        <BlobImage blob={item.posterBlob} className={imageClass} />
      ) : (
        item.posterUrl && <PosterImage key={item.posterUrl} src={item.posterUrl} />
      )}
      {badge && (
        <span className="absolute top-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
          {badge}
        </span>
      )}
    </div>
  )
}

const imageClass = 'absolute inset-0 h-full w-full object-cover'

function PosterImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={imageClass}
    />
  )
}
