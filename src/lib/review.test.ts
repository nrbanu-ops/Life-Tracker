import { describe, expect, it } from 'vitest'
import type { Habit, JournalEntry } from '../db/types'
import { buildReviewRequest, hasRecentReview, reviewDays } from './review'

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

describe('weekly review', () => {
  it('covers the last seven days, today included', () => {
    expect(reviewDays('2026-11-01')).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ])
  })

  it('writes mood, habits, notes and weekly goals into the request, leaving old reviews out', () => {
    const text = buildReviewRequest(
      {
        habits: [habit('Koşu'), habit('Yüzme', { frequency: { type: 'timesPerWeek', count: 3 } })],
        logs: [
          { id: '1', habitId: 'Koşu', date: '2026-10-31', status: 'done' },
          { id: '2', habitId: 'Yüzme', date: '2026-10-30', status: 'done' },
        ],
        moods: [{ date: '2026-10-31', mood: 4, energy: 2 }],
        journal: [
          { id: 'j', date: '2026-10-31', text: 'Güzel bir gündü', createdAt: '' },
          { id: 'r', date: '2026-10-31', text: 'eski özet', kind: 'review', createdAt: '' },
        ],
        tasks: [],
      },
      '2026-11-01',
    )
    expect(text).toContain('31 Ekim Cumartesi · ruh hali 4/5 · enerji 2/5 · yaptıkları: Koşu')
    expect(text).toContain('30 Ekim Cuma · yaptıkları: Yüzme · yapmadıkları: Koşu')
    expect(text).toContain('Günlük: Güzel bir gündü')
    expect(text).toContain('- Yüzme: 1/3')
    expect(text).not.toContain('eski özet')
  })

  it('knows when this week already has a review', () => {
    const review = (date: string): JournalEntry => ({ id: date, date, text: 'x', kind: 'review', createdAt: '' })
    expect(hasRecentReview([review('2026-10-27')], '2026-11-01')).toBe(true)
    expect(hasRecentReview([review('2026-10-25')], '2026-11-01')).toBe(false)
  })
})
