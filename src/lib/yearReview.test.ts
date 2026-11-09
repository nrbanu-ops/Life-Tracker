import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog } from '../db/types'
import { wordCount, yearCardFor, yearDays, yearsIn, yearSummary, type YearData } from './yearReview'

const habit = (id: string, title: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  title,
  kind: 'check',
  frequency: { type: 'daily' },
  archived: false,
  order: 0,
  createdAt: '2026-01-01T09:00:00',
  ...extra,
})

const log = (habitId: string, date: string, status: HabitLog['status'] = 'done'): HabitLog => ({
  id: `${habitId}-${date}`,
  habitId,
  date,
  status,
})

const empty: YearData = {
  habits: [],
  logs: [],
  journal: [],
  moods: [],
  library: [],
  tasks: [],
  projects: [],
  milestones: [],
  achievements: [],
  xpWeeks: [],
}

describe('yearDays', () => {
  it('covers a whole past year, leap years included', () => {
    expect(yearDays(2025, '2026-11-09')).toHaveLength(365)
    expect(yearDays(2024, '2026-11-09')).toHaveLength(366)
  })

  it('stops at today, so the rest of this year is not counted as missed', () => {
    const days = yearDays(2026, '2026-03-02')
    expect(days).toHaveLength(31 + 28 + 2)
    expect(days.at(-1)).toBe('2026-03-02')
  })
})

describe('wordCount', () => {
  it('counts words the way a person would', () => {
    expect(wordCount('  bugün  çok   yorgunum \n ')).toBe(3)
    expect(wordCount('')).toBe(0)
  })
})

describe('yearCardFor', () => {
  it('offers this year through December and last year until mid-January', () => {
    expect(yearCardFor('2026-12-01')).toBe(2026)
    expect(yearCardFor('2026-12-31')).toBe(2026)
    expect(yearCardFor('2027-01-15')).toBe(2026)
  })

  it('stays out of the way the rest of the year', () => {
    expect(yearCardFor('2027-01-16')).toBeUndefined()
    expect(yearCardFor('2026-11-09')).toBeUndefined()
    expect(yearCardFor('2026-06-01')).toBeUndefined()
  })
})

describe('yearsIn', () => {
  it('runs from the oldest record to this year, newest first', () => {
    const data = { ...empty, logs: [log('a', '2024-05-05')], journal: [] }
    expect(yearsIn(data, '2026-11-09')).toEqual([2026, 2025, 2024])
  })

  it('offers this year even with nothing in it', () => {
    expect(yearsIn(empty, '2026-11-09')).toEqual([2026])
  })
})

describe('yearSummary', () => {
  const data: YearData = {
    ...empty,
    habits: [habit('run', 'Koşu'), habit('read', 'Kitap')],
    logs: [
      // Three in a row, a gap, then two: the longest run is three.
      log('run', '2026-03-01'),
      log('run', '2026-03-02'),
      log('run', '2026-03-03'),
      log('run', '2026-03-05'),
      log('run', '2026-03-06'),
      log('read', '2026-03-01', 'minimum'),
      // Last year's, which must stay out of it.
      log('run', '2025-12-31'),
    ],
    journal: [
      { date: '2026-03-01', text: 'iki kelime', photos: 2, audio: true },
      { date: '2026-03-02', text: 'bir', photos: 0, audio: false },
      { date: '2026-04-10', text: 'nisan', photos: 0, audio: false },
      { date: '2026-03-08', text: 'yapay zekâ özeti', kind: 'review', photos: 0, audio: false },
    ],
    moods: [
      { date: '2026-03-01', mood: 5 },
      { date: '2026-03-02', mood: 5 },
      { date: '2026-03-03', mood: 4 },
      { date: '2026-03-04', mood: 5 },
      { date: '2026-03-05', mood: 5 },
      { date: '2026-04-01', mood: 1 },
    ],
    library: [
      { kind: 'book', title: 'Tutunamayanlar', status: 'done', finishedAt: '2026-02-10', rating: 5 },
      { kind: 'book', title: 'Kuyucaklı Yusuf', status: 'done', finishedAt: '2026-05-01', rating: 3 },
      { kind: 'movie', title: 'Bir Film', status: 'done', finishedAt: '2026-06-01' },
      { kind: 'book', title: 'Okumadığım', status: 'want' },
      { kind: 'book', title: 'Geçen yılki', status: 'done', finishedAt: '2025-12-02', rating: 5 },
    ],
    tasks: [
      { id: 't1', title: 'Fatura', priority: 2, done: true, completedAt: '2026-03-04T10:00:00', createdAt: '' },
      { id: 't2', title: 'Açık', priority: 2, done: false, createdAt: '' },
    ],
    projects: [
      { id: 'p1', title: 'Maraton', color: '#000', status: 'done', completedAt: '2026-07-01T10:00:00', createdAt: '' },
    ],
    milestones: [
      { id: 'm1', projectId: 'p1', title: '10 km', done: true, doneAt: '2026-04-01', order: 0 },
      { id: 'm2', projectId: 'p1', title: '21 km', done: false, order: 1 },
    ],
    achievements: [
      { id: 'streak-7', unlockedAt: '2026-03-03' },
      { id: 'streak-30', unlockedAt: '2025-03-03' },
    ],
    xpWeeks: [
      { week: '2026-03-02', xp: 60, days: { '2026-03-02': 25, '2026-03-03': 35 }, sources: {}, stats: {} },
      { week: '2025-12-29', xp: 10, days: { '2025-12-31': 10 }, sources: {}, stats: {} },
    ],
  }

  const summary = yearSummary(data, 2026, '2026-11-09')

  it('counts only the year asked for', () => {
    expect(summary.habits.checks).toBe(6)
    expect(summary.xp).toBe(60)
    expect(summary.achievements).toBe(1)
    expect(summary.library.finished).toBe(3)
  })

  it('finds the habit done most and the longest run inside the year', () => {
    expect(summary.habits.topHabit).toEqual({ title: 'Koşu', done: 5 })
    expect(summary.habits.bestStreak).toEqual({ title: 'Koşu', days: 3 })
  })

  it('leaves the weekly AI review out of the journal numbers', () => {
    expect(summary.journal.entries).toBe(3)
    expect(summary.journal.words).toBe(4)
    expect(summary.journal.photos).toBe(2)
    expect(summary.journal.audios).toBe(1)
    expect(summary.journal.busiest).toEqual({ month: '2026-03', count: 2 })
  })

  it('averages the mood and names the month with enough days behind it', () => {
    expect(summary.mood.average).toBeCloseTo(4.17, 1)
    // April has a single day: not a month you can call good or bad.
    expect(summary.mood.best).toEqual({ month: '2026-03', average: 4.8 })
  })

  it('groups what was finished and keeps the five-star ones', () => {
    expect(summary.library.byKind).toEqual([
      { kind: 'book', count: 2 },
      { kind: 'movie', count: 1 },
    ])
    expect(summary.library.loved.map((i) => i.title)).toEqual(['Tutunamayanlar'])
  })

  it('counts tasks, projects and the days anything happened', () => {
    expect(summary.tasks.done).toBe(1)
    expect(summary.projects).toEqual({ finished: 1, milestones: 1 })
    // 5 habit days, +1 journal (10 Nisan), +2 moods (4 Mart, 1 Nisan), +3 finished books/films;
    // the task and the milestone fall on days already counted.
    expect(summary.activeDays).toBe(11)
    expect(summary.empty).toBe(false)
  })

  it('says a year is empty rather than showing a page of zeros', () => {
    expect(yearSummary(data, 2020, '2026-11-09').empty).toBe(true)
  })
})
