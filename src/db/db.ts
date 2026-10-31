import Dexie, { type EntityTable } from 'dexie'
import type {
  DayMood,
  Habit,
  HabitLog,
  JournalEntry,
  LibraryGoal,
  LibraryItem,
  MetaEntry,
  Milestone,
  Project,
  ProjectAchievement,
  Task,
  UnlockedAchievement,
  XpWeek,
} from './types'

export const db = new Dexie('life-tracker') as Dexie & {
  projects: EntityTable<Project, 'id'>
  milestones: EntityTable<Milestone, 'id'>
  habits: EntityTable<Habit, 'id'>
  habitLogs: EntityTable<HabitLog, 'id'>
  tasks: EntityTable<Task, 'id'>
  journal: EntityTable<JournalEntry, 'id'>
  library: EntityTable<LibraryItem, 'id'>
  libraryGoals: EntityTable<LibraryGoal, 'id'>
  meta: EntityTable<MetaEntry, 'key'>
  moods: EntityTable<DayMood, 'date'>
  achievements: EntityTable<UnlockedAchievement, 'id'>
  projectAchievements: EntityTable<ProjectAchievement, 'id'>
  xpWeeks: EntityTable<XpWeek, 'week'>
}

// Booleans can't be indexed in IndexedDB, so `archived` and `done` are filtered in memory.
// [habitId+date] is unique: at most one log per habit per day.
db.version(1).stores({
  projects: 'id, status, createdAt',
  milestones: 'id, projectId, [projectId+order]',
  habits: 'id, projectId, order',
  habitLogs: 'id, habitId, date, &[habitId+date]',
})

// v2: habits get a kind; everything created before is a check habit.
db.version(2)
  .stores({})
  .upgrade((tx) =>
    tx
      .table('habits')
      .toCollection()
      .modify((habit: Habit) => {
        habit.kind ??= 'check'
      }),
  )

// v3: to-do tasks.
db.version(3).stores({
  tasks: 'id, date, projectId, completedAt',
})

// v4: journal entries and habit notes.
db.version(4).stores({
  journal: 'id, date, habitId, [habitId+date], createdAt',
})

// v5: library of books, films and series.
db.version(5).stores({
  library: 'id, kind, status, finishedAt, createdAt',
})

// v6: yearly library goals.
db.version(6).stores({
  libraryGoals: 'id, year',
})

// v7: app bookkeeping such as the automatic backup file; never part of a backup itself.
db.version(7).stores({
  meta: 'key',
})

// v8: achievements: the earned ones, and the AI's project-specific ones.
db.version(8).stores({
  achievements: 'id',
  projectAchievements: 'id, projectId',
})

// v9: mood and energy per day.
db.version(9).stores({
  moods: 'date',
})

// v10: leveling: each closed week's XP, frozen.
db.version(10).stores({
  xpWeeks: 'week',
})

export const META_TABLE = 'meta'

export const newId = () => crypto.randomUUID()
