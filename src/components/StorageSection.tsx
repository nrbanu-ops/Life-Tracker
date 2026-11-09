import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  askPersist,
  isPersisted,
  photoReport,
  readStorageUse,
  type PhotoReport,
  type StorageUse,
} from '../db/storage'
import { fromDateKey } from '../lib/date'
import { formatBytes } from '../lib/storage'
import { ProgressBar } from './ProgressBar'

/** Above this the device is close enough to full that new photos can start failing to save. */
const TIGHT = 0.8

/**
 * Settings: how much room the app takes and how much is left, whether the browser promised to
 * keep it, and — on request — which days' photos are the heaviest.
 */
export function StorageSection() {
  // undefined while reading, null when the browser won't say.
  const [use, setUse] = useState<StorageUse | null>()
  const [persisted, setPersisted] = useState<boolean>()
  const [asking, setAsking] = useState(false)
  const [report, setReport] = useState<PhotoReport | 'counting'>()

  useEffect(() => {
    let cancelled = false
    readStorageUse().then((value) => !cancelled && setUse(value ?? null))
    isPersisted().then((value) => !cancelled && setPersisted(value))
    return () => {
      cancelled = true
    }
  }, [])

  const ratio = use ? Math.min(1, use.usage / use.quota) : 0
  const tight = use ? ratio >= TIGHT : false

  return (
    <section id="depolama" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Depolama</h2>

      {use === undefined ? (
        <p className="mt-1 text-sm text-muted">Bakılıyor…</p>
      ) : use === null ? (
        <p className="mt-1 text-sm text-muted">Bu tarayıcı ne kadar yer kullandığını söylemiyor.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            <b className="text-text">{formatBytes(use.usage)}</b> kullanılıyor · bu cihazda ayrılan{' '}
            {formatBytes(use.quota)} yerin %{Math.max(1, Math.round(ratio * 100))}'i
          </p>
          <div className="mt-2">
            <ProgressBar ratio={ratio} color={tight ? 'var(--color-p1)' : undefined} />
          </div>
          {tight && (
            <p className="mt-2 text-sm text-p1">
              Yer azalıyor. Dolunca yeni fotoğraflar ve işaretlemeler kaydedilemez. Aşağıdan en ağır
              günlere bakıp birkaç fotoğraf silebilirsin.
            </p>
          )}
        </>
      )}

      {persisted === true && (
        <p className="mt-2 text-xs text-muted">
          Kalıcı depolama açık: tarayıcı yer açmak için verini silmez ✓
        </p>
      )}
      {persisted === false && (
        <div className="mt-3 rounded-xl bg-bg p-3">
          <p className="text-sm">
            Kalıcı depolama kapalı. Telefon doldukça tarayıcı bu verileri silebilir; yedeğin yoksa
            geri gelmez.
          </p>
          <button
            type="button"
            disabled={asking}
            onClick={async () => {
              setAsking(true)
              setPersisted(await askPersist())
              setAsking(false)
            }}
            className="mt-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-60"
          >
            {asking ? 'İsteniyor…' : 'Kalıcı yap'}
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={report === 'counting'}
        onClick={async () => {
          setReport('counting')
          setReport(await photoReport())
        }}
        className="mt-3 rounded-xl border border-border bg-bg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {report === 'counting' ? 'Sayılıyor…' : report ? 'Yeniden say' : 'Fotoğrafları say'}
      </button>
      {report !== undefined && report !== 'counting' && <Report report={report} />}
    </section>
  )
}

function Report({ report }: { report: PhotoReport }) {
  return (
    <div className="mt-3 flex flex-col gap-1 text-sm">
      <p className="text-muted">
        Günlük: <b className="text-text">{report.photos}</b> fotoğraf ·{' '}
        <b className="text-text">{formatBytes(report.bytes)}</b>
      </p>
      {report.audios > 0 && (
        <p className="text-muted">
          Ses notları: <b className="text-text">{report.audios}</b> ·{' '}
          <b className="text-text">{formatBytes(report.audioBytes)}</b>
        </p>
      )}
      <p className="text-muted">
        Kütüphane afişleri: <b className="text-text">{report.posters}</b> ·{' '}
        <b className="text-text">{formatBytes(report.posterBytes)}</b>
      </p>
      {report.days.length > 0 && (
        <>
          <p className="mt-2 text-muted">En ağır günler:</p>
          <ul className="flex flex-col">
            {report.days.map((day) => (
              <li key={day.date}>
                <Link
                  to={`/takvim?gun=${day.date}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-bg"
                >
                  <span className="truncate">
                    {format(fromDateKey(day.date), 'd MMMM yyyy', { locale: tr })}
                  </span>
                  <span className="shrink-0 text-muted">
                    {day.photos} foto · {formatBytes(day.bytes)} ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
