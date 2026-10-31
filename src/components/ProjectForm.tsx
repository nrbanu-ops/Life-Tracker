import { useState, type FormEvent } from 'react'
import { createProject, deleteProject, updateProject, type ProjectInput } from '../db/projects'
import type { Project, ProjectStatus } from '../db/types'
import { PROJECT_COLORS, STATUS_LABEL } from '../lib/projects'
import { Segmented } from './Segmented'

type Props = {
  /** Omit to create a new project. */
  project?: Project
  /** Called with the new project's id after creating, or nothing after saving/deleting. */
  onDone: (createdId?: string) => void
  onDeleted?: () => void
}

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

export function ProjectForm({ project, onDone, onDeleted }: Props) {
  const [title, setTitle] = useState(project?.title ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0])
  const [targetDate, setTargetDate] = useState(project?.targetDate ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const trimmedTitle = title.trim()
  const canSave = trimmedTitle !== '' && !saving

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    const input: ProjectInput = {
      title: trimmedTitle,
      description: description.trim() || undefined,
      color,
      status,
      targetDate: targetDate || undefined,
    }
    if (project) {
      await updateProject(project.id, input)
      onDone()
    } else {
      onDone(await createProject(input))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Hedefin ne?</span>
        <input
          id="project-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ör. Maraton koşmak, İspanyolca B1"
          className={inputClass}
          autoFocus={!project}
          maxLength={80}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Açıklama (isteğe bağlı)</span>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Neden önemli, nasıl bir sonuç istiyorsun?"
          rows={2}
          maxLength={500}
          className={`${inputClass} resize-y`}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm text-muted">Renk</legend>
        <div className="flex flex-wrap gap-2.5">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Renk ${c}`}
              aria-pressed={color === c}
              className={`h-9 w-9 rounded-full ${color === c ? 'ring-2 ring-text ring-offset-2 ring-offset-surface' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Hedef tarih (isteğe bağlı)</span>
        <input
          id="project-target"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={inputClass}
        />
      </label>

      {project && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm text-muted">Durum</legend>
          <Segmented
            options={(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
            }))}
            value={status}
            onChange={setStatus}
          />
        </fieldset>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
        >
          {project ? 'Kaydet' : 'Proje oluştur'}
        </button>
        {project &&
          (confirmDelete ? (
            <div className="flex flex-col gap-2 rounded-xl bg-bg p-3">
              <p className="text-sm text-muted">
                Proje ve adımları silinir. Bağlı habit'ler ve görevler silinmez, sadece projeden
                ayrılır.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await deleteProject(project.id)
                    onDeleted?.()
                  }}
                  className="flex-1 rounded-xl bg-surface py-2.5 text-sm font-medium text-p1"
                >
                  Evet, sil
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl py-2.5 text-sm text-muted"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl py-3 text-sm text-muted"
            >
              Projeyi sil
            </button>
          ))}
      </div>
    </form>
  )
}
