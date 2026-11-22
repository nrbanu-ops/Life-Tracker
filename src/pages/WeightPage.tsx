import { addDays, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { weightInputClass } from '../components/WeightCard'
import { WeightChart, type WeightPoint } from '../components/WeightChart'
import { WeightPhotos } from '../components/WeightPhotos'
import { db } from '../db/db'
import type { WeightEntry } from '../db/types'
import { setWeight, setWeightTarget, useWeightPhotos, useWeights } from '../db/weight'
import { fromDateKey, toDateKey } from '../lib/date'
import { supportsWeighReminder } from '../lib/reminders'
import { isCompleted } from '../lib/today'
import { useTodayKey } from '../lib/useTodayKey'
import { ETA_WEEKS, formatKg, parseKg, trend, trendChange, weightEta, weightMonths, weightProgress, type WeightEta } from '../lib/weight'

type Tab = 'ozet' | 'grafik' | 'gecmis' | 'foto'
const TABS: { value: Tab; label: string }[] = [
  { value: 'ozet', label: 'Özet' },
  { value: 'grafik', label: 'Grafik' },
  { value: 'gecmis', label: 'Geçmiş' },
  { value: 'foto', label: 'Fotoğraf' },
]

type Range = '30' | '90' | '365' | 'all'
const RANGES: { value: Range; label: string }[] = [
  { value: '30', label: '1 ay' },
  { value: '90', label: '3 ay' },
  { value: '365', label: '1 yıl' },
  { value: 'all', label: 'Tümü' },
]

const day = (key: string, pattern: string) => format(fromDateKey(key), pattern, { locale: tr })
const card = 'mb-5 rounded-2xl border border-border bg-surface p-4'
const submitClass = 'ml-auto rounded-full bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50'

/** "−0,4 kg" / "+0,4 kg" / "0 kg"; a real minus sign so it lines up with the plus. */
const signed = (kg: number) => (Math.abs(kg) < 0.05 ? '0 kg' : `${kg < 0 ? '−' : '+'}${formatKg(Math.abs(kg))} kg`)

const daysBefore = (today: string, days: number) => toDateKey(addDays(fromDateKey(today), -days))

function chartPoints(entries: WeightEntry[], since?: string): WeightPoint[] {
  const trendByDate = new Map(trend(entries).map((p) => [p.date, p.kg]))
  return entries
    .filter((e) => !since || e.date >= since)
    .map((e) => ({
      t: fromDateKey(e.date).getTime(),
      detail: day(e.date, 'd MMMM yyyy EEEE'),
      kg: e.kg,
      trend: trendByDate.get(e.date) ?? e.kg,
    }))
}

export function WeightPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.value === params.get('sekme'))?.value ?? 'ozet'
  const data = useWeights()
  const photos = useWeightPhotos()
  if (!data || !photos) return null
  const open = (value: Tab) => setParams(value === 'ozet' ? {} : { sekme: value }, { replace: true })

  return (
    <>
      <PageHeader title="Kilo" />
      <div className="mb-4">
        <Segmented options={TABS} value={tab} onChange={open} />
      </div>
      {tab === 'ozet' && <Overview entries={data.entries} targetKg={data.targetKg} onChart={() => open('grafik')} />}
      {tab === 'grafik' && <ChartTab entries={data.entries} targetKg={data.targetKg} />}
      {tab === 'gecmis' && <HistoryTab entries={data.entries} photoDays={new Set(photos.map((p) => p.date))} />}
      {tab === 'foto' && <WeightPhotos photos={photos} entries={data.entries} />}
    </>
  )
}

type DataProps = { entries: WeightEntry[]; targetKg?: number }

