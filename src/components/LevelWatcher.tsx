import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { syncXpLedger, useLeveling } from '../db/leveling'
import type { Rank } from '../lib/leveling'
import { useLevelingOn } from '../lib/levelingSetting'
import { useTodayKey } from '../lib/useTodayKey'
import { levelText, RANK_COLOR, RANK_TITLE } from '../lib/levelingUi'
import { RankBadge } from './LevelCard'

const GAIN_MS = 1600
const TOAST_MS = 5000
const LEVEL_UP_MS = 4000

type Seen = { earned: number; penalty: number; level: number; rank: Rank; titles: Set<string> }

// The day the penalty window was last closed, so it opens once a day.
const PENALTY_SEEN = 'life-tracker:penalty-seen'

function penaltySeenOn(): string | undefined {
  try {
    return localStorage.getItem(PENALTY_SEEN) ?? undefined
  } catch {
    return undefined
  }
}

const PENALTY_RED = 'var(--color-sys-danger)'

const RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S']

/**
 * Freezes closed weeks into the XP ledger, and shows what XP does: a small "+14 XP" as it comes
 * in, a system message on a new title, a window on a level up and a bigger one on a new rank,
 * and in the morning what yesterday's misses cost.
 */
export function LevelWatcher() {
  const on = useLevelingOn()
  const today = useTodayKey()
  const state = useLeveling()
  const seen = useRef<Seen>(undefined)
  const [gain, setGain] = useState(0)
  const [message, setMessage] = useState<string>()
  const [levelUp, setLevelUp] = useState<number>()
  const [rankUp, setRankUp] = useState<Rank>()
  const [penaltyClosed, setPenaltyClosed] = useState(() => penaltySeenOn())

  useEffect(() => {
    void syncXpLedger(today)
  }, [today])

  useEffect(() => {
    if (!state) return
    const before = seen.current
    const titlesEarned = new Set(state.titles.filter((t) => t.earned).map((t) => t.id))
    const penalty = state.summary.sources.penalty ?? 0
    // XP earned leaving penalties out, so a fine doesn't hide the next "+XP".
    const earned = state.total - penalty
    // A new fine really lowers the level: getting back up is a level-up again.
    const fined = before !== undefined && penalty < before.penalty - 0.5
    // The highest point reached so far: unticking a habit and ticking it again only gets back
    // there, so it shows no new "+XP" and no second level-up.
    seen.current = {
      earned: Math.max(earned, before?.earned ?? 0),
      penalty,
      level: fined ? state.level : Math.max(state.level, before?.level ?? 0),
      rank: before && !fined && RANK_ORDER.indexOf(before.rank) > RANK_ORDER.indexOf(state.rank) ? before.rank : state.rank,
      titles: new Set([...titlesEarned, ...(before?.titles ?? [])]),
    }
    // The first value is where the user already is: nothing to celebrate.
    if (!before || !on) return
    const delta = earned - before.earned
    if (delta >= 0.5) setGain((g) => g + delta)
    const fresh = state.titles.find((t) => t.earned && !before.titles.has(t.id))
    if (fresh) setMessage(`Unvan kazandın · ${fresh.name}`)
    if (state.level > before.level) {
      if (RANK_ORDER.indexOf(state.rank) > RANK_ORDER.indexOf(before.rank)) setRankUp(state.rank)
      else setLevelUp(state.level)
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

  useEffect(() => {
    if (levelUp === undefined) return
    const timer = window.setTimeout(() => setLevelUp(undefined), LEVEL_UP_MS)
    return () => window.clearTimeout(timer)
  }, [levelUp])

  if (!on) return null
  const penalties = state?.penalties ?? []
  const showPenalty = penalties.length > 0 && penaltyClosed !== today && levelUp === undefined && !rankUp
  const closePenalty = () => {
    try {
      localStorage.setItem(PENALTY_SEEN, today)
    } catch {
      // Private mode: it opens again next time.
    }
    setPenaltyClosed(today)
  }
  return (
    <>
      {showPenalty && (
        <button
          type="button"
          onClick={closePenalty}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6"
          aria-label="Kapat"
        >
          <span
            role="alert"
            className="sys-window flex w-full max-w-xs animate-[sys-open_320ms_ease-out] flex-col gap-3 p-5 text-left"
            style={{ '--sys-accent': PENALTY_RED } as CSSProperties}
          >
            <span className="sys-label" style={{ color: PENALTY_RED }}>
              ◆ Ceza
            </span>
            <span className="font-mono text-lg font-bold tracking-[0.08em]" style={{ color: PENALTY_RED }}>
              GÖREV TAMAMLANMADI
            </span>
            <span className="text-sm text-sys-muted">Dün yapılmayanlar:</span>
            <ul className="flex flex-col gap-1 text-sm">
              {penalties.map((p) => (
                <li key={p.habitId} className="flex justify-between gap-3">
                  <span className="truncate">
                    {p.title}
                    {p.weekly && <span className="text-sys-muted"> · haftalık hedef</span>}
                  </span>
                  <span className="font-mono tabular-nums" style={{ color: PENALTY_RED }}>
                    {Math.round(p.xp)} XP
                  </span>
                </li>
              ))}
            </ul>
            <span className="flex justify-between border-t border-sys-line pt-2 font-mono text-sm font-semibold">
              <span>Toplam</span>
              <span style={{ color: PENALTY_RED }}>{Math.round(penalties.reduce((sum, p) => sum + p.xp, 0))} XP</span>
            </span>
            <span className="text-center text-xs text-sys-muted">Dokun, kapat</span>
          </span>
        </button>
      )}

      {gain > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-fit animate-[toast-in_200ms_ease-out] border border-sys-edge bg-sys-bg px-3 py-1 font-mono text-sm font-semibold text-sys-glow shadow-[0_0_12px_rgb(58_166_255/0.45)] tabular-nums"
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
          className="sys-window fixed inset-x-4 z-40 mx-auto flex max-w-sm animate-[sys-open_260ms_ease-out] flex-col gap-0.5 px-4 py-3"
          style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        >
          <span className="sys-label">◆ Bildirim</span>
          <span className="font-medium">{message}</span>
        </Link>
      )}

      {levelUp !== undefined && !rankUp && (
        <button
          type="button"
          onClick={() => setLevelUp(undefined)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
          aria-label="Kapat"
        >
          <span role="status" className="sys-window flex w-full max-w-xs animate-[sys-open_320ms_ease-out] flex-col items-center gap-2 p-6 text-center">
            <span className="sys-label">◆ Sistem</span>
            <span className="font-mono text-2xl font-bold tracking-[0.12em] text-sys-glow [text-shadow:0_0_12px_var(--color-sys-edge)]">
              SEVİYE ATLADIN
            </span>
            <span className="font-mono text-lg">{levelText(levelUp)}</span>
          </span>
        </button>
      )}

      {rankUp && (
        <button
          type="button"
          onClick={() => setRankUp(undefined)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6"
          aria-label="Kapat"
        >
          <span
            role="status"
            className="sys-window flex w-full max-w-xs animate-[sys-open_360ms_ease-out] flex-col items-center gap-3 p-6 text-center"
            style={{ '--sys-accent': RANK_COLOR[rankUp] } as CSSProperties}
          >
            <span className="sys-label">◆ Sistem</span>
            <RankBadge rank={rankUp} size="lg" />
            <span className="font-mono text-xl font-bold tracking-[0.1em]" style={{ color: RANK_COLOR[rankUp] }}>
              {rankUp}-RANK OLDUN
            </span>
            <span className="text-sm text-sys-muted">
              {RANK_TITLE[rankUp]}
              {state && ` · ${levelText(state.level)}`}
            </span>
          </span>
        </button>
      )}
    </>
  )
}
