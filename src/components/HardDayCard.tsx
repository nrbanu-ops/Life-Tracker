import { setHardDay } from '../db/hardDay'

type Props = {
  today: string
}

/**
 * Shown on Bugün only while today is a hard day: taps behave differently then, so the screen
 * has to say so and offer the way back. Turning the mode on lives in Ayarlar → Bugün ekranı.
 */
export function HardDayCard({ today }: Props) {
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
