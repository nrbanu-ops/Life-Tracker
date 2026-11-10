import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState } from 'react'
import { deleteLibraryItem, updateLibraryDetails, updateLibraryEntry, type LibraryEntry } from '../db/library'
import type { LibraryItem } from '../db/types'
import { fromDateKey } from '../lib/date'
import { CREATOR_LABEL, KIND_LABEL, languageLabel } from '../lib/library'
import { BottomSheet } from './BottomSheet'
import { googleMapsLink } from '../lib/places'
import { LanguageSelect } from './LanguageSelect'
import { PlacePicker } from './PlacePicker'
import { LibraryEntryFields } from './LibraryEntryFields'
import { PhotoPicker } from './PhotoPicker'
import { PhotoViewer } from './PhotoViewer'
import { Poster } from './Poster'

type Props = {
  item?: LibraryItem
  today: string
  onClose: () => void
}

export function LibraryItemSheet({ item, today, onClose }: Props) {
  return (
    <BottomSheet open={item !== undefined} title={item?.title ?? ''} onClose={onClose}>
      {item && <ItemDetail key={item.id} item={item} today={today} onClose={onClose} />}
    </BottomSheet>
  )
}

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

function ItemDetail({ item, today, onClose }: { item: LibraryItem; today: string; onClose: () => void }) {
  const [entry, setEntry] = useState<LibraryEntry>({
    status: item.status,
    finishedAt: item.finishedAt,
    page: item.page,
    pageCount: item.pageCount,
    season: item.season,
    episode: item.episode,
    rating: item.rating,
    review: item.review,
  })
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [creator, setCreator] = useState(item.creator ?? '')
  const [year, setYear] = useState(item.year?.toString() ?? '')
  const [photo, setPhoto] = useState(item.posterBlob)
  const [language, setLanguage] = useState(item.language)
  const [position, setPosition] = useState(
    item.latitude !== undefined && item.longitude !== undefined
      ? { latitude: item.latitude, longitude: item.longitude }
      : undefined,
  )
  const [pickingPlace, setPickingPlace] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(false)

  const trimmedTitle = title.trim()
  const yearValue = Number(year)
  const preview = { ...item, title: trimmedTitle || item.title, posterBlob: photo }
  const trimmedLanguage = language?.trim() || undefined
  const facts = [KIND_LABEL[item.kind], creator.trim(), year.trim(), trimmedLanguage && languageLabel(trimmedLanguage)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        {photo || item.posterUrl ? (
          <button type="button" onClick={() => setViewing(true)} aria-label="Görseli büyüt" className="w-28 shrink-0 self-start">
            <Poster item={preview} />
          </button>
        ) : (
          <Poster item={preview} className="w-28 shrink-0" />
        )}
        <PhotoViewer
          photos={[photo ? { blob: photo } : { url: item.posterUrl }]}
          index={viewing ? 0 : null}
          onIndex={() => {}}
          onClose={() => setViewing(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm text-muted">{facts}</p>
          {item.startedAt && (
            <p className="text-sm text-muted">
              Başladın: {format(fromDateKey(item.startedAt), 'd MMMM yyyy', { locale: tr })}
            </p>
          )}
          <div className="mt-auto flex flex-col items-start gap-2 pt-2">
            <PhotoPicker
              label={
                item.kind === 'place'
                  ? photo
                    ? '📷 Fotoğrafı değiştir'
                    : '📷 Fotoğraf ekle'
                  : photo || item.posterUrl
                    ? '📷 Afişi değiştir'
                    : '📷 Afiş ekle'
              }
              onPick={setPhoto}
            />
            {photo && (
              <button type="button" onClick={() => setPhoto(undefined)} className="text-sm text-muted">
                {item.posterUrl ? 'Kendi fotoğrafımı kaldır' : 'Fotoğrafı kaldır'}
              </button>
            )}
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="text-sm text-muted">
                ✏️ Bilgileri düzenle
              </button>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Adı"
            aria-label="Adı"
            maxLength={120}
            className={inputClass}
          />
          <div className="flex gap-2">
            <input
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder={CREATOR_LABEL[item.kind]}
              aria-label={CREATOR_LABEL[item.kind]}
              maxLength={80}
              className={inputClass}
            />
            <input
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Yıl"
              aria-label="Yıl"
              inputMode="numeric"
              className={`${inputClass} w-24 shrink-0`}
            />
          </div>
          {item.kind === 'book' && <LanguageSelect value={language} onChange={setLanguage} />}
        </div>
      )}

      {item.kind === 'place' &&
        (pickingPlace ? (
          <PlacePicker
            initialQuery={title}
            onPick={(place) => {
              if (place.latitude !== undefined && place.longitude !== undefined) {
                setPosition({ latitude: place.latitude, longitude: place.longitude })
              }
              if (!creator.trim() && place.creator) setCreator(place.creator)
              setPickingPlace(false)
            }}
            onCancel={() => setPickingPlace(false)}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-bg px-3 py-2.5 text-sm">
            <span className="flex-1 text-muted">{position ? '📍 Haritada işaretli' : '📍 Konum yok'}</span>
            <button type="button" onClick={() => setPickingPlace(true)} className="text-muted underline">
              {position ? 'Konumu değiştir' : 'Konum ekle'}
            </button>
            <a
              href={googleMapsLink({ title, creator, ...position })}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent"
            >
              Google Haritalar’da aç ↗
            </a>
          </div>
        ))}

      <LibraryEntryFields kind={item.kind} value={entry} onChange={setEntry} today={today} />

      <button
        type="button"
        disabled={saving || !trimmedTitle}
        onClick={async () => {
          setSaving(true)
          await updateLibraryDetails(item.id, {
            title: trimmedTitle,
            creator: creator.trim() || undefined,
            year: yearValue > 0 ? yearValue : undefined,
            language: trimmedLanguage,
            latitude: position?.latitude,
            longitude: position?.longitude,
            posterBlob: photo,
          })
          await updateLibraryEntry(item.id, entry, today)
          onClose()
        }}
        className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
      >
        Kaydet
      </button>

      {confirmDelete ? (
        <div className="flex flex-col gap-2 rounded-xl bg-bg p-3">
          <p className="text-sm text-muted">Bu kayıt, puanın ve yorumunla birlikte silinir.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await deleteLibraryItem(item.id)
                onClose()
              }}
              className="flex-1 rounded-xl bg-surface py-2.5 text-sm font-medium text-p1"
            >
              Evet, sil
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-xl py-2.5 text-sm text-muted"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmDelete(true)} className="py-2 text-sm text-muted">
          Kütüphaneden sil
        </button>
      )}
    </div>
  )
}
