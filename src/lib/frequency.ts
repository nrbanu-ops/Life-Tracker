import type { HabitFrequency } from '../db/types'

/** Index 0 = Monday (1) … 6 = Sunday (7). */
export const WEEKDAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const WEEKDAYS = [1, 2, 3, 4, 5]
const WEEKEND = [6, 7]

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && a.every((d) => b.includes(d))

export function describeFrequency(frequency: HabitFrequency): string {
  switch (frequency.type) {
    case 'daily':
      return 'Her gün'
    case 'timesPerWeek':
      return `Haftada ${frequency.count} kez`
    case 'weekdays': {
      const days = [...frequency.days].sort((a, b) => a - b)
      if (days.length === 7) return 'Her gün'
      if (sameDays(days, WEEKDAYS)) return 'Hafta içi'
      if (sameDays(days, WEEKEND)) return 'Hafta sonu'
      return days.map((d) => WEEKDAY_SHORT[d - 1]).join(', ')
    }
  }
}
