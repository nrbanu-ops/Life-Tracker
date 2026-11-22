import { describe, expect, it } from 'vitest'
import { changeOn, formatKg, parseKg, trend, weightProgress } from './weight'

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
