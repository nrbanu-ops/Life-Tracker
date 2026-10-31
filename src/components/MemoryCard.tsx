import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../db/db'
import { fromDateKey } from '../lib/date'
import { memoryFor } from '../lib/journal'
import { ENERGY_EMOJI, MOOD_EMOJI } from '../lib/mood'
import { BlobImage } from './BlobImage'

/** "1 yıl önce bugün": what was written on the same day a year (or 6 months, a month, a week) ago. */
export function MemoryCard({ today }: { today: string }) {
  const entries = useLiveQuery(() => db.journal.toArray(), [], [])
  const memory = memoryFor(entries, today)
  const mood = useLiveQuery(() => (memory ? db.moods.get(memory.date) : undefined), [memory?.date])
  if (!memory) return null

  const photo = memory.entries.find((e) => e.photo)?.photo
  const text = memory.entries.find((e) => e.text)?.text

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-medium text-muted">{memory.label}</h2>
      <Link
        to="/gunluk"
        className="flex gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-3"
      >
        {photo && <BlobImage blob={photo} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-xs text-muted">
            {format(fromDateKey(memory.date), 'd MMMM yyyy EEEE', { locale: tr })}
            {mood?.mood && <span>{MOOD_EMOJI[mood.mood]}</span>}
            {mood?.energy && <span>{ENERGY_EMOJI[mood.energy]}</span>}
          </span>
          {text && <span className="mt-1 line-clamp-3 block text-sm whitespace-pre-wrap">{text}</span>}
          {memory.entries.length > 1 && (
            <span className="mt-1 block text-xs text-muted">+{memory.entries.length - 1} yazı daha</span>
          )}
        </span>
      </Link>
    </section>
  )
}
