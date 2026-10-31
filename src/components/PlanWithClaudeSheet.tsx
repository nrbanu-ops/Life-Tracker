import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { importPlan } from '../db/plans'
import type { Project } from '../db/types'
import { buildStartMessage, parsePlan, type ImportedPlan } from '../lib/aiPlan'
import { describeTarget } from '../lib/amount'
import { copyText } from '../lib/clipboard'
import { fromDateKey } from '../lib/date'
import { describeFrequency } from '../lib/frequency'
import { PRIORITY_LABEL } from '../lib/tasks'
import { BottomSheet } from './BottomSheet'

type Props = {
  open: boolean
  today: string
  /** Add to this project instead of creating a new one. */
  project?: Project
  /** Ready-made first message for an existing project (its current steps and habits). */
  projectMessage?: string
  onClose: () => void
  /** Called with the project the plan went to. */
  onImported: (projectId: string) => void
}

/** Plan a goal in the user's claude.ai Project, then paste the answer back to import it. */
export function PlanWithClaudeSheet(props: Props) {
  return (
    <BottomSheet
      open={props.open}
      title={props.project ? 'Claude ile adım ekle' : 'Claude ile planla'}
      onClose={props.onClose}
    >
      {/* Remounted on every open so each session starts at step 1. */}
      {props.open && <PlanFlow {...props} />}
    </BottomSheet>
  )
}

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

function PlanFlow({ today, project, projectMessage, onImported }: Props) {
  const [step, setStep] = useState<'start' | 'paste' | 'preview'>('start')
  const [goal, setGoal] = useState('')
  const [copied, setCopied] = useState<boolean>()
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string>()
  const [plan, setPlan] = useState<ImportedPlan>()

  const message = project ? (projectMessage ?? '') : buildStartMessage(goal, today)

  if (step === 'start') {
    return (
      <div className="flex flex-col gap-4">
        <Step n={1} title="Claude'a ilk mesajı gönder">
          {!project && (
            <input
              id="plan-goal"
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value)
                setCopied(undefined)
              }}
              placeholder="Hedefin ne? ör. Maraton koşmak"
              aria-label="Hedef"
              maxLength={120}
              className={inputClass}
              autoFocus
            />
          )}
          {(project || goal.trim()) && (
            <pre className="max-h-40 overflow-auto rounded-xl bg-bg px-3 py-2.5 text-sm whitespace-pre-wrap">
              {message}
            </pre>
          )}
          <button
            type="button"
            disabled={!project && !goal.trim()}
            onClick={async () => setCopied(await copyText(message))}
            className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
          >
            {copied ? 'Kopyalandı ✓' : 'Mesajı kopyala'}
          </button>
          {copied === false && (
            <p className="text-sm text-p1">
              Kopyalanamadı. Yukarıdaki metni seçip elle kopyalayabilirsin.
            </p>
          )}
          <p className="text-sm text-muted">
            Sonra Claude'da <b>Life Tracker Planlayıcı</b> projeni aç, yeni bir sohbet başlat ve
            mesajı yapıştır. Claude sana sorular soracak; plan hazır olunca "uygulamaya aktar" de.{' '}
            <a
              href="https://claude.ai/projects"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              Claude'u aç
            </a>
          </p>
          <p className="text-xs text-muted">
            Claude'da bu proje henüz yoksa önce{' '}
            <Link to="/ayarlar" className="underline">
              Ayarlar → Claude ile planlama
            </Link>{' '}
            bölümündeki adımları izle.
          </p>
        </Step>
        <button
          type="button"
          onClick={() => setStep('paste')}
          className="rounded-xl bg-bg py-3 font-medium"
        >
          Claude planı verdi →
        </button>
      </div>
    )
  }

  if (step === 'paste' || !plan) {
    return (
      <div className="flex flex-col gap-4">
        <Step n={2} title="Claude'un cevabını yapıştır">
          <p className="text-sm text-muted">
            Claude'un son cevabını (kod bloğuyla birlikte) kopyala ve buraya yapıştır.
          </p>
          <textarea
            id="plan-answer"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value)
              setError(undefined)
            }}
            rows={8}
            placeholder={'```json\n{ "lifeTrackerPlan": 1, … }\n```'}
            aria-label="Claude'un cevabı"
            className={`${inputClass} resize-y font-mono text-xs`}
          />
          {error && <p className="text-sm text-p1">{error}</p>}
          <button
            type="button"
            disabled={!answer.trim()}
            onClick={() => {
              const result = parsePlan(answer)
              if (!result.ok) return setError(result.error)
              setPlan(result.plan)
              setStep('preview')
            }}
            className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
          >
            Planı oku
          </button>
        </Step>
        <button type="button" onClick={() => setStep('start')} className="py-2 text-sm text-muted">
          ← Geri
        </button>
      </div>
    )
  }

  return <PlanPreview plan={plan} project={project} onBack={() => setStep('paste')} onImported={onImported} />
}

