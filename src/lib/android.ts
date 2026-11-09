/**
 * Saving a file is the one thing every platform does differently, so it lives here.
 * Android: a small bridge the shell app adds (see android/), writing to Downloads.
 * iOS: the share sheet ("Dosyalara Kaydet", iCloud, AirDrop), because Safari has neither
 * the File System Access API nor a download that can be trusted in a home screen app.
 * Everywhere else: a plain browser download.
 */
type AndroidBridge = {
  /** Saves base64 data as Downloads/LifeTracker/<name>; false if it failed. */
  saveFile(name: string, mimeType: string, base64: string): boolean
  /** Overwrites Downloads/LifeTracker/<name> with the text (the automatic backup). */
  writeText(name: string, text: string): boolean
  /** The shell's own version code. */
  version(): number
  // Daily reminder; missing in shells built before it existed, so always checked first.
  remindersAvailable?(): boolean
  /** Schedules one reminder a day at hour:minute, replacing any earlier one. */
  setReminder?(hour: number, minute: number, text: string): boolean
  clearReminder?(): boolean
}

export const androidBridge: AndroidBridge | undefined =
  typeof window !== 'undefined'
    ? (window as unknown as { LifeTrackerAndroid?: AndroidBridge }).LifeTrackerAndroid
    : undefined

/**
 * What actually happened. 'cancelled' is the user closing the share sheet: nothing was
 * saved, but nothing went wrong either, so it must not count as a backup.
 */
export type SaveResult = 'saved' | 'cancelled' | 'failed'

/** iPhone and iPad — iPadOS 13+ claims to be a Mac, but no Mac has a touch screen. */
export function isIos(userAgent: string, platform: string, touchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(platform) || /iPhone|iPad|iPod/.test(userAgent)) return true
  return /Mac/.test(platform) && touchPoints > 1
}

const onIos =
  typeof navigator !== 'undefined' &&
  isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)

/** True where a save opens the share sheet instead of downloading, so the UI can say so. */
export const savesWithShareSheet = onIos && !androidBridge

/** Saves a file the user keeps. Tells the caller whether it really happened. */
export async function saveFile(name: string, blob: Blob): Promise<SaveResult> {
  if (androidBridge) {
    const type = blob.type || 'application/octet-stream'
    return androidBridge.saveFile(name, type, await toBase64(blob)) ? 'saved' : 'failed'
  }
  if (onIos) {
    // Falls through to a download when sharing is unavailable, or when building the file
    // took long enough that Safari no longer counts the tap as a user gesture.
    const shared = await shareFile(name, blob)
    if (shared === 'saved' || shared === 'cancelled') return shared
  }
  return downloadFile(name, blob)
}

async function shareFile(name: string, blob: Blob): Promise<SaveResult | 'unsupported'> {
  if (typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') return 'unsupported'
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' })
  if (!navigator.canShare({ files: [file] })) return 'unsupported'
  try {
    await navigator.share({ files: [file] })
    return 'saved'
  } catch (e) {
    return (e as Error).name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

function downloadFile(name: string, blob: Blob): SaveResult {
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    // Safari and Firefox ignore a click on a link that is not in the document.
    document.body.append(link)
    link.click()
    link.remove()
    // Revoking straight away cancels a download that has not started yet.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return 'saved'
  } catch {
    return 'failed'
  }
}

async function toBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}
