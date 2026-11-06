import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addAmount } from '../db/logs'
import { todayKey } from '../lib/date'
import {
  elapsedMs,
  isFinished,
  isRunning,
  minutesToLog,
  pause as pauseTimer,
  resume as resumeTimer,
  type TimerState,
} from '../lib/timer'
import { TimerContext, type TimerResult } from '../lib/timerContext'

const STORAGE_KEY = 'life-tracker:timer'

// The running timer is kept in localStorage so it survives reloads and closing the app.
function loadTimer(): TimerState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TimerState) : undefined
  } catch {
    return undefined
  }
}

function saveTimer(timer: TimerState | undefined) {
  try {
    if (timer) localStorage.setItem(STORAGE_KEY, JSON.stringify(timer))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the timer then lasts until reload.
  }
}

/** Three short beeps. Browsers only allow sound after a tap, so the context is created on start. */
function beep(audio: AudioContext | undefined) {
  if (!audio) return
  // iOS suspends the context while the app is in the background; without this the beep is silent.
  if (audio.state === 'suspended') void audio.resume().catch(() => {})
  for (let i = 0; i < 3; i++) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    const at = audio.currentTime + i * 0.35
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.25)
    osc.connect(gain).connect(audio.destination)
    osc.start(at)
    osc.stop(at + 0.25)
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimerState] = useState<TimerState | undefined>(loadTimer)
  const [now, setNow] = useState(() => Date.now())
  const [result, setResult] = useState<TimerResult>()
  // Mirrors `timer` synchronously so a finish can't run twice for the same timer.
  const timerRef = useRef(timer)
  const audioRef = useRef<AudioContext | undefined>(undefined)

  const setTimer = useCallback((next: TimerState | undefined) => {
    timerRef.current = next
    setTimerState(next)
    saveTimer(next)
  }, [])

  const finish = useCallback(
    async (save: boolean) => {
      const current = timerRef.current
      if (!current) return
      setTimer(undefined)
      if (!save) return
      const minutes = minutesToLog(elapsedMs(current, Date.now()))
      const habit =
        current.habitId && minutes > 0
          ? await addAmount(current.habitId, todayKey(), minutes)
          : undefined
      setResult({ minutes, habitTitle: habit?.title })
    },
    [setTimer],
  )

  // iOS freezes everything in the background and suspends the audio context with it. Waking it
  // as soon as the app is on screen gives the beep a chance to play when the countdown ends.
  useEffect(() => {
    const wake = () => {
      const audio = audioRef.current
      if (document.visibilityState === 'visible' && audio?.state === 'suspended') {
        void audio.resume().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', wake)
    return () => document.removeEventListener('visibilitychange', wake)
  }, [])

  // Tick while running; a countdown that ran out (even while the app was closed) completes itself.
  useEffect(() => {
    if (!timer || !isRunning(timer)) return
    const tick = () => {
      const time = Date.now()
      setNow(time)
      if (isFinished(timer, time)) {
        navigator.vibrate?.([200, 100, 200])
        beep(audioRef.current)
        finish(true)
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [timer, finish])

  const value = useMemo(
    () => ({
      timer,
      now,
      result,
      start: (config: Pick<TimerState, 'mode' | 'habitId' | 'durationMs'>) => {
        try {
          audioRef.current ??= new AudioContext()
        } catch {
          // No Web Audio: the timer still works, just silently.
        }
        setResult(undefined)
        setTimer({ ...config, accumulatedMs: 0, runningSince: Date.now() })
      },
      pause: () => timerRef.current && setTimer(pauseTimer(timerRef.current, Date.now())),
      resume: () => timerRef.current && setTimer(resumeTimer(timerRef.current, Date.now())),
      finish: (save: boolean) => void finish(save),
      clearResult: () => setResult(undefined),
    }),
    [timer, now, result, setTimer, finish],
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}
