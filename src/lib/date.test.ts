import { describe, expect, it } from 'vitest'
import { fromDateKey, toDateKey, weekdayOf } from './date'

describe('date keys', () => {
  it('formats in local time without UTC shift', () => {
    expect(toDateKey(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01')
    expect(toDateKey(new Date(2026, 0, 2, 0, 1))).toBe('2026-01-02')
  })

  it('round-trips a key', () => {
    expect(toDateKey(fromDateKey('2026-10-31'))).toBe('2026-10-31')
  })

  it('numbers weekdays from Monday = 1 to Sunday = 7', () => {
    expect(weekdayOf('2026-11-02')).toBe(1)
    expect(weekdayOf('2026-11-01')).toBe(7)
  })
})
