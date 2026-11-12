import { addDays } from 'date-fns'
import type {
  DayMood,
  Habit,
  HabitLog,
  JournalEntry,
  LibraryItem,
  Milestone,
  Project,
  Task,
  UnlockedAchievement,
} from '../db/types'
import { fromDateKey, toDateKey, weekRange } from './date'
import { dayCount, intervalOf, isLongGoal, isPlannedDaily, nextPeriod, periodGoal, periodRange } from './frequency'
import { intervalCycles } from './interval'
import { entryPhotos } from './journal'
import { streaks, successRate } from './stats'
import { isCompleted, isExcused, isShownOn } from './today'

// The leveling system (CLAUDE.md, step 12). Everything here is pure: XP is worked out from the
// user's data, closed weeks are then frozen in the `xpWeeks` table (src/db/leveling.ts).

// --- Effort: how hard doing a habit once is. How often it's planned never makes it harder.

export type EffortTier = 'light' | 'medium' | 'heavy' | 'intense'

export const EFFORT_TIERS: EffortTier[] = ['light', 'medium', 'heavy', 'intense']

export const TIER_XP: Record<EffortTier, number> = { light: 5, medium: 12, heavy: 25, intense: 40 }

export const TIER_LABEL: Record<EffortTier, string> = { light: 'Hafif', medium: 'Orta', heavy: 'Ağır', intense: 'Zorlu' }

export type StatKey = 'str' | 'int' | 'vit' | 'sen' | 'dis'

export const STATS: StatKey[] = ['str', 'int', 'vit', 'sen', 'dis']

export const STAT_LABEL: Record<StatKey, string> = {
  str: 'Güç',
  int: 'Zekâ',
  vit: 'Dayanıklılık',
  sen: 'Duyu',
  dis: 'Disiplin',
}

export const STAT_SHORT: Record<StatKey, string> = { str: 'GÜÇ', int: 'ZEK', vit: 'DAY', sen: 'DUY', dis: 'DİS' }

// Word stems matched at the start of a word ("koş" → koşu, koşmak); "=" means the whole word.
const TIER_WORDS: [EffortTier, string[]][] = [
  ['intense', ['maraton', 'yarı maraton', 'uzun koşu', 'derin çalışma', 'triatlon']],
  [
    'heavy',
    ['koş', 'spor', 'antrenman', 'ağırlık', 'fitness', 'gym', 'salon', 'yüzme', 'yüz', 'bisiklet', 'egzersiz', 'idman',
      'crossfit', 'hiit', 'ders çalış', 'kodla', 'kod yaz', 'tez', 'sınav'],
  ],
  [
    'light',
    ['diş', '=su', 'su iç', 'vitamin', 'ilaç', 'yatak', 'krem', 'cilt', 'nemlendir', 'tartıl', 'tart', 'kahvaltı',
      'takviye', 'çiçek sula', 'sula', 'dua', 'şükür'],
  ],
  [
    'medium',
    ['oku', 'kitap', 'yürü', 'meditasyon', 'temizlik', 'temizle', 'dil', 'duolingo', 'ingilizce', 'günlük', 'yoga',
      'esne', 'pilates', 'yemek yap', 'ders', 'çalış', 'öğren', 'pratik', 'piyano', 'gitar', 'enstrüman', 'çiz'],
  ],
]

const STAT_WORDS: [StatKey, string[]][] = [
  [
    'str',
    ['koş', 'spor', 'antrenman', 'ağırlık', 'fitness', 'gym', 'salon', 'yüzme', 'yüz', 'bisiklet', 'egzersiz', 'idman',
      'şınav', 'mekik', 'squat', 'plank', 'pilates', 'yoga', 'esne', 'yürü', 'adım', 'maraton', 'crossfit', 'hiit'],
  ],
  [
    'int',
    ['oku', 'kitap', 'ders', 'çalış', 'dil', 'ingilizce', 'almanca', 'duolingo', 'kod', 'öğren', 'sayfa', 'kurs', 'tez',
      'sınav', 'makale', 'podcast', 'piyano', 'gitar', 'enstrüman', 'pratik'],
  ],
  [
    'vit',
    ['=su', 'su iç', 'uyku', 'uyu', 'vitamin', 'ilaç', 'sebze', 'meyve', 'beslen', 'diş', 'cilt', 'krem', 'sigara',
      'alkol', 'şeker', 'kahve', 'tartıl', 'kahvaltı', 'takviye', 'protein', 'yemek'],
  ],
  ['sen', ['meditasyon', 'nefes', 'günlük', 'şükür', 'dua', 'namaz', 'sessiz', 'doğa', 'farkındalık', 'terapi', 'çiz', 'resim']],
]

const LETTER = /[a-zçğıöşüâîû]/

