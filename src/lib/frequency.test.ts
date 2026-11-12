import { describe, expect, it } from 'vitest'
import { dayCount, describeFrequency, isLongGoal, nextPeriod, periodGoal, periodRange } from './frequency'

describe('describeFrequency', () => {
  it('describes daily and times per week', () => {
    expect(describeFrequency({ type: 'daily' })).toBe('Her gün')
    expect(describeFrequency({ type: 'timesPerWeek', count: 3 })).toBe('Haftada 3 kez')
  })

  it('names common weekday sets', () => {
    expect(describeFrequency({ type: 'weekdays', days: [5, 1, 2, 3, 4] })).toBe('Hafta içi')
    expect(describeFrequency({ type: 'weekdays', days: [7, 6] })).toBe('Hafta sonu')
    expect(describeFrequency({ type: 'weekdays', days: [1, 2, 3, 4, 5, 6, 7] })).toBe('Her gün')
  })

  it('lists other days in week order', () => {
    expect(describeFrequency({ type: 'weekdays', days: [5, 1, 3] })).toBe('Pzt, Çar, Cum')
  })
})

describe('period goals', () => {
  it('describes monthly and yearly goals', () => {
    expect(describeFrequency({ type: 'timesPerMonth', count: 1 })).toBe('Ayda 1 kez')
    expect(describeFrequency({ type: 'timesPerYear', count: 2 })).toBe('Yılda 2 kez')
  })

  it('reads the three "so many times" frequencies as one shape', () => {
    expect(periodGoal({ type: 'timesPerWeek', count: 3 })).toEqual({ period: 'week', count: 3 })
    expect(periodGoal({ type: 'timesPerYear', count: 1 })).toEqual({ period: 'year', count: 1 })
    expect(periodGoal({ type: 'daily' })).toBeUndefined()
    expect(periodGoal({ type: 'weekdays', days: [1] })).toBeUndefined()
  })

  it('calls only monthly and yearly goals long', () => {
    expect(isLongGoal({ frequency: { type: 'timesPerMonth', count: 2 } })).toBe(true)
    expect(isLongGoal({ frequency: { type: 'timesPerWeek', count: 2 } })).toBe(false)
    expect(isLongGoal({ frequency: { type: 'daily' } })).toBe(false)
  })

  it('finds the calendar week, month and year around a day', () => {
    // 2028 is a leap year; 2028-02-29 is a Tuesday.
    expect(periodRange('week', '2028-02-29')).toEqual({ start: '2028-02-28', end: '2028-03-05' })
    expect(periodRange('month', '2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' })
    expect(periodRange('year', '2028-02-10')).toEqual({ start: '2028-01-01', end: '2028-12-31' })
  })

  it('steps to the next period and counts days', () => {
    expect(nextPeriod('month', '2026-12-15')).toBe('2027-01-01')
    expect(nextPeriod('year', '2026-03-01')).toBe('2027-01-01')
    expect(nextPeriod('week', '2026-10-28')).toBe('2026-11-02')
    expect(dayCount('2026-02-01', '2026-02-28')).toBe(28)
    expect(dayCount('2026-10-28', '2026-10-28')).toBe(1)
  })
})

describe('every N months', () => {
  it('is described and counted among the long goals, not the period goals', () => {
    const frequency = { type: 'everyMonths', months: 6 } as const
    expect(describeFrequency(frequency)).toBe('6 ayda bir')
    expect(periodGoal(frequency)).toBeUndefined()
    expect(isLongGoal({ frequency })).toBe(true)
  })
})
