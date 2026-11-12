import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { DayMood, Habit, HabitLog, JournalEntry, Task } from '../db/types'
import { fromDateKey, toDateKey } from './date'
import { describeFrequency, isLongGoal, isPeriodGoal, periodGoal, periodRange } from './frequency'
import { isCompleted, isShownOn } from './today'

export const REVIEW_DAYS = 7

export const REVIEW_SYSTEM = `Sen sıcak, dürüst ve kısa konuşan kişisel bir koçsun. Kullanıcının son bir haftasına bakıp günlüğüne kısa bir "haftalık bakış" yazıyorsun.
Kurallar:
- Türkçe, samimi ama abartısız, "sen" diye hitap et. En fazla 150 kelime.
- Üç kısa bölüm, başlıkları aynen şöyle: "🌟 İyi gidenler", "🌧️ Zorlayanlar", "🎯 Gelecek hafta için". Son bölümde tek, somut bir öneri ver.
- Markdown kullanma (#, ** yok); maddeler için "• " kullan.
- Sadece verilen verilere dayan, olmayan bir şeyi uydurma. Ruh hali ile habit'ler arasında bir bağ görüyorsan söyle.`

type ReviewData = {
  habits: Habit[]
  logs: HabitLog[]
  moods: DayMood[]
  journal: JournalEntry[]
  tasks: Task[]
}

/** The last seven days (today included), oldest first. */
export function reviewDays(today: string): string[] {
  const end = fromDateKey(today)
  return Array.from({ length: REVIEW_DAYS }, (_, i) => {
    const d = new Date(end)
    d.setDate(end.getDate() - (REVIEW_DAYS - 1 - i))
    return toDateKey(d)
  })
}

/** Everything about the week, one block per day, for Gemini to read. */
export function buildReviewRequest(data: ReviewData, today: string): string {
  const days = reviewDays(today)
  const habits = data.habits.filter((h) => !h.archived && h.kind !== 'quit')
  const status = new Map(data.logs.map((l) => [`${l.habitId}|${l.date}`, l.status]))
  const titleOf = new Map(data.habits.map((h) => [h.id, h.title]))
  const lines = [`Son ${REVIEW_DAYS} günüm (bugün ${today}):`]

  for (const day of days) {
    const parts = [format(fromDateKey(day), 'd MMMM EEEE', { locale: tr })]
    const mood = data.moods.find((m) => m.date === day)
    if (mood?.mood) parts.push(`ruh hali ${mood.mood}/5`)
    if (mood?.energy) parts.push(`enerji ${mood.energy}/5`)
    const daily = habits.filter((h) => !isPeriodGoal(h) && isShownOn(h, day))
    const done = daily.filter((h) => isCompleted(status.get(`${h.id}|${day}`)))
    const skipped = daily.filter((h) => status.get(`${h.id}|${day}`) === 'skipped')
    const held = daily.filter((h) => status.get(`${h.id}|${day}`) === 'frozen')
    const missed = daily.filter(
      (h) => !done.includes(h) && !skipped.includes(h) && !held.includes(h) && day < today,
    )
    const weeklyDone = habits.filter((h) => isPeriodGoal(h) && isCompleted(status.get(`${h.id}|${day}`)))
    if (done.length + weeklyDone.length) parts.push(`yaptıkları: ${[...done, ...weeklyDone].map((h) => h.title).join(', ')}`)
    if (missed.length) parts.push(`yapmadıkları: ${missed.map((h) => h.title).join(', ')}`)
    if (skipped.length) parts.push(`atladıkları: ${skipped.map((h) => h.title).join(', ')}`)
    if (held.length) parts.push(`seri koruması kullandıkları: ${held.map((h) => h.title).join(', ')}`)
    const tasksDone = data.tasks.filter((t) => t.done && t.completedAt && toDateKey(new Date(t.completedAt)) === day)
    if (tasksDone.length) parts.push(`tamamlanan görevler: ${tasksDone.map((t) => t.title).join(', ')}`)
    lines.push(`\n- ${parts.join(' · ')}`)

    for (const e of data.journal.filter((j) => j.date === day && j.kind !== 'review' && j.text)) {
      const who = e.habitId ? `Not (${titleOf.get(e.habitId) ?? 'habit'})` : 'Günlük'
      lines.push(`  ${who}: ${e.text.replace(/\s+/g, ' ').slice(0, 600)}`)
    }
  }

  const weekly = habits.filter((h) => h.frequency.type === 'timesPerWeek')
  if (weekly.length) {
    lines.push('\nHaftada X kez hedefleri (son 7 gün):')
    for (const h of weekly) {
      const count = days.filter((d) => isCompleted(status.get(`${h.id}|${d}`))).length
      lines.push(`- ${h.title}: ${count}/${h.frequency.type === 'timesPerWeek' ? h.frequency.count : '?'}`)
    }
  }
  const long = habits.filter(isLongGoal)
  if (long.length) {
    lines.push('\nAylık ve yıllık hedefler (ayın ya da yılın başından bugüne):')
    for (const h of long) {
      const goal = periodGoal(h.frequency)!
      const { start } = periodRange(goal.period, today)
      const count = data.logs.filter((l) => l.habitId === h.id && l.date >= start && l.date <= today && isCompleted(l.status)).length
      lines.push(`- ${h.title} (${describeFrequency(h.frequency).toLocaleLowerCase('tr')}): ${count}/${goal.count}`)
    }
  }
  lines.push('\nBu haftaya kısa bir haftalık bakış yaz.')
  return lines.join('\n')
}

/** Whether a review was already written in the last seven days. */
export const hasRecentReview = (journal: JournalEntry[], today: string): boolean => {
  const [first] = reviewDays(today)
  return journal.some((e) => e.kind === 'review' && e.date >= first && e.date <= today)
}
