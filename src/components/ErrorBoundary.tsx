import { Component, type ErrorInfo, type ReactNode } from 'react'
import { copyText } from '../lib/clipboard'

type Props = { children: ReactNode; onRetry?: () => void }
type State = { error?: Error; copied?: boolean }

/**
 * Keeps a crash on one screen from showing a blank page. Dexie's useLiveQuery re-throws a failed
 * read during render, and a lazily loaded screen throws when its file can't be fetched, so both
 * of those land here instead of silently rendering nothing — with the message in front of the
 * user, who can then say what it was.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Also on the console, for a phone plugged into a computer.
    console.error('Life Tracker:', error, info.componentStack)
  }

  render() {
    const { error, copied } = this.state
    if (!error) return this.props.children

    const detail = `${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(1, 4).join('\n')}`
    return (
      <div className="mt-10 rounded-2xl border border-p1/40 bg-surface p-5">
        <h1 className="font-medium">Bu ekran açılamadı</h1>
        <p className="mt-1 text-sm text-muted">
          Verilerin yerinde. Yenilemek çoğu zaman yeter; olmazsa aşağıdaki metni bana gönder.
        </p>
        <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-bg p-3 text-xs whitespace-pre-wrap">{detail}</pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-surface"
          >
            Yenile
          </button>
          <button
            type="button"
            onClick={async () => this.setState({ copied: await copyText(detail) })}
            className="rounded-xl bg-bg px-4 py-2.5 text-sm"
          >
            {copied ? 'Kopyalandı ✓' : 'Hatayı kopyala'}
          </button>
          <a href={import.meta.env.BASE_URL} className="rounded-xl px-4 py-2.5 text-sm text-muted">
            Bugün'e dön
          </a>
        </div>
      </div>
    )
  }
}
