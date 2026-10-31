import { BACKUP_APP, BACKUP_FORMAT, decodeRecord, encodeRecord, type Backup } from '../lib/backup'
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

/** Writes the backup if something changed and permission is still there; `force` skips the change check. */
export async function backupNow(force = false): Promise<'saved' | 'unchanged' | 'needs-permission' | 'off'> {
  const handle = await getBackupHandle()
  if (!handle) return 'off'
  if (!force && !dirty) return 'unchanged'
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') return 'needs-permission'
  await writeTo(handle)
  return 'saved'
}

/** Records a manual download as a backup too, for the "last backup" line. */
export async function noteDownloadedBackup(): Promise<void> {
  if (!supportsFileBackup || !(await getBackupHandle())) dirty = false
  await db.meta.put({ key: 'lastBackupAt', value: new Date().toISOString() })
}