function matchesWord(title: string, stem: string): boolean {
  const text = title.toLocaleLowerCase('tr')
  const exact = stem.startsWith('=')
  const word = exact ? stem.slice(1) : stem
  let at = text.indexOf(word)
  while (at !== -1) {
    const startsWord = at === 0 || !LETTER.test(text[at - 1])
    const end = at + word.length
    const endsWord = end >= text.length || !LETTER.test(text[end])
    if (startsWord && (!exact || endsWord)) return true
    at = text.indexOf(word, at + 1)
  }
  return false
}

function findWord<T>(title: string, table: [T, string[]][]): { value: T; word: string } | undefined {
  for (const [value, words] of table) {
    const word = words.find((w) => matchesWord(title, w))
    if (word) return { value, word: word.replace(/^=/, '') }
  }
  return undefined
}

/** The habit's stat: chosen by the user, else guessed from its name; Disiplin when nothing fits. */
export function statOf(habit: Pick<Habit, 'title' | 'kind' | 'stat'>): StatKey {
  if (habit.stat) return habit.stat
  // Staying off something is endurance, whatever it is.
  if (habit.kind === 'quit') return 'vit'
  return findWord(habit.title, STAT_WORDS)?.value ?? 'dis'
}

export type Effort = { tier: EffortTier; reason: string }

const raise = (tier: EffortTier): EffortTier => EFFORT_TIERS[Math.min(EFFORT_TIERS.indexOf(tier) + 1, 3)]

/** How hard one go is, as the app sees it, with the reason shown to the user. */
export function autoEffort(habit: Pick<Habit, 'title' | 'kind' | 'target' | 'stat'>): Effort {
  // A timed habit's minutes are the best measure of effort there is.
  if (habit.kind === 'duration' && habit.target !== undefined) {
    const minutes = habit.target
    let tier: EffortTier = minutes <= 5 ? 'light' : minutes <= 30 ? 'medium' : minutes <= 75 ? 'heavy' : 'intense'
    const physical = statOf(habit) === 'str'
    if (physical) tier = raise(tier)
    return { tier, reason: `Süre ${minutes} dk${physical ? ', fiziksel' : ''}` }
  }
  const found = findWord(habit.title, TIER_WORDS)
  if (found) return { tier: found.value, reason: `Adından: “${found.word}”` }
  return { tier: 'medium', reason: 'Varsayılan' }
}

/** The tier in use now: the user's choice, else the app's. */
export function effortOf(habit: Habit): Effort {
  if (habit.effort) return { tier: habit.effort, reason: 'Senin seçimin' }
  return autoEffort(habit)
}

/** The tier on a given day: a change only counts from the day it was made. */
export function tierOn(habit: Habit, day: string): EffortTier {
  const history = habit.effortLog ?? []
  let tier: EffortTier | undefined
  for (const entry of history) if (entry.from <= day) tier = entry.tier
  return tier ?? history[0]?.tier ?? effortOf(habit).tier
}

/**
 * Mastery: a habit done ≥95% of the time for 90 days has become automatic, so it gives a
 * little less (never below 70% of its base). Missing days never raise it: that would reward
 * planning more than one does.
 */
export function masteryFactor(habit: Habit, logs: HabitLog[], weekStart: string): number {
  const dayBefore = shift(weekStart, -1)
  const { planned, rate } = successRate(habit, logs, shift(weekStart, -90), dayBefore, weekStart)
  return planned >= 40 && rate !== undefined && rate >= 0.95 ? MASTERY : 1
}

const MASTERY = 0.85

// --- XP events

export type XpSource =
  | 'habit'
  | 'quest'
  | 'quit'
  | 'task'
  | 'milestone'
  | 'project'
  | 'journal'
  | 'mood'
  | 'library'
  | 'achievement'
  | 'emergency'
  | 'penalty'

export const SOURCE_LABEL: Record<XpSource, string> = {
  habit: "Habit'ler",
  quest: 'Günlük görev',
  quit: 'Bırakma',
  task: 'Görevler',
  milestone: 'Proje adımları',
  project: 'Biten projeler',
  journal: 'Günlük yazısı',
  mood: 'Ruh hali',
  library: 'Kütüphane',
  achievement: 'Başarımlar',
  emergency: 'Acil görev',
  penalty: 'Ceza',
}

export type XpTag = 'quest' | 'questWeek' | 'emergency' | 'comeback'

export type XpEvent = { date: string; xp: number; source: XpSource; stat: StatKey; habitId?: string; tag?: XpTag }

export type XpData = {
  habits: Habit[]
  logs: HabitLog[]
  tasks: Task[]
  milestones: Milestone[]
  projects: Project[]
  journal: JournalEntry[]
  moods: DayMood[]
  library: LibraryItem[]
  achievements: UnlockedAchievement[]
  /** Missed habits cost XP from this day on; undefined while penalties are off. */
  penaltyFrom?: string
  /** Days declared hard: a daily habit missed on one is not fined. */
  hardDays?: string[]
}

