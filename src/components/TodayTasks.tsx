import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router'
import { db } from '../db/db'
import { setTaskDone } from '../db/tasks'
import { todayTasks } from '../lib/tasks'
import { TaskRow } from './TaskRow'
import { TaskSheet, type TaskEditing } from './TaskSheet'

type Props = {
  today: string
  projectColor: Map<string, string>
}

/** Today's tasks: overdue and due today, plus the ones finished today so they can be undone. */
export function TodayTasks({ today, projectColor }: Props) {
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const projects = useLiveQuery(() => db.projects.toArray(), [], [])
  const [editing, setEditing] = useState<TaskEditing>(null)

  if (!tasks) return null
  const { open, done } = todayTasks(tasks, today)
  const total = open.length + done.length

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">
          Görevler{total > 0 && ` · ${done.length}/${total}`}
        </h2>
        <div className="flex items-center gap-1">
          <Link to="/gorevler" className="rounded-full px-2 py-1 text-sm text-muted">
            Tümü ›
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

      {total === 0 ? (
        <button
          type="button"
          onClick={() => setEditing({ mode: 'new', date: today })}
          className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-left text-sm text-muted"
        >
          Bugün için görev yok. Eklemek için dokun.
        </button>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {[...open, ...done].map((task) => (
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
