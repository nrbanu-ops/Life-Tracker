import { describe, expect, it } from 'vitest'
import type { Milestone, Project } from '../db/types'
import { compareProjects, describeTarget, nextMilestone, projectProgress } from './projects'

const milestone = (id: string, order: number, done = false): Milestone => ({
  id,
  projectId: 'p',
  title: id,
  done,
  order,
})

const project = (id: string, extra: Partial<Project> = {}): Project => ({
  id,
  title: id,
  color: '#000',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra,
})

describe('projectProgress', () => {
  it('divides completed by total milestones', () => {
    expect(projectProgress([milestone('a', 0, true), milestone('b', 1)])).toEqual({
      done: 1,
      total: 2,
      ratio: 0.5,
    })
    expect(projectProgress([]).ratio).toBe(0)
  })
})

describe('nextMilestone', () => {
  it('picks the first open one by order', () => {
    const list = [milestone('c', 2), milestone('a', 0, true), milestone('b', 1)]
    expect(nextMilestone(list)?.id).toBe('b')
    expect(nextMilestone([milestone('a', 0, true)])).toBeUndefined()
  })
})

describe('describeTarget', () => {
  it('counts days to or past the target', () => {
    expect(describeTarget('2026-11-10', '2026-10-31')).toBe('10 gün kaldı')
    expect(describeTarget('2026-10-31', '2026-10-31')).toBe('Hedef bugün')
    expect(describeTarget('2026-10-29', '2026-10-31')).toBe('2 gün geçti')
  })
})

describe('compareProjects', () => {
  it('orders by status, then target date', () => {
    const sorted = [
      project('done', { status: 'done' }),
      project('later', { targetDate: '2027-05-01' }),
      project('paused', { status: 'paused' }),
      project('soon', { targetDate: '2026-12-01' }),
      project('open'),
    ].sort(compareProjects)
    expect(sorted.map((p) => p.id)).toEqual(['soon', 'later', 'open', 'paused', 'done'])
  })
})
