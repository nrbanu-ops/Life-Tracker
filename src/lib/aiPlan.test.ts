import { describe, expect, it } from 'vitest'
import { buildProjectMessage, parseAchievements, parsePlan, PLAN_INSTRUCTIONS, resolveAchievements } from './aiPlan'

const answer = `Harika, işte son plan:

\`\`\`json
{
  "lifeTrackerPlan": 1,
  "project": { "title": "Maraton", "targetDate": "2027-04-18" },
  "milestones": [{ "title": "5 km koş", "dueDate": "2026-12-01" }, { "title": "" }],
  "habits": [
    { "title": "Koşu", "frequency": { "type": "weekdays", "days": [6, 2, 2, 9] }, "minimumVersion": "15 dk yürüyüş" },
    { "title": "Su", "kind": "count", "target": 8, "unit": "bardak" },
    { "title": "Esneme", "kind": "duration" }
  ],
  "tasks": [{ "title": "Ayakkabı al", "date": "2026-11-05", "priority": 2 }, { "title": "Kayıt ol", "priority": 9 }]
}
\`\`\`

Başarılar!`

describe('parsePlan', () => {
  it('reads the json block out of a chatty answer', () => {
    const result = parsePlan(answer)
    if (!result.ok) throw new Error(result.error)
    const { plan } = result
    expect(plan.project).toEqual({ title: 'Maraton', description: undefined, targetDate: '2027-04-18' })
    expect(plan.milestones).toEqual([{ title: '5 km koş', dueDate: '2026-12-01' }])
    expect(plan.skipped).toBe(1)
  })

  it('normalises habits', () => {
    const result = parsePlan(answer)
    if (!result.ok) throw new Error(result.error)
    const [run, water, stretch] = result.plan.habits
    expect(run.frequency).toEqual({ type: 'weekdays', days: [2, 6] })
    expect(run.kind).toBe('check')
    expect(water).toMatchObject({ kind: 'count', target: 8, unit: 'bardak', frequency: { type: 'daily' } })
    // Duration without a target falls back to a check habit.
    expect(stretch.kind).toBe('check')
  })

  it('defaults unknown task priorities to low', () => {
    const result = parsePlan(answer)
    if (!result.ok) throw new Error(result.error)
    expect(result.plan.tasks.map((t) => t.priority)).toEqual([2, 4])
  })

  it('accepts bare json without a code fence', () => {
    expect(parsePlan('{"milestones":[{"title":"A"}]}').ok).toBe(true)
  })

  it('explains what went wrong', () => {
    expect(parsePlan('merhaba')).toMatchObject({ ok: false })
    expect(parsePlan('```json\n{"project": {"title": "x"\n```')).toMatchObject({ ok: false })
    expect(parsePlan('{"habits": []}')).toMatchObject({ ok: false })
  })

  it('understands plans that ignore the format', () => {
    const result = parsePlan(`{
      "plan": {
        "project": {
          "name": "Kilo vermek",
          "adımlar": [{ "başlık": "İlk 2 kilo", "tarih": "2026-12-01" }],
          "alışkanlıklar": [
            "Su içmek",
            { "name": "Yürüyüş", "frequency": "haftada 3", "minimum": "10 dk" },
            { "title": "Spor", "frequency": { "days": ["Pazartesi", "Cuma"] } }
          ]
        },
        "görevler": ["Tartı al"]
      }
    }`)
    if (!result.ok) throw new Error(result.error)
    const { plan } = result
    expect(plan.project?.title).toBe('Kilo vermek')
    expect(plan.milestones).toEqual([{ title: 'İlk 2 kilo', dueDate: '2026-12-01' }])
    expect(plan.habits.map((h) => h.title)).toEqual(['Su içmek', 'Yürüyüş', 'Spor'])
    expect(plan.habits[1]).toMatchObject({ frequency: { type: 'timesPerWeek', count: 3 }, minimumVersion: '10 dk' })
    expect(plan.habits[2].frequency).toEqual({ type: 'weekdays', days: [1, 5] })
    expect(plan.tasks).toEqual([{ title: 'Tartı al', date: undefined, priority: 4 }])
  })

  it('reads a plan Claude wrote in its own shape', () => {
    const result = parsePlan(`{
      "goal": { "title": "Maraton bitirmek", "target_date": "2027-10" },
      "daily_habits": [
        { "name": "Mobilite / esneme", "type": "boolean", "frequency": "daily", "target": 10, "unit": "dk" },
        { "name": "Uyku", "type": "number", "frequency": "daily", "target": 7, "unit": "saat" },
        { "name": "Koşu", "type": "number", "frequency": "weekly_days", "days_per_week": 3 },
        { "name": "Yoga", "type": "number", "target": 20, "unit": "dk" }
      ],
      "monthly_plan": [
        { "month": "2026-11", "milestone": "30 dk kesintisiz koşu", "milestone_date": "2026-11-30" }
      ]
    }`)
    if (!result.ok) throw new Error(result.error)
    const { plan } = result
    expect(plan.project).toMatchObject({ title: 'Maraton bitirmek', targetDate: undefined })
    expect(plan.milestones).toEqual([{ title: '30 dk kesintisiz koşu', dueDate: '2026-11-30' }])
    const [mobility, sleep, run, yoga] = plan.habits
    expect(mobility.kind).toBe('check')
    expect(sleep).toMatchObject({ kind: 'count', target: 7, unit: 'saat' })
    expect(run).toMatchObject({ kind: 'check', frequency: { type: 'timesPerWeek', count: 3 } })
    expect(yoga).toMatchObject({ kind: 'duration', target: 20 })
  })

  it('parses the example in its own instructions', () => {
    const result = parsePlan(PLAN_INSTRUCTIONS)
    expect(result.ok && result.plan.habits.length).toBe(3)
  })
})

