import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import { saveWeekPlan } from '../db/weekPlan'
import type { WeekPlan } from '../db/types'
import { fromDateKey, weekRange } from '../lib/date'
import { saveErrorMessage } from '../lib/saveError'
import { WEEK_PLAN_MAX } from '../lib/weekPlan'
import { BottomSheet } from './BottomSheet'

type Props = {
  open: boolean
  /** Monday's day key. */
  week: string
  plan: WeekPlan | null
  onClose: () => void
}

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

/** Writes the week's priorities. The form is mounted fresh each time, so it always opens on the stored plan. */
export function WeekPlanSheet({ open, week, plan, onClose }: Props) {
  return (
    <BottomSheet open={open} title="Bu haftanın öncelikleri" onClose={onClose}>
      {open && <PlanForm week={week} plan={plan} onClose={onClose} />}
    </BottomSheet>
  )
}

function PlanForm({ week, plan, onClose }: Omit<Props, 'open'>) {
  const [texts, setTexts] = useState(() =>
    Array.from({ length: WEEK_PLAN_MAX }, (_, i) => plan?.priorities[i]?.text ?? ''),
  )
  const [note, setNote] = useState(plan?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState<string>()

  const { start, end } = weekRange(week)
  const span = `${format(fromDateKey(start), 'd MMMM', { locale: tr })} – ${format(fromDateKey(end), 'd MMMM', { locale: tr })}`

  const save = async () => {
    if (saving) return
    setSaving(true)
    setFailed(undefined)
    try {
      await saveWeekPlan(week, texts, note)
    } catch (error) {
      // Nothing is cleared: what was typed stays on screen so saving can be tried again.
      setFailed(saveErrorMessage(error))
      setSaving(false)
      return
    }
    onClose()
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="-mt-2 text-sm text-muted">
        {span} · Üçten fazlası plan değil, yapılacaklar listesi olur. Boş bıraktıkların kaydedilmez.
      </p>
      {texts.map((text, i) => (
        <input
          key={i}
          value={text}
          onChange={(e) => setTexts((all) => all.map((t, n) => (n === i ? e.target.value : t)))}
          placeholder={`${i + 1}. öncelik`}
          aria-label={`${i + 1}. öncelik`}
          maxLength={120}
          className={inputClass}
          autoFocus={i === 0 && text === ''}
        />
      ))}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Not (isteğe bağlı)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Hangi gün neyi yapacaksın, nelere dikkat edeceksin…"
          rows={2}
          maxLength={500}
          className={`${inputClass} resize-y`}
        />
      </label>
      {failed && <p className="text-sm text-p1">{failed}</p>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-1 rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
      >
        Kaydet
      </button>
    </div>
  )
}
