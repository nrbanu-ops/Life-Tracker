/**
 * Where the phone says it is. The browser's geolocation API is callback-based and its errors
 * are numbers, so both are wrapped here and nothing else has to know about them.
 */
export type Coords = { latitude: number; longitude: number; accuracy?: number }

export type HereFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

export type HereResult = { ok: true; coords: Coords } | { ok: false; reason: HereFailure }

export const HERE_MESSAGE: Record<HereFailure, string> = {
  denied: 'Konum izni verilmedi. Tarayıcının site ayarlarından izin verip tekrar dene.',
  unavailable: 'Konum bulunamadı. Telefonun konum servisi açık mı?',
  timeout: 'Konum gelmedi. Açık bir yerde biraz bekleyip tekrar dene.',
  unsupported: 'Bu cihaz konum vermiyor.',
}

/** GeolocationPositionError: 1 permission denied, 2 position unavailable, 3 timeout. */
export function failureFor(code: number): HereFailure {
  if (code === 1) return 'denied'
  if (code === 3) return 'timeout'
  return 'unavailable'
}

/**
 * Asks once for the current position. A fix can take a while indoors, so the wait is generous
 * and a slightly stale one (up to a minute) is accepted rather than making the user stand still.
 */
export function currentPosition(timeoutMs = 20_000): Promise<HereResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported' })
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          ok: true,
          coords: { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy },
        }),
      (error) => resolve({ ok: false, reason: failureFor(error.code) }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}
