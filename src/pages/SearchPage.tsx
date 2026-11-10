import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { BackIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { loadSearchData } from '../db/search'
import { searchEverything, type SearchData } from '../lib/search'

/** One box over habits, projects, steps, tasks, the journal and the library. */
export function SearchPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<SearchData>()
  const [query, setQuery] = useState('')

  // Read once when the page opens: searching shouldn't go back to the database on every letter.
  useEffect(() => {
    let cancelled = false
    loadSearchData().then((loaded) => !cancelled && setData(loaded))
    return () => {
      cancelled = true
    }
  }, [])

  const trimmed = query.trim()
  const groups = data && trimmed.length >= 2 ? searchEverything(data, trimmed) : []
  const total = groups.reduce((sum, g) => sum + g.hits.length + g.more, 0)

  return (
    <>
      <PageHeader
        title="Ara"
        action={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Geri"
            className="-mr-2.5 -mt-1.5 rounded-full p-2.5 text-muted transition-colors hover:text-text"
          >
            <BackIcon width={22} height={22} />
          </button>
        }
      />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Her yerde ara"
        aria-label="Her yerde ara"
        autoFocus
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none focus:border-accent"
      />

      {trimmed.length < 2 ? (
        <p className="mt-6 text-center text-sm text-muted">
          Habit, proje, adım, görev, günlük ve kütüphanede birden arar.
        </p>
      ) : !data ? (
        <p className="mt-6 text-center text-sm text-muted">Hazırlanıyor…</p>
      ) : groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Bulunamadı" text={`“${trimmed}” hiçbir yerde geçmiyor.`} />
        </div>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted">{total} sonuç</p>
          <div className="mt-2 flex flex-col gap-5">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="mb-2 text-sm font-medium text-muted">{group.label}</h2>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {group.hits.map((hit) => (
                    <li key={hit.id}>
                      <Link to={hit.to} className="block px-4 py-3">
                        <span className="block text-sm">{hit.title}</span>
                        {hit.detail && <span className="mt-0.5 block text-xs text-muted">{hit.detail}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                {group.more > 0 && <p className="mt-1 px-1 text-xs text-muted">+{group.more} tane daha</p>}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  )
}
