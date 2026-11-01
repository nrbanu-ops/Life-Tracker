import { useLiveQuery } from 'dexie-react-hooks'
import { addDays } from 'date-fns'
import { fromDateKey, toDateKey, weekRange } from '../lib/date'
import {
  emergencyProgress,
  emergencyQuest,
  firstDay,
  levelFor,
  mergeSummaries,
  penaltiesOn,
  questState,
  rankFor,
  summarize,
  titles,
  xpEvents,
  type EmergencyQuest,
  type LevelInfo,
  type QuestState,
  type Rank,
  type Title,
  type XpData,
  type XpSummary,
} from '../lib/leveling'
import { useTodayKey } from '../lib/useTodayKey'
import { db } from './db'

const DIRTY = 'xpDirtyWeeks'
/** The day penalties were switched on, or 'off'. Missing means never set: they start on first run. */
const PENALTY = 'penaltyFrom'

export async function loadXpData(): Promise<XpData> {
  const [habits, logs, tasks, milestones, projects, journal, moods, library, achievements, penalty] = await Promise.all([
    db.habits.toArray(),
    db.habitLogs.toArray(),
    db.tasks.toArray(),
    db.milestones.toArray(),
    db.projects.toArray(),
    db.journal.toArray(),
    db.moods.toArray(),
    db.library.toArray(),
    db.achievements.toArray(),
    db.meta.get(PENALTY),
  ])
  const penaltyFrom = typeof penalty?.value === 'string' && penalty.value !== 'off' ? penalty.value : undefined
  return { habits, logs, tasks, milestones, projects, journal, moods, library, achievements, penaltyFrom }
}

/** Penalties for missed habits start today (switching them on again never fines the past). */
export async function setPenaltyOn(on: boolean, today: string): Promise<void> {
  await db.meta.put({ key: PENALTY, value: on ? today : 'off' })
}

export function usePenaltyOn(): boolean | undefined {
  return useLiveQuery(async () => (await db.meta.get(PENALTY))?.value !== 'off')
}


/** A day of a frozen week changed (e.g. a late mark): that week is worked out again. */
export async function markXpWeekDirty(week: string): Promise<void> {
  const entry = await db.meta.get(DIRTY)
  const weeks = new Set((entry?.value as string[] | undefined) ?? [])
  if (weeks.has(week)) return
  weeks.add(week)
  await db.meta.put({ key: DIRTY, value: [...weeks] })
}

const shift = (day: string, days: number) => toDateKey(addDays(fromDateKey(day), days))

/**
 * Freezes every closed week that isn't in the ledger yet (and re-does changed ones). After this,
 * deleting a habit or tuning the rules never takes away XP already earned.
 */
export async function syncXpLedger(today: string): Promise<void> {
  if (!(await db.meta.get(PENALTY))) await setPenaltyOn(true, today)
  const current = weekRange(today).start
  const [data, stored, dirtyEntry] = await Promise.all([loadXpData(), db.xpWeeks.toArray(), db.meta.get(DIRTY)])
  const dirty = new Set((dirtyEntry?.value as string[] | undefined) ?? [])
  const have = new Set(stored.filter((w) => w.counts && !dirty.has(w.week)).map((w) => w.week))
  const first = weekRange(firstDay(data, today)).start
  const todo: string[] = []
  for (let week = first; week < current; week = shift(week, 7)) if (!have.has(week)) todo.push(week)
  if (todo.length > 0) {
    // One pass over the whole span: streaks need the history before each week anyway.
    const summaries = byWeek(xpEvents(data, todo[0], shift(current, -1), today))
    await db.xpWeeks.bulkPut(
      todo.map((week) => {
        const s = summaries.get(week) ?? summarize([])
        return { week, xp: s.xp, days: s.days, sources: s.sources, stats: s.stats, counts: s.counts } as never
      }),
    )
  }
  if (dirty.size > 0) await db.meta.delete(DIRTY)
}

function byWeek(events: ReturnType<typeof xpEvents>): Map<string, XpSummary> {
  const groups = new Map<string, ReturnType<typeof xpEvents>>()
  for (const e of events) {
    const week = weekRange(e.date).start
    groups.set(week, [...(groups.get(week) ?? []), e])
  }
  return new Map([...groups].map(([week, list]) => [week, summarize(list)]))
}

export type LevelState = LevelInfo & {
  total: number
  rank: Rank
  summary: XpSummary
  today: number
  quest: QuestState
  emergency: EmergencyQuest & { done: number; met: boolean }
  titles: Title[]
  /** What yesterday's misses cost, per habit. */
  penalties: { habitId: string; title: string; xp: number }[]
}

/** The user's level, rank, stats and today's quest, kept live; undefined while loading. */
export function useLeveling(): LevelState | undefined {
  const today = useTodayKey()
  return useLiveQuery(async () => {
    const [data, stored, dirtyEntry] = await Promise.all([loadXpData(), db.xpWeeks.toArray(), db.meta.get(DIRTY)])
    const current = weekRange(today).start
    const dirty = new Set((dirtyEntry?.value as string[] | undefined) ?? [])
    const frozen = stored.filter((w) => w.week < current && w.counts && !dirty.has(w.week))
    const frozenWeeks = new Set(frozen.map((w) => w.week))
    // Until the ledger catches up (first start, a changed week), missing weeks are worked out live.
    const first = weekRange(firstDay(data, today)).start
    let liveFrom = current
    for (let week = first; week < current; week = shift(week, 7)) {
      if (!frozenWeeks.has(week)) {
        liveFrom = week
        break
      }
    }
    const live = xpEvents(data, liveFrom, today, today).filter((e) => !frozenWeeks.has(weekRange(e.date).start))
    const summary = mergeSummaries([...frozen.map((w) => w as unknown as XpSummary), summarize(live)])
    const info = levelFor(summary.xp)
    const emergency = emergencyQuest(data, current)
    const progress = emergencyProgress(emergency, data, today)
    return {
      ...info,
      total: summary.xp,
      rank: rankFor(info.level),
      summary,
      today: summary.days[today] ?? 0,
      quest: questState(data.habits, data.logs, today),
      emergency: { ...emergency, done: progress.done, met: !!progress.metOn },
      titles: titles({ level: info.level, summary, habits: data.habits, logs: data.logs, library: data.library, today }),
      penalties: penaltiesOn(data, shift(today, -1), today).map((e) => ({
        habitId: e.habitId!,
        title: data.habits.find((h) => h.id === e.habitId)?.title ?? '',
        xp: e.xp,
      })),
    }
  }, [today])
}
