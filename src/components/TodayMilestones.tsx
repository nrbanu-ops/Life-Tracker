import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../db/db'
import { setMilestoneDone } from '../db/projects'
import { compareProjects, nextMilestone } from '../lib/projects'

/** The next open milestone of each active project; tick it off right here. */
export function TodayMilestones() {
  const projects = useLiveQuery(() => db.projects.where('status').equals('active').toArray())
  const milestones = useLiveQuery(() => db.milestones.toArray())
  if (!projects || !milestones) return null

  const rows = [...projects].sort(compareProjects).flatMap((project) => {
    const next = nextMilestone(milestones.filter((m) => m.projectId === project.id))
    return next ? [{ project, next }] : []
  })
  if (rows.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-medium text-muted">Projelerinde sıradaki adım</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.map(({ project, next }) => (
          <li key={project.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setMilestoneDone(next.id, true)}
              aria-label={`${next.title}: tamamla`}
              className="flex shrink-0 items-center self-stretch py-3 pr-3 pl-4"
            >
              <span className="h-6 w-6 rounded-md border-2" style={{ borderColor: project.color }} />
            </button>
            <Link to={`/projeler/${project.id}`} className="min-w-0 flex-1 py-3 pr-4">
              <span className="block truncate">{next.title}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: project.color }} aria-hidden />
                {project.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
