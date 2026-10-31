type Props = {
  /** 0–1. */
  ratio: number
  color?: string
}

export function ProgressBar({ ratio, color = 'var(--color-accent)' }: Props) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-bg">
      <span
        className="block h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.round(ratio * 100)}%`, background: color }}
      />
    </span>
  )
}
