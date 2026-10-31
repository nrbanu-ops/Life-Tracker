import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Modal panel that slides up from the bottom, built on the native <dialog>. */
export function BottomSheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // Esc goes through onClose too, so `open` stays the single source of truth.
      // (Listening to the async close event instead could close a sheet reopened right after.)
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (e.target === e.currentTarget) onClose()
      }}
      className="mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-lg rounded-t-3xl bg-surface text-text backdrop:bg-black/40 open:animate-[sheet-up_200ms_ease-out]"
    >
      <div
        className="px-5 pt-3"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden />
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  )
}
