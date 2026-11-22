import { describe, expect, it } from 'vitest'
import type { JournalEntry } from '../db/types'
import {
  changeOn,
  formatKg,
  longestWeighInRun,
  mostLost,
  parseKg,
  trend,
  trendChange,
  weightEta,
  weightMonths,
  weightOn,
  weightPhotos,
  weightProgress,
} from './weight'

describe('parseKg', () => {
  it('reads a comma or a dot and rounds to 0.1', () => {
    expect(parseKg('78,4')).toBe(78.4)
    expect(parseKg(' 78.46 ')).toBe(78.5)
    expect(parseKg('80')).toBe(80)
  })
  it('refuses empty, junk and unbelievable values', () => {
    expect(parseKg('')).toBeUndefined()
    expect(parseKg('abc')).toBeUndefined()
    expect(parseKg('7')).toBeUndefined()
    expect(parseKg('1000')).toBeUndefined()
  })
})

describe('formatKg', () => {
  it('uses a decimal comma and drops a needless decimal', () => {
    expect(formatKg(78.4)).toBe('78,4')
    expect(formatKg(80)).toBe('80')
  })
})

describe('trend', () => {
  it('averages the weigh-ins of the last 7 days, gaps included', () => {
    const t = trend([
      { date: '2026-11-01', kg: 80 },
      { date: '2026-11-03', kg: 78 },
      { date: '2026-11-07', kg: 79 },
      { date: '2026-11-08', kg: 77 },
    ])
    expect(t.map((p) => p.kg)).toEqual([80, 79, 79, 78])
  })
})

describe('weightProgress', () => {
  const entries = [
    { date: '2026-11-10', kg: 76 },
    { date: '2026-11-01', kg: 80 },
  ]
  it('measures from the first weigh-in to the latest', () => {
    expect(weightProgress(entries)).toEqual({ start: 80, current: 76, lost: 4 })
  })
  it('against a target: what is left and how far along', () => {
    expect(weightProgress(entries, 72)).toEqual({ start: 80, current: 76, lost: 4, left: 4, ratio: 0.5 })
  })
  it('never goes below zero left or past the whole way', () => {
    expect(weightProgress(entries, 77)).toMatchObject({ left: 0, ratio: 1 })
  })
  it('a gain counts as no progress', () => {
    expect(weightProgress([...entries, { date: '2026-11-20', kg: 82 }], 72)).toMatchObject({ lost: -2, ratio: 0 })
  })
  it('nothing to show without weigh-ins', () => {
    expect(weightProgress([], 70)).toBeUndefined()
  })
})

describe('changeOn', () => {
  const entries = [
    { date: '2026-11-01', kg: 80 },
    { date: '2026-11-04', kg: 79.5 },
  ]
  it('compares with the previous weigh-in, however long ago', () => {
    expect(changeOn(entries, '2026-11-04')).toBeCloseTo(-0.5)
  })
  it('is undefined without a weigh-in that day or one before it', () => {
    expect(changeOn(entries, '2026-11-05')).toBeUndefined()
    expect(changeOn(entries, '2026-11-01')).toBeUndefined()
  })
})

describe('trendChange', () => {
  const entries = [
    { date: '2026-11-01', kg: 80 },
    { date: '2026-11-08', kg: 79 },
    { date: '2026-11-15', kg: 78 },
  ]
  it('compares the average now with the one a week before', () => {
    expect(trendChange(entries, 7)).toBe(-1)
  })
  it('is undefined when nothing is that old', () => {
    expect(trendChange(entries, 30)).toBeUndefined()
    expect(trendChange([], 7)).toBeUndefined()
  })
})

describe('weightMonths', () => {
  it('groups by month, newest first, with the average', () => {
    const months = weightMonths([
      { date: '2026-10-30', kg: 81 },
      { date: '2026-11-02', kg: 80 },
      { date: '2026-11-09', kg: 79 },
    ])
    expect(months.map((m) => [m.month, m.average, m.entries.map((e) => e.date)])).toEqual([
      ['2026-11', 79.5, ['2026-11-09', '2026-11-02']],
      ['2026-10', 81, ['2026-10-30']],
    ])
  })
})

