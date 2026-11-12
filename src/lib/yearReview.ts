import type {
  DayMood,
  Habit,
  HabitLog,
  JournalEntry,
  LibraryKind,
  LibraryStatus,
  Milestone,
  Project,
  Task,
  UnlockedAchievement,
  XpWeek,
} from '../db/types'
import { dayStatus } from './calendar'
import { isLongGoal } from './frequency'
import { isCompleted, isExcused, isShownOn } from './today'

/**
 * A year in one page. Everything here is a plain function over plain data so it can be tested;
 * reading the tables (and leaving photos and sounds in the database) is `src/db/yearReview.ts`.
 */

/** A journal entry without its photos and sound: the page only ever counts those. */
export type JournalBit = {
  date: string
  text: string
  kind?: JournalEntry['kind']
  photos: number
  audio: boolean
}

/** A library item without its poster. */
export type LibraryBit = {
  kind: LibraryKind
  title: string
  status: LibraryStatus
  finishedAt?: string
  rating?: number
}

export type YearData = {
  habits: Habit[]
  logs: HabitLog[]
  journal: JournalBit[]
  moods: DayMood[]
  library: LibraryBit[]
  tasks: Task[]
  projects: Project[]
  milestones: Milestone[]
  achievements: UnlockedAchievement[]
  xpWeeks: XpWeek[]
}

export type MonthCount = { month: string; count: number }

export type YearSummary = {
  year: number
  /** Nothing at all happened that year. */
  empty: boolean
  /** Days with anything on them: a habit done, something written, a mood, a task, a book finished. */
  activeDays: number
  habits: {
    checks: number
    perfectDays: number
    topHabit?: { title: string; done: number }
    bestStreak?: { title: string; days: number }
  }
  journal: { entries: number; words: number; photos: number; audios: number; busiest?: MonthCount }
  mood: { average?: number; best?: { month: string; average: number } }
  library: { finished: number; byKind: { kind: LibraryKind; count: number }[]; loved: LibraryBit[] }
  tasks: { done: number }
  projects: { finished: number; milestones: number }
  xp: number
  achievements: number
}

const inYear = (date: string | undefined, year: number): boolean => date?.slice(0, 4) === String(year)

/** Day keys of the year, stopping at today so an unfinished year isn't counted as missed. */
export function yearDays(year: number, today: string): string[] {
  const days: string[] = []
  const last = today.slice(0, 4) === String(year) ? today : `${year}-12-31`
  for (let month = 1; month <= 12; month++) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    // Day 0 of the next month is the last day of this one, leap years included.
    const length = new Date(year, month, 0).getDate()
    for (let day = 1; day <= length; day++) {
      const date = `${key}-${String(day).padStart(2, '0')}`
      if (date > last) return days
      days.push(date)
    }
  }
  return days
}

/** Words, the way a person counts them. */
export const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length

/**
 * The longest run of days a habit was kept inside the year. Only planned days count and a
 * skipped day doesn't break it, the same rules as the streak on the habit's own page.
 */
