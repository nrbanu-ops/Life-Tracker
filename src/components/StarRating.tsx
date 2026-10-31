type Props = {
  value?: number
  /** Tapping the current rating again clears it. */
  onChange?: (value: number | undefined) => void
  size?: 'sm' | 'lg'
}

/** 1–5 stars; read-only without onChange. */
export function StarRating({ value = 0, onChange, size = 'lg' }: Props) {
  const stars = [1, 2, 3, 4, 5]
  if (!onChange) {
    return (
      <span className="text-xs tracking-tight text-p2" aria-label={`${value} yıldız`}>
        {stars.map((n) => (n <= value ? '★' : '☆')).join('')}
      </span>
    )
  }
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Puan">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} yıldız`}
          onClick={() => onChange(value === n ? undefined : n)}
          className={`${size === 'lg' ? 'text-3xl' : 'text-xl'} leading-none ${n <= value ? 'text-p2' : 'text-border'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