describe('weightOn', () => {
  const entries = [
    { date: '2026-11-01', kg: 80 },
    { date: '2026-11-05', kg: 79 },
  ]
  it("takes that day's weigh-in, else the latest before it", () => {
    expect(weightOn(entries, '2026-11-05')?.kg).toBe(79)
    expect(weightOn(entries, '2026-11-04')?.kg).toBe(80)
    expect(weightOn(entries, '2026-10-30')).toBeUndefined()
  })
})

describe('weightPhotos', () => {
  const a = new Blob(['a'])
  const b = new Blob(['b'])
  const entry = (id: string, date: string, createdAt: string, extra: Partial<JournalEntry>): JournalEntry => ({
    id, date, text: '', createdAt, ...extra,
  })
  it('only progress photos, oldest day first, each photo on its own', () => {
    const photos = weightPhotos([
      entry('2', '2026-11-09', '2026-11-09T08:00', { kind: 'weight', photos: [a, b] }),
      entry('x', '2026-11-01', '2026-11-01T08:00', { photos: [a] }),
      entry('1', '2026-11-02', '2026-11-02T08:00', { kind: 'weight', photos: [b] }),
    ])
    expect(photos.map((p) => [p.id, p.date])).toEqual([
      ['1:0', '2026-11-02'],
      ['2:0', '2026-11-09'],
      ['2:1', '2026-11-09'],
    ])
    expect(photos[2].blob).toBe(b)
  })
})

describe('weightEta', () => {
  // One weigh-in a week, 0.5 kg down each time: 0.5 kg a week.
  const weekly = (n: number, start = 80, step = 0.5) =>
    Array.from({ length: n }, (_, i) => ({ date: `2026-11-${String(1 + i * 7).padStart(2, '0')}`, kg: start - i * step }))
  it('names the day the target is reached at the recent pace', () => {
    const eta = weightEta(weekly(5), 76, '2026-11-29')
    // 78 kg now, 2 kg to go at 0.5 kg a week: 28 days after today.
    expect(eta).toEqual({ kind: 'date', date: '2026-12-27', perWeek: 0.5 })
  })
  it('says when the weight is not going down', () => {
    expect(weightEta(weekly(5, 80, 0), 76, '2026-11-29')).toMatchObject({ kind: 'stalled' })
    expect(weightEta(weekly(5, 80, -0.5), 76, '2026-11-29')).toMatchObject({ kind: 'stalled' })
  })
  it('needs a target ahead and two weeks of history', () => {
    expect(weightEta(weekly(5), undefined, '2026-11-29')).toBeUndefined()
    expect(weightEta(weekly(5), 79, '2026-11-29')).toBeUndefined()
    expect(weightEta(weekly(2), 70, '2026-11-08')).toBeUndefined()
  })
})

describe('mostLost', () => {
  it('measures to the lowest 7-day average, not to a single low morning', () => {
    expect(mostLost([
      { date: '2026-11-01', kg: 80 },
      { date: '2026-11-02', kg: 77 },
      { date: '2026-11-03', kg: 79 },
    ])).toBe(1.5)
    expect(mostLost([{ date: '2026-11-01', kg: 80 }, { date: '2026-11-20', kg: 82 }])).toBe(0)
    expect(mostLost([])).toBe(0)
  })
})

describe('longestWeighInRun', () => {
  it('counts consecutive days', () => {
    expect(longestWeighInRun([
      { date: '2026-11-01', kg: 80 },
      { date: '2026-11-02', kg: 80 },
      { date: '2026-11-04', kg: 80 },
      { date: '2026-11-05', kg: 80 },
      { date: '2026-11-06', kg: 80 },
    ])).toBe(3)
    expect(longestWeighInRun([])).toBe(0)
  })
})
