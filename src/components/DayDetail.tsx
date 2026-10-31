import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import { setLog } from '../db/logs'
import { setTaskDone } from '../db/tasks'
import type { Habit, HabitLog, Project, Task } from '../db/types'
import { fromDateKey } from '../lib/date'
import { compareTasks } from '../lib/tasks'
import { buildToday, dayProgress, tapResult } from '../lib/today'
import { DayJournal } from './DayJournal'
import { HabitActionSheet } from './HabitActionSheet'
import { HabitCheckRow } from './HabitCheckRow'
import { TaskRow } from './TaskRow'
import { TaskSheet, type TaskEditing } from './TaskSheet'

type Props = {
  date: string
  today: string
  habits: Habit[]
  /** Logs covering at least the week of `date`. */
  logs: HabitLog[]
  tasks: Task[]
  projects: Project[]
}

/** One day in the calendar: its habits (markable up to today) and its tasks. */
export function DayDetail({ date, today, habits, logs, tasks, projects }: Props) {
  const [actionHabitId, setActionHabitId] = useState<string>()
  const [editing, setEditing] = useState<TaskEditing>(null)

  const items = buildToday(habits, logs, date)
  const { done, total } = dayProgress(items)
  const dayTasks = tasks.filter((t) => t.date === date).sort(compareTasks)
  const projectColor = new Map(projects.map((p) => [p.id, p.color]))
  const isFuture = date > today

  return (
    <section className="mt-6 flex flex-col gap-5">
      <h2 className="text-lg font-semibold">
        {format(fromDateKey(date), 'd MMMM EEEE', { locale: tr })}
        {date === today && <span className="ml-2 text-sm font-normal text-accent">Bugün</span>}
      </h2>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted">
          Habit'ler{!isFuture && total > 0 && ` · ${done}/${total}`}
        </h3>
        {isFuture ? (
          <p className="text-sm text-muted">Habit'ler o gün geldiğinde işaretlenebilir.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">Bu gün için planlı habit yoktu.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {items.map((item) => (
              <HabitCheckRow
                key={item.habit.id}
                item={item}
                projectColor={item.habit.projectId ? projectColor.get(item.habit.projectId) : undefined}
                onTap={() => setLog(item.habit.id, date, tapResult(item.habit, item))}
                onMore={() => setActionHabitId(item.habit.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted">Görevler</h3>
          <button
            type="button"
            onClick={() => setEditing({ mode: 'new', date })}
            aria-label="Bu güne görev ekle"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-lg text-accent"
          >
            +
          </button>
        </div>
        {dayTasks.length === 0 ? (
          <p className="text-sm text-muted">Bu güne ait görev yok.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {dayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                projectColor={task.projectId ? projectColor.get(task.projectId) : undefined}
                onToggle={() => setTaskDone(task.id, !task.done)}
                onEdit={() => setEditing({ mode: 'edit', id: task.id })}
              />
            ))}
          </ul>
        )}
      </div>

      <DayJournal date={date} canWrite={!isFuture} />

      <HabitActionSheet
        item={items.find((item) => item.habit.id === actionHabitId)}
        date={date}
        onClose={() => setActionHabitId(undefined)}
      />
      <TaskSheet
        editing={editing}
        tasks={tasks}
        projects={projects}
        today={today}
        onClose={() => setEditing(null)}
      />
    </section>
  )
}
