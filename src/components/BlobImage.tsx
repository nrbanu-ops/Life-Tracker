import { useEffect, useRef } from 'react'

/** A stored photo; its object URL lives exactly as long as the blob is shown. */
export function BlobImage({ blob, className, alt = '' }: { blob: Blob; className?: string; alt?: string }) {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    if (ref.current) ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return <img ref={ref} alt={alt} className={className} />
}
