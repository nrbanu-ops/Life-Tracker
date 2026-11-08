import { PALETTES, setPalette, usePalette } from '../lib/theme'

/** Settings: the colour palette. Light or dark still follows the phone's own setting. */
export function ThemeSection() {
  const current = usePalette()

  return (
    <section id="tema" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Renk teması</h2>
      <p className="mt-1 text-sm text-muted">
        Açık ve koyu mod telefonunun ayarını takip eder; burada renkleri seçersin.
        "Hep aydınlık" yazan tema, telefonun koyu moddayken de aydınlık kalır.
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
                  {palette.swatch.map((colour, i) => (
                    <span
                      key={colour}
                      className={`size-5 rounded-full border border-black/10 ${i > 0 ? '-ml-2' : ''}`}
                      style={{ background: colour }}
                    />
                  ))}
                </span>
                <span className="min-w-0 truncate">
                  {palette.name}
                  {palette.note && <span className="block text-xs text-muted">{palette.note}</span>}
                </span>
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
