import { useEffect, useRef, useState } from 'react'
import { androidBridge } from '../lib/android'
import { AUDIO_MAX_SECONDS, formatDuration, micMessage, pickAudioType } from '../lib/audio'

type Props = {
  onRecord: (audio: Blob, seconds: number) => void
}

type State = 'idle' | 'starting' | 'recording' | 'failed'

/** The shell's version, so a shell too old to grant the microphone can say so itself. */
const shellVersion = () => {
  try {
    return androidBridge?.version?.()
  } catch {
    return undefined
  }
}

/** Records one voice note. Stops itself at AUDIO_MAX_SECONDS so nothing runs away. */
export function AudioRecorder({ onRecord }: Props) {
  const [state, setState] = useState<State>('idle')
  // The reason, kept whole: its name is the one thing worth knowing.
  const [problem, setProblem] = useState<string>()
  const [seconds, setSeconds] = useState(0)
  const recorder = useRef<MediaRecorder>(null)
  const timer = useRef<number>(null)

  // Letting go of the microphone matters: on a phone the recording light stays on otherwise.
  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current)
      const live = recorder.current
      if (live && live.state !== 'inactive') {
        live.onstop = null
        live.stop()
        live.stream.getTracks().forEach((track) => track.stop())
      }
    },
    [],
  )

  const fail = (error: unknown) => {
    setProblem(micMessage(error as Error | undefined, shellVersion()))
    setState('failed')
  }

  const start = async () => {
    setState('starting')
    setProblem(undefined)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      return fail(e)
    }
    const type = pickAudioType((t) => MediaRecorder.isTypeSupported(t))
    let media: MediaRecorder
    try {
      media = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    } catch (first) {
      // isTypeSupported can say yes to a format the recorder then refuses; let it choose its own.
      try {
        media = new MediaRecorder(stream)
      } catch {
        stream.getTracks().forEach((track) => track.stop())
        return fail(first)
      }
    }
    const chunks: Blob[] = []
    const startedAt = Date.now()
    media.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    media.onstop = () => {
      if (timer.current) window.clearInterval(timer.current)
      stream.getTracks().forEach((track) => track.stop())
      recorder.current = null
      setState('idle')
      setSeconds(0)
      const length = Math.round((Date.now() - startedAt) / 1000)
      // A tap that starts and stops at once is not a note.
      if (chunks.length > 0 && length >= 1) {
        onRecord(new Blob(chunks, { type: media.mimeType || type || 'audio/webm' }), length)
      }
    }
    recorder.current = media
    media.start()
    setState('recording')
    setSeconds(0)
    timer.current = window.setInterval(() => {
      const passed = Math.round((Date.now() - startedAt) / 1000)
      setSeconds(passed)
      if (passed >= AUDIO_MAX_SECONDS) media.stop()
    }, 250)
  }

  const stop = () => recorder.current?.stop()

  const cancel = () => {
    const live = recorder.current
    if (!live) return
    // Dropping the handler first is what makes this a cancel and not a save.
    live.onstop = null
    live.stop()
    live.stream.getTracks().forEach((track) => track.stop())
    recorder.current = null
    if (timer.current) window.clearInterval(timer.current)
    setState('idle')
    setSeconds(0)
  }

  if (state === 'recording' || state === 'starting') {
    return (
      <div className="flex w-full items-center gap-2 rounded-xl bg-p1/15 px-3 py-2">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-p1" aria-hidden />
        <span className="flex-1 text-sm tabular-nums" aria-live="polite">
          {state === 'starting' ? 'Mikrofon açılıyor…' : `Kaydediliyor ${formatDuration(seconds)}`}
        </span>
        <button
          type="button"
          onClick={stop}
          disabled={state === 'starting'}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-surface disabled:opacity-50"
        >
          Bitir
        </button>
        <button type="button" onClick={cancel} className="px-2 py-1.5 text-sm text-muted">
          Vazgeç
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={start}
        className="self-start rounded-xl border border-border bg-bg px-4 py-2.5 text-sm"
      >
        🎤 Ses notu
      </button>
      {state === 'failed' && problem && <p className="text-xs text-p1">{problem}</p>}
    </div>
  )
}
