import { describe, expect, it } from 'vitest'
import type { Habit, HabitFrequency, HabitLog } from '../db/types'
import {
  dayStates,
  lastDays,
  monthlyRates,
  overallRate,
  streaks,
  successRate,
  weekdayRates,
  weeklyRates,
} from './stats'

const habit = (frequency: HabitFrequency, extra: Partial<Habit> = {}): Habit => ({
  id: 'h',
  title: 'h',
  kind: 'check',
  frequency,
  archived: false,
  order: 0,
  createdAt: new Date(2026, 0, 1).toISOString(),
  ...extra,
})

const log = (date: string, status: HabitLog['status'] = 'done'): HabitLog => ({
  id: date,
  habitId: 'h',
  date,
  status,
})

// 2026-10-26 is a Monday; "today" is Wednesday 2026-10-28.
const TODAY = '2026-10-28'

describe('successRate: daily and weekdays', () => {
  it('counts minimum as done and leaves skipped days out', () => {
    const logs = [log('2026-10-26', 'minimum'), log('2026-10-27', 'skipped')]
    expect(successRate(habit({ type: 'daily' }), logs, '2026-10-24', TODAY, TODAY)).toEqual({
      done: 1,
      planned: 3, // 24, 25, 26; 27 skipped; today not yet marked
      rate: 1 / 3,
    })
  })

  it('includes today once it is completed', () => {
    const r = successRate(habit({ type: 'daily' }), [log(TODAY)], '2026-10-27', TODAY, TODAY)
    expect(r).toEqual({ done: 1, planned: 2, rate: 0.5 })
  })

  it('only counts planned weekdays', () => {
    // Mondays and Wednesdays from Mon 19th to Tue 27th: 19, 21, 26.
    const h = habit({ type: 'weekdays', days: [1, 3] })
    const r = successRate(h, [log('2026-10-19'), log('2026-10-26')], '2026-10-19', '2026-10-27', TODAY)
    expect(r).toEqual({ done: 2, planned: 3, rate: 2 / 3 })
  })

  it('ignores days before the habit was created', () => {
    const h = habit({ type: 'daily' }, { createdAt: new Date(2026, 9, 27).toISOString() })
    expect(successRate(h, [log('2026-10-27')], '2026-10-01', TODAY, TODAY).planned).toBe(1)
  })

  it('has no rate when nothing was planned', () => {
    expect(successRate(habit({ type: 'daily' }), [], TODAY, TODAY, TODAY).rate).toBeUndefined()
  })
})

describe('successRate: times per week', () => {
  const h = habit({ type: 'timesPerWeek', count: 3 })

  it('caps each week at its target and skips a running week below target', () => {
    const logs = [
      // Week of 19th: 4 done, capped at 3.
      log('2026-10-19'),
      log('2026-10-20'),
      log('2026-10-21'),
      log('2026-10-22'),
      // Running week: 1 of 3 so far, not counted yet.
      log('2026-10-26'),
    ]
    expect(successRate(h, logs, '2026-10-19', TODAY, TODAY)).toEqual({ done: 3, planned: 3, rate: 1 })
  })

  it('counts the running week once its target is met', () => {
    const logs = [log('2026-10-26'), log('2026-10-27'), log(TODAY)]
    expect(successRate(h, logs, '2026-10-26', TODAY, TODAY)).toEqual({ done: 3, planned: 3, rate: 1 })
  })

  it('plans fewer for a week only partly in range', () => {
    // Range starts Saturday 24th: that week has 2 days in range, so it plans 2.
    expect(successRate(h, [log('2026-10-25')], '2026-10-24', '2026-10-25', TODAY)).toEqual({
      done: 1,
      planned: 2,
      rate: 0.5,
    })
  })
})

describe('streaks: daily and weekdays', () => {
  const recent = { createdAt: new Date(2026, 9, 19).toISOString() } // Mon 19th

  it('counts back to the last miss, keeping minimum and ignoring skipped days', () => {
    const logs = [
      log('2026-10-19'),
      // 20th missed: breaks
      log('2026-10-21'),
      log('2026-10-22', 'minimum'),
      log('2026-10-23', 'skipped'),
      log('2026-10-24'),
      log('2026-10-25'),
      log('2026-10-26'),
      log('2026-10-27'),
    ]
    expect(streaks(habit({ type: 'daily' }, recent), logs, TODAY)).toEqual({ current: 6, longest: 6, unit: 'day' })
  })

  it('does not break on an unmarked today, and counts it once done', () => {
    const logs = [log('2026-10-26'), log('2026-10-27')]
    expect(streaks(habit({ type: 'daily' }, recent), logs, TODAY).current).toBe(2)
    expect(streaks(habit({ type: 'daily' }, recent), [...logs, log(TODAY)], TODAY).current).toBe(3)
  })

  it('remembers the longest run after a break', () => {
    const logs = [log('2026-10-19'), log('2026-10-20'), log('2026-10-21'), log('2026-10-27')]
    expect(streaks(habit({ type: 'daily' }, recent), logs, TODAY)).toMatchObject({ current: 1, longest: 3 })
  })

  it('skips unplanned weekdays', () => {
    // Mon/Wed habit: 19, 21, 26 done; 28 (today) open.
    const h = habit({ type: 'weekdays', days: [1, 3] }, recent)
    expect(streaks(h, [log('2026-10-19'), log('2026-10-21'), log('2026-10-26')], TODAY).current).toBe(3)
  })
})

