import { addDays, differenceInMonths, differenceInYears } from 'date-fns'
import type { Habit, HabitLog } from '../db/types'
import { fromDateKey, toDateKey } from './date'
import { dayCount, intervalOf, isPlannedDaily, nextPeriod, periodGoal, periodRange, type StreakUnit } from './frequency'
import { capAtEnd, hasEnded } from './habitEnd'
import { intervalCycles } from './interval'
import { dayStates, type DayState } from './stats'
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
    // A habit that has ended has no turn left to wait for.
    if (hasEnded(habit, today) && links.at(-1)?.state === 'open') links.pop()
    return links.slice(-CHAIN_LENGTH.time)
  }

  if (goal) {
    const links: ChainLink[] = []
    for (let p = periodRange(goal.period, created).start; p <= today && !hasEnded(habit, p); p = nextPeriod(goal.period, p)) {
      const end = capAtEnd(habit, periodRange(goal.period, p).end)
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

/** One day of the calendar views: how it went, and whether the chain reaches it from either side. */
export type ChainDay = { state: DayState; left: boolean; right: boolean }

const dayHolds = (state: DayState): boolean =>
  state === 'done' || state === 'minimum' || state === 'skipped' || state === 'frozen'

/**
 * Every day from `from` to `to` for the month and year views. For a habit planned by the day,
 * `left` / `right` say the chain runs on to the planned day before / after: two planned days
 * in a row that both hold are joined, and so are the unplanned days lying between them (a
 * Mon–Wed–Fri chain runs straight through Tuesday). Other habits have no day-to-day chain —
 * theirs is made of weeks, months or turns — so their days are never joined.
 * `logs` must hold the habit's own for the range and a week either side.
 */
export function chainDays(habit: Habit, logs: HabitLog[], from: string, to: string, today: string): Map<string, ChainDay> {
  // A week of margin, so a chain entering or leaving the range is drawn to its edge.
  const start = toDateKey(addDays(fromDateKey(from), -7))
  const end = toDateKey(addDays(fromDateKey(to), 7))
  const states = dayStates(habit, logs, start, end, today)
  const days = new Map<string, ChainDay>([...states].map(([key, state]) => [key, { state, left: false, right: false }]))

  if (isPlannedDaily(habit)) {
    let last: string | undefined
    let between: string[] = []
    for (const [key, day] of days) {
      if (day.state === 'none') {
        between.push(key)
        continue
      }
      if (last && dayHolds(day.state) && dayHolds(days.get(last)!.state)) {
        days.get(last)!.right = true
        for (const gap of between) Object.assign(days.get(gap)!, { left: true, right: true })
        day.left = true
      }
      last = key
      between = []
    }
  }

  for (const key of [...days.keys()]) if (key < from || key > to) days.delete(key)
  return days
}

/**
 * How long the habit has been followed: "5 gündür", "3 haftadır", "7 aydır", "2 yıldır"; for
 * one past its last day, how long it ran: "66 gün sürdü", "3 ay sürdü".
 */
export function trackedFor(habit: Habit, today: string): string {
  const created = createdKey(habit)
  const ended = hasEnded(habit, today)
  // Counted to the end of its last day, so a habit set for 30 days ran 30 days.
  const to = ended ? toDateKey(addDays(fromDateKey(habit.endDate!), 1)) : today
  const days = dayCount(created, to) - 1
  if (days <= 0) return 'bugün başladı'
  const span =
    // A set run is thought of in days ("30 gün", "66 gün"), so an ended one is told in days for longer.
    days < (ended ? 100 : 14)
      ? ([days, 'gün', 'gündür'] as const)
      : days < 61
        ? ([Math.floor(days / 7), 'hafta', 'haftadır'] as const)
        : differenceInMonths(fromDateKey(to), fromDateKey(created)) < 24
          ? ([differenceInMonths(fromDateKey(to), fromDateKey(created)), 'ay', 'aydır'] as const)
          : ([differenceInYears(fromDateKey(to), fromDateKey(created)), 'yıl', 'yıldır'] as const)
  // Ended: "sürdü" after it; still going: the "-dır" form, which already says "until now".
  return ended ? `${span[0]} ${span[1]} sürdü` : `${span[0]} ${span[2]}`
}
