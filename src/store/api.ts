/**
 * Mock API abstraction layer for persistence.
 *
 * Every mutation in the store calls these helpers so that swapping in a real
 * backend (REST / WebSocket) only requires changing this file.
 *
 * Current implementation: logs to console and returns a resolved promise.
 */

export const api = {
  /**
   * Persist a card move (cross-column or within the same column).
   */
  async moveCard(
    cardId: string,
    toColumnId: string,
    newOrder: number
  ): Promise<void> {
    console.info("[api.moveCard]", { cardId, toColumnId, newOrder })
    // Replace with: await fetch(`/api/cards/${cardId}/move`, { method: "PATCH", body: … })
  },

  /**
   * Persist the full ordering of cards within a column after a reorder.
   */
  async reorderCards(
    columnId: string,
    orderedCardIds: string[]
  ): Promise<void> {
    console.info("[api.reorderCards]", { columnId, orderedCardIds })
    // Replace with: await fetch(`/api/columns/${columnId}/reorder`, { method: "PATCH", body: … })
  },
} as const
