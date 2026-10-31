import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { addLibraryItem, type LibraryEntry, type LibraryInput } from '../db/library'
import type { LibraryKind } from '../db/types'
import {
  CREATOR_LABEL,
  getLastLanguage,
  isSearchable,
  KIND_LABEL,
  LIBRARY_KINDS,
  MissingKeyError,
  searchLibrary,
  setLastLanguage,
  statusesFor,
  type SearchableKind,
  type SearchResult,
} from '../lib/library'
import { LanguageSelect } from './LanguageSelect'
import { BottomSheet } from './BottomSheet'
import { LibraryEntryFields } from './LibraryEntryFields'
import { PhotoPicker } from './PhotoPicker'
import { Poster } from './Poster'
import { Segmented } from './Segmented'

type Props = {
  open: boolean
  today: string
  /** Kind selected when the sheet opens, e.g. the page's current filter. */
  defaultKind: LibraryKind
  onClose: () => void
}

export function LibraryAddSheet(props: Props) {
  return (
    <BottomSheet open={props.open} title="Kütüphaneye ekle" onClose={props.onClose}>
      {/* Remounted on every open so each one starts with an empty search. */}
      {props.open && <AddFlow {...props} />}
    </BottomSheet>
  )
}

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

function AddFlow({ today, defaultKind, onClose }: Props) {
  const [kind, setKind] = useState<LibraryKind>(defaultKind)
  const [query, setQuery] = useState('')
  // What is being added: a search pick, or a hand-made item when `manual` is set.
  const [picked, setPicked] = useState<SearchResult>()
  /** The user's own photo for a picked result, e.g. when it has no poster. */
  const [pickedPhoto, setPickedPhoto] = useState<Blob>()
  const [manual, setManual] = useState(!isSearchable(defaultKind))
  const [entry, setEntry] = useState<LibraryEntry>({ status: 'done' })
  const [language, setLanguage] = useState<string | undefined>(() => getLastLanguage() ?? 'tr')
  const [saving, setSaving] = useState(false)

  const changeKind = (next: LibraryKind) => {
    setKind(next)
    setPicked(undefined)
    setManual(!isSearchable(next))
    // e.g. "Devam" doesn't exist for places.
    if (!statusesFor(next).includes(entry.status)) setEntry((e) => ({ ...e, status: 'done' }))
  }

  const save = async (input: LibraryInput) => {
    setSaving(true)
    const bookLanguage = kind === 'book' ? language?.trim() || undefined : undefined
    if (bookLanguage) setLastLanguage(bookLanguage)
    await addLibraryItem({ ...input, language: bookLanguage }, entry, today)
    onClose()
  }

  const fields = (
    <>
      {kind === 'book' && <LanguageSelect value={language} onChange={setLanguage} />}
      <LibraryEntryFields kind={kind} value={entry} onChange={setEntry} today={today} />
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        options={LIBRARY_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
        value={kind}
        onChange={changeKind}
      />

      {picked ? (
        <>
          <div className="flex items-start gap-3">
            <Poster item={{ ...picked, posterBlob: pickedPhoto }} className="w-20 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <p className="font-medium">{picked.title}</p>
              <p className="text-sm text-muted">{[picked.creator, picked.year].filter(Boolean).join(' · ')}</p>
              <PhotoPicker
                label={picked.posterUrl || pickedPhoto ? '📷 Afişi değiştir' : '📷 Afiş ekle'}
                onPick={setPickedPhoto}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPicked(undefined)
                setPickedPhoto(undefined)
                setEntry((e) => ({ ...e, pageCount: undefined }))
              }}
              className="text-sm text-muted"
            >
              Değiştir
            </button>
          </div>
          {fields}
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              const { pageCount: _, ...input } = picked
              save({ ...input, posterBlob: pickedPhoto })
            }}
            className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
          >
            Ekle
          </button>
        </>
      ) : manual ? (
        <ManualForm
          kind={kind}
          initialTitle={query}
          fields={fields}
          saving={saving}
          onSave={save}
          onSearch={isSearchable(kind) ? () => setManual(false) : undefined}
        />
      ) : (
        <Search
          kind={kind as SearchableKind}
          query={query}
          onQuery={setQuery}
          onPick={(result) => {
            setPicked(result)
            // Open Library often knows the page count; the user can still change it.
            if (result.pageCount) setEntry((e) => ({ ...e, pageCount: result.pageCount }))
          }}
          onManual={() => setManual(true)}
        />
      )}
    </div>
  )
}

