import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../db/db'
import { setHabitNote } from '../db/journal'
import { setLog, type LogEntry } from '../db/logs'
import { formatAmount, incrementOf } from '../lib/amount'
import { todayKey } from '../lib/date'
import { withAmount, type TodayItem } from '../lib/today'
import { BottomSheet } from './BottomSheet'

type Props = {
  item?: TodayItem
  date: string
  onClose: () => void
}

/** Everything beyond a single tap: exact amount, minimum, skip, clear. */
export function HabitActionSheet({ item, date, onClose }: Props) {
  return (
    <BottomSheet open={item !== undefined} title={item?.habit.title ?? ''} onClose={onClose}>
      {item && <Actions key={item.habit.id} item={item} date={date} onClose={onClose} />}
    </BottomSheet>
  )
}

function Actions({ item, date, onClose }: Required<Props>) {
  const { habit, status, value } = item
  const { target } = habit
  const countable = habit.kind !== 'check'
  const [text, setText] = useState(String(value ?? 0))
  const navigate = useNavigate()
  const isToday = date === todayKey()

  const save = (entry: LogEntry | undefined) => setLog(habit.id, date, entry)
  const saveAndClose = async (entry: LogEntry | undefined) => {
    await save(entry)
    onClose()
  }
  const setAmount = (amount: number) => {
    const next = Math.max(0, amount)
    setText(String(next))
    // Changing the amount un-skips the day.
    save(withAmount(habit, next, status === 'skipped' ? undefined : status))
  }

  const step = incrementOf(habit)
  const current = Number(text) || 0

  return (
    <div className="flex flex-col gap-2">
      {countable && (
        <div className="mb-3 flex flex-col items-center gap-2 rounded-2xl bg-bg p-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setAmount(current - step)}
              disabled={current <= 0}
              aria-label="Azalt"
              className="h-11 w-11 rounded-full bg-surface text-xl disabled:opacity-40"
            >
              −
            </button>
            <input
              id="habit-amount"
              type="number"
              inputMode="numeric"
              min={0}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                const parsed = Math.floor(Number(e.target.value))
                if (e.target.value !== '' && parsed >= 0) {
                  save(withAmount(habit, parsed, status === 'skipped' ? undefined : status))
                }
              }}
              aria-label={habit.kind === 'duration' ? 'Dakika' : 'Miktar'}
              className="w-24 rounded-xl border border-border bg-surface py-2 text-center text-2xl font-semibold tabular-nums outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setAmount(current + step)}
              aria-label="Artır"
              className="h-11 w-11 rounded-full bg-surface text-xl"
            >
              +
            </button>
          </div>
          <p className="text-sm text-muted">
            {habit.kind === 'duration' ? 'dakika' : habit.unit || 'adet'}
            {target && ` · hedef ${formatAmount(habit, target)}`}
          </p>
        </div>
      )}

      {/* The timer always logs to today, so it is offered only for today's row. */}
      {habit.kind === 'duration' && isToday && (
        <SheetButton
          onClick={() => {
            onClose()
            navigate(`/zamanlayici?habit=${habit.id}`)
          }}
        >
          Zamanlayıcıyla yap
          <span className="block text-sm font-normal text-muted">Bitince süre otomatik eklenir</span>
        </SheetButton>
      )}
      {habit.kind === 'check' && status !== 'done' && (
        <SheetButton onClick={() => saveAndClose({ status: 'done' })}>Yapıldı</SheetButton>
      )}
      {countable && target && status !== 'done' && (
        <SheetButton onClick={() => saveAndClose(withAmount(habit, target))}>
          Hedefi tamamladım
        </SheetButton>
      )}
      {status !== 'minimum' && (
        <SheetButton
          onClick={() =>
            // A count habit keeps whatever amount was already logged.
            saveAndClose({ status: 'minimum', value: countable && value ? value : undefined })
          }
        >
          Minimum yaptım
          {habit.minimumVersion && (
            <span className="block text-sm font-normal text-muted">{habit.minimumVersion}</span>
          )}
        </SheetButton>
      )}
      {status === 'skipped' ? (
        <SheetButton onClick={() => saveAndClose(undefined)}>Atlamayı geri al</SheetButton>
      ) : (
        <SheetButton onClick={() => saveAndClose({ status: 'skipped' })}>
          {isToday ? 'Bugün atla' : 'Bu günü atla'}
          <span className="block text-sm font-normal text-muted">Seri bozulmaz, oranı etkilemez</span>
        </SheetButton>
      )}
      {status !== undefined && status !== 'skipped' && (
        <SheetButton muted onClick={() => saveAndClose(undefined)}>
          {isToday ? 'Bugünü temizle' : 'Bu günü temizle'}
        </SheetButton>
      )}

      <HabitNote habitId={habit.id} date={date} />
    </div>
  )
}

/** The habit's note for this day; saved explicitly, cleared by saving empty text. */
function HabitNote({ habitId, date }: { habitId: string; date: string }) {
  // null = loaded and no note yet (undefined means still loading).
  const note = useLiveQuery(
    async () => (await db.journal.where({ habitId, date }).first()) ?? null,
    [habitId, date],
  )
  if (note === undefined) return null
  // Mounted once per habit and day, so the "saved" state survives the note being created.
  return <NoteEditor key={`${habitId}-${date}`} initial={note?.text ?? ''} habitId={habitId} date={date} />
}

function NoteEditor({ initial, habitId, date }: { initial: string; habitId: string; date: string }) {
  const [text, setText] = useState(initial)
  const [saved, setSaved] = useState(false)
  const changed = text.trim() !== initial

  return (
    <label className="mt-3 flex flex-col gap-1.5">
      <span className="text-sm text-muted">Not</span>
      <textarea
        id="habit-note"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSaved(false)
        }}
        placeholder="Nasıl geçti? Günlüğünde görünür."
        rows={2}
        maxLength={2000}
        className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent"
      />
      {(changed || saved) && (
        <button
          type="button"
          onClick={async () => {
            await setHabitNote(habitId, date, text)
            setSaved(true)
          }}
          disabled={!changed}
          className="self-end rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-surface disabled:bg-transparent disabled:text-muted"
        >
          {changed ? (initial && !text.trim() ? 'Notu sil' : 'Notu kaydet') : 'Kaydedildi ✓'}
        </button>
      )}
    </label>
  )
}

type SheetButtonProps = {
  onClick: () => void
  muted?: boolean
  children: ReactNode
}

function SheetButton({ onClick, muted, children }: SheetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-left font-medium ${muted ? 'text-muted' : 'bg-bg'}`}
    >
      {children}
    </button>
  )
}
