import type { HabitInput } from '../db/habits'
import type { TaskInput } from '../db/tasks'
import type { Habit, HabitFrequency, HabitKind, Milestone, Project, TaskPriority } from '../db/types'

/**
 * Instructions for a claude.ai Project. The user pastes this once into the project's
 * instructions; every chat there then asks questions, plans, and ends with a JSON block
 * that `parsePlan` reads.
 */
export const PLAN_INSTRUCTIONS = `Sen benim kişisel hedef planlama koçumsun. "Life Tracker" adlı uygulamamda takip edeceğim hedefleri birlikte planlıyoruz.

Nasıl çalışalım:
1. Bir hedef söylediğimde hemen plan yapma. Önce beni tanımak için tek mesajda 3-5 kısa soru sor: şu anki seviyem, haftada ne kadar zaman ayırabileceğim, hedef tarihim, engellerim ve tercihlerim.
2. Cevaplarıma göre gerçekçi bir plan öner:
   - Adımlar (milestone): hedefe sırayla götüren 4-8 ara hedef, mümkünse tarihleriyle.
   - Habit'ler: hedefe yardım edecek en fazla 3-4 düzenli alışkanlık. Her biri için sıklık ve zor günler için bir "minimum versiyon".
   - Görevler: bir kere yapılacak en fazla 5 hazırlık işi (isteğe bağlı).
   Planı önce okunabilir bir liste olarak göster ve neyi değiştirmek istediğimi sor.
3. Planı birlikte düzeltelim. Ben "tamam", "onaylıyorum" ya da "uygulamaya aktar" dediğimde son planı aşağıdaki formatta TEK bir json kod bloğu olarak ver.

Format kuralları:
- Tarihler "YYYY-MM-DD" biçiminde. Mesajımda bugünün tarihi yazıyorsa tarihleri ona göre hesapla.
- kind: "check" (yapıldı/yapılmadı), "count" (sayı; "target" ve "unit" ile), "duration" (dakika; "target" ile).
- frequency: {"type":"daily"} ya da {"type":"weekdays","days":[1,3,5]} (1=Pazartesi … 7=Pazar) ya da {"type":"timesPerWeek","count":3}
- priority: 1=Acil, 2=Yüksek, 3=Orta, 4=Düşük
- Bilmediğin ya da gerekmeyen alanları hiç yazma. Bütün metinler Türkçe olsun.
- Mevcut bir projeye ekleme yapıyorsak sadece yeni adımları, habit'leri ve görevleri yaz; var olanları tekrar etme.

Örnek:
\`\`\`json
{
  "lifeTrackerPlan": 1,
  "project": { "title": "İlk maratonu bitirmek", "description": "Nisan'daki maratonu yürümeden bitirmek", "targetDate": "2027-04-18" },
  "milestones": [
    { "title": "5 km'yi durmadan koş", "dueDate": "2026-12-01" },
    { "title": "Yarı maraton koş", "dueDate": "2027-02-15" }
  ],
  "habits": [
    { "title": "Koşu", "kind": "check", "frequency": { "type": "weekdays", "days": [2, 4, 6] }, "minimumVersion": "15 dk tempolu yürüyüş" },
    { "title": "Esneme", "kind": "duration", "target": 10, "frequency": { "type": "daily" } },
    { "title": "Su içmek", "kind": "count", "target": 8, "unit": "bardak", "frequency": { "type": "daily" } }
  ],
  "tasks": [
    { "title": "Koşu ayakkabısı al", "date": "2026-11-05", "priority": 2 }
  ]
}
\`\`\``

/** First message for a new goal; the project instructions do the rest. */
export function buildStartMessage(goal: string, today: string): string {
  return `Yeni bir hedef planlamak istiyorum: ${goal.trim()}\nBugünün tarihi: ${today}`
}

