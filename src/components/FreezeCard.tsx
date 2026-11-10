import { addDays, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db/db'
import { freezeDay } from '../db/freeze'
import { fromDateKey, toDateKey } from '../lib/date'
import { freezeOffers, freezesLeft } from '../lib/freeze'

/** Far enough back to count any streak worth saving, without reading the whole log every time. */
const LOOKBACK_DAYS = 400

/** At most two at once: this is a nudge, not an inbox. */
const SHOWN = 2

const DISMISSED = 'life-tracker:freeze-dismissed'

const readDismissed = (): string | null => {
  try {
    return localStorage.getItem(DISMISSED)
  } catch {
    return null
  }
}

/**
 * Offers to hold a missed day so a real streak is not lost to one bad day. Only appears when
 * there is something to save and the month still has a freeze left; "Şimdi değil" hides it
 * until tomorrow.
 */
export function FreezeCard({ today }: { today: string }) {
  const [dismissedOn, setDismissedOn] = useState(readDismissed)
  const habits = useLiveQuery(() => db.habits.toArray(), [], [])
  const logs = useLiveQuery(
    () =>
      db.habitLogs
        .where('date')
        .between(toDateKey(addDays(fromDateKey(today), -LOOKBACK_DAYS)), today, true, true)
        .toArray(),
    [today],
  )

  if (dismissedOn === today || logs === undefined) return null
  const left = freezesLeft(logs, today)
  if (left <= 0) return null
  const offers = freezeOffers(habits, logs, today).slice(0, SHOWN)
  if (offers.length === 0) return null

  const yesterday = toDateKey(addDays(fromDateKey(today), -1))
  const when = (date: string) =>
    date === yesterday ? 'dün' : format(fromDateKey(date), 'd MMMM EEEE', { locale: tr })

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, today)
    } catch {
      // Private mode: it just comes back on the next open.
    }
    setDismissedOn(today)
  }

  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium">❄️ Seri koruması</h2>
        <button type="button" onClick={dismiss} className="tap-reach shrink-0 text-sm text-muted">
          Şimdi değil
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-3">
        {offers.map((offer) => (
          <li key={offer.habit.id} className="flex items-center justify-between gap-3">
            <p className="text-sm">
              <b>{offer.habit.title}</b> {when(offer.date)} kaçtı; {offer.streak} günlük serin
              kırılacak.
              {offer.habit.why && <span className="block text-muted">Neden: {offer.habit.why}</span>}
            </p>
            <button
              type="button"
              onClick={() => freezeDay(offer.habit.id, offer.date)}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-surface"
            >
              Koru
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Bu ay {left} hakkın kaldı. Korunan gün seriyi bozmaz ama başarı oranında yapılmadı sayılır.
      </p>
    </section>
  )
}
