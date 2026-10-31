import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import { deleteEntry, updateEntry } from '../db/journal'
import type { JournalEntry } from '../db/types'
import { fromDateKey } from '../lib/date'
import { BottomSheet } from './BottomSheet'

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
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex flex-col gap-3">
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
          await updateEntry(entry.id, text)
          onClose()
        }}
        disabled={text.trim() === ''}
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
