import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from '../db/db'
import { createHabit, deleteHabit, setHabitArchived, updateHabit, type HabitInput } from '../db/habits'
import type { DayPart, Habit, HabitFrequency, HabitKind, Project } from '../db/types'
import { DEFAULT_INCREMENT } from '../lib/amount'
import { frequencyOf, PERIOD_EVERY, PERIOD_MAX, periodGoal, WEEKDAY_SHORT } from '../lib/frequency'
import {
  autoEffort,
  EFFORT_TIERS,
  STAT_LABEL,
  statOf,
  STATS,
  TIER_LABEL,
  TIER_XP,
  type EffortTier,
  type StatKey,
} from '../lib/leveling'
import { useLevelingOn } from '../lib/levelingSetting'
import { DAY_PART_LABEL, DAY_PARTS, FOCUS_MAX } from '../lib/today'
import { Segmented } from './Segmented'

type FrequencyType = HabitFrequency['type']

type Props = {
  /** Omit to create a new habit. */
  habit?: Habit
  /** Project for a new habit, e.g. when created from a project page. */
  defaultProjectId?: string
  projects: Project[]
  onDone: () => void
}

const kindOptions: { kind: HabitKind; label: string }[] = [
  { kind: 'check', label: 'İşaretle' },
  { kind: 'count', label: 'Sayı' },
  { kind: 'duration', label: 'Süre' },
  { kind: 'quit', label: 'Bırakma' },
]

/** Value format of <input type="datetime-local">, in local time. */
const LOCAL_DATETIME = "yyyy-MM-dd'T'HH:mm"

// Two rows: planned by the day on top, "so many times a week, a month, a year" underneath.
const frequencyOptions: { type: FrequencyType; label: string; wide?: boolean }[] = [
  { type: 'daily', label: 'Her gün', wide: true },
  { type: 'weekdays', label: 'Belirli günler', wide: true },
  { type: 'timesPerWeek', label: 'Haftada X' },
  { type: 'timesPerMonth', label: 'Ayda X' },
  { type: 'timesPerYear', label: 'Yılda X' },
]

/** Where the counter starts when a period is picked: a few times a week, once a month or a year. */
const startingCount = (type: FrequencyType) => (type === 'timesPerWeek' ? 3 : 1)

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

