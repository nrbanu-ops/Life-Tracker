import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDraft, draftKey, loadDraft, saveDraft } from './draft'

function fakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    size: () => map.size,
  }
}

describe('journal drafts', () => {
  let store: ReturnType<typeof fakeStorage>

  beforeEach(() => {
    store = fakeStorage()
    vi.stubGlobal('localStorage', store)
  })

  it('keeps a draft per day', () => {
    saveDraft('2026-11-08', 'bugün yorgunum')
    saveDraft('2026-11-07', 'dün iyiydi')
    expect(loadDraft('2026-11-08')).toBe('bugün yorgunum')
    expect(loadDraft('2026-11-07')).toBe('dün iyiydi')
  })

  it('has no draft for a day never written in', () => {
    expect(loadDraft('2026-11-08')).toBe('')
  })

  it('keeps whitespace inside the text but stores nothing for a blank draft', () => {
    saveDraft('2026-11-08', '  satır\n\n  ')
    expect(loadDraft('2026-11-08')).toBe('  satır\n\n  ')
    saveDraft('2026-11-08', '   \n ')
    expect(loadDraft('2026-11-08')).toBe('')
    expect(store.size()).toBe(0)
  })

  it('forgets a draft once the entry is saved', () => {
    saveDraft('2026-11-08', 'yazı')
    clearDraft('2026-11-08')
    expect(loadDraft('2026-11-08')).toBe('')
    expect(store.size()).toBe(0)
  })

  it('does not throw when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() => saveDraft('2026-11-08', 'yazı')).not.toThrow()
    expect(loadDraft('2026-11-08')).toBe('')
  })

  it('namespaces the key with the app and the day', () => {
    expect(draftKey('2026-11-08')).toBe('life-tracker:draft:2026-11-08')
  })
})
