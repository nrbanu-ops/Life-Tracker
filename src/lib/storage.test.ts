import { describe, expect, it } from 'vitest'
import type { JournalEntry } from '../db/types'
import { formatBytes, heaviestDays } from './storage'

describe('formatBytes', () => {
  it('uses the unit that keeps the number short, with a Turkish comma', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(940)).toBe('940 B')
    expect(formatBytes(91_200)).toBe('91,2 kB')
    expect(formatBytes(1_400_000)).toBe('1,4 MB')
    expect(formatBytes(184_000_000)).toBe('184 MB')
    expect(formatBytes(2_100_000_000)).toBe('2,1 GB')
  })

  it('says nothing rather than something wrong for a missing number', () => {
    expect(formatBytes(Number.NaN)).toBe('—')
    expect(formatBytes(-1)).toBe('—')
  })
})

describe('heaviestDays', () => {
  const photo = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' })
  const entry = (id: string, date: string, photos: Blob[]): JournalEntry => ({
    id,
    date,
    text: '',
    createdAt: `${date}T09:00:00`,
    photos,
  })

  it('adds up a day across its entries and puts the heaviest first', () => {
    const days = heaviestDays([
      entry('a', '2026-11-08', [photo(100), photo(100)]),
      entry('b', '2026-11-08', [photo(50)]),
      entry('c', '2026-11-02', [photo(900)]),
      entry('d', '2026-11-01', []),
    ])
    expect(days).toEqual([
      { date: '2026-11-02', photos: 1, bytes: 900 },
      { date: '2026-11-08', photos: 3, bytes: 250 },
    ])
  })

  it('counts the photo of an entry written before several were allowed', () => {
    const old: JournalEntry = { id: 'o', date: '2026-01-05', text: '', createdAt: '', photo: photo(70) }
    expect(heaviestDays([old])).toEqual([{ date: '2026-01-05', photos: 1, bytes: 70 }])
  })

  it('keeps the list short and breaks ties by date', () => {
    const entries = ['2026-03-01', '2026-02-01', '2026-01-01', '2026-04-01', '2026-05-01', '2026-06-01'].map(
      (date) => entry(date, date, [photo(10)]),
    )
    expect(heaviestDays(entries).map((d) => d.date)).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
    ])
    expect(heaviestDays(entries, 2)).toHaveLength(2)
  })
})
