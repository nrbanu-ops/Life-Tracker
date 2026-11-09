import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useEffect, useRef, useState } from 'react'
import { fromDateKey } from '../lib/date'
import type { DayState } from '../lib/stats'

type Props = {
  /** Monday-first grid of day keys, whole weeks, oldest first. */
  days: string[]
  states: Map<string, DayState>
}

const CELL = 12
const GAP = 3

const FILL: Record<DayState, string> = {
  done: 'var(--color-heat-3)',
  minimum: 'var(--color-heat-2)',
  partial: 'var(--color-heat-1)',
  skipped: 'transparent',
  // A held day: filled, so it reads as handled rather than missed.
  frozen: 'var(--color-accent-soft)',
  missed: 'var(--color-bg)',
  open: 'var(--color-bg)',
  none: 'transparent',
}

const LABEL: Record<DayState, string> = {
  done: 'Tamamlandı',
  minimum: 'Minimum yapıldı',
  partial: 'Kısmen',
  skipped: 'Atlandı',
  frozen: 'Seri koruması ❄️',
  missed: 'Yapılmadı',
  open: 'Henüz işaretlenmedi',
  none: 'Planlı değil',
}

/** A year of days in week columns, GitHub style; tap or hover a day to read it. */
export function Heatmap({ days, states }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string>()
  const weeks: string[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  // Start at the most recent weeks; older ones are a scroll to the left.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [days.length])

  const width = weeks.length * (CELL + GAP)
  const height = 7 * (CELL + GAP) + 16
  const activeState = active ? states.get(active) : undefined

  return (
    <div>
      <div className="flex gap-1.5">
        <div className="flex shrink-0 flex-col pt-4 text-[10px] leading-none text-muted" aria-hidden>
          {['Pzt', '', 'Çar', '', 'Cum', '', ''].map((label, i) => (
            <span key={i} style={{ height: CELL + GAP }} className="flex items-center">
              {label}
            </span>
          ))}
        </div>
        <div ref={scroller} className="overflow-x-auto pb-1">
          <svg width={width} height={height} role="img" aria-label="Son 12 ayın günlük durumu">
            {weeks.map((week, w) => {
              const first = week[0]
              const showMonth = w === 0 ? Number(first.slice(8)) <= 7 : week.some((d) => d.slice(8) === '01')
              const monthDay = week.find((d) => d.slice(8) === '01') ?? first
              return (
                <g key={first} transform={`translate(${w * (CELL + GAP)}, 0)`}>
                  {showMonth && (
                    <text y={10} className="fill-muted text-[10px] capitalize">
                      {format(fromDateKey(monthDay), 'LLL', { locale: tr })}
                    </text>
                  )}
                  {week.map((day, d) => {
                    const state = states.get(day) ?? 'none'
                    const outlined = state === 'skipped' || state === 'frozen' || state === 'missed' || state === 'open'
                    const isActive = active === day
                    return (
                      <rect
                        key={day}
                        y={16 + d * (CELL + GAP)}
                        width={CELL}
                        height={CELL}
                        rx={3}
                        fill={FILL[state]}
                        stroke={isActive ? 'var(--color-text)' : outlined ? 'var(--color-border)' : 'none'}
                        strokeDasharray={state === 'skipped' && !isActive ? '2 2' : undefined}
                        strokeWidth={isActive ? 1.5 : 1}
                        onMouseEnter={() => setActive(day)}
                        onClick={() => setActive(day)}
                      >
                        <title>{`${format(fromDateKey(day), 'd MMMM yyyy', { locale: tr })}: ${LABEL[state]}`}</title>
                      </rect>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="min-h-4">
          {active && activeState
            ? `${format(fromDateKey(active), 'd MMMM yyyy, EEEE', { locale: tr })}: ${LABEL[activeState]}`
            : 'Bir güne dokun'}
        </span>
        <span className="flex items-center gap-1.5">
          <Swatch state="missed" /> Yok
          <Swatch state="partial" /> Kısmen
          <Swatch state="minimum" /> Min
          <Swatch state="done" /> Tamam
        </span>
      </div>
    </div>
  )
}

function Swatch({ state }: { state: DayState }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-[3px] border border-border"
      style={{ background: FILL[state], borderColor: state === 'missed' ? undefined : 'transparent' }}
      aria-hidden
    />
  )
}
