import { useEffect, useRef } from 'react'

/** A stored photo; its object URL lives exactly as long as the blob is shown. */
export function BlobImage({ blob, className, alt = '' }: { blob: Blob; className?: string; alt?: string }) {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    if (ref.current) ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])
  // Decoding is what costs memory, not the blob itself: a screenful of photos is decoded,
  // the rest only when scrolled to. Without this a day of ten photos per entry can take a
  // phone's whole budget and leave a blank screen.
  return <img ref={ref} alt={alt} className={className} loading="lazy" decoding="async" />
}
