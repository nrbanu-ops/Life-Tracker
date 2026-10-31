import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useState } from 'react'
import { DayJournal } from '../components/DayJournal'
import { EmptyState } from '../components/EmptyState'
import { HabitActionSheet } from '../components/HabitActionSheet'
import { HabitCheckRow } from '../components/HabitCheckRow'
import { PageHeader } from '../components/PageHeader'
import { ProgressRing } from '../components/ProgressRing'
import { QuitCard } from '../components/QuitCard'
import { QuitSheet } from '../components/QuitSheet'
import { TodayMilestones } from '../components/TodayMilestones'
import { TodayTasks } from '../components/TodayTasks'
import { db } from '../db/db'
import { markMilestoneCelebrated } from '../db/habits'
import { setLog } from '../db/logs'
import { fromDateKey, weekRange } from '../lib/date'
import { buildToday, dayProgress, isWeeklyGoal, tapResult, weekProgress } from '../lib/today'
import { useNow } from '../lib/useNow'
import { useTodayKey } from '../lib/useTodayKey'

export function TodayPage() {
  const today = useTodayKey()
  // Only the id is kept so the sheet always shows the live item.
  const [actionHabitId, setActionHabitId] = useState<string>()
  const [quitHabitId, setQuitHabitId] = useState<string>()
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
  const daily = items.filter((item) => !isWeeklyGoal(item.habit))
  const weekly = items.filter((item) => isWeeklyGoal(item.habit))
  // The ring is about today; weekly goals have their own count below.
  const { done, total } = dayProgress(daily)
  const week = weekProgress(weekly)
  const projectColor = new Map(projects.map((p) => [p.id, p.color]))
  const hasActiveHabits = habits.some((h) => !h.archived)
  const quitHabits = habits.filter((h) => !h.archived && h.kind === 'quit')

  return (
    <>
      <PageHeader title="Bugün" subtitle={subtitle} />

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

          {[
            { key: 'daily', title: 'Günlük hedefler', detail: undefined, list: daily },
            {
              key: 'weekly',
              title: 'Haftalık hedefler',
              detail: week.done === week.total ? 'Bu hafta hepsi tamam 🎉' : `Bu hafta ${week.done}/${week.total} tamam`,
              list: weekly,
            },
          ]
            .filter((group) => group.list.length > 0)
            .map((group) => (
              <section key={group.key} className="mb-6">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-medium text-muted">{group.title}</h2>
                  {group.detail && <span className="text-xs text-muted">{group.detail}</span>}
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {group.list.map((item) => (
                    <HabitCheckRow
                      key={item.habit.id}
                      item={item}
                      onTap={() => setLog(item.habit.id, today, tapResult(item.habit, item))}
                      onMore={() => setActionHabitId(item.habit.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}

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

      <div className="mt-8">
        <DayJournal date={today} canWrite />
      </div>
    </>
  )
}

function progressTitle(done: number, total: number) {
  if (total === 0) return 'Bugün için hepsi atlandı'
  if (done === total) return 'Bugün hepsi tamam'
  if (done === 0) return 'Güne başlayalım'
  return `%${Math.round((done / total) * 100)} tamamlandı`
}
