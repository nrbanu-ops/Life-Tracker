import { describe, expect, it } from 'vitest'
import { matches, PER_GROUP, preview, queryWords, searchEverything, type SearchData } from './search'

const data: SearchData = {
  habits: [
    { id: 'h1', title: 'Koşu', archived: false },
    { id: 'h2', title: 'Sabah koşusu', archived: true },
    { id: 'h3', title: 'Su içmek', archived: false },
  ],
  projects: [{ id: 'p1', title: 'Maraton', description: 'Koşu planı' }],
  milestones: [
    { id: 'm1', projectId: 'p1', title: '10 km koşu', done: true },
    { id: 'm2', projectId: 'p1', title: 'Yüzme', done: false },
  ],
  tasks: [
    { id: 't1', title: 'Koşu ayakkabısı al', date: '2026-11-10', done: false },
    { id: 't2', title: 'Eski koşu kaydı', done: true },
  ],
  journal: [
    { id: 'j1', date: '2026-11-01', text: 'Sabah koşuya çıktım, hava güzeldi', review: false },
    { id: 'j2', date: '2026-11-08', text: 'Bu hafta koşu iyi gitti', review: true },
    { id: 'j3', date: '2026-11-05', text: 'Kitap okudum', review: false },
  ],
  // Matches on the review, not the title: the search reads what you wrote about it too.
  library: [
    { id: 'l1', kind: 'book', title: 'Koşmasaydım Yazamazdım', creator: 'Haruki Murakami', review: 'Koşu üzerine' },
  ],
}

describe('matches', () => {
  it('ignores case, Turkish letters included', () => {
    expect(matches('Sabah KOŞUSU', queryWords('koşu'))).toBe(true)
    expect(matches('İstanbul', queryWords('istanbul'))).toBe(true)
  })

  it('wants every word, in any order', () => {
    expect(matches('Koşu ayakkabısı al', queryWords('al koşu'))).toBe(true)
    expect(matches('Koşu ayakkabısı al', queryWords('koşu bisiklet'))).toBe(false)
  })
})

describe('preview', () => {
  it('flattens the text and cuts it off', () => {
    expect(preview('iki  satır\nbirleşti')).toBe('iki satır birleşti')
    expect(preview('abcdefghij', 5)).toBe('abcd…')
  })
})

describe('searchEverything', () => {
  it('says nothing until there is something to look for', () => {
    expect(searchEverything(data, '   ')).toEqual([])
  })

  it('looks in every kind of thing at once', () => {
    const groups = searchEverything(data, 'koşu')
    expect(groups.map((g) => g.label)).toEqual([
      "Habit'ler",
      'Projeler',
      'Proje adımları',
      'Görevler',
      'Günlük',
      'Kütüphane',
    ])
  })

  it('puts live things before archived and finished ones', () => {
    const [habits] = searchEverything(data, 'koşu')
    expect(habits.hits.map((h) => h.id)).toEqual(['h1', 'h2'])
    expect(habits.hits[1].detail).toBe('Arşivde')
    const tasks = searchEverything(data, 'koşu').find((g) => g.label === 'Görevler')
    expect(tasks?.hits.map((h) => h.id)).toEqual(['t1', 't2'])
  })

  it('links each hit where that thing lives', () => {
    const groups = searchEverything(data, 'koşu')
    const byLabel = Object.fromEntries(groups.map((g) => [g.label, g.hits[0]]))
    expect(byLabel['Projeler'].to).toBe('/projeler/p1')
    expect(byLabel['Proje adımları'].to).toBe('/projeler/p1')
    expect(byLabel['Proje adımları'].detail).toBe('Maraton · tamam')
    // A journal hit opens that day on the calendar.
    expect(byLabel['Günlük'].to).toBe('/takvim?gun=2026-11-08')
  })

  it('shows the newest journal entries first and marks the AI review', () => {
    const journal = searchEverything(data, 'koşu').find((g) => g.label === 'Günlük')
    expect(journal?.hits.map((h) => h.id)).toEqual(['j2', 'j1'])
    expect(journal?.hits[0].detail).toBe('2026-11-08 · haftalık bakış')
  })

  it('keeps each group short and counts the rest', () => {
    const many: SearchData = {
      ...data,
      tasks: Array.from({ length: PER_GROUP + 3 }, (_, i) => ({ id: `t${i}`, title: `Koşu ${i}`, done: false })),
    }
    const tasks = searchEverything(many, 'koşu').find((g) => g.label === 'Görevler')
    expect(tasks?.hits).toHaveLength(PER_GROUP)
    expect(tasks?.more).toBe(3)
  })

  it('leaves out the kinds with no match', () => {
    expect(searchEverything(data, 'yüzme').map((g) => g.label)).toEqual(['Proje adımları'])
  })
})
