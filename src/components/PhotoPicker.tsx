import { useRef, useState } from 'react'
import { shrinkImage } from '../lib/image'

type Props = {
  label: string
  onPick: (photo: Blob) => void
}

/** Button that picks a photo from the device (or camera) and shrinks it. */
export function PhotoPicker({ label, onPick }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [failed, setFailed] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="rounded-xl bg-bg px-4 py-2.5 text-sm"
      >
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            onPick(await shrinkImage(file))
            setFailed(false)
          } catch {
            setFailed(true)
          }
        }}
      />
      {failed && <p className="text-sm text-p1">Bu fotoğraf açılamadı, başka birini dene.</p>}
    </>
  )
}
