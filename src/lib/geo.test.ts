import { describe, expect, it } from 'vitest'
import { currentPosition, failureFor, HERE_MESSAGE } from './geo'

describe('failureFor', () => {
  it('tells apart a refused permission, a missing fix and a timeout', () => {
    expect(failureFor(1)).toBe('denied')
    expect(failureFor(2)).toBe('unavailable')
    expect(failureFor(3)).toBe('timeout')
  })

  it('treats an unknown code as a missing fix rather than blaming the user', () => {
    expect(failureFor(0)).toBe('unavailable')
    expect(failureFor(99)).toBe('unavailable')
  })

  it('has something to say for every failure', () => {
    for (const reason of ['denied', 'unavailable', 'timeout', 'unsupported'] as const) {
      expect(HERE_MESSAGE[reason].length).toBeGreaterThan(10)
    }
  })
})

describe('currentPosition', () => {
  it('says so instead of throwing where the browser has no geolocation', async () => {
    expect(await currentPosition()).toEqual({ ok: false, reason: 'unsupported' })
  })
})
