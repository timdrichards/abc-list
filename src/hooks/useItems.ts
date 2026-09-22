import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { needsReindex, POSITION_GAP, positionBetween, reindexed } from '../lib/ordering'
import { emptyBoard, type Board, type Item, type ListKey } from '../lib/types'

const COLUMNS = 'id, text, list, position, created_at, updated_at, completed_at, completed_from'

export interface ItemsApi {
  board: Board
  archive: Item[]
  loading: boolean
  error: string | null
  /** Drag needs to reorder the columns locally before anything is persisted. */
  setBoard: React.Dispatch<React.SetStateAction<Board>>
  /** Hold off realtime refreshes while a drag is in flight, so the board cannot jump. */
  setSyncPaused: (paused: boolean) => void
  add: (list: ListKey, text: string) => Promise<void>
  rename: (id: string, text: string) => Promise<void>
  complete: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  /**
   * Persist where an item ended up after a drag or a "move to" pick. `column` is the
   * already-reordered list it landed in, passed in rather than read from state because
   * the caller's setBoard may not have flushed yet.
   */
  placeAt: (id: string, list: ListKey, index: number, column: Item[]) => Promise<void>
  refresh: () => Promise<void>
}

function toBoard(rows: Item[]): Board {
  const board = emptyBoard()
  for (const row of rows) board[row.list].push(row)
  for (const key of Object.keys(board) as ListKey[]) {
    board[key].sort((a, b) => a.position - b.position)
  }
  return board
}

export function useItems(enabled: boolean): ItemsApi {
  const [board, setBoard] = useState<Board>(emptyBoard)
  const [archive, setArchive] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncPaused = useRef(false)
  const missedSync = useRef(false)
  const boardRef = useRef(board)
  boardRef.current = board

  const refresh = useCallback(async () => {
    if (!enabled) return
    const [active, done] = await Promise.all([
      supabase.from('items').select(COLUMNS).is('completed_at', null).order('position'),
      supabase
        .from('items')
        .select(COLUMNS)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(500),
    ])

    const failure = active.error ?? done.error
    if (failure) {
      setError(failure.message)
      setLoading(false)
      return
    }

    setError(null)
    setBoard(toBoard((active.data ?? []) as Item[]))
    setArchive((done.data ?? []) as Item[])
    setLoading(false)
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setBoard(emptyBoard())
      setArchive([])
      setLoading(true)
      return
    }
    void refresh()
  }, [enabled, refresh])

  // Live updates, so a second family member's changes show up without a reload.
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined

    const channel = supabase
      .channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        if (syncPaused.current) {
          missedSync.current = true
          return
        }
        clearTimeout(timer)
        timer = setTimeout(() => void refresh(), 400)
      })
      .subscribe()

    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [enabled, refresh])

  const setSyncPaused = useCallback((paused: boolean) => {
    syncPaused.current = paused
    if (!paused && missedSync.current) {
      missedSync.current = false
      void refresh()
    }
  }, [])

  /** Report a failed write and pull server state back in, so the UI never lies. */
  const fail = useCallback(
    async (message: string) => {
      setError(message)
      await refresh()
    },
    [refresh],
  )

  const add = useCallback(
    async (list: ListKey, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const column = boardRef.current[list]
      const last = column[column.length - 1]
      const position = last ? last.position + POSITION_GAP : POSITION_GAP

      const { data, error: insertError } = await supabase
        .from('items')
        .insert({ text: trimmed, list, position })
        .select(COLUMNS)
        .single()

      if (insertError || !data) {
        await fail(insertError?.message ?? 'Could not add that item.')
        return
      }
      setError(null)
      setBoard((prev) => ({ ...prev, [list]: [...prev[list], data as Item] }))
    },
    [fail],
  )

  const rename = useCallback(
    async (id: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      setBoard((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next) as ListKey[]) {
          next[key] = next[key].map((i) => (i.id === id ? { ...i, text: trimmed } : i))
        }
        return next
      })

      const { error: updateError } = await supabase
        .from('items')
        .update({ text: trimmed })
        .eq('id', id)
      if (updateError) await fail(updateError.message)
      else setError(null)
    },
    [fail],
  )

  const complete = useCallback(
    async (id: string) => {
      const from = (Object.keys(boardRef.current) as ListKey[]).find((key) =>
        boardRef.current[key].some((i) => i.id === id),
      )
      if (!from) return

      const item = boardRef.current[from].find((i) => i.id === id)!
      setBoard((prev) => ({ ...prev, [from]: prev[from].filter((i) => i.id !== id) }))

      const completedAt = new Date().toISOString()
      setArchive((prev) => [
        { ...item, completed_at: completedAt, completed_from: from },
        ...prev,
      ])

      const { error: updateError } = await supabase
        .from('items')
        .update({ completed_at: completedAt, completed_from: from })
        .eq('id', id)
      if (updateError) await fail(updateError.message)
      else setError(null)
    },
    [fail],
  )

  const restore = useCallback(
    async (id: string) => {
      const item = archive.find((i) => i.id === id)
      if (!item) return

      // Put it back where it was completed from, at the bottom of that column.
      const list = item.completed_from ?? item.list
      const column = boardRef.current[list]
      const last = column[column.length - 1]
      const position = last ? last.position + POSITION_GAP : POSITION_GAP

      setArchive((prev) => prev.filter((i) => i.id !== id))
      setBoard((prev) => ({
        ...prev,
        [list]: [...prev[list], { ...item, list, position, completed_at: null, completed_from: null }],
      }))

      const { error: updateError } = await supabase
        .from('items')
        .update({ completed_at: null, completed_from: null, list, position })
        .eq('id', id)
      if (updateError) await fail(updateError.message)
      else setError(null)
    },
    [archive, fail],
  )

  const remove = useCallback(
    async (id: string) => {
      setArchive((prev) => prev.filter((i) => i.id !== id))
      setBoard((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next) as ListKey[]) {
          next[key] = next[key].filter((i) => i.id !== id)
        }
        return next
      })

      const { error: deleteError } = await supabase.from('items').delete().eq('id', id)
      if (deleteError) await fail(deleteError.message)
      else setError(null)
    },
    [fail],
  )

  const placeAt = useCallback(
    async (id: string, list: ListKey, index: number, column: Item[]) => {
      const before = column[index - 1]?.position
      const after = column[index + 1]?.position

      if (needsReindex(before, after)) {
        // The gap has collapsed; renumber this one column and write it in a batch.
        const rows = reindexed(column).map(({ item, position }) => ({
          id: item.id,
          text: item.text,
          list,
          position,
        }))
        setBoard((prev) => ({
          ...prev,
          [list]: prev[list].map((item, i) => ({ ...item, list, position: (i + 1) * POSITION_GAP })),
        }))
        const { error: upsertError } = await supabase.from('items').upsert(rows)
        if (upsertError) await fail(upsertError.message)
        else setError(null)
        return
      }

      const position = positionBetween(before, after)
      setBoard((prev) => ({
        ...prev,
        [list]: prev[list].map((item) => (item.id === id ? { ...item, list, position } : item)),
      }))

      const { error: updateError } = await supabase
        .from('items')
        .update({ list, position })
        .eq('id', id)
      if (updateError) await fail(updateError.message)
      else setError(null)
    },
    [fail],
  )

  return {
    board,
    archive,
    loading,
    error,
    setBoard,
    setSyncPaused,
    add,
    rename,
    complete,
    restore,
    remove,
    placeAt,
    refresh,
  }
}
