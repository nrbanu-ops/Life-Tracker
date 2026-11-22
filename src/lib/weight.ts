import { addDays } from 'date-fns'
import type { WeightEntry } from '../db/types'
import { fromDateKey, toDateKey } from './date'

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
