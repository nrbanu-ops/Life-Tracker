import { describe, expect, it } from 'vitest'
import type { Habit, JournalEntry } from '../db/types'
import {
  entryPhotos,
  filterEntries,
  groupByDay,
  memoryFor,
  photosByMonth,
  searchEntries,
} from './journal'

describe('memoryFor', () => {
  const at = (id: string, date: string): JournalEntry => ({ id, date, text: id, createdAt: `${date}T09:00:00` })

  it('prefers the furthest back of a year, six months, a month and a week ago', () => {
    const list = [at('week', '2026-10-24'), at('month', '2026-09-30'), at('other', '2026-10-01')]
    expect(memoryFor(list, '2026-10-31')).toMatchObject({ label: '1 ay önce bugün', date: '2026-09-30' })
    expect(memoryFor([...list, at('year', '2025-10-31')], '2026-10-31')?.label).toBe('1 yıl önce bugün')
    expect(memoryFor([at('other', '2026-10-01')], '2026-10-31')).toBeUndefined()
  })

  it("skips the AI's weekly review, which is saved to the journal too", () => {
    const review: JournalEntry = { ...at('review', '2025-10-31'), kind: 'review' }
    expect(memoryFor([review], '2026-10-31')).toBeUndefined()
    expect(memoryFor([review, at('mine', '2025-10-31')], '2026-10-31')?.entries.map((e) => e.id)).toEqual(['mine'])
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

describe('entryPhotos', () => {
  const photo = (n: number) => new Blob([new Uint8Array([n])], { type: 'image/jpeg' })
  const base = { id: 'a', date: '2026-11-08', text: '', createdAt: '2026-11-08T09:00:00' }

  it('reads the list', () => {
    expect(entryPhotos({ ...base, photos: [photo(1), photo(2)] })).toHaveLength(2)
  })

  it('still reads an entry written before several were allowed', () => {
    const old = photo(1)
    expect(entryPhotos({ ...base, photo: old })).toEqual([old])
  })

  it('is empty for an entry with no photo', () => {
    expect(entryPhotos({})).toEqual([])
    expect(entryPhotos({ ...base, photos: [] })).toEqual([])
  })
})

describe('photosByMonth', () => {
  const photo = (n: number) => new Blob([new Uint8Array([n])], { type: 'image/jpeg' })
  const entry = (id: string, date: string, photos: Blob[]): JournalEntry => ({
    id,
    date,
    text: '',
    createdAt: `${date}T09:00:00`,
    photos,
  })
  const day = (date: string, entries: JournalEntry[]) => ({ date, entries })

  it('groups the photos of consecutive days under one month, keeping their order', () => {
    const months = photosByMonth([
      day('2026-11-08', [entry('a', '2026-11-08', [photo(1), photo(2)])]),
      day('2026-11-02', [entry('b', '2026-11-02', [photo(3)])]),
      day('2026-10-30', [entry('c', '2026-10-30', [photo(4)])]),
    ])
    expect(months.map((m) => m.month)).toEqual(['2026-11', '2026-10'])
    expect(months[0].photos.map((p) => p.id)).toEqual(['a:0', 'a:1', 'b:0'])
    expect(months[0].photos[2]).toMatchObject({ date: '2026-11-02', entryId: 'b' })
  })

  it('leaves out days without photos, and says nothing when there are none at all', () => {
    const empty = day('2026-11-07', [entry('x', '2026-11-07', [])])
    expect(photosByMonth([empty])).toEqual([])
    const months = photosByMonth([day('2026-11-08', [entry('a', '2026-11-08', [photo(1)])]), empty])
    expect(months).toHaveLength(1)
    expect(months[0].photos).toHaveLength(1)
  })

  it('still finds the photo of an entry written before several were allowed', () => {
    const old = photo(9)
    const entries = [{ id: 'o', date: '2026-01-05', text: '', createdAt: '2026-01-05T09:00:00', photo: old }]
    expect(photosByMonth([day('2026-01-05', entries)])[0].photos[0].photo).toBe(old)
  })
})
