import { useState } from 'react'
import { Link } from 'react-router'
import { downloadBackup, snoozeBackupReminder, supportsAndroidBackup, useBackupReminder } from '../db/backup'
import { savesWithShareSheet } from '../lib/android'
import { useTodayKey } from '../lib/useTodayKey'

/** A quiet card on Today when no backup was taken for a week (or ever, a few days in). */
export function BackupReminder() {
  const days = useBackupReminder()
  const today = useTodayKey()
  const [failed, setFailed] = useState(false)
  if (days === undefined) return null

  const download = async () => {
    setFailed(false)
    try {
      if ((await downloadBackup(today)) === 'failed') setFailed(true)
    } catch {
      setFailed(true)
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-4" aria-label="Yedek hatırlatması">
      <p className="flex gap-2 font-medium">
        <span aria-hidden>💾</span>
        {days === null ? 'Henüz yedek almadın' : `Son yedek ${days} gün önce`}
      </p>
      <p className="mt-1 text-sm text-muted">
        Verilerin sadece bu cihazda. Telefon kaybolur ya da uygulama silinirse hepsi gider.{' '}
        <Link to="/ayarlar#yedek" className="text-accent underline">
          Otomatik yedeği aç
        </Link>{' '}
        ya da bir kopya indir.
      </p>
      {failed && <p className="mt-2 text-sm text-p1">Dosya kaydedilemedi, tekrar dene.</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={download} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-surface">
          {supportsAndroidBackup ? "İndirilenler'e kaydet" : savesWithShareSheet ? 'Yedeği kaydet' : 'Yedeği indir'}
        </button>
        <button type="button" onClick={() => void snoozeBackupReminder(today)} className="rounded-xl px-4 py-2 text-sm text-muted">
          Sonra
        </button>
      </div>
    </section>
  )
}
