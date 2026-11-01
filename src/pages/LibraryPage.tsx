import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { BackIcon } from '../components/icons'
import { LibraryAddSheet } from '../components/LibraryAddSheet'
import { LibraryCalendar } from '../components/LibraryCalendar'
import { LibraryGoals } from '../components/LibraryGoals'
import { Segmented } from '../components/Segmented'
import { LibraryItemSheet } from '../components/LibraryItemSheet'
import { PageHeader } from '../components/PageHeader'
import { Poster } from '../components/Poster'
import { ProgressBar } from '../components/ProgressBar'
import { StarRating } from '../components/StarRating'
import { db } from '../db/db'
import type { LibraryItem, LibraryKind } from '../db/types'
import {
  bookProgress,
  goalProgress,
  groupLibrary,
  KIND_LABEL,
  languageBadge,
  languageLabel,
  LIBRARY_KINDS,
  progressLabel,
  tracksProgress,
  yearSummary,
} from '../lib/library'
import { keepLines } from '../lib/places'
import { useTodayKey } from '../lib/useTodayKey'

const FILTERS: (LibraryKind | 'all')[] = ['all', ...LIBRARY_KINDS]

export function LibraryPage() {
  const navigate = useNavigate()
  const today = useTodayKey()
  const items = useLiveQuery(() => db.library.toArray())
  const year = Number(today.slice(0, 4))
  const goals = useLiveQuery(() => db.libraryGoals.where('year').equals(year).toArray(), [year], [])
  const [filter, setFilter] = useState<LibraryKind | 'all'>('all')
  const [adding, setAdding] = useState(false)
  // ?paylas=… : a place shared into the Android app from Google Maps, read once.
  const [searchParams, setSearchParams] = useSearchParams()
  const [shared, setShared] = useState(() => {
    const text = searchParams.get('paylas')
    return text ? keepLines(text) : undefined
  })
  useEffect(() => {
    if (searchParams.has('paylas')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])
  const [selectedId, setSelectedId] = useState<string>()
  const [view, setView] = useState<'shelf' | 'calendar' | 'map'>('shelf')

  const [languageFilter, setLanguageFilter] = useState<string>()

  // Language chips appear once books in two or more languages exist.
  const languages = [...new Set((items ?? []).flatMap((i) => (i.kind === 'book' && i.language ? [i.language] : [])))]
  const showLanguages = languages.length >= 2 && (filter === 'all' || filter === 'book')
  const activeLanguage = showLanguages ? languageFilter : undefined
  const shown = activeLanguage ? (items ?? []).filter((i) => i.language === activeLanguage) : (items ?? [])
  const groups = groupLibrary(shown, filter)
  const isEmpty = Object.values(groups).every((group) => group.length === 0)
  const selected = items?.find((i) => i.id === selectedId)

  return (
    <>
      <PageHeader
        title="Kütüphane"
        subtitle={items && yearSummary(items, today)}
        action={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Geri"
            className="-mr-2 rounded-full p-2 text-muted transition-colors hover:text-text"
          >
            <BackIcon width={22} height={22} />
          </button>
        }
      />

      <div className="mb-4">
        <Segmented
          options={[
            { value: 'shelf', label: 'Raf' },
            { value: 'calendar', label: 'Takvim' },
            { value: 'map', label: 'Harita' },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {/* The calendar always shows every kind together, the map every place: the filters are for the shelf. */}
      <div className={`-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 ${view !== 'shelf' ? 'hidden' : ''}`}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${
              filter === f ? 'bg-accent font-medium text-surface' : 'bg-surface text-muted'
            }`}
          >
            {f === 'all' ? 'Tümü' : KIND_LABEL[f]}
          </button>
        ))}
      </div>

      {showLanguages && view === 'shelf' && (
        <div className="-mx-4 -mt-2 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
          {[undefined, ...languages].map((language) => (
            <button
              key={language ?? 'all'}
              type="button"
              onClick={() => setLanguageFilter(language)}
              aria-pressed={activeLanguage === language}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                activeLanguage === language ? 'border-accent font-medium text-accent' : 'border-border text-muted'
              }`}
            >
              {language ? languageLabel(language) : 'Tüm diller'}
            </button>
          ))}
        </div>
      )}

      {items === undefined ? null : view === 'map' ? (
        <MapView items={items.filter((i) => i.kind === 'place')} onSelect={setSelectedId} />
      ) : view === 'calendar' ? (
        <LibraryCalendar items={items} today={today} onSelect={setSelectedId} />
      ) : (
        <>
          <LibraryGoals
            year={year}
            progress={goalProgress(items, goals, year).filter((g) => filter === 'all' || g.kind === filter)}
          />
          {isEmpty ? (
            <EmptyState
              title={filter === 'all' ? 'Kütüphanen boş' : `Henüz ${KIND_LABEL[filter].toLocaleLowerCase('tr')} yok`}
              text="Okuduğun kitapları, izlediğin film ve dizileri, gittiğin yerleri ekle; puan ve kısa yorum yaz."
            />
          ) : (
            <div className="flex flex-col gap-7">
              <Shelf title="Devam ediyor" items={groups.active} onSelect={setSelectedId} />
              <Shelf
                title={filter === 'place' ? 'Gitmek istediklerin' : 'Sırada'}
                items={groups.want}
                onSelect={setSelectedId}
              />
              <Shelf
                title={filter === 'place' ? 'Gittiğin yerler' : 'Bitirdiklerin'}
                items={groups.done}
                onSelect={setSelectedId}
              />
              <Shelf title="Yarım bıraktıkların" items={groups.dropped} onSelect={setSelectedId} />
            </div>
          )}
        </>
      )}

      {/* Keeps the last row reachable above the floating button. */}
      <div className="h-20" aria-hidden />

      <div
        className="pointer-events-none fixed inset-x-0 z-10 mx-auto flex max-w-lg justify-end px-4"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 font-medium text-surface shadow-lg"
        >
          <span className="text-xl leading-none" aria-hidden>
            +
          </span>
          Ekle
        </button>
      </div>

      <LibraryAddSheet
        open={adding || shared !== undefined}
        today={today}
        defaultKind={shared !== undefined || view === 'map' ? 'place' : filter === 'all' ? 'book' : filter}
        initialQuery={shared}
        onClose={() => {
          setAdding(false)
          setShared(undefined)
        }}
      />
      <LibraryItemSheet item={selected} today={today} onClose={() => setSelectedId(undefined)} />
    </>
  )
}

