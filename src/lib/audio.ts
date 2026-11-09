/**
 * Voice notes for the journal: for the days when talking is easier than typing.
 * Recording itself is the browser's MediaRecorder; only the choices live here.
 */

/** A few minutes is a note; longer than this is a recording session (and a huge backup). */
export const AUDIO_MAX_SECONDS = 300

/** "0:45", "2:03", "12:00". */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** Best first: Opus is small and plays everywhere; mp4/aac is what Safari records. */
export const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm']

/** The first type this browser can record, or undefined to let it choose its own. */
export function pickAudioType(supported: (type: string) => boolean): string | undefined {
  return AUDIO_TYPES.find((type) => supported(type))
}

export const supportsRecording =
  typeof window !== 'undefined' &&
  'MediaRecorder' in window &&
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function'

/**
 * The oldest shell that can hand over the microphone. Before it the WebView answers the page's
 * request itself, and the answer is always no — the page then sees a plain "not allowed" and
 * nothing the user does in Android's settings can change it.
 */
export const AUDIO_SHELL_VERSION = 6

/**
 * Why recording wouldn't start, in words that say what to do next.
 *
 * The generic "couldn't start" was hiding the error's own name, which is the one piece of
 * information worth having: a refused permission, a missing microphone and a busy microphone
 * all need different things from the user.
 */
export function micMessage(error: { name?: string; message?: string } | undefined, shell?: number): string {
  if (shell !== undefined && shell < AUDIO_SHELL_VERSION) {
    return `Ses notu için uygulamanın yeni sürümü gerekiyor (şu an v${shell}). Yeni APK'yı kur.`
  }
  const name = error?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Mikrofon izni verilmedi. Telefon ayarları → Uygulamalar → Life Tracker → İzinler\'den Mikrofon\'a izin ver.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Telefonda mikrofon bulunamadı.'
  if (name === 'NotReadableError' || name === 'AbortError') {
    return (
      'Telefon mikrofonu açmadı (izin var ama cihaz vermiyor). Sırayla dene: uygulamayı tamamen ' +
      'kapatıp aç · mikrofon kullanan uygulamaları kapat (arama, ses kaydı, asistan) · telefonu ' +
      'yeniden başlat.'
    )
  }
  const detail = [name, error?.message].filter(Boolean).join(': ')
  const where = shell === undefined ? '' : ` (uygulama v${shell})`
  return `Kayıt başlatılamadı${where}${detail ? ` — ${detail}` : ''}`
}

/** A refusal worth trying again; a denied permission or a missing microphone is not. */
const worthRetrying = (error: unknown) => {
  const name = (error as Error | undefined)?.name
  return name === 'NotReadableError' || name === 'AbortError'
}

/**
 * Opens the microphone, trying three ways before giving up.
 *
 * Two different things go wrong on Android, and both look like "the device is busy":
 *  - right after the permission is granted the audio stack can still be refusing, which passes
 *    in a moment — hence the same request again after a wait;
 *  - the default request asks for echo cancellation, and on Android that makes the WebView open
 *    a different recording source (the one phone calls use). Where that source is missing or
 *    taken, plain recording still works — hence the last attempt without it.
 *
 * A refused permission or a missing microphone is not retried: it would fail every time and
 * only keep the user waiting.
 */
export async function openMicrophone(wait = 600): Promise<MediaStream> {
  const plain: MediaStreamConstraints = { audio: true }
  const noProcessing: MediaStreamConstraints = {
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  }
  let last: unknown
  const attempts = [plain, plain, noProcessing]
  for (let i = 0; i < attempts.length; i++) {
    if (i === 1) await new Promise((resolve) => setTimeout(resolve, wait))
    try {
      return await navigator.mediaDevices.getUserMedia(attempts[i])
    } catch (error) {
      if (!worthRetrying(error)) throw error
      last = error
    }
  }
  throw last
}
