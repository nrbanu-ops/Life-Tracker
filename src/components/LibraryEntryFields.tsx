import type { LibraryEntry } from '../db/library'
import type { LibraryKind } from '../db/types'
import { canRate, statusesFor, statusLabel, tracksProgress } from '../lib/library'
import { Segmented } from './Segmented'
import { StarRating } from './StarRating'

type Props = {
  kind: LibraryKind
  value: LibraryEntry
  onChange: (value: LibraryEntry) => void
  today: string
}

/** Whole number typed in a field, or undefined while empty. */
const parseCount = (text: string) => {
  const n = Math.floor(Number(text))
  return text.trim() !== '' && n >= 0 ? Math.min(n, 99_999) : undefined
}

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

/** Status; once started, stars and a short review; for finished items the day too. */
export function LibraryEntryFields({ kind, value, onChange, today }: Props) {
  const set = (changes: Partial<LibraryEntry>) => onChange({ ...value, ...changes })
  const number = (field: 'page' | 'pageCount' | 'season' | 'episode', label: string) => (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      <input
        value={value[field] ?? ''}
        onChange={(e) => set({ [field]: parseCount(e.target.value) })}
        inputMode="numeric"
        className={inputClass}
      />
    </label>
  )

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        options={statusesFor(kind).map((s) => ({ value: s, label: statusLabel(kind, s) }))}
        value={value.status}
        onChange={(status) => set({ status })}
      />
      {tracksProgress({ kind, status: value.status }) && (
        <div className="flex gap-3">
          {kind === 'book' ? (
            <>
              {number('page', value.status === 'dropped' ? 'Kaldığın sayfa' : 'Şu anki sayfa')}
              {number('pageCount', 'Toplam sayfa')}
            </>
          ) : (
            <>
              {number('season', 'Sezon')}
              {number('episode', 'Bölüm')}
            </>
          )}
        </div>
      )}
      {value.status === 'done' && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{kind === 'place' ? 'Gittiğin gün' : 'Bitirdiğin gün'}</span>
          <input
            type="date"
            value={value.finishedAt ?? today}
            max={today}
            onChange={(e) => set({ finishedAt: e.target.value || undefined })}
            className={inputClass}
          />
        </label>
      )}
      {canRate(value.status) && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">
              Puanın{value.status === 'active' && ' (şimdilik)'}
            </span>
            <StarRating value={value.rating} onChange={(rating) => set({ rating })} />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">Kısa yorumun</span>
            <textarea
              value={value.review ?? ''}
              onChange={(e) => set({ review: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder={
                value.status === 'dropped'
                  ? 'Neden bıraktın?'
                  : kind === 'place'
                    ? 'Nasıldı? Ne yaptın, kiminle gittin?'
                    : 'Nasıl? Aklında kalan ne?'
              }
              className={`${inputClass} resize-y`}
            />
          </label>
        </>
      )}
    </div>
  )
}
