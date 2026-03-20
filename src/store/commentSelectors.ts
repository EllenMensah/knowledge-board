/**
 * Comment thread helpers: flat normalized rows → tree for rendering.
 * Avoids storing nested React state; one memoized map per card is cheap even for large trees.
 */

import type { Comment } from "../types"
import type { WorkspaceState } from "./types"

export type CommentNode = {
  comment: Comment
  childIds: string[]
}

/** All comment rows for a card (including soft-deleted), sorted by createdAt. */
export function selectAllCommentsForCard(state: WorkspaceState, cardId: string): Comment[] {
  return state.comments.allIds
    .map((id) => state.comments.byId[id])
    .filter((c): c is Comment => !!c && c.cardId === cardId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Active comments only (for counts / simple lists). */
export function selectActiveCommentsForCard(state: WorkspaceState, cardId: string): Comment[] {
  return selectAllCommentsForCard(state, cardId).filter((c) => !c.deleted)
}

/**
 * Build adjacency: parentId -> sorted child ids.
 * Keeps soft-deleted nodes in the tree so nested replies stay addressable.
 */
export function buildCommentChildMap(comments: Comment[]): Map<string | null, string[]> {
  const byParent = new Map<string | null, string[]>()
  for (const c of comments) {
    const p = c.parentId
    if (!byParent.has(p)) byParent.set(p, [])
    byParent.get(p)!.push(c.id)
  }
  const idToComment = new Map(comments.map((c) => [c.id, c]))
  for (const [, ids] of byParent) {
    ids.sort((a, b) => {
      const ca = idToComment.get(a)
      const cb = idToComment.get(b)
      return (ca?.createdAt ?? "").localeCompare(cb?.createdAt ?? "")
    })
  }
  return byParent
}

export function selectTopLevelCommentIds(state: WorkspaceState, cardId: string): string[] {
  const list = selectAllCommentsForCard(state, cardId).filter((c) => c.parentId === null)
  return list.map((c) => c.id)
}
