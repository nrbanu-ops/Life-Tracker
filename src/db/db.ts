import Dexie, { type EntityTable } from 'dexie'
import type {
  Habit,
  HabitLog,
  JournalEntry,
  LibraryGoal,
  LibraryItem,
  Milestone,
  Project,
  Task,
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

export const newId = () => crypto.randomUUID()
