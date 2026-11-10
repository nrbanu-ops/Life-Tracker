import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Habit, HabitLog } from '../db/types'
import { fromDateKey, toDateKey } from './date'
import { successRate, type SuccessRate } from './stats'

/** Fewer planned days than this and a month's rate says more about chance than about the habit. */
export const MONTH_MIN_PLANNED = 5
/** Under this rate a habit is not working as written: make it smaller, or let it go. */
export const SHRINK_BELOW = 0.3
/** A change smaller than this, in either direction, is not worth pointing at. */
export const NOTABLE_CHANGE = 0.1
/** The Bugün card shows for the first days of a month. */
export const MONTH_CARD_DAYS = 7

export type HabitMonth = {
  habit: Habit
  last: SuccessRate
  before: SuccessRate
  /** last.rate − before.rate; only when both months had enough planned days. */
  change?: number
}

export type MonthReview = {
  /** 'YYYY-MM' of the month looked back at: the one before today's. */
  month: string
  /** Its name, e.g. "Ekim". */
  label: string
  beforeLabel: string
  overall: SuccessRate
  overallBefore: SuccessRate
  best?: HabitMonth
  riser?: HabitMonth
  faller?: HabitMonth
  /** Habits that barely happened; at most three, worst first. */
  shrink: HabitMonth[]
}

const span = (month: Date) => ({ from: toDateKey(startOfMonth(month)), to: toDateKey(endOfMonth(month)) })
const name = (month: Date) => {
  const text = format(month, 'LLLL', { locale: tr })
  return text.charAt(0).toLocaleUpperCase('tr') + text.slice(1)
}
const enough = (rate: SuccessRate) => rate.planned >= MONTH_MIN_PLANNED && rate.rate !== undefined

/** The date range the review reads: the two calendar months before today's. */
export function monthReviewRange(today: string): { from: string; to: string } {
  const thisMonth = startOfMonth(fromDateKey(today))
  return { from: span(addMonths(thisMonth, -2)).from, to: span(addMonths(thisMonth, -1)).to }
}

/**
 * Last month next to the month before it: the overall rate, the habit that went best, the
 * ones that moved the most in each direction, and the ones to make smaller. Undefined when
 * nothing was planned last month — there is nothing to look back at.
 */
export function monthReview(habits: Habit[], logs: HabitLog[], today: string): MonthReview | undefined {
  const thisMonth = startOfMonth(fromDateKey(today))
  const lastMonth = addMonths(thisMonth, -1)
  const monthBefore = addMonths(thisMonth, -2)
  const last = span(lastMonth)
  const before = span(monthBefore)

  const rows: HabitMonth[] = habits
    .filter((habit) => !habit.archived && habit.kind !== 'quit')
    .map((habit) => {
      const l = successRate(habit, logs, last.from, last.to, today)
      const b = successRate(habit, logs, before.from, before.to, today)
      return { habit, last: l, before: b, change: enough(l) && enough(b) ? l.rate! - b.rate! : undefined }
    })

  const sum = (pick: (row: HabitMonth) => SuccessRate): SuccessRate => {
    const done = rows.reduce((n, row) => n + pick(row).done, 0)
    const planned = rows.reduce((n, row) => n + pick(row).planned, 0)
    return { done, planned, rate: planned === 0 ? undefined : done / planned }
  }
  const overall = sum((row) => row.last)
  if (overall.planned === 0) return undefined

  const judged = rows.filter((row) => enough(row.last))
  const moved = rows.filter((row) => row.change !== undefined)
  const riser = [...moved].sort((a, b) => b.change! - a.change!)[0]
  const faller = [...moved].sort((a, b) => a.change! - b.change!)[0]

  return {
    month: format(lastMonth, 'yyyy-MM'),
    label: name(lastMonth),
    beforeLabel: name(monthBefore),
    overall,
    overallBefore: sum((row) => row.before),
    best: [...judged].sort((a, b) => b.last.rate! - a.last.rate!)[0],
    riser: riser && riser.change! >= NOTABLE_CHANGE ? riser : undefined,
    faller: faller && faller.change! <= -NOTABLE_CHANGE ? faller : undefined,
    shrink: judged
      .filter((row) => row.last.rate! < SHRINK_BELOW)
      .sort((a, b) => a.last.rate! - b.last.rate!)
      .slice(0, 3),
  }
}

/** Whether Bugün brings the review up by itself: only in the first days of a month. */
export const monthCardDue = (today: string): boolean => Number(today.slice(8, 10)) <= MONTH_CARD_DAYS
