import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog } from '../db/types'
import { dayStatus, monthGrid, monthOf, shiftMonth } from './calendar'

const habit = (id: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  title: id,
  kind: 'check',
  frequency: { type: 'daily' },
  archived: false,
  order: 0,
  createdAt: new Date(2026, 9, 1).toISOString(),
  ...extra,
})

describe('month grid', () => {
  it('covers whole weeks, Monday first', () => {
    // October 2026 starts on a Thursday and ends on a Saturday.
    const days = monthGrid('2026-10-15')
    expect(days[0]).toBe('2026-09-28')
    expect(days.at(-1)).toBe('2026-11-01')
    expect(days).toHaveLength(35)
  })

  it('moves between months', () => {
    expect(monthOf('2026-10-15')).toBe('2026-10-01')
    expect(shiftMonth('2026-10-01', 1)).toBe('2026-11-01')
    expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01')
  })
})

describe('dayStatus', () => {
  it('counts completed habits planned that day', () => {
    const logs: HabitLog[] = [{ id: 'l', habitId: 'a', date: '2026-10-20', status: 'done' }]
    const habits = [habit('a'), habit('b')]
    expect(dayStatus(habits, logs, '2026-10-20')).toEqual({ done: 1, total: 2 })
  })

  it('counts a monthly or yearly goal only on the day it was done', () => {
    const habits = [habit('a'), habit('trip', { frequency: { type: 'timesPerYear', count: 1 } })]
    const logs: HabitLog[] = [{ id: 'l', habitId: 'trip', date: '2026-10-20', status: 'done' }]
    expect(dayStatus(habits, [], '2026-10-19')).toEqual({ done: 0, total: 1 })
    expect(dayStatus(habits, logs, '2026-10-20')).toEqual({ done: 1, total: 2 })
  })

  it('leaves out days before a habit existed', () => {
    const habits = [habit('a'), habit('late', { createdAt: new Date(2026, 9, 25).toISOString() })]
    expect(dayStatus(habits, [], '2026-10-20')).toEqual({ done: 0, total: 1 })
  })
})
