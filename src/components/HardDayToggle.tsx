import { setHardDay, type HardDayState } from '../db/hardDay'

type Props = {
  today: string
  state: HardDayState
}

/**
 * Declares today a hard day. The point is the day when everything looks like too much: a
 * smaller bar that can still be cleared beats a full list that gets abandoned. Off, it is one
 * quiet line; on, it says what changed and how to take it back.
 */
export function HardDayToggle({ today, state }: Props) {
  if (state.on) {
    return (
      <section className="mb-5 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">🌧️ Zor gün modu açık</h2>
          <button type="button" onClick={() => setHardDay(today, false)} className="tap-reach shrink-0 text-sm text-muted">
            Kapat
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          Bugün minimum yeter: dokunuş minimumu işaretler, yapamadığın için ceza yazılmaz. Seri için
          yine de en küçük adımı at.
        </p>
      </section>
    )
  }
  if (state.left <= 0) return null
  return (
    <button type="button" onClick={() => setHardDay(today, true)} className="tap-text -mt-3 mb-2 text-left text-sm text-muted">
      🌧️ Zor bir gün mü? Minimum yetsin · {state.left} hak
    </button>
  )
}
