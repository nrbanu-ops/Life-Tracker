import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog } from '../db/types'
import { monthCardDue, monthReview, monthReviewRange } from './monthReview'

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

/** `count` done days from the 1st of a month ('YYYY-MM'). */
const kept = (id: string, month: string, count: number): HabitLog[] =>
  Array.from({ length: count }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`
    return { id: `${id}-${date}`, habitId: id, date, status: 'done' as const }
  })

// Looking back from November: October (31 days) against September (30 days).
const TODAY = '2026-11-03'

describe('monthReviewRange', () => {
  it('covers the two calendar months before this one', () => {
    expect(monthReviewRange(TODAY)).toEqual({ from: '2026-09-01', to: '2026-10-31' })
    expect(monthReviewRange('2027-01-15')).toEqual({ from: '2026-11-01', to: '2026-12-31' })
  })
})

describe('monthReview', () => {
  it('compares last month with the one before', () => {
    const logs = [...kept('a', '2026-09', 15), ...kept('a', '2026-10', 31)]
    const review = monthReview([habit('a')], logs, TODAY)!
    expect(review.month).toBe('2026-10')
    expect(review.label).toBe('Ekim')
    expect(review.beforeLabel).toBe('Eylül')
    expect(review.overall).toEqual({ done: 31, planned: 31, rate: 1 })
    expect(review.overallBefore.rate).toBe(0.5)
  })

  it('names the habit that rose most and the one that fell most', () => {
    const logs = [
      ...kept('up', '2026-09', 6),
      ...kept('up', '2026-10', 25),
      ...kept('down', '2026-09', 27),
      ...kept('down', '2026-10', 12),
      ...kept('flat', '2026-09', 15),
      ...kept('flat', '2026-10', 16),
    ]
    const review = monthReview([habit('up'), habit('down'), habit('flat')], logs, TODAY)!
    expect(review.riser?.habit.id).toBe('up')
    expect(review.faller?.habit.id).toBe('down')
    expect(review.best?.habit.id).toBe('up')
  })

  it('points at nothing when the changes are small', () => {
    const logs = [...kept('a', '2026-09', 15), ...kept('a', '2026-10', 16)]
    const review = monthReview([habit('a')], logs, TODAY)!
    expect(review.riser).toBeUndefined()
    expect(review.faller).toBeUndefined()
  })

  it('lists the habits that barely happened, worst first', () => {
    const logs = [...kept('rare', '2026-10', 3), ...kept('rarer', '2026-10', 1), ...kept('fine', '2026-10', 20)]
    const review = monthReview([habit('rare'), habit('rarer'), habit('fine')], logs, TODAY)!
    expect(review.shrink.map((row) => row.habit.id)).toEqual(['rarer', 'rare'])
  })

  it('does not compare a habit that did not exist the month before', () => {
    const fresh = habit('new', { createdAt: '2026-10-01T08:00:00.000Z' })
    const review = monthReview([fresh], kept('new', '2026-10', 20), TODAY)!
    expect(review.riser).toBeUndefined()
    expect(review.overallBefore.planned).toBe(0)
  })

  it('leaves out archived and quit habits', () => {
    const logs = [...kept('gone', '2026-10', 2), ...kept('a', '2026-10', 31)]
    const review = monthReview([habit('gone', { archived: true }), habit('q', { kind: 'quit' }), habit('a')], logs, TODAY)!
    expect(review.overall.planned).toBe(31)
    expect(review.shrink).toEqual([])
  })

  it('has nothing to say when nothing was planned last month', () => {
    const fresh = habit('new', { createdAt: '2026-11-01T08:00:00.000Z' })
    expect(monthReview([fresh], [], TODAY)).toBeUndefined()
    expect(monthReview([], [], TODAY)).toBeUndefined()
  })
})

describe('monthCardDue', () => {
  it('is true for the first week of a month only', () => {
    expect(monthCardDue('2026-12-01')).toBe(true)
    expect(monthCardDue('2026-12-07')).toBe(true)
    expect(monthCardDue('2026-12-08')).toBe(false)
    expect(monthCardDue('2026-11-30')).toBe(false)
  })
})
