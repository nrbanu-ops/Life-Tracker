import { addDays, differenceInCalendarDays } from 'date-fns'
import type { JournalEntry, WeightEntry } from '../db/types'
import { fromDateKey, toDateKey } from './date'
import { entryPhotos } from './journal'

export const MIN_KG = 20
export const MAX_KG = 400
/** Days in the trend line: a single weigh-in swings 1–2 kg with water and salt. */
export const TREND_DAYS = 7

/** "78,4" or "78.4" → 78.4; undefined when it isn't a believable weight. */
export function parseKg(text: string): number | undefined {
  const value = Number(text.trim().replace(',', '.'))
  if (!text.trim() || !Number.isFinite(value) || value < MIN_KG || value > MAX_KG) return undefined
  return Math.round(value * 10) / 10
}

/** 78.4 → "78,4"; whole numbers keep no decimals. */
export const formatKg = (kg: number): string =>
  (Math.round(kg * 10) / 10).toLocaleString('tr-TR', { maximumFractionDigits: 1 })

const byDate = (entries: WeightEntry[]) => [...entries].sort((a, b) => a.date.localeCompare(b.date))

/** The average of the weigh-ins in the `days` days ending on each entry's day. */
export function trend(entries: WeightEntry[], days = TREND_DAYS): { date: string; kg: number }[] {
  const sorted = byDate(entries)
  return sorted.map((entry) => {
    const from = toDateKey(addDays(fromDateKey(entry.date), -(days - 1)))
    const window = sorted.filter((e) => e.date >= from && e.date <= entry.date)
    return { date: entry.date, kg: window.reduce((sum, e) => sum + e.kg, 0) / window.length }
  })
}

export type WeightProgress = {
  start: number
  current: number
  /** Positive when weight went down. */
  lost: number
  /** Still to lose; 0 once the target is reached. Undefined without a target. */
  left?: number
  /** 0–1 of the way from the start to the target. */
  ratio?: number
}

/** From the first weigh-in to the latest one, against the target when there is one. */
export function weightProgress(entries: WeightEntry[], targetKg?: number): WeightProgress | undefined {
  const sorted = byDate(entries)
  if (sorted.length === 0) return undefined
  const start = sorted[0].kg
  const current = sorted[sorted.length - 1].kg
  const lost = start - current
  if (targetKg === undefined) return { start, current, lost }
  const left = Math.max(0, current - targetKg)
  const span = start - targetKg
  const ratio = span <= 0 ? (current <= targetKg ? 1 : 0) : Math.min(1, Math.max(0, lost / span))
  return { start, current, lost, left, ratio }
}

/** The change from the weigh-in before `date` to the one on it; undefined without both. */
export function changeOn(entries: WeightEntry[], date: string): number | undefined {
  const sorted = byDate(entries).filter((e) => e.date <= date)
  const last = sorted.at(-1)
  const before = sorted.at(-2)
  if (!last || last.date !== date || !before) return undefined
  return last.kg - before.kg
}

/**
 * How much the 7-day average moved over the last `days` days, against the latest weigh-in at least
 * that old; undefined when there isn't one.
 */
export function trendChange(entries: WeightEntry[], days: number): number | undefined {
  const t = trend(entries)
  const last = t.at(-1)
  if (!last) return undefined
  const cutoff = toDateKey(addDays(fromDateKey(last.date), -days))
  const before = t.filter((p) => p.date <= cutoff).at(-1)
  return before ? last.kg - before.kg : undefined
}

export type WeightMonth = { month: string; average: number; entries: WeightEntry[] }

/** Weigh-ins by calendar month, newest month and newest day first, with the month's average. */
export function weightMonths(entries: WeightEntry[]): WeightMonth[] {
  const groups = new Map<string, WeightEntry[]>()
  for (const e of byDate(entries).reverse()) {
    const month = e.date.slice(0, 7)
    groups.set(month, [...(groups.get(month) ?? []), e])
  }
  return [...groups].map(([month, list]) => ({
    month,
    average: list.reduce((sum, e) => sum + e.kg, 0) / list.length,
    entries: list,
  }))
}

/** The weigh-in that stood on `date`: that day's, else the latest one before it. */
export function weightOn(entries: WeightEntry[], date: string): WeightEntry | undefined {
  return byDate(entries)
    .filter((e) => e.date <= date)
    .at(-1)
}

export type WeightPhoto = {
  /** `entryId:index`, unique even when an entry holds the same picture twice. */
  id: string
  entryId: string
  index: number
  date: string
  blob: Blob
}

/** The progress photos among journal entries, oldest first (then in the order they were added). */
export function weightPhotos(journal: JournalEntry[]): WeightPhoto[] {
  return journal
    .filter((e) => e.kind === 'weight')
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .flatMap((e) => entryPhotos(e).map((blob, index) => ({ id: `${e.id}:${index}`, entryId: e.id, index, date: e.date, blob })))
}

/** The weeks the arrival estimate looks back over. */
export const ETA_WEEKS = 4
/** Less than this many kg a week down counts as standing still. */
const STALL_PER_WEEK = 0.05

export type WeightEta =
  | { kind: 'date'; date: string; perWeek: number }
  /** Not going down over the last weeks (or too slowly to name a date within two years). */
  | { kind: 'stalled'; perWeek: number }

/**
 * When the target would be reached at the pace of the last `ETA_WEEKS` weeks of the 7-day
 * average. Undefined without a target still ahead or without two weeks of history to measure.
 */
export function weightEta(entries: WeightEntry[], targetKg: number | undefined, today: string): WeightEta | undefined {
  const t = trend(entries)
  const last = t.at(-1)
  if (targetKg === undefined || !last || last.kg <= targetKg) return undefined
  const cutoff = toDateKey(addDays(fromDateKey(last.date), -ETA_WEEKS * 7))
  const from = t.filter((p) => p.date <= cutoff).at(-1) ?? t[0]
  const span = differenceInCalendarDays(fromDateKey(last.date), fromDateKey(from.date))
  if (span < 14) return undefined
  const perWeek = ((from.kg - last.kg) / span) * 7
  if (perWeek < STALL_PER_WEEK) return { kind: 'stalled', perWeek }
  const days = Math.ceil(((last.kg - targetKg) / perWeek) * 7)
  if (days > 730) return { kind: 'stalled', perWeek }
  // Counted from today, not from the last weigh-in: a date already behind us would read oddly.
  const start = last.date > today ? last.date : today
  return { kind: 'date', date: toDateKey(addDays(fromDateKey(start), days)), perWeek }
}

/** Kg down from the first weigh-in to the lowest 7-day average: one dry morning doesn't count. */
export function mostLost(entries: WeightEntry[]): number {
  const first = byDate(entries)[0]
  if (!first) return 0
  return Math.max(0, first.kg - Math.min(...trend(entries).map((p) => p.kg)))
}

/** The longest run of consecutive days with a weigh-in. */
export function longestWeighInRun(entries: WeightEntry[]): number {
  let best = 0
  let run = 0
  let previous: string | undefined
  for (const e of byDate(entries)) {
    run = previous && toDateKey(addDays(fromDateKey(previous), 1)) === e.date ? run + 1 : 1
    best = Math.max(best, run)
    previous = e.date
  }
  return best
}
