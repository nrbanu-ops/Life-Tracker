import { describe, expect, it } from 'vitest'
import type { Habit } from '../db/types'
import { hardDaysLeft, hardDaysUsed, hardTap, HARD_DAYS_PER_MONTH } from './hardDay'

const habit = (extra: Partial<Habit> = {}): Habit => ({
  id: 'h',
  title: 'h',
  kind: 'check',
  frequency: { type: 'daily' },
  archived: false,
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra,
})

describe('the monthly allowance', () => {
  const days = ['2026-10-30', '2026-11-02', '2026-11-08']

  it('counts only the days of that month', () => {
    expect(hardDaysUsed(days, '2026-11-10')).toBe(2)
    expect(hardDaysLeft(days, '2026-11-10')).toBe(HARD_DAYS_PER_MONTH - 2)
    expect(hardDaysUsed(days, '2026-10-01')).toBe(1)
  })

  it('never goes below zero', () => {
    expect(hardDaysLeft(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-10')).toBe(0)
  })
})

describe('hardTap: check habits', () => {
  it('marks the minimum first, then the full version, then clears', () => {
    expect(hardTap(habit(), undefined)).toEqual({ status: 'minimum' })
    expect(hardTap(habit(), { status: 'minimum' })).toEqual({ status: 'done' })
    expect(hardTap(habit(), { status: 'done' })).toBeUndefined()
  })

  it('does so even for a habit with no minimum version written down', () => {
    expect(hardTap(habit({ minimumVersion: undefined }), undefined)).toEqual({ status: 'minimum' })
  })

  it('clears a skipped or frozen day, like any other tap', () => {
    expect(hardTap(habit(), { status: 'skipped' })).toBeUndefined()
    expect(hardTap(habit(), { status: 'frozen' })).toBeUndefined()
  })
})

describe('hardTap: count and duration habits', () => {
  const water = habit({ kind: 'count', target: 8, increment: 1 })
  const run = habit({ kind: 'duration', target: 30, increment: 10 })

  it('counts any amount short of the target as the minimum, not as partial', () => {
    expect(hardTap(water, undefined)).toEqual({ status: 'minimum', value: 1 })
    expect(hardTap(run, { status: 'partial', value: 10 })).toEqual({ status: 'minimum', value: 20 })
  })

  it('still becomes done when the target is reached after all', () => {
    expect(hardTap(run, { status: 'minimum', value: 20 })).toEqual({ status: 'done', value: 30 })
  })
})
