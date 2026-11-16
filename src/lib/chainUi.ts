import type { CSSProperties } from 'react'

/** The chain's colour as CSS variables: the habit's project colour, or the app's accent. */
export const chainColors = (color?: string): CSSProperties =>
  ({
    '--chain': color ?? 'var(--color-accent)',
    // Project colours are mid-tones in both themes, so what sits on them is always white.
    '--chain-ink': color ? '#fff' : 'var(--color-surface)',
  }) as CSSProperties
