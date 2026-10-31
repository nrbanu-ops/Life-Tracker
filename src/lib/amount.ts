import type { Habit } from '../db/types'

export const DEFAULT_INCREMENT = { count: 1, duration: 5 } as const

/** "1 sa 15 dk", "45 dk". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} dk`
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`
}

/** The fields that describe how a habit is measured; also present on habits not yet saved. */
type Measure = Pick<Habit, 'kind' | 'target' | 'unit'>

/** A logged amount in the habit's own terms, e.g. "8 bardak" or "30 dk". */
export function formatAmount(habit: Measure, value: number): string {
  if (habit.kind === 'duration') return formatMinutes(value)
  return habit.unit ? `${value} ${habit.unit}` : String(value)
}

/** "8 bardak" / "30 dk" for count and duration habits, otherwise undefined. */
export function describeTarget(habit: Measure): string | undefined {
  if (!isCountable(habit) || !habit.target) return undefined
  return formatAmount(habit, habit.target)
}

/** count and duration habits log an amount toward a daily target. */
export const isCountable = <T extends Measure>(habit: T): habit is T & { kind: 'count' | 'duration' } =>
  habit.kind === 'count' || habit.kind === 'duration'

export function incrementOf(habit: Habit): number {
  if (!isCountable(habit)) return 1
  return habit.increment ?? DEFAULT_INCREMENT[habit.kind]
}