describe('buildProjectMessage', () => {
  it('lists what the project already has', () => {
    const message = buildProjectMessage(
      { id: 'p', title: 'Maraton', color: '#000', status: 'active', createdAt: '' },
      [{ id: 'm', projectId: 'p', title: '5 km', done: true, order: 0 }],
      [],
      '2026-10-31',
    )
    expect(message).toContain('"Maraton"')
    expect(message).toContain('- [tamamlandı] 5 km')
    expect(message).toContain('Bugünün tarihi: 2026-10-31')
  })
})

describe('achievements in plans', () => {
  it('reads achievements and drops ones without a usable condition', () => {
    const result = parsePlan(`\`\`\`json
{ "project": { "title": "Maraton" }, "milestones": ["Yarı maraton koş"],
  "achievements": [
    { "title": "Demir bacaklar", "emoji": "🦵", "when": { "habit": "Koşu", "streak": 12 } },
    { "title": "Yarı yol", "when": { "milestone": "Yarı maraton koş" } },
    { "title": "Bozuk", "when": { "habit": "Koşu" } },
    { "title": "Koşulsuz" }
  ] }
\`\`\``)
    if (!result.ok) throw new Error(result.error)
    expect(result.plan.achievements).toEqual([
      { title: 'Demir bacaklar', emoji: '🦵', description: undefined, when: { habit: 'Koşu', streak: 12 } },
      { title: 'Yarı yol', emoji: '🏅', description: undefined, when: { milestone: 'Yarı maraton koş' } },
    ])
    expect(result.plan.skipped).toBe(2)
  })

  it('resolves titles to ids, loosely, and drops what points at nothing', () => {
    const list = parseAchievements(`{"achievements": [
      { "title": "A", "emoji": "1", "when": { "milestone": "yarı maraton" } },
      { "title": "B", "emoji": "2", "when": { "habit": "Koşu", "total": 20 } },
      { "title": "C", "emoji": "3", "when": { "habit": "Yüzme", "total": 5 } },
      { "title": "D", "emoji": "4", "when": { "progress": 75 } }
    ]}`)
    const resolved = resolveAchievements(list, [{ id: 'm', title: 'Yarı maraton koş' }], [{ id: 'h', title: 'Koşu' }])
    expect(resolved.map((a) => a.rule)).toEqual([
      { type: 'milestone', milestoneId: 'm' },
      { type: 'habitTotal', habitId: 'h', count: 20 },
      { type: 'progress', percent: 75 },
    ])
  })
})
