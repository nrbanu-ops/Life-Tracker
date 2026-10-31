import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'

export function StatsPage() {
  return (
    <>
      <PageHeader title="İstatistik" />
      <EmptyState
        title="Gösterilecek veri yok"
        text="Habit'lerini işaretledikçe seriler ve grafikler burada görünecek."
      />
    </>
  )
}
