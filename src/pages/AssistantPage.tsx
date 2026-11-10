import { useLiveQuery } from 'dexie-react-hooks'
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { BottomSheet } from '../components/BottomSheet'
import { BackIcon } from '../components/icons'
import { PageHeader } from '../components/PageHeader'
import { PlanPreview } from '../components/PlanWithClaudeSheet'
import { db } from '../db/db'
import { parsePlan, type ImportedPlan } from '../lib/aiPlan'
import { buildSystemPrompt, geminiReady, splitAnswer, useAiSettings } from '../lib/assistant'
import { askGemini, type ChatMessage } from '../lib/gemini'
import { useTodayKey } from '../lib/useTodayKey'

// Conversations live for the session, per project ('' = a new goal), so leaving and
// coming back keeps the chat. They are not saved to the database or backups.
const conversations = new Map<string, ChatMessage[]>()

const NEW_GOAL_IDEAS = ['Maraton koşmak istiyorum', 'Yılda 24 kitap okumak', 'Düzenli uyumak', 'İngilizcemi geliştirmek']
const PROJECT_IDEAS = ['Bu projeye yeni adımlar öner', 'Takıldım, planı kolaylaştıralım', 'Bir habit daha ekleyelim']

/** Plan goals by chatting with Gemini; a finished plan turns into an "add" card. */
export function AssistantPage() {
  const navigate = useNavigate()
  const today = useTodayKey()
  const [params] = useSearchParams()
  const projectId = params.get('proje') ?? ''
  const settings = useAiSettings()

  const projects = useLiveQuery(() => db.projects.toArray(), [], [])
  const habits = useLiveQuery(() => db.habits.toArray(), [], [])
  const milestones = useLiveQuery(
    () =>
      projectId
        ? db.milestones.where('[projectId+order]').between([projectId, -Infinity], [projectId, Infinity]).toArray()
        : [],
    [projectId],
    [],
  )
  const project = projects.find((p) => p.id === projectId)

  const [messages, setMessages] = useState<ChatMessage[]>(() => conversations.get(projectId) ?? [])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [reviewing, setReviewing] = useState<{ index: number; plan: ImportedPlan }>()
  const [added, setAdded] = useState<number[]>([])
  const abort = useRef<AbortController>(undefined)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    conversations.set(projectId, messages)
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy, projectId])
  useEffect(() => () => abort.current?.abort(), [])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', text: content }]
    setMessages(next)
    setInput('')
    setError(undefined)
    setBusy(true)
    abort.current = new AbortController()
    try {
      const system = buildSystemPrompt({
        today,
        projects,
        habits,
        project: project && {
          project,
          milestones,
          habits: habits.filter((h) => h.projectId === project.id && !h.archived),
        },
      })
      const reply = await askGemini(settings.geminiKey, system, next, abort.current.signal)
      setMessages([...next, { role: 'model', text: reply }])
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError((e as Error).message)
      // Put the message back so it can be sent again.
      setMessages(messages)
      setInput(content)
    } finally {
      setBusy(false)
    }
  }

  const back = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Geri"
      className="-mr-2.5 -mt-1.5 rounded-full p-2.5 text-muted transition-colors hover:text-text"
    >
      <BackIcon width={22} height={22} />
    </button>
  )
  const header = (
    <PageHeader
      title="Gemini ile planla"
      subtitle={project ? `${project.title} projesine ekle` : 'Hedefini anlat, birlikte planlayalım'}
      action={back}
    />
  )

  if (!geminiReady(settings)) {
    return (
      <>
        {header}
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p>Gemini asistanı için önce kendi ücretsiz Gemini API anahtarını eklemen gerekiyor.</p>
          <Link
            to="/ayarlar#yapay-zeka"
            className="mt-3 inline-block rounded-xl bg-accent px-4 py-2.5 font-medium text-surface"
          >
            Ayarlar’a git
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      {header}

      <div className="flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">
              {project
                ? 'Bu projeye ne eklemek istersin? Mevcut adımlarını ve habit’lerini biliyorum.'
                : 'Ne başarmak istiyorsun? Önce birkaç soru soracağım, sonra birlikte bir plan çıkaracağız.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(project ? PROJECT_IDEAS : NEW_GOAL_IDEAS).map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => send(idea)}
                  className="rounded-full bg-accent-soft px-3 py-1.5 text-sm text-accent"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) =>
          message.role === 'user' ? (
            <p
              key={index}
              className="ml-10 self-end rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 whitespace-pre-wrap text-surface"
            >
              {message.text}
            </p>
          ) : (
            <ModelMessage
              key={index}
              text={message.text}
              added={added.includes(index)}
              onReview={(plan) => setReviewing({ index, plan })}
            />
          ),
        )}

        {busy && (
          <p className="mr-10 self-start rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-muted" aria-live="polite">
            <span className="inline-block animate-pulse">Yazıyor…</span>
          </p>
        )}
        {error && <p className="text-sm text-p1">{error}</p>}

        {messages.length > 0 && !busy && (
          <button
            type="button"
            onClick={() => {
              setMessages([])
              setAdded([])
              setError(undefined)
            }}
            className="self-center py-1 text-xs text-muted"
          >
            Yeni sohbet başlat
          </button>
        )}
        <div ref={bottom} className="h-20" aria-hidden />
      </div>

      {/* Sits above the tab bar, aligned with the content column. */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="fixed inset-x-0 z-10 mx-auto flex max-w-lg gap-2 bg-bg px-4 pt-2 pb-2"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends on a keyboard; Shift+Enter adds a line.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send(input)
            }
          }}
          rows={1}
          placeholder="Mesaj yaz…"
          aria-label="Mesaj"
          className="max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-border bg-surface px-3.5 py-3 outline-none focus:border-accent"
          style={{ fieldSizing: 'content' } as CSSProperties}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Gönder"
          className="shrink-0 self-end rounded-2xl bg-accent px-4 py-3 font-medium text-surface disabled:opacity-40"
        >
          ↑
        </button>
      </form>

      <BottomSheet open={reviewing !== undefined} title="Plana göz at" onClose={() => setReviewing(undefined)}>
        {reviewing && (
          <PlanPreview
            key={reviewing.index}
            plan={reviewing.plan}
            project={project}
            onImported={(id) => {
              setAdded((list) => [...list, reviewing.index])
              setReviewing(undefined)
              if (!project) navigate(`/projeler/${id}`)
            }}
          />
        )}
      </BottomSheet>
    </>
  )
}

