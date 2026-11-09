import { describe, expect, it } from 'vitest'
import { isQuotaError, saveErrorMessage } from './saveError'

describe('isQuotaError', () => {
  it('recognises the browser’s own quota failure', () => {
    expect(isQuotaError({ name: 'QuotaExceededError', message: 'no room' })).toBe(true)
  })

  it('looks inside the error Dexie wraps it in', () => {
    expect(isQuotaError({ name: 'DexieError', inner: { name: 'QuotaExceededError' } })).toBe(true)
  })

  it('falls back to the wording when the name says nothing', () => {
    expect(isQuotaError({ name: 'Error', message: 'The current transaction exceeded its quota' })).toBe(true)
  })

  it('leaves other failures alone', () => {
    expect(isQuotaError({ name: 'AbortError', message: 'cancelled' })).toBe(false)
    expect(isQuotaError(undefined)).toBe(false)
  })
})

describe('saveErrorMessage', () => {
  it('tells the user what to do when the phone is full', () => {
    const message = saveErrorMessage({ name: 'QuotaExceededError' })
    expect(message).toContain('yer kalmadı')
    expect(message).toContain('Depolama')
  })

  it('names the real error for anything else, so it can be reported', () => {
    expect(saveErrorMessage({ name: 'DataCloneError', message: 'blob failed' })).toBe(
      'Kaydedilemedi — DataCloneError: blob failed',
    )
  })

  it('still says something when there is nothing to go on', () => {
    expect(saveErrorMessage(null)).toBe('Kaydedilemedi. Bilinmeyen bir hata oldu.')
  })
})
