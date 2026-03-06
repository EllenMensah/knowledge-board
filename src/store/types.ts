/**
 * Normalized store shape.
 * Domain state only; UI state (modals, focus) lives in components or a separate slice.
 */

import type { Board, Column, Card } from "../types"

export interface BoardsState {
  byId: Record<string, Board>
  allIds: string[]
}

export interface ColumnsState {
  byId: Record<string, Column>
  allIds: string[]
}

export interface CardsState {
  byId: Record<string, Card>
  allIds: string[]
}

export interface WorkspaceState {
  boards: BoardsState
  columns: ColumnsState
  cards: CardsState
}
