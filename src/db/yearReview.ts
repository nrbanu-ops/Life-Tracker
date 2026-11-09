import { entryPhotos } from '../lib/journal'
import type { JournalBit, LibraryBit, YearData } from '../lib/yearReview'
import { db } from './db'

/**
 * Everything the year summary needs, read once. Journal entries and library items are walked
 * one at a time and reduced to what the page counts, so a year of photos and voice notes is
 * never all in memory at the same time.
 */
export async function loadYearData(): Promise<YearData> {
  const journal: JournalBit[] = []
  await db.journal.each((entry) => {
    journal.push({
      date: entry.date,
      text: entry.text,
      kind: entry.kind,
      photos: entryPhotos(entry).length,
      audio: Boolean(entry.audio),
    })
  })
  const library: LibraryBit[] = []
  await db.library.each((item) => {
    library.push({
      kind: item.kind,
      title: item.title,
      status: item.status,
      finishedAt: item.finishedAt,
      rating: item.rating,
    })
  })
  const [habits, logs, moods, tasks, projects, milestones, achievements, xpWeeks] = await Promise.all([
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.moods.toArray(),
    db.tasks.toArray(),
    db.projects.toArray(),
    db.milestones.toArray(),
    db.achievements.toArray(),
    db.xpWeeks.toArray(),
  ])
  return { habits, logs, journal, moods, library, tasks, projects, milestones, achievements, xpWeeks }
}