export const XP = {
  daySoftCap: 150,
  quest: 20,
  questWeek: 50,
  questSize: 5,
  task: { 1: 12, 2: 8, 3: 5, 4: 3 } as Record<1 | 2 | 3 | 4, number>,
  taskDayCap: 40,
  milestone: 30,
  project: { base: 100, perStep: 10, max: 300 },
  journal: 5,
  mood: 2,
  library: { book: 40, movie: 10, series: 10, game: 20, place: 10, other: 10 } as Record<LibraryItem['kind'], number>,
  achievement: 25,
  emergency: 100,
  penaltyDayCap: 100,
  quit: [
    [1, 10],
    [3, 20],
    [7, 50],
    [30, 150],
    [90, 300],
    [365, 1000],
  ] as [number, number][],
}

const shift = (day: string, days: number) => toDateKey(addDays(fromDateKey(day), days))
const dayOf = (iso: string) => toDateKey(new Date(iso))

/** Marked late: yesterday is fine, last week three quarters, older a quarter. */
export function lateFactor(day: string, loggedAt: string | undefined): number {
  if (!loggedAt || loggedAt <= shift(day, 1)) return 1
  return loggedAt <= shift(day, 7) ? 0.75 : 0.25
}

/** Logged beyond a count/duration target: half extra up to double, at most +75%. */
export function overshoot(habit: Habit, value: number | undefined): number {
  if (habit.kind !== 'duration' && habit.kind !== 'count') return 0
  if (!habit.target || !value || value <= habit.target) return 0
  const ratio = value / habit.target
  return ratio <= 2 ? (ratio - 1) * 0.5 : Math.min(0.5 + (ratio - 2) * 0.25, 0.75)
}

export function statusFactor(habit: Habit, log: HabitLog): number {
  if (log.status === 'done') return 1
  if (log.status === 'minimum') return 0.5
  if (log.status === 'partial') return habit.target && log.value ? Math.min(log.value / habit.target, 0.8) : 0
  return 0
}

/** Streak bonus by days in a row (daily habits) … */
export const dayStreakBonus = (run: number) => (run >= 100 ? 0.5 : run >= 30 ? 0.25 : run >= 7 ? 0.1 : 0)
/** … or by periods in a row that reached the target (weekly, monthly and yearly goals). */
export const weekStreakBonus = (run: number) => (run >= 15 ? 0.5 : run >= 5 ? 0.25 : run >= 2 ? 0.1 : 0)

const COMEBACK = 0.5
/** Planned days missed in a row before doing it again counts as a comeback. */
const COMEBACK_AFTER = 3

