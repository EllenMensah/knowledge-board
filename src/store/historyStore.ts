/**
 * Command-style undo/redo: stacks of HistoryEntry (undo + redo messages), not full state clones.
 */

import { create } from "zustand"
import type { Card, Comment } from "../types"

export type CardRestorePayload = Pick<
  Card,
  "id" | "columnId" | "title" | "description" | "tags" | "dueDate" | "order" | "version"
>

export type CommentRestorePayload = Comment

export type HistoryMessage =
  | { type: "DELETE_CARD"; payload: { id: string } }
  | {
      type: "CREATE_CARD"
      payload: {
        id: string
        columnId: string
        title: string
        description: string
        tags: string[]
        dueDate: string | null
        order: number
        version: number
      }
    }
  | {
      type: "RESTORE_CARD"
      payload: { card: CardRestorePayload; comments: CommentRestorePayload[] }
    }
  | { type: "MOVE_CARD"; payload: { cardId: string; toColumnId: string; toIndex: number } }

export interface HistoryEntry {
  undo: HistoryMessage
  redo: HistoryMessage
}

type HistoryState = {
  past: HistoryEntry[]
  future: HistoryEntry[]
  pushEntry: (entry: HistoryEntry) => void
  clear: () => void
  popUndo: () => HistoryEntry | null
  popRedo: () => HistoryEntry | null
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useCommandHistory = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  pushEntry(entry) {
    set((s) => ({ past: [...s.past, entry], future: [] }))
  },

  clear() {
    set({ past: [], future: [] })
  },

  popUndo() {
    const { past, future } = get()
    if (past.length === 0) return null
    const entry = past[past.length - 1]!
    set({ past: past.slice(0, -1), future: [entry, ...future] })
    return entry
  },

  popRedo() {
    const { past, future } = get()
    if (future.length === 0) return null
    const entry = future[0]!
    set({ past: [...past, entry], future: future.slice(1) })
    return entry
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))

export function clearCommandHistory(): void {
  useCommandHistory.getState().clear()
}
