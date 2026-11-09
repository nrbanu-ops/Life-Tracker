import { setFocusMode, setHideDone, useFocusMode, useHideDone } from '../lib/todaySetting'
import { FOCUS_MAX } from '../lib/today'
import { Switch } from './Switch'

/** How the Bugün screen is laid out. Device preferences, so they are not backed up. */
export function TodaySection() {
  const hideDone = useHideDone()
  const focusMode = useFocusMode()

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
    </section>
  )
}
