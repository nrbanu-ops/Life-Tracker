type Props = {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}

/** The on/off switch used by the settings sections. */
export function Switch({ label, checked, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )
}
