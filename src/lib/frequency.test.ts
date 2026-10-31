import { describe, expect, it } from 'vitest'
import { describeFrequency } from './frequency'

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
