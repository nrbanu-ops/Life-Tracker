import { afterEach, describe, expect, it, vi } from 'vitest'
import { askGemini } from './gemini'

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const answer = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] })
const hi = [{ role: 'user' as const, text: 'Merhaba' }]

afterEach(() => vi.unstubAllGlobals())

describe('askGemini', () => {
  it('falls through to the next model when one is out of quota or missing', async () => {
    const fetch = vi
      .fn()
      .mockReturnValueOnce(reply(429, { error: { message: 'quota' } }))
      .mockReturnValueOnce(reply(404, { error: { message: 'not found' } }))
      .mockReturnValueOnce(reply(200, answer('Selam')))
    vi.stubGlobal('fetch', fetch)
    expect(await askGemini('k', 's', hi)).toBe('Selam')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('stops at a wrong key instead of trying other models', async () => {
    const fetch = vi.fn().mockReturnValue(reply(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(askGemini('k', 's', hi)).rejects.toThrow('anahtarı geçersiz')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shows Google’s own message for unexpected errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(reply(400, { error: { message: 'User location is not supported' } })))
    await expect(askGemini('k', 's', hi)).rejects.toThrow('User location is not supported')
  })

  it('moves on when a model is too slow', async () => {
    vi.useFakeTimers()
    const hang = (_url: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(init.signal!.reason)))
    const fetch = vi.fn().mockImplementationOnce(hang).mockReturnValueOnce(reply(200, answer('Hızlı')))
    vi.stubGlobal('fetch', fetch)
    const result = askGemini('k', 's', hi)
    await vi.advanceTimersByTimeAsync(46_000)
    expect(await result).toBe('Hızlı')
    vi.useRealTimers()
  })

  it('skips thought parts', async () => {
    const body = { candidates: [{ content: { parts: [{ text: 'düşünüyorum', thought: true }, { text: 'Cevap' }] } }] }
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(reply(200, body)))
    expect(await askGemini('k', 's', hi)).toBe('Cevap')
  })
})
