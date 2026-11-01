import { addDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { Habit, HabitLog } from '../db/types'
import { fromDateKey, toDateKey } from './date'
import {
  autoEffort,
  emergencyQuest,
  levelFor,
  questState,
  rankFor,
  statOf,
  summarize,
  tierOn,
  titles,
  xpEvents,
  xpToNext,
  XP,
  type XpData,
} from './leveling'

const START = '2026-01-05' // a Monday
const day = (n: number) => toDateKey(addDays(fromDateKey(START), n))

let nextOrder = 0
function habit(title: string, extra: Partial<Habit> = {}): Habit {
  return {
    id: title,
    title,
    kind: 'check',
    frequency: { type: 'daily' },
    archived: false,
    order: nextOrder++,
    createdAt: new Date(`${START}T08:00:00`).toISOString(),
    ...extra,
  }
}

const done = (h: Habit, date: string, extra: Partial<HabitLog> = {}): HabitLog => ({
  id: `${h.id}-${date}`,
  habitId: h.id,
  date,
  status: 'done',
  ...extra,
})

const data = (habits: Habit[], logs: HabitLog[], more: Partial<XpData> = {}): XpData => ({
  habits,
  logs,
  tasks: [],
  milestones: [],
  projects: [],
  journal: [],
  moods: [],
  library: [],
  achievements: [],
  ...more,
})

/** Habit XP only (no daily quest), over `days` days from the start. */
function habitXp(d: XpData, days: number, today = day(days)): number {
  return xpEvents(d, START, day(days - 1), today)
    .filter((e) => e.source === 'habit')
    .reduce((sum, e) => sum + e.xp, 0)
}

describe('effort', () => {
  it('judges one go of the habit, not how often it is planned', () => {
    expect(autoEffort(habit('Diş fırçalama')).tier).toBe('light')
    expect(autoEffort(habit('Koşu', { frequency: { type: 'timesPerWeek', count: 2 } })).tier).toBe('heavy')
    expect(autoEffort(habit('Maraton antrenmanı')).tier).toBe('intense')
    expect(autoEffort(habit('Fransızca')).tier).toBe('medium')
    // "su" only as a whole word: a presentation is not a glass of water.
    expect(autoEffort(habit('Sunum hazırla')).tier).toBe('medium')
    expect(autoEffort(habit('Su iç')).tier).toBe('light')
  })

  it('reads minutes for timed habits, one tier up when physical', () => {
    expect(autoEffort(habit('Kitap okuma', { kind: 'duration', target: 45 }))).toEqual({ tier: 'heavy', reason: 'Süre 45 dk' })
    expect(autoEffort(habit('Yoga', { kind: 'duration', target: 20 }))).toEqual({ tier: 'heavy', reason: 'Süre 20 dk, fiziksel' })
    expect(autoEffort(habit('Planlama', { kind: 'duration', target: 5 })).tier).toBe('light')
  })

  it('guesses the stat from the name', () => {
    expect(statOf(habit('Sabah koşusu'))).toBe('str')
    expect(statOf(habit('İngilizce çalış'))).toBe('int')
    expect(statOf(habit('Su iç'))).toBe('vit')
    expect(statOf(habit('Meditasyon'))).toBe('sen')
    expect(statOf(habit('Odayı topla'))).toBe('dis')
    expect(statOf(habit('Koşu', { stat: 'sen' }))).toBe('sen')
  })

  it('applies a tier change only from the day it was made', () => {
    const h = habit('Okuma', {
      effortLog: [
        { from: day(0), tier: 'medium' },
        { from: day(10), tier: 'heavy' },
      ],
    })
    expect(tierOn(h, day(9))).toBe('medium')
    expect(tierOn(h, day(10))).toBe('heavy')
  })
})

describe('fairness', () => {
  it('pays two runs a week more than brushing teeth every day', () => {
    const teeth = habit('Diş fırçalama')
    const run = habit('Koşu', { frequency: { type: 'timesPerWeek', count: 2 } })
    const teethXp = habitXp(data([teeth], Array.from({ length: 7 }, (_, i) => done(teeth, day(i)))), 7)
    const runXp = habitXp(data([run], [done(run, day(1)), done(run, day(4))]), 7)
    expect(runXp).toBeGreaterThan(teethXp)
  })

  it("doesn't reward planning more than one does", () => {
    // The same three runs a week, planned daily (43%) or honestly three times a week (100%).
    const inflated = habit('Koşu')
    const honest = habit('Koşu ', { frequency: { type: 'timesPerWeek', count: 3 } })
    const days = Array.from({ length: 28 }, (_, i) => i).filter((i) => [0, 2, 4].includes(i % 7))
    const inflatedXp = habitXp(data([inflated], days.map((i) => done(inflated, day(i)))), 28)
    const honestXp = habitXp(data([honest], days.map((i) => done(honest, day(i)))), 28)
    expect(honestXp).toBeGreaterThan(inflatedXp)
  })

  it('caps piling up easy habits', () => {
    const easy = Array.from({ length: 40 }, (_, i) => habit(`Su iç ${i}`))
    const xp = habitXp(data(easy, easy.map((h) => done(h, day(0)))), 1)
    // 40 × 5 = 200 raw; past 150 it counts half.
    expect(xp).toBeCloseTo(175)
    const real = Array.from({ length: 5 }, (_, i) => habit(`Koşu ${i}`))
    const twenty = easy.slice(0, 20)
    expect(habitXp(data(twenty, twenty.map((h) => done(h, day(0)))), 1)).toBeLessThan(
      habitXp(data(real, real.map((h) => done(h, day(0)))), 1),
    )
  })

  it('gives little for marking old days in bulk', () => {
    const h = habit('Okuma')
    const live = Array.from({ length: 30 }, (_, i) => done(h, day(i), { loggedAt: day(i) }))
    const bulk = Array.from({ length: 30 }, (_, i) => done(h, day(i), { loggedAt: day(30) }))
    const liveXp = habitXp(data([h], live), 30, day(30))
    const bulkXp = habitXp(data([h], bulk), 30, day(30))
    expect(bulkXp).toBeLessThan(liveXp * 0.4)
  })

  it('never takes XP away when a streak breaks', () => {
    const h = habit('Okuma')
    const first = Array.from({ length: 10 }, (_, i) => done(h, day(i)))
    const before = habitXp(data([h], first), 10)
    // Days 10–12 missed: the first ten days are worth the same as before.
    const after = xpEvents(data([h], first), START, day(9), day(13))
      .filter((e) => e.source === 'habit')
      .reduce((s, e) => s + e.xp, 0)
    expect(after).toBeCloseTo(before)
  })

  it('rewards a comeback once a week, however often one stops', () => {
    const h = habit('Okuma')
    // Done, three days missed, done: the second go gets +50%.
    const xp = xpEvents(data([h], [done(h, day(0)), done(h, day(4))]), START, day(6), day(6))
    expect(xp.find((e) => e.date === day(4))?.xp).toBeCloseTo(12 * 1.5)
    // Missing on purpose again in the same week doesn't pay again.
    const again = xpEvents(
      data([h], [done(h, day(7)), done(h, day(11)), done(h, day(15)), done(h, day(19))]),
      day(7),
      day(20),
      day(20),
    ).filter((e) => e.source === 'habit')
    expect(again.filter((e) => e.xp > 12).length).toBe(2)
  })

  it('pays minimum half and counts time beyond the target with diminishing returns', () => {
    const h = habit('Okuma', { kind: 'duration', target: 30 })
    const xp = (log: Partial<HabitLog>) => habitXp(data([h], [done(h, day(0), log)]), 1)
    const base = xp({ value: 30 })
    expect(xp({ status: 'minimum' })).toBeCloseTo(base / 2)
    expect(xp({ value: 60 })).toBeCloseTo(base * 1.5)
    expect(xp({ value: 300 })).toBeCloseTo(base * 1.75)
  })

  it('pays weekly goals half beyond their target', () => {
    const h = habit('Koşu', { frequency: { type: 'timesPerWeek', count: 2 } })
    const two = habitXp(data([h], [done(h, day(0)), done(h, day(1))]), 7)
    const seven = habitXp(data([h], Array.from({ length: 7 }, (_, i) => done(h, day(i)))), 7)
    expect(seven).toBeLessThan(two * 2.5)
  })
})

describe('daily quest', () => {
  it('takes the five hardest daily habits and ignores skipped ones', () => {
    const habits = [
      habit('Su iç'),
      habit('Diş fırçalama'),
      habit('Koşu'),
      habit('Okuma'),
      habit('Meditasyon'),
      habit('Vitamin'),
      habit('Haftalık', { frequency: { type: 'timesPerWeek', count: 2 } }),
    ]
    const state = questState(habits, [], day(0))
    expect(state.habits.map((h) => h.title)).toEqual(['Koşu', 'Okuma', 'Meditasyon', 'Su iç', 'Diş fırçalama'])
    const logs = state.habits.map((h, i) => done(h, day(0), { status: i === 0 ? 'skipped' : 'done' }))
    expect(questState(habits, logs, day(0))).toMatchObject({ done: 4, total: 4, complete: true })
  })
})

describe('levels', () => {
  it('climbs step by step', () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, needed: xpToNext(1) })
    expect(levelFor(xpToNext(1))).toMatchObject({ level: 2, into: 0 })
    expect(rankFor(1)).toBe('E')
    expect(rankFor(10)).toBe('D')
    expect(rankFor(44)).toBe('B')
    expect(rankFor(65)).toBe('S')
  })

  it('takes a steady user to about Lv 3 in a week and 23 in a year', () => {
    const habits = [
      habit('Diş fırçalama'),
      habit('Su iç'),
      habit('Okuma'),
      habit('İngilizce'),
      habit('Koşu', { frequency: { type: 'timesPerWeek', count: 3 } }),
    ]
    const logs: HabitLog[] = []
    // Deterministic "mostly does it": about 85% of the days.
    let seed = 7
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 365; i++) {
      for (const h of habits) {
        if (h.frequency.type === 'timesPerWeek' ? [0, 2, 4].includes(i % 7) && random() < 0.85 : random() < 0.85) {
          logs.push(done(h, day(i)))
        }
      }
    }
    const today = day(365)
    const total = (days: number) => summarize(xpEvents(data(habits, logs), START, day(days - 1), today)).xp
    const week = levelFor(total(7)).level
    const month = levelFor(total(30)).level
    const year = levelFor(total(365)).level
    expect(week).toBeGreaterThanOrEqual(2)
    expect(week).toBeLessThanOrEqual(4)
    expect(month).toBeGreaterThanOrEqual(5)
    expect(month).toBeLessThanOrEqual(8)
    expect(year).toBeGreaterThanOrEqual(20)
    expect(year).toBeLessThanOrEqual(28)
  })
})

