import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { BackIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { db } from '../db/db'
import type { Habit } from '../db/types'
import { formatMinutes } from '../lib/amount'
import { todayKey } from '../lib/date'
import { elapsedMs, formatClock, isRunning, remainingMs, type TimerState } from '../lib/timer'
import { useTimer } from '../lib/timerContext'

const PRESETS = [5, 10, 15, 25, 30, 45, 60]

export function TimerPage() {
  const navigate = useNavigate()
  const { timer } = useTimer()
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray())

  const durationHabits = habits?.filter((h) => h.kind === 'duration' && !h.archived) ?? []
  const linkedHabit = timer?.habitId ? habits?.find((h) => h.id === timer.habitId) : undefined

  return (
    <>
      <PageHeader
        title="Zamanlayıcı"
        action={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Geri"
            className="-mr-2 rounded-full p-2 text-muted transition-colors hover:text-text"
          >
            <BackIcon width={22} height={22} />
          </button>
        }
      />
      {timer ? (
        <RunningTimer timer={timer} habit={linkedHabit} />
      ) : (
        // Wait for habits so a ?habit= link can preselect its habit.
        habits && <TimerSetup habits={durationHabits} />
      )}
    </>
  )
}

function TimerSetup({ habits }: { habits: Habit[] }) {
  const { start } = useTimer()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<TimerState['mode']>('countdown')
  const [habitId, setHabitId] = useState(() => {
    const requested = params.get('habit')
    return habits.some((h) => h.id === requested) ? (requested ?? '') : ''
  })
  const [chosenMinutes, setMinutes] = useState<number>()
  const habit = habits.find((h) => h.id === habitId)

  // Suggest what is left of the habit's daily target as the countdown length.
  const todayLog = useLiveQuery(
    () => (habitId ? db.habitLogs.where({ habitId, date: todayKey() }).first() : undefined),
    [habitId],
  )
  const leftToday = habit?.target ? Math.max(0, habit.target - (todayLog?.value ?? 0)) : 0
  const minutes = chosenMinutes ?? (leftToday || 25)

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        options={[
          { value: 'countdown', label: 'Geri sayım' },
          { value: 'stopwatch', label: 'Kronometre' },
        ]}
        value={mode}
        onChange={setMode}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Hangi habit için? (isteğe bağlı)</span>
        {habits.length > 0 ? (
          <select
            id="timer-habit"
            value={habitId}
            onChange={(e) => setHabitId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
          >
            <option value="">Habit'siz</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-muted">
            Süre türünde bir habit eklersen, zamanlayıcı bitince süre ona otomatik eklenir.
          </span>
        )}
        {habit && (
          <span className="text-xs text-muted">
            Bitince süre bugünkü "{habit.title}" kaydına eklenir
            {leftToday > 0 && ` · bugün ${formatMinutes(leftToday)} kaldı`}.
          </span>
        )}
      </label>

      {mode === 'countdown' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm text-muted">Süre</legend>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...(leftToday > 0 ? [leftToday] : []), ...PRESETS])]
              .sort((a, b) => a - b)
              .map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMinutes(preset)}
                  aria-pressed={minutes === preset}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    minutes === preset ? 'bg-accent text-surface' : 'bg-surface text-muted'
                  }`}
                >
                  {formatMinutes(preset)}
                </button>
              ))}
          </div>
          <label className="mt-1 flex items-center gap-2 text-sm text-muted">
            Başka:
            <input
              id="timer-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Math.min(600, Math.floor(Number(e.target.value)) || 1)))}
              className="w-20 rounded-xl border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            />
            dakika
          </label>
        </fieldset>
      )}

      <button
        type="button"
        onClick={() =>
          start({
            mode,
            habitId: habitId || undefined,
            durationMs: mode === 'countdown' ? minutes * 60_000 : undefined,
          })
        }
        className="mt-2 rounded-full bg-accent py-4 text-lg font-medium text-surface"
      >
        Başlat
      </button>
    </div>
  )
}

const SIZE = 240
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function RunningTimer({ timer, habit }: { timer: TimerState; habit?: Habit }) {
  const { now, pause, resume, finish } = useTimer()
  const running = isRunning(timer)
  const countdown = timer.mode === 'countdown'
  const elapsed = elapsedMs(timer, now)
  const clock = countdown ? formatClock(remainingMs(timer, now), true) : formatClock(elapsed)
  // Countdown: the ring empties. Stopwatch: it fills once per minute.
  const ratio = countdown
    ? remainingMs(timer, now) / (timer.durationMs ?? 1)
    : (elapsed % 60_000) / 60_000

  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <div className="relative">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-border)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            opacity={running ? 1 : 0.5}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-5xl font-semibold tabular-nums"
            role="timer"
            aria-label={countdown ? `Kalan süre ${clock}` : `Geçen süre ${clock}`}
          >
            {clock}
          </span>
          <span className="mt-1 text-sm text-muted">
            {running ? (countdown ? 'Geri sayım' : 'Kronometre') : 'Duraklatıldı'}
          </span>
        </div>
      </div>

      {habit && <p className="text-sm text-muted">Bitince "{habit.title}" kaydına eklenecek</p>}

      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={running ? pause : resume}
          className="rounded-full bg-accent py-4 text-lg font-medium text-surface"
        >
          {running ? 'Duraklat' : 'Devam et'}
        </button>
        <button
          type="button"
          onClick={() => finish(true)}
          className="rounded-full bg-surface py-3 font-medium"
        >
          {habit ? 'Bitir ve kaydet' : 'Bitir'}
        </button>
        <button type="button" onClick={() => finish(false)} className="py-2 text-sm text-muted">
          İptal et
        </button>
      </div>

      {countdown && (
        <p className="text-center text-xs text-muted">
          Uygulama kapalıyken süre dolarsa ses çalmaz, ama döndüğünde süre yine eklenir.
        </p>
      )}
    </div>
  )
}
