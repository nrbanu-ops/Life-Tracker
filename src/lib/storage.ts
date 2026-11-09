import type { JournalEntry } from '../db/types'
import { entryPhotos } from './journal'

/** Bytes as a short Turkish size: 940 B, 91,2 kB, 1,4 MB. Decimal units, like the browser's own. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1000) return `${Math.round(bytes)} B`
  const units = ['kB', 'MB', 'GB', 'TB']
  let value = bytes / 1000
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  const text = value >= 100 ? String(Math.round(value)) : value.toFixed(1).replace('.', ',')
  return `${text} ${units[unit]}`
}

export type DayWeight = { date: string; photos: number; bytes: number }

/**
 * The days whose photos take up the most room, heaviest first: where to look first when
 * the device is filling up. Ties go to the older day, so the list doesn't jump around.
 */
export function heaviestDays(entries: Pick<JournalEntry, 'date' | 'photo' | 'photos'>[], limit = 5): DayWeight[] {
  const byDate = new Map<string, DayWeight>()
  for (const entry of entries) {
    const photos = entryPhotos(entry)
    if (photos.length === 0) continue
    const day = byDate.get(entry.date) ?? { date: entry.date, photos: 0, bytes: 0 }
    day.photos += photos.length
    day.bytes += photos.reduce((sum, photo) => sum + photo.size, 0)
    byDate.set(entry.date, day)
  }
  return [...byDate.values()].sort((a, b) => b.bytes - a.bytes || a.date.localeCompare(b.date)).slice(0, limit)
}
