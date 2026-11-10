import { describe, expect, it } from 'vitest'
import type { Habit, HabitFrequency, HabitLog } from '../db/types'
import { weekRange } from './date'
import {
  buildToday,
  dayProgress,
  isShownOn,
  isWeeklyGoal,
  nextStatus,
  partOfDay,
  sortByDayPart,
  splitDone,
  splitFocus,
  tapResult,
  weekProgress,
  withAmount,
} from './today'

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

describe('weekly goals', () => {
  it('tells weekly goals from daily ones', () => {
    expect(isWeeklyGoal(habit('a', { type: 'timesPerWeek', count: 3 }))).toBe(true)
    expect(isWeeklyGoal(habit('a', { type: 'weekdays', days: [1] }))).toBe(false)
  })

  it('counts weekly goals already reached this week', () => {
    const items = buildToday(
      [habit('a', { type: 'timesPerWeek', count: 2 }), habit('b', { type: 'timesPerWeek', count: 3 }), habit('c', { type: 'daily' })],
      [log('a', '2026-10-26'), log('a', '2026-10-27'), log('b', WED)],
      WED,
    )
    expect(weekProgress(items)).toEqual({ done: 1, total: 2 })
  })
})

describe('splitDone', () => {
  const item = (id: string, status?: HabitLog['status']) => ({
    habit: habit(id, { type: 'daily' }),
    status,
    countsToday: true,
  })

  it('keeps done and minimum on the finished side, everything else open', () => {
    const items = [item('a', 'done'), item('b'), item('c', 'minimum'), item('d', 'partial'), item('e', 'skipped')]
    const { open, done } = splitDone(items)
    expect(open.map((i) => i.habit.id)).toEqual(['b', 'd', 'e'])
    expect(done.map((i) => i.habit.id)).toEqual(['a', 'c'])
  })

  it('keeps the order of the list', () => {
    const { open } = splitDone([item('a'), item('b', 'done'), item('c')])
    expect(open.map((i) => i.habit.id)).toEqual(['a', 'c'])
  })
})

describe('splitFocus', () => {
  const item = (id: string, focus?: boolean) => ({
    habit: habit(id, { type: 'daily' }, { focus }),
    countsToday: true,
  })

  it('pulls the keystone habits out, keeping both sides in order', () => {
    const { focus, rest } = splitFocus([item('a'), item('b', true), item('c'), item('d', true)])
    expect(focus.map((i) => i.habit.id)).toEqual(['b', 'd'])
    expect(rest.map((i) => i.habit.id)).toEqual(['a', 'c'])
  })

  it('leaves everything in rest when nothing is marked', () => {
    const { focus, rest } = splitFocus([item('a'), item('b')])
    expect(focus).toEqual([])
    expect(rest).toHaveLength(2)
  })
})

describe('partOfDay', () => {
  it('ends the morning at noon and starts the evening at six', () => {
    expect(partOfDay(0)).toBe('morning')
    expect(partOfDay(11)).toBe('morning')
    expect(partOfDay(12)).toBe('day')
    expect(partOfDay(17)).toBe('day')
    expect(partOfDay(18)).toBe('evening')
    expect(partOfDay(23)).toBe('evening')
  })
})

describe('sortByDayPart', () => {
  const item = (id: string, when?: Habit['when']) => ({
    habit: habit(id, { type: 'daily' }, { when }),
    countsToday: true,
  })
  const list = [item('any1'), item('eve', 'evening'), item('morn', 'morning'), item('noon', 'day'), item('any2')]
  const ids = (now: 'morning' | 'day' | 'evening') => sortByDayPart(list, now).map((i) => i.habit.id)

  it('leads with this part of the day, then anything untimed, then what comes later', () => {
    expect(ids('morning')).toEqual(['morn', 'any1', 'any2', 'noon', 'eve'])
  })

  it('moves what already had its moment to the end', () => {
    expect(ids('day')).toEqual(['noon', 'any1', 'any2', 'eve', 'morn'])
    expect(ids('evening')).toEqual(['eve', 'any1', 'any2', 'morn', 'noon'])
  })

  it('keeps the stored order inside a part and leaves the input alone', () => {
    const two = [item('b', 'morning'), item('a', 'morning'), item('c')]
    expect(sortByDayPart(two, 'morning').map((i) => i.habit.id)).toEqual(['b', 'a', 'c'])
    expect(two.map((i) => i.habit.id)).toEqual(['b', 'a', 'c'])
  })

  it('changes nothing when no habit has a time', () => {
    const plain = [item('x'), item('y'), item('z')]
    expect(sortByDayPart(plain, 'evening').map((i) => i.habit.id)).toEqual(['x', 'y', 'z'])
  })
})
