import { addDays, differenceInMonths, differenceInYears } from 'date-fns'
import type { Habit, HabitLog } from '../db/types'
import { fromDateKey, toDateKey } from './date'
import { dayCount, intervalOf, nextPeriod, periodGoal, periodRange, type StreakUnit } from './frequency'
import { intervalCycles } from './interval'
import { isCompleted, isExcused, isShownOn } from './today'

// "Don't break the chain": a habit's recent history as links, newest last. A link is one
// thing the habit was asked for — a planned day, a week / month / year with a target, or one
// turn of an "every N months" habit — so the links that hold at the end are exactly the
// current streak (`streaks` in stats.ts counts by the same rules).

/**
 * done / minimum: the link holds. excused: skipped or frozen, the chain runs through it.
 * missed: the chain broke here. open: still to be done (today, the running period, the next turn).
 */
export type LinkState = 'done' | 'minimum' | 'excused' | 'missed' | 'open'

export type ChainLink = { key: string; state: LinkState }

/** How many links are shown, per what a link stands for. */
export const CHAIN_LENGTH: Record<StreakUnit, number> = { day: 14, week: 12, month: 12, year: 6, time: 8 }

/** Whether the chain is unbroken through this link. */
export const holds = (state: LinkState): boolean => state === 'done' || state === 'minimum' || state === 'excused'

const createdKey = (habit: Habit) => toDateKey(new Date(habit.createdAt))

/** The habit's last links, oldest first; `logs` must hold all of the habit's own. Empty for quit habits. */
export function habitChain(habit: Habit, logs: HabitLog[], today: string): ChainLink[] {
  if (habit.kind === 'quit') return []
  const own = logs.filter((l) => l.habitId === habit.id)
  const created = createdKey(habit)
  const goal = periodGoal(habit.frequency)

  if (intervalOf(habit.frequency)) {
    const done = own.filter((l) => isCompleted(l.status)).map((l) => l.date)
    const links = intervalCycles(habit, done, today).flatMap((cycle): ChainLink[] => [
      ...cycle.missed.map((key): ChainLink => ({ key, state: 'missed' })),
      // The turn still running waits as the last link, due or not.
      cycle.doneOn ? { key: cycle.doneOn, state: 'done' } : { key: `open-${cycle.due}`, state: 'open' },
    ])
    return links.slice(-CHAIN_LENGTH.time)
  }

  if (goal) {
    const links: ChainLink[] = []
    for (let p = periodRange(goal.period, created).start; p <= today; p = nextPeriod(goal.period, p)) {
      const { end } = periodRange(goal.period, p)
      const first = p < created ? created : p
      const inPeriod = own.filter((l) => l.date >= first && l.date <= end)
      const completed = inPeriod.filter((l) => l.date <= today && isCompleted(l.status)).length
      const target = Math.min(goal.count, dayCount(first, end) - inPeriod.filter((l) => isExcused(l.status)).length)
      const state: LinkState =
        target <= 0 ? 'excused' : completed >= target ? 'done' : end >= today ? 'open' : 'missed'
      links.push({ key: p, state })
    }
    return links.slice(-CHAIN_LENGTH[goal.period])
  }

  // Planned by the day: walk back over the planned days only, so a Mon–Wed–Fri habit shows
  // fourteen of its own days rather than two weeks full of gaps.
  const byDate = new Map(own.map((l) => [l.date, l.status]))
  const links: ChainLink[] = []
  for (let d = fromDateKey(today); links.length < CHAIN_LENGTH.day; d = addDays(d, -1)) {
    const day = toDateKey(d)
    if (day < created) break
    if (!isShownOn(habit, day)) continue
    const status = byDate.get(day)
    const state: LinkState =
      status === 'done' || status === 'minimum'
        ? status
        : isExcused(status)
          ? 'excused'
          : day === today
            ? 'open'
            : 'missed'
    links.unshift({ key: day, state })
  }
  return links
}

/** How long the habit has been followed, as "5 gündür", "3 haftadır", "7 aydır", "2 yıldır". */
export function trackedFor(habit: Habit, today: string): string {
  const created = createdKey(habit)
  const days = dayCount(created, today) - 1
  if (days <= 0) return 'bugün başladı'
  if (days < 14) return `${days} gündür`
  if (days < 61) return `${Math.floor(days / 7)} haftadır`
  const months = differenceInMonths(fromDateKey(today), fromDateKey(created))
  if (months < 24) return `${months} aydır`
  return `${differenceInYears(fromDateKey(today), fromDateKey(created))} yıldır`
}
