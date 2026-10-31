import type { Habit } from '../db/types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export type QuitMilestone = { days: number; label: string }

export const QUIT_MILESTONES: QuitMilestone[] = [
  { days: 1, label: '1 gün' },
  { days: 3, label: '3 gün' },
  { days: 7, label: '1 hafta' },
  { days: 14, label: '2 hafta' },
  { days: 30, label: '1 ay' },
  { days: 90, label: '3 ay' },
  { days: 180, label: '6 ay' },
  { days: 365, label: '1 yıl' },
]

export type QuitStats = {
  /** Start of the current run: the last restart, or the original quit date. */
  currentStart: Date
  currentMs: number
  /** Longest run so far, the current one included. */
  longestMs: number
  restarts: number
  /** Highest milestone the current run has passed. */
  reached?: QuitMilestone
  next?: QuitMilestone
}

export function quitStats(habit: Habit, now: Date): QuitStats {
  const start = new Date(habit.quitStartedAt ?? habit.createdAt).getTime()
  // Restarts from before an edited start date no longer apply.
  const restarts = (habit.relapses ?? [])
    .map((iso) => new Date(iso).getTime())
    .filter((time) => time >= start)
    .sort((a, b) => a - b)

  const boundaries = [start, ...restarts, now.getTime()]
  let longestMs = 0
  for (let i = 1; i < boundaries.length; i++) {
    longestMs = Math.max(longestMs, boundaries[i] - boundaries[i - 1])
  }

  const currentStart = restarts.at(-1) ?? start
  const currentMs = Math.max(0, now.getTime() - currentStart)
  const days = currentMs / DAY
  return {
    currentStart: new Date(currentStart),
    currentMs,
    longestMs,
    restarts: restarts.length,
    reached: QUIT_MILESTONES.findLast((m) => days >= m.days),
    next: QUIT_MILESTONES.find((m) => days < m.days),
  }
}

/** "12 gün 4 sa", "4 sa 12 dk", "12 dk", "Az önce". */
export function formatElapsed(ms: number): string {
  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / HOUR)
  const minutes = Math.floor((ms % HOUR) / MINUTE)
  if (days > 0) return hours > 0 ? `${days} gün ${hours} sa` : `${days} gün`
  if (hours > 0) return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`
  return minutes > 0 ? `${minutes} dk` : 'Az önce'
}

/** Progress from the reached milestone to the next one, 0–1. */
export function milestoneProgress(stats: QuitStats): number {
  if (!stats.next) return 1
  const from = (stats.reached?.days ?? 0) * DAY
  return Math.min(1, (stats.currentMs - from) / (stats.next.days * DAY - from))
}

/** Milestone to celebrate now: reached in this run and not yet acknowledged. */
export function pendingCelebration(habit: Habit, stats: QuitStats): QuitMilestone | undefined {
  const { reached } = stats
  return reached && reached.days > (habit.celebratedMilestone ?? 0) ? reached : undefined
}
