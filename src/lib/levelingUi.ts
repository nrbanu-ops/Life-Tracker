import type { Rank } from './leveling'

/** Each rank has its colour, from grey E to gold S. */
export const RANK_COLOR: Record<Rank, string> = {
  E: '#9aa6bd',
  D: '#4ade80',
  C: '#3aa6ff',
  B: '#a78bfa',
  A: '#f87171',
  S: '#f5b941',
}

export const RANK_TITLE: Record<Rank, string> = {
  E: 'Acemi Avcı',
  D: 'Çırak Avcı',
  C: 'Usta Avcı',
  B: 'Elit Avcı',
  A: 'Ulusal Seviye Avcı',
  S: 'Gölge Hükümdarı',
}

/** "LV.07": two digits like a game's status screen. */
export const levelText = (level: number) => `LV.${String(level).padStart(2, '0')}`
