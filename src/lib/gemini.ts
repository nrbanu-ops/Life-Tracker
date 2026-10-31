/** One chat turn; Gemini calls the assistant's side "model". */
export type ChatMessage = { role: 'user' | 'model'; text: string }

// Tried in order: a model that is missing, out of free quota or overloaded falls through to the next.
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.0-flash']
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export class GeminiError extends Error {}

/** Sends the whole conversation (Gemini keeps no state) and returns the reply text. */
export async function askGemini(
  key: string,
  system: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  let lastError: GeminiError | undefined
  for (const model of MODELS) {
    const result = await askModel(model, key, system, messages, signal)
    if (typeof result === 'string') return result
    if (!result.retry) throw result.error
    lastError = result.error
  }
  throw lastError!
}

type Failure = { error: GeminiError; retry: boolean }

async function askModel(
  model: string,
  key: string,
  system: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string | Failure> {
  let response: Response
  try {
    response = await fetch(endpoint(model), {
      method: 'POST',
      // The key goes in a header, never in the URL.
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        // No output cap: thinking models spend part of it before answering and a low cap returns nothing.
        generationConfig: { temperature: 0.6 },
      }),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return { error: new GeminiError('Gemini’ye ulaşılamadı. İnternet bağlantını kontrol et.'), retry: false }
  }

  const data = await response.json().catch(() => undefined)
  if (!response.ok) {
    const status = response.status
    return { error: new GeminiError(describeError(status, data)), retry: status === 404 || status === 429 || status >= 500 }
  }

  const candidate = data?.candidates?.[0]
  const text = (candidate?.content?.parts ?? [])
    .filter((part: { thought?: boolean }) => !part.thought)
    .map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim()
  if (text) return text
  if (candidate?.finishReason === 'SAFETY' || data?.promptFeedback?.blockReason) {
    return { error: new GeminiError('Gemini bu mesaja cevap vermedi. Başka türlü sormayı dene.'), retry: false }
  }
  return { error: new GeminiError('Gemini boş cevap verdi, tekrar dene.'), retry: true }
}

function describeError(status: number, data: unknown): string {
  const message = (data as { error?: { message?: string } } | undefined)?.error?.message ?? ''
  if (/api key not valid|api_key_invalid/i.test(message)) return 'Gemini API anahtarı geçersiz. Ayarlar’dan kontrol et.'
  if (status === 401 || status === 403) return `Gemini API anahtarı kabul edilmedi. ${message}`.trim()
  if (status === 429) return 'Gemini kotası doldu. Biraz bekleyip tekrar dene.'
  if (status >= 500) return 'Gemini şu an cevap vermiyor, biraz sonra tekrar dene.'
  // Show Google's own text so an unexpected problem can be told apart from a wrong key.
  return `Gemini hata verdi (${status}). ${message}`.trim()
}
