import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { HabitForm } from '../components/HabitForm'
import { BackIcon } from '../components/icons'
import { LinkHabitsSheet } from '../components/LinkHabitsSheet'
import { MilestoneList } from '../components/MilestoneList'
import { PageHeader } from '../components/PageHeader'
import { PlanWithClaudeSheet } from '../components/PlanWithClaudeSheet'
import { ProgressBar } from '../components/ProgressBar'
import { ProjectAchievements } from '../components/ProjectAchievements'
import { ProjectForm } from '../components/ProjectForm'
import { TaskRow } from '../components/TaskRow'
import { TaskSheet, type TaskEditing } from '../components/TaskSheet'
import { db } from '../db/db'
import { setTaskDone } from '../db/tasks'
import type { Habit, HabitLog } from '../db/types'
import { buildProjectMessage } from '../lib/aiPlan'
import { describeTarget as describeAmount } from '../lib/amount'
import { geminiReady, useAiSettings } from '../lib/assistant'
import { fromDateKey } from '../lib/date'
import { describeFrequency } from '../lib/frequency'
import { describeTarget, projectProgress, STATUS_LABEL } from '../lib/projects'
import { formatElapsed, quitStats } from '../lib/quit'
import { lastDays, successRate } from '../lib/stats'
import { compareTasks } from '../lib/tasks'
import { useNow } from '../lib/useNow'
import { useTodayKey } from '../lib/useTodayKey'

const RATE_DAYS = 30

