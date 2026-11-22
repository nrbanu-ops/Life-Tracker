import { useState } from 'react'
import { Link } from 'react-router'
import { setWeight, useWeights } from '../db/weight'
import { changeOn, formatKg, parseKg, weightProgress } from '../lib/weight'

type Props = {
  today: string
}

export const weightInputClass =
  'w-24 rounded-xl border border-border bg-bg px-3 py-2 text-right outline-none focus:border-accent'

/** Bugün: a quick weigh-in, then the day's weight, the change and what is left to the target. */
export function WeightCard({ today }: Props) {
  const data = useWeights()
  const [text, setText] = useState('')
  if (!data) return null
  const entry = data.entries.find((e) => e.date === today)
  const kg = parseKg(text)
  const change = changeOn(data.entries, today)
  const progress = weightProgress(data.entries, data.targetKg)

  return (
    <section className="mb-5 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium">⚖️ Kilo</h2>
        <Link to="/kilo" className="tap-reach shrink-0 text-sm text-muted">
          Tümü ›
        </Link>
      </div>
      {entry ? (
        <p className="mt-1 text-sm text-muted">
          Bugün <span className="font-medium text-text">{formatKg(entry.kg)} kg</span>
          {change !== undefined && change !== 0 && ` · ${change < 0 ? '↓' : '↑'} ${formatKg(Math.abs(change))} kg`}
          {progress?.left !== undefined &&
            (progress.left > 0 ? ` · hedefe ${formatKg(progress.left)} kg` : ' · hedefe ulaştın 🎉')}
        </p>
      ) : (
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (kg === undefined) return
            void setWeight(today, kg)
            setText('')
          }}
        >
          <input
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={data.entries.at(-1) ? formatKg(data.entries.at(-1)!.kg) : '75,0'}
            aria-label="Bugünkü kilo"
            className={weightInputClass}
          />
          <span className="text-sm text-muted">kg</span>
          <button
            type="submit"
            disabled={kg === undefined}
            className="ml-auto rounded-full bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            Kaydet
          </button>
        </form>
      )}
    </section>
  )
}
