import { describe, expect, it } from 'vitest'
import type { Habit, HabitFrequency, HabitLog } from '../db/types'
import { lastDays, successRate } from './stats'

const habit = (frequency: HabitFrequency, extra: Partial<Habit> = {}): Habit => ({
  id: 'h',
  title: 'h',
  kind: 'check',
  frequency,
  archived: false,
  order: 0,
  createdAt: new Date(2026, 0, 1).toISOString(),
  ...extra,
})

const log = (date: string, status: HabitLog['status'] = 'done'): HabitLog => ({
  id: date,
  habitId: 'h',
  date,
  status,
})

// 2026-10-26 is a Monday; "today" is Wednesday 2026-10-28.
const TODAY = '2026-10-28'

describe('successRate: daily and weekdays', () => {
  it('counts minimum as done and leaves skipped days out', () => {
    const logs = [log('2026-10-26', 'minimum'), log('2026-10-27', 'skipped')]
    expect(successRate(habit({ type: 'daily' }), logs, '2026-10-24', TODAY, TODAY)).toEqual({
      done: 1,
      planned: 3, // 24, 25, 26; 27 skipped; today not yet marked
      rate: 1 / 3,
    })
  })

  it('includes today once it is completed', () => {
    const r = successRate(habit({ type: 'daily' }), [log(TODAY)], '2026-10-27', TODAY, TODAY)
    expect(r).toEqual({ done: 1, planned: 2, rate: 0.5 })
  })

  it('only counts planned weekdays', () => {
    // Mondays and Wednesdays from Mon 19th to Tue 27th: 19, 21, 26.
    const h = habit({ type: 'weekdays', days: [1, 3] })
    const r = successRate(h, [log('2026-10-19'), log('2026-10-26')], '2026-10-19', '2026-10-27', TODAY)
    expect(r).toEqual({ done: 2, planned: 3, rate: 2 / 3 })
  })

  it('ignores days before the habit was created', () => {
    const h = habit({ type: 'daily' }, { createdAt: new Date(2026, 9, 27).toISOString() })
    expect(successRate(h, [log('2026-10-27')], '2026-10-01', TODAY, TODAY).planned).toBe(1)
  })

  it('has no rate when nothing was planned', () => {
    expect(successRate(habit({ type: 'daily' }), [], TODAY, TODAY, TODAY).rate).toBeUndefined()
  })
})

describe('successRate: times per week', () => {
  const h = habit({ type: 'timesPerWeek', count: 3 })

  it('caps each week at its target and skips a running week below target', () => {
    const logs = [
      // Week of 19th: 4 done, capped at 3.
      log('2026-10-19'),
      log('2026-10-20'),
      log('2026-10-21'),
      log('2026-10-22'),
      // Running week: 1 of 3 so far, not counted yet.
      log('2026-10-26'),
    ]
    expect(successRate(h, logs, '2026-10-19', TODAY, TODAY)).toEqual({ done: 3, planned: 3, rate: 1 })
  })

  it('counts the running week once its target is met', () => {
    const logs = [log('2026-10-26'), log('2026-10-27'), log(TODAY)]
    expect(successRate(h, logs, '2026-10-26', TODAY, TODAY)).toEqual({ done: 3, planned: 3, rate: 1 })
  })

  it('plans fewer for a week only partly in range', () => {
    // Range starts Saturday 24th: that week has 2 days in range, so it plans 2.
    expect(successRate(h, [log('2026-10-25')], '2026-10-24', '2026-10-25', TODAY)).toEqual({
      done: 1,
      planned: 2,
      rate: 0.5,
    })
  })
})

describe('lastDays', () => {
  it('ends today', () => {
    expect(lastDays(TODAY, 30)).toEqual(['2026-09-29', TODAY])
  })
})
