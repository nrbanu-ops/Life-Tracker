import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Achievement } from '../lib/achievements'
import { fromDateKey } from '../lib/date'
import { ProgressBar } from './ProgressBar'

export function AchievementList({ achievements, color }: { achievements: Achievement[]; color?: string }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {achievements.map((a) => (
        <AchievementRow key={a.id} achievement={a} color={color} />
      ))}
    </ul>
  )
}

function AchievementRow({ achievement: a, color }: { achievement: Achievement; color?: string }) {
  const shown = Math.min(a.current, a.target)
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl ${
          a.earned ? 'bg-accent-soft' : 'bg-bg opacity-45 grayscale'
        }`}
        aria-hidden
      >
        {a.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium ${a.earned ? '' : 'text-muted'}`}>{a.title}</span>
        <span className="block text-xs text-muted">{a.description}</span>
        {!a.earned && a.target > 1 && (
          <span className="mt-1.5 flex items-center gap-2">
            <span className="flex-1">
              <ProgressBar ratio={shown / a.target} color={color} />
            </span>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {a.percent ? `%${shown}` : `${shown}/${a.target}`}
            </span>
          </span>
        )}
      </span>
      {a.earned && (
        <span className="shrink-0 text-xs text-muted">
          {a.unlockedAt ? format(fromDateKey(a.unlockedAt), 'd MMM', { locale: tr }) : '✓'}
        </span>
      )}
    </li>
  )
}
