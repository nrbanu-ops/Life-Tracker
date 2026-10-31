import { describe, expect, it } from 'vitest'
import type { LibraryItem } from '../db/types'
import { bookProgress, finishedByDay, goalProgress, monthSummary, fromOpenLibrary, fromTmdb, fromTvmaze, fromWikipediaGames, groupLibrary, progressLabel, yearSummary } from './library'

describe('search result mapping', () => {
  it('reads games from a Wikipedia search, skipping series and franchises', () => {
    const results = fromWikipediaGames({
      query: {
        pages: {
          '7': { pageid: 7, index: 3, title: 'The Witcher', description: 'Fantasy franchise', thumbnail: { source: 'f.jpg' } },
          '2': { pageid: 2, index: 2, title: 'The Witcher (video game series)', description: 'Video game series by CD Projekt RED' },
          '4': { pageid: 4, index: 4, title: 'Hades (video game)', description: '2020 video game developed by Supergiant Games' },
          '1': { pageid: 1, index: 1, title: 'The Witcher 3: Wild Hunt', description: '2015 video game', thumbnail: { source: 'w3.jpg' } },
        },
      },
    })
    expect(results).toEqual([
      { kind: 'game', title: 'The Witcher 3: Wild Hunt', creator: undefined, year: 2015, posterUrl: 'w3.jpg', source: 'wikipedia', externalId: '1' },
      { kind: 'game', title: 'Hades', creator: 'Supergiant Games', year: 2020, posterUrl: undefined, source: 'wikipedia', externalId: '4' },
    ])
    expect(fromWikipediaGames({ batchcomplete: '' })).toEqual([])
  })

  it('reads Open Library books, covers first', () => {
    const results = fromOpenLibrary({
      docs: [
        { key: '/works/1', title: 'Kapaksız' },
        { key: '/works/2', title: 'Kürk Mantolu Madonna', author_name: ['Sabahattin Ali'], first_publish_year: 1943, cover_i: 42 },
        { title: '' },
      ],
    })
    expect(results.map((r) => r.title)).toEqual(['Kürk Mantolu Madonna', 'Kapaksız'])
    expect(results[0]).toMatchObject({
      kind: 'book',
      creator: 'Sabahattin Ali',
      year: 1943,
      posterUrl: 'https://covers.openlibrary.org/b/id/42-M.jpg',
    })
  })

  it('reads TVmaze shows', () => {
    const [show] = fromTvmaze([
      { show: { id: 7, name: 'Behzat Ç.', premiered: '2010-09-19', network: { name: 'Star TV' }, image: { medium: 'http://x/p.jpg' } } },
    ])
    expect(show).toEqual({
      kind: 'series',
      title: 'Behzat Ç.',
      creator: 'Star TV',
      year: 2010,
      posterUrl: 'https://x/p.jpg',
      source: 'tvmaze',
      externalId: '7',
    })
  })

  it('reads TMDB films', () => {
    const [film] = fromTmdb({ results: [{ id: 27205, title: 'Başlangıç', release_date: '2010-07-15', poster_path: '/a.jpg' }] }, 'movie')
    expect(film).toMatchObject({ title: 'Başlangıç', year: 2010, posterUrl: 'https://image.tmdb.org/t/p/w342/a.jpg' })
  })

  it('survives unexpected responses', () => {
    expect(fromOpenLibrary(null)).toEqual([])
    expect(fromTvmaze({ error: 1 })).toEqual([])
    expect(fromTmdb({ status_message: 'x' }, 'movie')).toEqual([])
  })
})

const item = (over: Partial<LibraryItem>): LibraryItem => ({
  id: Math.random().toString(),
  kind: 'book',
  title: 'x',
  status: 'done',
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
})

