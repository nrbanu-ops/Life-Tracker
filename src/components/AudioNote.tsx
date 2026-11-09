import { useEffect, useState } from 'react'
import { formatDuration } from '../lib/audio'

type Props = {
  audio: Blob
  /** Its length, when known; older notes may not have it stored. */
  seconds?: number
  /** Shown while writing the entry, so the note can be thrown away before saving. */
  onRemove?: () => void
}

/** A voice note with the browser's own play controls. */
export function AudioNote({ audio, seconds, onRemove }: Props) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const made = URL.createObjectURL(audio)
    setUrl(made)
    return () => URL.revokeObjectURL(made)
  }, [audio])

  return (
    <div className="flex items-center gap-2 rounded-xl bg-bg px-2 py-1.5">
      <span aria-hidden>🎤</span>
      {url && <audio controls preload="metadata" src={url} className="h-8 min-w-0 flex-1" />}
      {seconds !== undefined && (
        <span className="shrink-0 text-xs text-muted tabular-nums">{formatDuration(seconds)}</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Ses notunu kaldır"
          className="shrink-0 rounded-full px-2 py-1 text-sm text-muted"
        >
          ✕
        </button>
      )}
    </div>
  )
}
