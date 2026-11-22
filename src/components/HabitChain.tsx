import { Fragment } from 'react'
import type { Habit, HabitLog } from '../db/types'
import { habitChain, holds, trackedFor, type ChainLink, type LinkState } from '../lib/chain'
import { chainColors } from '../lib/chainUi'
import { STREAK_UNIT, type StreakUnit } from '../lib/frequency'
import { streaks, successRate } from '../lib/stats'
import { toDateKey } from '../lib/date'

type Props = {
  habit: Habit
  /** All of this habit's logs. */
  logs: HabitLog[]
  today: string
  /** The habit's project colour; the app's accent when absent. */
  color?: string
}

const DOT: Record<LinkState, string> = {
  done: 'h-3.5 w-3.5 bg-(--chain)',
  minimum: 'h-3.5 w-3.5 border-2 border-(--chain) bg-[color-mix(in_oklab,var(--chain)_30%,transparent)]',
  excused: 'h-2 w-2 bg-(--chain) opacity-50',
  missed: 'h-3.5 w-3.5 border-2 border-border',
  open: 'h-3.5 w-3.5 border-2 border-dashed border-(--chain)',
}

/** What joins a link to the one after it: the chain itself, a lighter reach toward what is still open, or a gap. */
const joint = (from: LinkState, to: LinkState): string =>
  !holds(from) ? '' : holds(to) ? 'bg-(--chain)' : to === 'open' ? 'bg-(--chain) opacity-30' : ''

type SummaryProps = Pick<Props, 'habit' | 'logs' | 'today'>

/**
 * One line under a chain: how long it is now, the longest it has been, the success rate since
 * the habit began, and how long the habit has been followed.
 */
export function ChainSummary({ habit, logs, today }: SummaryProps) {
  const { current, longest, unit } = streaks(habit, logs, today)
  const { rate } = successRate(habit, logs, toDateKey(new Date(habit.createdAt)), today, today)
  const name = STREAK_UNIT[unit]
  const parts = [
    current > 0 ? `🔗 ${current} ${name}` : longest > 0 ? 'Zincir koptu' : 'Zincir henüz başlamadı',
    longest > current && `en uzun ${longest} ${name}`,
    rate !== undefined && `%${Math.round(rate * 100)} başarı`,
    trackedFor(habit, today),
  ].filter(Boolean)

  return (
    <span className="block text-xs text-muted">
      <span className={current > 0 ? 'font-medium text-text' : ''}>{parts[0]}</span>
      {parts.slice(1).map((part) => ` · ${part}`)}
    </span>
  )
}

/** "Don't break the chain" for one habit: its last links joined while they hold, and the summary under them. */
export function HabitChain({ habit, logs, today, color }: Props) {
  const links = habitChain(habit, logs, today)
  if (links.length === 0) return null

  return (
    <span className="mt-2 block" style={chainColors(color)}>
      <span className="mb-1.5 flex items-center" aria-hidden>
        {links.map((link, i) => (
          <Fragment key={link.key}>
            {i > 0 && <span className={`h-[3px] max-w-5 flex-1 ${joint(links[i - 1].state, link.state)}`} />}
            <span className={`shrink-0 rounded-full ${DOT[link.state]}`} />
          </Fragment>
        ))}
      </span>
      <ChainSummary habit={habit} logs={logs} today={today} />
    </span>
  )
}

/** What Bugün shows at the end of a habit's row: its last links and how long the chain is now. */
export type MiniChainData = { links: ChainLink[]; current: number; unit: StreakUnit }

const MINI_DOT: Record<LinkState, string> = {
  done: 'h-2 w-2 bg-(--chain)',
  minimum: 'h-2 w-2 border border-(--chain) bg-[color-mix(in_oklab,var(--chain)_30%,transparent)]',
  excused: 'h-1 w-1 bg-(--chain) opacity-50',
  missed: 'h-2 w-2 border border-border',
  open: 'h-2 w-2 border border-dashed border-(--chain)',
}

/** A small chain for a list row: the same links, smaller, with the current length under them. */
export function MiniChain({ chain, color }: { chain: MiniChainData; color?: string }) {
  if (chain.links.length === 0) return null
  return (
    <span className="flex shrink-0 flex-col items-end gap-1" style={chainColors(color)}>
      <span className="flex items-center" aria-hidden>
        {chain.links.map((link, i) => (
          <Fragment key={link.key}>
            {i > 0 && <span className={`h-px w-1 ${joint(chain.links[i - 1].state, link.state)}`} />}
            <span className={`shrink-0 rounded-full ${MINI_DOT[link.state]}`} />
          </Fragment>
        ))}
      </span>
      {chain.current > 0 && (
        <span className="text-[11px] leading-none text-muted tabular-nums">
          🔗 {chain.current} {STREAK_UNIT[chain.unit]}
        </span>
      )}
    </span>
  )
}
