import { describe, expect, it } from 'vitest'
import type { Habit, HabitFrequency, HabitLog } from '../db/types'
import { weekRange } from './date'
import { buildToday, dayProgress, isShownOn, nextStatus, tapResult, withAmount } from './today'

const habit = (id: string, frequency: HabitFrequency, extra: Partial<Habit> = {}): Habit => ({
  id,
  title: id,
  kind: 'check',
  frequency,
  archived: false,
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra,
})

const log = (habitId: string, date: string, status: HabitLog['status'] = 'done'): HabitLog => ({
  id: `${habitId}-${date}`,
  habitId,
  date,
  status,
})

// 2026-10-28 is a Wednesday.
const WED = '2026-10-28'

describe('weekRange', () => {
  it('runs Monday to Sunday', () => {
    expect(weekRange(WED)).toEqual({ start: '2026-10-26', end: '2026-11-01' })
    expect(weekRange('2026-11-01')).toEqual({ start: '2026-10-26', end: '2026-11-01' })
  })
})

describe('isShownOn', () => {
  it('shows weekday habits only on their days', () => {
    expect(isShownOn(habit('a', { type: 'weekdays', days: [3] }), WED)).toBe(true)
    expect(isShownOn(habit('a', { type: 'weekdays', days: [1, 5] }), WED)).toBe(false)
  })

  it('shows daily and times-per-week habits every day', () => {
    expect(isShownOn(habit('a', { type: 'daily' }), WED)).toBe(true)
    expect(isShownOn(habit('a', { type: 'timesPerWeek', count: 2 }), WED)).toBe(true)
  })
})

describe('nextStatus', () => {
  it('cycles through minimum when the habit has one', () => {
    expect(nextStatus(undefined, true)).toBe('done')
    expect(nextStatus('done', true)).toBe('minimum')
    expect(nextStatus('minimum', true)).toBeUndefined()
  })

  it('toggles done without a minimum version', () => {
    expect(nextStatus(undefined, false)).toBe('done')
    expect(nextStatus('done', false)).toBeUndefined()
  })
})

describe('tapResult', () => {
  const water = habit('w', { type: 'daily' }, { kind: 'count', target: 8, unit: 'bardak', increment: 2 })

  it('follows the status cycle for check habits', () => {
    const run = habit('r', { type: 'daily' }, { minimumVersion: '10 dk' })
    expect(tapResult(run, undefined)).toEqual({ status: 'done' })
    expect(tapResult(run, { status: 'done' })).toEqual({ status: 'minimum' })
    expect(tapResult(run, { status: 'minimum' })).toBeUndefined()
  })

  it('adds the increment until the target is reached', () => {
    expect(tapResult(water, undefined)).toEqual({ status: 'partial', value: 2 })
    expect(tapResult(water, { status: 'partial', value: 6 })).toEqual({ status: 'done', value: 8 })
    expect(tapResult(water, { status: 'done', value: 8 })).toEqual({ status: 'done', value: 10 })
  })

  it('uses 5 minutes as the default step for duration habits', () => {
    const read = habit('b', { type: 'daily' }, { kind: 'duration', target: 30 })
    expect(tapResult(read, undefined)).toEqual({ status: 'partial', value: 5 })
  })

  it('clears a skipped day', () => {
    expect(tapResult(water, { status: 'skipped' })).toBeUndefined()
  })
})

describe('withAmount', () => {
  const water = habit('w', { type: 'daily' }, { kind: 'count', target: 8 })

  it('keeps a minimum below the target and clears at zero', () => {
    expect(withAmount(water, 3, 'minimum')).toEqual({ status: 'minimum', value: 3 })
    expect(withAmount(water, 0, 'partial')).toBeUndefined()
    expect(withAmount(water, 0, 'minimum')).toEqual({ status: 'minimum' })
  })
})

describe('buildToday', () => {
  it('skips archived habits and attaches today’s status', () => {
    const items = buildToday(
      [habit('a', { type: 'daily' }), habit('b', { type: 'daily' }, { archived: true })],
      [log('a', WED, 'minimum'), log('a', '2026-10-27')],
      WED,
    )
    expect(items).toHaveLength(1)
    expect(items[0].status).toBe('minimum')
  })

  it('counts this week only for times-per-week habits', () => {
    const items = buildToday(
      [habit('a', { type: 'timesPerWeek', count: 3 })],
      [log('a', '2026-10-25'), log('a', '2026-10-26'), log('a', WED)],
      WED,
    )
    expect(items[0].weekCount).toBe(2)
    expect(items[0].countsToday).toBe(true)
  })

  it('leaves a met weekly target out of the day ring unless done today', () => {
    const items = buildToday(
      [habit('a', { type: 'timesPerWeek', count: 2 }), habit('b', { type: 'daily' })],
      [log('a', '2026-10-26'), log('a', '2026-10-27')],
      WED,
    )
    expect(items[0].countsToday).toBe(false)
    expect(dayProgress(items)).toEqual({ done: 0, total: 1 })
  })

  it('leaves skipped and partial days out of the completed count', () => {
    const items = buildToday(
      [
        habit('a', { type: 'daily' }),
        habit('b', { type: 'daily' }, { kind: 'count', target: 8 }),
        habit('c', { type: 'timesPerWeek', count: 2 }),
      ],
      [
        log('a', WED, 'skipped'),
        { ...log('b', WED, 'partial'), value: 3 },
        log('c', '2026-10-26', 'skipped'),
      ],
      WED,
    )
    expect(items[1].value).toBe(3)
    expect(items[2].weekCount).toBe(0)
    expect(dayProgress(items)).toEqual({ done: 0, total: 2 })
  })
})
