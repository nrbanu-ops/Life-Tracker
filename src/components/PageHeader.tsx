import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { JournalIcon, LibraryIcon, SearchIcon, SettingsIcon, TimerIcon, TrophyIcon } from './icons'

type Props = {
  title: string
  subtitle?: string
  /** Replaces the search, journal, library, achievements, timer and settings links, e.g. with a back button. */
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <header className="flex items-start justify-between gap-4 pt-6 pb-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action ?? (
        <div className="-mr-2 flex">
          <Link
            to="/ara"
            aria-label="Ara"
            className="rounded-full p-1.5 text-muted transition-colors hover:text-text"
          >
            <SearchIcon width={22} height={22} />
          </Link>
          <Link
            to="/gunluk"
            aria-label="Günlük"
            className="rounded-full p-1.5 text-muted transition-colors hover:text-text"
          >
            <JournalIcon width={22} height={22} />
          </Link>
          <Link
            to="/kutuphane"
            aria-label="Kütüphane"
            className="rounded-full p-1.5 text-muted transition-colors hover:text-text"
          >
            <LibraryIcon width={22} height={22} />
          </Link>
          <Link
            to="/basarimlar"
            aria-label="Başarımlar"
            className="rounded-full p-1.5 text-muted transition-colors hover:text-text"
          >
            <TrophyIcon width={22} height={22} />
          </Link>
          <Link
            to="/zamanlayici"
            aria-label="Zamanlayıcı"
            className="rounded-full p-1.5 text-muted transition-colors hover:text-text"
          >
            <TimerIcon width={22} height={22} />
          </Link>
          <Link
            to="/ayarlar"
            aria-label="Ayarlar"
            className="rounded-full p-1.5 text-muted transition-colors hover:text-text"
          >
            <SettingsIcon width={22} height={22} />
          </Link>
        </div>
      )}
    </header>
  )
}
