import type { Rank } from './leveling'

/**
 * Each rank has its colour, from grey E to gold S. They go through CSS variables because a
 * light palette needs darker versions to stay legible; the values live in src/index.css.
 */
export const RANK_COLOR: Record<Rank, string> = {
  E: 'var(--color-rank-e)',
  D: 'var(--color-rank-d)',
  C: 'var(--color-rank-c)',
  B: 'var(--color-rank-b)',
  A: 'var(--color-rank-a)',
  S: 'var(--color-rank-s)',
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