describe('streaks: times per week', () => {
  const h = habit({ type: 'timesPerWeek', count: 2 }, { createdAt: new Date(2026, 9, 5).toISOString() })

  it('counts consecutive weeks that met the target; a running week below target does not break', () => {
    const logs = [
      log('2026-10-05'), log('2026-10-06'), // week of 5th: met
      log('2026-10-13'), // week of 12th: missed
      log('2026-10-19'), log('2026-10-23'), // week of 19th: met
      log('2026-10-26'), // running week: 1 of 2
    ]
    expect(streaks(h, logs, TODAY)).toEqual({ current: 1, longest: 1, unit: 'week' })
  })
})

describe('dayStates', () => {
  it('tells logged, missed, open and unplanned days apart', () => {
    const h = habit({ type: 'weekdays', days: [1, 2, 3] }, { createdAt: new Date(2026, 9, 26).toISOString() })
    const states = dayStates(h, [log('2026-10-26', 'minimum')], '2026-10-25', '2026-10-29', TODAY)
    expect(Object.fromEntries(states)).toEqual({
      '2026-10-25': 'none', // before the habit
      '2026-10-26': 'minimum',
      '2026-10-27': 'missed',
      '2026-10-28': 'open', // today
      '2026-10-29': 'none', // future
    })
  })
})

describe('weekdayRates', () => {
  it('splits success by weekday', () => {
    const logs = [log('2026-10-19'), log('2026-10-26'), log('2026-10-20')]
    const rates = weekdayRates(habit({ type: 'daily' }), logs, '2026-10-19', '2026-10-27', TODAY)
    expect(rates[0]).toEqual({ weekday: 1, done: 2, planned: 2, rate: 1 }) // Mondays
    expect(rates[1]).toEqual({ weekday: 2, done: 1, planned: 2, rate: 0.5 }) // Tuesdays
    expect(rates[2].planned).toBe(1) // Wed 21st only; today unmarked
  })
})

