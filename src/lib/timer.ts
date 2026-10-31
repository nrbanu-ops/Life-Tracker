/**
 * A running or paused timer. Time is derived from timestamps rather than ticks,
 * so it stays correct while the phone is locked or the app is closed.
 */
export type TimerState = {
  mode: 'stopwatch' | 'countdown'
  /** Duration habit that receives the minutes when the timer finishes. */
  habitId?: string
  /** countdown only. */
  durationMs?: number
  /** Set while running: when the current run segment began (ms since epoch). */
  runningSince?: number
  /** Time from earlier segments, before the last pause. */
  accumulatedMs: number
}

export const isRunning = (timer: TimerState): boolean => timer.runningSince !== undefined

export function elapsedMs(timer: TimerState, now: number): number {
  const running = timer.runningSince === undefined ? 0 : Math.max(0, now - timer.runningSince)
  const elapsed = timer.accumulatedMs + running
  return timer.mode === 'countdown' ? Math.min(elapsed, timer.durationMs ?? 0) : elapsed
}

export function remainingMs(timer: TimerState, now: number): number {
  return Math.max(0, (timer.durationMs ?? 0) - elapsedMs(timer, now))
}

export const isFinished = (timer: TimerState, now: number): boolean =>
  timer.mode === 'countdown' && remainingMs(timer, now) === 0

export function pause(timer: TimerState, now: number): TimerState {
  if (!isRunning(timer)) return timer
  return { ...timer, accumulatedMs: elapsedMs(timer, now), runningSince: undefined }
}

export function resume(timer: TimerState, now: number): TimerState {
  return isRunning(timer) ? timer : { ...timer, runningSince: now }
}

/** Whole minutes to log for a finished run; under 30 seconds logs nothing. */
export const minutesToLog = (ms: number): number => Math.round(ms / 60_000)

/** "04:59", "1:02:03". Countdowns round up so 0.4 s left still shows 00:01. */
export function formatClock(ms: number, roundUp = false): string {
  const totalSeconds = roundUp ? Math.ceil(ms / 1000) : Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
