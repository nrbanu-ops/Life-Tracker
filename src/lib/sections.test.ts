import { describe, expect, it } from 'vitest'
import { sectionOf } from './sections'

describe('sectionOf', () => {
  it('Bugün is only the root', () => {
    expect(sectionOf('/')?.key).toBe('today')
  })
  it('finds the section of a tab, of a page under it and of a page that only belongs to it', () => {
    expect(sectionOf('/gorevler')?.key).toBe('goals')
    expect(sectionOf('/projeler/abc')?.key).toBe('goals')
    expect(sectionOf('/takvim')?.key).toBe('journal')
    expect(sectionOf('/profil')?.key).toBe('progress')
    expect(sectionOf('/kutuphane')?.key).toBe('library')
  })
  it('pages outside the sections have none', () => {
    expect(sectionOf('/ayarlar')).toBeUndefined()
    expect(sectionOf('/ara')).toBeUndefined()
    expect(sectionOf('/zamanlayici')).toBeUndefined()
  })
})
