import { PALETTES, setBackdropMotion, setPalette, useBackdropMotion, usePalette } from '../lib/theme'
import { Switch } from './Switch'

/** Settings: the colour palette. Light or dark still follows the phone's own setting. */
export function ThemeSection() {
  const current = usePalette()
  const motion = useBackdropMotion()

  return (
    <section id="tema" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Renk teması</h2>
      <p className="mt-1 text-sm text-muted">
        Açık ve koyu mod telefonunun ayarını takip eder; burada renkleri seçersin. "Hep aydınlık"
        ya da "hep karanlık" yazan temalar telefonun ayarına bakmaz.
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
                className={`flex h-full w-full flex-col gap-2 rounded-xl border p-3 text-left text-sm ${
                  chosen ? 'border-accent bg-accent-soft' : 'border-border bg-bg'
                }`}
              >
                {/* Dots above the name, so a long name has the card's whole width. */}
                <span className="flex w-full items-center" aria-hidden>
                  {palette.swatch.map((colour, i) => (
                    <span
                      key={colour}
                      className={`size-5 rounded-full border border-text/15 ${i > 0 ? '-ml-1.5' : ''}`}
                      style={{ background: colour }}
                    />
                  ))}
                  {chosen && <span className="ml-auto text-accent">✓</span>}
                </span>
                <span className="leading-tight">
                  {palette.name}
                  {palette.note && <span className="mt-0.5 block text-xs text-muted">{palette.note}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 border-t border-border pt-4">
        <Switch label="Arka plan hareketi" checked={motion} onChange={setBackdropMotion} />
        <p className="mt-1 text-sm text-muted">
          Arka plan çok yavaş, birkaç piksel kayar. Telefonunda "hareketi azalt" açıksa zaten durur.
        </p>
      </div>
    </section>
  )
}
