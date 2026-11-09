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