type SearchProps = {
  kind: SearchableKind
  query: string
  onQuery: (query: string) => void
  onPick: (result: SearchResult) => void
  onManual: () => void
}

type SearchState =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; results: SearchResult[] }
  | { state: 'error'; missingKey: boolean; message?: string }

function Search({ kind, query, onQuery, onPick, onManual }: SearchProps) {
  const [search, setSearch] = useState<SearchState>({ state: 'idle' })
  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) return
    const controller = new AbortController()
    // Waits for a pause in typing before asking the server.
    const timer = setTimeout(async () => {
      setSearch({ state: 'loading' })
      try {
        setSearch({ state: 'done', results: await searchLibrary(kind, trimmed, controller.signal) })
      } catch (e) {
        if (controller.signal.aborted) return
        setSearch({ state: 'error', missingKey: e instanceof MissingKeyError, message: (e as Error).message })
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [kind, trimmed])

  const placeholder = { book: 'Kitap adı ya da yazar', movie: 'Film adı', series: 'Dizi adı' }[kind]

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Ara"
        className={inputClass}
        autoFocus
      />

      {trimmed.length < 2 ? null : search.state === 'loading' || search.state === 'idle' ? (
        <p className="py-6 text-center text-sm text-muted">Aranıyor…</p>
      ) : search.state === 'error' ? (
        <div className="rounded-xl bg-bg p-3 text-sm">
          {search.missingKey ? (
            <>
              {search.message || 'Film afişleri için ücretsiz bir TMDB anahtarı gerekiyor.'}{' '}
              <Link to="/ayarlar#tmdb" className="text-accent underline">
                Ayarlar'dan ekle
              </Link>
            </>
          ) : (
            "Arama yapılamadı. İnternet bağlantını kontrol edip tekrar dene."
          )}
        </div>
      ) : search.results.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Sonuç bulunamadı.</p>
      ) : (
        <ul className="grid max-h-[45dvh] grid-cols-3 gap-3 overflow-y-auto">
          {search.results.map((result, i) => (
            <li key={`${result.externalId}-${i}`}>
              <button type="button" onClick={() => onPick(result)} className="w-full text-left">
                <Poster item={result} />
                <span className="mt-1 line-clamp-2 block text-xs font-medium">{result.title}</span>
                <span className="block truncate text-xs text-muted">
                  {[result.year, result.creator].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={onManual} className="py-1 text-sm text-muted">
        Bulamadın mı? <span className="underline">Kendin ekle</span>
      </button>
    </>
  )
}

type ManualProps = {
  kind: LibraryKind
  initialTitle: string
  fields: ReactNode
  saving: boolean
  onSave: (input: LibraryInput) => void
  /** Back to searching; absent for kinds without a search, like places. */
  onSearch?: () => void
}

function ManualForm({ kind, initialTitle, fields, saving, onSave, onSearch }: ManualProps) {
  const [title, setTitle] = useState(initialTitle.trim())
  const [creator, setCreator] = useState('')
  const [photo, setPhoto] = useState<Blob>()
  const trimmed = title.trim()

  return (
    <>
      <div className="flex gap-3">
        <Poster item={{ kind, title: trimmed || KIND_LABEL[kind], posterBlob: photo }} className="w-20 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'place' ? 'Yerin adı, ör. Kapadokya' : 'Adı'}
            aria-label="Adı"
            maxLength={120}
            className={inputClass}
            autoFocus
          />
          <input
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder={CREATOR_LABEL[kind]}
            aria-label={CREATOR_LABEL[kind]}
            maxLength={80}
            className={inputClass}
          />
          <PhotoPicker
            label={photo ? 'Fotoğrafı değiştir' : kind === 'place' ? '📷 Fotoğraf ekle' : '📷 Afiş / fotoğraf ekle'}
            onPick={setPhoto}
          />
        </div>
      </div>
      {fields}
      <button
        type="button"
        disabled={!trimmed || saving}
        onClick={() => onSave({ kind, title: trimmed, creator: creator.trim() || undefined, posterBlob: photo })}
        className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
      >
        Ekle
      </button>
      {onSearch && (
        <button type="button" onClick={onSearch} className="py-1 text-sm text-muted">
          ← Aramaya dön
        </button>
      )}
    </>
  )
}
