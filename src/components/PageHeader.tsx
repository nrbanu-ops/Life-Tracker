import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { sectionOf } from '../lib/sections'
import { SearchIcon, SettingsIcon, TimerIcon } from './icons'

type Props = {
  title: string
  subtitle?: string
  /** Replaces the search, timer and settings buttons, e.g. with a back button. */
  action?: ReactNode
}

// 22px of icon inside 42px of button: three of these fit beside any title without crowding it.
const iconButton = 'rounded-full p-2.5 text-muted transition-colors hover:text-text'

export function PageHeader({ title, subtitle, action }: Props) {
  const { pathname } = useLocation()
  const section = sectionOf(pathname)
  // Only on the section's own pages: a project's page keeps its back button and no tabs.
  const tabs = section && section.tabs.length > 1 && section.tabs.some((t) => t.to === pathname) ? section.tabs : undefined

  return (
    <header className="pt-6 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {action ?? (
          <div className="-mt-1.5 -mr-2.5 flex shrink-0">
            <Link to="/ara" aria-label="Ara" className={iconButton}>
              <SearchIcon width={22} height={22} />
            </Link>
            <Link to="/zamanlayici" aria-label="Zamanlayıcı" className={iconButton}>
              <TimerIcon width={22} height={22} />
            </Link>
            <Link to="/ayarlar" aria-label="Ayarlar" className={iconButton}>
              <SettingsIcon width={22} height={22} />
            </Link>
          </div>
        )}
      </div>
      {tabs && (
        <nav aria-label={section!.label} className="section-tabs mt-3">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              replace
              className={({ isActive }) =>
                `tap-text shrink-0 border-b-2 px-3 text-sm transition-colors ${
                  isActive ? 'border-accent font-medium text-text' : 'border-transparent text-muted hover:text-text'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