export function HabitForm({ habit, defaultProjectId, projects, onDone }: Props) {
  const initial = habit?.frequency
  const [title, setTitle] = useState(habit?.title ?? '')
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? 'check')
  // Number fields are kept as text while typing and parsed on save.
  const [target, setTarget] = useState(habit?.target?.toString() ?? '')
  const [unit, setUnit] = useState(habit?.unit ?? '')
  const [increment, setIncrement] = useState(habit?.increment?.toString() ?? '')
  const [quitStart, setQuitStart] = useState(() =>
    format(habit?.quitStartedAt ? new Date(habit.quitStartedAt) : new Date(), LOCAL_DATETIME),
  )
  // A quit date can't be in the future; fixed when the form opens.
  const [latestQuitStart] = useState(() => format(new Date(), LOCAL_DATETIME))
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(initial?.type ?? 'daily')
  const [days, setDays] = useState<number[]>(
    initial?.type === 'weekdays' ? initial.days : [1, 2, 3, 4, 5],
  )
  const [count, setCount] = useState((initial && periodGoal(initial)?.count) ?? 3)
  const [minimumVersion, setMinimumVersion] = useState(habit?.minimumVersion ?? '')
  const [focus, setFocus] = useState(habit?.focus ?? false)
  const [why, setWhy] = useState(habit?.why ?? '')
  const [when, setWhen] = useState<DayPart | ''>(habit?.when ?? '')
  const [cue, setCue] = useState(habit?.cue ?? '')
  const [projectId, setProjectId] = useState(habit ? (habit.projectId ?? '') : (defaultProjectId ?? ''))
  const [effort, setEffort] = useState<EffortTier | ''>(habit?.effort ?? '')
  const [stat, setStat] = useState<StatKey | ''>(habit?.stat ?? '')
  const levelingOn = useLevelingOn()
  // How many keystone slots the other habits already take, so the cap can be shown here.
  const focusTaken = useLiveQuery(
    async () => (await db.habits.toArray()).filter((h) => h.focus && !h.archived && h.id !== habit?.id).length,
    [habit?.id],
    0,
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Folded for a new habit; open when the habit being edited already uses something in there.
  const [more, setMore] = useState(
    () =>
      !!habit &&
      !!(habit.why || habit.when || habit.cue || habit.minimumVersion || habit.focus || habit.effort || habit.stat || habit.projectId),
  )

  const trimmedTitle = title.trim()
  // Set for "X times a week / month / year"; the count is a placeholder, only the period is read.
  const goalPeriod = periodGoal({ type: frequencyType, count: 1, days: [] } as HabitFrequency)?.period
  const countable = kind === 'count' || kind === 'duration'
  const isQuit = kind === 'quit'
  const daysMissing = !isQuit && frequencyType === 'weekdays' && days.length === 0
  const quitStartMissing = isQuit && Number.isNaN(new Date(quitStart).getTime())
  const targetValue = parsePositive(target)
  const incrementValue = parsePositive(increment)
  const targetMissing = countable && targetValue === undefined
  // What the app would decide, shown next to "Otomatik".
  const guess = autoEffort({ title: trimmedTitle, kind, target: countable ? targetValue : undefined, stat: stat || undefined })
  const guessStat = statOf({ title: trimmedTitle, kind })
  const canSave =
    trimmedTitle !== '' && !daysMissing && !targetMissing && !quitStartMissing && !saving

  const toggleDay = (day: number) =>
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b),
    )

  const buildFrequency = (): HabitFrequency => {
    if (frequencyType === 'weekdays') return { type: 'weekdays', days }
    return goalPeriod ? frequencyOf(goalPeriod, Math.min(count, PERIOD_MAX[goalPeriod])) : { type: 'daily' }
  }

  const pickFrequency = (type: FrequencyType) => {
    // The same number means something else per week than per year, so it starts over.
    if (type !== frequencyType) setCount(startingCount(type))
    setFrequencyType(type)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    const input: HabitInput = {
      title: trimmedTitle,
      kind,
      target: countable ? targetValue : undefined,
      unit: kind === 'count' ? unit.trim() || undefined : undefined,
      increment: countable ? incrementValue : undefined,
      quitStartedAt: isQuit ? new Date(quitStart).toISOString() : undefined,
      // Quit habits have no schedule or minimum; they are tracked as time since quitting.
      frequency: isQuit ? { type: 'daily' } : buildFrequency(),
      minimumVersion: isQuit ? undefined : minimumVersion.trim() || undefined,
      why: why.trim() || undefined,
      when: isQuit ? undefined : when || undefined,
      cue: isQuit ? undefined : cue.trim() || undefined,
      // A quit habit has no row on Bugün, so it can never be a keystone.
      focus: !isQuit && focus ? true : undefined,
      projectId: projectId || undefined,
      effort: isQuit ? undefined : effort || undefined,
      stat: isQuit ? undefined : stat || undefined,
    }
    if (habit) await updateHabit(habit.id, input)
    else await createHabit(input)
    onDone()
  }

  const handleArchiveToggle = async () => {
    if (!habit) return
    await setHabitArchived(habit.id, !habit.archived)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">
          {isQuit ? 'Neyi bırakıyorsun?' : 'Ne yapmak istiyorsun?'}
        </span>
        <input
          id="habit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isQuit ? 'ör. Sigara, şeker, sosyal medya' : 'ör. Koşu, su içmek, kitap okumak'}
          className={inputClass}
          autoFocus={!habit}
          maxLength={80}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm text-muted">Nasıl takip edilsin?</legend>
        <Segmented
          options={kindOptions.map((o) => ({ value: o.kind, label: o.label }))}
          value={kind}
          onChange={setKind}
        />

        {countable && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">
                {kind === 'count' ? 'Günlük hedef' : 'Günlük hedef (dakika)'}
              </span>
              <input
                id="habit-target"
                type="number"
                inputMode="numeric"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={kind === 'count' ? '8' : '30'}
                className={inputClass}
              />
            </label>
            {kind === 'count' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Birim (isteğe bağlı)</span>
                <input
                  id="habit-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="bardak"
                  className={inputClass}
                  maxLength={20}
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">
                {kind === 'count' ? 'Her dokunuşta +' : 'Her dokunuşta + (dakika)'}
              </span>
              <input
                id="habit-increment"
                type="number"
                inputMode="numeric"
                min={1}
                value={increment}
                onChange={(e) => setIncrement(e.target.value)}
                placeholder={String(DEFAULT_INCREMENT[kind === 'duration' ? 'duration' : 'count'])}
                className={inputClass}
              />
            </label>
          </div>
        )}
        {countable && target !== '' && targetMissing && (
          <p className="text-sm text-red-600 dark:text-red-400">Hedef 1 veya daha büyük olmalı.</p>
        )}

        {isQuit && (
          <label className="flex flex-col gap-1.5 pt-1">
            <span className="text-xs text-muted">Ne zamandan beri?</span>
            <input
              id="habit-quit-start"
              type="datetime-local"
              value={quitStart}
              max={latestQuitStart}
              onChange={(e) => setQuitStart(e.target.value)}
              className={inputClass}
            />
            <span className="text-xs text-muted">
              Sayaç bu andan itibaren işler. Tekrar başlarsan Bugün ekranından sıfırlayabilirsin.
            </span>
          </label>
        )}
      </fieldset>

      {/* Quit habits have no schedule. */}
      {!isQuit && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm text-muted">Sıklık</legend>
            <div className="grid grid-cols-6 gap-1 rounded-xl bg-bg p-1">
              {frequencyOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => pickFrequency(option.type)}
                  aria-pressed={frequencyType === option.type}
                  className={`rounded-lg px-2 py-2 text-sm transition-colors ${option.wide ? 'col-span-3' : 'col-span-2'} ${
                    frequencyType === option.type ? 'bg-surface font-medium shadow-sm' : 'text-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {frequencyType === 'weekdays' && (
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {WEEKDAY_SHORT.map((label, index) => {
                  const day = index + 1
                  const selected = days.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={selected}
                      className={`rounded-full py-2 text-xs font-medium transition-colors ${
                        selected ? 'bg-accent text-surface' : 'bg-bg text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
            {daysMissing && (
              <p className="text-sm text-red-600 dark:text-red-400">En az bir gün seç.</p>
            )}

            {goalPeriod && (
              <div className="flex items-center justify-between rounded-xl bg-bg px-3 py-2">
                <span className="text-sm">{PERIOD_EVERY[goalPeriod]}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCount((c) => Math.max(1, c - 1))}
                    disabled={count <= 1}
                    aria-label="Azalt"
                    className="h-9 w-9 rounded-full bg-surface text-lg disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-12 text-center tabular-nums">{count} kez</span>
                  <button
                    type="button"
                    onClick={() => setCount((c) => Math.min(PERIOD_MAX[goalPeriod], c + 1))}
                    disabled={count >= PERIOD_MAX[goalPeriod]}
                    aria-label="Artır"
                    className="h-9 w-9 rounded-full bg-surface text-lg disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </fieldset>
      )}

      {/* Name and rhythm are enough to start; everything that refines a habit waits behind this. */}
      <button
        type="button"
        aria-expanded={more}
        onClick={() => setMore((v) => !v)}
        className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-3 text-left text-sm"
      >
        <span className="min-w-0">
          <span className="block font-medium">Daha fazla seçenek</span>
          <span className="block truncate text-muted">
            {isQuit ? 'Neden, proje' : 'Neden, tetikleyici, minimum, omurga, proje'}
          </span>
        </span>
        <span aria-hidden className={`text-xl text-muted transition-transform ${more ? 'rotate-90' : ''}`}>
          ›
        </span>
      </button>

      {more && (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">Neden? (isteğe bağlı)</span>
            <input
              id="habit-why"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder={isQuit ? 'ör. Sabahları nefes nefese kalmamak için' : 'ör. Sabahları daha enerjik olmak için'}
              className={inputClass}
              maxLength={140}
            />
            <span className="text-xs text-muted">
              {isQuit
                ? 'Tekrar başlamak üzereyken sana hatırlatılır.'
                : 'Günü atlamak üzereyken ve seri koruması kartında sana hatırlatılır.'}
            </span>
          </label>

          {/* Quit habits have no time of day, minimum version or keystone mark. */}
          {!isQuit && (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-sm text-muted">Günün hangi bölümünde?</legend>
                <Segmented<DayPart | ''>
                  options={[
                    { value: '', label: 'Fark etmez' },
                    ...DAY_PARTS.map((part) => ({ value: part, label: DAY_PART_LABEL[part] })),
                  ]}
                  value={when}
                  onChange={setWhen}
                />
                <input
                  id="habit-cue"
                  value={cue}
                  onChange={(e) => setCue(e.target.value)}
                  placeholder="Tetikleyici: ör. çaydan sonra, işten gelince"
                  aria-label="Tetikleyici"
                  className={inputClass}
                  maxLength={60}
                />
                <span className="text-xs text-muted">
                  Saat yerine zaten her gün yaptığın bir şeye bağla; Bugün ekranı günün o bölümündekileri öne alır.
                </span>
              </fieldset>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted">Minimum versiyon (isteğe bağlı)</span>
                <input
                  id="habit-minimum"
                  value={minimumVersion}
                  onChange={(e) => setMinimumVersion(e.target.value)}
                  placeholder="ör. 5 dk dil çalışması"
                  className={inputClass}
                  maxLength={80}
                />
                <span className="text-xs text-muted">Zor günlerde bunu yapman seriyi korur.</span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  id="habit-focus"
                  type="checkbox"
                  checked={focus}
                  disabled={!focus && focusTaken >= FOCUS_MAX}
                  onChange={(e) => setFocus(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-accent disabled:opacity-40"
                />
                <span>
                  <span className="font-medium">Omurga habit</span>
                  <span className="block text-xs text-muted">
                    {!focus && focusTaken >= FOCUS_MAX
                      ? `Zaten ${FOCUS_MAX} omurga habit var; birini çıkarmadan yenisini ekleyemezsin.`
                      : `Odak modu açıkken Bugün ekranının en üstünde durur, gerisi katlanır. En fazla ${FOCUS_MAX} tane.`}
                  </span>
                </span>
              </label>

              {levelingOn && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm text-muted">Zorluk</span>
                    <select value={effort} onChange={(e) => setEffort(e.target.value as EffortTier | '')} className={inputClass}>
                      <option value="">Otomatik ({TIER_LABEL[guess.tier]})</option>
                      {EFFORT_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {TIER_LABEL[tier]} · {TIER_XP[tier]} XP
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm text-muted">Stat</span>
                    <select value={stat} onChange={(e) => setStat(e.target.value as StatKey | '')} className={inputClass}>
                      <option value="">Otomatik ({STAT_LABEL[guessStat]})</option>
                      {STATS.map((key) => (
                        <option key={key} value={key}>
                          {STAT_LABEL[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="col-span-2 -mt-1 text-xs text-muted">
                    {effort ? 'Senin seçimin; bugünden itibaren geçerli.' : `Uygulama karar veriyor: ${guess.reason}.`}
                  </span>
                </div>
              )}
            </>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">Proje (isteğe bağlı)</span>
            {projects.length > 0 ? (
              <select
                id="habit-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={inputClass}
              >
                <option value="">Bağımsız habit</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-muted">
                Henüz proje yok. Proje ekledikten sonra habit'i ona bağlayabilirsin.
              </span>
            )}
          </label>
        </>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
        >
          {habit ? 'Kaydet' : 'Habit ekle'}
        </button>
        {habit && (
          <button
            type="button"
            onClick={handleArchiveToggle}
            className="rounded-xl py-3 text-sm text-muted"
          >
            {habit.archived ? 'Arşivden çıkar' : 'Arşivle'}
          </button>
        )}
        {habit &&
          (confirmDelete ? (
            <div className="flex flex-col gap-2 rounded-xl bg-bg p-3">
              <p className="text-sm text-muted">
                Habit, geçmiş kayıtları ve notlarıyla birlikte kalıcı olarak silinir. Geçmişini
                saklamak istersen arşivle.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await deleteHabit(habit.id)
                    onDone()
                  }}
                  className="flex-1 rounded-xl bg-surface py-2.5 text-sm font-medium text-p1"
                >
                  Evet, sil
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl py-2.5 text-sm text-muted"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl py-3 text-sm text-muted"
            >
              Habit'i sil
            </button>
          ))}
      </div>
    </form>
  )
}

function parsePositive(text: string): number | undefined {
  const value = Math.floor(Number(text))
  return text.trim() !== '' && value >= 1 ? value : undefined
}