type PreviewProps = {
  plan: ImportedPlan
  project?: Project
  onBack: () => void
  onImported: (projectId: string) => void
}

/** Step 3: choose what to add; everything starts selected. */
function PlanPreview({ plan, project, onBack, onImported }: PreviewProps) {
  const [milestones, setMilestones] = useState(() => plan.milestones.map(() => true))
  const [habits, setHabits] = useState(() => plan.habits.map(() => true))
  const [tasks, setTasks] = useState(() => plan.tasks.map(() => true))
  const [saving, setSaving] = useState(false)
  const selected = [...milestones, ...habits, ...tasks].filter(Boolean).length

  const toggle = (setter: typeof setMilestones, i: number) =>
    setter((list) => list.map((v, j) => (j === i ? !v : v)))

  return (
    <div className="flex flex-col gap-4">
      <Step n={3} title="Eklemek istediklerini seç">
        <div className="rounded-xl bg-bg px-3 py-2.5 text-sm">
          {project ? (
            <>
              <span className="text-muted">Eklenecek proje: </span>
              <b>{project.title}</b>
            </>
          ) : (
            <>
              <span className="text-muted">Yeni proje: </span>
              <b>{plan.project?.title ?? 'Yeni proje'}</b>
              {plan.project?.targetDate &&
                ` · ${format(fromDateKey(plan.project.targetDate), 'd MMMM yyyy', { locale: tr })}`}
            </>
          )}
        </div>

        <ChoiceGroup title="Adımlar" items={plan.milestones} checked={milestones} onToggle={(i) => toggle(setMilestones, i)}
          render={(m) => ({ title: m.title, detail: m.dueDate && format(fromDateKey(m.dueDate), 'd MMM yyyy', { locale: tr }) })}
        />
        <ChoiceGroup title="Habit'ler" items={plan.habits} checked={habits} onToggle={(i) => toggle(setHabits, i)}
          render={(h) => ({
            title: h.title,
            detail: [describeTarget(h), describeFrequency(h.frequency), h.minimumVersion && `Min: ${h.minimumVersion}`]
              .filter(Boolean)
              .join(' · '),
          })}
        />
        <ChoiceGroup title="Görevler" items={plan.tasks} checked={tasks} onToggle={(i) => toggle(setTasks, i)}
          render={(t) => ({
            title: t.title,
            detail: [t.date && format(fromDateKey(t.date), 'd MMM', { locale: tr }), PRIORITY_LABEL[t.priority]]
              .filter(Boolean)
              .join(' · '),
          })}
        />
        {plan.skipped > 0 && (
          <p className="text-xs text-muted">{plan.skipped} madde okunamadığı için listede yok.</p>
        )}

        <button
          type="button"
          disabled={saving || (project !== undefined && selected === 0)}
          onClick={async () => {
            setSaving(true)
            onImported(await importPlan(plan, { milestones, habits, tasks }, project?.id))
          }}
          className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
        >
          {project ? `${selected} öğeyi ekle` : `Projeyi oluştur (${selected} öğe)`}
        </button>
      </Step>
      <button type="button" onClick={onBack} className="py-2 text-sm text-muted">
        ← Geri
      </button>
    </div>
  )
}

type GroupProps<T> = {
  title: string
  items: T[]
  checked: boolean[]
  onToggle: (index: number) => void
  render: (item: T) => { title: string; detail?: string | false }
}

function ChoiceGroup<T>({ title, items, checked, onToggle, render }: GroupProps<T>) {
  if (items.length === 0) return null
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-muted">{title}</legend>
      <ul className="divide-y divide-border overflow-hidden rounded-xl bg-bg">
        {items.map((item, i) => {
          const { title: label, detail } = render(item)
          return (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => onToggle(i)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                />
                <span className="min-w-0">
                  <span className="block">{label}</span>
                  {detail && <span className="block text-xs text-muted">{detail}</span>}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-medium">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}
