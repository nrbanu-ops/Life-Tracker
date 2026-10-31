import type { ReactNode } from 'react'

type Props = {
  title: string
  text: string
  action?: ReactNode
}

export function EmptyState({ title, text, action }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
