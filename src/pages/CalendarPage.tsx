import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { DayDetail } from '../components/DayDetail'
import { PageHeader } from '../components/PageHeader'
import { db } from '../db/db'
import { dayStatus, monthGrid, monthOf, shiftMonth } from '../lib/calendar'
import { fromDateKey, isDateKey } from '../lib/date'
import { WEEKDAY_SHORT } from '../lib/frequency'
import { useTodayKey } from '../lib/useTodayKey'

export function CalendarPage() {
  const today = useTodayKey()
  // ?gun=YYYY-MM-DD opens a particular day: the memory card on Bugün links here.
  const [params] = useSearchParams()
  const asked = params.get('gun')
  const wanted = asked && isDateKey(asked) ? asked : undefined
  const [selected, setSelected] = useState(wanted ?? today)
  const [month, setMonth] = useState(() => monthOf(wanted ?? today))
  const [shownParam, setShownParam] = useState(asked)
  if (shownParam !== asked) {
    setShownParam(asked)
    if (wanted) {
      setSelected(wanted)
      setMonth(monthOf(wanted))
    }
  }
  // Arriving at a day far from today, the detail is below the fold; show it.
  const detail = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (wanted && wanted !== today) detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [wanted, today])

  const days = monthGrid(month)
  const first = days[0]
  const last = days[days.length - 1]
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray())
  const logs = useLiveQuery(
    () => db.habitLogs.where('date').between(first, last, true, true).toArray(),
    [first, last],
  )
  const tasks = useLiveQuery(() => db.tasks.toArray())
  // Only the date index is read, never the records: a month of entries would drag their photos in.
  const journalDays = useLiveQuery(
    async () => new Set(await db.journal.where('date').between(first, last, true, true).keys()),
    [first, last],
    new Set(),
  )
  const projects = useLiveQuery(() => db.projects.toArray(), [], [])

  const goToMonth = (next: string) => {
    setMonth(next)
    // Keep the selection inside the visible month.
    setSelected(monthOf(today) === next ? today : next)
  }

  return (
    <>
      <PageHeader title="Takvim" />

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
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => (
            <DayCell
              key={day}
              day={day}
              inMonth={monthOf(day) === month}
              isToday={day === today}
              isSelected={day === selected}
              status={habits && logs && day <= today ? dayStatus(habits, logs, day) : undefined}
              openTasks={tasks?.filter((t) => !t.done && t.date === day).length ?? 0}
              hasJournal={journalDays.has(day)}
              onSelect={() => setSelected(day)}
            />
          ))}
        </div>
      </div>
      <Legend />

      <div ref={detail} className="scroll-mt-4">
        {habits && logs && tasks && (
          <DayDetail
            date={selected}
            today={today}
            habits={habits}
            logs={logs}
            tasks={tasks}
            projects={projects}
          />
        )}
      </div>
    </>
  )
}

type CellProps = {
  day: string
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  /** Habit completion; only for today and past days. */
  status?: { done: number; total: number }
  openTasks: number
  /** Something was written in the journal that day. */
  hasJournal: boolean
  onSelect: () => void
}

function DayCell({ day, inMonth, isToday, isSelected, status, openTasks, hasJournal, onSelect }: CellProps) {
  const complete = status !== undefined && status.total > 0 && status.done === status.total
  const partial = status !== undefined && status.done > 0 && !complete
  const number = Number(day.slice(8))

  const circle = complete
    ? 'bg-accent text-surface'
    : partial
      ? 'bg-accent-soft text-accent'
      : isToday
        ? 'text-accent font-semibold'
        : ''

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${day}${status && status.total > 0 ? `, ${status.total} habit'ten ${status.done}` : ''}${openTasks ? `, ${openTasks} açık görev` : ''}${hasJournal ? ', günlük yazısı var' : ''}`}
      aria-pressed={isSelected}
      className={`flex flex-col items-center gap-0.5 rounded-xl py-1 ${inMonth ? '' : 'opacity-35'} ${
        isSelected ? 'bg-bg' : ''
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums ${circle} ${
          isToday && !complete && !partial ? 'ring-2 ring-accent' : ''
        }`}
      >
        {number}
      </span>
      {/* Fixed height so a day with marks doesn't make its week taller than the others. */}
      <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
        {openTasks > 0 && <span className="h-1.5 w-1.5 rounded-full bg-p3" />}
        {hasJournal && <span className="h-1.5 w-1.5 rounded-full bg-p2" />}
      </span>
    </button>
  )
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-accent" /> Hepsi yapıldı
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-accent-soft" /> Bir kısmı
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-p3" /> Açık görev
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-p2" /> Günlük
      </span>
    </div>
  )
}
