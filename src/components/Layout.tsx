import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import { BackupManager } from './BackupManager'
import { TabBar } from './TabBar'
import { TimerBanner } from './TimerBanner'

export function Layout() {
  const { pathname } = useLocation()
  return (
    <div
      className="mx-auto max-w-lg px-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        // Leaves room for the fixed tab bar.
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
      }}
    >
      <BackupManager />
      <TimerBanner />
      {/* Screens load on first visit; the tab bar stays put meanwhile. Keyed so each screen fades in. */}
      <Suspense>
        <div key={pathname} className="animate-[page-in_180ms_ease-out]">
          <Outlet />
        </div>
      </Suspense>
      <TabBar />
    </div>
  )
}
