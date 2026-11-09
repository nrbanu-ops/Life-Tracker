import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import { deleteEntry, updateEntry } from '../db/journal'
import type { JournalEntry } from '../db/types'
import { fromDateKey } from '../lib/date'
import { supportsRecording } from '../lib/audio'
import { entryPhotos, JOURNAL_PHOTO_MAX, JOURNAL_PHOTO_SIZE } from '../lib/journal'
import { AudioNote } from './AudioNote'
import { AudioRecorder } from './AudioRecorder'
import { BottomSheet } from './BottomSheet'
import { PhotoPicker } from './PhotoPicker'
import { PhotoStrip } from './PhotoStrip'

type Props = {
  entry?: JournalEntry
  /** Shown in the title for habit notes. */
  habitTitle?: string
  onClose: () => void
}

/** Edit or delete one journal entry. */
export function EntrySheet({ entry, habitTitle, onClose }: Props) {
  const title = entry
    ? `${habitTitle ? `${habitTitle} · ` : ''}${format(fromDateKey(entry.date), 'd MMMM', { locale: tr })}`
    : ''
  return (
    <BottomSheet open={entry !== undefined} title={title} onClose={onClose}>
      {entry && <EntryEditor key={entry.id} entry={entry} onClose={onClose} />}
    </BottomSheet>
  )
}

function EntryEditor({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const [text, setText] = useState(entry.text)
  const [photos, setPhotos] = useState(() => entryPhotos(entry))
  const [audio, setAudio] = useState<{ blob: Blob; seconds?: number } | undefined>(() =>
    entry.audio ? { blob: entry.audio, seconds: entry.audioSeconds } : undefined,
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Habit notes are text only.
  const canHavePhoto = !entry.habitId
  const full = photos.length >= JOURNAL_PHOTO_MAX

  return (
    <div className="flex flex-col gap-3">
      <PhotoStrip photos={photos} onRemove={(i) => setPhotos((all) => all.filter((_, n) => n !== i))} />
      {canHavePhoto &&
        (full ? (
          <p className="text-xs text-muted">En fazla {JOURNAL_PHOTO_MAX} fotoğraf.</p>
        ) : (
          <div className="self-start">
            <PhotoPicker
              label="📷 Fotoğraf ekle"
              maxSize={JOURNAL_PHOTO_SIZE}
              multiple
              onPick={(photo) => setPhotos((all) => (all.length >= JOURNAL_PHOTO_MAX ? all : [...all, photo]))}
            />
          </div>
        ))}
      {audio && <AudioNote audio={audio.blob} seconds={audio.seconds} onRemove={() => setAudio(undefined)} />}
      {canHavePhoto && supportsRecording && !audio && (
        <AudioRecorder onRecord={(blob, seconds) => setAudio({ blob, seconds })} />
      )}
      <textarea
        id="entry-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Not"
        rows={6}
        maxLength={5000}
        className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={async () => {
          await updateEntry(entry.id, text, {
            photos,
            audio: audio?.blob ?? null,
            audioSeconds: audio?.seconds,
          })
          onClose()
        }}
        disabled={text.trim() === '' && photos.length === 0 && !audio}
        className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
      >
        Kaydet
      </button>
      {confirmDelete ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              await deleteEntry(entry.id)
              onClose()
            }}
            className="flex-1 rounded-xl bg-bg py-3 text-sm font-medium text-p1"
          >
            Evet, sil
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="flex-1 rounded-xl py-3 text-sm text-muted"
          >
            Vazgeç
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="rounded-xl py-3 text-sm text-muted"
        >
          Notu sil
        </button>
      )}
    </div>
  )
}
