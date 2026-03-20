/**
 * WebSocket server — single source of truth for workspace state.
 * Broadcasts FULL_STATE after each mutation so all sessions converge.
 *
 * Run: npx tsx server/ws-server.ts
 */

import { WebSocketServer, WebSocket } from "ws"

interface CommentEntity {
  id: string
  cardId: string
  parentId: string | null
  author: string
  text: string
  createdAt: string
  updatedAt: string
  deleted: boolean
}

interface Board {
  id: string
  title: string
  description: string
  createdAt: string
  version: number
}

interface Column {
  id: string
  boardId: string
  title: string
  order: number
  version: number
}

interface Card {
  id: string
  columnId: string
  title: string
  description: string
  tags: string[]
  dueDate: string | null
  order: number
  version: number
}

interface ServerState {
  boards: { byId: Record<string, Board>; allIds: string[] }
  columns: { byId: Record<string, Column>; allIds: string[] }
  cards: { byId: Record<string, Card>; allIds: string[] }
  comments: { byId: Record<string, CommentEntity>; allIds: string[] }
}

const state: ServerState = {
  boards: { byId: {}, allIds: [] },
  columns: { byId: {}, allIds: [] },
  cards: { byId: {}, allIds: [] },
  comments: { byId: {}, allIds: [] },
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getColumnCards(columnId: string): Card[] {
  return state.cards.allIds
    .map((id) => state.cards.byId[id])
    .filter((c): c is Card => c !== undefined && c.columnId === columnId)
    .sort((a, b) => a.order - b.order)
}

function reindexCards(cards: Card[]): void {
  cards.forEach((card, i) => {
    state.cards.byId[card.id] = { ...state.cards.byId[card.id], order: i }
  })
}

function removeCommentsForCard(cardId: string): void {
  const drop = state.comments.allIds.filter((id) => state.comments.byId[id]?.cardId === cardId)
  drop.forEach((id) => delete state.comments.byId[id])
  state.comments.allIds = state.comments.allIds.filter((id) => !drop.includes(id))
}

const PORT = 4000
const wss = new WebSocketServer({ port: PORT })

console.log(`[ws-server] listening on ws://localhost:${PORT}`)

function broadcast(msg: object): void {
  const payload = JSON.stringify(msg)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  })
}

function broadcastFullState(): void {
  broadcast({ type: "FULL_STATE", state })
}

