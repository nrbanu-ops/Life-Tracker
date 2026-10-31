import type { ReactNode } from 'react'

type Props = {
  /** Shown as "◆ LABEL" in the top line. */
  label?: string
  /** `warn` for urgent things, like the weekly emergency quest. */
  tone?: 'info' | 'warn'
  className?: string
  children: ReactNode
}

/** A leveling panel in the game's "system window" look (styles in index.css). */
export function SystemWindow({ label, tone = 'info', className = '', children }: Props) {
  return (
    <section className={`sys-window ${tone === 'warn' ? 'sys-warn' : ''} ${className}`}>
      {label && <h2 className="sys-label mb-2">◆ {label}</h2>}
      {children}
    </section>
  )
}

/** A thin square XP bar that glows in the window's colour. */
export function SystemBar({ ratio, color = 'var(--color-sys-edge)' }: { ratio: number; color?: string }) {
  return (
    <span className="block h-1 overflow-hidden bg-sys-line">
      <span
        className="block h-full transition-[width] duration-500"
        style={{ width: `${Math.round(Math.min(1, ratio) * 100)}%`, background: color, boxShadow: `0 0 8px ${color}` }}
      />
    </span>
  )
}
