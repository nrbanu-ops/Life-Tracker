import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { weightInputClass } from '../components/WeightCard'
import { WeightChart } from '../components/WeightChart'
import { BackIcon } from '../components/icons'
import { setWeight, setWeightTarget, useWeights } from '../db/weight'
import { fromDateKey } from '../lib/date'
import { useTodayKey } from '../lib/useTodayKey'
import { formatKg, parseKg, trend, weightProgress } from '../lib/weight'

/** Weigh-ins shown in the chart. */
const CHART_ENTRIES = 90

const day = (key: string, pattern: string) => format(fromDateKey(key), pattern, { locale: tr })

export function WeightPage() {
  const navigate = useNavigate()
  const today = useTodayKey()
  const data = useWeights()
  const [date, setDate] = useState(today)
  const [text, setText] = useState('')
  const [targetText, setTargetText] = useState<string | undefined>()
  if (!data) return null

  const kg = parseKg(text)
  const progress = weightProgress(data.entries, data.targetKg)
  const trendByDate = new Map(trend(data.entries).map((p) => [p.date, p.kg]))
  const chart = data.entries.slice(-CHART_ENTRIES).map((e) => ({
    label: day(e.date, 'd MMM'),
    detail: day(e.date, 'd MMMM EEEE'),
    kg: e.kg,
    trend: trendByDate.get(e.date) ?? e.kg,
  }))
  const editingTarget = targetText !== undefined
  const target = parseKg(targetText ?? '')

  return (
    <>
      <PageHeader
        title="Kilo"
        action={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Geri"
            className="-mr-2.5 -mt-1.5 rounded-full p-2.5 text-muted transition-colors hover:text-text"
          >
            <BackIcon width={22} height={22} />
          </button>
        }
      />

      <form
        className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (kg === undefined) return
          void setWeight(date, kg)
          setText('')
        }}
      >
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value || today)}
          aria-label="Gün"
          className="rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
        />
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={data.entries.at(-1) ? formatKg(data.entries.at(-1)!.kg) : '75,0'}
          aria-label="Kilo"
          className={weightInputClass}
        />
        <span className="text-sm text-muted">kg</span>
        <button
          type="submit"
          disabled={kg === undefined}
          className="ml-auto rounded-full bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          Kaydet
        </button>
      </form>

      <section className="mb-5 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1 text-sm">
            {progress ? (
              <>
                <div>
                  <span className="text-lg font-semibold">{formatKg(progress.current)} kg</span>
                  <span className="text-muted"> · başlangıç {formatKg(progress.start)} kg</span>
                </div>
                <div className="text-muted">
                  {progress.lost > 0
                    ? `${formatKg(progress.lost)} kg verdin`
                    : progress.lost < 0
                      ? `${formatKg(-progress.lost)} kg aldın`
                      : 'Henüz değişim yok'}
                  {progress.left !== undefined &&
                    (progress.left > 0 ? ` · hedefe ${formatKg(progress.left)} kg` : ' · hedefe ulaştın 🎉')}
                </div>
              </>
            ) : (
              <p className="text-muted">İlk kilonu yukarıdan gir; grafik ve ilerleme burada görünür.</p>
            )}
          </div>
        </div>
        {progress?.ratio !== undefined && (
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-bg"
            role="progressbar"
            aria-label="Hedefe ilerleme"
            aria-valuenow={Math.round(progress.ratio * 100)}
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress.ratio * 100}%` }} />
          </div>
        )}

        {editingTarget ? (
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void setWeightTarget(target)
              setTargetText(undefined)
            }}
          >
            <span className="text-sm">Hedef</span>
            <input
              inputMode="decimal"
              autoFocus
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder="70"
              aria-label="Hedef kilo"
              className={weightInputClass}
            />
            <span className="text-sm text-muted">kg</span>
            <button
              type="submit"
              disabled={targetText.trim() !== '' && target === undefined}
              className="ml-auto rounded-full bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
            >
              {targetText.trim() === '' ? 'Hedefi kaldır' : 'Kaydet'}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setTargetText(data.targetKg !== undefined ? formatKg(data.targetKg) : '')}
            className="tap-text mt-1 text-sm text-muted"
          >
            {data.targetKg !== undefined ? `Hedef: ${formatKg(data.targetKg)} kg · değiştir` : '🎯 Hedef kilo belirle'}
          </button>
        )}
      </section>

      {chart.length >= 2 && (
        <section className="mb-5 rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm text-muted">Noktalar tartıların, çizgi 7 günlük ortalama</h2>
          <WeightChart data={chart} targetKg={data.targetKg} />
        </section>
      )}

      {data.entries.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 section-title">Geçmiş</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {[...data.entries].reverse().map((e) => (
              <li key={e.date} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>{day(e.date, 'd MMMM yyyy, EEE')}</span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{formatKg(e.kg)} kg</span>
                  <button
                    type="button"
                    onClick={() => void setWeight(e.date, undefined)}
                    aria-label={`${day(e.date, 'd MMMM')} kaydını sil`}
                    className="tap-reach text-muted hover:text-text"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
