import { Link } from 'react-router'
import { useLeveling } from '../db/leveling'
import { emergencyText, XP, type Rank } from '../lib/leveling'
import { useLevelingOn, useWornTitle } from '../lib/levelingSetting'
import { levelText, RANK_COLOR, RANK_TITLE } from '../lib/levelingUi'
import { SystemBar } from './SystemWindow'

/** The rank letter in a glowing diamond, in the rank's colour. */
export function RankBadge({ rank, size = 'md' }: { rank: Rank; size?: 'md' | 'lg' }) {
  const big = size === 'lg'
  const color = RANK_COLOR[rank]
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center ${big ? 'h-24 w-24 text-4xl' : 'h-12 w-12 text-xl'}`}
      aria-label={`${rank} rank`}
    >
      <span
        className="absolute inset-[15%] rotate-45 border-2"
        style={{
          borderColor: color,
          background: `color-mix(in oklab, ${color} 14%, transparent)`,
          boxShadow: `0 0 12px color-mix(in oklab, ${color} 45%, transparent)`,
        }}
      />
      <span className="relative font-mono font-bold" style={{ color, textShadow: `0 0 8px ${color}` }}>
        {rank}
      </span>
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
    <Link to="/profil" className="sys-window mb-5 block animate-[sys-open_280ms_ease-out] p-4">
      <div className="flex items-center gap-3">
        <RankBadge rank={rank} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between gap-2 font-mono">
            <span className="font-semibold">
              {levelText(level)} <span className="text-sm font-normal" style={{ color: RANK_COLOR[rank] }}>{rank}-RANK</span>
            </span>
            <span className="text-xs text-sys-muted tabular-nums">
              {Math.floor(into)} / {needed} XP
            </span>
          </div>
          <SystemBar ratio={into / needed} />
          <div className="mt-1.5 flex justify-between gap-2 text-xs text-sys-muted">
            <span className="min-w-0 truncate">{title?.name ?? RANK_TITLE[rank]}</span>
            {today > 0 && <span className="shrink-0 font-mono text-sys-glow tabular-nums">BUGÜN +{Math.round(today)} XP</span>}
          </div>
        </div>
      </div>
      {quest.total > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 border border-sys-line bg-sys-panel px-3 py-2 text-sm">
          <span className="sys-label">Günlük görev</span>
          <span className="font-mono tabular-nums">
            {quest.complete ? <span className="text-sys-glow">✓ +{XP.quest} XP</span> : `${quest.done}/${quest.total}`}
          </span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 border border-sys-warn/40 bg-sys-panel px-3 py-2 text-sm">
        <span className="min-w-0 truncate">
          <span className="sys-label mr-2 text-sys-warn">Acil</span>
          {emergencyText(emergency)}
        </span>
        <span className="shrink-0 font-mono tabular-nums">
          {emergency.met ? <span className="text-sys-warn">✓ +{XP.emergency} XP</span> : `${emergency.done}/${emergency.target}`}
        </span>
      </div>
    </Link>
  )
}
