import { Link, useLocation } from 'react-router'
import { SECTIONS, sectionOf, type SectionKey } from '../lib/sections'
import { HabitsIcon, JournalIcon, LibraryIcon, StatsIcon, TodayIcon } from './icons'

const ICONS: Record<SectionKey, typeof TodayIcon> = {
  today: TodayIcon,
  goals: HabitsIcon,
  journal: JournalIcon,
  library: LibraryIcon,
  progress: StatsIcon,
}

/** One tab per section; a section's tab opens its first page and stays lit on all of its pages. */
export function TabBar() {
  const active = sectionOf(useLocation().pathname)?.key
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {SECTIONS.map(({ key, label, tabs }) => {
          const Icon = ICONS[key]
          return (
            <li key={key}>
              <Link
                to={tabs[0].to}
                aria-current={active === key ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                  active === key ? 'text-accent' : 'text-muted'
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
