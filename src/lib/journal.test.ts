import { describe, expect, it } from 'vitest'
import type { JournalEntry } from '../db/types'
import { filterEntries, groupByDay } from './journal'

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