type ModelMessageProps = {
  text: string
  added: boolean
  onReview: (plan: ImportedPlan) => void
}

function ModelMessage({ text, added, onReview }: ModelMessageProps) {
  const { before, json, after } = splitAnswer(text)
  const parsed = json ? parsePlan(json) : undefined
  const plan = parsed?.ok ? parsed.plan : undefined

  return (
    <div className="mr-6 flex flex-col gap-2 self-start">
      {before && <Bubble>{before}</Bubble>}
      {plan ? (
        <div className="rounded-2xl border border-accent bg-accent-soft p-3.5">
          <p className="font-medium">{plan.project?.title ?? 'Plan hazır'}</p>
          <p className="mt-0.5 text-sm text-muted">
            {[
              plan.milestones.length && `${plan.milestones.length} adım`,
              plan.habits.length && `${plan.habits.length} habit`,
              plan.tasks.length && `${plan.tasks.length} görev`,
              plan.achievements.length && `${plan.achievements.length} başarım`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <button
            type="button"
            onClick={() => onReview(plan)}
            className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-surface"
          >
            {added ? 'Eklendi ✓ Tekrar göz at' : 'Gözden geçir ve ekle'}
          </button>
        </div>
      ) : (
        json && <Bubble>{'```\n' + json + '\n```'}</Bubble>
      )}
      {after && <Bubble>{after}</Bubble>}
    </div>
  )
}

function Bubble({ children }: { children: string }) {
  return (
    <div className="rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 leading-relaxed">
      <RichText text={children} />
    </div>
  )
}

/** Just enough Markdown for chat answers: paragraphs, bullet lines, **bold** and headings. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
        const heading = line.match(/^#{1,4}\s+(.*)$/)
        if (!line.trim()) return <span key={i} className="block h-2" aria-hidden />
        if (heading) return <b key={i} className="mt-1 block">{inline(heading[1])}</b>
        if (bullet) {
          return (
            <span key={i} className="flex gap-2">
              <span className="text-muted" aria-hidden>•</span>
              <span>{inline(bullet[1])}</span>
            </span>
          )
        }
        return <span key={i} className="block">{inline(line)}</span>
      })}
    </>
  )
}

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
  )
}
