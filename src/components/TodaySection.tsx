import { setHideDone, useHideDone } from '../lib/todaySetting'
import { Switch } from './Switch'

/** How the Bugün screen is laid out. Device preferences, so they are not backed up. */
export function TodaySection() {
  const hideDone = useHideDone()

  return (
    <section id="bugun" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-medium">Bugün ekranı</h2>
      <Switch label="Tamamlananları gizle" checked={hideDone} onChange={setHideDone} />
      <p className="mt-1 text-sm text-muted">
        İşaretlediğin habit'ler listeden çıkar; altta "✓ n tamamlandı · göster" ile geri gelirler.
      </p>
    </section>
  )
}
