import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import type { LibraryItem } from '../db/types'
import { monthGrid, monthOf, shiftMonth } from '../lib/calendar'
import { fromDateKey } from '../lib/date'
import { WEEKDAY_SHORT } from '../lib/frequency'
import { finishedByDay, KIND_LABEL, monthSummary } from '../lib/library'
import { Poster } from './Poster'
import { StarRating } from './StarRating'

type Props = {
  items: LibraryItem[]
  today: string
  onSelect: (id: string) => void
}

/** Month view of what was finished on which day; only shown inside the library. */
export function LibraryCalendar({ items, today, onSelect }: Props) {
  const [month, setMonth] = useState(() => monthOf(today))
  const [selected, setSelected] = useState(today)

  const days = monthGrid(month)
  const byDay = finishedByDay(items)
  const summary = monthSummary(items, month)
  const selectedItems = byDay.get(selected) ?? []

  const goToMonth = (next: string) => {
    setMonth(next)
    setSelected(monthOf(today) === next ? today : next)
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(shiftMonth(month, -1))}
          aria-label="Önceki ay"
          className="h-10 w-10 rounded-full text-xl text-muted hover:bg-surface"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="font-semibold capitalize">
            {format(fromDateKey(month), 'LLLL yyyy', { locale: tr })}
          </span>
          {month !== monthOf(today) && (
            <button
              type="button"
              onClick={() => goToMonth(monthOf(today))}
              className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent"
            >
              Bugün
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => goToMonth(shiftMonth(month, 1))}
          aria-label="Sonraki ay"
          className="h-10 w-10 rounded-full text-xl text-muted hover:bg-surface"
        >
          ›
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-2">
        <div className="mb-1 grid grid-cols-7 text-center text-xs text-muted">
          {WEEKDAY_SHORT.map((label) => (
            <span key={label} className="py-1">
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const finished = byDay.get(day) ?? []
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                aria-pressed={day === selected}
                aria-label={`${day}${finished.length ? `, ${finished.length} bitirdiğin` : ''}`}
                className={`flex min-h-16 flex-col items-center gap-0.5 rounded-lg p-0.5 ${
                  monthOf(day) === month ? '' : 'opacity-35'
                } ${day === selected ? 'bg-bg' : ''}`}
              >
                <span
                  className={`text-xs tabular-nums ${day === today ? 'font-semibold text-accent' : 'text-muted'}`}
                >
                  {Number(day.slice(8))}
                </span>
                {finished.length > 0 && (
                  <span className="relative w-7">
                    <Poster item={finished[0]} compact />
                    {finished.length > 1 && (
                      <span className="absolute -right-1.5 -bottom-1 rounded-full bg-accent px-1 text-[9px] font-semibold text-surface">
                        +{finished.length - 1}
                      </span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-2 px-1 text-xs text-muted">
        {summary ? `Bu ay: ${summary}` : 'Bu ay henüz bir şey bitirmedin.'}
      </p>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-medium text-muted">
          {selected === today ? 'Bugün' : format(fromDateKey(selected), 'd MMMM EEEE', { locale: tr })}
        </h2>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-muted">Bu gün bitirdiğin bir şey yok.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {selectedItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="flex w-full items-start gap-3 px-3 py-3 text-left"
                >
                  <Poster item={item} compact className="w-12 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="block text-xs text-muted">
                      {[KIND_LABEL[item.kind], item.creator].filter(Boolean).join(' · ')}
                    </span>
                    {item.rating !== undefined && <StarRating value={item.rating} />}
                    {item.review && <span className="mt-1 line-clamp-2 block text-sm">{item.review}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
