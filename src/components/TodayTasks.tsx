import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router'
import { db } from '../db/db'
import { setTaskDone } from '../db/tasks'
import { currentTasks } from '../lib/tasks'
import { splitDone, type TodayItem } from '../lib/today'
import { HabitCheckRow } from './HabitCheckRow'
import { TaskRow } from './TaskRow'
import { TaskSheet, type TaskEditing } from './TaskSheet'

type Props = {
  today: string
  projectColor: Map<string, string>
  /** Monthly, yearly and "every N months" habits that ask something of today. */
  goals?: TodayItem[]
  /** The same kind with nothing to ask right now (reached, or not due yet): behind a fold. */
  waitingGoals?: TodayItem[]
  onGoalTap?: (item: TodayItem) => void
  onGoalMore?: (habitId: string) => void
}

/** Open tasks shown before the rest fold into "+n görev daha"; Bugün is not the tasks page. */
const SHOWN_TASKS = 8

/**
 * "Güncel görevler": what there is to get done besides the day's habits — overdue, today's,
 * undated and the next week's tasks (`currentTasks`), and the long goals whose turn it is (a
 * yearly check-up that has come round reads as a to-do, not as a habit of today). Whatever
 * was finished today stays so it can be undone.
 */
export function TodayTasks({ today, projectColor, goals = [], waitingGoals = [], onGoalTap, onGoalMore }: Props) {
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const projects = useLiveQuery(() => db.projects.toArray(), [], [])
  const [editing, setEditing] = useState<TaskEditing>(null)
  const [waitingShown, setWaitingShown] = useState(false)

  if (!tasks) return null
  const { open: allOpen, done } = currentTasks(tasks, today)
  const open = allOpen.slice(0, SHOWN_TASKS)
  const more = allOpen.length - open.length
  const goal = splitDone(goals)
  const waiting = waitingShown ? waitingGoals : []
  const finished = done.length + goal.done.length
  const total = allOpen.length + done.length + goals.length
  const mixed = goals.length + waiting.length > 0

  const habitRow = (item: TodayItem) => (
    <HabitCheckRow
      key={item.habit.id}
      item={item}
      projectColor={item.habit.projectId ? projectColor.get(item.habit.projectId) : undefined}
      onTap={() => onGoalTap?.(item)}
      onMore={() => onGoalMore?.(item.habit.id)}
    />
  )
  const taskRow = (task: (typeof tasks)[number]) => (
    <TaskRow
      key={task.id}
      task={task}
      today={today}
      besideHabits={mixed}
      projectColor={task.projectId ? projectColor.get(task.projectId) : undefined}
      onToggle={() => setTaskDone(task.id, !task.done)}
      onEdit={() => setEditing({ mode: 'edit', id: task.id })}
    />
  )

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="section-title">
          Güncel görevler{total > 0 && ` · ${finished}/${total}`}
        </h2>
        <div className="flex items-center gap-1">
          <Link to="/gorevler" className="section-chip tap-reach text-sm">
            Görevler ›
          </Link>
          <button
            type="button"
            onClick={() => setEditing({ mode: 'new', date: today })}
            aria-label="Görev ekle"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-lg text-accent"
          >
            +
          </button>
        </div>
      </div>

      {total + waiting.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditing({ mode: 'new', date: today })}
          className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-left text-sm text-muted"
        >
          Güncel görev yok. Eklemek için dokun.
        </button>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {open.map(taskRow)}
          {goal.open.map(habitRow)}
          {goal.done.map(habitRow)}
          {done.map(taskRow)}
          {waiting.map(habitRow)}
        </ul>
      )}

      {more > 0 && (
        <Link to="/gorevler" className="tap-text flex w-fit items-center text-sm text-muted">
          +{more} görev daha · Tümü ›
        </Link>
      )}

      {waitingGoals.length > 0 && (
        <button
          type="button"
          aria-expanded={waitingShown}
          onClick={() => setWaitingShown((v) => !v)}
          className="tap-text flex w-fit text-sm text-muted"
        >
          {waitingShown ? 'Şimdilik tamam olanları gizle' : `✓ ${waitingGoals.length} hedef şimdilik tamam · göster`}
        </button>
      )}

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
