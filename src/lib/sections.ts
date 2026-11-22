/**
 * The app's main sections: each is one tab of the bottom bar, and the ones with several pages show
 * those pages as tabs under the title. Bugün is the home and has none.
 */
export type SectionKey = 'today' | 'goals' | 'journal' | 'library' | 'progress'

export type Section = {
  key: SectionKey
  label: string
  /** The section's pages, first one opened from the bottom bar. */
  tabs: { to: string; label: string }[]
  /** Other pages that belong to the section without being a tab of it. */
  also?: string[]
}

export const SECTIONS: Section[] = [
  { key: 'today', label: 'Bugün', tabs: [{ to: '/', label: 'Bugün' }] },
  {
    key: 'goals',
    label: 'Hedefler',
    tabs: [
      { to: '/habitler', label: "Habit'ler" },
      { to: '/projeler', label: 'Projeler' },
      { to: '/gorevler', label: 'Görevler' },
    ],
    also: ['/asistan'],
  },
  {
    key: 'journal',
    label: 'Günlük',
    tabs: [
      { to: '/gunluk', label: 'Yazılar' },
      { to: '/takvim', label: 'Takvim' },
    ],
  },
  { key: 'library', label: 'Kütüphane', tabs: [{ to: '/kutuphane', label: 'Kütüphane' }] },
  {
    key: 'progress',
    label: 'İlerleme',
    tabs: [
      { to: '/istatistik', label: 'İstatistik' },
      { to: '/kilo', label: 'Kilo' },
      { to: '/basarimlar', label: 'Başarımlar' },
    ],
    also: ['/profil', '/ozet'],
  },
]

/** The section a path belongs to (a project's page belongs to Hedefler); undefined for Ara, Ayarlar … */
export function sectionOf(pathname: string): Section | undefined {
  if (pathname === '/') return SECTIONS[0]
  const top = '/' + (pathname.split('/')[1] ?? '')
  return SECTIONS.find((s) => s.key !== 'today' && [...s.tabs.map((t) => t.to), ...(s.also ?? [])].includes(top))
}
