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
        multiple={multiple}
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          let problem: string | undefined
          for (const file of files) {
            try {
              onPick(await shrinkImage(file, maxSize))
            } catch (error) {
              problem = (error as Error).message || 'Fotoğraf açılamadı'
            }
          }
          setFailed(problem)
        }}
      />
      {failed && <p className="text-sm text-p1">{failed}. Başka bir fotoğraf dene.</p>}
    </>
  )
}
