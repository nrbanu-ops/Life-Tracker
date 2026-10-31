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
import { buildToday, dayProgress, tapResult } from '../lib/today'
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
  const { done, total } = dayProgress(items)
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
          <section className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
            <ProgressRing done={done} total={total} />
            <div>
              <p className="font-medium">{progressTitle(done, total)}</p>
              <p className="text-sm text-muted">Dokun: işaretle · Uzun bas: minimum, atla</p>
            </div>
          </section>

          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {items.map((item) => (
              <HabitCheckRow
                key={item.habit.id}
                item={item}
                projectColor={item.habit.projectId ? projectColor.get(item.habit.projectId) : undefined}
                onTap={() => setLog(item.habit.id, today, tapResult(item.habit, item))}
                onMore={() => setActionHabitId(item.habit.id)}
              />
            ))}
          </ul>

          <HabitActionSheet
            item={items.find((item) => item.habit.id === actionHabitId)}
            date={today}
            onClose={() => setActionHabitId(undefined)}
          />
        </>
      )}

      {quitHabits.length > 0 && (
        <section className={items.length > 0 ? 'mt-8' : ''}>
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
  if (total === 0) return 'Bu haftanın hedefleri tamam'
  if (done === total) return 'Bugün hepsi tamam'
  if (done === 0) return 'Güne başlayalım'
  return `%${Math.round((done / total) * 100)} tamamlandı`
}
