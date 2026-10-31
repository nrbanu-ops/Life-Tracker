import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Level } from '../db/types'
import { ENERGY_COLOR, ENERGY_EMOJI, MOOD_COLOR, MOOD_EMOJI } from '../lib/mood'

export type MoodPoint = { label: string; detail: string; mood: number | null; energy: number | null }

/** Mood and energy over days on one 1–5 scale; days without a value leave a gap. */
export function MoodChart({ data }: { data: MoodPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
          tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
        />
        <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
        <Tooltip
          cursor={{ stroke: 'var(--color-border)' }}
          content={({ active, payload }) => {
            const p = active ? (payload?.[0]?.payload as MoodPoint | undefined) : undefined
            if (!p) return null
            return (
              <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm">
                <div className="font-medium">{p.detail}</div>
                <div className="text-muted">
                  Ruh hali {p.mood ? MOOD_EMOJI[p.mood as Level] : '–'} · Enerji {p.energy ? ENERGY_EMOJI[p.energy as Level] : '–'}
                </div>
              </div>
            )
          }}
        />
        <Line dataKey="mood" stroke={MOOD_COLOR} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: MOOD_COLOR }} connectNulls isAnimationActive={false} />
        <Line dataKey="energy" stroke={ENERGY_COLOR} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: ENERGY_COLOR }} connectNulls isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
