import { describe, expect, it } from 'vitest'
import type { DayMood, Habit, HabitLog, Level } from '../db/types'
import { average, describeEffect, habitEffects } from './mood'

const run: Habit = {
  id: 'run',
  title: 'Koşu',
  kind: 'check',
  frequency: { type: 'daily' },
  archived: false,
  order: 0,
  createdAt: new Date(2026, 0, 1).toISOString(),
}
const day = (n: number) => `2026-01-${String(n).padStart(2, '0')}`
const mood = (n: number, value: Level): DayMood => ({ date: day(n), mood: value })

describe('average', () => {
  it('skips days without the value', () => {
    expect(average([mood(1, 4), { date: day(2), energy: 2 }, mood(3, 2)], 'mood')).toBe(3)
    expect(average([], 'energy')).toBeUndefined()
  })
})

describe('habitEffects', () => {
  // Ran on days 1–4 (mood 4), not on days 5–8 (mood 3); day 9 skipped, day 10 is today.
  const logs: HabitLog[] = [
    ...[1, 2, 3, 4].map((n) => ({ id: `l${n}`, habitId: 'run', date: day(n), status: 'done' as const })),
    { id: 's', habitId: 'run', date: day(9), status: 'skipped' },
  ]
  const moods = [...[1, 2, 3, 4].map((n) => mood(n, 4)), ...[5, 6, 7, 8].map((n) => mood(n, 3)), mood(9, 1), mood(10, 1)]

  it('compares days the habit was done with the other planned days', () => {
    const [effect] = habitEffects([run], logs, moods, day(10))
    expect(effect).toMatchObject({ key: 'mood', withHabit: 4, without: 3, days: 8 })
    expect(describeEffect(effect)).toBe('Koşu yaptığın günlerde ruh halin ortalama %33 daha iyi')
  })

  it('needs a few days on each side', () => {
    expect(habitEffects([run], logs.slice(0, 2), moods.slice(0, 6), day(10))).toEqual([])
  })
})
