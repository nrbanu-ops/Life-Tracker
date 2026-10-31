import { describe, expect, it } from 'vitest'
import type { Habit, JournalEntry } from '../db/types'
import { filterEntries, groupByDay, memoryFor, searchEntries } from './journal'

describe('memoryFor', () => {
  const at = (id: string, date: string): JournalEntry => ({ id, date, text: id, createdAt: `${date}T09:00:00` })

  it('prefers the furthest back of a year, six months, a month and a week ago', () => {
    const list = [at('week', '2026-10-24'), at('month', '2026-09-30'), at('other', '2026-10-01')]
    expect(memoryFor(list, '2026-10-31')).toMatchObject({ label: '1 ay önce bugün', date: '2026-09-30' })
    expect(memoryFor([...list, at('year', '2025-10-31')], '2026-10-31')?.label).toBe('1 yıl önce bugün')
    expect(memoryFor([at('other', '2026-10-01')], '2026-10-31')).toBeUndefined()
  })
})

describe('searchEntries', () => {
  const base = { date: '2026-10-31', createdAt: '2026-10-31T10:00:00' }
  const list: JournalEntry[] = [
    { ...base, id: 'a', text: 'Bugün İstanbul’da yağmur vardı' },
    { ...base, id: 'b', text: 'Dizim ağrıdı', habitId: 'run' },
    { ...base, id: 'c', text: 'Kahve ve kitap' },
  ]
  const habits = new Map([['run', { title: 'Koşu' } as Habit]])

  it('matches every word, ignoring Turkish case, in the text or the habit name', () => {
    expect(searchEntries(list, 'istanbul YAĞMUR', habits).map((e) => e.id)).toEqual(['a'])
    expect(searchEntries(list, 'koşu', habits).map((e) => e.id)).toEqual(['b'])
    expect(searchEntries(list, '  ', habits)).toHaveLength(3)
  })
})

const entry = (id: string, date: string, createdAt: string, habitId?: string): JournalEntry => ({
  id,
  date,
  text: id,
  habitId,
  createdAt,
})

const entries = [
  entry('note', '2026-10-28', '2026-10-28T08:00:00Z', 'run'),
  entry('evening', '2026-10-28', '2026-10-28T21:00:00Z'),
  entry('morning', '2026-10-28', '2026-10-28T07:00:00Z'),
  entry('old', '2026-10-20', '2026-10-20T10:00:00Z'),
]

describe('groupByDay', () => {
  it('puts the newest day first, free writing before habit notes', () => {
    expect(groupByDay(entries).map((d) => [d.date, d.entries.map((e) => e.id)])).toEqual([
      ['2026-10-28', ['morning', 'evening', 'note']],
      ['2026-10-20', ['old']],
    ])
  })
})

describe('filterEntries', () => {
  it('filters free writing or one habit', () => {
    expect(filterEntries(entries, 'all')).toHaveLength(4)
    expect(filterEntries(entries, 'free').map((e) => e.id)).toEqual(['evening', 'morning', 'old'])
    expect(filterEntries(entries, 'run').map((e) => e.id)).toEqual(['note'])
  })
})
