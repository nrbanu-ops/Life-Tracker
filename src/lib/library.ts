import type { LibraryInput } from '../db/library'
import type { LibraryGoal, LibraryItem, LibraryKind, LibraryStatus } from '../db/types'
import { areaAt, nearbyPhoto, parseGoogleMapsUrl, plainTitle, searchPlaces, sharedPlaceQueries } from './places'

/** Every kind, in the order the app lists them. */
export const LIBRARY_KINDS: LibraryKind[] = ['book', 'movie', 'series', 'place', 'other']

/** Kinds with a search; 'other' is added by hand. */
export type SearchableKind = Exclude<LibraryKind, 'other'>
export const isSearchable = (kind: LibraryKind): kind is SearchableKind => kind !== 'other'

export const KIND_LABEL: Record<LibraryKind, string> = {
  book: 'Kitap',
  movie: 'Film',
  series: 'Dizi',
  place: 'Yer',
  other: 'Diğer',
}

export const KIND_EMOJI: Record<LibraryKind, string> = {
  book: '📚',
  movie: '🎬',
  series: '📺',
  place: '📍',
  other: '✨',
}

export const CREATOR_LABEL: Record<LibraryKind, string> = {
  book: 'Yazar',
  movie: 'Yönetmen',
  series: 'Kanal / platform',
  place: 'Şehir / ülke',
  other: 'Kimden (isteğe bağlı)',
}

/** Lower-case word after a count: "3 kitap", "2 yer", "1 diğer". */
export const kindUnit = (kind: LibraryKind) => KIND_LABEL[kind].toLocaleLowerCase('tr')

export const STATUS_LABEL: Record<LibraryStatus, string> = {
  want: 'İstiyorum',
  active: 'Devam',
  done: 'Bitti',
  dropped: 'Bıraktım',
}

/** A place is either still on the wish list or visited; reading-style progress doesn't apply. */
export const statusesFor = (kind: LibraryKind): LibraryStatus[] =>
  kind === 'place' ? ['want', 'done'] : ['want', 'active', 'done', 'dropped']

export const statusLabel = (kind: LibraryKind, status: LibraryStatus) =>
  kind === 'place' ? (status === 'want' ? 'Gitmek istiyorum' : 'Gittim') : STATUS_LABEL[status]

export const LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'İngilizce' },
  { code: 'de', label: 'Almanca' },
  { code: 'fr', label: 'Fransızca' },
  { code: 'es', label: 'İspanyolca' },
  { code: 'it', label: 'İtalyanca' },
  { code: 'ru', label: 'Rusça' },
]

/** "İngilizce" for 'en'; free text is shown as typed. */
export const languageLabel = (language: string) =>
  LANGUAGES.find((l) => l.code === language)?.label ?? language

/** Short corner tag: "EN", or the first letters of a typed-in language. */
export const languageBadge = (language: string) =>
  (LANGUAGES.some((l) => l.code === language) ? language : language.slice(0, 3)).toLocaleUpperCase('tr')

const LAST_LANGUAGE = 'life-tracker:last-language'

/** The language picked for the previous book, offered again for the next one. */
export function getLastLanguage(): string | undefined {
  try {
    return localStorage.getItem(LAST_LANGUAGE) ?? undefined
  } catch {
    return undefined
  }
}

export function setLastLanguage(language: string): void {
  try {
    localStorage.setItem(LAST_LANGUAGE, language)
  } catch {
    // Not remembered; Turkish is offered next time.
  }
}

/** Stars and a review make sense once the user has started it. */
export const canRate = (status: LibraryStatus) => status !== 'want'

/** Progress is asked while reading/watching, and kept to show where the user gave up. */
export const tracksProgress = (item: { kind: LibraryKind; status: LibraryStatus }) =>
  (item.kind === 'book' || item.kind === 'series') && (item.status === 'active' || item.status === 'dropped')

/** 0–1 through a book with a known page count. */
export function bookProgress(item: Pick<LibraryItem, 'page' | 'pageCount'>): number | undefined {
  if (item.page === undefined || !item.pageCount) return undefined
  return Math.min(1, item.page / item.pageCount)
}

/** "180 / 320 sayfa", "s. 180" or "S2 · B5"; undefined when nothing is noted. */
export function progressLabel(item: Pick<LibraryItem, 'kind' | 'page' | 'pageCount' | 'season' | 'episode'>) {
  if (item.kind === 'book' && item.page !== undefined) {
    return item.pageCount ? `${item.page} / ${item.pageCount} sayfa` : `s. ${item.page}`
  }
  if (item.kind === 'series' && (item.season !== undefined || item.episode !== undefined)) {
    return [item.season !== undefined && `S${item.season}`, item.episode !== undefined && `B${item.episode}`]
      .filter(Boolean)
      .join(' · ')
  }
  return undefined
}

