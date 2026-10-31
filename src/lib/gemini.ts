/** One chat turn; Gemini calls the assistant's side "model". */
export type ChatMessage = { role: 'user' | 'model'; text: string }

// Tried in order: a model that is missing, out of free quota, overloaded or too slow falls through to the next.
// A fixed fast model comes first: "flash-latest" points at the newest model, which can take minutes when busy.
const MODELS = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest']
const MODEL_TIMEOUT_MS = 45_000
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
type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  error?: { message?: string }
}

async function askModel(
  model: string,
  key: string,
  system: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string | Failure> {
  const timer = new AbortController()
  const timeout = timer.signal
  const stopTimer = setTimeout(() => timer.abort(), MODEL_TIMEOUT_MS)
  const stopOnCancel = () => timer.abort()
  signal?.addEventListener('abort', stopOnCancel)
  let response: Response
  let data: GeminiResponse | undefined
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
      // Aborts when the user cancels or the model takes too long.
      signal: timeout,
    })
    data = await response.json().catch((e) => {
      if (timeout.aborted) throw e
    })
  } catch (e) {
    if (signal?.aborted) throw e
    if (timeout.aborted) return { error: new GeminiError('Gemini çok yavaş cevap veriyor, biraz sonra tekrar dene.'), retry: true }
    return { error: new GeminiError('Gemini’ye ulaşılamadı. İnternet bağlantını kontrol et.'), retry: false }
  } finally {
    clearTimeout(stopTimer)
    signal?.removeEventListener('abort', stopOnCancel)
  }

  if (!response.ok) {
    const status = response.status
    return { error: new GeminiError(describeError(status, data)), retry: status === 404 || status === 429 || status >= 500 }
  }

  const candidate = data?.candidates?.[0]
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
    .trim()
  if (text) return text
  if (candidate?.finishReason === 'SAFETY' || data?.promptFeedback?.blockReason) {
    return { error: new GeminiError('Gemini bu mesaja cevap vermedi. Başka türlü sormayı dene.'), retry: false }
  }
  return { error: new GeminiError('Gemini boş cevap verdi, tekrar dene.'), retry: true }
}

function describeError(status: number, data: GeminiResponse | undefined): string {
  const message = data?.error?.message ?? ''
  if (/api key not valid|api_key_invalid/i.test(message)) return 'Gemini API anahtarı geçersiz. Ayarlar’dan kontrol et.'
  if (status === 401 || status === 403) return `Gemini API anahtarı kabul edilmedi. ${message}`.trim()
  if (status === 429) return 'Gemini kotası doldu. Biraz bekleyip tekrar dene.'
  if (status >= 500) return 'Gemini şu an cevap vermiyor, biraz sonra tekrar dene.'
  // Show Google's own text so an unexpected problem can be told apart from a wrong key.
  return `Gemini hata verdi (${status}). ${message}`.trim()
}
