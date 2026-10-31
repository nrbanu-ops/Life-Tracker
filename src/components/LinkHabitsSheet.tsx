import { useState } from 'react'
import { setHabitProject } from '../db/projects'
import type { Habit, Project } from '../db/types'
import { BottomSheet } from './BottomSheet'
import { HabitForm } from './HabitForm'

type Props = {
  open: boolean
  project: Project
  /** Active habits, linked or not. */
  habits: Habit[]
  projects: Project[]
  onClose: () => void
}

/** Link existing habits to the project (or unlink them), or create a new linked habit. */
export function LinkHabitsSheet({ open, project, habits, projects, onClose }: Props) {
  const [creating, setCreating] = useState(false)
  const close = () => {
    setCreating(false)
    onClose()
  }

  return (
    <BottomSheet open={open} title={creating ? 'Yeni habit' : "Habit'leri bağla"} onClose={close}>
      {open &&
        (creating ? (
          <HabitForm defaultProjectId={project.id} projects={projects} onDone={() => setCreating(false)} />
        ) : (
          <div className="flex flex-col gap-3">
            {habits.length > 0 && (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-bg">
                {habits.map((habit) => {
                  const linked = habit.projectId === project.id
                  const other = !linked && habit.projectId
                    ? projects.find((p) => p.id === habit.projectId)
                    : undefined
                  return (
                    <li key={habit.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{habit.title}</span>
                        {other && (
                          <span className="block truncate text-xs text-muted">
                            Şu an: {other.title}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHabitProject(habit.id, linked ? undefined : project.id)}
                        aria-pressed={linked}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                          linked ? 'bg-accent text-surface' : 'bg-surface text-muted'
                        }`}
                      >
                        {linked ? 'Bağlı ✓' : 'Bağla'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-xl bg-bg px-4 py-3 text-left font-medium"
            >
              + Yeni habit oluştur
              <span className="block text-sm font-normal text-muted">
                Bu projeye bağlı olarak eklenir
              </span>
            </button>
          </div>
        ))}
    </BottomSheet>
  )
}
