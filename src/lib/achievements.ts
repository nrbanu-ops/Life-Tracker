import type {
  AchievementRule,
  Habit,
  HabitLog,
  JournalEntry,
  LibraryGoal,
  LibraryItem,
  Milestone,
  Project,
  ProjectAchievement,
  Task,
  UnlockedAchievement,
} from '../db/types'
import { addDays } from 'date-fns'
import { fromDateKey, toDateKey } from './date'
import { isPlannedDaily, PERIOD_ADJECTIVE } from './frequency'
import { goalProgress } from './library'
import { projectProgress } from './projects'
import { quitStats } from './quit'
import { streaks, type Streaks } from './stats'
import { isCompleted, isShownOn } from './today'

export type AchievementData = {
  habits: Habit[]
  logs: HabitLog[]
  projects: Project[]
  milestones: Milestone[]
  tasks: Task[]
  journal: JournalEntry[]
  library: LibraryItem[]
  libraryGoals: LibraryGoal[]
  projectAchievements: ProjectAchievement[]
}

export type AchievementGroup =
  | 'start'
  | 'streak'
  | 'total'
  | 'perfect'
  | 'quit'
  | 'projects'
  | 'library'
  | 'other'
  | 'project'

export const GROUP_LABEL: Record<AchievementGroup, string> = {
  start: '🌱 Başlangıç',
  streak: '🔥 Seriler',
  total: '✅ Toplam',
  perfect: '⭐ Mükemmel günler',
  quit: '🚭 Bırakma',
  projects: '🎯 Projeler',
  library: '📚 Kütüphane',
  other: '📝 Görevler ve günlük',
  project: 'Proje',
}

export type Achievement = {
  id: string
  group: AchievementGroup
  emoji: string
  title: string
  description: string
  /** Progress toward `target`; earned when current reaches it. */
  current: number
  target: number
  /** current and target are percentages. */
  percent?: boolean
  /** Earned now or before. */
  earned: boolean
  /** Day key, when stored as earned. */
  unlockedAt?: string
  /** Steps of the same ladder (7, 30, 100 days …): only earned ones and the next one are shown. */
  series?: string
  projectId?: string
}

type Draft = Omit<Achievement, 'earned' | 'unlockedAt'>

type Step = { target: number; emoji: string; title: string; description: string }

/** One ladder: each step is its own achievement with the same measure. */
function ladder(series: string, group: AchievementGroup, current: number, steps: Step[]): Draft[] {
  return steps.map((s) => ({ id: `${series}-${s.target}`, group, series, current, ...s }))
}

const single = (id: string, group: AchievementGroup, emoji: string, title: string, description: string, done: boolean): Draft => ({
  id,
  group,
  emoji,
  title,
  description,
  current: done ? 1 : 0,
  target: 1,
})

const DAY_MS = 24 * 60 * 60 * 1000

/** Days where every daily goal was completed (skipped ones aside), and the longest run of them. */
export function perfectDays(habits: Habit[], logs: HabitLog[], today: string): { total: number; longestRun: number } {
  const daily = habits.filter((h) => !h.archived && h.kind !== 'quit' && isPlannedDaily(h))
  if (daily.length === 0) return { total: 0, longestRun: 0 }
  const status = new Map(logs.map((l) => [`${l.habitId}|${l.date}`, l.status]))
  const first = daily.map((h) => toDateKey(new Date(h.createdAt))).sort()[0]
  let total = 0
  let run = 0
  let longestRun = 0
  for (let d = fromDateKey(first); toDateKey(d) <= today; d = addDays(d, 1)) {
    const day = toDateKey(d)
    const counted = daily.filter((h) => isShownOn(h, day) && status.get(`${h.id}|${day}`) !== 'skipped')
    // A day with nothing planned neither counts nor breaks the run.
    if (counted.length === 0) continue
    if (counted.every((h) => isCompleted(status.get(`${h.id}|${day}`)))) {
      total++
      run++
      longestRun = Math.max(longestRun, run)
    } else if (day !== today) {
      run = 0
    }
  }
  return { total, longestRun }
}

