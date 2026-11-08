import { endOfISOWeek, format, getISODay, isValid, parse, startOfISOWeek } from 'date-fns'

export const DATE_FORMAT = 'yyyy-MM-dd'

/** Local-time 'YYYY-MM-DD' for the given date. */
export const toDateKey = (date: Date): string => format(date, DATE_FORMAT)

export const todayKey = (): string => toDateKey(new Date())

/** Parses a 'YYYY-MM-DD' key as local midnight. */
export const fromDateKey = (key: string): Date => parse(key, DATE_FORMAT, new Date())

/** True for a 'YYYY-MM-DD' key that names a real day; for checking values from a URL. */
export const isDateKey = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = parse(value, DATE_FORMAT, new Date())
  return isValid(date) && toDateKey(date) === value
}

/** 1 = Monday … 7 = Sunday, matching Habit.frequency.days. */
export const weekdayOf = (key: string): number => getISODay(fromDateKey(key))

/** Monday and Sunday keys of the week containing `key`. */
export const weekRange = (key: string): { start: string; end: string } => {
  const date = fromDateKey(key)
  return { start: toDateKey(startOfISOWeek(date)), end: toDateKey(endOfISOWeek(date)) }
}
