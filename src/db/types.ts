// Dates are always local-time 'YYYY-MM-DD' strings; never convert to UTC.

export type ProjectStatus = 'active' | 'paused' | 'done'

export type Project = {
  id: string
  title: string
  description?: string
  color: string
  status: ProjectStatus
  targetDate?: string
  /** When it was marked done. */
  completedAt?: string
  createdAt: string
}

export type Milestone = {
  id: string
  projectId: string
  title: string
  done: boolean
  /** Day key it was checked off. */
  doneAt?: string
  dueDate?: string
  order: number
}

export type HabitFrequency =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] } // 1 = Monday … 7 = Sunday
  | { type: 'timesPerWeek'; count: number }

/**
 * check: one tap marks it done. count/duration: progress toward `target`.
 * quit: something to stop doing; tracked as time since the last restart, not daily logs.
 */
export type HabitKind = 'check' | 'count' | 'duration' | 'quit'

/** The stretch of the day a habit belongs to; mornings end at noon, evenings start at six. */
export type DayPart = 'morning' | 'day' | 'evening'

export type Habit = {
  id: string
  title: string
  projectId?: string
  kind: HabitKind
  /** count: units per day, duration: minutes per day. */
  target?: number
  /** count only, e.g. "bardak". */
  unit?: string
  /** Amount one tap adds (units or minutes). */
  increment?: number
  // quit only. These are moments in time, so unlike day keys they are full ISO timestamps.
  /** When the user first stopped. */
  quitStartedAt?: string
  /** Each time the user started again, oldest first. */
  relapses?: string[]
  /** Days of the last milestone already celebrated in the current run. */
  celebratedMilestone?: number
  frequency: HabitFrequency
  minimumVersion?: string
  /** When in the day it is done. Bugün puts the current part of the day first. */
  when?: DayPart
  /** What sets it off, e.g. "çaydan sonra": something already done every day, not a clock time. */
  cue?: string
  /** One sentence on why this habit matters; shown back at the moments it is about to be dropped. */
  why?: string
  /** A keystone habit: with focus mode on it sits at the top of Bugün. At most FOCUS_MAX. */
  focus?: boolean
  /** Leveling: effort tier and stat chosen by the user; the app guesses them otherwise. */
  effort?: 'light' | 'medium' | 'heavy' | 'intense'
  stat?: 'str' | 'int' | 'vit' | 'sen' | 'dis'
  /** The tier in use from each day on, so a change never alters XP already earned. */
  effortLog?: { from: string; tier: 'light' | 'medium' | 'heavy' | 'intense' }[]
  archived: boolean
  order: number
  createdAt: string
}

/** 1 = urgent … 4 = low. */
export type TaskPriority = 1 | 2 | 3 | 4

export type TaskRepeat = 'daily' | 'weekly' | 'monthly'

export type Task = {
  id: string
  title: string
  /** Day key; undated tasks live only on the tasks page. */
  date?: string
  /** 'HH:mm', only with a date. */
  time?: string
  priority: TaskPriority
  /** Completing a repeating task creates its next occurrence. */
  repeat?: TaskRepeat
  projectId?: string
  done: boolean
  completedAt?: string
  /** Set on a completed repeating task: the occurrence it created, removed again on undo. */
  nextId?: string
  createdAt: string
}

/** 1 = very low … 5 = very high. */
export type Level = 1 | 2 | 3 | 4 | 5

/** How the day felt: one row per day, either value may be missing. */
export type DayMood = {
  /** Day key. */
  date: string
  mood?: Level
  energy?: Level
}

/** A journal entry: free writing for a day, or a note attached to a habit on that day. */
export type JournalEntry = {
  id: string
  /** Day key the entry belongs to. */
  date: string
  /** May be empty when the entry is just a photo. */
  text: string
  /** Set for habit notes; at most one note per habit per day. */
  habitId?: string
  /** Photos, shrunk before saving; at most JOURNAL_PHOTO_MAX. */
  photos?: Blob[]
  /** Before `photos`: one photo per entry. Still read, so old data and old backups keep theirs. */
  photo?: Blob
  /** A spoken note, for the days when talking is easier than writing. One per entry. */
  audio?: Blob
  /** Its length in seconds, kept so the list can show it without decoding the sound. */
  audioSeconds?: number
  /** 'review': a weekly look back written by Gemini. */
  kind?: 'review'
  createdAt: string
  updatedAt?: string
}

