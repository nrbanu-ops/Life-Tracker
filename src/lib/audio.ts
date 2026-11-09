/**
 * What a stored voice note needs to be shown.
 *
 * Recording was removed: on the user's phone Android would not open the microphone, through any
 * of the ways the browser offers, and a button that never works is worse than no button. Notes
 * recorded before that are still kept, played and backed up, so nothing already said is lost.
 */

/** "0:45", "2:03", "12:00". */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
