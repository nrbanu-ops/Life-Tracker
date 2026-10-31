import { format } from 'date-fns'
import type { Habit, JournalEntry } from '../db/types'

type Props = {
  entries: JournalEntry[]
  habitsById: Map<string, Habit>
  onEdit: (entry: JournalEntry) => void
}

/** Entries of one day: free writing and habit notes, tap to edit. */
export function JournalEntryList({ entries, habitsById, onEdit }: Props) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {entries.map((entry) => {
        const habit = entry.habitId ? habitsById.get(entry.habitId) : undefined
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="block w-full px-4 py-3 text-left"
            >
              <span className="mb-1 flex items-center gap-2 text-xs text-muted">
                {entry.habitId && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
                    {habit?.title ?? 'Silinmiş habit'}
                  </span>
                )}
                <span>{format(new Date(entry.createdAt), 'HH:mm')}</span>
              </span>
              <span className="block text-sm whitespace-pre-wrap">{entry.text}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
