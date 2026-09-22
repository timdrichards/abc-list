import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from '../lib/types'

interface Props {
  items: Item[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

function dayHeading(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'
  return dayFormat.format(date)
}

export function Archive({ items, onRestore, onDelete, onClose }: Props) {
  const [query, setQuery] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matching = needle
      ? items.filter((item) => item.text.toLowerCase().includes(needle))
      : items

    const byDay = new Map<string, Item[]>()
    for (const item of matching) {
      if (!item.completed_at) continue
      const key = new Date(item.completed_at).toDateString()
      const bucket = byDay.get(key)
      if (bucket) bucket.push(item)
      else byDay.set(key, [item])
    }
    return [...byDay.entries()]
  }, [items, query])

  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Archive of completed items"
        ref={panelRef}
      >
        <header className="drawer__head">
          <div>
            <h2>Archive</h2>
            <p className="drawer__sub">
              {items.length === 0
                ? 'Nothing completed yet.'
                : `${items.length} completed ${items.length === 1 ? 'item' : 'items'}, kept safe.`}
            </p>
          </div>
          <button type="button" className="drawer__close" onClick={onClose} ref={closeRef}>
            Close
          </button>
        </header>

        {items.length > 0 && (
          <input
            className="drawer__search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the archive…"
            aria-label="Search the archive"
          />
        )}

        <div className="drawer__body">
          {groups.length === 0 && (
            <p className="drawer__empty">
              {items.length === 0
                ? 'Completed items land here, and stay here until you delete them.'
                : 'Nothing in the archive matches that.'}
            </p>
          )}

          {groups.map(([day, dayItems]) => (
            <section key={day} className="archive-day">
              <h3 className="archive-day__heading">{dayHeading(dayItems[0].completed_at!)}</h3>
              <ul className="archive-day__items">
                {dayItems.map((item) => (
                  <li key={item.id} className="archived">
                    <div className="archived__main">
                      <span className="archived__text">{item.text}</span>
                      <span className="archived__meta">
                        <span
                          className={`archived__tag archived__tag--${item.completed_from ?? item.list}`}
                        >
                          {item.completed_from ?? item.list}
                        </span>
                        {timeFormat.format(new Date(item.completed_at!))}
                      </span>
                    </div>
                    <div className="archived__actions">
                      <button type="button" onClick={() => onRestore(item.id)}>
                        Restore
                      </button>
                      <button
                        type="button"
                        className="archived__delete"
                        onClick={() => {
                          if (window.confirm(`Delete “${item.text}” for good?`)) onDelete(item.id)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
