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

const MAX_DOTS = 4

/**
 * Month view of the whole library: on each day a dot per thing finished (filled) or started
 * (ring) in its kind's colour, and the day's list below. Only shown inside the library.
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
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const entry = byDay.get(day)
            const dots = [
              ...(entry?.finished ?? []).map((item) => ({ item, done: true })),
              ...(entry?.started ?? []).map((item) => ({ item, done: false })),
            ]
            const cover = entry?.finished[0]
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                aria-pressed={day === selected}
                aria-label={`${day}${entry?.finished.length ? `, ${entry.finished.length} bitirdiğin` : ''}${
                  entry?.started.length ? `, ${entry.started.length} başladığın` : ''
                }`}
                className={`flex min-h-16 flex-col items-center gap-0.5 rounded-lg p-0.5 ${
                  monthOf(day) === month ? '' : 'opacity-35'
                } ${day === selected ? 'bg-bg' : ''}`}
              >
                <span
                  className={`text-xs tabular-nums ${day === today ? 'font-semibold text-accent' : 'text-muted'}`}
                >
                  {Number(day.slice(8))}
                </span>
                {cover && (
                  <span className="w-6">
                    <Poster item={cover} compact />
                  </span>
                )}
                {dots.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    {dots.slice(0, MAX_DOTS).map(({ item, done }) => (
                      <span
                        key={`${item.id}-${done}`}
                        className="h-1.5 w-1.5 rounded-full border"
                        style={{ borderColor: KIND_COLOR[item.kind], background: done ? KIND_COLOR[item.kind] : 'transparent' }}
                      />
                    ))}
                    {dots.length > MAX_DOTS && <span className="text-[9px] leading-none text-muted">+</span>}
                  </span>
                )}
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
        {kinds.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border border-muted" />
            Başladın
          </span>
        )}
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
