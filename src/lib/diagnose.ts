/**
 * The self-test behind Ayarlar → Tanılama.
 *
 * A phone can refuse a photo or a voice note at any of several steps, and from the outside they
 * all look the same: nothing happens. This walks the steps one by one so the answer is a fact
 * instead of a guess — and so it can be copied out of the phone and read by someone else.
 */

export type CheckState = 'ok' | 'fail' | 'skip'

export type Check = {
  /** What was tried, in Turkish. */
  label: string
  state: CheckState
  /** The result, or the reason it failed. */
  detail?: string
}

export const STATE_MARK: Record<CheckState, string> = { ok: '✓', fail: '✗', skip: '—' }

/** Plain text for the clipboard: one line per step, so it can be pasted into a message. */
export function reportText(checks: Check[], when: string): string {
  const lines = checks.map((check) =>
    `${STATE_MARK[check.state]} ${check.label}${check.detail ? `: ${check.detail}` : ''}`,
  )
  return [`Life Tracker tanılama · ${when}`, ...lines].join('\n')
}

/** Whether anything actually failed, so the screen can say so in one line. */
export function verdict(checks: Check[]): string {
  const failed = checks.filter((check) => check.state === 'fail')
  if (failed.length === 0) return 'Her şey çalışıyor. Sorun buradaysa ekran görüntüsü yolla.'
  return `${failed.length} adım başarısız: ${failed.map((check) => check.label).join(', ')}.`
}