function habitEvents(
  habit: Habit,
  logs: HabitLog[],
  from: string,
  to: string,
  today: string,
  penaltyFrom?: string,
  hardDays: ReadonlySet<string> = new Set(),
): XpEvent[] {
  if (habit.kind === 'quit') return []
  const own = logs.filter((l) => l.habitId === habit.id)
  const byDate = new Map(own.map((l) => [l.date, l]))
  const created = dayOf(habit.createdAt)
  const last = to < today ? to : today
  const stat = statOf(habit)
  const mastery = new Map<string, number>()
  const masteryOn = (day: string) => {
    const week = weekRange(day).start
    if (!mastery.has(week)) mastery.set(week, masteryFactor(habit, own, week))
    return mastery.get(week)!
  }
  const events: XpEvent[] = []
  const emit = (date: string, xp: number, tag?: XpTag) => {
    if (date >= from && date <= to && xp > 0) events.push({ date, xp, source: 'habit', stat, habitId: habit.id, tag })
  }
  const base = (day: string) => TIER_XP[tierOn(habit, day)] * masteryOn(day)
  // A missed planned day costs what doing it would have earned, without bonuses. Only finished
  // days, only from the day penalties were switched on, never for archived habits.
  const fined = (day: string) => !!penaltyFrom && !habit.archived && day >= penaltyFrom && day < today
  const fine = (date: string, xp: number) => {
    if (fined(date) && date >= from && date <= to && xp > 0) {
      events.push({ date, xp: -xp, source: 'penalty', stat, habitId: habit.id })
    }
  }

  if (intervalOf(habit.frequency)) {
    // "Every N months": each time it is done earns its XP; each deadline that goes by costs one.
    for (const log of own) {
      if (log.date < created || log.date > last) continue
      emit(log.date, base(log.date) * statusFactor(habit, log) * (1 + overshoot(habit, log.value)) * lateFactor(log.date, log.loggedAt))
    }
    const completed = own.filter((l) => isCompleted(l.status)).map((l) => l.date)
    for (const cycle of intervalCycles(habit, completed, today)) {
      for (const deadline of cycle.missed) fine(deadline, base(deadline))
    }
    return events
  }

  const goal = periodGoal(habit.frequency)
  if (goal) {
    // One rule for "so many times a week, a month, a year": only the length of the period differs.
    const { count, period } = goal
    let run = 0
    let previousEmpty = false
    for (let week = periodRange(period, created).start; week <= last; week = nextPeriod(period, week)) {
      const weekEnd = periodRange(period, week).end
      let completed = 0
      let comebackUsed = false
      const bonus = weekStreakBonus(run)
      let anyPlanned = false
      let skipped = 0
      for (let day = week < created ? created : week; day <= weekEnd && day <= last; day = shift(day, 1)) {
        const log = byDate.get(day)
        // A frozen day earns nothing and is fined nothing, exactly like a skipped one.
        if (isExcused(log?.status)) skipped++
        if (!isExcused(log?.status)) anyPlanned = true
        if (!log || isExcused(log.status)) continue
        const factor = statusFactor(habit, log)
        if (factor === 0) continue
        if (isCompleted(log.status)) completed++
        // Beyond the period's target each go counts half, so overdoing it isn't the way to level.
        const extra = isCompleted(log.status) && completed > count ? 0.5 : 1
        const comeback = previousEmpty && !comebackUsed && isCompleted(log.status)
        if (comeback) comebackUsed = true
        const xp =
          base(day) * factor * extra * (1 + overshoot(habit, log.value)) * (1 + bonus + (comeback ? COMEBACK : 0)) *
          lateFactor(day, log.loggedAt)
        emit(day, xp, comeback ? 'comeback' : undefined)
        // Reaching the target: a fifth on top of the period's planned goes.
        if (isCompleted(log.status) && completed === count) emit(day, base(day) * count * 0.2 * lateFactor(day, log.loggedAt))
      }
      const weekOver = weekEnd < today
      // Period goals are fined on the period's last day for each go short; skipped days lower the goal.
      if (weekOver && week >= created && penaltyFrom && week >= penaltyFrom) {
        fine(weekEnd, base(weekEnd) * Math.max(0, Math.min(count, dayCount(week, weekEnd) - skipped) - completed))
      }
      if (completed >= count) run++
      else if (weekOver) run = 0
      previousEmpty = weekOver && anyPlanned && completed === 0
    }
    return events
  }

  let run = 0
  let missed = 0
  let comebackWeek = ''
  for (let day = created; day <= last; day = shift(day, 1)) {
    if (!isShownOn(habit, day)) continue
    const log = byDate.get(day)
    // Frozen like skipped: no XP, no fine, and the run carries on.
    if (isExcused(log?.status)) continue
    if (log && isCompleted(log.status)) {
      run++
      const week = weekRange(day).start
      // At most one comeback a week, so missing on purpose can't farm it.
      const comeback = missed >= COMEBACK_AFTER && comebackWeek !== week
      if (comeback) comebackWeek = week
      missed = 0
      emit(
        day,
        base(day) *
          statusFactor(habit, log) *
          (1 + overshoot(habit, log.value)) *
          (1 + dayStreakBonus(run) + (comeback ? COMEBACK : 0)) *
          lateFactor(day, log.loggedAt),
        comeback ? 'comeback' : undefined,
      )
    } else {
      if (log?.status === 'partial') emit(day, base(day) * statusFactor(habit, log) * lateFactor(day, log.loggedAt))
      // Partly done costs half. A hard day costs nothing: that is what declaring one is for.
      // (The streak still needs the minimum; weekly goals are judged over the week, not the day.)
      if (!hardDays.has(day)) fine(day, base(day) * (log?.status === 'partial' ? 0.5 : 1))
      if (day < today) {
        run = 0
        missed++
      }
    }
  }
  return events
}

/** Quit habits pay at milestones of each clean run; a milestone reached again pays half. */
function quitEvents(habit: Habit, from: string, to: string, today: string): XpEvent[] {
  if (habit.kind !== 'quit' || !habit.quitStartedAt) return []
  const starts = [habit.quitStartedAt, ...(habit.relapses ?? [])]
  const reached = new Map<number, number>()
  const events: XpEvent[] = []
  starts.forEach((start, i) => {
    const end = starts[i + 1] ? new Date(starts[i + 1]).getTime() : Infinity
    for (const [days, xp] of XP.quit) {
      const at = addDays(new Date(start), days)
      const date = toDateKey(at)
      if (at.getTime() > end || date > today) continue
      const times = reached.get(days) ?? 0
      reached.set(days, times + 1)
      if (date >= from && date <= to) {
        events.push({ date, xp: times === 0 ? xp : xp / 2, source: 'quit', stat: statOf(habit), habitId: habit.id })
      }
    }
  })
  return events
}

