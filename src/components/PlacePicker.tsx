import { useEffect, useState } from 'react'
import { searchLibrary, type SearchResult } from '../lib/library'
import { keepLines } from '../lib/places'

type Props = {
  initialQuery: string
  onPick: (place: SearchResult) => void
  onCancel: () => void
}

/** Small place search for giving an existing place a position on the map. */
export function PlacePicker({ initialQuery, onPick, onCancel }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>()
  const [failed, setFailed] = useState(false)
  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        setResults(await searchLibrary('place', trimmed, controller.signal))
        setFailed(false)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    }, 800)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-bg p-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text')
          if (pasted.includes('\n')) {
            e.preventDefault()
            setQuery(keepLines(pasted))
          }
        }}
        placeholder="Yer adı ya da Google Haritalar linki"
        aria-label="Konum ara"
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
        autoFocus
      />
      {failed ? (
        <p className="text-sm text-muted">Arama yapılamadı, internet bağlantını kontrol et.</p>
      ) : results && trimmed.length >= 2 ? (
        results.length === 0 ? (
          <p className="text-sm text-muted">Sonuç bulunamadı.</p>
        ) : (
          <ul className="max-h-48 divide-y divide-border overflow-y-auto">
            {results.map((place, i) => (
              <li key={`${place.externalId}-${i}`}>
                <button type="button" onClick={() => onPick(place)} className="w-full py-2 text-left">
                  <span className="block truncate text-sm font-medium">{place.title}</span>
                  <span className="block truncate text-xs text-muted">{place.creator}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      <button type="button" onClick={onCancel} className="self-start text-sm text-muted">
        Vazgeç
      </button>
    </div>
  )
}
