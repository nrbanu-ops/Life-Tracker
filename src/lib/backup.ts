import { differenceInCalendarDays } from 'date-fns'
import { fromDateKey, toDateKey } from './date'

/**
 * Backup file format: every table as plain JSON. Blobs (the user's own photos) can't go into
 * JSON, so they are stored as data URLs under a `__blob` marker and turned back on import.
 */

export const BACKUP_APP = 'life-tracker'
export const BACKUP_FORMAT = 1

export type Backup = {
  app: typeof BACKUP_APP
  format: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

type BlobMarker = { __blob: string }
const isBlobMarker = (v: unknown): v is BlobMarker =>
  typeof v === 'object' && v !== null && typeof (v as BlobMarker).__blob === 'string'

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  // In chunks: String.fromCharCode with one huge argument list overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

function dataUrlToBlob(url: string): Blob {
  const [head, data = ''] = url.split(',', 2)
  const type = head.match(/^data:([^;]+)/)?.[1] ?? ''
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** A record ready for JSON: Blob fields, and Blobs in a list, become markers. */
export async function encodeRecord(record: unknown): Promise<unknown> {
  if (typeof record !== 'object' || record === null) return record
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    out[key] = Array.isArray(value) ? await Promise.all(value.map(encodeValue)) : await encodeValue(value)
  }
  return out
}

async function encodeValue(value: unknown): Promise<unknown> {
  return value instanceof Blob ? { __blob: await blobToDataUrl(value) } : value
}

export function decodeRecord(record: unknown): unknown {
  if (typeof record !== 'object' || record === null) return record
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    out[key] = Array.isArray(value) ? value.map(decodeValue) : decodeValue(value)
  }
  return out
}

function decodeValue(value: unknown): unknown {
  return isBlobMarker(value) ? dataUrlToBlob(value.__blob) : value
}

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; error: string }

/** Checks that a file really is one of our backups before anything gets replaced. */
export function parseBackup(text: string): ParsedBackup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Bu dosya okunamadı. Doğru yedek dosyasını seçtiğinden emin ol.' }
  }
  const backup = data as Partial<Backup> | null
  if (backup?.app !== BACKUP_APP || typeof backup.tables !== 'object' || backup.tables === null) {
    return { ok: false, error: 'Bu bir Life Tracker yedeği değil.' }
  }
  if (typeof backup.format !== 'number' || backup.format > BACKUP_FORMAT) {
    return { ok: false, error: 'Bu yedek uygulamanın daha yeni bir sürümüyle alınmış.' }
  }
  for (const rows of Object.values(backup.tables)) {
    if (!Array.isArray(rows)) return { ok: false, error: 'Yedek dosyası bozuk.' }
  }
  return { ok: true, backup: backup as Backup }
}

/** "life-tracker-yedek-2026-10-31.json" */
export const backupFileName = (today: string) => `life-tracker-yedek-${today}.json`

/**
 * The copy of the current data taken just before it is thrown away. A name of its own, so it
 * can't be mistaken for the ordinary backup and overwritten by the next one.
 */
export const safetyFileName = (today: string, kind: 'restore' | 'reset' = 'restore') =>
  `life-tracker-${kind === 'reset' ? 'sifirlamadan' : 'geri-yuklemeden'}-once-${today}.json`

export type ReminderInput = {
  today: string
  /** Day key of the first thing entered; undefined while the app is empty. */
  firstUse?: string
  /** When a backup was last really written — by the automatic one or by hand. */
  lastBackupAt?: string
  /** Day key until which "Sonra" hides the reminder. */
  snoozedUntil?: string
}

export const REMIND_AFTER_DAYS = 7
export const FIRST_REMIND_DAYS = 3
export const SNOOZE_DAYS = 3

const daysBetween = (from: string, to: string) => differenceInCalendarDays(fromDateKey(to), fromDateKey(from))

/** Days since the last backup when it's time to remind (null if never backed up), else undefined. */
export function backupReminder({ today, firstUse, lastBackupAt, snoozedUntil }: ReminderInput): number | null | undefined {
  if (!firstUse || (snoozedUntil && today < snoozedUntil)) return undefined
  if (!lastBackupAt) {
    // Switching the automatic backup on writes one at once, so a missing date means it failed.
    return daysBetween(firstUse, today) >= FIRST_REMIND_DAYS ? null : undefined
  }
  const since = daysBetween(toDateKey(new Date(lastBackupAt)), today)
  if (since < REMIND_AFTER_DAYS) return undefined
  // An automatic backup that is working rewrites the file every few minutes. If the last one is
  // this old it is failing silently, which is exactly when the user must not be left reassured.
  return since
}
