import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { BottomSheet } from './BottomSheet'
import { JournalIcon, LibraryIcon, MoreIcon, SearchIcon, SettingsIcon, TimerIcon, TrophyIcon } from './icons'

type Props = {
  title: string
  subtitle?: string
  /** Replaces the search, journal and "more" buttons, e.g. with a back button. */
  action?: ReactNode
}

// 22px of icon inside 42px of button: three of these fit beside any title without crowding it.
const iconButton = 'rounded-full p-2.5 text-muted transition-colors hover:text-text'

/** Everything that is not opened every day lives behind "more", with its name next to its icon. */
const MORE = [
  { to: '/kutuphane', label: 'Kütüphane', detail: 'Kitap, film, dizi, oyun, yer', Icon: LibraryIcon },
  { to: '/basarimlar', label: 'Başarımlar', detail: 'Kazandıkların ve sıradakiler', Icon: TrophyIcon },
  { to: '/zamanlayici', label: 'Zamanlayıcı', detail: 'Kronometre ve geri sayım', Icon: TimerIcon },
  { to: '/ayarlar', label: 'Ayarlar', detail: 'Tema, yedek, hatırlatma', Icon: SettingsIcon },
]

export function PageHeader({ title, subtitle, action }: Props) {
  const [more, setMore] = useState(false)

  return (
    <header className="flex items-start justify-between gap-4 pt-6 pb-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action ?? (
        <div className="-mt-1.5 -mr-2.5 flex shrink-0">
          <Link to="/ara" aria-label="Ara" className={iconButton}>
            <SearchIcon width={22} height={22} />
          </Link>
          <Link to="/gunluk" aria-label="Günlük" className={iconButton}>
            <JournalIcon width={22} height={22} />
          </Link>
          <button type="button" onClick={() => setMore(true)} aria-label="Daha fazla" className={iconButton}>
            <MoreIcon width={22} height={22} />
          </button>
          <BottomSheet open={more} title="Daha fazla" onClose={() => setMore(false)}>
            <ul className="-mt-1 flex flex-col">
              {MORE.map(({ to, label, detail, Icon }) => (
                <li key={to}>
                  <Link to={to} onClick={() => setMore(false)} className="flex items-center gap-4 rounded-xl px-1 py-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg text-accent">
                      <Icon width={22} height={22} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{label}</span>
                      <span className="block truncate text-sm text-muted">{detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </BottomSheet>
        </div>
      )}
    </header>
  )
}
