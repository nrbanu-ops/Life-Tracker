import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useMemo, useState } from 'react'
import { BackupReminder } from '../components/BackupReminder'
import { DayJournal } from '../components/DayJournal'
import { LevelCard } from '../components/LevelCard'
import { MemoryCard } from '../components/MemoryCard'
import { MonthReviewCard } from '../components/MonthReviewCard'
import { EmptyState } from '../components/EmptyState'
import { FreezeCard } from '../components/FreezeCard'
import { HabitActionSheet } from '../components/HabitActionSheet'
import { HabitEndCard } from '../components/HabitEndCard'
import { HardDayCard } from '../components/HardDayCard'
import type { MiniChainData } from '../components/HabitChain'
import { HabitCheckRow } from '../components/HabitCheckRow'
import { PageHeader } from '../components/PageHeader'
import { ProgressRing } from '../components/ProgressRing'
import { QuitCard } from '../components/QuitCard'
import { QuitSheet } from '../components/QuitSheet'
import { TodayMilestones } from '../components/TodayMilestones'
import { TodayTasks } from '../components/TodayTasks'
import { WeightCard } from '../components/WeightCard'
import { WeekPlanCard } from '../components/WeekPlanCard'
import { SundayReviewNudge } from '../components/WeeklyReview'
import { YearReviewCard } from '../components/YearReviewCard'
import { db } from '../db/db'
import type { HabitLog } from '../db/types'
import { markMilestoneCelebrated } from '../db/habits'
import { useHardDay } from '../db/hardDay'
import { logsCovering, setLog } from '../db/logs'
import { fromDateKey, weekRange } from '../lib/date'
import { habitChain } from '../lib/chain'
import { isLongGoal } from '../lib/frequency'
import { streaks } from '../lib/stats'
import { hardTap } from '../lib/hardDay'
import {
  buildToday,
  dayProgress,
  goalProgress,
  isDailyGoal,
  isWeeklyGoal,
  partOfDay,
  sortByDayPart,
  splitCurrent,
  splitDone,
  splitFocus,
  tapResult,
  type TodayItem,
} from '../lib/today'
import { useFocusMode, useHideDone } from '../lib/todaySetting'
import { useNow } from '../lib/useNow'
import { useTodayKey } from '../lib/useTodayKey'

/** Links in a row's chain: a week of a daily habit, without crowding the title. */
const MINI_CHAIN = 7

