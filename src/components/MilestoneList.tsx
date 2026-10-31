import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useState, type FormEvent } from 'react'
import {
  createMilestone,
  deleteMilestone,
  moveMilestone,
  setMilestoneDone,
  updateMilestone,
} from '../db/projects'
import type { Milestone } from '../db/types'
import { fromDateKey } from '../lib/date'
import { BottomSheet } from './BottomSheet'

type Props = {
  projectId: string
  /** Sorted by order. */
  milestones: Milestone[]
  color: string
  today: string
}

/** A project's steps: tick off, reorder with the arrows, add at the bottom, tap to edit. */
export function MilestoneList({ projectId, milestones, color, today }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string>()

  const add = async (e: FormEvent) => {
    e.preventDefault()
    await createMilestone(projectId, newTitle)
    setNewTitle('')
  }

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {milestones.map((m, index) => (
          <li key={m.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setMilestoneDone(m.id, !m.done)}
              aria-label={`${m.title}: ${m.done ? 'tamamlandı, geri al' : 'tamamla'}`}
              aria-pressed={m.done}
              className="flex shrink-0 items-center self-stretch py-3 pr-3 pl-4"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md border-2"
                style={{ borderColor: color, background: m.done ? color : undefined }}
              >
                {m.done && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3.5}>
                    <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setEditingId(m.id)}
              className="min-w-0 flex-1 py-3 text-left"
            >
              <span className={`block truncate ${m.done ? 'text-muted line-through' : ''}`}>
                {m.title}
              </span>
              {m.dueDate && (
                <span
                  className={`block text-xs ${!m.done && m.dueDate < today ? 'text-p1' : 'text-muted'}`}
                >
                  {format(fromDateKey(m.dueDate), 'd MMMM yyyy', { locale: tr })}
                </span>
              )}
            </button>
            <span className="flex shrink-0 pr-2">
              <button
                type="button"
                onClick={() => moveMilestone(m.id, -1)}
                disabled={index === 0}
                aria-label={`${m.title}: yukarı taşı`}
                className="h-9 w-8 text-muted disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveMilestone(m.id, 1)}
                disabled={index === milestones.length - 1}
                aria-label={`${m.title}: aşağı taşı`}
                className="h-9 w-8 text-muted disabled:opacity-25"
              >
                ↓
              </button>
            </span>
          </li>
        ))}
        <li>
          <form onSubmit={add} className="flex items-center gap-2 px-4 py-2">
            <input
              id="milestone-new"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={milestones.length === 0 ? 'İlk adımı yaz, ör. 5 km koş' : 'Yeni adım ekle'}
              aria-label="Yeni adım"
              maxLength={120}
              className="min-w-0 flex-1 bg-transparent py-1.5 outline-none"
            />
            {newTitle.trim() && (
              <button type="submit" className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-surface">
                Ekle
              </button>
            )}
          </form>
        </li>
      </ul>

      <MilestoneSheet
        milestone={milestones.find((m) => m.id === editingId)}
        onClose={() => setEditingId(undefined)}
      />
    </>
  )
}

function MilestoneSheet({ milestone, onClose }: { milestone?: Milestone; onClose: () => void }) {
  return (
    <BottomSheet open={milestone !== undefined} title="Adımı düzenle" onClose={onClose}>
      {milestone && <MilestoneEditor key={milestone.id} milestone={milestone} onClose={onClose} />}
    </BottomSheet>
  )
}

const inputClass =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 outline-none focus:border-accent'

function MilestoneEditor({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  const [title, setTitle] = useState(milestone.title)
  const [dueDate, setDueDate] = useState(milestone.dueDate ?? '')

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        await updateMilestone(milestone.id, title, dueDate || undefined)
        onClose()
      }}
      className="flex flex-col gap-4"
    >
      <input
        id="milestone-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Adım"
        maxLength={120}
        className={inputClass}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Hedef tarih (isteğe bağlı)</span>
        <input
          id="milestone-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={!title.trim()}
        className="rounded-xl bg-accent py-3 font-medium text-surface disabled:opacity-40"
      >
        Kaydet
      </button>
      <button
        type="button"
        onClick={async () => {
          await deleteMilestone(milestone.id)
          onClose()
        }}
        className="rounded-xl py-2 text-sm text-muted"
      >
        Adımı sil
      </button>
    </form>
  )
}
