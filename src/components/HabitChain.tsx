import { Fragment, type CSSProperties } from 'react'
import type { Habit, HabitLog } from '../db/types'
import { habitChain, holds, trackedFor, type LinkState } from '../lib/chain'
import { STREAK_UNIT } from '../lib/frequency'
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

/**
 * "Don't break the chain" for one habit: its last links joined while they hold, and under
 * them how long the chain is now, the longest it has been, the success rate since the habit
 * began, and how long it has been followed.
 */
export function HabitChain({ habit, logs, today, color }: Props) {
  const links = habitChain(habit, logs, today)
  if (links.length === 0) return null
  const { current, longest, unit } = streaks(habit, logs, today)
  const { rate } = successRate(habit, logs, toDateKey(new Date(habit.createdAt)), today, today)
  const name = STREAK_UNIT[unit]

  const summary = [
    current > 0 ? `🔗 ${current} ${name}` : longest > 0 ? 'Zincir koptu' : 'Zincir henüz başlamadı',
    longest > current && `en uzun ${longest} ${name}`,
    rate !== undefined && `%${Math.round(rate * 100)} başarı`,
    trackedFor(habit, today),
  ].filter(Boolean)

  return (
    <span className="mt-2 block" style={{ '--chain': color ?? 'var(--color-accent)' } as CSSProperties}>
      <span className="flex items-center" aria-hidden>
        {links.map((link, i) => (
          <Fragment key={link.key}>
            {i > 0 && <span className={`h-[3px] max-w-5 flex-1 ${joint(links[i - 1].state, link.state)}`} />}
            <span className={`shrink-0 rounded-full ${DOT[link.state]}`} />
          </Fragment>
        ))}
      </span>
      <span className="mt-1.5 block text-xs text-muted">
        <span className={current > 0 ? 'font-medium text-text' : ''}>{summary[0]}</span>
        {summary.slice(1).map((part) => ` · ${part}`)}
      </span>
    </span>
  )
}
