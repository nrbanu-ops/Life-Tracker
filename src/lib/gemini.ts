/** One chat turn; Gemini calls the assistant's side "model". */
export type ChatMessage = { role: 'user' | 'model'; text: string }

const MODEL = 'gemini-flash-latest'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export class GeminiError extends Error {}

/** Sends the whole conversation (Gemini keeps no state) and returns the reply text. */
export async function askGemini(
  key: string,
  system: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      // The key goes in a header, never in the URL.
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
      }),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new GeminiError('Gemini’ye ulaşılamadı. İnternet bağlantını kontrol et.')
  }

  const data = await response.json().catch(() => undefined)
  if (!response.ok) throw new GeminiError(describeError(response.status, data))

  const candidate = data?.candidates?.[0]
  const text = (candidate?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim()
  if (!text) {
    throw new GeminiError(
      candidate?.finishReason === 'SAFETY'
        ? 'Gemini bu mesaja cevap vermedi. Başka türlü sormayı dene.'
        : 'Gemini boş cevap verdi, tekrar dene.',
    )
  }
  return text
}

function describeError(status: number, data: unknown): string {
  const message = (data as { error?: { message?: string } } | undefined)?.error?.message ?? ''
  if (status === 400 && /api key/i.test(message)) return 'Gemini API anahtarı geçersiz. Ayarlar’dan kontrol et.'
  if (status === 401 || status === 403) return 'Gemini API anahtarı kabul edilmedi. Ayarlar’dan kontrol et.'
  if (status === 429) return 'Gemini kotası doldu. Biraz bekleyip tekrar dene.'
  if (status >= 500) return 'Gemini şu an cevap vermiyor, biraz sonra tekrar dene.'
  return `Gemini hata verdi (${status}).`
}
