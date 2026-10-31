import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router'
import { db } from '../db/db'
import { groupByDay } from '../lib/journal'
import { EntrySheet } from './EntrySheet'
import { JournalComposer } from './JournalComposer'
import { JournalEntryList } from './JournalEntryList'
import { MoodPicker } from './MoodPicker'

type Props = {
  date: string
  /** Hidden for future days. */
  canWrite: boolean
}

/** A day's journal entries and habit notes, with a box to write more. */
export function DayJournal({ date, canWrite }: Props) {
  const entries = useLiveQuery(() => db.journal.where('date').equals(date).toArray(), [date])
  const habits = useLiveQuery(() => db.habits.toArray(), [], [])
  const [editingId, setEditingId] = useState<string>()

  if (!entries) return null
  const habitsById = new Map(habits.map((h) => [h.id, h]))
  const sorted = groupByDay(entries)[0]?.entries ?? []
  const editing = entries.find((e) => e.id === editingId)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Günlük</h2>
        <Link to="/gunluk" className="rounded-full px-2 py-1 text-sm text-muted">
          Tümü ›
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {canWrite && <MoodPicker date={date} />}
        {sorted.length > 0 && (
          <JournalEntryList
            entries={sorted}
            habitsById={habitsById}
            onEdit={(entry) => setEditingId(entry.id)}
          />
        )}
        {canWrite ? (
          <JournalComposer
            key={date}
            date={date}
            placeholder={sorted.length > 0 ? 'Bir şey daha ekle…' : undefined}
          />
        ) : (
          sorted.length === 0 && <p className="text-sm text-muted">Bu gün henüz gelmedi.</p>
        )}
      </div>
      <EntrySheet
        entry={editing}
        habitTitle={editing?.habitId ? habitsById.get(editing.habitId)?.title : undefined}
        onClose={() => setEditingId(undefined)}
      />
    </section>
  )
}
