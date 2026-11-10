import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { BlobImage } from './BlobImage'

/** A stored photo, or a poster that lives on the web. */
export type ViewerPhoto = { blob?: Blob; url?: string; caption?: string }

type Props = {
  photos: ViewerPhoto[]
  /** The photo on screen; null keeps the viewer closed. */
  index: number | null
  onIndex: (index: number) => void
  onClose: () => void
  /** A button under the photo, e.g. to open the writing it belongs to. */
  action?: { label: string; onClick: (index: number) => void }
}

/** How far one tap zooms in. */
const ZOOM = 2.5

/**
 * A photo on the whole screen. Swipe sideways for the next one, tap the photo to zoom in on
 * that spot (and drag to look around), tap again to zoom out, tap the dark part to close.
 * A native <dialog>, so it also opens above a bottom sheet.
 */
export function PhotoViewer({ photos, index, onIndex, onClose, action }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const zoomBox = useRef<HTMLDivElement>(null)
  /** The photo the track already rests on, so that a swipe is not answered with a jump. */
  const resting = useRef<number | null>(null)
  // The spot that was tapped, as fractions of the screen; tied to its photo, so swiping on resets it.
  const [zoom, setZoom] = useState<{ index: number; fx: number; fy: number } | null>(null)

  const open = index !== null && index < photos.length
  const zoomed = open && zoom?.index === index

  useLayoutEffect(() => {
    const el = dialog.current
    if (!el) return
    if (!open) {
      if (el.open) el.close()
      resting.current = null
      return
    }
    if (!el.open) el.showModal()
    if (track.current && resting.current !== index) {
      track.current.scrollLeft = index * track.current.clientWidth
      resting.current = index
    }
  }, [open, index])

  useLayoutEffect(() => {
    const box = zoomBox.current
    if (!box || !zoom || !zoomed) return
    box.scrollLeft = zoom.fx * box.scrollWidth - box.clientWidth / 2
    box.scrollTop = zoom.fy * box.scrollHeight - box.clientHeight / 2
  }, [zoom, zoomed])

  function go(to: number) {
    if (to >= 0 && to < photos.length) onIndex(to)
  }

  function tapPhoto(e: MouseEvent<HTMLImageElement>) {
    if (index === null) return
    if (zoomed) {
      setZoom(null)
      return
    }
    const img = e.currentTarget
    if (!img.naturalWidth) return
    // The element fills the screen; the picture itself is letterboxed inside it.
    const box = img.getBoundingClientRect()
    const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight)
    const x = e.clientX - box.left
    const y = e.clientY - box.top
    const outside =
      Math.abs(x - box.width / 2) > (img.naturalWidth * scale) / 2 ||
      Math.abs(y - box.height / 2) > (img.naturalHeight * scale) / 2
    if (outside) onClose()
    else setZoom({ index, fx: x / box.width, fy: y / box.height })
  }

  const current = open ? photos[index] : undefined

  return (
    <dialog
      ref={dialog}
      aria-label="Fotoğraf"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onKeyDown={(e) => {
        if (index === null) return
        if (e.key === 'ArrowLeft') go(index - 1)
        if (e.key === 'ArrowRight') go(index + 1)
      }}
      className="photo-viewer fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-black p-0 text-white backdrop:bg-black open:animate-[viewer-in_150ms_ease-out]"
    >
      {open && (
        <>
          <div
            ref={track}
            onScroll={(e) => {
              const el = e.currentTarget
              if (!el.clientWidth) return
              const at = Math.round(el.scrollLeft / el.clientWidth)
              if (at === index || at < 0 || at >= photos.length) return
              resting.current = at
              onIndex(at)
            }}
            className={`flex h-full w-full snap-x snap-mandatory overscroll-contain ${
              zoomed ? 'overflow-hidden' : 'overflow-x-auto overflow-y-hidden'
            }`}
          >
            {photos.map((photo, i) => {
              const here = i === index
              const big = here && zoomed
              const imageProps = {
                alt: photo.caption ?? `${i + 1}. fotoğraf`,
                onClick: tapPhoto,
                draggable: false,
                className: `block max-w-none object-contain select-none ${big ? 'cursor-zoom-out' : 'cursor-zoom-in'}`,
                style: { width: `${big ? ZOOM * 100 : 100}%`, height: `${big ? ZOOM * 100 : 100}%` },
              }
              return (
                // Position is the key: blobs have no id, and two can be the same picture.
                <div key={i} className="h-full w-full shrink-0 snap-center">
                  {/* Only the photo on screen and its neighbours are decoded; a gallery can hold hundreds. */}
                  {Math.abs(i - index) <= 1 && (
                    <div
                      ref={here ? zoomBox : undefined}
                      className={`h-full w-full overscroll-contain ${big ? 'overflow-auto' : 'overflow-hidden'}`}
                    >
                      {photo.blob ? (
                        <BlobImage blob={photo.blob} loading="eager" {...imageProps} />
                      ) : (
                        <img src={photo.url} referrerPolicy="no-referrer" {...imageProps} />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-2 pb-6"
            style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
          >
            <span className="px-2 text-sm tabular-nums">{photos.length > 1 && `${index + 1} / ${photos.length}`}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="pointer-events-auto flex size-11 items-center justify-center rounded-full bg-black/40 text-lg"
            >
              ✕
            </button>
          </div>

          {/* Arrows for a mouse; a finger swipes. */}
          {!zoomed && index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Önceki fotoğraf"
              className="absolute top-1/2 left-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl pointer-fine:flex"
            >
              ‹
            </button>
          )}
          {!zoomed && index < photos.length - 1 && (
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Sonraki fotoğraf"
              className="absolute top-1/2 right-2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl pointer-fine:flex"
            >
              ›
            </button>
          )}

          {!zoomed && (current?.caption || action) && (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pt-8"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              <span className="text-sm">{current?.caption}</span>
              {action && (
                <button
                  type="button"
                  onClick={() => action.onClick(index)}
                  className="pointer-events-auto rounded-full bg-white/15 px-4 py-2.5 text-sm font-medium"
                >
                  {action.label}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </dialog>
  )
}
