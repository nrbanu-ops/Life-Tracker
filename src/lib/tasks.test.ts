import { describe, expect, it } from 'vitest'
import type { Task } from '../db/types'
import { compareTasks, describeDue, groupTasks, nextOccurrence, todayTasks } from './tasks'

// 2026-10-28 is a Wednesday.
const WED = '2026-10-28'

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  priority: 4,
  done: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  ...extra,
})

describe('nextOccurrence', () => {
  it('steps once when completed on time', () => {
    expect(nextOccurrence(WED, 'daily', WED)).toBe('2026-10-29')
    expect(nextOccurrence(WED, 'weekly', WED)).toBe('2026-11-04')
    expect(nextOccurrence('2026-10-31', 'monthly', '2026-10-31')).toBe('2026-11-30')
  })

  it('skips past occurrences when completed late', () => {
    expect(nextOccurrence('2026-10-20', 'daily', WED)).toBe('2026-10-29')
    // Weekly on Mondays: still lands on a Monday.
    expect(nextOccurrence('2026-10-19', 'weekly', WED)).toBe('2026-11-02')
  })

  it('keeps an early completion on schedule', () => {
    expect(nextOccurrence('2026-10-30', 'weekly', WED)).toBe('2026-11-06')
  })
})

describe('todayTasks', () => {
  it('shows overdue and today, not future or undated', () => {
    const { open } = todayTasks(
      [
        task('late', { date: '2026-10-27' }),
        task('today', { date: WED, priority: 1 }),
        task('future', { date: '2026-10-29' }),
        task('undated'),
      ],
      WED,
    )
    expect(open.map((t) => t.id)).toEqual(['today', 'late'])
  })

  it('keeps tasks completed today', () => {
    const local = (h: number) => new Date(2026, 9, 28, h).toISOString()
    const { done } = todayTasks(
      [
        task('a', { done: true, completedAt: local(9) }),
        task('b', { done: true, completedAt: new Date(2026, 9, 27, 23).toISOString() }),
      ],
      WED,
    )
    expect(done.map((t) => t.id)).toEqual(['a'])
  })
})

describe('compareTasks', () => {
  it('orders by priority, then date, then time', () => {
    const sorted = [
      task('noTime', { date: WED }),
      task('urgent', { priority: 1 }),
      task('early', { date: WED, time: '08:00' }),
      task('yesterday', { date: '2026-10-27' }),
    ].sort(compareTasks)
    expect(sorted.map((t) => t.id)).toEqual(['urgent', 'yesterday', 'early', 'noTime'])
  })
})

describe('groupTasks', () => {
  it('groups open tasks by due date', () => {
    const groups = groupTasks(
      [
        task('a', { date: '2026-10-20' }),
        task('b', { date: '2026-10-29' }),
        task('c', { date: '2026-11-01' }),
        task('d', { date: '2026-11-02' }),
        task('e'),
        task('f', { date: WED, done: true }),
      ],
      WED,
    )
    expect(groups.map((g) => [g.key, g.tasks.map((t) => t.id)])).toEqual([
      ['overdue', ['a']],
      ['tomorrow', ['b']],
      ['week', ['c']],
      ['later', ['d']],
      ['undated', ['e']],
    ])
  })
})

describe('describeDue', () => {
  it('describes due dates relative to today', () => {
    expect(describeDue(task('a', { date: '2026-10-25' }), WED)).toBe('3 gün gecikti')
    expect(describeDue(task('a', { date: WED, time: '14:00' }), WED)).toBe('Bugün 14:00')
    expect(describeDue(task('a', { date: '2026-10-30' }), WED)).toBe('Cuma')
    expect(describeDue(task('a', { date: '2026-11-15' }), WED)).toBe('15 Kas')
  })
})
