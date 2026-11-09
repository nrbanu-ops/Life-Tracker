import { describe, expect, it } from 'vitest'
import { formatDuration } from './audio'

describe('formatDuration', () => {
  it('writes seconds as minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(45)).toBe('0:45')
    expect(formatDuration(123)).toBe('2:03')
    expect(formatDuration(720)).toBe('12:00')
  })

  it('rounds and never goes below zero', () => {
    expect(formatDuration(45.6)).toBe('0:46')
    expect(formatDuration(-5)).toBe('0:00')
  })
})
