import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ItemCard } from './ItemCard'
import type { Item, ListKey } from '../lib/types'

interface Props {
  item: Item
  onComplete: (id: string) => void
  onRename: (id: string, text: string) => void
  onDelete: (id: string) => void
  onMoveTo: (id: string, list: ListKey) => void
}

export function SortableItem({ item, onComplete, onRename, onDelete, onMoveTo }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <ItemCard
      item={item}
      innerRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      handleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      onComplete={onComplete}
      onRename={onRename}
      onDelete={onDelete}
      onMoveTo={onMoveTo}
    />
  )
}
