import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type RatePoint = {
  label: string
  /** Shown in the tooltip, e.g. "12–18 Ekim". */
  detail: string
  /** 0–100, or null when nothing was planned (no bar). */
  value: number | null
  done: number
  planned: number
}

type Props = {
  data: RatePoint[]
  height?: number
}

/** Success rate bars, one series: accent bars on a quiet 0–100% axis, tooltip on hover/tap. */
export function RateChart({ data, height = 180 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tickFormatter={(v: number) => `%${v}`}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-bg)' }}
          content={({ active, payload }) => {
            const point = active ? (payload?.[0]?.payload as RatePoint | undefined) : undefined
            if (!point) return null
            return (
              <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm">
                <div className="font-medium">{point.detail}</div>
                <div className="text-muted">
                  {point.value === null ? 'Planlı gün yok' : `%${Math.round(point.value)} · ${point.done}/${point.planned}`}
                </div>
              </div>
            )
          }}
        />
        <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