/** A search hit; becomes a LibraryItem once the user picks it. */
export type SearchResult = Omit<LibraryInput, 'posterBlob'> & { pageCount?: number }

type Json = Record<string, unknown>
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const yearOf = (v: unknown): number | undefined => {
  const year = typeof v === 'number' ? v : Number(str(v)?.slice(0, 4))
  return Number.isInteger(year) && year > 0 ? year : undefined
}
const list = (v: unknown): Json[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'object' && x !== null) : [])

/** Results with a poster first, keeping each group's order. */
const postersFirst = (results: SearchResult[]) =>
  [...results.filter((r) => r.posterUrl), ...results.filter((r) => !r.posterUrl)]

export function fromOpenLibrary(json: unknown): SearchResult[] {
  const docs = list((json as Json | null)?.docs)
  return postersFirst(
    docs.flatMap((doc) => {
      const title = str(doc.title)
      if (!title) return []
      const authors = Array.isArray(doc.author_name) ? doc.author_name : []
      return [
        {
          kind: 'book' as const,
          title,
          creator: str(authors[0]),
          year: yearOf(doc.first_publish_year),
          posterUrl: typeof doc.cover_i === 'number' ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
          source: 'openlibrary',
          externalId: str(doc.key),
          pageCount: typeof doc.number_of_pages_median === 'number' ? doc.number_of_pages_median : undefined,
        },
      ]
    }),
  )
}

export function fromTvmaze(json: unknown): SearchResult[] {
  return postersFirst(
    list(json).flatMap(({ show }) => {
      if (typeof show !== 'object' || show === null) return []
      const s = show as Json
      const title = str(s.name)
      if (!title) return []
      const channel = (s.network ?? s.webChannel) as Json | null
      const image = s.image as Json | null
      return [
        {
          kind: 'series' as const,
          title,
          creator: str(channel?.name),
          year: yearOf(s.premiered),
          posterUrl: str(image?.medium)?.replace(/^http:/, 'https:'),
          source: 'tvmaze',
          externalId: s.id === undefined ? undefined : String(s.id),
        },
      ]
    }),
  )
}

export function fromTmdb(json: unknown, kind: 'movie' | 'series'): SearchResult[] {
  const results = list((json as Json | null)?.results)
  return postersFirst(
    results.flatMap((r) => {
      const title = str(r.title) ?? str(r.name)
      if (!title) return []
      const poster = str(r.poster_path)
      return [
        {
          kind,
          title,
          year: yearOf(r.release_date ?? r.first_air_date),
          posterUrl: poster ? `https://image.tmdb.org/t/p/w342${poster}` : undefined,
          source: 'tmdb',
          externalId: r.id === undefined ? undefined : String(r.id),
        },
      ]
    }),
  )
}

/** Thrown for a film search when no TMDB key is saved. */
export class MissingKeyError extends Error {}