/** The home of the page: weigh in, where you stand, the last month at a glance. */
function Overview({ entries, targetKg, onChart }: DataProps & { onChart: () => void }) {
  const today = useTodayKey()
  const progress = weightProgress(entries, targetKg)
  const average = trend(entries).at(-1)?.kg
  const week = trendChange(entries, 7)
  const month = trendChange(entries, 30)
  const recent = chartPoints(entries, daysBefore(today, 30))
  const eta = weightEta(entries, targetKg, today)

  return (
    <>
      <WeighIn entries={entries} />

      <section className={card}>
        {progress ? (
          <>
            <div className="text-sm">
              <span className="text-2xl font-semibold">{formatKg(progress.current)}</span>
              <span className="text-muted"> kg · başlangıç {formatKg(progress.start)} kg</span>
            </div>
            <div className="mt-0.5 text-sm text-muted">
              {progress.lost > 0
                ? `${formatKg(progress.lost)} kg verdin`
                : progress.lost < 0
                  ? `${formatKg(-progress.lost)} kg aldın`
                  : 'Henüz değişim yok'}
              {progress.left !== undefined &&
                (progress.left > 0 ? ` · hedefe ${formatKg(progress.left)} kg` : ' · hedefe ulaştın 🎉')}
            </div>
            {progress.ratio !== undefined && (
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-bg"
                role="progressbar"
                aria-label="Hedefe ilerleme"
                aria-valuenow={Math.round(progress.ratio * 100)}
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${progress.ratio * 100}%` }} />
              </div>
            )}
            {eta && <p className="mt-2 text-sm">{etaText(eta)}</p>}
          </>
        ) : (
          <p className="text-sm text-muted">İlk kilonu yukarıdan gir; ilerleme ve grafik burada görünür.</p>
        )}
        <TargetEditor targetKg={targetKg} />
        {supportsWeighReminder && (
          <Link to="/ayarlar#tarti-hatirlatici" className="tap-text block text-sm text-muted">
            ⏰ Tartı hatırlatması
          </Link>
        )}
      </section>

      {progress && (
        <div className="mb-5 grid grid-cols-3 gap-2">
          <Stat label="7 gün ort." value={average !== undefined ? `${formatKg(average)} kg` : '–'} />
          <Stat label="Son 1 hafta" value={week !== undefined ? signed(week) : '–'} />
          <Stat label="Son 1 ay" value={month !== undefined ? signed(month) : '–'} />
        </div>
      )}

      {recent.length >= 2 && (
        <section className={card}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-sm text-muted">Son 30 gün</h2>
            <button type="button" onClick={onChart} className="tap-reach text-sm text-muted">
              Grafik ›
            </button>
          </div>
          <WeightChart data={recent} targetKg={targetKg} />
        </section>
      )}
    </>
  )
}

/** The arrival estimate in words; the pace is always the last ETA_WEEKS weeks of the 7-day average. */
function etaText(eta: WeightEta): string {
  if (eta.kind === 'date') {
    return `📅 Bu hızla hedefe ${day(eta.date, 'd MMMM yyyy')} civarı (haftada ${formatKg(eta.perWeek)} kg)`
  }
  return eta.perWeek > 0
    ? `🐢 Son ${ETA_WEEKS} haftada haftada ${formatKg(eta.perWeek)} kg — bu hızla hedef 2 yıldan uzak`
    : `⏸️ Son ${ETA_WEEKS} haftada düşüş yok; tahmin için gidişatın aşağı dönmesi gerekiyor`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  )
}

function WeighIn({ entries }: { entries: WeightEntry[] }) {
  const today = useTodayKey()
  const [date, setDate] = useState(today)
  const [text, setText] = useState('')
  const kg = parseKg(text)
  const existing = entries.find((e) => e.date === date)
  return (
    <form
      className={card}
      onSubmit={(e) => {
        e.preventDefault()
        if (kg === undefined) return
        void setWeight(date, kg)
        setText('')
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
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
          placeholder={entries.at(-1) ? formatKg(entries.at(-1)!.kg) : '75,0'}
          aria-label="Kilo"
          className={weightInputClass}
        />
        <span className="text-sm text-muted">kg</span>
        <button type="submit" disabled={kg === undefined} className={submitClass}>
          Kaydet
        </button>
      </div>
      {existing && (
        <p className="mt-2 text-xs text-muted">Bu gün için {formatKg(existing.kg)} kg kayıtlı; kaydedersen yenisi yazılır.</p>
      )}
    </form>
  )
}

function TargetEditor({ targetKg }: { targetKg?: number }) {
  const [text, setText] = useState<string>()
  if (text === undefined) {
    return (
      <button
        type="button"
        onClick={() => setText(targetKg !== undefined ? formatKg(targetKg) : '')}
        className="tap-text mt-1 text-sm text-muted"
      >
        {targetKg !== undefined ? `🎯 Hedef: ${formatKg(targetKg)} kg · değiştir` : '🎯 Hedef kilo belirle'}
      </button>
    )
  }
  const target = parseKg(text)
  const clearing = text.trim() === ''
  return (
    <form
      className="mt-3 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void setWeightTarget(target)
        setText(undefined)
      }}
    >
      <span className="text-sm">Hedef</span>
      <input
        inputMode="decimal"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="70"
        aria-label="Hedef kilo"
        className={weightInputClass}
      />
      <span className="text-sm text-muted">kg</span>
      <button type="submit" disabled={!clearing && target === undefined} className={submitClass}>
        {clearing ? 'Hedefi kaldır' : 'Kaydet'}
      </button>
    </form>
  )
}

function ChartTab({ entries, targetKg }: DataProps) {
  const today = useTodayKey()
  const [range, setRange] = useState<Range>('90')
  const [habitId, setHabitId] = useState('')
  const since = range === 'all' ? undefined : daysBefore(today, Number(range))
  const points = chartPoints(entries, since)
  const values = points.map((p) => p.kg)
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.archived && h.kind !== 'quit').toArray(), [], [])
  const doneDays = useLiveQuery(
    async () =>
      habitId
        ? (await db.habitLogs.where('habitId').equals(habitId).toArray()).filter((l) => isCompleted(l.status)).map((l) => l.date)
        : [],
    [habitId],
    [],
  )
  // The chart spans first to last weigh-in in the range, so that is the stretch counted too.
  const from = entries.find((e) => !since || e.date >= since)?.date
  const to = entries.at(-1)?.date
  const shownDays = from && to ? doneDays.filter((d) => d >= from && d <= to) : []

  return (
    <>
      <div className="mb-4">
        <Segmented options={RANGES} value={range} onChange={setRange} />
      </div>
      {points.length >= 2 ? (
        <>
          <section className={card}>
            <WeightChart data={points} targetKg={targetKg} height={260} shaded={shownDays} />
            <p className="mt-2 text-xs text-muted">
              Noktalar tartıların, çizgi 7 günlük ortalama{targetKg !== undefined && ', kesikli çizgi hedefin'}
              {habitId && ', gölgeli günler seçtiğin habit'}.
            </p>
            {habits.length > 0 && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <span className="shrink-0 text-muted">Habit göster</span>
                <select
                  value={habitId}
                  onChange={(e) => setHabitId(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
                >
                  <option value="">Yok</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {habitId && <p className="mt-1 text-xs text-muted">Bu aralıkta {shownDays.length} gün yapıldı.</p>}
          </section>
          <div className="mb-5 grid grid-cols-3 gap-2">
            <Stat label="En düşük" value={`${formatKg(Math.min(...values))} kg`} />
            <Stat label="En yüksek" value={`${formatKg(Math.max(...values))} kg`} />
            <Stat label="Değişim" value={signed(points.at(-1)!.trend - points[0].trend)} />
          </div>
        </>
      ) : (
        <p className={`${card} text-sm text-muted`}>Bu aralıkta grafik için en az iki tartı gerekiyor.</p>
      )}
    </>
  )
}

function HistoryTab({ entries, photoDays }: { entries: WeightEntry[]; photoDays: Set<string> }) {
  if (entries.length === 0) return <p className={`${card} text-sm text-muted`}>Henüz kayıt yok.</p>
  // Each row is compared with the weigh-in before it, which may sit in the previous month.
  const previous = new Map(entries.slice(1).map((e, i) => [e.date, entries[i].kg]))
  return (
    <div className="mb-6 flex flex-col gap-5">
      {weightMonths(entries).map((m) => (
        <section key={m.month}>
          <h2 className="mb-2 section-title">
            {day(`${m.month}-01`, 'MMMM yyyy')}
            <span className="text-muted"> · ort. {formatKg(m.average)} kg</span>
          </h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {m.entries.map((e) => {
              const before = previous.get(e.date)
              return (
                <li key={e.date} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>
                    {day(e.date, 'd MMMM, EEE')}
                    {photoDays.has(e.date) && <span aria-label="fotoğraf var"> 📷</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    {before !== undefined && <span className="text-xs text-muted tabular-nums">{signed(e.kg - before)}</span>}
                    <span className="font-medium tabular-nums">{formatKg(e.kg)} kg</span>
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
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
