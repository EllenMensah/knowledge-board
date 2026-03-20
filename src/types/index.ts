/**
 * Domain entity types for the Collaborative Knowledge Board.
 * Boards, columns, and cards are normalized by id.
 * Comments are normalized in a separate slice (byId + allIds) with parentId for threading.
 */

export interface Board {
  id: string
  title: string
  description: string
  createdAt: string
  version: number
}

export interface Column {
  id: string
  boardId: string
  title: string
  order: number
  version: number
}

/** Flat comment row; tree shape is derived at render time (efficient for large trees). */
export interface Comment {
  id: string
  cardId: string
  /** null = top-level thread root under the card */
  parentId: string | null
  author: string
  text: string
  createdAt: string
  updatedAt: string
  /** Soft delete preserves thread structure and ids for sync */
  deleted: boolean
}

export interface Card {
  id: string
  columnId: string
  title: string
  description: string
  tags: string[]
  dueDate: string | null
  order: number
  version: number
}

export type EntityId = string