/** Every achievement with its progress; `unlocked` keeps earlier ones earned. */
export function evaluateAchievements(
  data: AchievementData,
  unlocked: UnlockedAchievement[],
  today: string,
  now: Date,
): Achievement[] {
  const { habits, logs, projects, milestones, tasks, journal, library, libraryGoals } = data
  const habitStreaks = new Map(habits.map((h) => [h.id, streaks(h, logs, today)]))
  const dayStreak = Math.max(0, ...habits.filter((h) => isPlannedDaily(h)).map((h) => habitStreaks.get(h.id)!.longest))
  const weekStreak = Math.max(0, ...habits.filter((h) => h.frequency.type === 'timesPerWeek').map((h) => habitStreaks.get(h.id)!.longest))
  const completedLogs = logs.filter((l) => isCompleted(l.status))
  const perfect = perfectDays(habits, logs, today)
  const quitDays = Math.max(0, ...habits.filter((h) => h.kind === 'quit').map((h) => Math.floor(quitStats(h, now).longestMs / DAY_MS)))
  const doneProjects = projects.filter((p) => p.status === 'done')
  const finished = (kind: LibraryItem['kind']) => library.filter((i) => i.kind === kind && i.status === 'done').length
  const goalYears = [...new Set(libraryGoals.map((g) => g.year))]
  const goalReached = goalYears.some((year) => goalProgress(library, libraryGoals, year).some((g) => g.done >= g.target))
  // Gemini's weekly reviews are read, not written: they don't count as journal days.
  const written = journal.filter((e) => e.kind !== 'review')
  const journalDays = new Set(written.map((e) => e.date)).size
  const doneTasks = tasks.filter((t) => t.done).length

  const drafts: Draft[] = [
    single('first-habit', 'start', '🌱', 'İlk tohum', 'İlk habit’ini ekle', habits.length > 0),
    single('first-check', 'start', '✔️', 'İlk adım', 'Bir habit’i ilk kez işaretle', completedLogs.length > 0),
    single('first-project', 'start', '🗺️', 'Yol haritası', 'İlk projeni oluştur', projects.length > 0),
    single('first-journal', 'start', '✍️', 'Sevgili günlük', 'İlk günlük yazını yaz', written.length > 0),

    ...ladder('streak', 'streak', dayStreak, [
      { target: 3, emoji: '✨', title: 'Kıvılcım', description: 'Bir habit’te 3 günlük seri' },
      { target: 7, emoji: '🔥', title: 'Bir hafta', description: 'Bir habit’te 7 günlük seri' },
      { target: 30, emoji: '🌟', title: 'Bir ay', description: 'Bir habit’te 30 günlük seri' },
      { target: 100, emoji: '💯', title: 'Yüzlük', description: 'Bir habit’te 100 günlük seri' },
      { target: 365, emoji: '👑', title: 'Bir yıl', description: 'Bir habit’te 365 günlük seri' },
    ]),
    ...ladder('weekly', 'streak', weekStreak, [
      { target: 4, emoji: '📅', title: 'Düzenli', description: 'Haftalık bir hedefi 4 hafta üst üste tuttur' },
      { target: 12, emoji: '🗓️', title: 'Mevsimlik', description: 'Haftalık bir hedefi 12 hafta üst üste tuttur' },
      { target: 52, emoji: '🏛️', title: 'Bir yıl boyunca', description: 'Haftalık bir hedefi 52 hafta üst üste tuttur' },
    ]),

    ...ladder('total', 'total', completedLogs.length, [
      { target: 10, emoji: '🙌', title: 'Isınma turu', description: 'Toplam 10 kez işaretle' },
      { target: 100, emoji: '✅', title: 'Yüz tik', description: 'Toplam 100 kez işaretle' },
      { target: 500, emoji: '🏅', title: 'Beş yüz', description: 'Toplam 500 kez işaretle' },
      { target: 1000, emoji: '🏆', title: 'Bin', description: 'Toplam 1000 kez işaretle' },
    ]),

    ...ladder('perfect', 'perfect', perfect.total, [
      { target: 1, emoji: '⭐', title: 'Mükemmel gün', description: 'Günlük hedeflerin hepsini bir günde tamamla' },
      { target: 10, emoji: '🌠', title: 'On mükemmel gün', description: 'Toplam 10 mükemmel gün' },
      { target: 50, emoji: '🌌', title: 'Elli mükemmel gün', description: 'Toplam 50 mükemmel gün' },
    ]),
    ...ladder('perfect-run', 'perfect', perfect.longestRun, [
      { target: 3, emoji: '💫', title: 'Üç gün kusursuz', description: '3 gün üst üste mükemmel gün' },
      { target: 7, emoji: '🌈', title: 'Kusursuz hafta', description: '7 gün üst üste mükemmel gün' },
      { target: 30, emoji: '💎', title: 'Kusursuz ay', description: '30 gün üst üste mükemmel gün' },
    ]),

    ...ladder('quit', 'quit', quitDays, [
      { target: 7, emoji: '🌿', title: 'Temiz hafta', description: 'Bıraktığın bir şeyden 7 gün uzak dur' },
      { target: 30, emoji: '🍃', title: 'Temiz ay', description: '30 gün uzak dur' },
      { target: 100, emoji: '🌳', title: 'Yüz gün özgür', description: '100 gün uzak dur' },
      { target: 365, emoji: '🕊️', title: 'Bir yıl özgür', description: '365 gün uzak dur' },
    ]),

    single('first-milestone', 'projects', '🚩', 'İlk kilometre taşı', 'Bir projenin ilk adımını tamamla', milestones.some((m) => m.done)),
    ...ladder('projects-done', 'projects', doneProjects.length, [
      { target: 1, emoji: '🎯', title: 'Hedefe ulaştın', description: 'Bir projeyi tamamla' },
      { target: 5, emoji: '🚀', title: 'Seri başarı', description: '5 projeyi tamamla' },
    ]),
    single(
      'project-early',
      'projects',
      '⏱️',
      'Erkenci',
      'Bir projeyi hedef tarihinden önce bitir',
      doneProjects.some((p) => p.targetDate !== undefined && today <= p.targetDate),
    ),

    ...ladder('books', 'library', finished('book'), [
      { target: 1, emoji: '📖', title: 'İlk kitap', description: 'Bir kitap bitir' },
      { target: 10, emoji: '📚', title: 'Kitap kurdu', description: '10 kitap bitir' },
      { target: 50, emoji: '🦉', title: 'Bilge baykuş', description: '50 kitap bitir' },
    ]),
    ...ladder('movies', 'library', finished('movie'), [
      { target: 10, emoji: '🎬', title: 'Sinefil', description: '10 film izle' },
      { target: 50, emoji: '🍿', title: 'Film gurmesi', description: '50 film izle' },
    ]),
    ...ladder('series', 'library', finished('series'), [
      { target: 5, emoji: '📺', title: 'Dizi maratoncusu', description: '5 diziyi bitir' },
    ]),
    ...ladder('places', 'library', finished('place'), [
      { target: 5, emoji: '🧭', title: 'Gezgin', description: '5 yere git' },
      { target: 20, emoji: '🌍', title: 'Dünya gezgini', description: '20 yere git' },
    ]),
    single('library-goal', 'library', '🥇', 'Yıllık hedef', 'Kütüphanede bir yıllık hedefe ulaş', goalReached),

    ...ladder('tasks', 'other', doneTasks, [
      { target: 10, emoji: '📌', title: 'İş bitirici', description: '10 görev tamamla' },
      { target: 50, emoji: '🗂️', title: 'Düzen ustası', description: '50 görev tamamla' },
      { target: 200, emoji: '⚙️', title: 'Makine', description: '200 görev tamamla' },
    ]),
    ...ladder('journal', 'other', journalDays, [
      { target: 7, emoji: '📓', title: 'Yazar adayı', description: '7 farklı gün günlük yaz' },
      { target: 30, emoji: '🖋️', title: 'Kalem dostu', description: '30 farklı gün günlük yaz' },
      { target: 100, emoji: '📜', title: 'Anı defteri', description: '100 farklı gün günlük yaz' },
    ]),

    ...projects.flatMap((p) => projectDrafts(p, data, habitStreaks, today)),
  ]

  const stored = new Map(unlocked.map((u) => [u.id, u.unlockedAt]))
  return drafts.map((d) => ({
    ...d,
    earned: d.current >= d.target || stored.has(d.id),
    unlockedAt: stored.get(d.id),
  }))
}