// Leaflet is only downloaded when the map is first opened.
const LibraryMap = lazy(() => import('../components/LibraryMap'))

function MapView({ items, onSelect }: { items: LibraryItem[]; onSelect: (id: string) => void }) {
  const placed = items.filter((i) => i.latitude !== undefined && i.longitude !== undefined)
  const missing = items.length - placed.length
  return (
    <div className="flex flex-col gap-2">
      <Suspense fallback={<div className="h-[60dvh] rounded-2xl border border-border bg-surface" />}>
        <LibraryMap items={placed} onSelect={onSelect} />
      </Suspense>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-accent" /> Gittim
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-accent bg-surface" /> Gitmek istiyorum
        </span>
        <span className="flex-1 text-right">
          {items.length === 0
            ? 'Henüz yer eklemedin.'
            : missing > 0
              ? `${missing} yerin konumu yok; detayından "Konum ekle" diyebilirsin.`
              : `${placed.length} yer`}
        </span>
      </div>
    </div>
  )
}

/** Where the user is in a book or series they are reading/watching or gave up on. */
function ItemProgress({ item }: { item: LibraryItem }) {
  const label = tracksProgress(item) ? progressLabel(item) : undefined
  if (!label) return null
  const ratio = bookProgress(item)
  return (
    <span className="mt-0.5 flex flex-col gap-1">
      {ratio !== undefined && <ProgressBar ratio={ratio} />}
      <span className="text-[11px] text-muted tabular-nums">{label}</span>
    </span>
  )
}

type ShelfProps = {
  title: string
  items: LibraryItem[]
  onSelect: (id: string) => void
}

function Shelf({ title, items, onSelect }: ShelfProps) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted">
        {title} · {items.length}
      </h2>
      <ul className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onSelect(item.id)} className="w-full text-left">
              {/* Turkish is the norm, so only other languages get a tag. */}
              <Poster item={item} badge={item.language && item.language !== 'tr' ? languageBadge(item.language) : undefined} />
              <span className="mt-1 line-clamp-2 block text-xs font-medium">{item.title}</span>
              <ItemProgress item={item} />
              {item.rating !== undefined && <StarRating value={item.rating} />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
