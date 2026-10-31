import type { DayMood, Habit, HabitLog, Level } from '../db/types'
import { isCompleted, isShownOn } from './today'

export const LEVELS: Level[] = [1, 2, 3, 4, 5]

export const MOOD_EMOJI: Record<Level, string> = { 1: '😞', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' }
export const MOOD_LABEL: Record<Level, string> = { 1: 'Çok kötü', 2: 'Kötü', 3: 'İdare eder', 4: 'İyi', 5: 'Harika' }
export const ENERGY_EMOJI: Record<Level, string> = { 1: '🪫', 2: '😴', 3: '😌', 4: '💪', 5: '⚡' }
export const ENERGY_LABEL: Record<Level, string> = { 1: 'Bitkin', 2: 'Yorgun', 3: 'Normal', 4: 'Enerjik', 5: 'Çok enerjik' }

/** Chart colours; the legend and the lines use the same ones. */
export const MOOD_COLOR = 'var(--color-accent)'
export const ENERGY_COLOR = 'var(--color-p2)'

export type MoodKey = 'mood' | 'energy'

/** Average of the days that have a value; undefined when none do. */
export function average(moods: DayMood[], key: MoodKey): number | undefined {
  const values = moods.flatMap((m) => (m[key] ? [m[key]] : []))
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined
}

export type HabitEffect = {
  habit: Habit
  key: MoodKey
  /** Average on days the habit was done, and on the other planned days. */
  withHabit: number
  without: number
  diff: number
  days: number
}

/** How many days each side needs before a difference means anything. */
const MIN_DAYS = 3
/** Differences smaller than this (on the 1–5 scale) aren't worth showing. */
const MIN_DIFF = 0.3

/**
 * For each habit: is the mood (or energy) different on days it was done compared with the
 * other days it was planned? Skipped days and today (not over yet) are left out.
 */
export function habitEffects(habits: Habit[], logs: HabitLog[], moods: DayMood[], today: string): HabitEffect[] {
  const status = new Map(logs.map((l) => [`${l.habitId}|${l.date}`, l.status]))
  const effects: HabitEffect[] = []
  for (const habit of habits) {
    if (habit.kind === 'quit' || habit.archived) continue
    for (const key of ['mood', 'energy'] as const) {
      const done: number[] = []
      const notDone: number[] = []
      for (const m of moods) {
        const value = m[key]
        if (!value || !isShownOn(habit, m.date)) continue
        const s = status.get(`${habit.id}|${m.date}`)
        if (s === 'skipped') continue
        if (isCompleted(s)) done.push(value)
        else if (m.date < today) notDone.push(value)
      }
      if (done.length < MIN_DAYS || notDone.length < MIN_DAYS) continue
      const withHabit = done.reduce((a, b) => a + b, 0) / done.length
      const without = notDone.reduce((a, b) => a + b, 0) / notDone.length
      const diff = withHabit - without
      if (Math.abs(diff) >= MIN_DIFF) {
        effects.push({ habit, key, withHabit, without, diff, days: done.length + notDone.length })
      }
    }
  }
  return effects.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
}

/** "Koşu yaptığın günlerde ruh halin ortalama %20 daha iyi" */
export function describeEffect(e: HabitEffect): string {
  const percent = Math.round((Math.abs(e.diff) / e.without) * 100)
  const what = e.key === 'mood' ? 'ruh halin' : 'enerjin'
  const direction = e.key === 'mood' ? (e.diff > 0 ? 'daha iyi' : 'daha düşük') : e.diff > 0 ? 'daha yüksek' : 'daha düşük'
  return `${e.habit.title} yaptığın günlerde ${what} ortalama %${percent} ${direction}`
}
