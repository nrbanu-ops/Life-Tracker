import { useRef, useState } from 'react'
import { shrinkImage } from '../lib/image'

type Props = {
  label: string
  onPick: (photo: Blob) => void
  /** Longest side in px after shrinking. */
  maxSize?: number
  /** Pick several at once; onPick is then called once per photo, in the order chosen. */
  multiple?: boolean
}

/** Button that picks a photo from the device (or camera) and shrinks it. */
export function PhotoPicker({ label, onPick, maxSize, multiple = false }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [failed, setFailed] = useState(false)

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
        multiple={multiple}
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          let broke = false
          for (const file of files) {
            try {
              onPick(await shrinkImage(file, maxSize))
            } catch {
              broke = true
            }
          }
          setFailed(broke)
        }}
      />
      {failed && <p className="text-sm text-p1">Bir fotoğraf açılamadı, başka birini dene.</p>}
    </>
  )
}