/** First message for adding to an existing project, with what it already has. */
export function buildProjectMessage(
  project: Project,
  milestones: Milestone[],
  habits: Habit[],
  today: string,
): string {
  const lines = [
    `Mevcut "${project.title}" projeme yeni adımlar, habit'ler ya da görevler eklemek istiyorum.`,
    `Bugünün tarihi: ${today}`,
  ]
  if (project.description) lines.push(`Açıklama: ${project.description}`)
  if (project.targetDate) lines.push(`Hedef tarih: ${project.targetDate}`)
  if (milestones.length > 0) {
    lines.push('Şu anki adımlar:')
    for (const m of milestones) lines.push(`- ${m.done ? '[tamamlandı] ' : ''}${m.title}`)
  }
  if (habits.length > 0) {
    lines.push('Bağlı habit\'ler:')
    for (const h of habits) lines.push(`- ${h.title}`)
  }
  return lines.join('\n')
}

export type ImportedPlan = {
  project?: { title: string; description?: string; targetDate?: string }
  milestones: { title: string; dueDate?: string }[]
  habits: Omit<HabitInput, 'projectId'>[]
  tasks: Omit<TaskInput, 'projectId'>[]
  /** Items left out because they could not be read. */
  skipped: number
}

export type ParseResult = { ok: true; plan: ImportedPlan } | { ok: false; error: string }

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown, max = 200): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined
const dateKey = (v: unknown): string | undefined =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined
const positiveInt = (v: unknown, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 1 ? Math.min(max, Math.floor(v)) : undefined

/** The JSON object in Claude's answer: a ```json block if there is one, else the outermost braces. */
function extractJson(answer: string): string | undefined {
  const fenced = answer.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1]
  const start = answer.indexOf('{')
  const end = answer.lastIndexOf('}')
  return start !== -1 && end > start ? answer.slice(start, end + 1) : undefined
}

/**
 * Claude doesn't always follow the format (e.g. when the project instructions are missing),
 * so each field is also looked up under the names it tends to use instead, Turkish included.
 */
const KEYS = {
  project: ['project', 'goal', 'proje', 'hedef'],
  milestones: ['milestones', 'steps', 'adimlar', 'adımlar', 'asamalar', 'aşamalar', 'monthly_plan', 'monthlyPlan'],
  habits: ['habits', 'habit', 'daily_habits', 'dailyHabits', 'aliskanliklar', 'alışkanlıklar', 'rutinler', 'routines'],
  tasks: ['tasks', 'todos', 'gorevler', 'görevler', 'yapilacaklar', 'yapılacaklar'],
  title: ['title', 'name', 'milestone', 'baslik', 'başlık', 'ad', 'isim'],
  date: ['dueDate', 'due_date', 'milestone_date', 'date', 'due', 'tarih', 'targetDate', 'target_date'],
  timesPerWeek: ['timesPerWeek', 'times_per_week', 'days_per_week', 'daysPerWeek'],
  minimum: ['minimumVersion', 'minimum', 'minVersion', 'min', 'minimumVersiyon'],
  frequency: ['frequency', 'siklik', 'sıklık', 'schedule'],
}

function pick(v: Json, keys: string[]): unknown {
  for (const key of keys) if (v[key] !== undefined) return v[key]
  return undefined
}

/** An item's title; a plain string counts as an item with just a title. */
const titleOf = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' ? text(v, max) : isObject(v) ? text(pick(v, KEYS.title), max) : undefined

const DAY_NAMES: Record<string, number> = {
  pazartesi: 1, sali: 2, salı: 2, carsamba: 3, çarşamba: 3, persembe: 4, perşembe: 4,
  cuma: 5, cumartesi: 6, pazar: 7,
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7,
}

function dayNumber(d: unknown): number | undefined {
  if (Number.isInteger(d) && (d as number) >= 1 && (d as number) <= 7) return d as number
  return typeof d === 'string' ? DAY_NAMES[d.trim().toLocaleLowerCase('tr')] : undefined
}

function readFrequency(v: unknown): HabitFrequency {
  if (typeof v === 'string') {
    // "haftada 3", "3 times per week"
    const times = v.match(/(\d)/)
    if (times && /hafta|week/i.test(v)) return { type: 'timesPerWeek', count: Math.min(7, Number(times[1])) || 1 }
    return { type: 'daily' }
  }
  if (isObject(v)) {
    const days = Array.isArray(v.days) ? v.days.map(dayNumber).filter((d) => d !== undefined) : []
    if (days.length > 0 && v.type !== 'timesPerWeek') {
      return { type: 'weekdays', days: [...new Set(days)].sort((a, b) => a - b) }
    }
    const count = positiveInt(v.count ?? v.times, 7)
    if (count && (v.type === 'timesPerWeek' || v.type === 'weekly')) return { type: 'timesPerWeek', count }
  }
  return { type: 'daily' }
}

