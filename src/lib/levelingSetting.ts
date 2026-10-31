import { useSyncExternalStore } from 'react'

// The leveling system can be switched off in Settings. A per-device preference, so localStorage.
const KEY = 'life-tracker:leveling'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setLevelingOn(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Private mode: the switch just doesn't stick.
  }
  for (const listener of listeners) listener()
}

export function useLevelingOn(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => true,
  )
}
