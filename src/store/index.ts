/**
 * Normalized workspace store (Zustand).
 *
 * State management decision:
 * - Zustand was chosen for: minimal boilerplate, normalized entities (boards/columns/cards by id),
 *   easy selectors to avoid prop drilling, and a single store that can later be synced with
 *   real-time updates (Stage 2) without restructuring.
 * - UI state (which modal is open, form values) stays in components to keep the store
 *   serializable and domain-focused.
 */

import { create } from "zustand"
import type { Board, Column, Card } from "../types"
import type { WorkspaceState } from "./types"

const initialState: WorkspaceState = {
  boards: { byId: {}, allIds: [] },
  columns: { byId: {}, allIds: [] },
  cards: { byId: {}, allIds: [] },
}

type WorkspaceActions = {
  // Boards
  createBoard: (payload: { title: string; description: string }) => void
  deleteBoard: (id: string) => void
  updateBoard: (id: string, patch: Partial<Pick<Board, "title" | "description">>) => void

  // Columns
  createColumn: (boardId: string, payload: { title: string }) => void
  updateColumn: (id: string, patch: Partial<Pick<Column, "title">>) => void
  deleteColumn: (id: string) => void

  // Cards
  createCard: (columnId: string, payload: { title: string; description?: string; tags?: string[]; dueDate?: string | null }) => void
  updateCard: (id: string, patch: Partial<Pick<Card, "title" | "description" | "tags" | "dueDate">>) => void
  deleteCard: (id: string) => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  ...initialState,

  createBoard: (payload) =>
    set((state) => {
      const id = generateId()
      const board: Board = {
        id,
        title: payload.title,
        description: payload.description,
        createdAt: new Date().toISOString(),
      }
      return {
        boards: {
          byId: { ...state.boards.byId, [id]: board },
          allIds: [...state.boards.allIds, id],
        },
      }
    }),

  deleteBoard: (id) =>
    set((state) => {
      const columnIds = state.columns.allIds.filter((cId) => state.columns.byId[cId].boardId === id)
      const cardIds = state.cards.allIds.filter(
        (cardId) => columnIds.includes(state.cards.byId[cardId].columnId)
      )
      return {
        boards: {
          byId: (() => {
            const next = { ...state.boards.byId }
            delete next[id]
            return next
          })(),
          allIds: state.boards.allIds.filter((x) => x !== id),
        },
        columns: {
          byId: (() => {
            const next = { ...state.columns.byId }
            columnIds.forEach((cId) => delete next[cId])
            return next
          })(),
          allIds: state.columns.allIds.filter((x) => !columnIds.includes(x)),
        },
        cards: {
          byId: (() => {
            const next = { ...state.cards.byId }
            cardIds.forEach((cId) => delete next[cId])
            return next
          })(),
          allIds: state.cards.allIds.filter((x) => !cardIds.includes(x)),
        },
      }
    }),

  updateBoard: (id, patch) =>
    set((state) => {
      const board = state.boards.byId[id]
      if (!board) return state
      return {
        boards: {
          ...state.boards,
          byId: { ...state.boards.byId, [id]: { ...board, ...patch } },
        },
      }
    }),

  createColumn: (boardId, payload) =>
    set((state) => {
      const id = generateId()
      const maxOrder = state.columns.allIds
        .map((cId) => state.columns.byId[cId])
        .filter((c) => c?.boardId === boardId)
        .reduce((max, c) => Math.max(max, c?.order ?? 0), -1)
      const column: Column = {
        id,
        boardId,
        title: payload.title,
        order: maxOrder + 1,
      }
      return {
        columns: {
          byId: { ...state.columns.byId, [id]: column },
          allIds: [...state.columns.allIds, id],
        },
      }
    }),

  updateColumn: (id, patch) =>
    set((state) => {
      const column = state.columns.byId[id]
      if (!column) return state
      return {
        columns: {
          ...state.columns,
          byId: { ...state.columns.byId, [id]: { ...column, ...patch } },
        },
      }
    }),

  deleteColumn: (id) =>
    set((state) => {
      const cardIds = state.cards.allIds.filter((c) => state.cards.byId[c].columnId === id)
      return {
        columns: {
          byId: (() => {
            const next = { ...state.columns.byId }
            delete next[id]
            return next
          })(),
          allIds: state.columns.allIds.filter((x) => x !== id),
        },
        cards: {
          byId: (() => {
            const next = { ...state.cards.byId }
            cardIds.forEach((cId) => delete next[cId])
            return next
          })(),
          allIds: state.cards.allIds.filter((x) => !cardIds.includes(x)),
        },
      }
    }),

  createCard: (columnId, payload) =>
    set((state) => {
      const id = generateId()
      const maxOrder = state.cards.allIds
        .map((cId) => state.cards.byId[cId])
        .filter((c) => c?.columnId === columnId)
        .reduce((max, c) => Math.max(max, c?.order ?? 0), -1)
      const card: Card = {
        id,
        columnId,
        title: payload.title,
        description: payload.description ?? "",
        tags: payload.tags ?? [],
        dueDate: payload.dueDate ?? null,
        order: maxOrder + 1,
      }
      return {
        cards: {
          byId: { ...state.cards.byId, [id]: card },
          allIds: [...state.cards.allIds, id],
        },
      }
    }),

  updateCard: (id, patch) =>
    set((state) => {
      const card = state.cards.byId[id]
      if (!card) return state
      return {
        cards: {
          ...state.cards,
          byId: { ...state.cards.byId, [id]: { ...card, ...patch } },
        },
      }
    }),

  deleteCard: (id) =>
    set((state) => ({
      cards: {
        byId: (() => {
          const next = { ...state.cards.byId }
          delete next[id]
          return next
        })(),
        allIds: state.cards.allIds.filter((x) => x !== id),
      },
    })),
}))

// Selectors (computed outside store to keep store minimal; can be moved to a separate file)
export function selectBoardsList(state: WorkspaceState): Board[] {
  return state.boards.allIds.map((id) => state.boards.byId[id]).filter(Boolean)
}

export function selectBoardById(state: WorkspaceState, boardId: string): Board | undefined {
  return state.boards.byId[boardId]
}

export function selectColumnsForBoard(state: WorkspaceState, boardId: string): Column[] {
  return state.columns.allIds
    .map((id) => state.columns.byId[id])
    .filter((c): c is Column => c !== undefined && c.boardId === boardId)
    .sort((a, b) => a.order - b.order)
}

export function selectCardsForColumn(state: WorkspaceState, columnId: string): Card[] {
  return state.cards.allIds
    .map((id) => state.cards.byId[id])
    .filter((c): c is Card => c !== undefined && c.columnId === columnId)
    .sort((a, b) => a.order - b.order)
}

export function selectCardById(state: WorkspaceState, cardId: string): Card | undefined {
  return state.cards.byId[cardId]
}
