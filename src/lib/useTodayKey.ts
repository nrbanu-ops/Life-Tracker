import { useEffect, useState } from 'react'
import { todayKey } from './date'

/** Today's date key, kept fresh when the app stays open past midnight. */
export function useTodayKey(): string {
  const [key, setKey] = useState(todayKey)

  useEffect(() => {
    const refresh = () => setKey(todayKey())
    const timer = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return key
}
