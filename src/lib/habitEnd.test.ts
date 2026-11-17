import { describe, expect, it } from 'vitest'
import type { Habit } from '../db/types'
import { capAtEnd, describeEnd, endedHabits, endIn, extendedEnd, hasEnded } from './habitEnd'

const habit = (id: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  title: id,
  kind: 'check',
  frequency: { type: 'daily' },
  archived: false,
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra,
})

const TODAY = '2026-11-17'

describe('hasEnded / capAtEnd', () => {
  it('runs through its last day and stops after it', () => {
    const h = habit('a', { endDate: '2026-11-16' })
    expect(hasEnded(h, '2026-11-16')).toBe(false)
    expect(hasEnded(h, TODAY)).toBe(true)
    expect(capAtEnd(h, TODAY)).toBe('2026-11-16')
    expect(capAtEnd(h, '2026-11-10')).toBe('2026-11-10')
  })

  it('never ends without an end date', () => {
    expect(hasEnded(habit('a'), '2099-01-01')).toBe(false)
    expect(capAtEnd(habit('a'), TODAY)).toBe(TODAY)
  })
})

describe('endedHabits', () => {
  it('lists the active habits past their last day, the longest waiting first', () => {
    const habits = [
      habit('later', { endDate: '2026-11-16' }),
      habit('first', { endDate: '2026-11-01' }),
      habit('lastDay', { endDate: TODAY }),
      habit('open'),
      habit('archived', { endDate: '2026-10-01', archived: true }),
      habit('quit', { endDate: '2026-10-01', kind: 'quit' }),
    ]
    expect(endedHabits(habits, TODAY).map((h) => h.id)).toEqual(['first', 'later'])
  })
})

describe('extendedEnd', () => {
  it('adds the months to the old last day', () => {
    expect(extendedEnd({ endDate: '2026-11-30' }, 1, TODAY)).toBe('2026-12-30')
  })

  it('counts from today when the old last day is behind it', () => {
    expect(extendedEnd({ endDate: '2026-11-16' }, 3, TODAY)).toBe('2027-02-17')
    expect(extendedEnd({}, 1, TODAY)).toBe('2026-12-17')
  })

  it('counts the form shortcuts from today', () => {
    expect(endIn(6, TODAY)).toBe('2027-05-17')
  })
})

describe('describeEnd', () => {
  it('reads the end date in the words a row uses', () => {
    expect(describeEnd({}, TODAY)).toBeUndefined()
    expect(describeEnd({ endDate: '2026-11-30' }, TODAY)).toBe('bitiş 30 Kasım')
    expect(describeEnd({ endDate: TODAY }, TODAY)).toBe('bugün son gün')
    expect(describeEnd({ endDate: '2026-11-15' }, TODAY)).toBe('bitti (15 Kasım)')
    expect(describeEnd({ endDate: '2027-02-01' }, TODAY)).toBe('bitiş 1 Şubat 2027')
  })
})
