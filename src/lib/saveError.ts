/**
 * Why a save failed, in words the user can act on.
 *
 * Writing a photo or a voice note is the one place where saving can genuinely fail on a phone:
 * the blob is thousands of times bigger than the text next to it, so a full device or a small
 * WebView quota stops exactly these entries while plain writing keeps working. Until now that
 * failure was invisible — the button just stopped responding — which is the worst possible way
 * for a bug to show up.
 */

/** A quota failure, however the browser or Dexie wrapped it. */
export function isQuotaError(error: unknown): boolean {
  const names: string[] = []
  const texts: string[] = []
  let step: unknown = error
  // Dexie keeps the original DOMException in `inner`; some browsers nest it one deeper.
  for (let depth = 0; depth < 4 && step; depth++) {
    const it = step as { name?: unknown; message?: unknown; inner?: unknown; cause?: unknown }
    if (typeof it.name === 'string') names.push(it.name)
    if (typeof it.message === 'string') texts.push(it.message)
    step = it.inner ?? it.cause
  }
  if (names.some((name) => name === 'QuotaExceededError')) return true
  return texts.some((text) => /quota|storage is full|yeterli (yer|alan)/i.test(text))
}

/** The message shown next to the save button. Always says something; never an empty string. */
export function saveErrorMessage(error: unknown): string {
  if (isQuotaError(error)) {
    return 'Cihazda yer kalmadı, bu yüzden kaydedilemedi. Ayarlar → Depolama\'dan yeri boşalt ya da eski fotoğrafları sil.'
  }
  const name = (error as { name?: unknown } | null)?.name
  const message = (error as { message?: unknown } | null)?.message
  const detail = [typeof name === 'string' && name !== 'Error' ? name : '', typeof message === 'string' ? message : '']
    .filter(Boolean)
    .join(': ')
  return detail ? `Kaydedilemedi — ${detail}` : 'Kaydedilemedi. Bilinmeyen bir hata oldu.'
}
