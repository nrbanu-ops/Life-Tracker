type Props<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

/** Equal-width segmented control, e.g. for picking a habit kind or timer mode. */
export function Segmented<T extends string>({ options, value, onChange, disabled }: Props<T>) {
  return (
    <div
      className="grid gap-1 rounded-xl bg-bg p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          disabled={disabled}
          className={`rounded-lg px-2 py-2 text-sm transition-colors disabled:opacity-60 ${
            value === option.value ? 'bg-surface font-medium shadow-sm' : 'text-muted'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
