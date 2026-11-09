import { useSyncExternalStore } from 'react'

/**
 * Per-device switches for the Bugün screen. They only change what is shown, never what is
 * stored, so they live in localStorage and stay out of the backup.
 */
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function read(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(key)
    return value === null ? fallback : value === 'on'
  } catch {
    return fallback
  }
}

function write(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? 'on' : 'off')
  } catch {
    // Private mode: the switch just doesn't stick.
  }
  for (const listener of listeners) listener()
}

const HIDE_DONE = 'life-tracker:hide-done'

export const setHideDone = (on: boolean): void => write(HIDE_DONE, on)

/** Whether today's completed habits are folded away. Off until the user turns it on. */
export const useHideDone = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => read(HIDE_DONE, false),
    () => false,
  )
