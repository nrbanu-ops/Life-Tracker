import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { AchievementList } from '../components/AchievementList'
import { BackIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { useAchievements } from '../db/achievements'
import { db } from '../db/db'
import { GROUP_LABEL, sortAchievements, visibleAchievements, type AchievementGroup } from '../lib/achievements'
import { compareProjects } from '../lib/projects'

const GENERAL_GROUPS: AchievementGroup[] = ['start', 'streak', 'total', 'perfect', 'quit', 'projects', 'library', 'other']

export function AchievementsPage() {
  const navigate = useNavigate()
  const achievements = useAchievements()
  const projects = useLiveQuery(() => db.projects.toArray(), [], [])

  const header = (
    <PageHeader
      title="Başarımlar"
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
  )
  if (!achievements) return header

  const earned = achievements.filter((a) => a.earned).length
  const visible = visibleAchievements(achievements)
  const recent = achievements
    .filter((a) => a.unlockedAt)
    .sort((a, b) => b.unlockedAt!.localeCompare(a.unlockedAt!))
    .slice(0, 6)

  return (
    <>
      {header}

      <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-3xl font-semibold tabular-nums">
            {earned}
            <span className="text-base font-normal text-muted"> / {achievements.length}</span>
          </span>
          <span className="text-sm text-muted">kazanıldı</span>
        </div>
        <ProgressBar ratio={achievements.length ? earned / achievements.length : 0} />
        {recent.length > 0 && (
          <div className="mt-3 flex gap-2" aria-label="Son kazanılanlar">
            {recent.map((a) => (
              <span
                key={a.id}
                title={a.title}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-xl"
              >
                {a.emoji}
              </span>
            ))}
          </div>
        )}
      </section>

      {GENERAL_GROUPS.map((group) => {
        const list = visible.filter((a) => a.group === group)
        if (list.length === 0) return null
        return (
          <section key={group} className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-muted">{GROUP_LABEL[group]}</h2>
            <AchievementList achievements={sortAchievements(list)} />
          </section>
        )
      })}

      {[...projects].sort(compareProjects).map((project) => {
        const list = visible.filter((a) => a.projectId === project.id)
        if (list.length === 0) return null
        return (
          <section key={project.id} className="mb-6">
            <Link to={`/projeler/${project.id}`} className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: project.color }} aria-hidden />
              {project.title} ›
            </Link>
            <AchievementList achievements={sortAchievements(list)} color={project.color} />
          </section>
        )
      })}
    </>
  )
}
