/**
 * Normalized workspace store (Zustand) with WebSocket sync, optimistic UI, and command history.
 *
 * Real-time: optimistic local updates, then mutation to WS server. Server broadcasts FULL_STATE;
 * setFullState reconciles all clients (last server snapshot wins per entity via replace).
 *
 * Conflict resolution for concurrent edits: Last-Write-Wins at the server (see docs/COLLABORATION.md).
 *
 * Undo/redo: action history (inverse + forward messages), not full state clones.
 */

import { create } from "zustand"
import type { Board, Column, Card, Comment } from "../types"
import type { WorkspaceState } from "./types"
import { wsClient, registerServerStateHandler } from "./wsClient"
import {
  useCommandHistory,
  type HistoryMessage,
} from "./historyStore"

const initialState: WorkspaceState = {
  boards: { byId: {}, allIds: [] },
  columns: { byId: {}, allIds: [] },
  cards: { byId: {}, allIds: [] },
  comments: { byId: {}, allIds: [] },
}

let historySuppressed = false

type SkipHistory = { skipHistory?: boolean }

type WorkspaceActions = {
  setFullState: (state: WorkspaceState) => void

  createBoard: (payload: { title: string; description: string }) => void
  deleteBoard: (id: string) => void
  updateBoard: (id: string, patch: Partial<Pick<Board, "title" | "description">>) => void

  createColumn: (boardId: string, payload: { title: string }) => void
  updateColumn: (id: string, patch: Partial<Pick<Column, "title">>) => void
  deleteColumn: (id: string) => void

  createCard: (
    columnId: string,
    payload: { title: string; description?: string; tags?: string[]; dueDate?: string | null },
    opts?: SkipHistory
  ) => void
  /** Used by undo/redo and server-aligned replay; inserts an exact card row. */
  createCardFromPayload: (
    payload: {
      id: string
      columnId: string
      title: string
      description: string
      tags: string[]
      dueDate: string | null
      order: number
      version: number
    },
    opts?: SkipHistory
  ) => void
  restoreCard: (card: Card, comments: Comment[], opts?: SkipHistory) => void
  updateCard: (id: string, patch: Partial<Pick<Card, "title" | "description" | "tags" | "dueDate">>) => void
  deleteCard: (id: string, opts?: SkipHistory) => void

  addComment: (
    cardId: string,
    payload: { author: string; text: string; parentId?: string | null },
    opts?: SkipHistory & { commentId?: string }
  ) => void
  updateComment: (id: string, payload: { text: string }) => void
  deleteComment: (id: string) => void

  moveCard: (cardId: string, toColumnId: string, toIndex: number, opts?: SkipHistory) => void
  reorderCard: (cardId: string, toIndex: number, opts?: SkipHistory) => void

  applyHistoryMessage: (msg: HistoryMessage) => void
  undo: () => void
  redo: () => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getColumnCards(state: WorkspaceState, columnId: string): Card[] {
  return state.cards.allIds
    .map((id) => state.cards.byId[id])
    .filter((c): c is Card => c !== undefined && c.columnId === columnId)
    .sort((a, b) => a.order - b.order)
}

function reindexCards(cards: Card[], byId: Record<string, Card>): Record<string, Card> {
  const next = { ...byId }
  cards.forEach((card, i) => {
    next[card.id] = { ...card, order: i }
  })
  return next
}

function removeCommentsForCard(
  byId: Record<string, Comment>,
  allIds: string[],
  cardId: string
): { byId: Record<string, Comment>; allIds: string[] } {
  const drop = new Set(
    allIds.filter((id) => byId[id]?.cardId === cardId)
  )
  const nextById = { ...byId }
  drop.forEach((id) => delete nextById[id])
  return { byId: nextById, allIds: allIds.filter((id) => !drop.has(id)) }
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  ...initialState,

  setFullState: (serverState) =>
    set(() => ({
      boards: serverState.boards,
      columns: serverState.columns,
      cards: serverState.cards,
      comments: serverState.comments,
    })),

  applyHistoryMessage(msg) {
    historySuppressed = true
    try {
      const st = get()
      switch (msg.type) {
        case "DELETE_CARD":
          st.deleteCard(msg.payload.id, { skipHistory: true })
          break
        case "CREATE_CARD":
          st.createCardFromPayload(msg.payload, { skipHistory: true })
          break
        case "RESTORE_CARD":
          st.restoreCard(msg.payload.card as Card, msg.payload.comments as Comment[], { skipHistory: true })
          break
        case "MOVE_CARD":
          st.moveCard(msg.payload.cardId, msg.payload.toColumnId, msg.payload.toIndex, { skipHistory: true })
          break
      }
    } finally {
      historySuppressed = false
    }
  },

  undo() {
    const entry = useCommandHistory.getState().popUndo()
    if (!entry) return
    get().applyHistoryMessage(entry.undo)
  },

  redo() {
    const entry = useCommandHistory.getState().popRedo()
    if (!entry) return
    get().applyHistoryMessage(entry.redo)
  },

  /* ──────────────── Boards ──────────────── */

  createBoard: (payload) => {
    const id = generateId()
    set((state) => {
      const board: Board = {
        id,
        title: payload.title,
        description: payload.description,
        createdAt: new Date().toISOString(),
        version: 1,
      }
      return {
        boards: {
          byId: { ...state.boards.byId, [id]: board },
          allIds: [...state.boards.allIds, id],
        },
      }
    })
    wsClient.send("CREATE_BOARD", { title: payload.title, description: payload.description })
  },

  deleteBoard: (id) => {
    set((state) => {
      const columnIds = state.columns.allIds.filter((cId) => state.columns.byId[cId].boardId === id)
      const cardIds = state.cards.allIds.filter((cardId) =>
        columnIds.includes(state.cards.byId[cardId].columnId)
      )
      let comments = state.comments
      for (const cid of cardIds) {
        comments = removeCommentsForCard(comments.byId, comments.allIds, cid)
      }
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
        comments,
      }
    })
    wsClient.send("DELETE_BOARD", { id })
  },

  updateBoard: (id, patch) => {
    set((state) => {
      const board = state.boards.byId[id]
      if (!board) return state
      return {
        boards: {
          ...state.boards,
          byId: { ...state.boards.byId, [id]: { ...board, ...patch, version: board.version + 1 } },
        },
      }
    })
    wsClient.send("UPDATE_BOARD", { id, patch })
  },

  /* ──────────────── Columns ──────────────── */

  createColumn: (boardId, payload) => {
    const id = generateId()
    set((state) => {
      const maxOrder = state.columns.allIds
        .map((cId) => state.columns.byId[cId])
        .filter((c) => c?.boardId === boardId)
        .reduce((max, c) => Math.max(max, c?.order ?? 0), -1)
      const column: Column = {
        id,
        boardId,
        title: payload.title,
        order: maxOrder + 1,
        version: 1,
      }
      return {
        columns: {
          byId: { ...state.columns.byId, [id]: column },
          allIds: [...state.columns.allIds, id],
        },
      }
    })
    wsClient.send("CREATE_COLUMN", { boardId, title: payload.title })
  },

  updateColumn: (id, patch) => {
    set((state) => {
      const column = state.columns.byId[id]
      if (!column) return state
      return {
        columns: {
          ...state.columns,
          byId: { ...state.columns.byId, [id]: { ...column, ...patch, version: column.version + 1 } },
        },
      }
    })
    wsClient.send("UPDATE_COLUMN", { id, patch })
  },

  deleteColumn: (id) => {
    set((state) => {
      const cardIds = state.cards.allIds.filter((c) => state.cards.byId[c].columnId === id)
      let comments = state.comments
      for (const cid of cardIds) {
        comments = removeCommentsForCard(comments.byId, comments.allIds, cid)
      }
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
        comments,
      }
    })
    wsClient.send("DELETE_COLUMN", { id })
  },

  /* ──────────────── Cards ──────────────── */

  createCardFromPayload: (payload, _opts?: SkipHistory) => {
    set((state) => {
      if (state.cards.byId[payload.id]) return state
      const card: Card = {
        id: payload.id,
        columnId: payload.columnId,
        title: payload.title,
        description: payload.description,
        tags: payload.tags,
        dueDate: payload.dueDate,
        order: payload.order,
        version: payload.version,
      }
      return {
        cards: {
          byId: { ...state.cards.byId, [payload.id]: card },
          allIds: [...state.cards.allIds, payload.id],
        },
      }
    })
    wsClient.send("CREATE_CARD", {
      id: payload.id,
      columnId: payload.columnId,
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
      dueDate: payload.dueDate,
      order: payload.order,
      version: payload.version,
    })
  },

  createCard: (columnId, payload, opts) => {
    const id = generateId()
    const state = get()
    const maxOrder = state.cards.allIds
      .map((cId) => state.cards.byId[cId])
      .filter((c) => c?.columnId === columnId)
      .reduce((max, c) => Math.max(max, c?.order ?? 0), -1)
    const order = maxOrder + 1
    const cardPayload = {
      id,
      columnId,
      title: payload.title,
      description: payload.description ?? "",
      tags: payload.tags ?? [],
      dueDate: payload.dueDate ?? null,
      order,
      version: 1,
    }
    get().createCardFromPayload(cardPayload, { skipHistory: true })

    const record = !opts?.skipHistory && !historySuppressed
    if (record) {
      useCommandHistory.getState().pushEntry({
        undo: { type: "DELETE_CARD", payload: { id } },
        redo: { type: "CREATE_CARD", payload: cardPayload },
      })
    }
  },

  restoreCard: (card, comments, _opts?: SkipHistory) => {
    set((state) => {
      if (state.cards.byId[card.id]) return state
      const nextComments = { ...state.comments.byId }
      const newIds = [...state.comments.allIds]
      for (const c of comments) {
        nextComments[c.id] = c
        if (!newIds.includes(c.id)) newIds.push(c.id)
      }
      return {
        cards: {
          byId: { ...state.cards.byId, [card.id]: card },
          allIds: [...state.cards.allIds, card.id],
        },
        comments: { byId: nextComments, allIds: newIds },
      }
    })
    wsClient.send("RESTORE_CARD", {
      card,
      comments,
    })
  },

  updateCard: (id, patch) => {
    set((state) => {
      const card = state.cards.byId[id]
      if (!card) return state
      return {
        cards: {
          ...state.cards,
          byId: { ...state.cards.byId, [id]: { ...card, ...patch, version: card.version + 1 } },
        },
      }
    })
    wsClient.send("UPDATE_CARD", { id, patch })
  },

  deleteCard: (id, opts) => {
    const state = get()
    const card = state.cards.byId[id]
    if (!card) return

    const comments = state.comments.allIds
      .map((cid) => state.comments.byId[cid])
      .filter((c): c is Comment => !!c && c.cardId === id)

    const record = !opts?.skipHistory && !historySuppressed
    if (record) {
      useCommandHistory.getState().pushEntry({
        undo: {
          type: "RESTORE_CARD",
          payload: { card: { ...card }, comments: comments.map((c) => ({ ...c })) },
        },
        redo: { type: "DELETE_CARD", payload: { id } },
      })
    }

    set((s) => {
      const cm = removeCommentsForCard(s.comments.byId, s.comments.allIds, id)
      return {
        cards: {
          byId: (() => {
            const next = { ...s.cards.byId }
            delete next[id]
            return next
          })(),
          allIds: s.cards.allIds.filter((x) => x !== id),
        },
        comments: cm,
      }
    })
    wsClient.send("DELETE_CARD", { id })
  },

  /* ──────────────── Comments (normalized) ──────────────── */

  addComment: (cardId, payload, opts) => {
    const commentId = opts?.commentId ?? generateId()
    const now = new Date().toISOString()
    const parentId = payload.parentId ?? null
    set((state) => {
      const card = state.cards.byId[cardId]
      if (!card) return state
      const comment: Comment = {
        id: commentId,
        cardId,
        parentId,
        author: payload.author,
        text: payload.text,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      }
      return {
        comments: {
          byId: { ...state.comments.byId, [commentId]: comment },
          allIds: [...state.comments.allIds, commentId],
        },
        cards: {
          ...state.cards,
          byId: {
            ...state.cards.byId,
            [cardId]: { ...card, version: card.version + 1 },
          },
        },
      }
    })
    wsClient.send("ADD_COMMENT", {
      id: commentId,
      cardId,
      parentId,
      author: payload.author,
      text: payload.text,
    })
  },

  updateComment: (id, payload) => {
    set((state) => {
      const comment = state.comments.byId[id]
      if (!comment || comment.deleted) return state
      const card = state.cards.byId[comment.cardId]
      if (!card) return state
      const next: Comment = {
        ...comment,
        text: payload.text,
        updatedAt: new Date().toISOString(),
      }
      return {
        comments: {
          ...state.comments,
          byId: { ...state.comments.byId, [id]: next },
        },
        cards: {
          ...state.cards,
          byId: {
            ...state.cards.byId,
            [comment.cardId]: { ...card, version: card.version + 1 },
          },
        },
      }
    })
    wsClient.send("UPDATE_COMMENT", { id, text: payload.text })
  },

  deleteComment: (id) => {
    set((state) => {
      const comment = state.comments.byId[id]
      if (!comment || comment.deleted) return state
      const card = state.cards.byId[comment.cardId]
      if (!card) return state
      return {
        comments: {
          ...state.comments,
          byId: {
            ...state.comments.byId,
            [id]: {
              ...comment,
              deleted: true,
              text: "",
              updatedAt: new Date().toISOString(),
            },
          },
        },
        cards: {
          ...state.cards,
          byId: {
            ...state.cards.byId,
            [comment.cardId]: { ...card, version: card.version + 1 },
          },
        },
      }
    })
    wsClient.send("DELETE_COMMENT", { id })
  },

  /* ──────────────── Drag & Drop ──────────────── */

  moveCard: (cardId, toColumnId, toIndex, opts) => {
    const state = get()
    const card = state.cards.byId[cardId]
    if (!card) return

    const fromColumnId = card.columnId
    const sortedSource = getColumnCards(state, fromColumnId)
    const fromIndex = sortedSource.findIndex((c) => c.id === cardId)

    const record = !opts?.skipHistory && !historySuppressed
    if (record && fromIndex >= 0) {
      useCommandHistory.getState().pushEntry({
        undo: { type: "MOVE_CARD", payload: { cardId, toColumnId: fromColumnId, toIndex: fromIndex } },
        redo: { type: "MOVE_CARD", payload: { cardId, toColumnId, toIndex } },
      })
    }

    set((s) => {
      const c = s.cards.byId[cardId]
      if (!c) return s

      const sourceColumnId = c.columnId
      const isSameColumn = sourceColumnId === toColumnId

      if (isSameColumn) {
        const sorted = getColumnCards(s, sourceColumnId)
        const fi = sorted.findIndex((x) => x.id === cardId)
        if (fi === -1 || fi === toIndex) return s

        const reordered = [...sorted]
        const [moved] = reordered.splice(fi, 1)
        reordered.splice(toIndex, 0, moved)
        const nextById = reindexCards(reordered, s.cards.byId)
        return { cards: { ...s.cards, byId: nextById } }
      }

      const sourceCards = getColumnCards(s, sourceColumnId).filter((x) => x.id !== cardId)
      const destCards = getColumnCards(s, toColumnId)
      const movedCard: Card = { ...c, columnId: toColumnId }
      const clampedIndex = Math.min(toIndex, destCards.length)
      destCards.splice(clampedIndex, 0, movedCard)

      let nextById = reindexCards(sourceCards, s.cards.byId)
      nextById = reindexCards(destCards, nextById)

      return { cards: { ...s.cards, byId: nextById } }
    })

    const after = get().cards.byId[cardId]
    if (after) {
      wsClient.send("MOVE_CARD", { cardId, toColumnId, toIndex })
    }
  },

  reorderCard: (cardId, toIndex, opts) => {
    const state = get()
    const card = state.cards.byId[cardId]
    if (!card) return
    get().moveCard(cardId, card.columnId, toIndex, opts)
  },
}))

// Selectors
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

export { selectAllCommentsForCard, selectActiveCommentsForCard, buildCommentChildMap, selectTopLevelCommentIds } from "./commentSelectors"

import { clearCommandHistory } from "./historyStore"

registerServerStateHandler((state, source) => {
  // New session / reconnect: drop undo history. Same-session FULL_STATE echoes keep the stack
  // so card create/move/delete undo still works after the server round-trip.
  if (source === "INIT") clearCommandHistory()
  useWorkspaceStore.getState().setFullState(state)
})
