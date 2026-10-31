import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { BackIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { TaskRow } from '../components/TaskRow'
import { TaskSheet, type TaskEditing } from '../components/TaskSheet'
import { db } from '../db/db'
import { setTaskDone } from '../db/tasks'
import { groupTasks } from '../lib/tasks'
import { useTodayKey } from '../lib/useTodayKey'

const RECENT_DONE = 20

export function TasksPage() {
  const navigate = useNavigate()
  const today = useTodayKey()
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const projects = useLiveQuery(() => db.projects.toArray(), [], [])
  const [editing, setEditing] = useState<TaskEditing>(null)
  const [showDone, setShowDone] = useState(false)

  const groups = tasks ? groupTasks(tasks, today) : []
  const done = (tasks ?? [])
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, RECENT_DONE)
  const projectColor = new Map(projects.map((p) => [p.id, p.color]))

  const renderRows = (list: typeof done) => (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {list.map((task) => (
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
  )

  return (
    <>
      <PageHeader
        title="Görevler"
        action={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Geri"
            className="-mr-2 rounded-full p-2 text-muted transition-colors hover:text-text"
          >
            <BackIcon width={22} height={22} />
          </button>
        }
      />

      {tasks === undefined ? null : groups.length === 0 ? (
        <EmptyState
          title="Açık görev yok"
          text="Yapılacakları buraya ekle; tarihi olanlar o gün Bugün ekranında görünür."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key}>
              <h2
                className={`mb-2 text-sm font-medium ${group.key === 'overdue' ? 'text-p1' : 'text-muted'}`}
              >
                {group.title} · {group.tasks.length}
              </h2>
              {renderRows(group.tasks)}
            </section>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="text-sm text-muted"
          >
            {showDone ? 'Tamamlananları gizle' : 'Son tamamlananlar'}
          </button>
          {showDone && <div className="mt-3">{renderRows(done)}</div>}
        </section>
      )}

      {/* Keeps the last row reachable above the floating button. */}
      <div className="h-20" aria-hidden />

      <div
        className="pointer-events-none fixed inset-x-0 z-10 mx-auto flex max-w-lg justify-end px-4"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => setEditing({ mode: 'new' })}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 font-medium text-surface shadow-lg"
        >
          <span className="text-xl leading-none" aria-hidden>
            +
          </span>
          Yeni görev
        </button>
      </div>

      <TaskSheet
        editing={editing}
        tasks={tasks ?? []}
        projects={projects}
        today={today}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
