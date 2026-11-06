import { describe, expect, it } from 'vitest'
import { isIos } from './android'

describe('isIos', () => {
  it('recognises an iPhone', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)', 'iPhone', 5)).toBe(true)
  })

  it('recognises an iPad that reports itself as a Mac', () => {
    // iPadOS 13+ sends a desktop Safari user agent; the touch points give it away.
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true)
  })

  it('leaves a real Mac alone', () => {
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false)
  })

  it('leaves Android alone, so its own bridge and download keep working', () => {
    expect(isIos('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 'Linux armv8l', 5)).toBe(false)
  })

  it('leaves Windows alone', () => {
    expect(isIos('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0)).toBe(false)
  })
})
