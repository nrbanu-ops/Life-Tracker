import { describe, expect, it } from 'vitest'
import type { Habit, HabitFrequency, HabitLog } from '../db/types'
import { CHAIN_LENGTH, habitChain, holds, trackedFor } from './chain'
import { streaks } from './stats'

const habit = (frequency: HabitFrequency, createdAt = '2026-01-01T00:00:00.000Z', extra: Partial<Habit> = {}): Habit => ({
  id: 'h',
  title: 'h',
  kind: 'check',
  frequency,
  archived: false,
  order: 0,
  createdAt,
  ...extra,
})

const log = (date: string, status: HabitLog['status'] = 'done'): HabitLog => ({
  id: date,
  habitId: 'h',
  date,
  status,
})

// A Wednesday.
const TODAY = '2026-10-28'

const states = (links: { state: string }[]) => links.map((l) => l.state)

/** Links that hold at the end of the chain, not counting a link that is still open. */
const tail = (links: { state: Parameters<typeof holds>[0] }[]) => {
  let n = 0
  for (const link of [...links].reverse()) {
    if (link.state === 'open') continue
    if (!holds(link.state)) break
    if (link.state !== 'excused') n++
  }
  return n
}

describe('habitChain', () => {
  it('shows the last planned days, today last and still open', () => {
    const links = habitChain(habit({ type: 'daily' }), [log('2026-10-27'), log('2026-10-26', 'minimum')], TODAY)
    expect(links).toHaveLength(CHAIN_LENGTH.day)
    expect(links.at(-1)).toEqual({ key: TODAY, state: 'open' })
    expect(states(links.slice(-4))).toEqual(['missed', 'minimum', 'done', 'open'])
  })

  it('runs through skipped and frozen days, and breaks on a half-done one', () => {
    const links = habitChain(
      habit({ type: 'daily' }),
      [log('2026-10-24', 'partial'), log('2026-10-25'), log('2026-10-26', 'skipped'), log('2026-10-27', 'frozen'), log(TODAY)],
      TODAY,
    )
    expect(states(links.slice(-5))).toEqual(['missed', 'done', 'excused', 'excused', 'done'])
  })

  it('leaves out the days a habit is not planned on', () => {
    // Monday, Wednesday, Friday.
    const links = habitChain(habit({ type: 'weekdays', days: [1, 3, 5] }), [log('2026-10-26')], TODAY)
    expect(links.slice(-3).map((l) => l.key)).toEqual(['2026-10-23', '2026-10-26', TODAY])
    expect(states(links.slice(-3))).toEqual(['missed', 'done', 'open'])
  })

  it('starts where the habit starts', () => {
    const links = habitChain(habit({ type: 'daily' }, '2026-10-26T08:00:00.000Z'), [log('2026-10-26')], TODAY)
    expect(states(links)).toEqual(['done', 'missed', 'open'])
  })

  it('makes one link of each week for a weekly goal', () => {
    const links = habitChain(
      habit({ type: 'timesPerWeek', count: 2 }, '2026-10-05T00:00:00.000Z'),
      // Week of the 5th: twice. Week of the 12th: once. Week of the 19th: twice. This week: once so far.
      [log('2026-10-05'), log('2026-10-07'), log('2026-10-13'), log('2026-10-20'), log('2026-10-22'), log('2026-10-26')],
      TODAY,
    )
    expect(links.map((l) => l.key)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
    expect(states(links)).toEqual(['done', 'missed', 'done', 'open'])
  })

  it('makes one link of each month or year for a long goal', () => {
    const monthly = habitChain(
      habit({ type: 'timesPerMonth', count: 1 }, '2026-08-10T00:00:00.000Z'),
      [log('2026-08-20'), log('2026-10-02')],
      TODAY,
    )
    expect(states(monthly)).toEqual(['done', 'missed', 'done'])
    const yearly = habitChain(habit({ type: 'timesPerYear', count: 1 }, '2024-03-01T00:00:00.000Z'), [log('2025-06-01')], TODAY)
    expect(states(yearly)).toEqual(['missed', 'done', 'open'])
  })

  it('makes one link of each turn of an "every N months" habit, a passed deadline being a break', () => {
    const links = habitChain(
      habit({ type: 'everyMonths', months: 3 }, '2025-01-01T00:00:00.000Z'),
      // Due 1 Jan 2025, done in time; due 10 Apr, a whole interval (10 Jul) passes; done in August.
      [log('2025-01-10'), log('2025-08-01')],
      TODAY,
    )
    // After August: due 1 Nov 2025, deadlines 1 Feb, 1 May and 1 Aug 2026 went by.
    expect(states(links)).toEqual(['done', 'missed', 'done', 'missed', 'missed', 'missed', 'open'])
  })

  it('has nothing for a quit habit', () => {
    expect(habitChain(habit({ type: 'daily' }, undefined, { kind: 'quit' }), [], TODAY)).toEqual([])
  })

  it('ends in as many holding links as the current streak', () => {
    const cases: [Habit, HabitLog[]][] = [
      [habit({ type: 'daily' }), [log('2026-10-24'), log('2026-10-25'), log('2026-10-26', 'skipped'), log('2026-10-27', 'minimum')]],
      [habit({ type: 'weekdays', days: [1, 3, 5] }), [log('2026-10-21'), log('2026-10-23'), log('2026-10-26'), log(TODAY)]],
      [
        habit({ type: 'timesPerWeek', count: 1 }, '2026-10-05T00:00:00.000Z'),
        [log('2026-10-13'), log('2026-10-20'), log('2026-10-27')],
      ],
      [habit({ type: 'everyMonths', months: 3 }, '2026-01-01T00:00:00.000Z'), [log('2026-01-05'), log('2026-04-10'), log('2026-07-01')]],
    ]
    for (const [h, logs] of cases) {
      expect(tail(habitChain(h, logs, TODAY))).toBe(streaks(h, logs, TODAY).current)
    }
  })
})

describe('trackedFor', () => {
  const since = (created: string) => trackedFor(habit({ type: 'daily' }, `${created}T09:00:00.000Z`), TODAY)

  it('speaks in the unit that fits the length', () => {
    expect(since(TODAY)).toBe('bugün başladı')
    expect(since('2026-10-23')).toBe('5 gündür')
    expect(since('2026-10-07')).toBe('3 haftadır')
    expect(since('2026-03-28')).toBe('7 aydır')
    expect(since('2024-10-01')).toBe('2 yıldır')
  })
})
