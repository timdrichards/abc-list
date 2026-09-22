export type ListKey = 'A' | 'B' | 'C'

export const LIST_KEYS: ListKey[] = ['A', 'B', 'C']

export interface ListMeta {
  key: ListKey
  title: string
  blurb: string
}

export const LISTS: Record<ListKey, ListMeta> = {
  A: { key: 'A', title: 'Today', blurb: 'Must happen today' },
  B: { key: 'B', title: 'This week', blurb: 'Needs to happen this week' },
  C: { key: 'C', title: 'Eventually', blurb: 'Needs to happen eventually' },
}

/** "A · Today", for places that need the letter and the name together. */
export function listLabel(key: ListKey): string {
  return `${key} · ${LISTS[key].title}`
}

export interface Item {
  id: string
  text: string
  list: ListKey
  position: number
  created_at: string
  updated_at: string
  completed_at: string | null
  completed_from: ListKey | null
}

export type Board = Record<ListKey, Item[]>

export const emptyBoard = (): Board => ({ A: [], B: [], C: [] })

export function isListKey(value: unknown): value is ListKey {
  return value === 'A' || value === 'B' || value === 'C'
}
