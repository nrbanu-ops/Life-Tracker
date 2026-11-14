import type { Task, TaskPriority } from '../db/types'
import { describeDue, isOverdue, REPEAT_LABEL } from '../lib/tasks'

type Props = {
  task: Task
  today: string
  projectColor?: string
  /** Listed together with habit rows: the check box takes a habit mark's width so the titles line up. */
  besideHabits?: boolean
  onToggle: () => void
  onEdit: () => void
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  1: 'var(--color-p1)',
  2: 'var(--color-p2)',
  3: 'var(--color-p3)',
  4: 'var(--color-border)',
}

export function TaskRow({ task, today, projectColor, besideHabits = false, onToggle, onEdit }: Props) {
  const due = describeDue(task, today)
  const overdue = isOverdue(task, today)
  const color = PRIORITY_COLOR[task.priority]
  // Low priority has no color of its own, so a done one fills with the accent.
  const doneColor = task.priority === 4 ? 'var(--color-accent)' : color

  return (
    <li className="flex items-center">
      {/* The checkbox is its own large target: one tap completes. */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${task.title}: ${task.done ? 'tamamlandı, geri al' : 'tamamla'}`}
        aria-pressed={task.done}
        className={`flex shrink-0 touch-manipulation items-center self-stretch py-3.5 pr-3 pl-4 ${besideHabits ? 'w-[3.75rem] justify-center' : ''}`}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full border-2"
          style={task.done ? { borderColor: doneColor, background: doneColor } : { borderColor: color }}
        >
          {task.done && (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-surface" fill="none" stroke="currentColor" strokeWidth={3.5}>
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 py-3.5 pr-4 text-left">
        <span className={`block truncate ${task.done ? 'text-muted line-through' : ''}`}>
          {task.title}
        </span>
        {(due || task.repeat) && (
          <span className="flex items-center gap-2 text-sm text-muted">
            {due && <span className={overdue ? 'text-p1' : ''}>{due}</span>}
            {task.repeat && <span>↻ {REPEAT_LABEL[task.repeat]}</span>}
          </span>
        )}
      </button>
      {projectColor && (
        <span
          className="mr-4 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: projectColor }}
          aria-hidden
        />
      )}
    </li>
  )
}