/** Today's daily quest: the day's daily habits, at most the five hardest. */
export function questHabits(habits: Habit[], day: string): Habit[] {
  return habits
    .filter((h) => !h.archived && h.kind !== 'quit' && isPlannedDaily(h) && isShownOn(h, day))
    .sort((a, b) => TIER_XP[tierOn(b, day)] - TIER_XP[tierOn(a, day)] || a.order - b.order)
    .slice(0, XP.questSize)
}

export type QuestState = { habits: Habit[]; done: number; total: number; complete: boolean }

/** Skipped and frozen quest habits are left out; the quest needs at least one done. */
export function questState(habits: Habit[], logs: HabitLog[], day: string): QuestState {
  const quest = questHabits(habits, day)
  const status = new Map(logs.filter((l) => l.date === day).map((l) => [l.habitId, l.status]))
  const counted = quest.filter((h) => !isExcused(status.get(h.id)))
  const done = counted.filter((h) => isCompleted(status.get(h.id))).length
  return { habits: quest, done, total: counted.length, complete: counted.length > 0 && done === counted.length }
}

function questEvents(habits: Habit[], logs: HabitLog[], from: string, to: string, today: string, first: string): XpEvent[] {
  const events: XpEvent[] = []
  const byDay = new Map<string, HabitLog[]>()
  for (const log of logs) byDay.set(log.date, [...(byDay.get(log.date) ?? []), log])
  let run = 0
  const last = to < today ? to : today
  for (let day = first; day <= last; day = shift(day, 1)) {
    const state = questState(habits, byDay.get(day) ?? [], day)
    if (state.total === 0) continue
    if (state.complete) {
      run++
      if (day >= from) {
        events.push({ date: day, xp: XP.quest, source: 'quest', stat: 'dis', tag: 'quest' })
        if (run % 7 === 0) events.push({ date: day, xp: XP.questWeek, source: 'quest', stat: 'dis', tag: 'questWeek' })
      }
    } else if (day < today) {
      run = 0
    }
  }
  return events
}

// --- Weekly emergency quest: one goal a week, picked on Monday from the weeks before.

export type EmergencyQuest =
  | { kind: 'habit'; week: string; habitId: string; title: string; target: number }
  | { kind: 'journal'; week: string; target: number }

/** How many times a habit is planned in a week. */
function plannedInWeek(habit: Habit): number {
  if (habit.frequency.type === 'timesPerWeek') return habit.frequency.count
  if (habit.frequency.type === 'weekdays') return habit.frequency.days.length
  return 7
}

/**
 * The habit the user let slip most in the four weeks before (under 80% done), to do a little more
 * often this week; without one, writing in the journal on four days. Nothing is lost if it isn't met.
 */
export function emergencyQuest(data: Pick<XpData, 'habits' | 'logs'>, week: string): EmergencyQuest {
  const from = shift(week, -28)
  const dayBefore = shift(week, -1)
  const candidates = data.habits
    // A monthly or yearly goal, or one every few months, is not something to do "a little more often this week".
    .filter((h) => !h.archived && h.kind !== 'quit' && !isLongGoal(h) && dayOf(h.createdAt) <= shift(week, -14))
    .map((h) => ({ habit: h, ...successRate(h, data.logs, from, dayBefore, week) }))
    .filter((c) => c.planned >= 4 && c.rate !== undefined && c.rate < 0.8)
    .sort((a, b) => a.rate! - b.rate! || a.habit.order - b.habit.order)
  const pick = candidates[0]
  if (!pick) return { kind: 'journal', week, target: 4 }
  const planned = plannedInWeek(pick.habit)
  const target = Math.min(planned, Math.max(2, Math.round(pick.rate! * planned) + 1))
  return { kind: 'habit', week, habitId: pick.habit.id, title: pick.habit.title, target }
}

const journalDaysOf = (journal: JournalEntry[]) =>
  new Set(journal.filter((e) => e.kind !== 'review' && (e.text.trim() || entryPhotos(e).length > 0 || e.audio)).map((e) => e.date))

/** Progress toward the week's quest up to `day`, and the day it was met. */
export function emergencyProgress(
  quest: EmergencyQuest,
  data: Pick<XpData, 'logs' | 'journal'>,
  day: string,
): { done: number; metOn?: string } {
  const days: string[] = []
  if (quest.kind === 'habit') {
    for (const log of data.logs) {
      if (log.habitId === quest.habitId && isCompleted(log.status) && log.date >= quest.week && log.date <= day && log.date <= shift(quest.week, 6)) {
        days.push(log.date)
      }
    }
  } else {
    for (const date of journalDaysOf(data.journal)) {
      if (date >= quest.week && date <= day && date <= shift(quest.week, 6)) days.push(date)
    }
  }
  days.sort()
  return { done: Math.min(days.length, quest.target), metOn: days.length >= quest.target ? days[quest.target - 1] : undefined }
}

