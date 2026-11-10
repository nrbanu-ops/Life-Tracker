import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import { recordRelapse } from '../db/habits'
import type { Habit } from '../db/types'
import { formatElapsed, quitStats } from '../lib/quit'
import { BottomSheet } from './BottomSheet'

type Props = {
  habit?: Habit
  now: Date
  onClose: () => void
}

/** Details of a quit habit and the "I started again" reset. */
export function QuitSheet({ habit, now, onClose }: Props) {
  return (
    <BottomSheet open={habit !== undefined} title={habit?.title ?? ''} onClose={onClose}>
      {habit && <Details key={habit.id} habit={habit} now={now} onClose={onClose} />}
    </BottomSheet>
  )
}

function Details({ habit, now, onClose }: Required<Props>) {
  const [confirming, setConfirming] = useState(false)
  const stats = quitStats(habit, now)

  const rows = [
    ['Şu anki süre', formatElapsed(stats.currentMs)],
    ['En uzun süre', formatElapsed(stats.longestMs)],
    ['Başlangıç', format(stats.currentStart, 'd MMMM yyyy, HH:mm', { locale: tr })],
    ['Yeniden başlama', stats.restarts === 0 ? 'Hiç' : `${stats.restarts} kez`],
  ]

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-border rounded-2xl bg-bg">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {confirming ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-border p-4">
          {/* The last moment the reason can still change the answer. */}
          {habit.why && <p className="text-sm font-medium">Bırakma sebebin: {habit.why}</p>}
          <p className="text-sm">
            Sayaç sıfırlanacak. En uzun süren kayıtlı kalır. Olur böyle şeyler, yeniden
            başlamak da bir adım.
          </p>
          <button
            type="button"
            onClick={async () => {
              await recordRelapse(habit.id)
              onClose()
            }}
            className="rounded-xl bg-accent py-3 font-medium text-surface"
          >
            Evet, sayacı sıfırla
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-xl py-2 text-sm text-muted"
          >
            Vazgeç
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-xl bg-bg px-4 py-3 text-left font-medium"
        >
          Tekrar başladım
          <span className="block text-sm font-normal text-muted">Sayacı şimdiden yeniden başlat</span>
        </button>
      )}
    </div>
  )
}
