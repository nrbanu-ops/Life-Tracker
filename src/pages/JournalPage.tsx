import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { EntrySheet } from '../components/EntrySheet'
import { BackIcon } from '../components/icons'
import { JournalComposer } from '../components/JournalComposer'
import { JournalEntryList } from '../components/JournalEntryList'
import { PageHeader } from '../components/PageHeader'
import { db } from '../db/db'
import { fromDateKey } from '../lib/date'
import { filterEntries, groupByDay, searchEntries, type JournalFilter } from '../lib/journal'
import { ENERGY_EMOJI, MOOD_EMOJI } from '../lib/mood'
import { geminiReady, useAiSettings } from '../lib/assistant'
import { hasRecentReview } from '../lib/review'
import { WeeklyReview } from '../components/WeeklyReview'
import { useTodayKey } from '../lib/useTodayKey'

export function JournalPage() {
  const navigate = useNavigate()
  const today = useTodayKey()
  const entries = useLiveQuery(() => db.journal.toArray())
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), [], [])
  const moods = useLiveQuery(() => db.moods.toArray(), [], [])
  const ai = useAiSettings()
  const [filter, setFilter] = useState<JournalFilter>('all')
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string>()
  const moodByDate = new Map(moods.map((m) => [m.date, m]))

  const habitsById = new Map(habits.map((h) => [h.id, h]))
  // Only habits that actually have notes get a filter chip.
  const notedHabitIds = new Set((entries ?? []).flatMap((e) => (e.habitId ? [e.habitId] : [])))
  const chips: { value: JournalFilter; label: string }[] = [
    { value: 'all', label: 'Tümü' },
    { value: 'free', label: 'Serbest' },
    ...habits.filter((h) => notedHabitIds.has(h.id)).map((h) => ({ value: h.id, label: h.title })),
  ]
  const days = entries ? groupByDay(searchEntries(filterEntries(entries, filter), query, habitsById)) : []
  const editing = entries?.find((e) => e.id === editingId)

  return (
    <>
      <PageHeader
        title="Günlük"
        action={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Geri"
            className="-mr-2 rounded-full p-2 text-muted transition-colors hover:text-text"
          >
            <BackIcon width={22} height={22} />
          </button>
        }
      />

      <JournalComposer date={today} />

      {geminiReady(ai) && entries && (
        <WeeklyReview today={today} variant="journal" hasRecent={hasRecentReview(entries, today)} />
      )}

      {(entries?.length ?? 0) > 0 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Günlükte ara"
          aria-label="Günlükte ara"
          className="mt-5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      )}

      {chips.length > 2 && (
        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilter(chip.value)}
              aria-pressed={filter === chip.value}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${
                filter === chip.value ? 'bg-accent font-medium text-surface' : 'bg-surface text-muted'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-6">
        {entries === undefined ? null : days.length === 0 ? (
          <EmptyState
            title={query.trim() ? 'Bulunamadı' : filter === 'all' ? 'Günlüğün boş' : 'Bu filtrede not yok'}
            text={
              query.trim()
                ? `“${query.trim()}” geçen bir yazı yok.`
                : "Günün nasıl geçtiğini yaz ya da bir habit'i işaretlerken not ekle."
            }
          />
        ) : (
          days.map((day) => {
            const mood = moodByDate.get(day.date)
            return (
            <section key={day.date}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
                {day.date === today
                  ? 'Bugün'
                  : format(fromDateKey(day.date), 'd MMMM EEEE', { locale: tr })}
                {(mood?.mood || mood?.energy) && (
                  <span className="font-normal" aria-label="O günün ruh hali ve enerjisi">
                    {mood.mood && MOOD_EMOJI[mood.mood]}
                    {mood.energy && ENERGY_EMOJI[mood.energy]}
                  </span>
                )}
              </h2>
              <JournalEntryList
                entries={day.entries}
                habitsById={habitsById}
                onEdit={(entry) => setEditingId(entry.id)}
              />
            </section>
            )
          })
        )}
      </div>

      <EntrySheet
        entry={editing}
        habitTitle={editing?.habitId ? habitsById.get(editing.habitId)?.title : undefined}
        onClose={() => setEditingId(undefined)}
      />
    </>
  )
}