function projectDrafts(
  project: Project,
  data: AchievementData,
  habitStreaks: Map<string, Pick<Streaks, 'longest' | 'unit'>>,
  today: string,
): Draft[] {
  const milestones = data.milestones.filter((m) => m.projectId === project.id)
  const progress = projectProgress(milestones)
  const percent = Math.round(progress.ratio * 100)
  const complete = project.status === 'done' || (progress.total > 0 && progress.done === progress.total)
  const base = { group: 'project' as const, projectId: project.id }
  const drafts: Draft[] = []

  if (progress.total > 0) {
    drafts.push({ ...base, id: `p:${project.id}:first`, emoji: '👣', title: 'Yola çıktın', description: 'İlk adımı tamamla', current: Math.min(progress.done, 1), target: 1 })
  }
  if (progress.total >= 2) {
    drafts.push({ ...base, id: `p:${project.id}:half`, emoji: '⛰️', title: 'Yarı yol', description: 'Adımların yarısını tamamla', current: percent, target: 50, percent: true })
  }
  drafts.push({ ...base, id: `p:${project.id}:done`, emoji: '🏁', title: 'Tamamlandı', description: 'Projeyi bitir', current: complete ? 1 : 0, target: 1 })
  if (project.targetDate) {
    const early = complete && today <= project.targetDate
    drafts.push({ ...base, id: `p:${project.id}:early`, emoji: '⏰', title: 'Zamanından önce', description: 'Hedef tarihten önce bitir', current: early ? 1 : 0, target: 1 })
  }

  const own = data.projectAchievements.filter((a) => a.projectId === project.id).sort((a, b) => a.order - b.order)
  for (const a of own) {
    const measured = measureRule(a.rule, project.id, data, milestones, percent, habitStreaks)
    if (!measured) continue // what it pointed at was deleted
    drafts.push({
      ...base,
      id: `pa:${a.id}`,
      emoji: a.emoji,
      title: a.title,
      description: a.description ?? measured.description,
      current: measured.current,
      // An AI goal of 0 would be earned the moment the project is added.
      target: Math.max(1, measured.target),
      percent: a.rule.type === 'progress' || undefined,
    })
  }
  return drafts
}

