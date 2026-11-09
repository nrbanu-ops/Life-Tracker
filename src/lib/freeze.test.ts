import { describe, expect, it } from 'vitest'
import type { Habit, HabitFrequency, HabitLog, HabitLogStatus } from '../db/types'
import { freezeOffers, freezesLeft, freezesUsed, FREEZE_PER_MONTH, monthOf } from './freeze'

const habit = (id: string, extra: Partial<Habit> = {}, frequency: HabitFrequency = { type: 'daily' }): Habit => ({
  id,
  title: id,
  kind: 'check',
  frequency,
  archived: false,
  order: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  ...extra,
})

const log = (habitId: string, date: string, status: HabitLogStatus = 'done'): HabitLog => ({
  id: `${habitId}-${date}`,
  habitId,
  date,
  status,
})

/** Day keys for the given days of November 2026. */
const nov = (...days: number[]) => days.map((d) => `2026-11-${String(d).padStart(2, '0')}`)

// 2026-11-09 is a Monday.
const TODAY = '2026-11-09'

describe('the monthly allowance', () => {
  it('counts only frozen days, and only in that month', () => {
    const logs = [
      log('a', '2026-11-02', 'frozen'),
      log('a', '2026-11-03', 'skipped'),
      log('b', '2026-10-30', 'frozen'),
      log('b', '2026-11-05', 'done'),
    ]
    expect(freezesUsed(logs, TODAY)).toBe(1)
    expect(freezesLeft(logs, TODAY)).toBe(FREEZE_PER_MONTH - 1)
    expect(freezesUsed(logs, '2026-10-15')).toBe(1)
  })

  it('never goes below zero', () => {
    const logs = nov(1, 2, 3).map((d) => log('a', d, 'frozen'))
    expect(freezesLeft(logs, TODAY)).toBe(0)
  })

  it('reads the month off a day key', () => {
    expect(monthOf('2026-11-09')).toBe('2026-11')
  })
})

describe('freezeOffers', () => {
  const kept = (id: string, days: number[]) => days.map((d) => log(id, `2026-11-${String(d).padStart(2, '0')}`))

  it('offers the most recent missed day when a real streak is behind it', () => {
    // Kept 2–7 November, missed the 8th, nothing marked for today yet.
    const logs = kept('a', [2, 3, 4, 5, 6, 7])
    const [offer, ...rest] = freezeOffers([habit('a')], logs, TODAY)
    expect(rest).toEqual([])
    expect(offer.date).toBe('2026-11-08')
    expect(offer.streak).toBe(6)
  })

  it('says nothing when the streak before the miss is too short', () => {
    expect(freezeOffers([habit('a')], kept('a', [6, 7]), TODAY)).toEqual([])
  })

  it('says nothing once a second day was missed: that streak is already gone', () => {
    // Kept 2–5, missed the 6th and the 8th; the 6th already broke it.
    const logs = [...kept('a', [2, 3, 4, 5]), ...kept('a', [7])]
    expect(freezeOffers([habit('a')], logs, TODAY)).toEqual([])
  })

  it('does not reach back past the window', () => {
    // Missed 1 November, kept every day since: too old to bring up now.
    const logs = kept('a', [2, 3, 4, 5, 6, 7, 8])
    expect(freezeOffers([habit('a')], logs, '2026-11-20')).toEqual([])
  })

  it('leaves skipped and already frozen days alone', () => {
    const skipped = [...kept('a', [2, 3, 4, 5, 6, 7]), log('a', '2026-11-08', 'skipped')]
    expect(freezeOffers([habit('a')], skipped, TODAY)).toEqual([])
    const frozen = [...kept('a', [2, 3, 4, 5, 6, 7]), log('a', '2026-11-08', 'frozen')]
    expect(freezeOffers([habit('a')], frozen, TODAY)).toEqual([])
  })

  it('counts a frozen day inside the streak as kept', () => {
    // 2–4 kept, the 5th was already held, 6–7 kept, the 8th missed.
    const logs = [...kept('a', [2, 3, 4]), log('a', '2026-11-05', 'frozen'), ...kept('a', [6, 7])]
    expect(freezeOffers([habit('a')], logs, TODAY)[0].streak).toBe(5)
  })

  it('ignores today, which is not missed yet', () => {
    const logs = kept('a', [2, 3, 4, 5, 6, 7, 8])
    expect(freezeOffers([habit('a')], logs, TODAY)).toEqual([])
  })

  it('leaves out weekly goals, quit habits and archived ones', () => {
    const weekly = habit('w', {}, { type: 'timesPerWeek', count: 3 })
    const quit = habit('q', { kind: 'quit' })
    const gone = habit('x', { archived: true })
    const logs = [...kept('w', [2, 3, 4, 5, 6, 7]), ...kept('q', [2, 3, 4, 5, 6, 7]), ...kept('x', [2, 3, 4, 5, 6, 7])]
    expect(freezeOffers([weekly, quit, gone], logs, TODAY)).toEqual([])
  })

  it('skips days the habit was never planned for', () => {
    // Weekdays only: kept Monday 2 – Friday 6, missed Monday 9. The weekend in between is
    // not planned, so it neither breaks the run nor gets offered as the missed day.
    const weekdays = habit('a', {}, { type: 'weekdays', days: [1, 2, 3, 4, 5] })
    const logs = kept('a', [2, 3, 4, 5, 6])
    const [offer] = freezeOffers([weekdays], logs, '2026-11-10')
    expect(offer.date).toBe('2026-11-09')
    expect(offer.streak).toBe(5)
  })

  it('puts the longest streak first', () => {
    const logs = [...kept('a', [5, 6, 7]), ...kept('b', [2, 3, 4, 5, 6, 7])]
    expect(freezeOffers([habit('a'), habit('b')], logs, TODAY).map((o) => o.habit.id)).toEqual(['b', 'a'])
  })
})
