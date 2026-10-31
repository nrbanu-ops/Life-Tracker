type Props = {
  done: number
  total: number
  /** Screen-reader text; defaults to the habit wording of the Today screen. */
  label?: string
}

const SIZE = 72
const STROKE = 7
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ProgressRing({ done, total, label }: Props) {
  const ratio = total === 0 ? 0 : Math.min(1, done / total)
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={label ?? `${total} habit'ten ${done} tanesi tamamlandı`}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={STROKE}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        className="transition-[stroke-dashoffset] duration-300"
        opacity={done === 0 ? 0 : 1}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-text text-base font-semibold tabular-nums"
      >
        {done}/{total}
      </text>
    </svg>
  )
}
