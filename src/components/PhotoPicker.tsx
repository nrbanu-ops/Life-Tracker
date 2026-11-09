import { useRef, useState } from 'react'
import { supportsMultiPhoto } from '../lib/android'
import { shrinkImage } from '../lib/image'

type Props = {
  label: string
  onPick: (photo: Blob) => void
  /** Longest side in px after shrinking. */
  maxSize?: number
  /** Pick several at once, where the platform can; onPick is called once per photo. */
  multiple?: boolean
}

/** Button that picks a photo from the device (or camera) and shrinks it. */
export function PhotoPicker({ label, onPick, maxSize, multiple = false }: Props) {
  const input = useRef<HTMLInputElement>(null)
  // The reason, not just the fact: a phone can refuse a photo for several different reasons.
  const [failed, setFailed] = useState<string>()

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="rounded-xl border border-border bg-bg px-4 py-2.5 text-sm"
      >
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple && supportsMultiPhoto}
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          let problem: string | undefined
          for (const file of files) {
            // Some galleries hand over a file the app isn't allowed to read; it arrives empty.
            if (file.size === 0) {
              problem = 'Telefon bu fotoğrafı okuyamadı (boş geldi). Galeri yerine Dosyalar\'dan seçmeyi dene.'
              continue
            }
            try {
              onPick(await shrinkImage(file, maxSize))
            } catch (error) {
              const why = (error as Error).message || 'Fotoğraf açılamadı'
              problem = `${why}. Başka bir fotoğraf dene.`
            }
          }
          setFailed(problem)
        }}
      />
      {failed && <p className="text-sm text-p1">{failed}</p>}
    </>
  )
}
