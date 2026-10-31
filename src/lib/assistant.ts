import { useSyncExternalStore } from 'react'
import type { Habit, Milestone, Project } from '../db/types'
import { buildProjectMessage, PLAN_INSTRUCTIONS } from './aiPlan'

/**
 * Two ways to plan with AI, each switchable in Settings:
 * - Claude: copy a message to claude.ai, paste the answer back (free, no key).
 * - Gemini: chat right in the app with the user's own Gemini API key.
 * Both stay on this device (localStorage); nothing goes into backups or the repository.
 */
export type AiSettings = { claude: boolean; gemini: boolean; geminiKey: string }

const SETTINGS = 'life-tracker:ai'
const GEMINI_KEY = 'life-tracker:gemini-key'
const CHANGE = 'life-tracker:ai-change'

const DEFAULTS = { claude: true, gemini: true }

let cached: { raw: string; settings: AiSettings } | undefined

function read(): AiSettings {
  let raw = ''
  try {
    raw = `${localStorage.getItem(SETTINGS) ?? ''}\n${localStorage.getItem(GEMINI_KEY) ?? ''}`
  } catch {
    // Storage unavailable: defaults, no key.
  }
  // Same object while nothing changed, as useSyncExternalStore expects.
  if (cached?.raw === raw) return cached.settings
  const [flags, key] = raw.split('\n')
  let parsed: Partial<AiSettings> = {}
  try {
    parsed = flags ? JSON.parse(flags) : {}
  } catch {
    // Corrupt value: start from defaults.
  }
  const settings: AiSettings = {
    claude: typeof parsed.claude === 'boolean' ? parsed.claude : DEFAULTS.claude,
    gemini: typeof parsed.gemini === 'boolean' ? parsed.gemini : DEFAULTS.gemini,
    geminiKey: key ?? '',
  }
  cached = { raw, settings }
  return settings
}

export const getAiSettings = read

export function setAiSettings(change: Partial<AiSettings>): void {
  const next = { ...read(), ...change }
  try {
    localStorage.setItem(SETTINGS, JSON.stringify({ claude: next.claude, gemini: next.gemini }))
    if (next.geminiKey.trim()) localStorage.setItem(GEMINI_KEY, next.geminiKey.trim())
    else localStorage.removeItem(GEMINI_KEY)
  } catch {
    // Not saved; the switches fall back to their defaults next time.
  }
  window.dispatchEvent(new Event(CHANGE))
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useAiSettings(): AiSettings {
  return useSyncExternalStore(subscribe, read, read)
}

/** The Gemini chat is offered once it is switched on and has a key. */
export const geminiReady = (s: AiSettings) => s.gemini && s.geminiKey.trim() !== ''

/** Same coaching rules as the claude.ai Project, adapted to chatting inside the app. */
export function buildSystemPrompt(context: {
  today: string
  projects: Project[]
  habits: Habit[]
  /** Adding to this project rather than planning a new goal. */
  project?: { project: Project; milestones: Milestone[]; habits: Habit[] }
}): string {
  const lines = [
    PLAN_INSTRUCTIONS,
    '',
    'Uygulamanın içindeki sohbet penceresindesin. Kısa ve sıcak yaz; uzun paragraflardan kaçın, listeleri kısa tut.',
    'Kullanıcı onaylayınca json kod bloğunu ver; uygulama onu kendisi okuyup kullanıcıya "Uygulamaya ekle" düğmesi gösterecek. Bloğun altına tek cümlelik bir not yeterli.',
    'Plan dışı sorulara da (motivasyon, alışkanlık önerisi, ilerleme yorumu) kısaca cevap verebilirsin.',
    '',
    `Bugünün tarihi: ${context.today}`,
  ]
  const activeProjects = context.projects.filter((p) => p.status !== 'done')
  if (activeProjects.length > 0) {
    lines.push(`Kullanıcının şu anki projeleri: ${activeProjects.map((p) => p.title).join(', ')}`)
  }
  const activeHabits = context.habits.filter((h) => !h.archived)
  if (activeHabits.length > 0) {
    lines.push(`Şu anki habit'leri: ${activeHabits.map((h) => h.title).join(', ')} (bunları tekrar önerme)`)
  }
  if (context.project) {
    const { project, milestones, habits } = context.project
    lines.push('', buildProjectMessage(project, milestones, habits, context.today))
  }
  return lines.join('\n')
}

/** Splits an answer into text and the first json code block (shown as a plan card instead). */
export function splitAnswer(text: string): { before: string; json?: string; after: string } {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (!match || match.index === undefined || !match[1].trim().startsWith('{')) {
    return { before: text.trim(), after: '' }
  }
  return {
    before: text.slice(0, match.index).trim(),
    json: match[1].trim(),
    after: text.slice(match.index + match[0].length).trim(),
  }
}
