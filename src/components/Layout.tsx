import { Outlet } from 'react-router'
import { TabBar } from './TabBar'
import { TimerBanner } from './TimerBanner'

export function Layout() {
  return (
    <div
      className="mx-auto max-w-lg px-4"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        // Leaves room for the fixed tab bar.
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
      }}
    >
      <TimerBanner />
      <Outlet />
      <TabBar />
    </div>
  )
}
