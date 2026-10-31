import { Link } from 'react-router'
import { useLeveling } from '../db/leveling'
import { emergencyText, XP, type Rank } from '../lib/leveling'
import { useLevelingOn, useWornTitle } from '../lib/levelingSetting'
import { ProgressBar } from './ProgressBar'

/** The rank letter in a small square; S gets gold. */
export function RankBadge({ rank, size = 'md' }: { rank: Rank; size?: 'md' | 'lg' }) {
  const big = size === 'lg'
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl border-2 font-bold ${
        big ? 'h-20 w-20 text-4xl' : 'h-11 w-11 text-xl'
      }`}
      style={
        rank === 'S'
          ? { borderColor: '#d08a2e', color: '#d08a2e', background: 'color-mix(in oklab, #d08a2e 12%, transparent)' }
          : { borderColor: 'var(--color-accent)', color: 'var(--color-accent)', background: 'var(--color-accent-soft)' }
      }
      aria-label={`${rank} rank`}
    >
      {rank}
    </span>
  )
}

/** Today screen: level, XP toward the next one, the daily and weekly quests. Opens the profile. */
export function LevelCard() {
  const on = useLevelingOn()
  const state = useLeveling()
  const worn = useWornTitle()
  if (!on || !state) return null
  const { level, into, needed, rank, quest, today, emergency } = state
  const title = state.titles.find((t) => t.id === worn && t.earned)
  return (
    <Link to="/profil" className="mb-5 block rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <RankBadge rank={rank} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="font-medium">
              Lv {level}{' '}
              <span className="text-sm font-normal text-muted">
                · {rank}-Rank{title && ` · ${title.name}`}
              </span>
            </span>
            <span className="text-xs text-muted tabular-nums">
              {Math.floor(into)} / {needed} XP
            </span>
          </div>
          <ProgressBar ratio={into / needed} />
          {today > 0 && <p className="mt-1.5 text-xs text-muted tabular-nums">Bugün +{Math.round(today)} XP</p>}
        </div>
      </div>
      {quest.total > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent-soft px-3 py-2 text-sm">
          <span>
            <span className="mr-1.5 font-mono text-xs text-accent">[SİSTEM]</span>Günlük görev
          </span>
          <span className="font-medium tabular-nums">
            {quest.complete ? `Tamamlandı · +${XP.quest} XP` : `${quest.done}/${quest.total}`}
          </span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-p2/40 px-3 py-2 text-sm">
        <span className="min-w-0 truncate">
          <span className="mr-1.5 font-mono text-xs text-p2">[ACİL GÖREV]</span>
          {emergencyText(emergency)}
        </span>
        <span className="shrink-0 font-medium tabular-nums">
          {emergency.met ? `✓ +${XP.emergency} XP` : `${emergency.done}/${emergency.target}`}
        </span>
      </div>
    </Link>
  )
}