function emergencyEvents(data: XpData, from: string, last: string): XpEvent[] {
  const events: XpEvent[] = []
  const habitStat = new Map(data.habits.map((h) => [h.id, statOf(h)]))
  for (let week = weekRange(from).start; week <= last; week = shift(week, 7)) {
    const quest = emergencyQuest(data, week)
    const { metOn } = emergencyProgress(quest, data, last)
    if (metOn && metOn >= from && metOn <= last) {
      const stat = quest.kind === 'habit' ? (habitStat.get(quest.habitId) ?? 'dis') : 'sen'
      events.push({ date: metOn, xp: XP.emergency, source: 'emergency', stat, tag: 'emergency' })
    }
  }
  return events
}

const ADDING_ONLY = new Set(['first-habit', 'first-project'])

const LIBRARY_STAT: Record<LibraryItem['kind'], StatKey> = { book: 'int', movie: 'sen', series: 'sen', game: 'int', place: 'str', other: 'sen' }

/** Every XP event between `from` and `to` (inclusive), never past today. */
export function xpEvents(data: XpData, from: string, to: string, today: string): XpEvent[] {
  const last = to < today ? to : today
  const inRange = (date: string | undefined): date is string => !!date && date >= from && date <= last
  const events: XpEvent[] = []
  const hard = new Set(data.hardDays ?? [])

  for (const habit of data.habits) {
    events.push(
      ...habitEvents(habit, data.logs, from, last, today, data.penaltyFrom, hard),
      ...quitEvents(habit, from, last, today),
    )
  }
  // A bad day costs at most a capped amount, shared out over its misses.
  const penaltyDay = new Map<string, number>()
  for (const e of events) if (e.source === 'penalty') penaltyDay.set(e.date, (penaltyDay.get(e.date) ?? 0) - e.xp)
  for (const e of events) {
    const sum = penaltyDay.get(e.date) ?? 0
    if (e.source === 'penalty' && sum > XP.penaltyDayCap) e.xp *= XP.penaltyDayCap / sum
  }
  // Past a soft cap a day's habit XP counts half: twenty easy habits don't beat five real ones.
  const habitDay = new Map<string, number>()
  for (const e of events) if (e.source === 'habit') habitDay.set(e.date, (habitDay.get(e.date) ?? 0) + e.xp)
  for (const e of events) {
    const sum = habitDay.get(e.date) ?? 0
    if (e.source === 'habit' && sum > XP.daySoftCap) e.xp *= (XP.daySoftCap + (sum - XP.daySoftCap) / 2) / sum
  }

  const firstHabit = data.habits.map((h) => dayOf(h.createdAt)).sort()[0]
  if (firstHabit) events.push(...questEvents(data.habits, data.logs, from, last, today, firstHabit < from ? firstHabit : from))

  const taskDay = new Map<string, number>()
  for (const task of data.tasks) {
    const date = task.done && task.completedAt ? dayOf(task.completedAt) : undefined
    if (!inRange(date)) continue
    const used = taskDay.get(date) ?? 0
    const xp = Math.min(XP.task[task.priority] ?? 3, XP.taskDayCap - used)
    if (xp <= 0) continue
    taskDay.set(date, used + xp)
    events.push({ date, xp, source: 'task', stat: 'dis' })
  }

  const projectCreated = new Map(data.projects.map((p) => [p.id, dayOf(p.createdAt)]))
  for (const m of data.milestones) {
    const date = m.done ? (m.doneAt ?? projectCreated.get(m.projectId)) : undefined
    if (inRange(date)) events.push({ date, xp: XP.milestone, source: 'milestone', stat: 'dis' })
  }
  for (const p of data.projects) {
    if (p.status !== 'done') continue
    const steps = data.milestones.filter((m) => m.projectId === p.id)
    const lastStep = steps.map((m) => m.doneAt).filter(Boolean).sort().at(-1)
    const date = p.completedAt ? dayOf(p.completedAt) : (lastStep ?? dayOf(p.createdAt))
    const xp = Math.min(XP.project.base + steps.length * XP.project.perStep, XP.project.max)
    if (inRange(date)) events.push({ date, xp, source: 'project', stat: 'dis' })
  }

  const journalDays = new Set(
    data.journal.filter((e) => e.kind !== 'review' && (e.text.trim() || entryPhotos(e).length > 0 || e.audio)).map((e) => e.date),
  )
  for (const date of journalDays) if (inRange(date)) events.push({ date, xp: XP.journal, source: 'journal', stat: 'sen' })
  for (const m of data.moods) {
    if ((m.mood || m.energy) && inRange(m.date)) events.push({ date: m.date, xp: XP.mood, source: 'mood', stat: 'sen' })
  }
  for (const item of data.library) {
    if (item.status === 'done' && inRange(item.finishedAt)) {
      events.push({ date: item.finishedAt, xp: XP.library[item.kind], source: 'library', stat: LIBRARY_STAT[item.kind] })
    }
  }
  events.push(...emergencyEvents(data, from, last))
  for (const a of data.achievements) {
    // Achievements for only adding something (a first habit, a first project) give no XP: doing does.
    if (inRange(a.unlockedAt) && !ADDING_ONLY.has(a.id)) {
      events.push({ date: a.unlockedAt, xp: XP.achievement, source: 'achievement', stat: 'dis' })
    }
  }
  return events
}

