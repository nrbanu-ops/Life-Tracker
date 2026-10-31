import { addDays, addMonths, differenceInCalendarDays, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Task, TaskPriority, TaskRepeat } from '../db/types'
import { fromDateKey, toDateKey, weekRange } from './date'

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  1: 'Acil',
  2: 'Yüksek',
  3: 'Orta',
  4: 'Düşük',
}

export const REPEAT_LABEL: Record<TaskRepeat, string> = {
  daily: 'Her gün',
  weekly: 'Her hafta',
  monthly: 'Her ay',
}

const step = (key: string, repeat: TaskRepeat): string => {
  const date = fromDateKey(key)
  if (repeat === 'daily') return toDateKey(addDays(date, 1))
  if (repeat === 'weekly') return toDateKey(addDays(date, 7))
  return toDateKey(addMonths(date, 1))
}

/**
 * Due date of the next occurrence after completing a repeating task:
 * the first step after its date that falls after today, so a late
 * completion doesn't leave a trail of overdue copies.
 */
export function nextOccurrence(date: string, repeat: TaskRepeat, today: string): string {
  let next = step(date, repeat)
  while (next <= today) next = step(next, repeat)
  return next
}

/** Priority first, then timed before untimed, then by time and date. */
export function compareTasks(a: Task, b: Task): number {
  return (
    a.priority - b.priority ||
    (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
    (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
    a.createdAt.localeCompare(b.createdAt)
  )
}

/** Today's list: open tasks due today or earlier, plus tasks completed today. */
export function todayTasks(tasks: Task[], today: string): { open: Task[]; done: Task[] } {
  const open = tasks.filter((t) => !t.done && t.date !== undefined && t.date <= today)
  const done = tasks.filter((t) => t.done && t.completedAt && toDateKey(new Date(t.completedAt)) === today)
  return { open: open.sort(compareTasks), done: done.sort(compareTasks) }
}

export type TaskGroup = { key: string; title: string; tasks: Task[] }

/** Open tasks grouped by when they are due, for the tasks page. */
export function groupTasks(tasks: Task[], today: string): TaskGroup[] {
  const tomorrow = toDateKey(addDays(fromDateKey(today), 1))
  const weekEnd = weekRange(today).end
  const groups: TaskGroup[] = [
    { key: 'overdue', title: 'Gecikmiş', tasks: [] },
    { key: 'today', title: 'Bugün', tasks: [] },
    { key: 'tomorrow', title: 'Yarın', tasks: [] },
    { key: 'week', title: 'Bu hafta', tasks: [] },
    { key: 'later', title: 'Daha sonra', tasks: [] },
    { key: 'undated', title: 'Tarihsiz', tasks: [] },
  ]
  const byKey = new Map(groups.map((g) => [g.key, g.tasks]))
  for (const task of tasks) {
    if (task.done) continue
    const { date } = task
    const key =
      date === undefined
        ? 'undated'
        : date < today
          ? 'overdue'
          : date === today
            ? 'today'
            : date === tomorrow
              ? 'tomorrow'
              : date <= weekEnd
                ? 'week'
                : 'later'
    byKey.get(key)?.push(task)
  }
  return groups
    .map((g) => ({ ...g, tasks: g.tasks.sort(compareTasks) }))
    .filter((g) => g.tasks.length > 0)
}

/** "3 gün gecikti", "Bugün 14:00", "Yarın", "Cuma", "5 Kas". */
export function describeDue(task: Task, today: string): string | undefined {
  if (!task.date) return undefined
  const days = differenceInCalendarDays(fromDateKey(task.date), fromDateKey(today))
  let label: string
  if (days < 0 && !task.done) label = days === -1 ? 'Dün' : `${-days} gün gecikti`
  else if (days === 0) label = 'Bugün'
  else if (days === 1) label = 'Yarın'
  else if (days > 1 && days < 7) label = format(fromDateKey(task.date), 'EEEE', { locale: tr })
  else label = format(fromDateKey(task.date), 'd MMM', { locale: tr })
  return task.time ? `${label} ${task.time}` : label
}

export const isOverdue = (task: Task, today: string): boolean =>
  !task.done && task.date !== undefined && task.date < today
