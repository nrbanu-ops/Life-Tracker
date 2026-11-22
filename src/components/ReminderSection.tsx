import { useState } from 'react'
import { applyReminder, loadReminder, parseTime, reminderTime, type Reminder } from '../lib/reminders'

type Props = {
  id?: string
  title?: string
  description?: string
  load?: () => Reminder
  apply?: (reminder: Reminder) => boolean
}

/** Settings: one daily nudge, scheduled by the Android shell. The weigh-in one reuses it with its own wording. */
export function ReminderSection({
  id = 'hatirlatici',
  title = 'Günlük hatırlatma',
  description = 'Her gün seçtiğin saatte telefonuna bildirim gelir: günü işaretlemeyi unutma.',
  load = () => loadReminder(),
  apply = applyReminder,
}: Props) {
  const [reminder, setReminder] = useState<Reminder>(load)
  const [failed, setFailed] = useState(false)

  const change = (next: Reminder) => {
    setReminder(next)
    // Turning it off can't really fail in a way worth shouting about.
    setFailed(next.on && !apply(next))
  }

  return (
    <section id={id} className="rounded-2xl border border-border bg-surface p-4">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        <input
          type="checkbox"
          role="switch"
          checked={reminder.on}
          onChange={(e) => change({ ...reminder, on: e.target.checked })}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-5"
        />
      </label>
      <p className="mt-1 text-sm text-muted">{description}</p>

      {reminder.on && (
        <div className="mt-3 flex items-center gap-3">
          <label htmlFor={`${id}-time`} className="text-sm text-muted">
            Saat
          </label>
          <input
            id={`${id}-time`}
            type="time"
            value={reminderTime(reminder)}
            onChange={(e) => {
              const time = parseTime(e.target.value)
              if (time) change({ ...reminder, ...time })
            }}
            className="rounded-xl border border-border bg-bg px-3 py-2 tabular-nums outline-none focus:border-accent"
          />
        </div>
      )}

      {failed ? (
        <p className="mt-2 text-sm text-p1">
          Hatırlatma kurulamadı. Telefon ayarlarından uygulamanın bildirimlerine izin verdiğinden emin ol.
        </p>
      ) : (
        reminder.on && (
          <p className="mt-2 text-xs text-muted">
            Bildirim birkaç dakika sapabilir (telefonun pilini korumak için). İzin istenirse kabul et.
          </p>
        )
      )}
    </section>
  )
}