/** What the misses of `day` cost, per habit (negative XP), after the daily cap. */
export function penaltiesOn(data: XpData, day: string, today: string): XpEvent[] {
  return xpEvents(data, day, day, today).filter((e) => e.source === 'penalty')
}

/**
 * The first day anything could have earned XP. `from` is a floor: after a habits-and-projects
 * reset the ledger starts again there, so the journal and tasks that were kept — which earn XP
 * too — do not quietly hand back the level that was just cleared.
 */
export function firstDay(data: XpData, today: string, from?: string): string {
  const days = [
    ...data.habits.map((h) => dayOf(h.createdAt)),
    ...data.habits.flatMap((h) => (h.quitStartedAt ? [dayOf(h.quitStartedAt)] : [])),
    ...data.projects.map((p) => dayOf(p.createdAt)),
    ...data.tasks.flatMap((t) => (t.completedAt ? [dayOf(t.completedAt)] : [])),
    ...data.journal.map((e) => e.date),
    ...data.moods.map((m) => m.date),
    ...data.library.flatMap((i) => (i.finishedAt ? [i.finishedAt] : [])),
    ...data.achievements.map((a) => a.unlockedAt),
  ].filter((d) => d <= today)
  const earliest = days.sort()[0] ?? today
  return from && from > earliest ? from : earliest
}

// --- Totals

export type XpSummary = {
  xp: number
  days: Record<string, number>
  sources: Partial<Record<XpSource, number>>
  stats: Partial<Record<StatKey, number>>
  /** How often tagged things happened, e.g. daily quests done, for titles. */
  counts: Partial<Record<XpTag, number>>
}

export const emptySummary = (): XpSummary => ({ xp: 0, days: {}, sources: {}, stats: {}, counts: {} })

/** Habit XP goes 80% to the habit's stat and 20% to Disiplin: every habit done is also discipline. */
export function summarize(events: XpEvent[], into: XpSummary = emptySummary()): XpSummary {
  for (const e of events) {
    into.xp += e.xp
    into.days[e.date] = (into.days[e.date] ?? 0) + e.xp
    into.sources[e.source] = (into.sources[e.source] ?? 0) + e.xp
    if (e.tag) into.counts[e.tag] = (into.counts[e.tag] ?? 0) + 1
    // Penalties take from the total only; stats keep what was earned.
    if (e.source === 'penalty') continue
    if (e.source === 'habit' && e.stat !== 'dis') {
      into.stats[e.stat] = (into.stats[e.stat] ?? 0) + e.xp * 0.8
      into.stats.dis = (into.stats.dis ?? 0) + e.xp * 0.2
    } else {
      into.stats[e.stat] = (into.stats[e.stat] ?? 0) + e.xp
    }
  }
  return into
}

export function mergeSummaries(list: XpSummary[]): XpSummary {
  const out = emptySummary()
  for (const s of list) {
    out.xp += s.xp
    for (const [k, v] of Object.entries(s.days)) out.days[k] = (out.days[k] ?? 0) + v
    for (const [k, v] of Object.entries(s.sources)) out.sources[k as XpSource] = (out.sources[k as XpSource] ?? 0) + v
    for (const [k, v] of Object.entries(s.stats)) out.stats[k as StatKey] = (out.stats[k as StatKey] ?? 0) + v
    for (const [k, v] of Object.entries(s.counts ?? {})) out.counts[k as XpTag] = (out.counts[k as XpTag] ?? 0) + v
  }
  return out
}

// --- Titles: earned once a condition is met, one can be worn on the profile.

export type TitleInput = {
  level: number
  summary: XpSummary
  habits: Habit[]
  logs: HabitLog[]
  library: LibraryItem[]
  today: string
}

export type Title = { id: string; name: string; how: string; earned: boolean }

