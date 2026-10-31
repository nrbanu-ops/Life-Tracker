import { useState } from 'react'
import { addEntry } from '../db/journal'

type Props = {
  date: string
  placeholder?: string
}

const textareaClass =
  'w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent'

/** Free writing for a day. Ctrl/Cmd+Enter saves too. */
export function JournalComposer({ date, placeholder = 'Bugün nasıldı?' }: Props) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    await addEntry(date, text)
    setText('')
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        id="journal-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
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
      {text.trim() !== '' && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="self-end rounded-full bg-accent px-5 py-2 text-sm font-medium text-surface disabled:opacity-40"
        >
          Kaydet
        </button>
      )}
    </div>
  )
}
