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

// The title shown next to the level, chosen on the profile. Also per device.
const TITLE_KEY = 'life-tracker:title'

function readTitle(): string | undefined {
  try {
    return localStorage.getItem(TITLE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export function setWornTitle(id: string | undefined): void {
  try {
    if (id) localStorage.setItem(TITLE_KEY, id)
    else localStorage.removeItem(TITLE_KEY)
  } catch {
    // Private mode: the choice just doesn't stick.
  }
  for (const listener of listeners) listener()
}

export function useWornTitle(): string | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    readTitle,
    () => undefined,
  )
}