/** Searches the free poster sources: Open Library for books, TVmaze for series, TMDB for films. */
export async function searchLibrary(
  kind: SearchableKind,
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const q = encodeURIComponent(query.trim())
  if (kind === 'book') {
    const fields = 'key,title,author_name,first_publish_year,cover_i,number_of_pages_median'
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=18&fields=${fields}`, { signal })
    return fromOpenLibrary(await res.json())
  }
  if (kind === 'place') return searchPlace(query, signal)
  if (kind === 'series') {
    const res = await fetch(`https://api.tvmaze.com/search/shows?q=${q}`, { signal })
    return fromTvmaze(await res.json())
  }
  const key = getTmdbKey()
  if (!key) throw new MissingKeyError()
  // TMDB offers a short "API key" and a long "read access token"; either works.
  const isToken = key.length > 60
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${q}&language=tr-TR${isToken ? '' : `&api_key=${encodeURIComponent(key)}`}`,
    { signal, headers: isToken ? { Authorization: `Bearer ${key}` } : undefined },
  )
  if (res.status === 401) throw new MissingKeyError('TMDB anahtarı geçersiz.')
  return fromTmdb(await res.json(), 'movie')
}

/** OpenStreetMap search, or a single result read from a pasted Google Maps link. */
async function searchPlace(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const fromLink = parseGoogleMapsUrl(query)
  if (fromLink) {
    // Shared from the app, the name is also on its own line before the link.
    const name = fromLink.title ?? (plainTitle(query) || undefined)
    const [creator, posterUrl] = await Promise.all([
      areaAt(fromLink.latitude, fromLink.longitude, signal),
      nearbyPhoto(fromLink.latitude, fromLink.longitude, name, signal),
    ])
    const title = name ?? creator?.split(',')[0] ?? 'Google Haritalar konumu'
    return [
      { kind: 'place', title, creator, posterUrl, latitude: fromLink.latitude, longitude: fromLink.longitude, source: 'google-link' },
    ]
  }
  // Shared from the Google Maps app: search by its name and address, one try at a time.
  const shared = sharedPlaceQueries(query)
  for (const [i, q] of (shared ?? [query]).entries()) {
    // OpenStreetMap asks for at most one search a second.
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1100))
    if (signal?.aborted) break
    const results = await searchPlaces(q, signal)
    // The Wikipedia tag only served to find a photo.
    if (results.length > 0) {
      return results.map((result) => {
        const { wikipedia: _, ...place } = result
        return place
      })
    }
  }
  return []
}

const TMDB_KEY = 'life-tracker:tmdb-key'

export function getTmdbKey(): string | undefined {
  try {
    return localStorage.getItem(TMDB_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function setTmdbKey(key: string): void {
  try {
    if (key.trim()) localStorage.setItem(TMDB_KEY, key.trim())
    else localStorage.removeItem(TMDB_KEY)
  } catch {
    // Storage unavailable (e.g. private mode); film search just stays off.
  }
}

/** Page sections: in progress, next, finished (latest first) and given up. */
export function groupLibrary(items: LibraryItem[], kind: LibraryKind | 'all') {
  const shown = kind === 'all' ? items : items.filter((i) => i.kind === kind)
  const newestFirst = (a: LibraryItem, b: LibraryItem) => b.createdAt.localeCompare(a.createdAt)
  return {
    active: shown.filter((i) => i.status === 'active').sort(newestFirst),
    want: shown.filter((i) => i.status === 'want').sort(newestFirst),
    done: shown
      .filter((i) => i.status === 'done')
      .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '') || newestFirst(a, b)),
    dropped: shown.filter((i) => i.status === 'dropped').sort(newestFirst),
  }
}

const countLabel = (kind: LibraryKind, n: number) => `${n} ${kindUnit(kind)}`

/** Finished items by finish day, for the library calendar. */
export function finishedByDay(items: LibraryItem[]): Map<string, LibraryItem[]> {
  const byDay = new Map<string, LibraryItem[]>()
  for (const item of items) {
    if (item.status !== 'done' || !item.finishedAt) continue
    byDay.set(item.finishedAt, [...(byDay.get(item.finishedAt) ?? []), item])
  }
  return byDay
}

export type GoalProgress = { kind: LibraryKind; target: number; done: number }

/** Each goal of the year with how many of its kind were finished that year, in kind order. */
export function goalProgress(items: LibraryItem[], goals: LibraryGoal[], year: number): GoalProgress[] {
  return goals
    .filter((g) => g.year === year)
    .sort((a, b) => LIBRARY_KINDS.indexOf(a.kind) - LIBRARY_KINDS.indexOf(b.kind))
    .map((g) => ({
      kind: g.kind,
      target: g.target,
      done: items.filter((i) => i.kind === g.kind && i.status === 'done' && i.finishedAt?.startsWith(String(year))).length,
    }))
}

/** "3 kitap · 2 film" finished in a month ('YYYY-MM-01'), or undefined. */
export function monthSummary(items: LibraryItem[], month: string): string | undefined {
  const prefix = month.slice(0, 7)
  const counts = new Map<LibraryKind, number>()
  for (const item of items) {
    if (item.status === 'done' && item.finishedAt?.startsWith(prefix)) {
      counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1)
    }
  }
  const parts = LIBRARY_KINDS
    .filter((k) => counts.has(k))
    .map((k) => countLabel(k, counts.get(k) as number))
  return parts.length > 0 ? parts.join(' · ') : undefined
}

/** "Bu yıl: 3 kitap · 2 film · 1 yer", or undefined when nothing was finished this year. */
export function yearSummary(items: LibraryItem[], today: string): string | undefined {
  const year = today.slice(0, 4)
  const counts = new Map<LibraryKind, number>()
  // Books read in a language other than Turkish, e.g. "(3 İngilizce)".
  const foreign = new Map<string, number>()
  for (const item of items) {
    if (item.status === 'done' && item.finishedAt?.startsWith(year)) {
      counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1)
      if (item.kind === 'book' && item.language && item.language !== 'tr') {
        foreign.set(item.language, (foreign.get(item.language) ?? 0) + 1)
      }
    }
  }
  const languages = [...foreign].map(([language, n]) => `${n} ${languageLabel(language)}`).join(', ')
  const parts = LIBRARY_KINDS
    .filter((k) => counts.has(k))
    .map((k) => {
      const text = countLabel(k, counts.get(k) as number)
      return k === 'book' && languages ? `${text} (${languages})` : text
    })
  // No verb: "bitirdin" doesn't fit places.
  return parts.length > 0 ? `Bu yıl: ${parts.join(' · ')}` : undefined
}
