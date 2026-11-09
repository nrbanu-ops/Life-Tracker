import { addDays, addMonths, format, startOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { Heatmap } from '../components/Heatmap'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { RateChart, type RatePoint } from '../components/RateChart'
import { Segmented } from '../components/Segmented'
import { db } from '../db/db'
import { MoodChart, type MoodPoint } from '../components/MoodChart'
import type { DayMood, Habit, HabitLog, Level } from '../db/types'
import { average, describeEffect, ENERGY_COLOR, ENERGY_EMOJI, habitEffects, MOOD_COLOR, MOOD_EMOJI } from '../lib/mood'
import { fromDateKey, toDateKey, weekRange } from '../lib/date'
import { describeFrequency, WEEKDAY_SHORT } from '../lib/frequency'
import { compareProjects, projectProgress } from '../lib/projects'
import { formatElapsed, quitStats } from '../lib/quit'
import {
  dayStates,
  lastDays,
  monthlyRates,
  overallRate,
  streaks,
  successRate,
  weekdayRates,
  weeklyRates,
  type PeriodRate,
} from '../lib/stats'
import { useNow } from '../lib/useNow'
import { useTodayKey } from '../lib/useTodayKey'

const percent = (rate?: number) => (rate === undefined ? '–' : `%${Math.round(rate * 100)}`)

export function StatsPage() {
  const today = useTodayKey()
  // A year of whole weeks for the heatmap; the monthly chart's first month starts inside it.
  const heatStart = weekRange(toDateKey(addDays(fromDateKey(today), -364))).start
  const monthStart = toDateKey(addMonths(startOfMonth(fromDateKey(today)), -11))
  const from = heatStart < monthStart ? heatStart : monthStart

  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray())
  const logs = useLiveQuery(() => db.habitLogs.where('date').between(from, today, true, true).toArray(), [from, today], [])
  const projects = useLiveQuery(() => db.projects.toArray(), [], [])
  const milestones = useLiveQuery(() => db.milestones.toArray(), [], [])
  const moods = useLiveQuery(() => db.moods.where('date').between(from, today, true, true).toArray(), [from, today], [])
  const [selectedId, setSelectedId] = useState<string>()

  if (habits === undefined) return <PageHeader title="İstatistik" />

  const active = habits.filter((h) => !h.archived)
  const tracked = active.filter((h) => h.kind !== 'quit')
  const quitting = active.filter((h) => h.kind === 'quit')
  const selected = tracked.find((h) => h.id === selectedId) ?? tracked[0]
  const openProjects = projects.filter((p) => p.status !== 'done').sort(compareProjects)

  if (active.length === 0 && openProjects.length === 0) {
    return (
      <>
        <PageHeader title="İstatistik" />
        <EmptyState
          title="Gösterilecek veri yok"
          text="Habit'lerini işaretledikçe seriler, ısı haritası ve grafikler burada görünecek."
          action={
            <Link to="/habitler" className="text-sm font-medium text-accent underline">
              Habit ekle
            </Link>
          }
        />
      </>
    )
  }

  const [from30] = lastDays(today, 30)
  const month = overallRate(tracked, logs, from30, today, today)
  const week = overallRate(tracked, logs, weekRange(today).start, today, today)
  const best = tracked
    .map((habit) => ({ habit, streak: streaks(habit, logs, today) }))
    .sort((a, b) => b.streak.current - a.streak.current)[0]

  return (
    <>
      <PageHeader title="İstatistik" />

      <Link
        to="/ozet"
        className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
      >
        <span aria-hidden>✨</span>
        <span className="flex-1 font-medium">{today.slice(0, 4)} özeti</span>
        <span className="text-muted" aria-hidden>
          ›
        </span>
      </Link>

      {tracked.length > 0 && (
        <section className="mb-6 grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">Son 30 gün</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{percent(month.rate)}</p>
            <p className="mt-1 text-sm text-muted">
              {month.planned > 0 ? `${month.planned} planlı günün ${month.done} tanesi tamam` : 'Henüz planlı gün yok'}
            </p>
            {month.rate !== undefined && (
              <div className="mt-3">
                <ProgressBar ratio={month.rate} />
              </div>
            )}
          </div>
          <Tile label="Bu hafta" value={percent(week.rate)} detail={week.planned > 0 ? `${week.done}/${week.planned}` : undefined} />
          <Tile
            label="En iyi seri"
            value={best && best.streak.current > 0 ? `${best.streak.current} ${best.streak.unit === 'week' ? 'hf' : 'gün'}` : '–'}
            detail={best && best.streak.current > 0 ? best.habit.title : undefined}
          />
        </section>
      )}

      {selected && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-muted">Habit'lerin</h2>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {tracked.map((habit) => (
              <button
                key={habit.id}
                type="button"
                onClick={() => setSelectedId(habit.id)}
                aria-pressed={habit.id === selected.id}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  habit.id === selected.id ? 'bg-accent font-medium text-surface' : 'bg-surface text-muted'
                }`}
              >
                {habit.title}
              </button>
            ))}
          </div>
          <HabitStats key={selected.id} habit={selected} logs={logs} today={today} heatStart={heatStart} />
        </section>
      )}

      <MoodSection habits={habits} logs={logs} moods={moods} today={today} />

      {quitting.length > 0 && <QuitStatsSection habits={quitting} />}

      {openProjects.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-muted">Projeler</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {openProjects.map((project) => {
              const progress = projectProgress(milestones.filter((m) => m.projectId === project.id))
              return (
                <li key={project.id}>
                  <Link to={`/projeler/${project.id}`} className="block px-4 py-3">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium">{project.title}</span>
                      <span className="shrink-0 text-sm tabular-nums text-muted">
                        {progress.total === 0 ? 'Adım yok' : `${progress.done}/${progress.total} · %${Math.round(progress.ratio * 100)}`}
                      </span>
                    </span>
                    <span className="mt-2 block">
                      <ProgressBar ratio={progress.ratio} color={project.color} />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{detail ?? ' '}</p>
    </div>
  )
}

const toPoints = (rates: PeriodRate[], label: (r: PeriodRate) => string, detail: (r: PeriodRate) => string): RatePoint[] =>
  rates.map((r) => ({
    label: label(r),
    detail: detail(r),
    value: r.rate === undefined ? null : r.rate * 100,
    done: r.done,
    planned: r.planned,
  }))

type HabitStatsProps = { habit: Habit; logs: HabitLog[]; today: string; heatStart: string }

function HabitStats({ habit, logs, today, heatStart }: HabitStatsProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const streak = streaks(habit, logs, today)
  const [from30] = lastDays(today, 30)
  const rate30 = successRate(habit, logs, from30, today, today)
  const unit = streak.unit === 'week' ? 'hafta' : 'gün'

  const heatDays = daysUntilWeekEnd(heatStart, today)
  const states = dayStates(habit, logs, heatDays[0], heatDays[heatDays.length - 1], today)

  const short = (key: string) => format(fromDateKey(key), 'd MMM', { locale: tr })
  const chart =
    period === 'week'
      ? toPoints(weeklyRates(habit, logs, today, 12), (r) => short(r.start), (r) => `${short(r.start)} – ${short(r.end)}`)
      : toPoints(
          monthlyRates(habit, logs, today, 12),
          (r) => format(fromDateKey(r.start), 'LLL', { locale: tr }),
          (r) => format(fromDateKey(r.start), 'LLLL yyyy', { locale: tr }),
        )
  const [from90] = lastDays(today, 90)
  const weekdays = weekdayRates(habit, logs, from90, today, today).map((r) => ({
    label: WEEKDAY_SHORT[r.weekday - 1],
    detail: `${WEEKDAY_SHORT[r.weekday - 1]} · son 90 gün`,
    value: r.rate === undefined ? null : r.rate * 100,
    done: r.done,
    planned: r.planned,
  }))
  const bestDay = weekdays.reduce<(typeof weekdays)[number] | undefined>(
    (top, d) => (d.value !== null && (top === undefined || d.value > (top.value ?? -1)) ? d : top),
    undefined,
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="-mt-2 text-sm text-muted">{describeFrequency(habit.frequency)}</p>
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Seri" value={String(streak.current)} detail={unit} />
        <Tile label="En uzun" value={String(streak.longest)} detail={unit} />
        <Tile label="30 gün" value={percent(rate30.rate)} detail={rate30.planned > 0 ? `${rate30.done}/${rate30.planned}` : undefined} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-medium">Son 12 ay</h3>
        <Heatmap days={heatDays} states={states} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Başarı oranı</h3>
          <div className="w-44">
            <Segmented
              options={[
                { value: 'week', label: 'Haftalık' },
                { value: 'month', label: 'Aylık' },
              ]}
              value={period}
              onChange={setPeriod}
            />
          </div>
        </div>
        <RateChart data={chart} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-sm font-medium">Haftanın günleri</h3>
        <p className="mb-3 text-xs text-muted">
          {bestDay ? `En iyi günün: ${bestDay.label} (%${Math.round(bestDay.value ?? 0)}) · son 90 gün` : 'Son 90 gün'}
        </p>
        <RateChart data={weekdays} height={150} />
      </div>
    </div>
  )
}

/** Day keys from `start` through the end of today's week, so the grid ends with whole weeks. */
function daysUntilWeekEnd(start: string, today: string): string[] {
  const end = weekRange(today).end
  const days: string[] = []
  for (let d = fromDateKey(start); toDateKey(d) <= end; d = addDays(d, 1)) days.push(toDateKey(d))
  return days
}

type MoodSectionProps = { habits: Habit[]; logs: HabitLog[]; moods: DayMood[]; today: string }

function MoodSection({ habits, logs, moods, today }: MoodSectionProps) {
  const [from30] = lastDays(today, 30)
  const recent = moods.filter((m) => m.date >= from30)
  const mood = average(recent, 'mood')
  const energy = average(recent, 'energy')
  const effects = habitEffects(habits, logs, moods, today).slice(0, 4)
  const byDate = new Map(moods.map((m) => [m.date, m]))
  const chart: MoodPoint[] = []
  for (let d = fromDateKey(from30); toDateKey(d) <= today; d = addDays(d, 1)) {
    const key = toDateKey(d)
    const m = byDate.get(key)
    chart.push({
      label: format(d, 'd MMM', { locale: tr }),
      detail: format(d, 'd MMMM EEEE', { locale: tr }),
      mood: m?.mood ?? null,
      energy: m?.energy ?? null,
    })
  }

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-medium text-muted">Ruh hali ve enerji · son 30 gün</h2>
      {recent.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          Bugün ekranında günün ruh halini ve enerjini işaretle; burada nasıl gittiği ve habit'lerinle bağlantısı görünecek.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Ruh hali" value={mood ? `${MOOD_EMOJI[Math.round(mood) as Level]} ${mood.toFixed(1)}` : '–'} detail="ortalama, 5 üzerinden" />
            <Tile label="Enerji" value={energy ? `${ENERGY_EMOJI[Math.round(energy) as Level]} ${energy.toFixed(1)}` : '–'} detail="ortalama, 5 üzerinden" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ background: MOOD_COLOR }} /> Ruh hali
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ background: ENERGY_COLOR }} /> Enerji
              </span>
            </div>
            <MoodChart data={chart} />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <h3 className="text-sm font-medium">Habit'lerinle bağlantısı</h3>
            {effects.length === 0 ? (
              <p className="mt-1 text-sm text-muted">
                Birkaç hafta işaretledikçe hangi habit'lerin ruh halini ve enerjini etkilediği burada görünecek.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {effects.map((e) => (
                  <li key={`${e.habit.id}-${e.key}`} className="flex gap-2 text-sm">
                    <span aria-hidden>{e.diff > 0 ? '📈' : '📉'}</span>
                    <span>{describeEffect(e)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function QuitStatsSection({ habits }: { habits: Habit[] }) {
  const now = useNow()
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-medium text-muted">Bıraktıkların</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {habits.map((habit) => {
          const stats = quitStats(habit, now)
          return (
            <li key={habit.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{habit.title}</span>
                <span className="block text-xs text-muted">
                  En uzun: {formatElapsed(stats.longestMs)}
                  {stats.restarts > 0 && ` · ${stats.restarts} kez yeniden başladı`}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{formatElapsed(stats.currentMs)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