describe('groupLibrary', () => {
  it('splits by status and sorts finished items latest first', () => {
    const items = [
      item({ title: 'a', finishedAt: '2026-03-01' }),
      item({ title: 'b', finishedAt: '2026-05-01' }),
      item({ title: 'c', status: 'active' }),
      item({ title: 'd', status: 'want', kind: 'movie' }),
    ]
    const all = groupLibrary(items, 'all')
    expect(all.done.map((i) => i.title)).toEqual(['b', 'a'])
    expect(all.active.map((i) => i.title)).toEqual(['c'])
    expect(groupLibrary(items, 'movie').want.map((i) => i.title)).toEqual(['d'])
    expect(groupLibrary(items, 'movie').done).toEqual([])
  })
})

describe('progress', () => {
  it('describes where the user is', () => {
    expect(progressLabel({ kind: 'book', page: 180, pageCount: 320 })).toBe('180 / 320 sayfa')
    expect(progressLabel({ kind: 'book', page: 40 })).toBe('s. 40')
    expect(progressLabel({ kind: 'series', season: 2, episode: 5 })).toBe('S2 · B5')
    expect(progressLabel({ kind: 'series', episode: 3 })).toBe('B3')
    expect(progressLabel({ kind: 'movie' })).toBeUndefined()
  })

  it('caps book progress at the end', () => {
    expect(bookProgress({ page: 160, pageCount: 320 })).toBe(0.5)
    expect(bookProgress({ page: 400, pageCount: 320 })).toBe(1)
    expect(bookProgress({ page: 10 })).toBeUndefined()
  })
})

describe('calendar helpers', () => {
  const items = [
    item({ title: 'a', finishedAt: '2026-10-05' }),
    item({ title: 'b', kind: 'movie', finishedAt: '2026-10-05' }),
    item({ title: 'c', finishedAt: '2026-09-30' }),
    item({ title: 'd', status: 'active' }),
  ]

  it('groups finished items by day', () => {
    const byDay = finishedByDay(items)
    expect(byDay.get('2026-10-05')?.map((i) => i.title)).toEqual(['a', 'b'])
    expect(byDay.size).toBe(2)
  })

  it('summarises a month', () => {
    expect(monthSummary(items, '2026-10-01')).toBe('1 kitap · 1 film')
    expect(monthSummary(items, '2026-08-01')).toBeUndefined()
  })
})

describe('goalProgress', () => {
  it('counts finished items of the goal year, in kind order', () => {
    const items = [
      item({ finishedAt: '2026-02-01' }),
      item({ finishedAt: '2025-02-01' }),
      item({ kind: 'movie', finishedAt: '2026-03-01' }),
      item({ status: 'active' }),
    ]
    const goals = [
      { id: '2026-movie', year: 2026, kind: 'movie' as const, target: 10 },
      { id: '2026-book', year: 2026, kind: 'book' as const, target: 24 },
      { id: '2025-book', year: 2025, kind: 'book' as const, target: 12 },
    ]
    expect(goalProgress(items, goals, 2026)).toEqual([
      { kind: 'book', target: 24, done: 1 },
      { kind: 'movie', target: 10, done: 1 },
    ])
  })
})

describe('yearSummary', () => {
  it('counts what was finished this year', () => {
    const items = [
      item({ finishedAt: '2026-02-01' }),
      item({ finishedAt: '2026-04-01' }),
      item({ kind: 'movie', finishedAt: '2026-04-02' }),
      item({ finishedAt: '2025-12-31' }),
      item({ kind: 'series', status: 'active' }),
    ]
    expect(yearSummary(items, '2026-10-31')).toBe('Bu yıl: 2 kitap · 1 film')
    expect(yearSummary([], '2026-10-31')).toBeUndefined()
  })

  it('mentions books read in other languages', () => {
    const items = [
      item({ finishedAt: '2026-02-01', language: 'en' }),
      item({ finishedAt: '2026-03-01', language: 'tr' }),
      item({ finishedAt: '2026-04-01', language: 'Japonca' }),
    ]
    expect(yearSummary(items, '2026-10-31')).toBe('Bu yıl: 3 kitap (1 İngilizce, 1 Japonca)')
  })
})
