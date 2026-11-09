import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db/db'
import { addEntry } from '../db/journal'
import { geminiReady, useAiSettings } from '../lib/assistant'
import { weekdayOf } from '../lib/date'
import { askGemini } from '../lib/gemini'
import { buildReviewRequest, hasRecentReview, REVIEW_SYSTEM, reviewDays } from '../lib/review'

type Props = {
  today: string
  /** On Today: a gentle Sunday nudge. In the journal: always there. */
  variant: 'nudge' | 'journal'
  hasRecent: boolean
}

/** On Sundays, when Gemini is on and the week has no review yet; the review then shows in today's journal below. */
export function SundayReviewNudge({ today }: { today: string }) {
  const ai = useAiSettings()
  const journal = useLiveQuery(() => db.journal.where('date').between(reviewDays(today)[0], today, true, true).toArray(), [today])
  if (!journal || !geminiReady(ai) || weekdayOf(today) !== 7 || hasRecentReview(journal, today)) return null
  return <WeeklyReview today={today} variant="nudge" hasRecent={false} />
}

/** Asks Gemini for a short look back at the week and saves it in the journal. */
export function WeeklyReview({ today, variant, hasRecent }: Props) {
  const ai = useAiSettings()
  const [state, setState] = useState<'idle' | 'working' | 'done' | { error: string }>('idle')

  async function generate() {
    setState('working')
    try {
      const [habits, logs, moods, journal, tasks] = await Promise.all([
        db.habits.toArray(),
        db.habitLogs.toArray(),
        db.moods.toArray(),
        db.journal.toArray(),
        db.tasks.toArray(),
      ])
      const text = await askGemini(ai.geminiKey, REVIEW_SYSTEM, [
        { role: 'user', text: buildReviewRequest({ habits, logs, moods, journal, tasks }, today) },
      ])
      await addEntry(today, text, { kind: 'review' })
      setState('done')
    } catch (e) {
      setState({ error: (e as Error).message })
    }
  }

  if (variant === 'nudge' && state === 'done') return null
  return (
    <section className={`rounded-2xl border border-border bg-surface p-4 ${variant === 'nudge' ? 'mb-6' : 'mt-5'}`}>
      <p className="font-medium">✨ Haftalık bakış</p>
      <p className="mt-0.5 text-sm text-muted">
        {variant === 'nudge'
          ? 'Hafta bitti; Gemini haftana bakıp kısa bir özet ve gelecek hafta için bir öneri yazsın.'
          : 'Son 7 günün yazılarına, ruh haline ve habit\'lerine bakıp kısa bir özet çıkarır.'}{' '}
        Bu haftanın verileri Gemini'ye gönderilir.
      </p>
      <button
        type="button"
        onClick={generate}
        disabled={state === 'working'}
        className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
      >
        {state === 'working' ? 'Gemini yazıyor…' : hasRecent || state === 'done' ? 'Yeniden oluştur' : 'Oluştur'}
      </button>
      {state === 'done' && <p className="mt-2 text-sm text-accent">Günlüğüne eklendi ✓</p>}
      {typeof state === 'object' && <p className="mt-2 text-sm text-p1">{state.error}</p>}
    </section>
  )
}