export function TodayPage() {
  const today = useTodayKey()
  // Only the id is kept so the sheet always shows the live item.
  const [actionHabitId, setActionHabitId] = useState<string>()
  const [quitHabitId, setQuitHabitId] = useState<string>()
  // Focus mode folds the non-keystone habits away until they are asked for.
  const [showRest, setShowRest] = useState(false)
  const hideDone = useHideDone()
  const hardDay = useHardDay(today)
  const hard = hardDay?.on ?? false
  const focusMode = useFocusMode()
  const now = useNow()
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray())
  const projects = useLiveQuery(() => db.projects.toArray(), [], [])
  // This week for everything; monthly and yearly goals bring their whole month or year along.
  const weekLogs = useLiveQuery(() => {
    const { start, end } = weekRange(today)
    return logsCovering(start, end)
  }, [today])
  // Chains reach back further than this week (up to 12 months); log rows are small.
  const allLogs = useLiveQuery(() => db.habitLogs.toArray(), [], [])
  const chains = useMemo(() => {
    const byHabit = new Map<string, HabitLog[]>()
    for (const log of allLogs) byHabit.set(log.habitId, [...(byHabit.get(log.habitId) ?? []), log])
    const map = new Map<string, MiniChainData>()
    for (const habit of habits ?? []) {
      if (habit.archived || habit.kind === 'quit') continue
      const logs = byHabit.get(habit.id) ?? []
      const { current, unit } = streaks(habit, logs, today)
      map.set(habit.id, { links: habitChain(habit, logs, today).slice(-MINI_CHAIN), current, unit })
    }
    return map
  }, [habits, allLogs, today])

  const subtitle = format(fromDateKey(today), 'd MMMM EEEE', { locale: tr })
  if (habits === undefined || weekLogs === undefined) {
    return <PageHeader title="Bugün" subtitle={subtitle} />
  }

  // What can be done at this hour comes first; the stored order decides the rest.
  const items = sortByDayPart(buildToday(habits, weekLogs, today), partOfDay(now.getHours()))
  // The ring and the weekly count are about the whole day, keystones included.
  const { done, total } = dayProgress(items.filter((item) => isDailyGoal(item.habit)))
  const week = goalProgress(items.filter((item) => isWeeklyGoal(item.habit)))
  const { focus: keystones, rest } = focusMode ? splitFocus(items) : { focus: [], rest: items }
  const daily = rest.filter((item) => isDailyGoal(item.habit))
  const weekly = rest.filter((item) => isWeeklyGoal(item.habit))
  // Monthly, yearly and "every N months" goals are not habits of the day: the ones whose turn
  // it is sit with the tasks under Yapılacaklar, the rest fold away there.
  const long = splitCurrent(rest.filter((item) => isLongGoal(item.habit)))
  // What focus mode folds behind "Diğerleri": the day's and the week's habits.
  const folded = daily.length + weekly.length
  const restHidden = keystones.length > 0 && folded > 0 && !showRest
  const tap = (item: TodayItem) => setLog(item.habit.id, today, (hard ? hardTap : tapResult)(item.habit, item))
  const projectColor = new Map(projects.map((p) => [p.id, p.color]))
  const hasActiveHabits = habits.some((h) => !h.archived)
  const quitHabits = habits.filter((h) => !h.archived && h.kind === 'quit')

  return (
    <>
      <PageHeader title="Bugün" subtitle={subtitle} />

      <div className="page-stack">
        {items.length === 0 && quitHabits.length > 0 ? null : items.length === 0 ? (
          <EmptyState
            title={hasActiveHabits ? 'Bugün planlı habit yok' : 'Henüz habit yok'}
            text={
              hasActiveHabits
                ? 'Keyfini çıkar, yarın görüşürüz.'
                : 'Her gün, haftada birkaç kez ya da ayda yılda bir yapmak istediğin şeyleri ekle.'
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
            {items.some((item) => isDailyGoal(item.habit)) && (
              <section className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
                <ProgressRing done={done} total={total} />
                <div>
                  <p className="font-medium">{progressTitle(done, total)}</p>
                  <p className="text-sm text-muted">
                    {hard ? 'Dokun: minimum · Tekrar dokun: tam' : 'Dokun: işaretle · Uzun bas: minimum, atla'}
                  </p>
                </div>
              </section>
            )}

            {hard && <HardDayCard today={today} />}

            {keystones.length > 0 && (
              <HabitGroup
                title="Omurga"
                items={keystones}
                hideDone={hideDone}
                projectColor={projectColor}
                chains={chains}
                onTap={tap}
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
                <span className="tabular-nums">{folded} ▾</span>
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
                      hideDone={hideDone}
                      projectColor={projectColor}
                      chains={chains}
                      onTap={tap}
                      onMore={setActionHabitId}
                    />
                  ))}
                {keystones.length > 0 && folded > 0 && (
                  <button
                    type="button"
                    aria-expanded
                    onClick={() => setShowRest(false)}
                    className="tap-text stack-tuck self-start text-sm text-muted"
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

        {/* Right under the habits: what else there is to do today is the next thing to see. */}
        <TodayTasks
          today={today}
          projectColor={projectColor}
          goals={long.current}
          waitingGoals={long.waiting}
          onGoalTap={tap}
          onGoalMore={setActionHabitId}
        />

        {/*
          Reminders queue here, most pressing first, and only the first one that has something to
          say is shown: each renders nothing when it is not due, so the first child is the winner.
          (Dialogs are left alone — a sheet opened from the visible card must still appear.)
        */}
        <div className="contents [&>*:not(:first-child):not(dialog)]:hidden">
          <HabitEndCard today={today} />
          <FreezeCard today={today} />
          <WeekPlanCard today={today} variant="prompt" />
          <BackupReminder />
          <MonthReviewCard today={today} variant="today" />
          <SundayReviewNudge today={today} />
          <YearReviewCard today={today} />
        </div>

        <WeekPlanCard today={today} variant="plan" />

        <WeightCard today={today} />

        <LevelCard />

        {quitHabits.length > 0 && (
          <section>
            <h2 className="mb-3 section-title">Bıraktıkların</h2>
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

        <MemoryCard today={today} />

        <DayJournal date={today} canWrite />
      </div>
    </>
  )
}

type GroupProps = {
  title: string
  detail?: string
  items: TodayItem[]
  hideDone: boolean
  projectColor: Map<string, string>
  chains: Map<string, MiniChainData>
  onTap: (item: TodayItem) => void
  onMore: (habitId: string) => void
}

/** One titled block of today's habits, with the "hide completed" fold underneath it. */
function HabitGroup({ title, detail, items, hideDone, projectColor, chains, onTap, onMore }: GroupProps) {
  const [revealed, setRevealed] = useState(false)
  const { open, done: finished } = splitDone(items)
  // Hiding only changes this list; the ring above still counts what was finished.
  const shown = hideDone && !revealed ? open : items

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        {detail && <span className="section-chip text-xs">{detail}</span>}
      </div>
      {shown.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {shown.map((item) => (
            <HabitCheckRow
              key={item.habit.id}
              item={item}
              projectColor={item.habit.projectId ? projectColor.get(item.habit.projectId) : undefined}
              onTap={() => onTap(item)}
              onMore={() => onMore(item.habit.id)}
              chain={chains.get(item.habit.id)}
            />
          ))}
        </ul>
      )}
      {hideDone && finished.length > 0 && (
        <button
          type="button"
          aria-expanded={revealed}
          onClick={() => setRevealed((v) => !v)}
          className="tap-text text-sm text-muted"
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
