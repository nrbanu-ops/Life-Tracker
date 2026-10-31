/**
 * The Android app is a thin shell around this web app (see android/). It adds a small bridge
 * for what a WebView can't do on its own: saving files to the phone's Downloads folder.
 */
type AndroidBridge = {
  /** Saves base64 data as Downloads/LifeTracker/<name>; false if it failed. */
  saveFile(name: string, mimeType: string, base64: string): boolean
  /** Overwrites Downloads/LifeTracker/<name> with the text (the automatic backup). */
  writeText(name: string, text: string): boolean
  /** The shell's own version code. */
  version(): number
}

export const androidBridge: AndroidBridge | undefined =
  typeof window !== 'undefined'
    ? (window as unknown as { LifeTrackerAndroid?: AndroidBridge }).LifeTrackerAndroid
    : undefined

/** Saves a file: through the Android shell when there is one, otherwise as a browser download. */
export async function saveFile(name: string, blob: Blob): Promise<boolean> {
  if (androidBridge) {
    return androidBridge.saveFile(name, blob.type || 'application/octet-stream', await toBase64(blob))
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
  return true
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
