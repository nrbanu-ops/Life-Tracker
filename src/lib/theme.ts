import { useSyncExternalStore } from 'react'

/**
 * Colour palettes. Each one sets the same variables as the default does in src/index.css,
 * in a light and a dark version; the phone still decides which of the two is shown.
 * A per-device choice, so localStorage rather than the database.
 */
export type Palette = {
  id: string
  name: string
  /** The dots shown in Settings: the accent first, then colours that give the palette away. */
  swatch: string[]
  /** Page colour for the browser's theme-color (the status bar on iOS), light and dark. */
  bg: [light: string, dark: string]
  /** A word under the name, for anything surprising about the palette. */
  note?: string
}

export const PALETTES: Palette[] = [
  {
    id: 'gokkusagi',
    name: 'Gökkuşağı',
    note: 'hep aydınlık',
    swatch: ['#d93d33', '#f2cc78', '#8eafcd'],
    // No dark version, so the status bar keeps the light colour either way.
    bg: ['#fdf2e3', '#fdf2e3'],
  },
  {
    id: 'mantar',
    name: 'Mantar Krallığı',
    note: 'hep aydınlık',
    swatch: ['#e0281e', '#7cc6f5', '#5cc46a', '#f0cf66'],
    bg: ['#e6f6ff', '#e6f6ff'],
  },
  {
    id: 'phantom',
    name: 'Phantom',
    note: 'hep karanlık',
    swatch: ['#ff2d46', '#0e0e10', '#f6f6f6'],
    // Dark whatever the phone says, so the status bar is too.
    bg: ['#0e0e10', '#0e0e10'],
  },
  { id: 'orman', name: 'Orman', swatch: ['#3f6b5c', '#dce6f3'], bg: ['#dce6f3', '#182030'] },
  { id: 'seker', name: 'Şeker', swatch: ['#d2403c', '#fde9e2'], bg: ['#fde9e2', '#2e1620'] },
  { id: 'pembe', name: 'Pembe', swatch: ['#cc1a71', '#ffe7f2'], bg: ['#ffe7f2', '#2e0f22'] },
  { id: 'gunbatimi', name: 'Gün batımı', swatch: ['#bf5a10', '#ffeada'], bg: ['#ffeada', '#2a1709'] },
  { id: 'turkuaz', name: 'Turkuaz', swatch: ['#0b7d73', '#d9f5f0'], bg: ['#d9f5f0', '#04231f'] },
  { id: 'okyanus', name: 'Okyanus', swatch: ['#0e7f99', '#dceef5'], bg: ['#dceef5', '#07202a'] },
  { id: 'lavanta', name: 'Lavanta', swatch: ['#6d3fd4', '#ece6f8'], bg: ['#ece6f8', '#1f1636'] },
]

// Not PALETTES[0]: the list is ordered for Settings, the default is a separate decision.
export const DEFAULT_PALETTE = 'orman'

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

// The backdrop's slow drift. On unless switched off; also kept in step with index.html.
const MOTION_KEY = 'life-tracker:backdrop-motion'

export function getBackdropMotion(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Puts the choice on <html>, where the stylesheet stops the animations for 'off'. */
export function applyBackdropMotion(on: boolean): void {
  document.documentElement.dataset.motion = on ? 'on' : 'off'
}

export function setBackdropMotion(on: boolean): void {
  try {
    localStorage.setItem(MOTION_KEY, on ? 'on' : 'off')
  } catch {
    // Private mode: the choice just doesn't stick.
  }
  applyBackdropMotion(on)
  for (const listener of listeners) listener()
}

export function useBackdropMotion(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getBackdropMotion,
    () => true,
  )
}
