import { describe, expect, it } from 'vitest'
import { backupReminder, decodeRecord, encodeRecord, parseBackup } from './backup'

describe('backup records', () => {
  it('round-trips a list of photos, as a journal entry holds them', async () => {
    const photos = [new Blob([new Uint8Array([1, 2])], { type: 'image/jpeg' }), new Blob([new Uint8Array([3, 250])], { type: 'image/png' })]
    const encoded = await encodeRecord({ id: 'a', text: 'gün', photos })
    expect(JSON.parse(JSON.stringify(encoded))).toEqual(encoded)
    const back = decodeRecord(JSON.parse(JSON.stringify(encoded))) as { photos: Blob[] }
    expect(back.photos).toHaveLength(2)
    for (const [i, blob] of back.photos.entries()) {
      expect(blob.type).toBe(photos[i].type)
      expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array(await photos[i].arrayBuffer()))
    }
  })

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
  const base = { today: '2026-11-20', firstUse: '2026-11-01' }
  const at = (day: string) => new Date(`${day}T21:30:00`).toISOString()

  it('stays quiet in an empty app', () => {
    expect(backupReminder({ ...base, firstUse: undefined })).toBeUndefined()
  })

  it('still reminds when an automatic backup has not written for a week', () => {
    // A working automatic backup rewrites the file every few minutes, so a stale date means it
    // is failing; staying quiet because it is "on" would leave the user with nothing.
    expect(backupReminder({ ...base, lastBackupAt: at('2026-11-19') })).toBeUndefined()
    expect(backupReminder({ ...base, lastBackupAt: at('2026-11-12') })).toBe(8)
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
