import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAchievements } from '../db/achievements'
import { db } from '../db/db'
import { markAsked, replaceProjectAchievements, wasAsked } from '../db/projectAchievements'
import type { Habit, Milestone, Project } from '../db/types'
import { sortAchievements, visibleAchievements } from '../lib/achievements'
import { buildAchievementsRequest, parseAchievements, resolveAchievements } from '../lib/aiPlan'
import { geminiReady, useAiSettings } from '../lib/assistant'
import { askGemini } from '../lib/gemini'
import { AchievementList } from './AchievementList'

const SYSTEM = 'Sen kişisel hedefler için motive edici başarımlar (rozetler) tasarlayan bir koçsun. İstenen biçimin dışına çıkma.'

// Projects being asked about right now, so a re-render (or StrictMode) doesn't ask twice.
const inFlight = new Set<string>()

type Props = { project: Project; milestones: Milestone[]; habits: Habit[] }

/** The project's achievements; the AI picks the project-specific ones the first time there is something to go on. */
export function ProjectAchievements({ project, milestones, habits }: Props) {
  const ai = useAiSettings()
  const achievements = useAchievements()
  const ownCount = useLiveQuery(() => db.projectAchievements.where('projectId').equals(project.id).count(), [project.id])
  const [state, setState] = useState<'idle' | 'working' | { error: string }>(inFlight.has(project.id) ? 'working' : 'idle')
  const canAsk = geminiReady(ai) && milestones.length + habits.length > 0

  async function generate() {
    if (inFlight.has(project.id)) return
    inFlight.add(project.id)
    setState('working')
    try {
      const answer = await askGemini(ai.geminiKey, SYSTEM, [
        { role: 'user', text: buildAchievementsRequest(project, milestones, habits) },
      ])
      const list = resolveAchievements(parseAchievements(answer), milestones, habits)
      if (list.length === 0) throw new Error('Yapay zeka uygun bir başarım önermedi, tekrar dene.')
      await replaceProjectAchievements(project.id, list)
      setState('idle')
    } catch (e) {
      setState({ error: (e as Error).message })
    } finally {
      await markAsked(project.id)
      inFlight.delete(project.id)
    }
  }

  // First visit with Gemini on and no AI achievements yet: ask once, without a tap.
  useEffect(() => {
    if (!canAsk || ownCount !== 0) return
    void wasAsked(project.id).then((asked) => {
      if (!asked) void generate()
    })
    // generate reads the latest props itself; only these decide whether to start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAsk, ownCount, project.id])

  if (!achievements) return null
  const list = sortAchievements(visibleAchievements(achievements.filter((a) => a.projectId === project.id)))
  const earned = list.filter((a) => a.earned).length

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">
          Başarımlar · {earned}/{list.length}
        </h2>
        {canAsk && (
          <button
            type="button"
            onClick={generate}
            disabled={state === 'working'}
            className="rounded-full px-2 py-1 text-sm text-muted disabled:opacity-50"
          >
            {state === 'working' ? 'Yapay zeka düşünüyor…' : '🔄 Yeniden belirle'}
          </button>
        )}
      </div>
      <AchievementList achievements={list} color={project.color} />
      {typeof state === 'object' && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {ownCount === 0 && !geminiReady(ai) && (
        <p className="mt-2 text-xs text-muted">
          Projeye özel başarımları yapay zeka belirler.{' '}
          <Link to="/ayarlar#yapay-zeka" className="underline">
            Gemini anahtarını ekle
          </Link>{' '}
          ya da planı Claude ile yap.
        </p>
      )}
    </section>
  )
}
