import { createContext, useContext } from 'react'
import type { TimerState } from './timer'

export type TimerResult = {
  minutes: number
  /** Title of the habit the minutes went to, if any. */
  habitTitle?: string
}

export type TimerContextValue = {
  timer?: TimerState
  /** Refreshed several times a second while a timer runs. */
  now: number
  result?: TimerResult
  start: (config: Pick<TimerState, 'mode' | 'habitId' | 'durationMs'>) => void
  pause: () => void
  resume: () => void
  /** Stops the timer; with `save`, logs the elapsed minutes to the linked habit. */
  finish: (save: boolean) => void
  clearResult: () => void
}

export const TimerContext = createContext<TimerContextValue | null>(null)

export function useTimer(): TimerContextValue {
  const value = useContext(TimerContext)
  if (!value) throw new Error('useTimer must be used inside <TimerProvider>')
  return value
}
