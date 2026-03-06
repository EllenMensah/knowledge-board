/**
 * Domain entity types for the Collaborative Knowledge Board.
 * Normalized by id for scalable state and future real-time updates.
 */

export interface Board {
  id: string
  title: string
  description: string
  createdAt: string // ISO date
}

export interface Column {
  id: string
  boardId: string
  title: string
  order: number
}

export interface Card {
  id: string
  columnId: string
  title: string
  description: string // Markdown source
  tags: string[]
  dueDate: string | null // ISO date or null
  order: number
}

export type EntityId = string