describe('period rates', () => {
  it('lists the last weeks and months oldest first, ending now', () => {
    const weeks = weeklyRates(habit({ type: 'daily' }), [], TODAY, 3)
    expect(weeks.map((w) => w.start)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26'])
    const months = monthlyRates(habit({ type: 'daily' }), [], TODAY, 2)
    expect(months.map((m) => m.start)).toEqual(['2026-09-01', '2026-10-01'])
  })

  it('adds up all active habits', () => {
    const a = habit({ type: 'daily' })
    const b = { ...habit({ type: 'daily' }), id: 'b' }
    const r = overallRate([a, b], [log('2026-10-27')], '2026-10-27', '2026-10-27', TODAY)
    expect(r).toEqual({ done: 1, planned: 2, rate: 0.5 })
  })
})

describe('lastDays', () => {
  it('ends today', () => {
    expect(lastDays(TODAY, 30)).toEqual(['2026-09-29', TODAY])
  })
})

describe('a frozen day', () => {
  it('keeps the streak running, exactly like a skip', () => {
    const logs = [
      log('2026-10-24'),
      log('2026-10-25'),
      log('2026-10-26', 'frozen'),
      log('2026-10-27'),
    ]
    expect(streaks(habit({ type: 'daily' }), logs, TODAY).current).toBe(3)
  })

  it('still counts as a miss in the success rate, unlike a skip', () => {
    const frozen = [log('2026-10-26'), log('2026-10-27', 'frozen')]
    expect(successRate(habit({ type: 'daily' }), frozen, '2026-10-26', TODAY, TODAY)).toEqual({
      done: 1,
      planned: 2,
      rate: 0.5,
    })
    const skipped = [log('2026-10-26'), log('2026-10-27', 'skipped')]
    expect(successRate(habit({ type: 'daily' }), skipped, '2026-10-26', TODAY, TODAY)).toEqual({
      done: 1,
      planned: 1,
      rate: 1,
    })
  })

  it('lowers what a weekly goal is asked for only once few days are left', () => {
    const weekly = habit({ type: 'timesPerWeek', count: 3 })
    // One held day out of seven changes nothing: three goes are still perfectly possible.
    const one = [log('2026-10-26'), log('2026-10-27'), log('2026-10-28', 'frozen')]
    expect(streaks(weekly, one, '2026-11-02').current).toBe(0)
    // Held from Wednesday on, there are only two days to ask for, and both were kept.
    const most = [
      log('2026-10-26'),
      log('2026-10-27'),
      ...['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map((d) =>
        log(d, 'frozen'),
      ),
    ]
    expect(streaks(weekly, most, '2026-11-02').current).toBe(1)
  })

  it('gets its own cell in the heatmap', () => {
    const states = dayStates(habit({ type: 'daily' }), [log('2026-10-27', 'frozen')], '2026-10-27', '2026-10-27', TODAY)
    expect(states.get('2026-10-27')).toBe('frozen')
  })
})

describe('monthly and yearly goals', () => {
  const monthly = habit({ type: 'timesPerMonth', count: 2 })
  const yearly = habit({ type: 'timesPerYear', count: 1 })

  it('judges a finished month on its last day', () => {
    const logs = [log('2026-09-10')]
    // September ended one short of two: it shows up in the range that holds 30 September …
    expect(successRate(monthly, logs, '2026-09-01', '2026-09-30', TODAY)).toEqual({ done: 1, planned: 2, rate: 0.5 })
    expect(successRate(monthly, logs, '2026-09-28', '2026-10-04', TODAY)).toMatchObject({ done: 1, planned: 2 })
    // … and in no other week of that month.
    expect(successRate(monthly, logs, '2026-09-07', '2026-09-13', TODAY)).toEqual({ done: 0, planned: 0, rate: undefined })
  })

  it('counts a reached goal on the day it was reached', () => {
    const logs = [log('2026-09-03'), log('2026-09-10'), log('2026-09-20')]
    expect(successRate(monthly, logs, '2026-09-07', '2026-09-13', TODAY)).toEqual({ done: 2, planned: 2, rate: 1 })
    expect(successRate(monthly, logs, '2026-09-28', '2026-10-04', TODAY)).toMatchObject({ planned: 0 })
  })

  it('leaves the running period out until its goal is reached', () => {
    expect(successRate(monthly, [log('2026-10-05')], '2026-10-01', TODAY, TODAY)).toMatchObject({ planned: 0 })
    expect(successRate(monthly, [log('2026-10-05'), log('2026-10-27')], '2026-10-01', TODAY, TODAY)).toMatchObject({
      done: 2,
      planned: 2,
    })
  })

  it('does not charge a 30-day window with a goal that has all year', () => {
    const [from] = lastDays(TODAY, 30)
    expect(successRate(yearly, [], from, TODAY, TODAY)).toMatchObject({ planned: 0 })
    // Done in March: counted in March, not in whatever window today falls in.
    expect(successRate(yearly, [log('2026-03-08')], from, TODAY, TODAY)).toMatchObject({ planned: 0 })
    expect(successRate(yearly, [log('2026-03-08')], '2026-03-01', '2026-03-31', TODAY)).toMatchObject({ done: 1, planned: 1 })
  })

  it('counts a missed year on 31 December', () => {
    const old = habit({ type: 'timesPerYear', count: 1 }, { createdAt: new Date(2025, 2, 1).toISOString() })
    expect(successRate(old, [], '2025-12-01', '2025-12-31', TODAY)).toEqual({ done: 0, planned: 1, rate: 0 })
    expect(successRate(old, [], '2025-11-01', '2025-11-30', TODAY)).toMatchObject({ planned: 0 })
  })

  it('counts months in a row for a monthly goal', () => {
    const h = habit({ type: 'timesPerMonth', count: 1 }, { createdAt: new Date(2026, 5, 20).toISOString() })
    // June (the month it was added) missed, July to September done, October still running.
    const logs = [log('2026-07-30'), log('2026-08-01'), log('2026-09-15')]
    expect(streaks(h, logs, TODAY)).toEqual({ current: 3, longest: 3, unit: 'month' })
    expect(streaks(h, [...logs, log('2026-10-02')], TODAY)).toMatchObject({ current: 4, longest: 4 })
    // A month with nothing in between starts the count over.
    expect(streaks(h, [log('2026-07-30'), log('2026-09-15')], TODAY)).toMatchObject({ current: 1, longest: 1 })
  })

  it('counts years in a row for a yearly goal', () => {
    const h = habit({ type: 'timesPerYear', count: 1 }, { createdAt: new Date(2024, 0, 10).toISOString() })
    expect(streaks(h, [log('2024-05-01'), log('2025-11-30')], TODAY)).toEqual({ current: 2, longest: 2, unit: 'year' })
    expect(streaks(h, [log('2024-05-01')], TODAY)).toMatchObject({ current: 0, longest: 1 })
  })

  it('never marks a day as missed', () => {
    const states = dayStates(yearly, [log('2026-10-20')], '2026-10-19', TODAY, TODAY)
    expect(states.get('2026-10-19')).toBe('open')
    expect(states.get('2026-10-20')).toBe('done')
  })
})
