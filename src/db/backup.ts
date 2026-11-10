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
  safetyFileName,
  SNOOZE_DAYS,
  type Backup,
} from '../lib/backup'
import { fromDateKey, toDateKey } from '../lib/date'
import { useTodayKey } from '../lib/useTodayKey'
import { db, META_TABLE } from './db'
import { startXpFrom } from './leveling'

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

export type SafetyResult = SaveResult | 'empty'

/**
 * Writes what is in the app right now to a file of its own, before a restore or a reset throws
 * it away. Picking the wrong file used to be final: the confirmation said so, but saying so
 * doesn't give anything back. 'empty' means there was nothing to lose.
 *
 * It deliberately does not count as a backup: a moment later this data is gone, and "last
 * backup: just now" would then be a lie about the data that replaced it.
 */
export async function saveSafetyCopy(today: string, kind: 'restore' | 'reset' = 'restore'): Promise<SafetyResult> {
  if (!(await hasAnyData())) return 'empty'
  const blob = new Blob([await exportBackup()], { type: 'application/json' })
  try {
    return await saveFile(safetyFileName(today, kind), blob)
  } catch {
    return 'failed'
  }
}

/** Counts only, so an app full of photos doesn't have to be read to answer. */
async function hasAnyData(): Promise<boolean> {
  for (const table of dataTables()) if ((await table.count()) > 0) return true
  return false
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
/**
 * Starts the habit and project side over, and leaves the rest of the app alone: the journal,
 * the library, moods, tasks and week plans all stay, as do the settings in `meta`.
 *
 * Habit notes in the journal are kept too — they are writing, not bookkeeping, and the journal
 * shows one whose habit is gone as "Silinmiş habit". XP and achievements go with the habits,
 * and because the journal and tasks that stay would otherwise earn that XP straight back, the
 * ledger is told to start again today.
 */
export async function resetHabitsAndProjects(today: string): Promise<void> {
  const cleared = [
    db.habits,
    db.habitLogs,
    db.projects,
    db.milestones,
    db.projectAchievements,
    db.achievements,
    db.xpWeeks,
    db.hardDays,
  ]
  await db.transaction('rw', [...cleared, db.meta], async () => {
    for (const table of cleared) await table.clear()
    // A pointer to weeks that no longer exist.
    await db.meta.delete('xpDirtyWeeks')
    await startXpFrom(today)
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

/**
 * Must run from a click: puts the automatic backup back to work after a lapsed permission or a
 * failed write. On Android there is no permission to re-ask for, so it just writes again.
 */
export async function retryAutoBackup(): Promise<boolean> {
  if (supportsAndroidBackup) return (await backupNow(true)) === 'saved'
  return resumeAutoBackup()
}

/** Must run from a click: asks to keep writing the file, then backs up. */
export async function resumeAutoBackup(): Promise<boolean> {
  const handle = await getBackupHandle()
  if (!handle || (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return false
  return (await write(writeTo(handle))) === 'saved'
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

export type BackupResult = 'saved' | 'unchanged' | 'needs-permission' | 'off' | 'failed'

/**
 * Writes the backup if something changed and permission is still there; `force` skips the change
 * check. A write that goes wrong (the file was deleted, the disk is full, the bridge refused)
 * comes back as 'failed' rather than throwing: the caller has to tell the user, because an
 * automatic backup nobody knows has stopped is worse than no automatic backup at all.
 */
export async function backupNow(force = false): Promise<BackupResult> {
  if (supportsAndroidBackup) {
    if (!(await androidBackupOn())) return 'off'
    if (!force && !dirty) return 'unchanged'
    return write(writeAndroid())
  }
  const handle = await getBackupHandle()
  if (!handle) return 'off'
  if (!force && !dirty) return 'unchanged'
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') return 'needs-permission'
  return write(writeTo(handle))
}

async function write(writing: Promise<void>): Promise<'saved' | 'failed'> {
  try {
    await writing
    return 'saved'
  } catch {
    return 'failed'
  }
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
    const [last, snoozed, habits, project, item, entry] = await Promise.all([
      db.meta.get('lastBackupAt'),
      db.meta.get(SNOOZE),
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
      snoozedUntil: snoozed?.value as string | undefined,
    })
  }, [today])
}
