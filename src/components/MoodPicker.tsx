import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { setDayLevel } from '../db/moods'
import type { Level } from '../db/types'
import { ENERGY_EMOJI, ENERGY_LABEL, LEVELS, MOOD_EMOJI, MOOD_LABEL, type MoodKey } from '../lib/mood'

const ROWS: { key: MoodKey; title: string; emoji: Record<Level, string>; label: Record<Level, string> }[] = [
  { key: 'mood', title: 'Ruh hali', emoji: MOOD_EMOJI, label: MOOD_LABEL },
  { key: 'energy', title: 'Enerji', emoji: ENERGY_EMOJI, label: ENERGY_LABEL },
]

/** One tap per row for the day's mood and energy; tapping the chosen one again clears it. */
export function MoodPicker({ date }: { date: string }) {
  const day = useLiveQuery(async () => (await db.moods.get(date)) ?? null, [date])
  if (day === undefined) return null

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
      {ROWS.map((row) => {
        const value = day?.[row.key]
        return (
          <div key={row.key} className="flex items-center justify-between gap-2">
            <span className="w-16 shrink-0 text-sm text-muted">{row.title}</span>
            <div className="flex flex-1 justify-between" role="radiogroup" aria-label={row.title}>
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={value === level}
                  aria-label={row.label[level]}
                  title={row.label[level]}
                  onClick={() => setDayLevel(date, row.key, value === level ? undefined : level)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition-all ${
                    value === level
                      ? 'scale-110 bg-accent-soft ring-2 ring-accent'
                      : value
                        ? 'opacity-40 grayscale'
                        : ''
                  }`}
                >
                  {row.emoji[level]}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