wss.on("connection", (ws) => {
  console.log("[ws-server] client connected, total:", wss.clients.size)
  ws.send(JSON.stringify({ type: "INIT", state }))

  ws.on("message", (raw) => {
    let msg: { type: string; payload?: any }
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    console.log("[ws-server] received:", msg.type)

    switch (msg.type) {
      case "CREATE_BOARD": {
        const { title, description } = msg.payload
        const id = generateId()
        state.boards.byId[id] = {
          id,
          title,
          description,
          createdAt: new Date().toISOString(),
          version: 1,
        }
        state.boards.allIds.push(id)
        broadcastFullState()
        break
      }

      case "UPDATE_BOARD": {
        const { id, patch } = msg.payload
        const board = state.boards.byId[id]
        if (!board) break
        state.boards.byId[id] = { ...board, ...patch, version: board.version + 1 }
        broadcastFullState()
        break
      }

      case "DELETE_BOARD": {
        const { id } = msg.payload
        if (!state.boards.byId[id]) break
        const colIds = state.columns.allIds.filter((cId) => state.columns.byId[cId]?.boardId === id)
        const cardIds = state.cards.allIds.filter((cardId) =>
          colIds.includes(state.cards.byId[cardId]?.columnId ?? "")
        )
        cardIds.forEach((cId) => removeCommentsForCard(cId))
        cardIds.forEach((cId) => delete state.cards.byId[cId])
        state.cards.allIds = state.cards.allIds.filter((x) => !cardIds.includes(x))
        colIds.forEach((cId) => delete state.columns.byId[cId])
        state.columns.allIds = state.columns.allIds.filter((x) => !colIds.includes(x))
        delete state.boards.byId[id]
        state.boards.allIds = state.boards.allIds.filter((x) => x !== id)
        broadcastFullState()
        break
      }

      case "CREATE_COLUMN": {
        const { boardId, title } = msg.payload
        const id = generateId()
        const maxOrder = state.columns.allIds
          .map((cId) => state.columns.byId[cId])
          .filter((c) => c?.boardId === boardId)
          .reduce((max, c) => Math.max(max, c?.order ?? 0), -1)
        state.columns.byId[id] = { id, boardId, title, order: maxOrder + 1, version: 1 }
        state.columns.allIds.push(id)
        broadcastFullState()
        break
      }

      case "UPDATE_COLUMN": {
        const { id, patch } = msg.payload
        const col = state.columns.byId[id]
        if (!col) break
        state.columns.byId[id] = { ...col, ...patch, version: col.version + 1 }
        broadcastFullState()
        break
      }

      case "DELETE_COLUMN": {
        const { id } = msg.payload
        if (!state.columns.byId[id]) break
        const cardIds = state.cards.allIds.filter((cId) => state.cards.byId[cId]?.columnId === id)
        cardIds.forEach((cId) => removeCommentsForCard(cId))
        cardIds.forEach((cId) => delete state.cards.byId[cId])
        state.cards.allIds = state.cards.allIds.filter((x) => !cardIds.includes(x))
        delete state.columns.byId[id]
        state.columns.allIds = state.columns.allIds.filter((x) => x !== id)
        broadcastFullState()
        break
      }

      case "CREATE_CARD": {
        const p = msg.payload
        const columnId = p.columnId
        const id =
          typeof p.id === "string" && p.id && !state.cards.byId[p.id] ? p.id : generateId()
        const maxOrder = state.cards.allIds
          .map((cId) => state.cards.byId[cId])
          .filter((c) => c?.columnId === columnId)
          .reduce((max, c) => Math.max(max, c?.order ?? 0), -1)
        const order = typeof p.order === "number" ? p.order : maxOrder + 1
        const version = typeof p.version === "number" ? p.version : 1
        state.cards.byId[id] = {
          id,
          columnId,
          title: p.title,
          description: p.description ?? "",
          tags: p.tags ?? [],
          dueDate: p.dueDate ?? null,
          order,
          version,
        }
        state.cards.allIds.push(id)
        const sorted = getColumnCards(columnId)
        reindexCards(sorted)
        broadcastFullState()
        break
      }

      case "RESTORE_CARD": {
        const { card, comments } = msg.payload as {
          card: Card
          comments: CommentEntity[]
        }
        if (state.cards.byId[card.id]) break
        state.cards.byId[card.id] = { ...card }
        state.cards.allIds.push(card.id)
        for (const c of comments ?? []) {
          state.comments.byId[c.id] = { ...c }
          if (!state.comments.allIds.includes(c.id)) state.comments.allIds.push(c.id)
        }
        const sorted = getColumnCards(card.columnId)
        reindexCards(sorted)
        broadcastFullState()
        break
      }

      case "UPDATE_CARD": {
        const { id, patch } = msg.payload
        const card = state.cards.byId[id]
        if (!card) break
        state.cards.byId[id] = { ...card, ...patch, version: card.version + 1 }
        broadcastFullState()
        break
      }

      case "DELETE_CARD": {
        const { id } = msg.payload
        if (!state.cards.byId[id]) break
        removeCommentsForCard(id)
        delete state.cards.byId[id]
        state.cards.allIds = state.cards.allIds.filter((x) => x !== id)
        broadcastFullState()
        break
      }

      case "MOVE_CARD": {
        const { cardId, toColumnId, toIndex } = msg.payload
        const card = state.cards.byId[cardId]
        if (!card) break

        const sourceColumnId = card.columnId
        const isSameColumn = sourceColumnId === toColumnId

        if (isSameColumn) {
          const sorted = getColumnCards(sourceColumnId)
          const fromIndex = sorted.findIndex((c) => c.id === cardId)
          if (fromIndex === -1 || fromIndex === toIndex) break
          const reordered = [...sorted]
          const [moved] = reordered.splice(fromIndex, 1)
          reordered.splice(toIndex, 0, moved)
          reindexCards(reordered)
        } else {
          const sourceCards = getColumnCards(sourceColumnId).filter((c) => c.id !== cardId)
          const destCards = getColumnCards(toColumnId)
          state.cards.byId[cardId] = { ...card, columnId: toColumnId }
          const movedCard = state.cards.byId[cardId]
          const clampedIndex = Math.min(toIndex, destCards.length)
          destCards.splice(clampedIndex, 0, movedCard)
          reindexCards(sourceCards)
          reindexCards(destCards)
        }

        state.cards.byId[cardId] = {
          ...state.cards.byId[cardId],
          version: (state.cards.byId[cardId]?.version ?? 0) + 1,
        }
        broadcastFullState()
        break
      }

      case "ADD_COMMENT": {
        const p = msg.payload
        const cardId = p.cardId
        const card = state.cards.byId[cardId]
        if (!card) break
        const parentId = p.parentId ?? null
        if (parentId) {
          const parent = state.comments.byId[parentId]
          if (!parent || parent.cardId !== cardId) break
        }
        const id = typeof p.id === "string" && p.id && !state.comments.byId[p.id] ? p.id : generateId()
        const now = new Date().toISOString()
        const comment: CommentEntity = {
          id,
          cardId,
          parentId,
          author: p.author,
          text: p.text,
          createdAt: now,
          updatedAt: now,
          deleted: false,
        }
        state.comments.byId[id] = comment
        state.comments.allIds.push(id)
        state.cards.byId[cardId] = { ...card, version: card.version + 1 }
        broadcastFullState()
        break
      }

      case "UPDATE_COMMENT": {
        const { id, text } = msg.payload
        const comment = state.comments.byId[id]
        if (!comment || comment.deleted) break
        const card = state.cards.byId[comment.cardId]
        if (!card) break
        const now = new Date().toISOString()
        state.comments.byId[id] = { ...comment, text, updatedAt: now }
        state.cards.byId[comment.cardId] = { ...card, version: card.version + 1 }
        broadcastFullState()
        break
      }

      case "DELETE_COMMENT": {
        const { id } = msg.payload
        const comment = state.comments.byId[id]
        if (!comment || comment.deleted) break
        const card = state.cards.byId[comment.cardId]
        if (!card) break
        const now = new Date().toISOString()
        state.comments.byId[id] = {
          ...comment,
          deleted: true,
          text: "",
          updatedAt: now,
        }
        state.cards.byId[comment.cardId] = { ...card, version: card.version + 1 }
        broadcastFullState()
        break
      }

      default:
        console.warn("[ws-server] unknown message type:", msg.type)
    }
  })

  ws.on("close", () => {
    console.log("[ws-server] client disconnected, total:", wss.clients.size)
  })
})