/** `kind`, or a looser `type` such as "boolean" / "number"; a number in minutes is a duration. */
function readKind(h: Json): HabitKind {
  if (h.kind === 'count' || h.kind === 'duration') return h.kind
  if (h.kind === 'check' || h.type === 'boolean') return 'check'
  if (h.type === 'number' || h.type === 'count') {
    return typeof h.unit === 'string' && /^(dk|dakika|min|minutes?)$/i.test(h.unit.trim()) ? 'duration' : 'count'
  }
  return 'check'
}

function readHabit(v: unknown): ImportedPlan['habits'][number] | undefined {
  const title = titleOf(v, 80)
  if (!title) return undefined
  const h: Json = isObject(v) ? v : {}
  const kind = readKind(h)
  const target = positiveInt(h.target, 100_000)
  const perWeek = positiveInt(pick(h, KEYS.timesPerWeek), 7)
  const frequency: HabitFrequency =
    perWeek && perWeek < 7 ? { type: 'timesPerWeek', count: perWeek } : readFrequency(pick(h, KEYS.frequency))
  // A count or duration habit without a target can't be tracked; keep it as a simple check.
  const countable = kind !== 'check' && target !== undefined
  return {
    title,
    kind: countable ? kind : 'check',
    target: countable ? target : undefined,
    unit: countable && kind === 'count' ? text(h.unit, 20) : undefined,
    increment: countable ? positiveInt(h.increment, 100_000) : undefined,
    frequency,
    minimumVersion: text(pick(h, KEYS.minimum), 80),
  }
}

/** Reads the plan Claude produced; tolerant of extra text and of individual broken items. */
export function parsePlan(answer: string): ParseResult {
  const raw = extractJson(answer)
  if (!raw) {
    return { ok: false, error: "Yapıştırdığın metinde bir plan bulamadım. Claude'un verdiği kod bloğunu da kopyaladığından emin ol." }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Plan okunamadı; metin eksik kopyalanmış olabilir. Kod bloğunun tamamını kopyalayıp tekrar dene.' }
  }
  if (!isObject(parsed)) return { ok: false, error: 'Plan beklenen biçimde değil.' }
  // Sometimes everything is wrapped in one more object, e.g. {"plan": {...}}.
  const data = isObject(parsed.plan) ? parsed.plan : parsed
  // Lists may also sit inside the project: {"project": {"title": …, "habits": […]}}.
  const projectData = pick(data, KEYS.project)
  const root: Json = isObject(projectData) ? { ...projectData, ...data } : data

  let skipped = 0
  const list = <T>(v: unknown, read: (item: unknown) => T | undefined): T[] => {
    if (!Array.isArray(v)) return []
    return v.flatMap((item) => {
      const value = read(item)
      if (value === undefined) skipped++
      return value === undefined ? [] : [value]
    })
  }

  const projectTitle = titleOf(projectData, 80)
  const project = projectTitle
    ? {
        title: projectTitle,
        description: isObject(projectData) ? text(projectData.description, 500) : undefined,
        targetDate: isObject(projectData) ? dateKey(pick(projectData, ['targetDate', 'target_date'])) : undefined,
      }
    : undefined

  const milestones = list(pick(root, KEYS.milestones), (v) => {
    const title = titleOf(v, 120)
    return title ? { title, dueDate: isObject(v) ? dateKey(pick(v, KEYS.date)) : undefined } : undefined
  })
  const habits = list(pick(root, KEYS.habits), readHabit)
  const tasks = list(pick(root, KEYS.tasks), (v) => {
    const title = titleOf(v, 120)
    if (!title) return undefined
    const t: Json = isObject(v) ? v : {}
    const priority = [1, 2, 3, 4].includes(t.priority as number) ? (t.priority as TaskPriority) : 4
    return { title, date: dateKey(pick(t, KEYS.date)), priority }
  })

  if (!project && milestones.length + habits.length + tasks.length === 0) {
    return { ok: false, error: 'Planda eklenecek bir şey bulamadım.' }
  }
  return { ok: true, plan: { project, milestones, habits, tasks, skipped } }
}
