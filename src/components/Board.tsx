import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Column } from './Column'
import { ItemCard } from './ItemCard'
import type { ItemsApi } from '../hooks/useItems'
import { LIST_KEYS, isListKey, type Board as BoardState, type Item, type ListKey } from '../lib/types'

/** Which column holds this id — or the id itself when it *is* a column. */
function containerOf(board: BoardState, id: string): ListKey | null {
  if (isListKey(id)) return id
  return LIST_KEYS.find((key) => board[key].some((item) => item.id === id)) ?? null
}

export function Board({ items }: { items: ItemsApi }) {
  const { board, setBoard, setSyncPaused, add, complete, rename, remove, placeAt } = items
  const [activeId, setActiveId] = useState<string | null>(null)

  // Drag handlers fire between renders, so read the board through a ref rather than
  // the render closure, which can lag a drag-over update by one frame.
  const boardRef = useRef(board)
  boardRef.current = board

  const sensors = useSensors(
    // A small drag threshold so tapping the grip still counts as a click for a11y.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // On touch, hold briefly before dragging so the page can still be scrolled.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeItem = useMemo<Item | null>(() => {
    if (!activeId) return null
    for (const key of LIST_KEYS) {
      const found = board[key].find((item) => item.id === activeId)
      if (found) return found
    }
    return null
  }, [activeId, board])

  function handleDragStart(event: DragStartEvent) {
    setSyncPaused(true)
    setActiveId(String(event.active.id))
  }

  /**
   * Cross-column movement happens here rather than on drop, so the card visibly
   * lands in the new column while the pointer is still down.
   */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    setBoard((prev) => {
      const from = containerOf(prev, activeId)
      const to = containerOf(prev, overId)
      if (!from || !to || from === to) return prev

      const fromItems = prev[from]
      const toItems = prev[to]
      const activeIndex = fromItems.findIndex((item) => item.id === activeId)
      if (activeIndex === -1) return prev

      let newIndex: number
      if (isListKey(overId)) {
        newIndex = toItems.length
      } else {
        const overIndex = toItems.findIndex((item) => item.id === overId)
        const overRect = over.rect
        const activeRect = active.rect.current.translated
        const below =
          overRect && activeRect && activeRect.top > overRect.top + overRect.height / 2
        newIndex = overIndex === -1 ? toItems.length : overIndex + (below ? 1 : 0)
      }

      const moved = { ...fromItems[activeIndex], list: to }
      return {
        ...prev,
        [from]: fromItems.filter((item) => item.id !== activeId),
        [to]: [...toItems.slice(0, newIndex), moved, ...toItems.slice(newIndex)],
      }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
      setSyncPaused(false)
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)
    const current = boardRef.current
    const container = containerOf(current, activeId)
    if (!container) {
      setSyncPaused(false)
      return
    }

    // Cross-column moves already landed during drag over; same-column reordering
    // has not been applied yet, so do it here.
    let column = current[container]
    if (!isListKey(overId) && containerOf(current, overId) === container) {
      const from = column.findIndex((item) => item.id === activeId)
      const to = column.findIndex((item) => item.id === overId)
      if (from !== -1 && to !== -1 && from !== to) {
        column = arrayMove(column, from, to)
        setBoard((prev) => ({ ...prev, [container]: column }))
      }
    }

    const index = column.findIndex((item) => item.id === activeId)
    if (index === -1) {
      setSyncPaused(false)
      return
    }

    void placeAt(activeId, container, index, column).finally(() => setSyncPaused(false))
  }

  function handleDragCancel() {
    setActiveId(null)
    setSyncPaused(false)
    void items.refresh()
  }

  /** The "Move to" menu: a keyboard- and touch-friendly alternative to dragging. */
  function moveTo(id: string, list: ListKey) {
    const current = boardRef.current
    const from = containerOf(current, id)
    if (!from || from === list) return
    const item = current[from].find((i) => i.id === id)
    if (!item) return

    const column = [...current[list], { ...item, list }]
    setBoard((prev) => ({
      ...prev,
      [from]: prev[from].filter((i) => i.id !== id),
      [list]: column,
    }))
    void placeAt(id, list, column.length - 1, column)
  }

  function confirmDelete(id: string) {
    const item = boardRef.current[containerOf(boardRef.current, id) ?? 'A']?.find(
      (i) => i.id === id,
    )
    const label = item ? `“${item.text}”` : 'this item'
    if (window.confirm(`Delete ${label} for good?\n\nCompleting it instead keeps it in the archive.`)) {
      remove(id)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="board">
        {LIST_KEYS.map((key) => (
          <Column
            key={key}
            list={key}
            items={board[key]}
            onAdd={add}
            onComplete={complete}
            onRename={rename}
            onDelete={confirmDelete}
            onMoveTo={moveTo}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {activeItem ? <ItemCard item={activeItem} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
