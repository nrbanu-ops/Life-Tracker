import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatKg } from '../lib/weight'

export type WeightPoint = { label: string; detail: string; kg: number; trend: number }

/** Each weigh-in as a dot, the 7-day average as the line, the target as a dashed rule. */
export function WeightChart({ data, targetKg, height = 200 }: { data: WeightPoint[]; targetKg?: number; height?: number }) {
  const values = [...data.map((p) => p.kg), ...(targetKg !== undefined ? [targetKg] : [])]
  const domain = [Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
          tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
        />
        <YAxis domain={domain} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
        {targetKg !== undefined && (
          <ReferenceLine y={targetKg} stroke="var(--color-muted)" strokeDasharray="4 4" ifOverflow="extendDomain" />
        )}
        <Tooltip
          cursor={{ stroke: 'var(--color-border)' }}
          content={({ active, payload }) => {
            const p = active ? (payload?.[0]?.payload as WeightPoint | undefined) : undefined
            if (!p) return null
            return (
              <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm">
                <div className="font-medium">{p.detail}</div>
                <div className="text-muted">
                  {formatKg(p.kg)} kg · 7 gün ort. {formatKg(p.trend)} kg
                </div>
              </div>
            )
          }}
        />
        <Line dataKey="kg" stroke="none" dot={{ r: 3, strokeWidth: 0, fill: 'var(--color-muted)' }} isAnimationActive={false} />
        <Line dataKey="trend" stroke="var(--color-accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
