import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { EmptyState } from '../components/EmptyState'
import { HabitForm } from '../components/HabitForm'
import { PageHeader } from '../components/PageHeader'
import { db } from '../db/db'
import type { Habit, Project } from '../db/types'
import { describeTarget } from '../lib/amount'
import { describeFrequency } from '../lib/frequency'
import { isWeeklyGoal } from '../lib/today'

// Store only the id so the sheet always shows the live record.
type Editing = { mode: 'new' } | { mode: 'edit'; id: string } | null

export function HabitsPage() {
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray())
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').toArray(), [], [])
  const location = useLocation()
  const navigate = useNavigate()
  // Other screens can open the new-habit sheet by linking here with { newHabit: true }.
  const [editing, setEditing] = useState<Editing>(() =>
    location.state?.newHabit ? { mode: 'new' } : null,
  )
  useEffect(() => {
    // Clear the flag so a reload or back navigation does not reopen the sheet.
    if (location.state?.newHabit) navigate('.', { replace: true, state: null })
  }, [location.state, navigate])
  const [showArchived, setShowArchived] = useState(false)

  const active = habits?.filter((h) => !h.archived) ?? []
  const archived = habits?.filter((h) => h.archived) ?? []
  const editingHabit =
    editing?.mode === 'edit' ? habits?.find((h) => h.id === editing.id) : undefined
  const projectById = new Map(projects.map((p) => [p.id, p]))
  // Finished projects stay selectable only for habits already linked to them.
  const selectableProjects = projects.filter(
    (p) => p.status !== 'done' || editingHabit?.projectId === p.id,
  )
  const select = (habit: Habit) => setEditing({ mode: 'edit', id: habit.id })

  return (
    <>
      <PageHeader title="Habit'ler" />

      {habits === undefined ? null : active.length === 0 ? (
        <EmptyState
          title="Henüz habit yok"
          text="Her gün ya da haftada birkaç kez yapmak istediğin şeyleri ekle."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {[
            { title: 'Günlük hedefler', list: active.filter((h) => h.kind !== 'quit' && !isWeeklyGoal(h)) },
            { title: 'Haftalık hedefler', list: active.filter((h) => h.kind !== 'quit' && isWeeklyGoal(h)) },
            { title: 'Bıraktıkların', list: active.filter((h) => h.kind === 'quit') },
          ]
            .filter((group) => group.list.length > 0)
            .map((group) => (
              <section key={group.title}>
                <h2 className="mb-2 text-sm font-medium text-muted">
                  {group.title} · {group.list.length}
                </h2>
                <HabitList habits={group.list} projectById={projectById} onSelect={select} />
              </section>
            ))}
        </div>
      )}

      {archived.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
            className="text-sm text-muted"
          >
            {showArchived ? 'Arşivi gizle' : `Arşiv (${archived.length})`}
          </button>
          {showArchived && (
            <div className="mt-3 opacity-70">
              <HabitList habits={archived} projectById={projectById} onSelect={select} />
            </div>
          )}
        </section>
      )}

      {/* Keeps the last row reachable above the floating button. */}
      <div className="h-20" aria-hidden />

      {/* Aligned with the content column so it stays close on wide screens. */}
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
          Yeni habit
        </button>
      </div>

      <BottomSheet
        open={editing !== null}
        title={editing?.mode === 'edit' ? "Habit'i düzenle" : 'Yeni habit'}
        onClose={() => setEditing(null)}
      >
        {editing && (editing.mode === 'new' || editingHabit) && (
          <HabitForm
            // Remount per habit so the form starts from fresh state.
            key={editing.mode === 'edit' ? editing.id : 'new'}
            habit={editingHabit}
            projects={selectableProjects}
            onDone={() => setEditing(null)}
          />
        )}
      </BottomSheet>
    </>
  )
}

type ListProps = {
  habits: Habit[]
  projectById: Map<string, Project>
  onSelect: (habit: Habit) => void
}

function HabitList({ habits, projectById, onSelect }: ListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {habits.map((habit) => {
        const project = habit.projectId ? projectById.get(habit.projectId) : undefined
        return (
          <li key={habit.id}>
            <button
              type="button"
              onClick={() => onSelect(habit)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: project?.color ?? 'var(--color-border)' }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{habit.title}</span>
                <span className="block truncate text-sm text-muted">
                  {habit.kind === 'quit'
                    ? 'Bırakma'
                    : [describeTarget(habit), describeFrequency(habit.frequency)]
                        .filter(Boolean)
                        .join(' · ')}
                  {project && ` · ${project.title}`}
                  {habit.minimumVersion && ` · Min: ${habit.minimumVersion}`}
                </span>
              </span>
              <span className="text-muted" aria-hidden>
                ›
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
