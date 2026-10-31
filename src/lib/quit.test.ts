import { describe, expect, it } from 'vitest'
import type { Habit } from '../db/types'
import { formatElapsed, milestoneProgress, pendingCelebration, quitStats } from './quit'

const HOUR = 3_600_000
const DAY = 24 * HOUR

const quit = (extra: Partial<Habit> = {}): Habit => ({
  id: 'q',
  title: 'Sigara',
  kind: 'quit',
  frequency: { type: 'daily' },
  archived: false,
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  quitStartedAt: '2026-10-01T00:00:00.000Z',
  ...extra,
})

const at = (iso: string) => new Date(iso)

describe('quitStats', () => {
  it('counts from the quit date without restarts', () => {
    const stats = quitStats(quit(), at('2026-10-09T06:00:00.000Z'))
    expect(stats.currentMs).toBe(8 * DAY + 6 * HOUR)
    expect(stats.longestMs).toBe(stats.currentMs)
    expect(stats.reached?.label).toBe('1 hafta')
    expect(stats.next?.label).toBe('2 hafta')
  })

  it('restarts the counter and keeps the longest run', () => {
    const habit = quit({ relapses: ['2026-10-11T00:00:00.000Z'] })
    const stats = quitStats(habit, at('2026-10-13T00:00:00.000Z'))
    expect(stats.currentMs).toBe(2 * DAY)
    expect(stats.longestMs).toBe(10 * DAY)
    expect(stats.restarts).toBe(1)
    expect(stats.reached?.label).toBe('1 gün')
  })

  it('ignores restarts from before an edited start date', () => {
    const habit = quit({ relapses: ['2026-09-20T00:00:00.000Z'] })
    const stats = quitStats(habit, at('2026-10-02T00:00:00.000Z'))
    expect(stats.restarts).toBe(0)
    expect(stats.currentMs).toBe(DAY)
  })
})

describe('formatElapsed', () => {
  it('picks the two largest units', () => {
    expect(formatElapsed(12 * DAY + 4 * HOUR + 59_000)).toBe('12 gün 4 sa')
    expect(formatElapsed(3 * DAY)).toBe('3 gün')
    expect(formatElapsed(4 * HOUR + 12 * 60_000)).toBe('4 sa 12 dk')
    expect(formatElapsed(30_000)).toBe('Az önce')
  })
})

describe('milestones', () => {
  it('measures progress between milestones', () => {
    // 5 days: between 3 days and 1 week, halfway.
    const stats = quitStats(quit(), at('2026-10-06T00:00:00.000Z'))
    expect(milestoneProgress(stats)).toBeCloseTo(0.5)
  })

  it('celebrates each milestone once per run', () => {
    const now = at('2026-10-08T00:00:00.000Z')
    expect(pendingCelebration(quit(), quitStats(quit(), now))?.label).toBe('1 hafta')
    const celebrated = quit({ celebratedMilestone: 7 })
    expect(pendingCelebration(celebrated, quitStats(celebrated, now))).toBeUndefined()
  })
})
