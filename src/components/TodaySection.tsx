import { setHardDay, useHardDay } from '../db/hardDay'
import { HARD_DAYS_PER_MONTH } from '../lib/hardDay'
import { FOCUS_MAX } from '../lib/today'
import { setFocusMode, setHideDone, useFocusMode, useHideDone } from '../lib/todaySetting'
import { useTodayKey } from '../lib/useTodayKey'
import { Switch } from './Switch'

/**
 * How the Bugün screen behaves. The first two are device preferences and stay out of the
 * backup; the hard day switch is today's own record (it is data, and it expires at midnight).
 */
export function TodaySection() {
  const hideDone = useHideDone()
  const focusMode = useFocusMode()
  const today = useTodayKey()
  const hardDay = useHardDay(today)

  return (
    <section id="bugun" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-medium">Bugün ekranı</h2>

      <Switch label="Tamamlananları gizle" checked={hideDone} onChange={setHideDone} />
      <p className="mt-1 text-sm text-muted">
        İşaretlediğin habit'ler listeden çıkar; altta "✓ n tamamlandı · göster" ile geri gelirler.
      </p>

      <div className="mt-4 border-t border-border pt-4">
        <Switch label="Odak modu" checked={focusMode} onChange={setFocusMode} />
        <p className="mt-1 text-sm text-muted">
          Omurga olarak işaretlediğin en fazla {FOCUS_MAX} habit en üstte durur, geri kalanlar
          "Diğerleri" altında katlanır. Bir habit'i omurga yapmak için habit'i açıp{' '}
          <b>Omurga habit</b> kutusunu işaretle.
        </p>
      </div>

      {hardDay && (
        <div className="mt-4 border-t border-border pt-4">
          <Switch
            label="🌧️ Zor gün modu (bugün)"
            checked={hardDay.on}
            disabled={!hardDay.on && hardDay.left <= 0}
            onChange={(on) => void setHardDay(today, on)}
          />
          <p className="mt-1 text-sm text-muted">
            Sadece bugün için, gece kendiliğinden kapanır. Açıkken dokunuş minimumu işaretler ve
            yapamadığın günlük habit'e ceza yazılmaz; seriyi korumaz, en küçük adımı yine atman
            gerekir. Ayda {HARD_DAYS_PER_MONTH} hak:{' '}
            <b>{hardDay.left > 0 ? `${hardDay.left} hak kaldı` : 'bu ayın hakkı bitti'}</b>
            {hardDay.on && ' (kapatırsan bugünkü geri gelir)'}.
          </p>
        </div>
      )}
    </section>
  )
}
