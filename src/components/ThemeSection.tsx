import { PALETTES, setPalette, usePalette } from '../lib/theme'

/** Settings: the colour palette. Light or dark still follows the phone's own setting. */
export function ThemeSection() {
  const current = usePalette()

  return (
    <section id="tema" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Renk teması</h2>
      <p className="mt-1 text-sm text-muted">
        Açık ve koyu mod telefonunun ayarını takip etmeye devam eder; burada sadece renkleri seçersin.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {PALETTES.map((palette) => {
          const chosen = palette.id === current
          return (
            <li key={palette.id}>
              <button
                type="button"
                onClick={() => setPalette(palette.id)}
                aria-pressed={chosen}
                className={`flex w-full items-center gap-2.5 rounded-xl border p-3 text-sm ${
                  chosen ? 'border-accent bg-accent-soft' : 'border-border bg-bg'
                }`}
              >
                <span className="flex shrink-0" aria-hidden>
                  <span
                    className="size-5 rounded-full border border-black/10"
                    style={{ background: palette.swatch[0] }}
                  />
                  <span
                    className="-ml-2 size-5 rounded-full border border-black/10"
                    style={{ background: palette.swatch[1] }}
                  />
                </span>
                <span className="min-w-0 truncate">{palette.name}</span>
                {chosen && (
                  <span className="ml-auto text-accent" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
