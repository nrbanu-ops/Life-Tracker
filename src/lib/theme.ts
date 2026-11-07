import { useSyncExternalStore } from 'react'

/**
 * Colour palettes. Each one sets the same variables as the default does in src/index.css,
 * in a light and a dark version; the phone still decides which of the two is shown.
 * A per-device choice, so localStorage rather than the database.
 */
export type Palette = {
  id: string
  name: string
  /** Two dots in Settings: the accent and the page colour. */
  swatch: [accent: string, page: string]
  /** Page colour for the browser's theme-color (the status bar on iOS), light and dark. */
  bg: [light: string, dark: string]
}

export const PALETTES: Palette[] = [
  { id: 'orman', name: 'Orman', swatch: ['#3f6b5c', '#dce6f3'], bg: ['#dce6f3', '#182030'] },
  { id: 'seker', name: 'Şeker', swatch: ['#d2403c', '#fde9e2'], bg: ['#fde9e2', '#2e1620'] },
  { id: 'pembe', name: 'Pembe', swatch: ['#cc1a71', '#ffe7f2'], bg: ['#ffe7f2', '#2e0f22'] },
  { id: 'gunbatimi', name: 'Gün batımı', swatch: ['#bf5a10', '#ffeada'], bg: ['#ffeada', '#2a1709'] },
  { id: 'turkuaz', name: 'Turkuaz', swatch: ['#0b7d73', '#d9f5f0'], bg: ['#d9f5f0', '#04231f'] },
  { id: 'okyanus', name: 'Okyanus', swatch: ['#0e7f99', '#dceef5'], bg: ['#dceef5', '#07202a'] },
  { id: 'lavanta', name: 'Lavanta', swatch: ['#6d3fd4', '#ece6f8'], bg: ['#ece6f8', '#1f1636'] },
]

export const DEFAULT_PALETTE = PALETTES[0].id

// Kept in step with the small script in index.html that applies the choice before the first paint.
const KEY = 'life-tracker:palette'
const listeners = new Set<() => void>()

/** Anything unknown falls back to the default, so an old or hand-edited value can't break the app. */
export function paletteFrom(stored: string | null | undefined): string {
  return PALETTES.some((p) => p.id === stored) ? (stored as string) : DEFAULT_PALETTE
}

export function getPalette(): string {
  try {
    return paletteFrom(localStorage.getItem(KEY))
  } catch {
    return DEFAULT_PALETTE
  }
}

/** Puts the choice on <html>, where the CSS picks it up, and into the theme-color metas. */
export function applyPalette(id: string): void {
  const palette = PALETTES.find((p) => p.id === id) ?? PALETTES[0]
  document.documentElement.dataset.palette = palette.id
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = meta.media.includes('dark') ? palette.bg[1] : palette.bg[0]
  }
}

export function setPalette(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Private mode: the choice just doesn't stick.
  }
  applyPalette(id)
  for (const listener of listeners) listener()
}

export function usePalette(): string {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getPalette,
    () => DEFAULT_PALETTE,
  )
}
