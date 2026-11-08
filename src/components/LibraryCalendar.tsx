import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import type { LibraryItem } from '../db/types'
import { monthGrid, monthOf, shiftMonth } from '../lib/calendar'
import { fromDateKey } from '../lib/date'
import { WEEKDAY_SHORT } from '../lib/frequency'
import { KIND_COLOR, KIND_EMOJI, KIND_LABEL, LIBRARY_KINDS, libraryDays, monthSummary } from '../lib/library'
import { Poster } from './Poster'
import { StarRating } from './StarRating'

type Props = {
  items: LibraryItem[]
  today: string
  onSelect: (id: string) => void
}

/** Covers shown stacked in one day; the rest are a "+n". */
const MAX_COVERS = 3

/**
 * Month view of the whole library: each day wears the covers of what you finished (full) or
 * started (faded, in its kind's colour) that day, with the day's list below. Only in the library.
 */
export function LibraryCalendar({ items, today, onSelect }: Props) {
  const [month, setMonth] = useState(() => monthOf(today))
  const [selected, setSelected] = useState(today)

  const days = monthGrid(month)
  const byDay = libraryDays(items)
  const summary = monthSummary(items, month)
  const selectedDay = byDay.get(selected)
  // Only kinds the user has, so the legend stays short.
  const kinds = LIBRARY_KINDS.filter((k) => items.some((i) => i.kind === k))

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
        <div className="grid grid-cols-7 gap-x-0.5 gap-y-1">
          {days.map((day) => {
            const entry = byDay.get(day)
            // Finished first: that's the cover on top, and whose stars the day shows.
            const covers = [
              ...(entry?.finished ?? []).map((item) => ({ item, done: true })),
              ...(entry?.started ?? []).map((item) => ({ item, done: false })),
            ]
            const shown = covers.slice(0, MAX_COVERS)
            const rating = entry?.finished.find((i) => i.rating !== undefined)?.rating
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                aria-pressed={day === selected}
                aria-label={`${day}${entry?.finished.length ? `, ${entry.finished.length} bitirdiğin` : ''}${
                  entry?.started.length ? `, ${entry.started.length} başladığın` : ''
                }`}
                // A week with nothing in it stays short; a row grows to the covers it holds.
                className={`flex min-h-11 flex-col items-center gap-0.5 rounded-lg px-0.5 pt-1 pb-1.5 ${
                  monthOf(day) === month ? '' : 'opacity-35'
                } ${day === selected ? 'bg-bg' : ''}`}
              >
                <span
                  className={`text-xs leading-none tabular-nums ${
                    day === today ? 'font-semibold text-accent' : 'text-muted'
                  }`}
                >
                  {Number(day.slice(8))}
                </span>
                {shown.length > 0 && (
                  <span className="relative flex items-end justify-center">
                    {shown.map(({ item, done }, i) => (
                      <span
                        key={`${item.id}-${done}`}
                        // The ones behind peek out to the right; the first one stays readable.
                        className={`relative rounded ${shown.length === 1 ? 'w-7' : 'w-6'} ${i > 0 ? '-ml-3.5' : ''}`}
                        style={{
                          zIndex: shown.length - i,
                          // Started, not finished: the kind's colour draws the outline.
                          boxShadow: done ? undefined : `0 0 0 1.5px ${KIND_COLOR[item.kind]}`,
                        }}
                      >
                        <Poster item={item} compact className={done ? 'shadow-sm' : 'opacity-60'} />
                      </span>
                    ))}
                    {covers.length > MAX_COVERS && (
                      // On the stack, not beside it, so the covers stay centred in the day.
                      <span
                        className="absolute -right-1 -bottom-1 rounded-full bg-text px-1 text-[9px] leading-[1.3] font-medium text-surface"
                        style={{ zIndex: MAX_COVERS + 1 }}
                      >
                        +{covers.length - MAX_COVERS}
                      </span>
                    )}
                  </span>
                )}
                {rating !== undefined && <StarRating value={rating} size="sm" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted">
        {kinds.map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
            {KIND_LABEL[k]}
          </span>
        ))}
        {kinds.length > 0 && <span>Soluk kapak: başladın</span>}
      </div>
      <p className="mt-1 px-1 text-xs text-muted">{summary ? `Bu ay: ${summary}` : 'Bu ay henüz bir şey bitirmedin.'}</p>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-medium text-muted">
          {selected === today ? 'Bugün' : format(fromDateKey(selected), 'd MMMM EEEE', { locale: tr })}
        </h2>
        {!selectedDay ? (
          <p className="text-sm text-muted">Bu gün bitirdiğin ya da başladığın bir şey yok.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <DayList title="Bitirdin" items={selectedDay.finished} onSelect={onSelect} />
            <DayList title="Başladın" items={selectedDay.started} onSelect={onSelect} />
          </div>
        )}
      </section>
    </>
  )
}

function DayList({ title, items, onSelect }: { title: string; items: LibraryItem[]; onSelect: (id: string) => void }) {
  if (items.length === 0) return null
  return (
    <div>
      <h3 className="mb-1.5 px-1 text-xs font-medium text-muted">{title}</h3>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onSelect(item.id)} className="flex w-full items-start gap-3 px-3 py-3 text-left">
              <Poster item={item} compact className="w-12 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[item.kind] }} />
                  {[`${KIND_EMOJI[item.kind]} ${KIND_LABEL[item.kind]}`, item.creator].filter(Boolean).join(' · ')}
                </span>
                {item.rating !== undefined && <StarRating value={item.rating} />}
                {item.review && <span className="mt-1 line-clamp-2 block text-sm">{item.review}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
