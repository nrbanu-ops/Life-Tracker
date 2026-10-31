import type { Project, Task } from '../db/types'
import { BottomSheet } from './BottomSheet'
import { TaskForm } from './TaskForm'

/** Only ids are stored so the sheet always edits the live record. */
export type TaskEditing =
  | { mode: 'new'; date?: string; projectId?: string }
  | { mode: 'edit'; id: string }
  | null

type Props = {
  editing: TaskEditing
  tasks: Task[]
  projects: Project[]
  today: string
  onClose: () => void
}

export function TaskSheet({ editing, tasks, projects, today, onClose }: Props) {
  const task = editing?.mode === 'edit' ? tasks.find((t) => t.id === editing.id) : undefined
  // Finished projects stay selectable only for tasks already linked to them.
  const selectable = projects.filter((p) => p.status !== 'done' || task?.projectId === p.id)

  return (
    <BottomSheet
      open={editing !== null}
      title={editing?.mode === 'edit' ? 'Görevi düzenle' : 'Yeni görev'}
      onClose={onClose}
    >
      {editing && (editing.mode === 'new' || task) && (
        <TaskForm
          key={editing.mode === 'edit' ? editing.id : 'new'}
          task={task}
          defaultDate={editing.mode === 'new' ? editing.date : undefined}
          defaultProjectId={editing.mode === 'new' ? editing.projectId : undefined}
          today={today}
          projects={selectable}
          onDone={onClose}
        />
      )}
    </BottomSheet>
  )
}
