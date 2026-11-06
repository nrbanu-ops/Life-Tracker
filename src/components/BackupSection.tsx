import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import {
  ANDROID_BACKUP_NAME,
  androidBackupOn,
  backupNow,
  chooseBackupFile,
  downloadBackup,
  restoreBackup,
  setAndroidBackup,
  stopAutoBackup,
  supportsAndroidBackup,
  supportsFileBackup,
} from '../db/backup'
import { db } from '../db/db'
import { savesWithShareSheet } from '../lib/android'
import { parseBackup, type Backup } from '../lib/backup'
import { useTodayKey } from '../lib/useTodayKey'

type Message = { kind: 'ok' | 'error'; text: string }

/** Settings: automatic backup to a file, manual download, and restore. */
export function BackupSection() {
  const today = useTodayKey()
  const handle = useLiveQuery(async () => (await db.meta.get('backupHandle'))?.value as FileSystemFileHandle | undefined)
  const lastBackupAt = useLiveQuery(async () => (await db.meta.get('lastBackupAt'))?.value as string | undefined)
  const androidOn = useLiveQuery(androidBackupOn)
  const [message, setMessage] = useState<Message>()
  const [pending, setPending] = useState<Backup>()
  const fileInput = useRef<HTMLInputElement>(null)

  const run = async (task: () => Promise<Message | void>) => {
    setMessage(undefined)
    try {
      const result = await task()
      if (result) setMessage(result)
    } catch (e) {
      // Closing the file picker is not an error.
      if ((e as Error).name !== 'AbortError') setMessage({ kind: 'error', text: 'Bir sorun oldu, tekrar dene.' })
    }
  }

  const download = () =>
    run(async () => {
      const result = await downloadBackup(today)
      // Closing the share sheet is a decision, not a failure: say nothing.
      if (result === 'cancelled') return
      if (result === 'failed') return { kind: 'error', text: 'Dosya kaydedilemedi.' }
      if (supportsAndroidBackup) return { kind: 'ok', text: 'İndirilenler/LifeTracker klasörüne kaydedildi ✓' }
      if (savesWithShareSheet) return { kind: 'ok', text: 'Yedek kaydedildi ✓' }
    })

  const button = 'rounded-xl bg-bg px-4 py-2.5 text-sm'

  return (
    <section id="yedek" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Yedekleme</h2>
      <p className="mt-1 text-sm text-muted">
        Verilerin sadece bu cihazda duruyor.{' '}
        {lastBackupAt
          ? `Son yedek: ${formatDistanceToNow(new Date(lastBackupAt), { locale: tr, addSuffix: true })}.`
          : 'Henüz yedek alınmadı.'}
      </p>

      {supportsAndroidBackup && (
        <div className="mt-4 rounded-xl bg-bg p-3">
          {androidOn ? (
            <>
              <p className="text-sm">
                ✅ Otomatik yedek açık: <b>İndirilenler/LifeTracker/{ANDROID_BACKUP_NAME}</b>
              </p>
              <p className="mt-1 text-xs text-muted">
                Bir şey değiştikçe birkaç dakikada bir kendiliğinden güncellenir. Uygulamayı silmeden önce
                bu dosyanın bir kopyasını sakla.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    run(async () => {
                      await backupNow(true)
                      return { kind: 'ok', text: 'Yedeklendi ✓' }
                    })
                  }
                  className="rounded-xl bg-surface px-4 py-2 text-sm"
                >
                  Şimdi yedekle
                </button>
                <button
                  type="button"
                  onClick={() => run(() => setAndroidBackup(false))}
                  className="px-2 py-2 text-sm text-muted"
                >
                  Kapat
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm">
                Verilerin değiştikçe telefonun İndirilenler klasörüne kendiliğinden yedeklensin.
              </p>
              <button
                type="button"
                onClick={() => run(() => setAndroidBackup(true))}
                className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-surface"
              >
                Otomatik yedeği aç
              </button>
            </>
          )}
        </div>
      )}

      {supportsFileBackup && (
        <div className="mt-4 rounded-xl bg-bg p-3">
          {handle ? (
            <>
              <p className="text-sm">
                ✅ Otomatik yedek açık: <b>{handle.name}</b>
              </p>
              <p className="mt-1 text-xs text-muted">
                Bir şey değiştikçe birkaç dakikada bir kendiliğinden güncellenir.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    run(async () => {
                      const result = await backupNow(true)
                      if (result === 'needs-permission') {
                        return { kind: 'error', text: 'Üstteki "Devam ettir" ile izin ver.' }
                      }
                      return { kind: 'ok', text: 'Yedeklendi ✓' }
                    })
                  }
                  className="rounded-xl bg-surface px-4 py-2 text-sm"
                >
                  Şimdi yedekle
                </button>
                <button type="button" onClick={() => run(stopAutoBackup)} className="px-2 py-2 text-sm text-muted">
                  Kapat
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm">
                Bir yedek dosyası seç; uygulama verilerin değiştikçe onu kendiliğinden günceller.
              </p>
              <p className="mt-1 text-xs text-muted">
                İpucu: Dosyayı OneDrive ya da Google Drive klasörüne kaydedersen yedeğin buluta da gider.
              </p>
              <button
                type="button"
                onClick={() => run(() => chooseBackupFile('life-tracker-yedek.json'))}
                className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-surface"
              >
                Otomatik yedeği aç
              </button>
            </>
          )}
        </div>
      )}

      {!supportsAndroidBackup && !supportsFileBackup && (
        <div className="mt-4 rounded-xl bg-bg p-3">
          <p className="text-sm">Bu cihazda otomatik yedek yok.</p>
          <p className="mt-1 text-xs text-muted">
            {savesWithShareSheet
              ? `iPhone ve iPad'de tarayıcı, uygulamanın bir dosyayı kendiliğinden güncellemesine izin
                 vermiyor. Aşağıdaki "Yedeği kaydet" ile ara ara kendin al: açılan paylaşım sayfasından
                 "Dosyalara Kaydet" ya da iCloud Drive'ı seçebilirsin. Uygulamayı ana ekrandan silersen
                 verilerin de silinir, önce yedek al.`
              : `Bu tarayıcı otomatik yedeklemeyi desteklemiyor. Aşağıdaki "Yedeği indir" ile ara ara
                 kendin al, ya da Chrome'dan aç.`}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={download} className={button}>
          {savesWithShareSheet ? '💾 Yedeği kaydet' : '⬇️ Yedeği indir'}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={button}>
          ⬆️ Yedekten geri yükle
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            const parsed = parseBackup(await file.text())
            if (!parsed.ok) return setMessage({ kind: 'error', text: parsed.error })
            setMessage(undefined)
            setPending(parsed.backup)
          }}
        />
      </div>

      {pending && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-bg p-3">
          <p className="text-sm">
            Bu yedek{' '}
            {pending.exportedAt &&
              `(${formatDistanceToNow(new Date(pending.exportedAt), { locale: tr, addSuffix: true })} alınmış) `}
            şu anki <b>bütün verilerinin yerine</b> geçecek. Emin misin?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                run(async () => {
                  const count = await restoreBackup(pending)
                  setPending(undefined)
                  return { kind: 'ok', text: `Geri yüklendi ✓ (${count} kayıt)` }
                })
              }
              className="flex-1 rounded-xl bg-surface py-2.5 text-sm font-medium text-p1"
            >
              Evet, geri yükle
            </button>
            <button type="button" onClick={() => setPending(undefined)} className="flex-1 py-2.5 text-sm text-muted">
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`mt-2 text-sm ${message.kind === 'error' ? 'text-p1' : 'text-accent'}`}>{message.text}</p>
      )}
    </section>
  )
}
