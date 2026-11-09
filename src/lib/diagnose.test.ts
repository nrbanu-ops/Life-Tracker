import { describe, expect, it } from 'vitest'
import { reportText, verdict, type Check } from './diagnose'

const checks: Check[] = [
  { label: 'Depolama alanı', state: 'ok', detail: '12 MB / 2 GB' },
  { label: 'Fotoğraf boyutunda yazma', state: 'fail', detail: 'QuotaExceededError' },
  { label: 'Mikrofon izni', state: 'skip', detail: 'denenmedi' },
]

describe('reportText', () => {
  it('is one line per step, with the time at the top', () => {
    expect(reportText(checks, '9.11.2026 18:00')).toBe(
      [
        'Life Tracker tanılama · 9.11.2026 18:00',
        '✓ Depolama alanı: 12 MB / 2 GB',
        '✗ Fotoğraf boyutunda yazma: QuotaExceededError',
        '— Mikrofon izni: denenmedi',
      ].join('\n'),
    )
  })

  it('leaves out the dash when a step has no detail', () => {
    expect(reportText([{ label: 'Uygulama', state: 'ok' }], 'şimdi')).toContain('✓ Uygulama')
  })
})

describe('verdict', () => {
  it('names the failed steps', () => {
    expect(verdict(checks)).toBe('1 adım başarısız: Fotoğraf boyutunda yazma.')
  })

  it('skipped steps are not failures', () => {
    expect(verdict([{ label: 'Mikrofon izni', state: 'skip' }])).toContain('Her şey çalışıyor')
  })
})
