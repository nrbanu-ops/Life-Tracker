import { differenceInCalendarDays } from 'date-fns'
import type { Milestone, Project, ProjectStatus } from '../db/types'
import { fromDateKey } from './date'

/**
 * Colors offered for projects; readable in both light and dark themes. New projects take them
 * in order, so the app's own green comes last: a habit's tick in that colour looks unlinked.
 */
export const PROJECT_COLORS = [
  '#4a78b5',
  '#c25b8f',
  '#d08a2e',
  '#8a5cb5',
  '#3a9aa3',
  '#c4473a',
  '#3f6b5c',
  '#6b756f',
]

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Aktif',
  paused: 'Duraklatıldı',
  done: 'Tamamlandı',
}

/** Completed / total milestones; ratio is 0 without milestones. */
export function projectProgress(milestones: Milestone[]): {
  done: number
  total: number
  ratio: number
} {
  const done = milestones.filter((m) => m.done).length
  const total = milestones.length
  return { done, total, ratio: total === 0 ? 0 : done / total }
}

/** First open milestone in the project's order. */
export function nextMilestone(milestones: Milestone[]): Milestone | undefined {
  return [...milestones].sort((a, b) => a.order - b.order).find((m) => !m.done)
}

/** "165 gün kaldı", "Bugün", "12 gün geçti". */
export function describeTarget(targetDate: string, today: string): string {
  const days = differenceInCalendarDays(fromDateKey(targetDate), fromDateKey(today))
  if (days === 0) return 'Hedef bugün'
  return days > 0 ? `${days} gün kaldı` : `${-days} gün geçti`
}

const STATUS_ORDER: Record<ProjectStatus, number> = { active: 0, paused: 1, done: 2 }

/** Active first, then paused, then done; within a status the nearest target date first. */
export function compareProjects(a: Project, b: Project): number {
  return (
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
    (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999') ||
    a.createdAt.localeCompare(b.createdAt)
  )
}
