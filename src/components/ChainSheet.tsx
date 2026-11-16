import { addMonths, endOfMonth, format, getDaysInMonth } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState, type ReactNode } from 'react'
import type { Habit, HabitLog } from '../db/types'
import { chainDays, type ChainDay } from '../lib/chain'
import { chainColors } from '../lib/chainUi'
import { fromDateKey, toDateKey, weekdayOf } from '../lib/date'
import { WEEKDAY_SHORT } from '../lib/frequency'
import { successRate, type DayState } from '../lib/stats'
import { HabitChain } from './HabitChain'
import { Segmented } from './Segmented'

type Props = {
  habit: Habit
  /** All of this habit's logs. */
  logs: HabitLog[]
  today: string
  /** The habit's project colour; the app's accent when absent. */
  color?: string
}

type View = 'month' | 'year'

const isDone = (state: DayState) => state === 'done' || state === 'minimum'

const percent = (rate: number | undefined) => (rate === undefined ? undefined : `%${Math.round(rate * 100)}`)

/**
 * A habit's chain at length: the recent links, then a month as a calendar or a year as twelve
 * rows of days. Opened by tapping the habit; the sheet's own "Düzenle" leads on to the form.
 */
export function ChainSheet({ habit, logs, today, color }: Props) {
  const [view, setView] = useState<View>('month')
  // First day of the month shown, and the year shown: each view keeps its own place.
  const [month, setMonth] = useState(`${today.slice(0, 7)}-01`)
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const created = toDateKey(new Date(habit.createdAt))

  return (
    <div className="flex flex-col gap-4" style={chainColors(color)}>
      <div className="-mt-2">
        <HabitChain habit={habit} logs={logs} today={today} color={color} />
      </div>

      <Segmented
        options={[
          { value: 'month', label: 'Ay' },
          { value: 'year', label: 'Yıl' },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'month' ? (
        <MonthChain
          habit={habit}
          logs={logs}
          today={today}
          month={month}
          onMove={(by) => setMonth(toDateKey(addMonths(fromDateKey(month), by)))}
          canGoBack={month.slice(0, 7) > created.slice(0, 7)}
          canGoOn={month.slice(0, 7) < today.slice(0, 7)}
        />
      ) : (
        <YearChain
          habit={habit}
          logs={logs}
          today={today}
          year={year}
          onMove={(by) => setYear(year + by)}
          canGoBack={year > Number(created.slice(0, 4))}
          canGoOn={year < Number(today.slice(0, 4))}
        />
      )}

      <Legend />
    </div>
  )
}

type StepperProps = {
  title: string
  detail?: string
  onMove: (by: number) => void
  canGoBack: boolean
  canGoOn: boolean
}

/** "‹ Kasım 2026 ›" with what the period came to underneath. */
function Stepper({ title, detail, onMove, canGoBack, canGoOn }: StepperProps) {
  const arrow = 'flex h-10 w-10 items-center justify-center rounded-full text-xl text-muted disabled:opacity-30'
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={() => onMove(-1)} disabled={!canGoBack} aria-label="Önceki" className={arrow}>
        ‹
      </button>
      <div className="text-center">
        <p className="font-medium capitalize">{title}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
      </div>
      <button type="button" onClick={() => onMove(1)} disabled={!canGoOn} aria-label="Sonraki" className={arrow}>
        ›
      </button>
    </div>
  )
}

/** "18 gün · %82 başarı" for a stretch of days. */
function tally(habit: Habit, logs: HabitLog[], days: Map<string, ChainDay>, from: string, to: string, today: string) {
  const done = [...days.values()].filter((day) => isDone(day.state)).length
  const rate = percent(successRate(habit, logs, from, to < today ? to : today, today).rate)
  return [`${done} gün`, rate && `${rate} başarı`].filter(Boolean).join(' · ')
}

type PeriodProps = Pick<Props, 'habit' | 'logs' | 'today'> & Pick<StepperProps, 'onMove' | 'canGoBack' | 'canGoOn'>

