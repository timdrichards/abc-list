import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from './SortableItem'
import { LISTS, type Item, type ListKey } from '../lib/types'

interface Props {
  list: ListKey
  items: Item[]
  onAdd: (list: ListKey, text: string) => void
  onComplete: (id: string) => void
  onRename: (id: string, text: string) => void
  onDelete: (id: string) => void
  onMoveTo: (id: string, list: ListKey) => void
}

export function Column({ list, items, onAdd, onComplete, onRename, onDelete, onMoveTo }: Props) {
  const [draft, setDraft] = useState('')
  const meta = LISTS[list]

  // The column itself is a drop target so an empty column can still receive an item.
  const { setNodeRef, isOver } = useDroppable({ id: list })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onAdd(list, text)
    setDraft('')
  }

  return (
    <section className={`column column--${list}${isOver ? ' column--over' : ''}`} aria-label={meta.title}>
      <header className="column__head">
        <div className="column__heading">
          <span className={`column__badge column__badge--${list}`} aria-hidden="true">
            {list}
          </span>
          <div>
            <h2 className="column__title">{meta.title.replace(/^[ABC] — /, '')}</h2>
            <p className="column__blurb">{meta.blurb}</p>
          </div>
        </div>
        <span className="column__count" aria-label={`${items.length} items`}>
          {items.length}
        </span>
      </header>

      <div ref={setNodeRef} className="column__body">
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="column__items">
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                onComplete={onComplete}
                onRename={onRename}
                onDelete={onDelete}
                onMoveTo={onMoveTo}
              />
            ))}
          </ul>
        </SortableContext>

        {items.length === 0 && (
          <p className="column__empty">
            Nothing here. Add something below, or drag an item across.
          </p>
        )}
      </div>

      <form className="column__add" onSubmit={submit}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Add to ${list}…`}
          aria-label={`Add an item to list ${list}`}
          maxLength={2000}
        />
        <button type="submit" disabled={!draft.trim()} aria-label={`Add to list ${list}`}>
          Add
        </button>
      </form>
    </section>
  )
}
