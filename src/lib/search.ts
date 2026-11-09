import type { LibraryKind } from '../db/types'

/**
 * One search box over everything the app holds. Matching is deliberately plain: every word of
 * the query has to appear somewhere in the thing's text, ignoring case.
 */
export type SearchData = {
  habits: { id: string; title: string; archived: boolean }[]
  projects: { id: string; title: string; description?: string }[]
  milestones: { id: string; projectId: string; title: string; done: boolean }[]
  tasks: { id: string; title: string; date?: string; done: boolean }[]
  journal: { id: string; date: string; text: string; review: boolean }[]
  library: { id: string; kind: LibraryKind; title: string; creator?: string; review?: string }[]
}

export type Hit = {
  id: string
  title: string
  /** The second line: a date, an author, the project it belongs to. */
  detail?: string
  to: string
}

export type HitGroup = { label: string; hits: Hit[]; more: number }

/** At most this many of each kind, so one busy group can't bury the others. */
export const PER_GROUP = 6

const fold = (text: string) => text.toLocaleLowerCase('tr')

/** Every word of the query somewhere in the text. */
export function matches(text: string, words: string[]): boolean {
  const haystack = fold(text)
  return words.every((word) => haystack.includes(word))
}

export const queryWords = (query: string): string[] => fold(query).split(/\s+/).filter(Boolean)

const group = (label: string, hits: Hit[]): HitGroup[] =>
  hits.length === 0 ? [] : [{ label, hits: hits.slice(0, PER_GROUP), more: Math.max(0, hits.length - PER_GROUP) }]

/** One line of a journal entry, enough to recognise it by. */
export function preview(text: string, length = 90): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat
}

export function searchEverything(data: SearchData, query: string): HitGroup[] {
  const words = queryWords(query)
  if (words.length === 0) return []

  const projectTitles = new Map(data.projects.map((p) => [p.id, p.title]))

  return [
    ...group(
      "Habit'ler",
      data.habits
        .filter((h) => matches(h.title, words))
        // An archived habit is still worth finding, just not first.
        .sort((a, b) => Number(a.archived) - Number(b.archived))
        .map((h) => ({
          id: h.id,
          title: h.title,
          detail: h.archived ? 'Arşivde' : undefined,
          to: '/habitler',
        })),
    ),
    ...group(
      'Projeler',
      data.projects
        .filter((p) => matches(`${p.title} ${p.description ?? ''}`, words))
        .map((p) => ({ id: p.id, title: p.title, to: `/projeler/${p.id}` })),
    ),
    ...group(
      'Proje adımları',
      data.milestones
        .filter((m) => matches(m.title, words))
        .map((m) => ({
          id: m.id,
          title: m.title,
          detail: [projectTitles.get(m.projectId), m.done ? 'tamam' : undefined].filter(Boolean).join(' · '),
          to: `/projeler/${m.projectId}`,
        })),
    ),
    ...group(
      'Görevler',
      data.tasks
        .filter((t) => matches(t.title, words))
        .sort((a, b) => Number(a.done) - Number(b.done))
        .map((t) => ({
          id: t.id,
          title: t.title,
          detail: [t.date, t.done ? 'bitti' : undefined].filter(Boolean).join(' · ') || undefined,
          to: '/gorevler',
        })),
    ),
    ...group(
      'Günlük',
      data.journal
        .filter((e) => matches(e.text, words))
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((e) => ({
          id: e.id,
          title: preview(e.text),
          detail: e.review ? `${e.date} · haftalık bakış` : e.date,
          to: `/takvim?gun=${e.date}`,
        })),
    ),
    ...group(
      'Kütüphane',
      data.library
        .filter((i) => matches(`${i.title} ${i.creator ?? ''} ${i.review ?? ''}`, words))
        .map((i) => ({ id: i.id, title: i.title, detail: i.creator, to: '/kutuphane' })),
    ),
  ]
}
