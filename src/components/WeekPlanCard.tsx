import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db/db'
import { setPriorityDone } from '../db/weekPlan'
import { weekRange } from '../lib/date'
import { planProgress, planPrompt } from '../lib/weekPlan'
import { WeekPlanSheet } from './WeekPlanSheet'

/**
 * This week's priorities on Bugün: the forward-looking half of the weekly habit, next to
 * the review that looks back. One tap ticks one off.
 */
export function WeekPlanCard({ today }: { today: string }) {
  const week = weekRange(today).start
  // null, not undefined, for "no plan": undefined still means the query is loading.
  const plan = useLiveQuery(async () => (await db.weekPlans.get(week)) ?? null, [week])
  const [editing, setEditing] = useState(false)

  if (plan === undefined) return null
  const prompt = planPrompt(today, plan ?? undefined)
  const { done, total } = planProgress(plan ?? undefined)
  const sheet = <WeekPlanSheet open={editing} week={week} plan={plan} onClose={() => setEditing(false)} />

  if (prompt === 'line') {
    return (
      <>
        <button type="button" onClick={() => setEditing(true)} className="mb-6 px-1 text-sm text-muted">
          🎯 Bu hafta için plan yok · planla
        </button>
        {sheet}
      </>
    )
  }

  if (prompt === 'card') {
    return (
      <>
        <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <p className="font-medium">🎯 Bu haftayı planla</p>
          <p className="mt-0.5 text-sm text-muted">
            Bu haftanın en fazla 3 önceliğini yaz. Hafta boyunca burada durur, tek dokunuşla
            işaretlersin.
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-surface"
          >
            Planla
          </button>
        </section>
        {sheet}
      </>
    )
  }

  return (
    <>
      <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">🎯 Bu hafta</h2>
          <span className="text-xs text-muted tabular-nums">
            {done}/{total}
          </span>
        </div>
        <ul className="mt-1 flex flex-col">
          {(plan?.priorities ?? []).map((priority, index) => (
            <li key={`${index}-${priority.text}`}>
              <button
                type="button"
                aria-pressed={priority.done}
                onClick={() => setPriorityDone(week, index, !priority.done)}
                className="flex w-full items-center gap-3 py-2 text-left"
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
                    priority.done ? 'border-accent bg-accent text-surface' : 'border-border'
                  }`}
                >
                  {priority.done ? '✓' : ''}
                </span>
                <span className={priority.done ? 'text-muted line-through' : ''}>{priority.text}</span>
              </button>
            </li>
          ))}
        </ul>
        {plan?.note && <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{plan.note}</p>}
        <button type="button" onClick={() => setEditing(true)} className="mt-2 text-sm text-muted">
          Düzenle
        </button>
      </section>
      {sheet}
    </>
  )
}