/** The longest clean run of a quit habit so far, in days. */
function longestQuitRun(habit: Habit, now: number): number {
  if (!habit.quitStartedAt) return 0
  const starts = [habit.quitStartedAt, ...(habit.relapses ?? [])].map((s) => new Date(s).getTime())
  return Math.max(...starts.map((start, i) => ((starts[i + 1] ?? now) - start) / 86_400_000))
}

export function titles({ level, summary, habits, logs, library, today }: TitleInput): Title[] {
  const longest = Math.max(0, ...habits.filter((h) => h.kind !== 'quit').map((h) => streaks(h, logs, today).longest))
  const now = fromDateKey(today).getTime() + 86_400_000
  const quitDays = Math.max(0, ...habits.filter((h) => h.kind === 'quit').map((h) => longestQuitRun(h, now)))
  const booksByYear = new Map<string, number>()
  for (const item of library) {
    if (item.kind === 'book' && item.status === 'done' && item.finishedAt) {
      const year = item.finishedAt.slice(0, 4)
      booksByYear.set(year, (booksByYear.get(year) ?? 0) + 1)
    }
  }
  const stat = (key: StatKey) => statValue(summary.stats[key])
  const count = (tag: XpTag) => summary.counts[tag] ?? 0
  const list: [string, string, string, boolean][] = [
    ['awakened', 'Uyanmış', "Lv 2'ye ulaş", level >= 2],
    ['chosen', 'Sistemin Seçtiği', '30 günlük görev tamamla', count('quest') >= 30],
    ['hunter', 'Görev Avcısı', '10 acil görevi bitir', count('emergency') >= 10],
    ['returner', 'Geri Dönen', '5 kez aradan sonra geri dön', count('comeback') >= 5],
    ['unchained', 'Zincirsiz', 'Bir habit’te 30 seri yap', longest >= 30],
    ['relentless', 'Yorulmak Bilmeyen', 'Bir habit’te 100 seri yap', longest >= 100],
    ['iron-will', 'Demir İrade', 'Bir şeyi 90 gün bırak', quitDays >= 90],
    ['bookworm', 'Kitap Kurdu', 'Bir yılda 12 kitap bitir', Math.max(0, ...booksByYear.values()) >= 12],
    ['iron-fist', 'Demir Yumruk', 'Güç 30', stat('str') >= 30],
    ['sage', 'Bilge', 'Zekâ 30', stat('int') >= 30],
    ['unshakable', 'Sarsılmaz', 'Dayanıklılık 30', stat('vit') >= 30],
    ['watcher', 'Gözlemci', 'Duyu 30', stat('sen') >= 30],
    ['disciplined', 'Disiplin Ustası', 'Disiplin 30', stat('dis') >= 30],
    ['shadow', 'Gölge Hükümdarı', 'S-Rank ol', level >= 65],
  ]
  return list.map(([id, name, how, earned]) => ({ id, name, how, earned }))
}

// --- Levels, ranks, stats

/**
 * XP from level n to n + 1, a little more every level. Tuned with the year simulation in the
 * tests: a steady user reaches about Lv 3 in a week, 6 in a month, 11 in three months and 23 in a year.
 */
export const xpToNext = (level: number) => Math.round(60 * level ** 1.1)

export type LevelInfo = { level: number; into: number; needed: number }

export function levelFor(total: number): LevelInfo {
  let level = 1
  let rest = Math.max(0, total)
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level)
    level++
  }
  return { level, into: rest, needed: xpToNext(level) }
}

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

const RANKS: [Rank, number][] = [
  ['S', 65],
  ['A', 45],
  ['B', 30],
  ['C', 20],
  ['D', 10],
  ['E', 1],
]

export const rankFor = (level: number): Rank => RANKS.find(([, min]) => level >= min)![0]

/** The level a rank starts at, e.g. to show how far the next one is. */
export const rankStart = (rank: Rank): number => RANKS.find(([r]) => r === rank)![1]

export function nextRank(rank: Rank): Rank | undefined {
  const i = RANKS.findIndex(([r]) => r === rank)
  return i > 0 ? RANKS[i - 1][0] : undefined
}

/** A stat's value grows with the square root of its XP, so no single one runs away. */
export const statValue = (xp: number | undefined) => Math.floor(Math.sqrt(Math.max(0, xp ?? 0)))

/** XP for one "done" today, for showing why a habit is worth what it is. */
export function xpPerDone(habit: Habit, logs: HabitLog[], today: string): number {
  return TIER_XP[tierOn(habit, today)] * masteryFactor(habit, logs, weekRange(today).start)
}

/** The week's emergency quest in a few words. */
export function emergencyText(quest: EmergencyQuest): string {
  return quest.kind === 'habit'
    ? `Bu hafta ${quest.target} kez: ${quest.title}`
    : `Bu hafta ${quest.target} gün günlük yaz`
}

