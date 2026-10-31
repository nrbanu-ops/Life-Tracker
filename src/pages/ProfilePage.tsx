import { addDays, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BackIcon } from '../components/icons'
import { RankBadge } from '../components/LevelCard'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { db } from '../db/db'
import { useLeveling } from '../db/leveling'
import { fromDateKey, toDateKey, weekRange } from '../lib/date'
import {
  effortOf,
  emergencyText,
  masteryFactor,
  nextRank,
  rankStart,
  SOURCE_LABEL,
  STAT_LABEL,
  STAT_SHORT,
  statOf,
  STATS,
  statValue,
  TIER_LABEL,
  XP,
  xpPerDone,
  type Rank,
  type XpSource,
} from '../lib/leveling'
import { setWornTitle, useLevelingOn, useWornTitle } from '../lib/levelingSetting'
import { useTodayKey } from '../lib/useTodayKey'

const RANK_TITLE: Record<Rank, string> = {
  E: 'Acemi Avcı',
  D: 'Çırak Avcı',
  C: 'Usta Avcı',
  B: 'Elit Avcı',
  A: 'Ulusal Seviye Avcı',
  S: 'Gölge Hükümdarı',
}

export function ProfilePage() {
  const navigate = useNavigate()
  const today = useTodayKey()
  const on = useLevelingOn()
  const state = useLeveling()
  const worn = useWornTitle()
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), [], [])
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [], [])

  const back = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Geri"
      className="-mr-2 rounded-full p-2 text-muted transition-colors hover:text-text"
    >
      <BackIcon width={22} height={22} />
    </button>
  )
  if (!state) return <PageHeader title="Profil" action={back} />

  const { level, into, needed, rank, summary, emergency } = state
  const wornTitle = state.titles.find((t) => t.id === worn && t.earned)
  const upcoming = nextRank(rank)
  const stats = STATS.map((key) => ({ key, label: STAT_SHORT[key], name: STAT_LABEL[key], value: statValue(summary.stats[key]) }))
  const weakest = [...stats].sort((a, b) => a.value - b.value)[0]
  const days = Array.from({ length: 30 }, (_, i) => {
    const key = toDateKey(addDays(fromDateKey(today), i - 29))
    return { key, label: format(fromDateKey(key), 'd', { locale: tr }), xp: Math.round(summary.days[key] ?? 0) }
  })
  const last30 = days.reduce((sum, d) => sum + d.xp, 0)
  const sources = (Object.entries(summary.sources) as [XpSource, number][])
    .filter(([, xp]) => xp >= 1)
    .sort((a, b) => b[1] - a[1])
  const topSource = sources[0]?.[1] ?? 1
  const week = weekRange(today).start
  const active = habits.filter((h) => !h.archived && h.kind !== 'quit')

  return (
    <>
      <PageHeader title="Profil" action={back} />

      {!on && (
        <p className="mb-4 rounded-xl bg-surface p-3 text-sm text-muted">
          Seviye sistemi kapalı; XP yine hesaplanıyor.{' '}
          <Link to="/ayarlar#seviye" className="text-accent underline">
            Ayarlar'dan aç
          </Link>
        </p>
      )}

      <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-4">
          <RankBadge rank={rank} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-accent">[SİSTEM] Durum</p>
            <p className="text-2xl font-semibold">Lv {level}</p>
            <p className="text-sm text-muted">
              {rank}-Rank · {wornTitle?.name ?? RANK_TITLE[rank]}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar ratio={into / needed} />
          <div className="mt-1.5 flex justify-between text-xs text-muted tabular-nums">
            <span>
              {Math.floor(into)} / {needed} XP
            </span>
            <span>{upcoming ? `${upcoming}-Rank: Lv ${rankStart(upcoming)}` : 'En yüksek rank'}</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted tabular-nums">Toplam {Math.round(summary.xp).toLocaleString('tr')} XP</p>
      </section>

      <section className="mb-4 rounded-2xl border border-p2/40 bg-surface p-4">
        <p className="font-mono text-xs text-p2">[ACİL GÖREV] Bu hafta</p>
        <p className="mt-1 font-medium">{emergencyText(emergency)}</p>
        <div className="mt-3">
          <ProgressBar ratio={emergency.done / emergency.target} color="var(--color-p2)" />
          <div className="mt-1.5 flex justify-between text-xs text-muted tabular-nums">
            <span>
              {emergency.done} / {emergency.target}
            </span>
            <span>{emergency.met ? `Tamamlandı · +${XP.emergency} XP` : `Ödül: ${XP.emergency} XP`}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          {emergency.kind === 'habit'
            ? 'Son 4 haftada en çok aksattığın habit. Her pazartesi yenisi gelir; bitiremezsen bir şey kaybetmezsin.'
            : 'Aksattığın bir habit yok; bu hafta yazmaya vakit ayır. Her pazartesi yenisi gelir.'}
        </p>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-medium">Unvanlar</h2>
        <p className="mb-3 text-sm text-muted">
          {state.titles.filter((t) => t.earned).length} / {state.titles.length} kazanıldı. Birine dokun, seviyenin yanında
          görünsün.
        </p>
        <ul className="flex flex-col gap-1.5">
          {state.titles.map((t) => {
            const wearing = wornTitle?.id === t.id
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={!t.earned}
                  onClick={() => setWornTitle(wearing ? undefined : t.id)}
                  aria-pressed={wearing}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left ${
                    wearing ? 'border-accent bg-accent-soft' : 'border-border'
                  } ${t.earned ? '' : 'opacity-50'}`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{t.earned ? t.name : `🔒 ${t.name}`}</span>
                    <span className="block text-xs text-muted">{t.how}</span>
                  </span>
                  {wearing && <span className="shrink-0 text-xs font-medium text-accent">Takılı</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-1 font-medium">Statlar</h2>
        <p className="text-sm text-muted">Her habit kendi statını büyütür, biraz da Disiplin'i.</p>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={stats} outerRadius="72%">
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis dataKey="label" tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
            <Tooltip
              content={({ active: shown, payload }) => {
                const point = shown ? (payload?.[0]?.payload as (typeof stats)[number] | undefined) : undefined
                if (!point) return null
                return (
                  <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm">
                    <span className="font-medium">{point.name}</span> {point.value}
                  </div>
                )
              }}
            />
            <Radar
              dataKey="value"
              stroke="var(--color-accent)"
              strokeWidth={2}
              fill="var(--color-accent)"
              fillOpacity={0.25}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
        <ul className="grid grid-cols-5 gap-1 text-center">
          {stats.map((s) => (
            <li key={s.key}>
              <span className="block text-lg font-semibold tabular-nums">{s.value}</span>
              <span className="block text-[11px] text-muted">{s.name}</span>
            </li>
          ))}
        </ul>
        {summary.xp > 0 && (
          <p className="mt-3 text-xs text-muted">
            En zayıf statın: <b>{weakest.name}</b>
          </p>
        )}
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-medium">Son 30 gün</h2>
          <span className="text-sm text-muted tabular-nums">{last30.toLocaleString('tr')} XP</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={4}
              tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'var(--color-bg)' }}
              content={({ active: shown, payload }) => {
                const point = shown ? (payload?.[0]?.payload as (typeof days)[number] | undefined) : undefined
                if (!point) return null
                return (
                  <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm">
                    <div className="font-medium">{format(fromDateKey(point.key), 'd MMMM EEEE', { locale: tr })}</div>
                    <div className="text-muted">{point.xp} XP</div>
                  </div>
                )
              }}
            />
            <Bar dataKey="xp" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {sources.length > 0 && (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-medium">XP nereden geldi</h2>
          <ul className="flex flex-col gap-2.5">
            {sources.map(([source, xp]) => (
              <li key={source}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{SOURCE_LABEL[source]}</span>
                  <span className="text-muted tabular-nums">{Math.round(xp).toLocaleString('tr')}</span>
                </div>
                <ProgressBar ratio={xp / topSource} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-1 font-medium">Habit zorlukları</h2>
          <p className="mb-3 text-sm text-muted">
            Zorluk, bir kez yapmanın ne kadar emek istediğine göre belirlenir; ne sıklıkta yaptığına göre değil.
            Habit'i düzenleyerek değiştirebilirsin.
          </p>
          <ul className="divide-y divide-border">
            {active.map((habit) => {
              const effort = effortOf(habit)
              const mastered = masteryFactor(habit, logs, week) < 1
              return (
                <li key={habit.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{habit.title}</span>
                    <span className="block text-xs text-muted">
                      {TIER_LABEL[effort.tier]} · {effort.reason} · {STAT_LABEL[statOf(habit)]}
                      {mastered && ' · Ustalaştın'}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">{Math.round(xpPerDone(habit, logs, today))} XP</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <details className="mb-4 rounded-2xl border border-border bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-medium">XP nasıl hesaplanıyor?</summary>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-muted">
          <li>Zorluk: Hafif 5 · Orta 12 · Ağır 25 · Zorlu 40 XP. Minimum versiyon yarısı.</li>
          <li>Seri bonusu: 7 günde +%10, 30 günde +%25, 100 günde +%50. Seri bozulsa da kazandığın XP gitmez.</li>
          <li>3 planlı günü kaçırdıktan sonra ilk yapışın +%50 (geri dönüş bonusu, haftada bir).</li>
          <li>Süreli ve sayılı habit'lerde hedefi aşmak en fazla +%75 getirir.</li>
          <li>Haftalık hedefe ulaşınca bonus; hedefin üstü yarım XP.</li>
          <li>Bir günün habit XP'sinin 150'yi aşan kısmı yarım sayılır.</li>
          <li>Geçmişi işaretlemek: dün tam, son 7 gün %75, daha eskisi %25.</li>
          <li>90 gün boyunca %95'in üstünde yaptığın habit ustalaşmış sayılır, biraz daha az XP verir.</li>
          <li>Biten haftalar kaydedilir; habit silsen de o XP kalır.</li>
        </ul>
      </details>
    </>
  )
}
