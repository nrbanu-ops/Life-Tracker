import { useState } from 'react'
import { LANGUAGES } from '../lib/library'

type Props = {
  value?: string
  onChange: (value: string | undefined) => void
}

const OTHER = '__other'
const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

/** Language a book was read in: a common one from the list, or typed in under "Diğer…". */
export function LanguageSelect({ value, onChange }: Props) {
  const isKnown = value === undefined || LANGUAGES.some((l) => l.code === value)
  const [custom, setCustom] = useState(!isKnown)

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">Okuduğun dil</span>
      <div className="flex gap-2">
        <select
          value={custom ? OTHER : (value ?? '')}
          onChange={(e) => {
            const next = e.target.value
            setCustom(next === OTHER)
            onChange(next === OTHER || next === '' ? undefined : next)
          }}
          className={inputClass}
        >
          <option value="">Belirtme</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
          <option value={OTHER}>Diğer…</option>
        </select>
        {custom && (
          <input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder="ör. Japonca"
            aria-label="Dil"
            maxLength={30}
            className={inputClass}
            autoFocus
          />
        )}
      </div>
    </label>
  )
}
