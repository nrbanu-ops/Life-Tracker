import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useState } from 'react'
import { BackupReminder } from '../components/BackupReminder'
import { DayJournal } from '../components/DayJournal'
import { LevelCard } from '../components/LevelCard'
import { MemoryCard } from '../components/MemoryCard'
import { EmptyState } from '../components/EmptyState'
import { HabitActionSheet } from '../components/HabitActionSheet'
import { HabitCheckRow } from '../components/HabitCheckRow'
import { PageHeader } from '../components/PageHeader'
import { ProgressRing } from '../components/ProgressRing'
import { QuitCard } from '../components/QuitCard'
import { QuitSheet } from '../components/QuitSheet'
import { TodayMilestones } from '../components/TodayMilestones'
import { TodayTasks } from '../components/TodayTasks'
import { WeekPlanCard } from '../components/WeekPlanCard'
import { SundayReviewNudge } from '../components/WeeklyReview'
import { YearReviewCard } from '../components/YearReviewCard'
import { db } from '../db/db'
import { markMilestoneCelebrated } from '../db/habits'
import { setLog } from '../db/logs'
import { fromDateKey, weekRange } from '../lib/date'
import {
  buildToday,
  dayProgress,
  isWeeklyGoal,
  splitDone,
  splitFocus,
  tapResult,
  weekProgress,
  type TodayItem,
} from '../lib/today'
import { useFocusMode, useHideDone } from '../lib/todaySetting'
import { useNow } from '../lib/useNow'
import { useTodayKey } from '../lib/useTodayKey'

export function TodayPage() {
  const today = useTodayKey()
  // Only the id is kept so the sheet always shows the live item.
  const [actionHabitId, setActionHabitId] = useState<string>()
  const [quitHabitId, setQuitHabitId] = useState<string>()
  // Focus mode folds the non-keystone habits away until they are asked for.
  const [showRest, setShowRest] = useState(false)
  const hideDone = useHideDone()
  const focusMode = useFocusMode()
  const now = useNow()
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray())
  const projects = useLiveQuery(() => db.projects.toArray(), [], [])
  const weekLogs = useLiveQuery(() => {
    const { start, end } = weekRange(today)
    return db.habitLogs.where('date').between(start, end, true, true).toArray()
  }, [today])

  const subtitle = format(fromDateKey(today), 'd MMMM EEEE', { locale: tr })
  if (habits === undefined || weekLogs === undefined) {
    return <PageHeader title="Bugün" subtitle={subtitle} />
  }

  const items = buildToday(habits, weekLogs, today)
  // The ring and the weekly count are about the whole day, keystones included.
  const { done, total } = dayProgress(items.filter((item) => !isWeeklyGoal(item.habit)))
  const week = weekProgress(items.filter((item) => isWeeklyGoal(item.habit)))
  const { focus: keystones, rest } = focusMode ? splitFocus(items) : { focus: [], rest: items }
  const daily = rest.filter((item) => !isWeeklyGoal(item.habit))
  const weekly = rest.filter((item) => isWeeklyGoal(item.habit))
  const restHidden = keystones.length > 0 && rest.length > 0 && !showRest
  const projectColor = new Map(projects.map((p) => [p.id, p.color]))
  const hasActiveHabits = habits.some((h) => !h.archived)
  const quitHabits = habits.filter((h) => !h.archived && h.kind === 'quit')

  return (
    <>
      <PageHeader title="Bugün" subtitle={subtitle} />

      <LevelCard />

      <BackupReminder />

      <WeekPlanCard today={today} />

      <TodayTasks today={today} projectColor={projectColor} />

      {items.length === 0 && quitHabits.length > 0 ? null : items.length === 0 ? (
        <EmptyState
          title={hasActiveHabits ? 'Bugün planlı habit yok' : 'Henüz habit yok'}
          text={
            hasActiveHabits
              ? 'Keyfini çıkar, yarın görüşürüz.'
              : 'Her gün ya da haftada birkaç kez yapmak istediğin şeyleri ekle.'
          }
          action={
            !hasActiveHabits && (
              <Link
                to="/habitler"
                state={{ newHabit: true }}
                className="inline-block rounded-full bg-accent px-5 py-2.5 font-medium text-surface"
              >
                + Habit ekle
              </Link>
            )
          }
        />
      ) : (
        <>
          {daily.length > 0 && (
            <section className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
              <ProgressRing done={done} total={total} />
              <div>
                <p className="font-medium">{progressTitle(done, total)}</p>
                <p className="text-sm text-muted">Dokun: işaretle · Uzun bas: minimum, atla</p>
              </div>
            </section>
          )}

          {keystones.length > 0 && (
            <HabitGroup
              title="Omurga"
              items={keystones}
              today={today}
              hideDone={hideDone}
              projectColor={projectColor}
              onMore={setActionHabitId}
            />
          )}

          {restHidden ? (
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setShowRest(true)}
              className="mb-6 flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted"
            >
              <span>Diğerleri</span>
              <span className="tabular-nums">{rest.length} ▾</span>
            </button>
          ) : (
            <>
              {[
                { key: 'daily', title: 'Günlük hedefler', detail: undefined, list: daily },
                {
                  key: 'weekly',
                  title: 'Haftalık hedefler',
                  detail:
                    week.done === week.total ? 'Bu hafta hepsi tamam 🎉' : `Bu hafta ${week.done}/${week.total} tamam`,
                  list: weekly,
                },
              ]
                .filter((group) => group.list.length > 0)
                .map((group) => (
                  <HabitGroup
                    key={group.key}
                    title={group.title}
                    detail={group.detail}
                    items={group.list}
                    today={today}
                    hideDone={hideDone}
                    projectColor={projectColor}
                    onMore={setActionHabitId}
                  />
                ))}
              {keystones.length > 0 && rest.length > 0 && (
                <button
                  type="button"
                  aria-expanded
                  onClick={() => setShowRest(false)}
                  className="mb-6 px-1 text-sm text-muted"
                >
                  Diğerlerini gizle
                </button>
              )}
            </>
          )}

          <HabitActionSheet
            item={items.find((item) => item.habit.id === actionHabitId)}
            date={today}
            onClose={() => setActionHabitId(undefined)}
          />
        </>
      )}

      {quitHabits.length > 0 && (
        <section className={items.length > 0 ? 'mt-2' : ''}>
          <h2 className="mb-3 text-sm font-medium text-muted">Bıraktıkların</h2>
          <ul className="flex flex-col gap-3">
            {quitHabits.map((habit) => (
              <QuitCard
                key={habit.id}
                habit={habit}
                now={now}
                onOpen={() => setQuitHabitId(habit.id)}
                onCelebrated={(days) => markMilestoneCelebrated(habit.id, days)}
              />
            ))}
          </ul>
          <QuitSheet
            habit={quitHabits.find((h) => h.id === quitHabitId)}
            now={now}
            onClose={() => setQuitHabitId(undefined)}
          />
        </section>
      )}

      <TodayMilestones />

      <SundayReviewNudge today={today} />

      <YearReviewCard today={today} />

      <MemoryCard today={today} />

      <div className="mt-8">
        <DayJournal date={today} canWrite />
      </div>
    </>
  )
}

