import { useState } from 'react'
import { setLibraryGoals } from '../db/library'
import type { LibraryKind } from '../db/types'
import { KIND_LABEL, kindUnit, LIBRARY_KINDS as KINDS, type GoalProgress } from '../lib/library'
import { BottomSheet } from './BottomSheet'
import { ProgressRing } from './ProgressRing'

type Props = {
  year: number
  progress: GoalProgress[]
}

const unit = kindUnit

/** The year's goals as rings, or an invitation to set one. */
export function LibraryGoals({ year, progress }: Props) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      {progress.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mb-5 w-full rounded-2xl border border-dashed border-border px-4 py-3 text-left text-sm text-muted"
        >
          🎯 {year} için hedef koy, ör. "24 kitap"
        </button>
      ) : (
        <section className="mb-5 rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">{year} hedeflerin</h2>
            <button type="button" onClick={() => setEditing(true)} className="text-sm text-muted">
              Düzenle
            </button>
          </div>
          <ul className="flex flex-wrap justify-around gap-4">
            {progress.map((goal) => (
              <li key={goal.kind} className="flex flex-col items-center gap-1">
                <ProgressRing
                  done={goal.done}
                  total={goal.target}
                  label={`${goal.target} ${unit(goal.kind)} hedefinden ${goal.done} tanesi bitti`}
                />
                <span className="text-xs text-muted">
                  {goal.done >= goal.target ? `🎉 ${unit(goal.kind)}` : unit(goal.kind)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BottomSheet open={editing} title={`${year} hedeflerin`} onClose={() => setEditing(false)}>
        {editing && <GoalForm year={year} progress={progress} onDone={() => setEditing(false)} />}
      </BottomSheet>
    </>
  )
}

function GoalForm({ year, progress, onDone }: Props & { onDone: () => void }) {
  // Text while typing; an empty field means no goal for that kind.
  const [targets, setTargets] = useState<Record<LibraryKind, string>>(() => {
    const initial: Record<LibraryKind, string> = { book: '', movie: '', series: '', game: '', place: '', other: '' }
    for (const goal of progress) initial[goal.kind] = String(goal.target)
    return initial
  })

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const parsed: Partial<Record<LibraryKind, number>> = {}
        for (const kind of KINDS) {
          const n = Math.floor(Number(targets[kind]))
          if (n > 0) parsed[kind] = Math.min(n, 9999)
        }
        await setLibraryGoals(year, parsed)
        onDone()
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-muted">Bu yıl kaç tane bitirmek istiyorsun? Boş bıraktığın türün hedefi olmaz.</p>
      {KINDS.map((kind) => (
        <label key={kind} className="flex items-center justify-between gap-3">
          <span>{KIND_LABEL[kind]}</span>
          <input
            value={targets[kind]}
            onChange={(e) => setTargets((t) => ({ ...t, [kind]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            inputMode="numeric"
            placeholder="–"
            aria-label={`${KIND_LABEL[kind]} hedefi`}
            className="w-24 rounded-xl border border-border bg-bg px-3 py-2.5 text-right outline-none focus:border-accent"
          />
        </label>
      ))}
      <button type="submit" className="rounded-xl bg-accent py-3 font-medium text-surface">
        Kaydet
      </button>
    </form>
  )
}
