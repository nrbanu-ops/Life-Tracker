import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db/db'
import { completeHabit, continueHabit } from '../db/habits'
import { dayLabel, endedHabits, EXTEND_MONTHS, extendedEnd } from '../lib/habitEnd'
import { HabitChain } from './HabitChain'

/**
 * A habit that ran until a set day has reached it: shows how it went and asks whether to go
 * on (for a few more months, or with no end) or to call it done, which archives it. One habit
 * at a time, the longest waiting first. There is no "later": until it is answered the habit
 * is not planned, so leaving it open would quietly drop it.
 */
export function HabitEndCard({ today }: { today: string }) {
  const habits = useLiveQuery(() => db.habits.toArray(), [], [])
  const ended = endedHabits(habits, today)
  const habit = ended[0]
  const logs = useLiveQuery(
    () => (habit ? db.habitLogs.where('habitId').equals(habit.id).toArray() : []),
    [habit?.id],
  )
  const color = useLiveQuery(
    async () => (habit?.projectId ? (await db.projects.get(habit.projectId))?.color : undefined),
    [habit?.projectId],
  )
  // Which habit the "go on" choices are open for, so they close when the next one comes up.
  const [choosing, setChoosing] = useState<string>()

  if (!habit || logs === undefined) return null
  const option = 'whitespace-nowrap rounded-full border border-border px-3 py-2.5 text-sm'

  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">🏁 {habit.title}: süre doldu</h2>
      <p className="text-sm text-muted">Son günü {dayLabel(habit.endDate!, today)} idi.</p>

      <HabitChain habit={habit} logs={logs} today={today} color={color} />

      {habit.why && <p className="mt-3 text-sm text-muted">Neden başlamıştın: {habit.why}</p>}

      {choosing === habit.id ? (
        <div className="mt-3">
          <p className="mb-2 text-sm">Ne kadar daha?</p>
          <div className="grid grid-cols-2 gap-2">
            {EXTEND_MONTHS.map((n) => (
              <button key={n} type="button" onClick={() => continueHabit(habit.id, extendedEnd(habit, n, today))} className={option}>
                {n} ay daha
              </button>
            ))}
            <button type="button" onClick={() => continueHabit(habit.id, undefined)} className={option}>
              Süresiz
            </button>
          </div>
          <button type="button" onClick={() => setChoosing(undefined)} className="tap-text text-sm text-muted">
            Vazgeç
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="mb-2 text-sm">Devam edelim mi, yoksa tamamlandı mı?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => completeHabit(habit.id)}
              className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-surface"
            >
              Tamamlandı ✓
            </button>
            <button type="button" onClick={() => setChoosing(habit.id)} className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm">
              Devam et
            </button>
          </div>
        </div>
      )}

      {ended.length > 1 && (
        <p className="mt-3 text-xs text-muted">Sırada {ended.length - 1} habit daha var; bunu cevaplayınca gelir.</p>
      )}
    </section>
  )
}
