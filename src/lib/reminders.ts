import { androidBridge } from './android'

/**
 * One daily reminder, scheduled by the Android shell (a web page can't wake a phone on its own).
 * The setting belongs to the device, like the theme, so it lives in localStorage and not in the
 * backup: restoring on another phone shouldn't start a reminder there.
 */
export type Reminder = { on: boolean; hour: number; minute: number }

export const DEFAULT_REMINDER: Reminder = { on: false, hour: 21, minute: 0 }

/** Shown in the notification; kept here so the wording stays in one place. */
export const REMINDER_TEXT = 'Bugünü işaretlemeyi unutma'

const KEY = 'life-tracker:reminder'

/** Only the Android shell can do this, and only from the version that knows the call. */
export const supportsReminders = typeof androidBridge?.setReminder === 'function'

const pad = (value: number) => String(value).padStart(2, '0')

/** 'HH:mm' for an <input type="time">. */
export const reminderTime = ({ hour, minute }: Reminder): string => `${pad(hour)}:${pad(minute)}`

/** Reads 'HH:mm' from the input; undefined for anything that isn't a real time of day. */
export function parseTime(value: string): { hour: number; minute: number } | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return undefined
  return { hour, minute }
}

export function loadReminder(): Reminder {
  try {
    const stored = localStorage.getItem(KEY)
    if (!stored) return DEFAULT_REMINDER
    const parsed = JSON.parse(stored) as Partial<Reminder>
    const time = parseTime(`${parsed.hour}:${pad(Number(parsed.minute))}`)
    if (!time) return DEFAULT_REMINDER
    return { on: Boolean(parsed.on), ...time }
  } catch {
    return DEFAULT_REMINDER
  }
}

function remember(reminder: Reminder): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(reminder))
  } catch {
    // A full or blocked storage shouldn't stop the alarm itself from being set.
  }
}

/**
 * Stores the choice and tells the shell. False means the shell refused (an impossible time, or
 * the alarm could not be set), and the caller says so rather than showing a reminder that isn't.
 */
export function applyReminder(reminder: Reminder): boolean {
  remember(reminder)
  const bridge = androidBridge
  if (!bridge?.setReminder || !bridge.clearReminder) return false
  return reminder.on
    ? bridge.setReminder(reminder.hour, reminder.minute, REMINDER_TEXT)
    : bridge.clearReminder()
}
