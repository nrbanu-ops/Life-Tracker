import { describe, expect, it } from 'vitest'
import {
  elapsedMs,
  formatClock,
  isFinished,
  minutesToLog,
  pause,
  remainingMs,
  resume,
  type TimerState,
} from './timer'

const MIN = 60_000

describe('stopwatch', () => {
  it('adds up run segments across a pause', () => {
    let timer: TimerState = { mode: 'stopwatch', accumulatedMs: 0, runningSince: 0 }
    timer = pause(timer, 5 * MIN)
    expect(elapsedMs(timer, 60 * MIN)).toBe(5 * MIN)
    timer = resume(timer, 60 * MIN)
    expect(elapsedMs(timer, 62 * MIN)).toBe(7 * MIN)
  })
})

describe('countdown', () => {
  const timer: TimerState = {
    mode: 'countdown',
    durationMs: 15 * MIN,
    accumulatedMs: 0,
    runningSince: 0,
  }

  it('counts down and finishes', () => {
    expect(remainingMs(timer, 10 * MIN)).toBe(5 * MIN)
    expect(isFinished(timer, 10 * MIN)).toBe(false)
    expect(isFinished(timer, 15 * MIN)).toBe(true)
  })

  it('never runs past its duration, even when the app was closed', () => {
    expect(elapsedMs(timer, 3 * 60 * MIN)).toBe(15 * MIN)
    expect(remainingMs(timer, 3 * 60 * MIN)).toBe(0)
  })
})

describe('formatting', () => {
  it('formats clocks', () => {
    expect(formatClock(299_999)).toBe('04:59')
    expect(formatClock(299_001, true)).toBe('05:00')
    expect(formatClock(3_723_000)).toBe('1:02:03')
  })

  it('rounds logged minutes', () => {
    expect(minutesToLog(29_000)).toBe(0)
    expect(minutesToLog(25 * MIN + 31_000)).toBe(26)
  })
})
