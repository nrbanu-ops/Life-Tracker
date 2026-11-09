import { describe, expect, it } from 'vitest'
import type { WeekPlan } from '../db/types'
import { cleanPriorities, hasPlan, planProgress, planPrompt, WEEK_PLAN_MAX } from './weekPlan'

// 2026-11-09 is a Monday, so 2026-11-08 is the Sunday before and 2026-11-11 a Wednesday.
const MON = '2026-11-09'
const SUN = '2026-11-08'
const WED = '2026-11-11'

const plan = (texts: [string, boolean][]): WeekPlan => ({
  week: MON,
  priorities: texts.map(([text, done]) => ({ text, done })),
  createdAt: '2026-11-09T08:00:00.000Z',
})

describe('planProgress', () => {
  it('counts the ticked priorities', () => {
    expect(planProgress(plan([['a', true], ['b', false], ['c', true]]))).toEqual({ done: 2, total: 3 })
  })

  it('is empty without a plan', () => {
    expect(planProgress(undefined)).toEqual({ done: 0, total: 0 })
  })
})

describe('hasPlan', () => {
  it('needs at least one priority', () => {
    expect(hasPlan(undefined)).toBe(false)
    expect(hasPlan(plan([]))).toBe(false)
    expect(hasPlan(plan([['a', false]]))).toBe(true)
  })
})

describe('planPrompt', () => {
  it('says nothing once the week is planned', () => {
    expect(planPrompt(WED, plan([['a', false]]))).toBe('none')
    expect(planPrompt(SUN, plan([['a', false]]))).toBe('none')
  })

  it('asks with a card on Sunday and Monday', () => {
    expect(planPrompt(SUN, undefined)).toBe('card')
    expect(planPrompt(MON, undefined)).toBe('card')
  })

  it('keeps to one line on the other days', () => {
    expect(planPrompt(WED, undefined)).toBe('line')
    expect(planPrompt('2026-11-14', undefined)).toBe('line')
  })

  it('treats a plan with no priorities as unplanned', () => {
    expect(planPrompt(MON, plan([]))).toBe('card')
  })
})

describe('cleanPriorities', () => {
  it('trims, drops the empty boxes and caps the list', () => {
    expect(cleanPriorities(['  Koşu ', '', '   ', 'Kitap'])).toEqual([
      { text: 'Koşu', done: false },
      { text: 'Kitap', done: false },
    ])
    // The cap counts what is actually written, so a blank box in the middle costs nothing.
    expect(cleanPriorities(['a', '', 'b', 'c', 'd']).map((p) => p.text)).toEqual(['a', 'b', 'c'])
    expect(cleanPriorities(['a', 'b', 'c', 'd'])).toHaveLength(WEEK_PLAN_MAX)
  })

  it('keeps the tick of a priority whose text did not change', () => {
    const before = plan([['Koşu', true], ['Kitap', false]])
    expect(cleanPriorities(['Koşu', 'Kitap okumak'], before)).toEqual([
      { text: 'Koşu', done: true },
      { text: 'Kitap okumak', done: false },
    ])
  })

  it('does not carry a tick over to a reworded priority', () => {
    const before = plan([['Koşu', true]])
    expect(cleanPriorities(['Yürüyüş'], before)).toEqual([{ text: 'Yürüyüş', done: false }])
  })
})
