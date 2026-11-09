import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUDIO_TYPES, formatDuration, pickAudioType, micMessage, openMicrophone } from './audio'

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

describe('micMessage', () => {
  it('a shell too old to grant the microphone says so, whatever the error', () => {
    expect(micMessage({ name: 'NotAllowedError' }, 5)).toContain('yeni sürümü gerekiyor')
    expect(micMessage({ name: 'NotAllowedError' }, 5)).toContain('v5')
  })

  it('a refused permission points at Android’s own settings', () => {
    expect(micMessage({ name: 'NotAllowedError' }, 7)).toContain('İzinler')
  })

  it('tells a missing microphone from a busy one', () => {
    expect(micMessage({ name: 'NotFoundError' }, 7)).toContain('bulunamadı')
    expect(micMessage({ name: 'NotReadableError' }, 7)).toContain('başka bir uygulama')
  })

  it('anything else carries the error’s own name, which is the point', () => {
    expect(micMessage({ name: 'NotSupportedError', message: 'mimeType' }, 7)).toBe(
      'Kayıt başlatılamadı (uygulama v7) — NotSupportedError: mimeType',
    )
  })

  it('in a browser there is no shell version to name', () => {
    expect(micMessage({ name: 'WeirdError' })).toBe('Kayıt başlatılamadı — WeirdError')
    expect(micMessage(undefined)).toBe('Kayıt başlatılamadı')
  })
})

describe('openMicrophone', () => {
  const stream = { id: 'mic' } as unknown as MediaStream
  const withGetUserMedia = (fn: () => Promise<MediaStream>) => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: fn } })
  }

  afterEach(() => vi.unstubAllGlobals())

  it('hands back the stream when the first try works', async () => {
    const tries = vi.fn(async () => stream)
    withGetUserMedia(tries)
    await expect(openMicrophone(0)).resolves.toBe(stream)
    expect(tries).toHaveBeenCalledTimes(1)
  })

  it('tries again once when the audio stack is still refusing', async () => {
    // What a phone does right after the permission is granted: the refusal is a leftover.
    const tries = vi
      .fn<() => Promise<MediaStream>>()
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { name: 'NotReadableError' }))
      .mockResolvedValueOnce(stream)
    withGetUserMedia(tries)
    await expect(openMicrophone(0)).resolves.toBe(stream)
    expect(tries).toHaveBeenCalledTimes(2)
  })

  it('does not retry a refused permission: it would fail twice and only make the user wait', async () => {
    const denied = Object.assign(new Error('no'), { name: 'NotAllowedError' })
    const tries = vi.fn(() => Promise.reject(denied))
    withGetUserMedia(tries)
    await expect(openMicrophone(0)).rejects.toBe(denied)
    expect(tries).toHaveBeenCalledTimes(1)
  })

  it('gives up after the second refusal', async () => {
    const busy = Object.assign(new Error('busy'), { name: 'NotReadableError' })
    const tries = vi.fn(() => Promise.reject(busy))
    withGetUserMedia(tries)
    await expect(openMicrophone(0)).rejects.toBe(busy)
    expect(tries).toHaveBeenCalledTimes(2)
  })
})
