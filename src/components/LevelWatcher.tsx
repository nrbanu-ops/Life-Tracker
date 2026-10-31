import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { syncXpLedger, useLeveling } from '../db/leveling'
import type { Rank } from '../lib/leveling'
import { useLevelingOn } from '../lib/levelingSetting'
import { useTodayKey } from '../lib/useTodayKey'
import { RankBadge } from './LevelCard'

const GAIN_MS = 1600
const TOAST_MS = 5000

type Seen = { total: number; level: number; rank: Rank; titles: Set<string> }

/**
 * Freezes closed weeks into the XP ledger, and shows what XP does: a small "+14 XP" as it comes
 * in, a system message on a level up or a new title and a bigger card on a new rank.
 */
export function LevelWatcher() {
  const on = useLevelingOn()
  const today = useTodayKey()
  const state = useLeveling()
  const seen = useRef<Seen>(undefined)
  const [gain, setGain] = useState(0)
  const [message, setMessage] = useState<string>()
  const [rankUp, setRankUp] = useState<Rank>()

  useEffect(() => {
    void syncXpLedger(today)
  }, [today])

  useEffect(() => {
    if (!state) return
    const before = seen.current
    const earned = new Set(state.titles.filter((t) => t.earned).map((t) => t.id))
    seen.current = { total: state.total, level: state.level, rank: state.rank, titles: earned }
    // The first value is where the user already is: nothing to celebrate.
    if (!before || !on) return
    const delta = state.total - before.total
    if (delta >= 0.5) setGain((g) => g + delta)
    const fresh = state.titles.find((t) => t.earned && !before.titles.has(t.id))
    if (fresh) setMessage(`Unvan kazandın · ${fresh.name}`)
    if (state.level > before.level) {
      if (state.rank !== before.rank) setRankUp(state.rank)
      else setMessage(`Seviye atladın · Lv ${state.level}`)
    }
  }, [state, on])

  useEffect(() => {
    if (gain === 0) return
    const timer = window.setTimeout(() => setGain(0), GAIN_MS)
    return () => window.clearTimeout(timer)
  }, [gain])

  useEffect(() => {
    if (message === undefined) return
    const timer = window.setTimeout(() => setMessage(undefined), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [message])

  if (!on) return null
  return (
    <>
      {gain > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-fit animate-[toast-in_200ms_ease-out] rounded-full bg-accent px-3 py-1 text-sm font-medium text-surface shadow-md tabular-nums"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
          aria-live="polite"
        >
          +{Math.round(gain)} XP
        </div>
      )}

      {message !== undefined && (
        <Link
          to="/profil"
          onClick={() => setMessage(undefined)}
          role="status"
          className="fixed inset-x-4 z-40 mx-auto flex max-w-sm animate-[toast-in_260ms_ease-out] items-center gap-3 rounded-2xl border border-accent bg-surface px-4 py-3 shadow-lg"
          style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        >
          <span className="font-mono text-xs text-accent">[SİSTEM]</span>
          <span className="font-medium">{message}</span>
        </Link>
      )}

      {rankUp && (
        <button
          type="button"
          onClick={() => setRankUp(undefined)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          aria-label="Kapat"
        >
          <span className="flex w-full max-w-xs animate-[toast-in_300ms_ease-out] flex-col items-center gap-3 rounded-3xl border-2 border-accent bg-surface p-6 text-center shadow-xl">
            <span className="font-mono text-xs text-accent">[SİSTEM]</span>
            <RankBadge rank={rankUp} size="lg" />
            <span className="text-xl font-semibold">{rankUp}-Rank oldun</span>
            <span className="text-sm text-muted">{state && `Lv ${state.level}`} · Yükselmeye devam.</span>
          </span>
        </button>
      )}
    </>
  )
}
