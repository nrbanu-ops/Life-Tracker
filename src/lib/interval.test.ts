import { describe, expect, it } from 'vitest'
import type { Habit } from '../db/types'
import { dueDay, firstDue, intervalCycles } from './interval'

const habit = (months: number, start?: string): Habit => ({
  id: 'h',
  title: 'Diş hekimi',
  kind: 'check',
  frequency: { type: 'everyMonths', months, start },
  archived: false,
  order: 0,
  createdAt: new Date(2026, 0, 10).toISOString(),
})

describe('every N months', () => {
  it('is first due the day it was added, or on the chosen day', () => {
    expect(firstDue(habit(6))).toBe('2026-01-10')
    expect(firstDue(habit(6, '2026-03-01'))).toBe('2026-03-01')
    expect(dueDay(habit(6, '2026-03-01'), [], '2026-02-01')).toBe('2026-03-01')
  })

  it('comes due again N months after it was last done, early or late', () => {
    expect(dueDay(habit(6), ['2026-01-12'], '2026-02-01')).toBe('2026-07-12')
    // Done late in August: the next one counts from August, not from July.
    expect(dueDay(habit(6), ['2026-01-12', '2026-08-20'], '2026-09-01')).toBe('2027-02-20')
    // Order does not matter.
    expect(dueDay(habit(6), ['2026-08-20', '2026-01-12'], '2026-09-01')).toBe('2027-02-20')
  })

  it('counts a miss for every whole interval that passes without it', () => {
    // Due 10 Jan, never done: deadlines 10 Jul 2026, 10 Jan 2027 …
    expect(intervalCycles(habit(6), [], '2026-07-10')).toEqual([{ due: '2026-01-10', missed: [] }])
    expect(intervalCycles(habit(6), [], '2026-07-11')).toEqual([{ due: '2026-01-10', missed: ['2026-07-10'] }])
    expect(intervalCycles(habit(6), [], '2027-02-01').at(-1)?.missed).toEqual(['2026-07-10', '2027-01-10'])
  })

  it('does not call late a miss: only letting the whole interval go by is', () => {
    const cycles = intervalCycles(habit(6), ['2026-01-10', '2026-11-30'], '2026-12-15')
    // Due again 10 Jul, done 30 Nov: late, but before the 10 Jan 2027 deadline.
    expect(cycles[1]).toEqual({ due: '2026-07-10', doneOn: '2026-11-30', missed: [] })
    expect(cycles[2]).toEqual({ due: '2027-05-30', missed: [] })
  })

  it('keeps the day of the month where the month is long enough', () => {
    const h = habit(1, '2026-01-31')
    expect(intervalCycles(h, [], '2026-04-15')[0].missed).toEqual(['2026-02-28', '2026-03-31'])
  })
})
