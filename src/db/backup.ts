import { addDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { androidBridge, saveFile, type SaveResult } from '../lib/android'
import {
  BACKUP_APP,
  BACKUP_FORMAT,
  backupFileName,
  backupReminder,
  decodeRecord,
  encodeRecord,
  SNOOZE_DAYS,
  type Backup,
} from '../lib/backup'
import { fromDateKey, toDateKey } from '../lib/date'
import { useTodayKey } from '../lib/useTodayKey'
import { db, META_TABLE } from './db'

const dataTables = () => db.tables.filter((t) => t.name !== META_TABLE)

/** Everything the user has entered, as backup-file text. */
export async function exportBackup(): Promise<string> {
  const tables: Record<string, unknown[]> = {}
  for (const table of dataTables()) {
    tables[table.name] = await Promise.all((await table.toArray()).map(encodeRecord))
  }
  const backup: Backup = { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), tables }
  return JSON.stringify(backup)
}

/** Replaces all data with the backup's; tables the backup doesn't know about are left empty. */
export async function restoreBackup(backup: Backup): Promise<number> {
  const tables = dataTables()
  let count = 0
  await db.transaction('rw', tables, async () => {
    for (const table of tables) {
      await table.clear()
      const rows = (backup.tables[table.name] ?? []).map(decodeRecord)
      await table.bulkPut(rows)
      count += rows.length
    }
  })
  markDirty()
  return count
}

/**
 * Deletes everything the user entered. The meta table goes too, which turns the automatic backup
 * off: otherwise the empty app would overwrite the last backup file right away.
 */
export async function resetAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
}

// --- Automatic backup into a file the user picked once (File System Access API, desktop Chrome/Edge).

/** The handle methods we use; not all of them are in TypeScript's DOM types yet. */
type BackupHandle = FileSystemFileHandle & {
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
}

type SaveFilePicker = (options: {
  suggestedName: string
  types: { description: string; accept: Record<string, string[]> }[]
}) => Promise<FileSystemFileHandle>

export const supportsFileBackup = typeof window !== 'undefined' && 'showSaveFilePicker' in window

// Starts dirty so each session backs up at least once.
let dirty = true
const markDirty = () => {
  dirty = true
}

let watching = false
/** Notes every write to the data tables so the automatic backup only runs after changes. */
export function watchChanges(): void {
  if (watching) return
  watching = true
  for (const table of dataTables()) {
    table.hook('creating', markDirty)
    table.hook('updating', markDirty)
    table.hook('deleting', markDirty)
  }
}

export async function getBackupHandle(): Promise<BackupHandle | undefined> {
  return (await db.meta.get('backupHandle'))?.value as BackupHandle | undefined
}

async function writeTo(handle: BackupHandle): Promise<void> {
  const text = await exportBackup()
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
  dirty = false
  await db.meta.put({ key: 'lastBackupAt', value: new Date().toISOString() })
}

/** Asks where to keep the backup (a click is required), then writes it right away. */
export async function chooseBackupFile(suggestedName: string): Promise<void> {
  const picker = (window as unknown as { showSaveFilePicker: SaveFilePicker }).showSaveFilePicker
  const handle = (await picker({
    suggestedName,
    types: [{ description: 'Life Tracker yedeği', accept: { 'application/json': ['.json'] } }],
  })) as BackupHandle
  await db.meta.put({ key: 'backupHandle', value: handle })
  await writeTo(handle)
}

export async function stopAutoBackup(): Promise<void> {
  await db.meta.delete('backupHandle')
}

/** 'granted' when the app may write the file without asking; browsers forget this after a restart. */
export async function backupPermission(): Promise<PermissionState | undefined> {
  const handle = await getBackupHandle()
  return handle ? handle.queryPermission({ mode: 'readwrite' }) : undefined
}

