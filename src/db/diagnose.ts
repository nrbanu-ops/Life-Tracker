import { androidBridge } from '../lib/android'
import { pickAudioType } from '../lib/audio'
import type { Check } from '../lib/diagnose'
import { shrinkImage } from '../lib/image'
import { formatBytes } from '../lib/storage'
import { db } from './db'
import { readStorageUse, isPersisted } from './storage'

/** The key the write tests use; removed again whether they pass or fail. */
const TEST_KEY = 'diagnose-test'

/** As big as a photo before shrinking, so the test fails where a real photo would. */
const BLOB_TEST_BYTES = 2 * 1024 * 1024

const reason = (error: unknown) => {
  const it = error as { name?: unknown; message?: unknown } | null
  const name = typeof it?.name === 'string' && it.name !== 'Error' ? it.name : ''
  const message = typeof it?.message === 'string' ? it.message : ''
  return [name, message].filter(Boolean).join(': ') || 'bilinmeyen hata'
}

/** A JPEG made here, so decoding is tested without asking the user for a photo. */
async function sampleJpeg(): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 2d yok')
  context.fillStyle = '#3f6b5c'
  context.fillRect(0, 0, 800, 600)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob boş döndü'))),
      'image/jpeg',
      0.9,
    ),
  )
}

/**
 * Walks the steps a photo or a voice note goes through, in order, and reports each one.
 * Writes are real writes (and are cleaned up): a quota that only bites on big records is
 * exactly the kind of failure this is here to catch.
 */
export async function runChecks(options: { microphone: boolean }): Promise<Check[]> {
  const checks: Check[] = []

  checks.push({
    label: 'Uygulama',
    state: 'ok',
    detail: androidBridge ? `Android kabuğu v${androidBridge.version?.() ?? '?'}` : 'tarayıcı (kabuk yok)',
  })

  const use = await readStorageUse()
  if (!use) {
    checks.push({ label: 'Depolama alanı', state: 'skip', detail: 'bu cihaz söylemiyor' })
  } else {
    const share = use.usage / use.quota
    checks.push({
      label: 'Depolama alanı',
      state: share > 0.95 ? 'fail' : 'ok',
      detail: `${formatBytes(use.usage)} / ${formatBytes(use.quota)} (%${Math.round(share * 100)})`,
    })
  }

  const persisted = await isPersisted()
  checks.push({
    label: 'Kalıcı depolama',
    state: persisted === undefined ? 'skip' : persisted ? 'ok' : 'skip',
    detail: persisted === undefined ? 'bilinmiyor' : persisted ? 'açık' : 'kapalı (veri silinebilir)',
  })

  try {
    await db.meta.put({ key: TEST_KEY, value: 'merhaba' })
    const back = await db.meta.get(TEST_KEY)
    if (back?.value !== 'merhaba') throw new Error('geri okunan değer farklı')
    checks.push({ label: 'Veritabanına yazma', state: 'ok', detail: 'metin yazıldı ve okundu' })
  } catch (error) {
    checks.push({ label: 'Veritabanına yazma', state: 'fail', detail: reason(error) })
  }

  // The one that matters: a record the size of a photo or a voice note.
  try {
    const blob = new Blob([new Uint8Array(BLOB_TEST_BYTES)], { type: 'application/octet-stream' })
    await db.meta.put({ key: TEST_KEY, value: blob })
    const back = await db.meta.get(TEST_KEY)
    const size = (back?.value as Blob | undefined)?.size
    if (size !== BLOB_TEST_BYTES) throw new Error(`geri okunan boyut ${size ?? 'yok'}`)
    checks.push({
      label: 'Fotoğraf boyutunda yazma',
      state: 'ok',
      detail: `${formatBytes(BLOB_TEST_BYTES)} yazıldı ve okundu`,
    })
  } catch (error) {
    checks.push({ label: 'Fotoğraf boyutunda yazma', state: 'fail', detail: reason(error) })
  }
  await db.meta.delete(TEST_KEY).catch(() => {})

  let sample: Blob | undefined
  try {
    sample = await sampleJpeg()
    checks.push({ label: 'Fotoğraf oluşturma', state: 'ok', detail: formatBytes(sample.size) })
  } catch (error) {
    checks.push({ label: 'Fotoğraf oluşturma', state: 'fail', detail: reason(error) })
  }

  if (!sample) {
    checks.push({ label: 'Fotoğraf küçültme', state: 'skip', detail: 'önceki adım başarısız' })
  } else {
    try {
      const small = await shrinkImage(sample, 600)
      checks.push({ label: 'Fotoğraf küçültme', state: 'ok', detail: `${formatBytes(small.size)}'a indi` })
    } catch (error) {
      checks.push({ label: 'Fotoğraf küçültme', state: 'fail', detail: reason(error) })
    }
  }

  const hasRecorder = typeof window !== 'undefined' && 'MediaRecorder' in window
  const type = hasRecorder ? pickAudioType((t) => MediaRecorder.isTypeSupported(t)) : undefined
  checks.push({
    label: 'Ses kaydı desteği',
    state: hasRecorder ? 'ok' : 'fail',
    detail: hasRecorder ? (type ?? 'biçim seçimi tarayıcıya bırakıldı') : 'MediaRecorder yok',
  })

  // What the system thinks before anything is asked: these two separate "no microphone" from
  // "not allowed" from "allowed but unavailable", which all look the same once getUserMedia fails.
  try {
    const devices = await navigator.mediaDevices?.enumerateDevices?.()
    const inputs = devices?.filter((device) => device.kind === 'audioinput') ?? []
    checks.push({
      label: 'Mikrofon aygıtı',
      state: inputs.length > 0 ? 'ok' : 'fail',
      detail: inputs.length > 0 ? `${inputs.length} tane` : 'görünmüyor',
    })
  } catch (error) {
    checks.push({ label: 'Mikrofon aygıtı', state: 'skip', detail: reason(error) })
  }

  try {
    const permission = await navigator.permissions?.query?.({ name: 'microphone' as PermissionName })
    checks.push({
      label: 'Mikrofon izin durumu',
      state: permission?.state === 'denied' ? 'fail' : 'ok',
      detail: permission?.state ?? 'bilinmiyor',
    })
  } catch (error) {
    checks.push({ label: 'Mikrofon izin durumu', state: 'skip', detail: reason(error) })
  }

  const canAsk = typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
  if (!canAsk) {
    checks.push({ label: 'Mikrofon izni', state: 'fail', detail: 'bu cihazda mikrofon erişimi yok' })
  } else if (!options.microphone) {
    checks.push({ label: 'Mikrofon izni', state: 'skip', detail: 'denenmedi' })
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      checks.push({ label: 'Mikrofon izni', state: 'ok', detail: 'verildi' })
      // Starting the recorder is a separate step that can fail on its own; this is where it shows.
      try {
        const type = pickAudioType((t) => MediaRecorder.isTypeSupported(t))
        const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
        recorder.start()
        recorder.stop()
        checks.push({ label: 'Kayıt başlatma', state: 'ok', detail: recorder.mimeType || 'başladı' })
      } catch (error) {
        checks.push({ label: 'Kayıt başlatma', state: 'fail', detail: reason(error) })
      }
      stream.getTracks().forEach((track) => track.stop())
    } catch (error) {
      checks.push({ label: 'Mikrofon izni', state: 'fail', detail: reason(error) })
      checks.push({ label: 'Kayıt başlatma', state: 'skip', detail: 'mikrofon açılamadı' })
    }
  }

  return checks
}
