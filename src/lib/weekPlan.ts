import type { WeekPlan, WeekPriority } from '../db/types'
import { weekdayOf } from './date'

/** Three is a week's worth of priorities; a longer list is a to-do list, not a plan. */
export const WEEK_PLAN_MAX = 3

/** How much of the week's plan is ticked off. */
export function planProgress(plan: WeekPlan | undefined): { done: number; total: number } {
  const list = plan?.priorities ?? []
  return { done: list.filter((p) => p.done).length, total: list.length }
}

export const hasPlan = (plan: WeekPlan | undefined): boolean => (plan?.priorities.length ?? 0) > 0

/**
 * How hard Bugün asks for a plan. Sunday and Monday are when a week gets planned, so there
 * the ask is a card; the rest of the week it is one quiet line, which still opens the sheet.
 */
export function planPrompt(today: string, plan: WeekPlan | undefined): 'none' | 'card' | 'line' {
  if (hasPlan(plan)) return 'none'
  const day = weekdayOf(today)
  return day === 7 || day === 1 ? 'card' : 'line'
}

/**
 * Turns the sheet's three text boxes into the stored list: trimmed, empty ones dropped.
 * A priority whose text did not change keeps its tick, so editing the third one on Friday
 * does not undo the first two.
 */
export function cleanPriorities(texts: string[], before?: WeekPlan): WeekPriority[] {
  return texts
    .map((text) => text.trim())
    // Empties are dropped before the cap, so a blank middle box does not swallow the last one.
    .filter((text) => text !== '')
    .slice(0, WEEK_PLAN_MAX)
    .map((text) => ({ text, done: before?.priorities.find((p) => p.text === text)?.done ?? false }))
}
