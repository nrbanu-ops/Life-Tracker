import { describe, expect, it } from 'vitest'
import { AUDIO_TYPES, formatDuration, pickAudioType } from './audio'

describe('formatDuration', () => {
  it('reads like a player: minutes and two-digit seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(7)).toBe('0:07')
    expect(formatDuration(45.4)).toBe('0:45')
    expect(formatDuration(123)).toBe('2:03')
    expect(formatDuration(720)).toBe('12:00')
  })

  it('never shows a negative or broken time', () => {
    expect(formatDuration(-5)).toBe('0:00')
  })
})

describe('pickAudioType', () => {
  it('prefers Opus where the browser can record it', () => {
    expect(pickAudioType(() => true)).toBe('audio/webm;codecs=opus')
  })

  it('takes what Safari offers when webm is out', () => {
    expect(pickAudioType((t) => t.startsWith('audio/mp4'))).toBe('audio/mp4')
  })

  it('lets the browser decide when it supports none of them', () => {
    expect(pickAudioType(() => false)).toBeUndefined()
  })

  it('offers only types a browser would know', () => {
    for (const type of AUDIO_TYPES) expect(type).toMatch(/^audio\//)
  })
})
