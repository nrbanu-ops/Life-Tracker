import { useState } from 'react'
import { runChecks } from '../db/diagnose'
import { copyText } from '../lib/clipboard'
import { reportText, STATE_MARK, verdict, type Check } from '../lib/diagnose'

const COLOR: Record<Check['state'], string> = {
  ok: 'text-accent',
  fail: 'text-p1',
  skip: 'text-muted',
}

/**
 * Ayarlar → Tanılama: runs the photo and voice-note steps here, on this phone, and says which
 * one fails. A screen like this exists because "nothing happens" is impossible to debug from
 * the other side of a message, and the answer has to be copyable.
 */
export function DiagnosticsSection() {
  const [checks, setChecks] = useState<Check[]>()
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [when, setWhen] = useState('')

  const run = async () => {
    setRunning(true)
    setCopied(false)
    try {
      setChecks(await runChecks())
      setWhen(new Date().toLocaleString('tr-TR'))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section id="tanilama" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Tanılama</h2>
      <p className="mt-1 text-sm text-muted">
        Fotoğraf eklenmiyorsa ya da bir şey kaydedilmiyorsa bu test hangi adımda takıldığını söyler.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-surface disabled:opacity-40"
        >
          {running ? 'Çalışıyor…' : 'Testi çalıştır'}
        </button>
      </div>
      {checks && (
        <>
          <ul className="mt-3 flex flex-col gap-1.5">
            {checks.map((check) => (
              <li key={check.label} className="flex gap-2 text-sm">
                <span className={`${COLOR[check.state]} w-3 shrink-0`} aria-hidden>
                  {STATE_MARK[check.state]}
                </span>
                <span className="min-w-0">
                  {check.label}
                  {check.detail && <span className="text-muted"> — {check.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">{verdict(checks)}</p>
          <button
            type="button"
            onClick={async () => setCopied(await copyText(reportText(checks, when)))}
            className="mt-3 rounded-xl border border-border bg-bg px-4 py-2.5 text-sm"
          >
            {copied ? 'Kopyalandı' : 'Sonucu kopyala'}
          </button>
        </>
      )}
    </section>
  )
}