describe('emergency quest', () => {
  it('asks for a little more of the habit let slip most', () => {
    const run = habit('Koşu', { createdAt: new Date(`${day(-35)}T08:00:00`).toISOString() })
    const read = habit('Okuma', { createdAt: new Date(`${day(-35)}T08:00:00`).toISOString() })
    // Reading every day, running only every third day in the four weeks before.
    const logs = Array.from({ length: 28 }, (_, i) => i - 28).flatMap((i) => [
      done(read, day(i)),
      ...(i % 3 === 0 ? [done(run, day(i))] : []),
    ])
    const quest = emergencyQuest({ habits: [run, read], logs }, START)
    expect(quest).toMatchObject({ kind: 'habit', habitId: run.id, target: 3 })
    // Met on the third run: 100 XP on that day, nothing lost if it isn't.
    const week = [0, 2, 4, 5].map((i) => done(run, day(i)))
    const events = xpEvents(data([run, read], [...logs, ...week]), START, day(6), day(6)).filter((e) => e.source === 'emergency')
    expect(events).toEqual([{ date: day(4), xp: XP.emergency, source: 'emergency', stat: 'str', tag: 'emergency' }])
  })

  it('falls back to writing in the journal when nothing slips', () => {
    expect(emergencyQuest({ habits: [], logs: [] }, START)).toEqual({ kind: 'journal', week: START, target: 4 })
  })
})

describe('titles', () => {
  it('are earned from levels, streaks and counts', () => {
    const h = habit('Okuma')
    const logs = Array.from({ length: 30 }, (_, i) => done(h, day(i)))
    const summary = summarize([])
    summary.counts.quest = 30
    const list = titles({ level: 2, summary, habits: [h], logs, library: [], today: day(30) })
    const earned = list.filter((t) => t.earned).map((t) => t.id)
    expect(earned).toEqual(['awakened', 'chosen', 'unchained'])
  })
})
