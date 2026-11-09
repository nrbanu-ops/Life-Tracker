import { entryPhotos } from '../lib/journal'
import { heaviestDays, type DayWeight } from '../lib/storage'
import { db } from './db'

export type StorageUse = {
  /** Everything this site keeps on the device: the data, the offline files, the photos. */
  usage: number
  /** What the browser is willing to give before writes start failing. */
  quota: number
}

/** What the browser says is in use; undefined where it won't say (older Safari, some WebViews). */
export async function readStorageUse(): Promise<StorageUse | undefined> {
  try {
    const estimate = await navigator.storage?.estimate?.()
    if (!estimate || estimate.usage === undefined || !estimate.quota) return undefined
    return { usage: estimate.usage, quota: estimate.quota }
  } catch {
    return undefined
  }
}

/** Whether the browser promised not to clear the data to make room; undefined where unknown. */
export async function isPersisted(): Promise<boolean | undefined> {
  try {
    return await navigator.storage?.persisted?.()
  } catch {
    return undefined
  }
}

export async function askPersist(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export type PhotoReport = {
  photos: number
  bytes: number
  posters: number
  posterBytes: number
  days: DayWeight[]
}

/**
 * Weighs every stored picture. This reads them all, so it only runs when the user asks for it;
 * nothing keeps a reference afterwards except the few numbers below.
 */
export async function photoReport(): Promise<PhotoReport> {
  const entries = await db.journal.toArray()
  let photos = 0
  let bytes = 0
  for (const entry of entries) {
    for (const photo of entryPhotos(entry)) {
      photos++
      bytes += photo.size
    }
  }
  const days = heaviestDays(entries)

  const items = await db.library.toArray()
  let posters = 0
  let posterBytes = 0
  for (const item of items) {
    if (!item.posterBlob) continue
    posters++
    posterBytes += item.posterBlob.size
  }

  return { photos, bytes, posters, posterBytes, days }
}
