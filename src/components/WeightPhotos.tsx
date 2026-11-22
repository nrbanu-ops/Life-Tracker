import { differenceInCalendarDays, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import type { WeightEntry } from '../db/types'
import { addWeightPhotos, removeWeightPhoto } from '../db/weight'
import { fromDateKey } from '../lib/date'
import { JOURNAL_PHOTO_MAX, JOURNAL_PHOTO_SIZE } from '../lib/journal'
import { saveErrorMessage } from '../lib/saveError'
import { useTodayKey } from '../lib/useTodayKey'
import { formatKg, weightOn, type WeightPhoto } from '../lib/weight'
import { BlobImage } from './BlobImage'
import { BottomSheet } from './BottomSheet'
import { PhotoPicker } from './PhotoPicker'
import { PhotoStrip } from './PhotoStrip'

const card = 'mb-5 rounded-2xl border border-border bg-surface p-4'
const day = (key: string, pattern: string) => format(fromDateKey(key), pattern, { locale: tr })

type Props = { photos: WeightPhoto[]; entries: WeightEntry[] }

/** Kilo → Fotoğraflar: add progress photos (they land in Günlük too), compare two, browse all. */
export function WeightPhotos({ photos, entries }: Props) {
  const [beforeId, setBeforeId] = useState<string>()
  const [afterId, setAfterId] = useState<string>()
  const [selectedId, setSelectedId] = useState<string>()
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Picks that no longer exist (a deleted photo) fall back to the first and the latest.
  const before = photos.find((p) => p.id === beforeId) ?? photos[0]
  const after = photos.find((p) => p.id === afterId) ?? photos.at(-1)
  const selected = photos.find((p) => p.id === selectedId)
  const close = () => {
    setSelectedId(undefined)
    setConfirmDelete(false)
  }

  return (
    <>
      <AddPhotos />

      {before && after && before.id !== after.id && <Compare before={before} after={after} entries={entries} />}

      {photos.length === 0 ? (
        <p className={`${card} text-sm text-muted`}>
          İlerleme fotoğrafların burada birikir; ilk ve son fotoğrafını yan yana görürsün. Fotoğraflar o günün günlüğüne
          de eklenir.
        </p>
      ) : (
        <section className="mb-6">
          <h2 className="mb-2 section-title">Tüm fotoğraflar</h2>
          <ul className="grid grid-cols-3 gap-2">
            {[...photos].reverse().map((p) => {
              const kg = weightOn(entries, p.date)
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelectedId(p.id)} className="block w-full text-left">
                    <BlobImage blob={p.blob} alt={day(p.date, 'd MMMM')} className="aspect-[3/4] w-full rounded-xl object-cover" />
                    <span className="mt-1 block truncate text-[11px] text-muted">
                      {day(p.date, 'd MMM')}
                      {kg && ` · ${formatKg(kg.kg)} kg`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <BottomSheet open={!!selected} title={selected ? day(selected.date, 'd MMMM yyyy') : ''} onClose={close}>
        {selected && (
          <div className="flex flex-col gap-3">
            <BlobImage blob={selected.blob} alt="" className="max-h-[50vh] w-full rounded-xl object-contain" />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setBeforeId(selected.id)
                  close()
                }}
                className="rounded-xl border border-border bg-bg py-2.5 text-sm"
              >
                Önce olarak göster
              </button>
              <button
                type="button"
                onClick={() => {
                  setAfterId(selected.id)
                  close()
                }}
                className="rounded-xl border border-border bg-bg py-2.5 text-sm"
              >
                Sonra olarak göster
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true)
                void removeWeightPhoto(selected.entryId, selected.index)
                close()
              }}
              className={`tap-text text-sm ${confirmDelete ? 'font-medium text-p1' : 'text-muted'}`}
            >
              {confirmDelete ? 'Emin misin? Günlükten de silinir — sil' : 'Fotoğrafı sil'}
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  )
}

function AddPhotos() {
  const today = useTodayKey()
  const [date, setDate] = useState(today)
  const [pending, setPending] = useState<Blob[]>([])
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState<string>()

  const save = async () => {
    setSaving(true)
    setFailed(undefined)
    try {
      await addWeightPhotos(date, pending)
      setPending([])
    } catch (error) {
      // The photos stay on screen so the save can be retried.
      setFailed(saveErrorMessage(error))
    }
    setSaving(false)
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value || today)}
          aria-label="Fotoğrafın günü"
          className="rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
        />
        {pending.length < JOURNAL_PHOTO_MAX && (
          <PhotoPicker
            label="📷 Fotoğraf ekle"
            maxSize={JOURNAL_PHOTO_SIZE}
            multiple
            onPick={(photo) => setPending((all) => (all.length >= JOURNAL_PHOTO_MAX ? all : [...all, photo]))}
          />
        )}
      </div>
      {pending.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <PhotoStrip photos={pending} onRemove={(i) => setPending((all) => all.filter((_, n) => n !== i))} />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="ml-auto rounded-full bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      )}
      {failed && <p className="mt-2 text-sm text-p1">{failed}</p>}
      <p className="mt-2 text-xs text-muted">Fotoğraflar o günün günlüğüne de eklenir.</p>
    </section>
  )
}

function Compare({ before, after, entries }: { before: WeightPhoto; after: WeightPhoto; entries: WeightEntry[] }) {
  const from = weightOn(entries, before.date)
  const to = weightOn(entries, after.date)
  const days = differenceInCalendarDays(fromDateKey(after.date), fromDateKey(before.date))
  const change = from && to ? to.kg - from.kg : undefined
  return (
    <section className={card}>
      <h2 className="mb-3 text-sm text-muted">Önce / sonra</h2>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Önce', photo: before, kg: from },
          { label: 'Sonra', photo: after, kg: to },
        ].map(({ label, photo, kg }) => (
          <figure key={label}>
            <BlobImage blob={photo.blob} alt={`${label}: ${day(photo.date, 'd MMMM')}`} className="aspect-[3/4] w-full rounded-xl object-cover" />
            <figcaption className="mt-1 text-xs">
              <span className="font-medium">{label}</span>
              <span className="text-muted">
                {' '}
                · {day(photo.date, 'd MMM yyyy')}
                {kg && ` · ${formatKg(kg.kg)} kg`}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      {(change !== undefined || days !== 0) && (
        <p className="mt-2 text-sm text-muted">
          {days !== 0 && `${Math.abs(days)} gün`}
          {change !== undefined && days !== 0 && ' · '}
          {change !== undefined &&
            (Math.abs(change) < 0.05 ? 'kilo aynı' : `${formatKg(Math.abs(change))} kg ${change < 0 ? 'verdin' : 'aldın'}`)}
        </p>
      )}
      <p className="mt-1 text-xs text-muted">Değiştirmek için aşağıdan bir fotoğrafa dokun.</p>
    </section>
  )
}
