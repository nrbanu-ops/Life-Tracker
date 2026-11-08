/**
 * A half-written journal entry, kept outside React so it survives leaving the page,
 * the service worker reloading the app for a new version, and iOS killing the app
 * while it's in the background. One draft per day, so writing in two days at once
 * doesn't mix them. Photos aren't kept: a Blob doesn't fit in localStorage, and a
 * photo can be picked again while the text can't be written again.
 */
const PREFIX = 'life-tracker:draft:'

export const draftKey = (date: string): string => `${PREFIX}${date}`

export function loadDraft(date: string): string {
  try {
    return localStorage.getItem(draftKey(date)) ?? ''
  } catch {
    return ''
  }
}

/** Blank text clears the draft instead of leaving an empty one behind. */
export function saveDraft(date: string, text: string): void {
  try {
    if (text.trim() === '') localStorage.removeItem(draftKey(date))
    else localStorage.setItem(draftKey(date), text)
  } catch {
    // Full or blocked storage must not stop someone from writing.
  }
}

export function clearDraft(date: string): void {
  saveDraft(date, '')
}