export function ProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const today = useTodayKey()
  const [from] = lastDays(today, RATE_DAYS)

  // null = loaded but missing (deleted or a bad link).
  const project = useLiveQuery(async () => (await db.projects.get(id)) ?? null, [id])
  const milestones = useLiveQuery(
    () => db.milestones.where('[projectId+order]').between([id, -Infinity], [id, Infinity]).toArray(),
    [id],
    [],
  )
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), [], [])
  const logs = useLiveQuery(
    () => db.habitLogs.where('date').between(from, today, true, true).toArray(),
    [from, today],
    [],
  )
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const projects = useLiveQuery(() => db.projects.toArray(), [], [])

  const [editingProject, setEditingProject] = useState(false)
  const [linking, setLinking] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit>()
  const [planning, setPlanning] = useState(false)
  const ai = useAiSettings()
  const [taskEditing, setTaskEditing] = useState<TaskEditing>(null)

  const back = (
    <button
      type="button"
      onClick={() => navigate('/projeler')}
      aria-label="Projelere dön"
      className="-mr-2.5 -mt-1.5 rounded-full p-2.5 text-muted transition-colors hover:text-text"
    >
      <BackIcon width={22} height={22} />
    </button>
  )

  if (project === undefined) return null
  if (project === null) {
    return (
      <>
        <PageHeader title="Proje bulunamadı" action={back} />
        <p className="text-sm text-muted">Bu proje silinmiş olabilir.</p>
      </>
    )
  }

  const progress = projectProgress(milestones)
  const linkedHabits = habits.filter((h) => h.projectId === id && !h.archived)
  const projectTasks = tasks.filter((t) => t.projectId === id)
  const openTasks = projectTasks.filter((t) => !t.done).sort(compareTasks)
  const doneTaskCount = projectTasks.length - openTasks.length

  return (
    <>
      <PageHeader
        title={project.title}
        subtitle={project.status !== 'active' ? STATUS_LABEL[project.status] : undefined}
        action={
          <div className="-mr-2 flex">
            <button
              type="button"
              onClick={() => setEditingProject(true)}
              className="rounded-full px-3 py-2 text-sm text-muted hover:text-text"
            >
              Düzenle
            </button>
            {back}
          </div>
        }
      />

      <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <span className="block h-1.5" style={{ background: project.color }} aria-hidden />
        <div className="flex flex-col gap-3 p-4">
          {project.description && <p className="text-sm whitespace-pre-wrap">{project.description}</p>}
          {project.targetDate && (
            <p className="text-sm text-muted">
              Hedef: {format(fromDateKey(project.targetDate), 'd MMMM yyyy', { locale: tr })}
              {project.status !== 'done' && ` · ${describeTarget(project.targetDate, today)}`}
            </p>
          )}
          <div className="flex items-center gap-3">
            <span className="flex-1">
              <ProgressBar ratio={progress.ratio} color={project.color} />
            </span>
            <span className="text-sm font-medium tabular-nums">
              %{Math.round(progress.ratio * 100)}
            </span>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">
            Adımlar{progress.total > 0 && ` · ${progress.done}/${progress.total}`}
          </h2>
          <div className="flex gap-2">
            {geminiReady(ai) && (
              <Link
                to={`/asistan?proje=${id}`}
                className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent"
              >
                💬 Gemini
              </Link>
            )}
            {ai.claude && (
              <button
                type="button"
                onClick={() => setPlanning(true)}
                className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent"
              >
                {geminiReady(ai) ? '✨ Claude' : '✨ Claude ile ekle'}
              </button>
            )}
          </div>
        </div>
        <MilestoneList projectId={id} milestones={milestones} color={project.color} today={today} />
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Bağlı habit'ler · son {RATE_DAYS} gün</h2>
          <button
            type="button"
            onClick={() => setLinking(true)}
            aria-label="Habit bağla"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-lg text-accent"
          >
            +
          </button>
        </div>
        {linkedHabits.length === 0 ? (
          <button
            type="button"
            onClick={() => setLinking(true)}
            className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-left text-sm text-muted"
          >
            Bu hedefe yardım edecek habit'leri bağla, ör. "Haftada 3 kez koşu".
          </button>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {linkedHabits.map((habit) => (
              <LinkedHabitRow
                key={habit.id}
                habit={habit}
                logs={logs}
                from={from}
                today={today}
                color={project.color}
                onEdit={() => setEditingHabit(habit)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">
            Görevler{doneTaskCount > 0 && ` · ${doneTaskCount} tamamlandı`}
          </h2>
          <button
            type="button"
            onClick={() => setTaskEditing({ mode: 'new', projectId: id })}
            aria-label="Görev ekle"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-lg text-accent"
          >
            +
          </button>
        </div>
        {openTasks.length === 0 ? (
          <p className="text-sm text-muted">Açık görev yok.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {openTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                onToggle={() => setTaskDone(task.id, !task.done)}
                onEdit={() => setTaskEditing({ mode: 'edit', id: task.id })}
              />
            ))}
          </ul>
        )}
      </section>

      <ProjectAchievements project={project} milestones={milestones} habits={linkedHabits} />

      <BottomSheet open={editingProject} title="Projeyi düzenle" onClose={() => setEditingProject(false)}>
        {editingProject && (
          <ProjectForm
            project={project}
            onDone={() => setEditingProject(false)}
            onDeleted={() => navigate('/projeler', { replace: true })}
          />
        )}
      </BottomSheet>
      <PlanWithClaudeSheet
        open={planning}
        today={today}
        project={project}
        projectMessage={buildProjectMessage(project, milestones, linkedHabits, today)}
        onClose={() => setPlanning(false)}
        onImported={() => setPlanning(false)}
      />
      <BottomSheet open={editingHabit !== undefined} title="Habit'i düzenle" onClose={() => setEditingHabit(undefined)}>
        {editingHabit && (
          <HabitForm
            key={editingHabit.id}
            habit={editingHabit}
            projects={projects.filter((p) => p.status !== 'done' || p.id === editingHabit.projectId)}
            onDone={() => setEditingHabit(undefined)}
          />
        )}
      </BottomSheet>

      <LinkHabitsSheet
        open={linking}
        project={project}
        habits={habits.filter((h) => !h.archived)}
        projects={projects}
        onClose={() => setLinking(false)}
      />
      <TaskSheet
        editing={taskEditing}
        tasks={tasks}
        projects={projects}
        today={today}
        onClose={() => setTaskEditing(null)}
      />
    </>
  )
}

type RowProps = {
  habit: Habit
  logs: HabitLog[]
  from: string
  today: string
  color: string
  /** Opens the habit form, e.g. to rename a habit that came with an AI plan. */
  onEdit: () => void
}

function LinkedHabitRow({ habit, logs, from, today, color, onEdit }: RowProps) {
  if (habit.kind === 'quit') return <QuitHabitRow habit={habit} onEdit={onEdit} />
  const subtitle = [describeAmount(habit), describeFrequency(habit.frequency)]
    .filter(Boolean)
    .join(' · ')

  const { done, planned, rate } = successRate(habit, logs, from, today, today)
  return (
    <li>
      <button type="button" onClick={onEdit} className="block w-full px-4 py-3 text-left">
      <span className="flex items-baseline justify-between gap-3">
        <span className="truncate font-medium">{habit.title}</span>
        <span className="shrink-0 text-sm font-medium tabular-nums">
          {rate === undefined ? '–' : `%${Math.round(rate * 100)}`}
        </span>
      </span>
      <span className="mt-0.5 mb-2 flex justify-between gap-3 text-xs text-muted">
        <span className="truncate">{subtitle}</span>
        {planned > 0 && <span className="shrink-0 tabular-nums">{done}/{planned} gün</span>}
      </span>
      <ProgressBar ratio={rate ?? 0} color={color} />
      </button>
    </li>
  )
}

/** Quit habits have no daily rate; they show time since quitting instead. */
function QuitHabitRow({ habit, onEdit }: { habit: Habit; onEdit: () => void }) {
  const now = useNow()
  return (
    <li>
      <button type="button" onClick={onEdit} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
      <span className="min-w-0">
        <span className="block truncate font-medium">{habit.title}</span>
        <span className="block text-sm text-muted">Bırakma</span>
      </span>
      <span className="shrink-0 text-sm font-medium">
        {formatElapsed(quitStats(habit, now).currentMs)}
      </span>
      </button>
    </li>
  )
}
