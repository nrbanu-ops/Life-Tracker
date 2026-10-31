import { describe, expect, it } from 'vitest'
import type { Habit, Project } from '../db/types'
import { parsePlan } from './aiPlan'
import { buildSystemPrompt, geminiReady, splitAnswer } from './assistant'

describe('splitAnswer', () => {
  it('pulls out the json block with the text around it', () => {
    const answer = 'İşte planın:\n```json\n{ "lifeTrackerPlan": 1, "habits": [{ "title": "Koşu" }] }\n```\nKolay gelsin!'
    const { before, json, after } = splitAnswer(answer)
    expect(before).toBe('İşte planın:')
    expect(after).toBe('Kolay gelsin!')
    expect(parsePlan(json!).ok).toBe(true)
  })

  it('leaves plain answers and non-json code alone', () => {
    expect(splitAnswer('Kaç km koşabiliyorsun?')).toEqual({ before: 'Kaç km koşabiliyorsun?', after: '' })
    expect(splitAnswer('```\nnot json\n```').json).toBeUndefined()
  })
})

describe('buildSystemPrompt', () => {
  const project = { id: 'p', title: 'Maraton', status: 'active' } as Project
  const habits = [
    { id: 'h1', title: 'Koşu', projectId: 'p', archived: false },
    { id: 'h2', title: 'Eski', archived: true },
  ] as Habit[]

  it('includes today, current projects and active habits', () => {
    const prompt = buildSystemPrompt({ today: '2026-10-31', projects: [project], habits })
    expect(prompt).toContain('Bugünün tarihi: 2026-10-31')
    expect(prompt).toContain('projeleri: Maraton')
    expect(prompt).toContain("habit'leri: Koşu")
    expect(prompt).not.toContain('Eski')
  })

  it('describes the project being extended', () => {
    const prompt = buildSystemPrompt({
      today: '2026-10-31',
      projects: [project],
      habits,
      project: { project, milestones: [], habits: [habits[0]] },
    })
    expect(prompt).toContain('Mevcut "Maraton" projeme')
  })
})

it('geminiReady needs the switch and a key', () => {
  expect(geminiReady({ claude: true, gemini: true, geminiKey: 'k' })).toBe(true)
  expect(geminiReady({ claude: true, gemini: false, geminiKey: 'k' })).toBe(false)
  expect(geminiReady({ claude: true, gemini: true, geminiKey: ' ' })).toBe(false)
})
