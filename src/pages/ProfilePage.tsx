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
import { SystemBar, SystemWindow } from '../components/SystemWindow'
import { levelText, RANK_COLOR, RANK_TITLE } from '../lib/levelingUi'
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
  STAT_ABOUT,
  STAT_GROUPS,
  STAT_LABEL,
  STAT_SHORT,
  statOf,
  statRank,
  STATS,
  statValue,
  TIER_LABEL,
  XP,
  xpPerDone,
  type XpSource,
} from '../lib/leveling'
import { setWornTitle, useLevelingOn, useWornTitle } from '../lib/levelingSetting'
import { useTodayKey } from '../lib/useTodayKey'

const SYS = 'var(--color-sys-edge)'
const tick = { fill: 'var(--color-sys-muted)', fontSize: 11 }
const tooltipClass = 'border border-sys-edge bg-sys-panel px-2.5 py-1.5 text-xs text-sys-text'

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
      className="-mr-2.5 -mt-1.5 rounded-full p-2.5 text-muted transition-colors hover:text-text"
    >
      <BackIcon width={22} height={22} />
    </button>
  )
  if (!state) return <PageHeader title="Profil" action={back} />

  const { level, into, needed, rank, summary, emergency } = state
  const wornTitle = state.titles.find((t) => t.id === worn && t.earned)
  const upcoming = nextRank(rank)
  const stats = STATS.map((key) => ({
    key,
    label: STAT_SHORT[key],
    name: STAT_LABEL[key],
    value: statValue(summary.stats[key]),
    rank: statRank(key, summary.stats[key]),
  }))
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

      <div className="flex flex-col gap-4 pb-4">
        <SystemWindow label="Durum" className="animate-[sys-open_280ms_ease-out] p-4">
          <div className="flex items-center gap-4">
            <RankBadge rank={rank} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-3xl font-bold tracking-wide">{levelText(level)}</p>
              <p className="font-mono text-sm" style={{ color: RANK_COLOR[rank] }}>
                {rank}-RANK
              </p>
              <p className="truncate text-sm text-sys-muted">{wornTitle?.name ?? RANK_TITLE[rank]}</p>
            </div>
          </div>
          <div className="mt-4">
            <SystemBar ratio={into / needed} />
            <div className="mt-1.5 flex justify-between font-mono text-xs text-sys-muted tabular-nums">
              <span>
                {Math.floor(into)} / {needed} XP
              </span>
              <span>{upcoming ? `${upcoming}-RANK: ${levelText(rankStart(upcoming))}` : 'EN YÜKSEK RANK'}</span>
            </div>
          </div>
          <p className="mt-3 font-mono text-xs text-sys-muted tabular-nums">
            TOPLAM {Math.round(summary.xp).toLocaleString('tr')} XP
          </p>
        </SystemWindow>

        <SystemWindow label="Acil görev · bu hafta" tone="warn" className="p-4">
          <p className="font-medium">{emergencyText(emergency)}</p>
          <div className="mt-3">
            <SystemBar ratio={emergency.done / emergency.target} color="var(--color-sys-warn)" />
            <div className="mt-1.5 flex justify-between font-mono text-xs text-sys-muted tabular-nums">
              <span>
                {emergency.done} / {emergency.target}
              </span>
              <span className={emergency.met ? 'text-sys-warn' : ''}>
                {emergency.met ? `TAMAMLANDI · +${XP.emergency} XP` : `ÖDÜL: ${XP.emergency} XP`}
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs text-sys-muted">
            {emergency.kind === 'habit'
              ? 'Son 4 haftada en çok aksattığın habit. Her pazartesi yenisi gelir; bitiremezsen bir şey kaybetmezsin.'
              : 'Aksattığın bir habit yok; bu hafta yazmaya vakit ayır. Her pazartesi yenisi gelir.'}
          </p>
        </SystemWindow>

        <SystemWindow label="Unvanlar" className="p-4">
          <p className="mb-3 text-sm text-sys-muted">
            {state.titles.filter((t) => t.earned).length} / {state.titles.length} kazanıldı. Birine dokun, seviyenin
            yanında görünsün.
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
                    className={`flex w-full items-center justify-between gap-3 border px-3 py-2 text-left ${
                      wearing
                        ? 'border-sys-glow bg-sys-panel shadow-[0_0_10px_rgb(124_200_255/0.35)]'
                        : 'border-sys-line'
                    } ${t.earned ? '' : 'opacity-45'}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{t.earned ? t.name : `🔒 ${t.name}`}</span>
                      <span className="block text-xs text-sys-muted">{t.how}</span>
                    </span>
                    {wearing && <span className="sys-label shrink-0 text-sys-glow">Takılı</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </SystemWindow>

        <SystemWindow label="Statlar" className="p-4">
          <p className="text-sm text-sys-muted">Her habit kendi statını büyütür, biraz da Cesaret'i.</p>
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={stats} outerRadius="72%">
              <PolarGrid stroke="var(--color-sys-line)" />
              <PolarAngleAxis dataKey="label" tick={{ ...tick, fontSize: 12 }} />
              <Tooltip
                content={({ active: shown, payload }) => {
                  const point = shown ? (payload?.[0]?.payload as (typeof stats)[number] | undefined) : undefined
                  if (!point) return null
                  return (
                    <div className={tooltipClass}>
                      <span className="font-medium">{point.name}</span> {point.value}
                    </div>
                  )
                }}
              />
              <Radar dataKey="value" stroke={SYS} strokeWidth={2} fill={SYS} fillOpacity={0.25} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer>
          {STAT_GROUPS.map((group) => (
            <div key={group.title} className="mt-3">
              <h3 className="sys-label mb-1 text-sys-muted">{group.title}</h3>
              <ul className="divide-y divide-sys-line">
                {group.stats.map((key) => {
                  const s = stats.find((x) => x.key === key)!
                  return (
                    <li key={key} className="py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                          <span className="font-medium">{s.name}</span>
                          <span className="ml-2 text-sm text-sys-glow">{s.rank.name}</span>
                        </span>
                        <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-sys-glow">{s.value}</span>
                      </div>
                      {/* Five segments, one per rank: the full ones are behind, the running one fills up. */}
                      <div
                        className="mt-1.5 grid grid-cols-5 gap-1"
                        role="img"
                        aria-label={`${s.name}: 5 rütbeden ${s.rank.rank}.`}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SystemBar key={n} ratio={n <= s.rank.rank ? 1 : n === s.rank.rank + 1 ? s.rank.ratio : 0} />
                        ))}
                      </div>
                      <p className="mt-1.5 flex justify-between gap-3 text-[11px] text-sys-muted">
                        <span className="min-w-0 truncate">{STAT_ABOUT[key]}</span>
                        <span className="shrink-0 font-mono tabular-nums">
                          {s.rank.next ? `${s.rank.next.name} · ${s.rank.next.at}` : 'EN YÜKSEK'}
                        </span>
                      </p>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {summary.xp > 0 && (
            <p className="mt-3 text-xs text-sys-muted">
              En zayıf statın: <b className="text-sys-text">{weakest.name}</b>
            </p>
          )}
        </SystemWindow>

        <SystemWindow label="Son 30 gün" className="p-4">
          <p className="-mt-1 mb-2 font-mono text-sm text-sys-muted tabular-nums">{last30.toLocaleString('tr')} XP</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap="18%">
              <CartesianGrid vertical={false} stroke="var(--color-sys-line)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={4} tick={tick} />
              <YAxis tickLine={false} axisLine={false} tick={tick} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'var(--color-sys-panel)' }}
                content={({ active: shown, payload }) => {
                  const point = shown ? (payload?.[0]?.payload as (typeof days)[number] | undefined) : undefined
                  if (!point) return null
                  return (
                    <div className={tooltipClass}>
                      <div className="font-medium">{format(fromDateKey(point.key), 'd MMMM EEEE', { locale: tr })}</div>
                      <div className="text-sys-muted">{point.xp} XP</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="xp" fill={SYS} radius={[2, 2, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </SystemWindow>

        {sources.length > 0 && (
          <SystemWindow label="XP nereden geldi" className="p-4">
            <ul className="flex flex-col gap-2.5">
              {sources.map(([source, xp]) => (
                <li key={source}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{SOURCE_LABEL[source]}</span>
                    <span className="font-mono text-sys-muted tabular-nums">{Math.round(xp).toLocaleString('tr')}</span>
                  </div>
                  <SystemBar ratio={xp / topSource} />
                </li>
              ))}
              {(summary.sources.penalty ?? 0) <= -1 && (
                <li className="flex justify-between border-t border-sys-line pt-2 text-sm">
                  <span>{SOURCE_LABEL.penalty}</span>
                  <span className="font-mono text-sys-danger tabular-nums">
                    {Math.round(summary.sources.penalty!).toLocaleString('tr')}
                  </span>
                </li>
              )}
            </ul>
          </SystemWindow>
        )}

        {active.length > 0 && (
          <SystemWindow label="Habit zorlukları" className="p-4">
            <p className="mb-3 text-sm text-sys-muted">
              Zorluk, bir kez yapmanın ne kadar emek istediğine göre belirlenir; ne sıklıkta yaptığına göre değil.
              Habit'i düzenleyerek değiştirebilirsin.
            </p>
            <ul className="divide-y divide-sys-line">
              {active.map((habit) => {
                const effort = effortOf(habit)
                const mastered = masteryFactor(habit, logs, week) < 1
                return (
                  <li key={habit.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{habit.title}</span>
                      <span className="block text-xs text-sys-muted">
                        {TIER_LABEL[effort.tier]} · {effort.reason} · {STAT_LABEL[statOf(habit)]}
                        {mastered && ' · Ustalaştın'}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm text-sys-glow tabular-nums">
                      {Math.round(xpPerDone(habit, logs, today))} XP
                    </span>
                  </li>
                )
              })}
            </ul>
          </SystemWindow>
        )}

        <details className="sys-window p-4 text-sm">
          <summary className="sys-label cursor-pointer">◆ XP nasıl hesaplanıyor?</summary>
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sys-muted">
            <li>Zorluk: Hafif 5 · Orta 12 · Ağır 25 · Zorlu 40 XP. Minimum versiyon yarısı.</li>
            <li>Seri bonusu: 7 günde +%10, 30 günde +%25, 100 günde +%50. Seri bozulsa da kazandığın XP gitmez.</li>
            <li>3 planlı günü kaçırdıktan sonra ilk yapışın +%50 (geri dönüş bonusu, haftada bir).</li>
            <li>Süreli ve sayılı habit'lerde hedefi aşmak en fazla +%75 getirir.</li>
            <li>Haftalık hedefe ulaşınca bonus; hedefin üstü yarım XP.</li>
            <li>Bir günün habit XP'sinin 150'yi aşan kısmı yarım sayılır.</li>
            <li>Geçmişi işaretlemek: dün tam, son 7 gün %75, daha eskisi %25.</li>
            <li>90 gün boyunca %95'in üstünde yaptığın habit ustalaşmış sayılır, biraz daha az XP verir.</li>
            <li>
              Ceza (Ayarlar'dan kapatılabilir): planlanıp yapılmayan habit, yapınca kazandıracağı kadar XP götürür;
              günde en fazla 100. Atlanan gün ve minimum cezasız, kısmi yarı ceza; haftalık hedefte eksik kalan her kez
              hafta bitince. Dünü sonradan işaretlersen ceza kalkar. Seviye düşebilir, statlar düşmez.
            </li>
            <li>
              Statlar: bir habit'in XP'sinin %80'i kendi statına, %20'si Cesaret'e gider. Görevler ve proje adımları
              Beceri'yi, günlük ve ruh hali Duyu'yu, bitirdiğin kitaplar Bilgi'yi büyütür. Her statın 5 rütbesi var
              (8, 18, 32 ve 50'de yükselir).
            </li>
            <li>Biten haftalar kaydedilir; habit silsen de o XP kalır.</li>
          </ul>
        </details>
      </div>
    </>
  )
}
