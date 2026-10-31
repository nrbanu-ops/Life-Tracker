import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog, Milestone, Project, ProjectAchievement } from '../db/types'
import { evaluateAchievements, newlyEarned, perfectDays, visibleAchievements, type AchievementData } from './achievements'

const habit = (id: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  title: id,
  kind: 'check',
  frequency: { type: 'daily' },
  archived: false,
  order: 0,
  createdAt: new Date(2026, 0, 1).toISOString(),
  ...extra,
})
const done = (habitId: string, date: string): HabitLog => ({ id: `${habitId}${date}`, habitId, date, status: 'done' })
const days = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `2026-01-${String(from + i).padStart(2, '0')}`)

const empty: AchievementData = {
  habits: [],
  logs: [],
  projects: [],
  milestones: [],
  tasks: [],
  journal: [],
  library: [],
  libraryGoals: [],
  projectAchievements: [],
}
const NOW = new Date(2026, 0, 10, 12)
const evaluate = (data: Partial<AchievementData>, unlocked = [] as { id: string; unlockedAt: string }[]) =>
  evaluateAchievements({ ...empty, ...data }, unlocked, '2026-01-10', NOW)
const byId = (list: ReturnType<typeof evaluate>, id: string) => list.find((a) => a.id === id)!

describe('evaluateAchievements', () => {
  it('earns streak steps from the longest streak', () => {
    const list = evaluate({ habits: [habit('a')], logs: days(1, 8).map((d) => done('a', d)) })
    expect(byId(list, 'streak-7').earned).toBe(true)
    expect(byId(list, 'streak-30')).toMatchObject({ earned: false, current: 8, target: 30 })
    expect(byId(list, 'first-check').earned).toBe(true)
  })

  it('keeps stored achievements earned after the streak breaks', () => {
    const list = evaluate({ habits: [habit('a')] }, [{ id: 'streak-7', unlockedAt: '2026-01-07' }])
    expect(byId(list, 'streak-7')).toMatchObject({ earned: true, unlockedAt: '2026-01-07' })
  })

  it('shows only earned ladder steps and the next one', () => {
    const list = visibleAchievements(evaluate({ habits: [habit('a')], logs: days(1, 8).map((d) => done('a', d)) }))
    const streakIds = list.filter((a) => a.series === 'streak').map((a) => a.id)
    expect(streakIds).toEqual(['streak-3', 'streak-7', 'streak-30'])
  })

  it('lists what is newly earned', () => {
    const list = evaluate({ habits: [habit('a')] }, [])
    expect(newlyEarned(list).map((a) => a.id)).toEqual(['first-habit'])
  })

  it('measures project and AI achievements', () => {
    const project: Project = { id: 'p', title: 'Maraton', color: '#000', status: 'active', createdAt: '2026-01-01' }
    const milestones: Milestone[] = [
      { id: 'm1', projectId: 'p', title: '5 km', done: true, order: 0 },
      { id: 'm2', projectId: 'p', title: 'Yarı maraton', done: false, order: 1 },
    ]
    const own: ProjectAchievement[] = [
      { id: 'x', projectId: 'p', title: 'İlk 21 km', emoji: '🏅', rule: { type: 'milestone', milestoneId: 'm2' }, order: 0 },
      { id: 'y', projectId: 'p', title: 'Demir bacak', emoji: '🦵', rule: { type: 'habitStreak', habitId: 'run', count: 5 }, order: 1 },
      { id: 'z', projectId: 'p', title: 'Kayıp', emoji: '❓', rule: { type: 'milestone', milestoneId: 'gone' }, order: 2 },
    ]
    const list = evaluate({
      projects: [project],
      milestones,
      habits: [habit('run', { projectId: 'p' })],
      logs: days(3, 9).map((d) => done('run', d)),
      projectAchievements: own,
    })
    expect(byId(list, 'p:p:first').earned).toBe(true)
    expect(byId(list, 'p:p:half')).toMatchObject({ earned: true, current: 50 })
    expect(byId(list, 'pa:x')).toMatchObject({ earned: false, description: '“Yarı maraton” adımını tamamla' })
    expect(byId(list, 'pa:y')).toMatchObject({ earned: true, current: 7 })
    expect(list.find((a) => a.id === 'pa:z')).toBeUndefined()
  })
})

describe('perfectDays', () => {
  it('counts days where every daily goal was done, and the longest run', () => {
    const habits = [habit('a'), habit('b')]
    const logs = [...days(1, 5).map((d) => done('a', d)), ...days(1, 3).map((d) => done('b', d)), done('b', '2026-01-05')]
    expect(perfectDays(habits, logs, '2026-01-05')).toEqual({ total: 4, longestRun: 3 })
  })

  it('ignores weekly goals and skipped days', () => {
    const habits = [habit('a'), habit('w', { frequency: { type: 'timesPerWeek', count: 3 } })]
    const logs = [done('a', '2026-01-01'), { id: 's', habitId: 'a', date: '2026-01-02', status: 'skipped' as const }, done('a', '2026-01-03')]
    expect(perfectDays(habits, logs, '2026-01-03')).toEqual({ total: 2, longestRun: 2 })
  })
})
