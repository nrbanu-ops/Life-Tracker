import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { PlanWithClaudeSheet } from '../components/PlanWithClaudeSheet'
import { ProgressBar } from '../components/ProgressBar'
import { ProjectForm } from '../components/ProjectForm'
import { db } from '../db/db'
import type { Milestone, Project } from '../db/types'
import { geminiReady, useAiSettings } from '../lib/assistant'
import { fromDateKey } from '../lib/date'
import { compareProjects, describeTarget, nextMilestone, projectProgress, STATUS_LABEL } from '../lib/projects'
import { useTodayKey } from '../lib/useTodayKey'

export function ProjectsPage() {
  const navigate = useNavigate()
  const today = useTodayKey()
  const projects = useLiveQuery(() => db.projects.toArray())
  const milestones = useLiveQuery(() => db.milestones.toArray(), [], [])
  const [creating, setCreating] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const ai = useAiSettings()

  const sorted = [...(projects ?? [])].sort(compareProjects)
  const open = sorted.filter((p) => p.status !== 'done')
  const done = sorted.filter((p) => p.status === 'done')
  const milestonesOf = (id: string) => milestones.filter((m) => m.projectId === id)

  return (
    <>
      <PageHeader title="Projeler" />

      {geminiReady(ai) && (
        <Link
          to="/asistan"
          className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-left"
        >
          <span className="text-xl" aria-hidden>
            💬
          </span>
          <span>
            <span className="block font-medium text-accent">Gemini ile planla</span>
            <span className="block text-sm text-muted">Sohbet et; plan hazır olunca tek dokunuşla ekle</span>
          </span>
        </Link>
      )}
      {ai.claude && (
        <button
          type="button"
          onClick={() => setPlanning(true)}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-left"
        >
          <span className="text-xl" aria-hidden>
            ✨
          </span>
          <span>
            <span className="block font-medium text-accent">Claude ile planla</span>
            <span className="block text-sm text-muted">
              Hedefini anlat; adımları ve habit'leri birlikte çıkarın
            </span>
          </span>
        </button>
      )}
      {projects === undefined ? null : open.length === 0 && done.length === 0 ? (
        <EmptyState
          title="Henüz proje yok"
          text="Bir hedef ekle, onu küçük adımlara (milestone) böl ve habit'lerini ona bağla."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {open.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              milestones={milestonesOf(project.id)}
              today={today}
            />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="text-sm text-muted"
          >
            {showDone ? 'Tamamlananları gizle' : `Tamamlananlar (${done.length})`}
          </button>
          {showDone && (
            <ul className="mt-3 flex flex-col gap-3 opacity-70">
              {done.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  milestones={milestonesOf(project.id)}
                  today={today}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Keeps the last card reachable above the floating button. */}
      <div className="h-20" aria-hidden />

      <div
        className="pointer-events-none fixed inset-x-0 z-10 mx-auto flex max-w-lg justify-end px-4"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 font-medium text-surface shadow-lg"
        >
          <span className="text-xl leading-none" aria-hidden>
            +
          </span>
          Yeni proje
        </button>
      </div>

      <PlanWithClaudeSheet
        open={planning}
        today={today}
        onClose={() => setPlanning(false)}
        onImported={(id) => {
          setPlanning(false)
          navigate(`/projeler/${id}`)
        }}
      />

      <BottomSheet open={creating} title="Yeni proje" onClose={() => setCreating(false)}>
        {creating && (
          <ProjectForm
            onDone={(id) => {
              setCreating(false)
              // A new project starts empty, so go straight to adding its milestones.
              if (id) navigate(`/projeler/${id}`)
            }}
          />
        )}
      </BottomSheet>
    </>
  )
}

type CardProps = {
  project: Project
  milestones: Milestone[]
  today: string
}

function ProjectCard({ project, milestones, today }: CardProps) {
  const progress = projectProgress(milestones)
  const next = nextMilestone(milestones)

  return (
    <li>
      <Link
        to={`/projeler/${project.id}`}
        className="block overflow-hidden rounded-2xl border border-border bg-surface"
      >
        <span className="block h-1.5" style={{ background: project.color }} aria-hidden />
        <span className="block px-4 pt-3 pb-4">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate font-semibold">{project.title}</span>
            {project.status === 'paused' && (
              <span className="shrink-0 text-xs text-muted">{STATUS_LABEL.paused}</span>
            )}
          </span>
          {project.targetDate && (
            <span className="mt-0.5 block text-sm text-muted">
              {format(fromDateKey(project.targetDate), 'd MMMM yyyy', { locale: tr })}
              {project.status !== 'done' && ` · ${describeTarget(project.targetDate, today)}`}
            </span>
          )}
          <span className="mt-3 flex items-center gap-3">
            <span className="flex-1">
              <ProgressBar ratio={progress.ratio} color={project.color} />
            </span>
            <span className="text-xs text-muted tabular-nums">
              {progress.total === 0 ? 'Adım yok' : `${progress.done}/${progress.total}`}
            </span>
          </span>
          {next && project.status !== 'done' && (
            <span className="mt-2 block truncate text-sm">
              <span className="text-muted">Sıradaki: </span>
              {next.title}
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}