/** Must run from a click: asks to keep writing the file, then backs up. */
export async function resumeAutoBackup(): Promise<boolean> {
  const handle = await getBackupHandle()
  if (!handle || (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return false
  await writeTo(handle)
  return true
}

// --- On the Android app: automatic backup into Downloads/LifeTracker/ through the shell's bridge.

export const supportsAndroidBackup = androidBridge !== undefined
export const ANDROID_BACKUP_NAME = 'life-tracker-yedek.json'

export async function androidBackupOn(): Promise<boolean> {
  return Boolean((await db.meta.get('androidBackup'))?.value)
}

export async function setAndroidBackup(on: boolean): Promise<void> {
  await db.meta.put({ key: 'androidBackup', value: on })
  if (on) await backupNow(true)
}

async function writeAndroid(): Promise<void> {
  if (!androidBridge?.writeText(ANDROID_BACKUP_NAME, await exportBackup())) throw new Error('Yedek yazılamadı')
  dirty = false
  await db.meta.put({ key: 'lastBackupAt', value: new Date().toISOString() })
}

/** Writes the backup if something changed and permission is still there; `force` skips the change check. */
export async function backupNow(force = false): Promise<'saved' | 'unchanged' | 'needs-permission' | 'off'> {
  if (supportsAndroidBackup) {
    if (!(await androidBackupOn())) return 'off'
    if (!force && !dirty) return 'unchanged'
    await writeAndroid()
    return 'saved'
  }
  const handle = await getBackupHandle()
  if (!handle) return 'off'
  if (!force && !dirty) return 'unchanged'
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') return 'needs-permission'
  await writeTo(handle)
  return 'saved'
}

/** Records a manual download as a backup too, for the "last backup" line. */
export async function noteDownloadedBackup(): Promise<void> {
  const autoOn = supportsAndroidBackup ? await androidBackupOn() : supportsFileBackup && Boolean(await getBackupHandle())
  if (!autoOn) dirty = false
  await db.meta.put({ key: 'lastBackupAt', value: new Date().toISOString() })
}

/**
 * Saves a backup file the user keeps (Downloads on Android, the share sheet on iOS).
 * Only a real save counts as a backup: a cancelled share sheet must not reset the reminder.
 */
export async function downloadBackup(today: string): Promise<SaveResult> {
  const blob = new Blob([await exportBackup()], { type: 'application/json' })
  const result = await saveFile(backupFileName(today), blob)
  if (result === 'saved') await noteDownloadedBackup()
  return result
}

// --- Reminder on the Today screen when no backup was taken for a while.

const SNOOZE = 'backupSnoozedUntil'

export async function snoozeBackupReminder(today: string): Promise<void> {
  await db.meta.put({ key: SNOOZE, value: toDateKey(addDays(fromDateKey(today), SNOOZE_DAYS)) })
}

/** Days since the last backup when it's time to remind (null: never backed up), else undefined. */
export function useBackupReminder(): number | null | undefined {
  const today = useTodayKey()
  return useLiveQuery(async () => {
    const [last, snoozed, handle, android, habits, project, item, entry] = await Promise.all([
      db.meta.get('lastBackupAt'),
      db.meta.get(SNOOZE),
      db.meta.get('backupHandle'),
      db.meta.get('androidBackup'),
      db.habits.toArray(),
      db.projects.orderBy('createdAt').first(),
      db.library.orderBy('createdAt').first(),
      db.journal.orderBy('createdAt').first(),
    ])
    const firstUse = [...habits.map((h) => h.createdAt), project?.createdAt, item?.createdAt, entry?.createdAt]
      .filter((d): d is string => !!d)
      .sort()[0]
    return backupReminder({
      today,
      firstUse: firstUse && toDateKey(new Date(firstUse)),
      lastBackupAt: last?.value as string | undefined,
      autoOn: supportsAndroidBackup ? Boolean(android?.value) : supportsFileBackup && Boolean(handle?.value),
      snoozedUntil: snoozed?.value as string | undefined,
    })
  }, [today])
}
