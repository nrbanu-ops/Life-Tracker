import { NavLink } from 'react-router'
import { CalendarIcon, HabitsIcon, ProjectsIcon, StatsIcon, TodayIcon } from './icons'

const tabs = [
  { to: '/', label: 'Bugün', Icon: TodayIcon },
  { to: '/takvim', label: 'Takvim', Icon: CalendarIcon },
  { to: '/projeler', label: 'Projeler', Icon: ProjectsIcon },
  { to: '/habitler', label: "Habit'ler", Icon: HabitsIcon },
  { to: '/istatistik', label: 'İstatistik', Icon: StatsIcon },
]

export function TabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
