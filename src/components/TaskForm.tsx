import { addDays } from 'date-fns'
import { useState, type FormEvent } from 'react'
import { createTask, deleteTask, updateTask, type TaskInput } from '../db/tasks'
import type { Project, Task, TaskPriority, TaskRepeat } from '../db/types'
import { fromDateKey, toDateKey } from '../lib/date'
import { PRIORITY_LABEL, REPEAT_LABEL } from '../lib/tasks'
import { Segmented } from './Segmented'

type Props = {
  /** Omit to create a new task. */
  task?: Task
  /** Date for a new task; undefined means undated. */
  defaultDate?: string
  /** Project for a new task, e.g. when added from a project page. */
  defaultProjectId?: string
  today: string
  projects: Project[]
  onDone: () => void
}

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

const PRIORITIES: TaskPriority[] = [1, 2, 3, 4]

export function TaskForm({ task, defaultDate, defaultProjectId, today, projects, onDone }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [date, setDate] = useState(task ? (task.date ?? '') : (defaultDate ?? ''))
  const [time, setTime] = useState(task?.time ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 4)
  const [repeat, setRepeat] = useState<TaskRepeat | ''>(task?.repeat ?? '')
  const [projectId, setProjectId] = useState(task ? (task.projectId ?? '') : (defaultProjectId ?? ''))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const tomorrow = toDateKey(addDays(fromDateKey(today), 1))
  const trimmedTitle = title.trim()
  const canSave = trimmedTitle !== '' && !saving

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    // Time and repeat only make sense with a date; repeating without one starts today.
    const effectiveDate = date || (repeat ? today : '')
    const input: TaskInput = {
      title: trimmedTitle,
      date: effectiveDate || undefined,
      time: effectiveDate && time ? time : undefined,
      priority,
      repeat: repeat || undefined,
      projectId: projectId || undefined,
    }
    if (task) await updateTask(task.id, input)
    else await createTask(input)
    onDone()
  }

  const dateChips = [
    { label: 'Bugün', value: today },
    { label: 'Yarın', value: tomorrow },
    { label: 'Tarihsiz', value: '' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <input
        id="task-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ne yapılacak?"
        aria-label="Görev"
        className={inputClass}
        autoFocus={!task}
        maxLength={120}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm text-muted">Ne zaman?</legend>
        <div className="flex flex-wrap gap-2">
          {dateChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setDate(chip.value)}
              aria-pressed={date === chip.value}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                date === chip.value ? 'bg-accent text-surface' : 'bg-bg text-muted'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Tarih</span>
            <input
              id="task-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Saat (isteğe bağlı)</span>
            <input
              id="task-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!date && !repeat}
              className={`${inputClass} disabled:opacity-50`}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm text-muted">Öncelik</legend>
        <Segmented
          options={PRIORITIES.map((p) => ({ value: String(p), label: PRIORITY_LABEL[p] }))}
          value={String(priority)}
          onChange={(value) => setPriority(Number(value) as TaskPriority)}
        />
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">Tekrar</span>
          <select
            id="task-repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as TaskRepeat | '')}
            className={inputClass}
          >
            <option value="">Tekrar yok</option>
            {(Object.keys(REPEAT_LABEL) as TaskRepeat[]).map((r) => (
              <option key={r} value={r}>
                {REPEAT_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">Proje</span>
          <select
            id="task-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className={inputClass}
            disabled={projects.length === 0}
          >
            <option value="">{projects.length === 0 ? 'Henüz proje yok' : 'Projesiz'}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
        >
          {task ? 'Kaydet' : 'Görev ekle'}
        </button>
        {task &&
          (confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await deleteTask(task.id)
                  onDone()
                }}
                className="flex-1 rounded-xl bg-bg py-3 text-sm font-medium text-p1"
              >
                Evet, sil
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-xl py-3 text-sm text-muted"
              >
                Vazgeç
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl py-3 text-sm text-muted"
            >
              Görevi sil
            </button>
          ))}
      </div>
    </form>
  )
}
