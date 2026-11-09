import { useState } from 'react'
import { addEntry } from '../db/journal'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { JOURNAL_PHOTO_MAX, JOURNAL_PHOTO_SIZE } from '../lib/journal'
import { saveErrorMessage } from '../lib/saveError'
import { PhotoPicker } from './PhotoPicker'
import { PhotoStrip } from './PhotoStrip'

type Props = {
  date: string
  placeholder?: string
}

const textareaClass =
  'w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent'

/** Free writing for a day, with an optional photo. Ctrl/Cmd+Enter saves too. */
export function JournalComposer({ date, placeholder = 'Bugün nasıldı?' }: Props) {
  const [text, setText] = useState(() => loadDraft(date))
  const [photos, setPhotos] = useState<Blob[]>([])
  const [saving, setSaving] = useState(false)
  // A photo or a voice note is where saving can really fail (a full phone); it must be said out loud.
  const [failed, setFailed] = useState<string>()
  // The day can change under us: at midnight on the Günlük page, where there's no remount.
  const [shownDate, setShownDate] = useState(date)
  if (shownDate !== date) {
    setShownDate(date)
    setText(loadDraft(date))
    setPhotos([])
    setFailed(undefined)
  }
  const canSave = text.trim() !== '' || photos.length > 0
  const full = photos.length >= JOURNAL_PHOTO_MAX

  // Written on every keystroke, not in an effect, so the draft under `date` is never
  // the text of the day before.
  const edit = (next: string) => {
    setText(next)
    saveDraft(date, next)
  }

  const save = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setFailed(undefined)
    try {
      await addEntry(date, text, { photos })
    } catch (error) {
      // Nothing is cleared: the text and the photos stay on screen so the save can be retried.
      setFailed(saveErrorMessage(error))
      setSaving(false)
      return
    }
    clearDraft(date)
    setText('')
    setPhotos([])
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        id="journal-text"
        value={text}
        onChange={(e) => edit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            save()
          }
        }}
        placeholder={placeholder}
        aria-label="Günlük yazısı"
        rows={3}
        maxLength={5000}
        className={textareaClass}
      />
      <PhotoStrip photos={photos} onRemove={(i) => setPhotos((all) => all.filter((_, n) => n !== i))} />
      {full && <p className="text-xs text-muted">En fazla {JOURNAL_PHOTO_MAX} fotoğraf.</p>}
      {failed && <p className="text-sm text-p1">{failed}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {!full && (
          <PhotoPicker
            label={photos.length > 0 ? '📷 Fotoğraf ekle' : '📷 Fotoğraf'}
            maxSize={JOURNAL_PHOTO_SIZE}
            multiple
            // Several can arrive one after another; the cap holds across all of them.
            onPick={(photo) => setPhotos((all) => (all.length >= JOURNAL_PHOTO_MAX ? all : [...all, photo]))}
          />
        )}
        {canSave && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="ml-auto rounded-full bg-accent px-5 py-2 text-sm font-medium text-surface disabled:opacity-40"
          >
            Kaydet
          </button>
        )}
      </div>
    </div>
  )
}