function measureRule(
  rule: AchievementRule,
  projectId: string,
  data: AchievementData,
  milestones: Milestone[],
  percent: number,
  habitStreaks: Map<string, Pick<Streaks, 'longest' | 'unit'>>,
): { current: number; target: number; description: string } | undefined {
  switch (rule.type) {
    case 'milestone': {
      const m = milestones.find((x) => x.id === rule.milestoneId)
      return m && { current: m.done ? 1 : 0, target: 1, description: `“${m.title}” adımını tamamla` }
    }
    case 'progress':
      return { current: percent, target: rule.percent, description: `Projenin %${rule.percent}’ini tamamla` }
    case 'habitStreak': {
      const h = data.habits.find((x) => x.id === rule.habitId)
      const s = habitStreaks.get(rule.habitId)
      if (!h || !s) return undefined
      const unit = s.unit === 'day' ? 'günlük seri' : s.unit === 'time' ? 'kez üst üste' : `${PERIOD_ADJECTIVE[s.unit]} seri`
      return { current: s.longest, target: rule.count, description: `${h.title}: ${rule.count} ${unit}` }
    }
    case 'habitTotal': {
      const h = data.habits.find((x) => x.id === rule.habitId)
      if (!h) return undefined
      const total = data.logs.filter((l) => l.habitId === h.id && isCompleted(l.status)).length
      return { current: total, target: rule.count, description: `${h.title}: toplam ${rule.count} kez` }
    }
    case 'tasksDone': {
      const done = data.tasks.filter((t) => t.projectId === projectId && t.done).length
      return { current: done, target: rule.count, description: `Bu projede ${rule.count} görev tamamla` }
    }
  }
}

/** What a list shows: of each ladder, the earned steps and the next one. */
export function visibleAchievements(all: Achievement[]): Achievement[] {
  const nextShown = new Set<string>()
  return all.filter((a) => {
    if (!a.series || a.earned) return true
    if (nextShown.has(a.series)) return false
    nextShown.add(a.series)
    return true
  })
}

/** Earned first, then the closest to being earned. */
export function sortAchievements(list: Achievement[]): Achievement[] {
  const ratio = (a: Achievement) => Math.min(1, a.current / a.target)
  return [...list].sort((a, b) => Number(b.earned) - Number(a.earned) || (a.earned ? 0 : ratio(b) - ratio(a)))
}

/** Achievements earned now but not stored yet. */
export const newlyEarned = (all: Achievement[]): Achievement[] =>
  all.filter((a) => a.earned && a.unlockedAt === undefined)