function longestStreak(habit: Habit, logs: HabitLog[], days: string[]): number {
  const byDate = new Map(logs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l.status]))
  let best = 0
  let run = 0
  for (const day of days) {
    if (!isShownOn(habit, day)) continue
    const status = byDate.get(day)
    if (isExcused(status)) continue
    if (isCompleted(status)) {
      run++
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  return best
}

function busiestMonth(dates: string[]): MonthCount | undefined {
  const counts = new Map<string, number>()
  for (const date of dates) {
    const month = date.slice(0, 7)
    counts.set(month, (counts.get(month) ?? 0) + 1)
  }
  let best: MonthCount | undefined
  for (const [month, count] of counts) {
    if (!best || count > best.count || (count === best.count && month < best.month)) best = { month, count }
  }
  return best
}

/** A month's mood needs a few days behind it before it means anything. */
const MOOD_MONTH_MIN_DAYS = 5

function bestMoodMonth(moods: DayMood[]): { month: string; average: number } | undefined {
  const byMonth = new Map<string, number[]>()
  for (const mood of moods) {
    if (!mood.mood) continue
    const month = mood.date.slice(0, 7)
    byMonth.set(month, [...(byMonth.get(month) ?? []), mood.mood])
  }
  let best: { month: string; average: number } | undefined
  for (const [month, values] of byMonth) {
    if (values.length < MOOD_MONTH_MIN_DAYS) continue
    const average = values.reduce((a, b) => a + b, 0) / values.length
    if (!best || average > best.average) best = { month, average }
  }
  return best
}

export function yearSummary(data: YearData, year: number, today: string): YearSummary {
  const days = yearDays(year, today)
  const logs = data.logs.filter((l) => inYear(l.date, year))
  const done = logs.filter((l) => isCompleted(l.status))

  const perHabit = new Map<string, number>()
  for (const log of done) perHabit.set(log.habitId, (perHabit.get(log.habitId) ?? 0) + 1)
  let topHabit: YearSummary['habits']['topHabit']
  let bestStreak: YearSummary['habits']['bestStreak']
  for (const habit of data.habits) {
    const count = perHabit.get(habit.id) ?? 0
    if (count > 0 && (!topHabit || count > topHabit.done)) topHabit = { title: habit.title, done: count }
    // A monthly or yearly goal has no run of days.
    if (habit.kind === 'quit' || isLongGoal(habit)) continue
    const streak = longestStreak(habit, logs, days)
    if (streak > 0 && (!bestStreak || streak > bestStreak.days)) bestStreak = { title: habit.title, days: streak }
  }

  // A day counts as perfect only where something was actually planned.
  let perfectDays = 0
  for (const day of days) {
    const status = dayStatus(data.habits, logs, day)
    if (status.total > 0 && status.done === status.total) perfectDays++
  }

  // The AI's weekly review is in the journal as well; this is about what the user wrote.
  const entries = data.journal.filter((e) => inYear(e.date, year) && e.kind !== 'review')
  const moods = data.moods.filter((m) => inYear(m.date, year))
  const moodValues = moods.flatMap((m) => (m.mood ? [m.mood] : []))

  const finished = data.library.filter((i) => i.status === 'done' && inYear(i.finishedAt, year))
  const byKind = [...new Map<LibraryKind, number>(
    finished.map((i) => [i.kind, finished.filter((other) => other.kind === i.kind).length]),
  )]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count)

  const tasksDone = data.tasks.filter((t) => t.done && inYear(t.completedAt?.slice(0, 10), year))
  const milestones = data.milestones.filter((m) => m.done && inYear(m.doneAt, year))
  const projects = data.projects.filter((p) => inYear(p.completedAt?.slice(0, 10), year))

  let xp = 0
  for (const week of data.xpWeeks) {
    for (const [day, amount] of Object.entries(week.days)) if (inYear(day, year)) xp += amount
  }

  const active = new Set<string>([
    ...done.map((l) => l.date),
    ...entries.map((e) => e.date),
    ...moods.filter((m) => m.mood || m.energy).map((m) => m.date),
    ...tasksDone.flatMap((t) => (t.completedAt ? [t.completedAt.slice(0, 10)] : [])),
    ...finished.flatMap((i) => (i.finishedAt ? [i.finishedAt] : [])),
    ...milestones.flatMap((m) => (m.doneAt ? [m.doneAt] : [])),
  ])

  const achievements = data.achievements.filter((a) => inYear(a.unlockedAt, year)).length

  return {
    year,
    empty: active.size === 0 && achievements === 0,
    activeDays: active.size,
    habits: { checks: done.length, perfectDays, topHabit, bestStreak },
    journal: {
      entries: entries.length,
      words: entries.reduce((sum, e) => sum + wordCount(e.text), 0),
      photos: entries.reduce((sum, e) => sum + e.photos, 0),
      audios: entries.filter((e) => e.audio).length,
      busiest: busiestMonth(entries.map((e) => e.date)),
    },
    mood: {
      average: moodValues.length ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : undefined,
      best: bestMoodMonth(moods),
    },
    library: {
      finished: finished.length,
      byKind,
      loved: finished.filter((i) => i.rating === 5).slice(0, 6),
    },
    tasks: { done: tasksDone.length },
    projects: { finished: projects.length, milestones: milestones.length },
    xp,
    achievements,
  }
}

/** Years that have anything in them, newest first; this year is always offered. */
export function yearsIn(data: YearData, today: string): number[] {
  const current = Number(today.slice(0, 4))
  const dates = [
    ...data.logs.map((l) => l.date),
    ...data.journal.map((e) => e.date),
    ...data.moods.map((m) => m.date),
    ...data.library.flatMap((i) => (i.finishedAt ? [i.finishedAt] : [])),
    ...data.tasks.flatMap((t) => (t.completedAt ? [t.completedAt.slice(0, 10)] : [])),
    ...data.milestones.flatMap((m) => (m.doneAt ? [m.doneAt] : [])),
    ...data.achievements.map((a) => a.unlockedAt),
  ].filter((date) => /^\d{4}-/.test(date))
  const earliest = dates.sort()[0]
  const from = Math.min(earliest ? Number(earliest.slice(0, 4)) : current, current)
  const years: number[] = []
  for (let year = current; year >= from; year--) years.push(year)
  return years
}

/**
 * The year the Today screen should offer a summary for: through December, and in the first
 * half of January the year that just ended. Outside that it stays out of the way.
 */
export function yearCardFor(today: string): number | undefined {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  const day = Number(today.slice(8, 10))
  if (month === 12) return year
  if (month === 1 && day <= 15) return year - 1
  return undefined
}
