import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { BackIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { loadYearData } from '../db/yearReview'
import { fromDateKey } from '../lib/date'
import { KIND_EMOJI, KIND_LABEL } from '../lib/library'
import { MOOD_EMOJI } from '../lib/mood'
import { yearsIn, yearSummary, type YearData, type YearSummary } from '../lib/yearReview'
import { useTodayKey } from '../lib/useTodayKey'

const monthName = (month: string) => format(fromDateKey(`${month}-01`), 'LLLL', { locale: tr })

/** A year in one page: what you kept up, what you wrote, what you finished. */
export function YearReviewPage() {
  const navigate = useNavigate()
  const today = useTodayKey()
  // A snapshot, not a live query: the page reads every table once and nothing changes while you read.
  const [data, setData] = useState<YearData>()
  // ?yil=2026: what the card on Bugün links to in January, when "the year" means the last one.
  const [params] = useSearchParams()
  const asked = Number(params.get('yil'))
  const [year, setYear] = useState(() =>
    asked >= 2000 && asked <= 2999 ? asked : Number(today.slice(0, 4)),
  )

  useEffect(() => {
    let cancelled = false
    loadYearData().then((loaded) => !cancelled && setData(loaded))
    return () => {
      cancelled = true
    }
  }, [])

  const years = data ? yearsIn(data, today) : []
  const summary = data ? yearSummary(data, year, today) : undefined

  return (
    <>
      <PageHeader
        title={`${year} özeti`}
        action={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Geri"
            className="-mr-2 rounded-full p-2 text-muted transition-colors hover:text-text"
          >
            <BackIcon width={22} height={22} />
          </button>
        }
      />

      {years.length > 1 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          {years.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setYear(option)}
              aria-pressed={option === year}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm tabular-nums ${
                option === year ? 'bg-accent font-medium text-surface' : 'bg-surface text-muted'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {!summary ? (
        <p className="py-10 text-center text-sm text-muted">Hazırlanıyor…</p>
      ) : summary.empty ? (
        <EmptyState title={`${year} boş görünüyor`} text="O yıl kaydedilmiş bir şey yok." />
      ) : (
        <Summary summary={summary} />
      )}
    </>
  )
}

function Summary({ summary }: { summary: YearSummary }) {
  const { habits, journal, mood, library, projects } = summary
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-surface p-5 text-center">
        <p className="text-5xl font-semibold tabular-nums text-accent">{summary.activeDays}</p>
        <p className="mt-1 text-sm text-muted">gün bir şeyler yaptın</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Tile value={habits.checks} label="habit işareti" />
        <Tile value={habits.perfectDays} label="kusursuz gün" />
        <Tile value={summary.tasks.done} label="biten görev" />
        <Tile value={journal.entries} label="günlük yazısı" />
        {library.finished > 0 && <Tile value={library.finished} label="bitirdiğin şey" />}
        {summary.achievements > 0 && <Tile value={summary.achievements} label="başarım" />}
        {journal.photos > 0 && <Tile value={journal.photos} label="fotoğraf" />}
        {summary.xp > 0 && <Tile value={summary.xp} label="XP" />}
      </div>

      <Block title="Alışkanlıklar">
        {habits.topHabit && (
          <Line label="En çok yaptığın" value={habits.topHabit.title} note={`${habits.topHabit.done} kez`} />
        )}
        {habits.bestStreak && (
          <Line label="En uzun serin" value={habits.bestStreak.title} note={`${habits.bestStreak.days} gün`} />
        )}
        {projects.finished > 0 && <Line label="Biten proje" value={`${projects.finished}`} />}
        {projects.milestones > 0 && <Line label="Tamamlanan adım" value={`${projects.milestones}`} />}
        {!habits.topHabit && projects.milestones === 0 && <Empty />}
      </Block>

      <Block title="Günlük">
        {journal.entries > 0 ? (
          <>
            <Line label="Yazdığın kelime" value={journal.words.toLocaleString('tr')} />
            {journal.busiest && (
              <Line
                label="En çok yazdığın ay"
                value={monthName(journal.busiest.month)}
                note={`${journal.busiest.count} yazı`}
              />
            )}
            {journal.audios > 0 && <Line label="Ses notu" value={`${journal.audios}`} />}
          </>
        ) : (
          <Empty />
        )}
      </Block>

      {(mood.average !== undefined || mood.best) && (
        <Block title="Ruh hali">
          {mood.average !== undefined && (
            <Line
              label="Yıl ortalaman"
              value={`${MOOD_EMOJI[Math.round(mood.average) as 1 | 2 | 3 | 4 | 5]} ${mood.average.toFixed(1)}`}
              note="5 üzerinden"
            />
          )}
          {mood.best && (
            <Line label="En iyi ayın" value={monthName(mood.best.month)} note={mood.best.average.toFixed(1)} />
          )}
        </Block>
      )}

      {library.finished > 0 && (
        <Block title="Kütüphane">
          {library.byKind.map(({ kind, count }) => (
            <Line key={kind} label={`${KIND_EMOJI[kind]} ${KIND_LABEL[kind]}`} value={`${count}`} />
          ))}
          {library.loved.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-sm text-muted">★★★★★ verdiklerin</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {library.loved.map((item) => (
                  <li key={`${item.kind}-${item.title}`} className="truncate text-sm">
                    {KIND_EMOJI[item.kind]} {item.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Block>
      )}
    </div>
  )
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString('tr')}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {children}
      </div>
    </section>
  )
}

function Line({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <span className="min-w-0 text-right">
        <span className="block truncate font-medium">{value}</span>
        {note && <span className="block text-xs text-muted">{note}</span>}
      </span>
    </div>
  )
}

const Empty = () => <p className="px-4 py-3 text-sm text-muted">Bu yıl kayıt yok.</p>