type GroupProps = {
  title: string
  detail?: string
  items: TodayItem[]
  today: string
  hideDone: boolean
  projectColor: Map<string, string>
  onMore: (habitId: string) => void
}

/** One titled block of today's habits, with the "hide completed" fold underneath it. */
function HabitGroup({ title, detail, items, today, hideDone, projectColor, onMore }: GroupProps) {
  const [revealed, setRevealed] = useState(false)
  const { open, done: finished } = splitDone(items)
  // Hiding only changes this list; the ring above still counts what was finished.
  const shown = hideDone && !revealed ? open : items

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-muted">{title}</h2>
        {detail && <span className="text-xs text-muted">{detail}</span>}
      </div>
      {shown.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {shown.map((item) => (
            <HabitCheckRow
              key={item.habit.id}
              item={item}
              projectColor={item.habit.projectId ? projectColor.get(item.habit.projectId) : undefined}
              onTap={() => setLog(item.habit.id, today, tapResult(item.habit, item))}
              onMore={() => onMore(item.habit.id)}
            />
          ))}
        </ul>
      )}
      {hideDone && finished.length > 0 && (
        <button
          type="button"
          aria-expanded={revealed}
          onClick={() => setRevealed((v) => !v)}
          className="mt-2 px-1 text-sm text-muted"
        >
          {revealed ? 'Tamamlananları gizle' : `✓ ${finished.length} tamamlandı · göster`}
        </button>
      )}
    </section>
  )
}

function progressTitle(done: number, total: number) {
  if (total === 0) return 'Bugün için hepsi atlandı'
  if (done === total) return 'Bugün hepsi tamam'
  if (done === 0) return 'Güne başlayalım'
  return `%${Math.round((done / total) * 100)} tamamlandı`
}
