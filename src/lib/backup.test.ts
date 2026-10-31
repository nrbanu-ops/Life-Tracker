import { describe, expect, it } from 'vitest'
import { decodeRecord, encodeRecord, parseBackup } from './backup'

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
