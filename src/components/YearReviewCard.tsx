import { Link } from 'react-router'
import { yearCardFor } from '../lib/yearReview'

/** Only around the turn of the year: "your 2026 is ready". */
export function YearReviewCard({ today }: { today: string }) {
  const year = yearCardFor(today)
  if (year === undefined) return null
  return (
    <Link
      to={`/ozet?yil=${year}`}
      className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
    >
      <span className="text-2xl" aria-hidden>
        ✨
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{year} özetin hazır</span>
        <span className="block text-sm text-muted">Bu yıl neler yaptığına bir bak</span>
      </span>
      <span className="shrink-0 text-muted" aria-hidden>
        ›
      </span>
    </Link>
  )
}