/** The circle a day of the month is drawn as; unplanned and future days are just their number. */
const MARK: Partial<Record<DayState, string>> = {
  done: 'bg-(--chain) text-(--chain-ink)',
  minimum: 'border-2 border-(--chain) bg-[color-mix(in_oklab,var(--chain)_30%,var(--color-surface))]',
  partial: 'border-2 border-dotted border-(--chain) bg-surface',
  skipped: 'bg-border text-muted',
  frozen: 'bg-border text-muted',
  missed: 'border-2 border-border bg-surface text-muted',
}

function MonthChain({ habit, logs, today, month, ...stepper }: PeriodProps & { month: string }) {
  const end = toDateKey(endOfMonth(fromDateKey(month)))
  const days = chainDays(habit, logs, month, end, today)
  const bar = 'absolute top-1/2 h-[3px] w-1/2 -translate-y-1/2 bg-(--chain)'

  return (
    <div>
      <Stepper
        title={format(fromDateKey(month), 'LLLL yyyy', { locale: tr })}
        detail={tally(habit, logs, days, month, end, today)}
        {...stepper}
      />
      <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-muted" aria-hidden>
        {WEEKDAY_SHORT.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: weekdayOf(month) - 1 }, (_, i) => (
          <span key={i} />
        ))}
        {[...days].map(([key, day]) => {
          const mark =
            day.state === 'open' && key === today ? 'border-2 border-dashed border-(--chain) bg-surface' : MARK[day.state]
          return (
            <span key={key} className="relative flex h-10 items-center justify-center text-xs tabular-nums">
              {day.left && <span className={`${bar} left-0`} />}
              {day.right && <span className={`${bar} right-0`} />}
              <span
                className={`relative flex items-center justify-center ${
                  mark
                    ? `h-8 w-8 rounded-full ${mark}`
                    : `bg-surface px-1 ${day.state === 'none' ? 'text-muted/50' : 'text-muted'}`
                } ${key === today ? 'font-bold' : ''}`}
              >
                {Number(key.slice(8))}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** The square a day of the year is drawn as; unplanned and future days leave their place empty. */
const PIXEL: Partial<Record<DayState, string>> = {
  done: 'bg-(--chain)',
  minimum: 'bg-(--chain) opacity-50',
  partial: 'border border-dotted border-(--chain)',
  skipped: 'bg-border',
  frozen: 'bg-border',
  missed: 'border border-border',
}

function YearChain({ habit, logs, today, year, ...stepper }: PeriodProps & { year: number }) {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const days = chainDays(habit, logs, from, to, today)

  return (
    <div>
      <Stepper title={String(year)} detail={tally(habit, logs, days, from, to, today)} {...stepper} />
      <div className="mt-3 flex flex-col gap-1">
        {Array.from({ length: 12 }, (_, m) => {
          const first = fromDateKey(`${year}-${String(m + 1).padStart(2, '0')}-01`)
          const start = toDateKey(first)
          const end = toDateKey(endOfMonth(first))
          const length = getDaysInMonth(first)
          const rate = start > today ? undefined : percent(successRate(habit, logs, start, end < today ? end : today, today).rate)
          return (
            <div key={m} className="flex items-center gap-2 text-[11px] text-muted">
              <span className="w-7 shrink-0 capitalize">{format(first, 'LLL', { locale: tr })}</span>
              <span className="flex flex-1 gap-px">
                {Array.from({ length: 31 }, (_, d): ReactNode => {
                  const key = `${start.slice(0, 8)}${String(d + 1).padStart(2, '0')}`
                  const state = d < length ? days.get(key)?.state : undefined
                  const pixel = state === 'open' && key === today ? 'border border-dashed border-(--chain)' : state && PIXEL[state]
                  return <span key={d} className={`aspect-square flex-1 rounded-[2px] ${pixel ?? ''}`} />
                })}
              </span>
              <span className="w-8 shrink-0 text-right tabular-nums">{rate ?? '–'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Legend() {
  const item = (mark: string, label: string) => (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-full ${mark}`} aria-hidden />
      {label}
    </span>
  )
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {item('bg-(--chain)', 'Yapıldı')}
      {item('bg-(--chain) opacity-50', 'Minimum')}
      {item('border-2 border-border', 'Kaçtı')}
      {item('bg-border', 'Atlandı ya da korundu')}
    </div>
  )
}
