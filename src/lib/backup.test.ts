import { describe, expect, it } from 'vitest'
import { backupReminder, decodeRecord, encodeRecord, parseBackup } from './backup'

describe('backup records', () => {
  it('round-trips a photo through JSON', async () => {
    const photo = new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' })
    const encoded = await encodeRecord({ id: 'a', title: 'Kapadokya', posterBlob: photo })
    const decoded = decodeRecord(JSON.parse(JSON.stringify(encoded))) as { title: string; posterBlob: Blob }
    expect(decoded.title).toBe('Kapadokya')
    expect(decoded.posterBlob).toBeInstanceOf(Blob)
    expect(decoded.posterBlob.type).toBe('image/jpeg')
    expect([...new Uint8Array(await decoded.posterBlob.arrayBuffer())]).toEqual([1, 2, 3, 250])
  })

  it('leaves ordinary fields alone', async () => {
    const record = { id: 'h', frequency: { type: 'daily' }, relapses: ['x'] }
    expect(decodeRecord(await encodeRecord(record))).toEqual(record)
  })
})

describe('parseBackup', () => {
  it('accepts our own backups', () => {
    const text = JSON.stringify({ app: 'life-tracker', format: 1, exportedAt: '', tables: { habits: [] } })
    expect(parseBackup(text).ok).toBe(true)
  })

  it('rejects anything else with a reason', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false })
    expect(parseBackup('{"tables":{}}')).toMatchObject({ ok: false, error: 'Bu bir Life Tracker yedeği değil.' })
    expect(parseBackup('{"app":"life-tracker","format":99,"tables":{}}')).toMatchObject({ ok: false })
    expect(parseBackup('{"app":"life-tracker","format":1,"tables":{"habits":{}}}')).toMatchObject({ ok: false })
  })
})

describe('backupReminder', () => {
  const base = { today: '2026-11-20', firstUse: '2026-11-01', autoOn: false }
  const at = (day: string) => new Date(`${day}T21:30:00`).toISOString()

  it('stays quiet in an empty app and with an automatic backup', () => {
    expect(backupReminder({ ...base, firstUse: undefined })).toBeUndefined()
    expect(backupReminder({ ...base, autoOn: true })).toBeUndefined()
  })

  it('reminds a few days after first use when never backed up', () => {
    expect(backupReminder({ ...base, firstUse: '2026-11-18' })).toBeUndefined()
    expect(backupReminder({ ...base, firstUse: '2026-11-17' })).toBeNull()
  })

  it('reminds a week after the last backup, counting calendar days', () => {
    expect(backupReminder({ ...base, lastBackupAt: at('2026-11-14') })).toBeUndefined()
    expect(backupReminder({ ...base, lastBackupAt: at('2026-11-13') })).toBe(7)
  })

  it('stays hidden while snoozed', () => {
    expect(backupReminder({ ...base, snoozedUntil: '2026-11-21' })).toBeUndefined()
    expect(backupReminder({ ...base, snoozedUntil: '2026-11-20' })).toBeNull()
  })
})
