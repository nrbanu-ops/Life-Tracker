import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fromDateKey } from '../lib/date'
import { formatKg } from '../lib/weight'

/** `t`: the day's midnight in ms, so the axis keeps real time and a week without weigh-ins looks like one. */
export type WeightPoint = { t: number; detail: string; kg: number; trend: number }

const DAY_MS = 24 * 60 * 60 * 1000
const tick = (t: number) => format(new Date(t), 'd MMM', { locale: tr })

type Props = {
  data: WeightPoint[]
  targetKg?: number
  height?: number
  /** Day keys to shade, e.g. the days a chosen habit was done. */
  shaded?: string[]
}

/** Each weigh-in as a dot, the 7-day average as the line, the target as a dashed rule. */
export function WeightChart({ data, targetKg, height = 200, shaded = [] }: Props) {
  const first = data[0]?.t ?? 0
  const last = data.at(-1)?.t ?? 0
  const values = [...data.map((p) => p.kg), ...(targetKg !== undefined ? [targetKg] : [])]
  const domain = [Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={[first, last]}
          tickFormatter={tick}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
        />
        <YAxis domain={domain} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} />
        {shaded.map((day) => {
          const t = fromDateKey(day).getTime()
          if (t < first || t > last) return null
          return (
            <ReferenceArea
              key={day}
              x1={Math.max(first, t - DAY_MS / 2)}
              x2={Math.min(last, t + DAY_MS / 2)}
              fill="var(--color-accent)"
              fillOpacity={0.14}
              strokeOpacity={0}
              ifOverflow="hidden"
            />
          )
        })}
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
