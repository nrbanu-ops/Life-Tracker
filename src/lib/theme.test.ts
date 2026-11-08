import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PALETTE, paletteFrom, PALETTES } from './theme'

describe('paletteFrom', () => {
  it('keeps a known palette', () => {
    expect(paletteFrom('seker')).toBe('seker')
  })

  it('falls back for an unknown, empty or missing value', () => {
    expect(paletteFrom('mor-pembe')).toBe(DEFAULT_PALETTE)
    expect(paletteFrom('')).toBe(DEFAULT_PALETTE)
    expect(paletteFrom(null)).toBe(DEFAULT_PALETTE)
    expect(paletteFrom(undefined)).toBe(DEFAULT_PALETTE)
  })
})

describe('PALETTES', () => {
  it('offers the default one', () => {
    expect(PALETTES.map((p) => p.id)).toContain(DEFAULT_PALETTE)
  })

  it('has unique ids and a colour for every slot', () => {
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length)
    for (const p of PALETTES) {
      expect(p.name).not.toBe('')
      for (const colour of [...p.swatch, ...p.bg]) expect(colour).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('palettes and the stylesheet agree', () => {
  // A palette listed here but missing from index.css would silently show the default colours.
  it('every palette but the default has a block in index.css', async () => {
    const css = await readFile(new URL('../index.css', import.meta.url), 'utf8')
    for (const palette of PALETTES.filter((p) => p.id !== DEFAULT_PALETTE)) {
      expect(css, palette.id).toContain(`:root[data-palette='${palette.id}']`)
    }
  })

  it('index.css defines no palette that is not offered in Settings', async () => {
    const css = await readFile(new URL('../index.css', import.meta.url), 'utf8')
    const inCss = new Set([...css.matchAll(/\[data-palette='([^']+)'\]/g)].map((m) => m[1]))
    const offered = new Set(PALETTES.map((p) => p.id))
    expect([...inCss].filter((id) => !offered.has(id))).toEqual([])
  })
})
