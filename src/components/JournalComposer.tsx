import { useState } from 'react'
import { addEntry } from '../db/journal'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { JOURNAL_PHOTO_SIZE } from '../lib/journal'
import { BlobImage } from './BlobImage'
import { PhotoPicker } from './PhotoPicker'

type Props = {
  date: string
  placeholder?: string
}

const textareaClass =
  'w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent'

/** Free writing for a day, with an optional photo. Ctrl/Cmd+Enter saves too. */
export function JournalComposer({ date, placeholder = 'Bugün nasıldı?' }: Props) {
  const [text, setText] = useState(() => loadDraft(date))
  const [photo, setPhoto] = useState<Blob>()
  const [saving, setSaving] = useState(false)
  // The day can change under us: at midnight on the Günlük page, where there's no remount.
  const [shownDate, setShownDate] = useState(date)
  if (shownDate !== date) {
    setShownDate(date)
    setText(loadDraft(date))
    setPhoto(undefined)
  }
  const canSave = text.trim() !== '' || photo !== undefined

  // Written on every keystroke, not in an effect, so the draft under `date` is never
  // the text of the day before.
  const edit = (next: string) => {
    setText(next)
    saveDraft(date, next)
  }

  const save = async () => {
    if (!canSave || saving) return
    setSaving(true)
    await addEntry(date, text, photo)
    clearDraft(date)
    setText('')
    setPhoto(undefined)
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
      {photo && (
        <div className="relative self-start">
          <BlobImage blob={photo} alt="Eklenecek fotoğraf" className="max-h-40 rounded-xl" />
          <button
            type="button"
            onClick={() => setPhoto(undefined)}
            aria-label="Fotoğrafı kaldır"
            className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <PhotoPicker label={photo ? '📷 Değiştir' : '📷 Fotoğraf'} maxSize={JOURNAL_PHOTO_SIZE} onPick={setPhoto} />
        {canSave && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-surface disabled:opacity-40"
          >
            Kaydet
          </button>
        )}
      </div>
    </div>
  )
}
