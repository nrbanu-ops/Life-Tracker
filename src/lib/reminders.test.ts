import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_REMINDER, loadReminder, parseTime, reminderTime } from './reminders'

function fakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    set: (k: string, v: string) => void map.set(k, v),
  }
}

describe('parseTime', () => {
  it('reads what a time input gives', () => {
    expect(parseTime('21:00')).toEqual({ hour: 21, minute: 0 })
    expect(parseTime('07:45')).toEqual({ hour: 7, minute: 45 })
    expect(parseTime(' 9:05 ')).toEqual({ hour: 9, minute: 5 })
  })

  it('refuses anything that is not a time of day', () => {
    expect(parseTime('')).toBeUndefined()
    expect(parseTime('24:00')).toBeUndefined()
    expect(parseTime('21:60')).toBeUndefined()
    expect(parseTime('akşam')).toBeUndefined()
  })
})

describe('reminderTime', () => {
  it('pads both halves for the input', () => {
    expect(reminderTime({ on: true, hour: 7, minute: 5 })).toBe('07:05')
    expect(reminderTime({ on: true, hour: 21, minute: 0 })).toBe('21:00')
  })
})

describe('loadReminder', () => {
  let store: ReturnType<typeof fakeStorage>
  beforeEach(() => {
    store = fakeStorage()
    vi.stubGlobal('localStorage', store)
  })

  it('is off until it is set', () => {
    expect(loadReminder()).toEqual(DEFAULT_REMINDER)
  })

  it('reads back what was stored', () => {
    store.set('life-tracker:reminder', JSON.stringify({ on: true, hour: 7, minute: 30 }))
    expect(loadReminder()).toEqual({ on: true, hour: 7, minute: 30 })
  })

  it('falls back rather than trusting a broken or impossible value', () => {
    store.set('life-tracker:reminder', 'not json')
    expect(loadReminder()).toEqual(DEFAULT_REMINDER)
    store.set('life-tracker:reminder', JSON.stringify({ on: true, hour: 99, minute: 0 }))
    expect(loadReminder()).toEqual(DEFAULT_REMINDER)
  })
})