export type LibraryKind = 'book' | 'movie' | 'series' | 'game' | 'place' | 'other'

/** want: on the list, active: reading/watching now, done: finished, dropped: given up. */
export type LibraryStatus = 'want' | 'active' | 'done' | 'dropped'

/** A book, film, series or anything else the user reads or watches. */
export type LibraryItem = {
  id: string
  kind: LibraryKind
  title: string
  /** Author for books, network for series, city/country for places. */
  creator?: string
  year?: number
  /** Places: where it is on the map. */
  latitude?: number
  longitude?: number
  /** Books: the language the user read it in, a code like 'en' or free text. */
  language?: string
  /** Poster from a search result. */
  posterUrl?: string
  /** The user's own photo, used instead of posterUrl. */
  posterBlob?: Blob
  /** Where the search result came from, e.g. 'openlibrary' / 'tvmaze' / 'tmdb'. */
  source?: string
  externalId?: string
  status: LibraryStatus
  /** Day keys. */
  startedAt?: string
  finishedAt?: string
  // Where the user is. Books: current page of pageCount; series: season and episode.
  page?: number
  pageCount?: number
  season?: number
  episode?: number
  /** 1–5 stars. */
  rating?: number
  review?: string
  createdAt: string
}

/** How many of a kind the user wants to finish in a year, e.g. 24 books in 2026. */
export type LibraryGoal = {
  /** `${year}-${kind}`: one goal per kind per year. */
  id: string
  year: number
  kind: LibraryKind
  target: number
}

/** When a project achievement is earned; ids point at the project's own milestones and habits. */
export type AchievementRule =
  | { type: 'milestone'; milestoneId: string }
  | { type: 'progress'; percent: number }
  | { type: 'habitStreak'; habitId: string; count: number }
  | { type: 'habitTotal'; habitId: string; count: number }
  | { type: 'tasksDone'; count: number }

/** A project-specific achievement chosen by the AI. */
export type ProjectAchievement = {
  id: string
  projectId: string
  title: string
  emoji: string
  description?: string
  rule: AchievementRule
  order: number
}

/** An earned achievement. Kept once earned, even if e.g. the streak later breaks. */
export type UnlockedAchievement = {
  /** The achievement's id, e.g. 'streak-30' or 'pa:<ProjectAchievement id>'. */
  id: string
  /** Day key. */
  unlockedAt: string
}

/** One of the (at most WEEK_PLAN_MAX) things the week is for. */
export type WeekPriority = {
  text: string
  done: boolean
}

/** What a week is meant to be about, written on Sunday or Monday and ticked off as it goes. */
export type WeekPlan = {
  /** Monday's day key: one plan per week. */
  week: string
  priorities: WeekPriority[]
  /** Anything else worth remembering about the week. */
  note?: string
  createdAt: string
  updatedAt?: string
}

/** A day declared hard: the minimum is enough and nothing missed is fined. One row per day. */
export type HardDay = {
  /** Day key. */
  date: string
}

/** Key–value bookkeeping, e.g. 'backupHandle' (a FileSystemFileHandle) or 'lastBackupAt'. */
export type MetaEntry = {
  key: string
  value: unknown
}

/**
 * partial: some amount logged, target not reached. skipped: keeps the streak, not counted.
 * frozen: a used streak freeze — the day was missed, the streak survives, but unlike a skip
 * it still counts as a miss in the success rate, so the numbers stay honest.
 */
export type HabitLogStatus = 'done' | 'minimum' | 'partial' | 'skipped' | 'frozen'

export type HabitLog = {
  id: string
  habitId: string
  date: string
  status: HabitLogStatus
  /** Amount logged for count/duration habits. */
  value?: number
  /** Day key the log was first written: marking a day late gives less XP. */
  loggedAt?: string
}

/** A closed week's XP, frozen so later changes (a deleted habit, new rules) never take it away. */
export type XpWeek = {
  /** Monday's day key. */
  week: string
  xp: number
  days: Record<string, number>
  sources: Record<string, number>
  stats: Record<string, number>
  /** Missing on weeks frozen before titles existed: those are worked out again. */
  counts?: Record<string, number>
}
