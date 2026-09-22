import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { LIST_KEYS, listLabel, type Item, type ListKey } from '../lib/types'

interface Props {
  item: Item
  onComplete?: (id: string) => void
  onRename?: (id: string, text: string) => void
  onDelete?: (id: string) => void
  onMoveTo?: (id: string, list: ListKey) => void
  /** dnd-kit's drag attributes and listeners, already merged, for the grip button. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleProps?: Record<string, any>
  isDragging?: boolean
  /** The copy that follows the cursor: no menus, no editing, just the look of the card. */
  isOverlay?: boolean
  style?: CSSProperties
  innerRef?: (node: HTMLElement | null) => void
}

export function ItemCard({
  item,
  onComplete,
  onRename,
  onDelete,
  onMoveTo,
  handleProps,
  isDragging,
  isOverlay,
  style,
  innerRef,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const [menuOpen, setMenuOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!editing || !el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [editing, draft])

  useEffect(() => {
    if (!editing) return
    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [editing])

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  function startEditing() {
    if (isOverlay || !onRename) return
    setDraft(item.text)
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== item.text) onRename?.(item.id, trimmed)
    else setDraft(item.text)
  }

  function cancel() {
    setDraft(item.text)
    setEditing(false)
  }

  const classes = ['card', `card--${item.list}`]
  if (isDragging) classes.push('card--dragging')
  if (isOverlay) classes.push('card--overlay')

  return (
    <li ref={innerRef} className={classes.join(' ')} style={style}>
      <button
        type="button"
        className="card__grip"
        aria-label={`Reorder or move "${item.text}"`}
        {...handleProps}
      >
        <svg viewBox="0 0 10 16" aria-hidden="true" focusable="false">
          <circle cx="3" cy="3" r="1.3" />
          <circle cx="7" cy="3" r="1.3" />
          <circle cx="3" cy="8" r="1.3" />
          <circle cx="7" cy="8" r="1.3" />
          <circle cx="3" cy="13" r="1.3" />
          <circle cx="7" cy="13" r="1.3" />
        </svg>
      </button>

      {onComplete && (
        <button
          type="button"
          className="card__check"
          onClick={() => onComplete(item.id)}
          aria-label={`Complete "${item.text}"`}
          title="Complete, moving it to the archive"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M3.5 8.5l3 3 6-6" />
          </svg>
        </button>
      )}

      {editing ? (
        <textarea
          ref={textareaRef}
          className="card__editor"
          value={draft}
          rows={1}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              cancel()
            }
          }}
        />
      ) : (
        <button type="button" className="card__text" onClick={startEditing} title="Click to edit">
          {item.text}
        </button>
      )}

      {!isOverlay && onMoveTo && (
        <div className="card__menu" ref={menuRef}>
          <button
            type="button"
            className="card__more"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Actions for "${item.text}"`}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 16 4" aria-hidden="true" focusable="false">
              <circle cx="2" cy="2" r="1.6" />
              <circle cx="8" cy="2" r="1.6" />
              <circle cx="14" cy="2" r="1.6" />
            </svg>
          </button>

          {menuOpen && (
            <div className="menu" role="menu">
              <p className="menu__label">Move to</p>
              {LIST_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  className="menu__item"
                  disabled={key === item.list}
                  onClick={() => {
                    setMenuOpen(false)
                    onMoveTo(item.id, key)
                  }}
                >
                  <span className={`menu__dot menu__dot--${key}`} aria-hidden="true" />
                  {listLabel(key)}
                </button>
              ))}
              <hr className="menu__rule" />
              <button
                type="button"
                role="menuitem"
                className="menu__item"
                onClick={() => {
                  setMenuOpen(false)
                  startEditing()
                }}
              >
                Edit text
              </button>
              {onDelete && (
                <button
                  type="button"
                  role="menuitem"
                  className="menu__item menu__item--danger"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(item.id)
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}
