import { memo, useCallback, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import type { Comment } from "../../types"
import {
  useWorkspaceStore,
  selectAllCommentsForCard,
  buildCommentChildMap,
} from "../../store"
import Button from "../ui/Button"
import Textarea from "../ui/Textarea"
import Input from "../ui/Input"

const AUTHOR_KEY = "kb_comment_author"

function readAuthor(): string {
  try {
    return localStorage.getItem(AUTHOR_KEY)?.trim() || "Guest"
  } catch {
    return "Guest"
  }
}

function writeAuthor(name: string): void {
  try {
    localStorage.setItem(AUTHOR_KEY, name)
  } catch {
    /* ignore */
  }
}

type BranchProps = {
  commentId: string
  cardId: string
  depth: number
  childMap: Map<string | null, string[]>
}

const CommentBranch = memo(function CommentBranch({ commentId, cardId, depth, childMap }: BranchProps) {
  const comment = useWorkspaceStore((s) => s.comments.byId[commentId])
  const addComment = useWorkspaceStore((s) => s.addComment)
  const updateComment = useWorkspaceStore((s) => s.updateComment)
  const deleteComment = useWorkspaceStore((s) => s.deleteComment)

  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState("")

  const children = childMap.get(commentId) ?? []

  const startEdit = useCallback(() => {
    if (!comment || comment.deleted) return
    setEditText(comment.text)
    setEditing(true)
  }, [comment])

  const saveEdit = useCallback(() => {
    if (!comment || comment.deleted) return
    const t = editText.trim()
    if (t) updateComment(comment.id, { text: t })
    setEditing(false)
  }, [comment, editText, updateComment])

  const submitReply = useCallback(() => {
    const t = replyText.trim()
    if (!t) return
    const author = readAuthor()
    addComment(cardId, { author, text: t, parentId: commentId })
    setReplyText("")
    setReplyOpen(false)
  }, [cardId, commentId, replyText, addComment])

  const onDelete = useCallback(() => {
    deleteComment(commentId)
  }, [commentId, deleteComment])

  if (!comment || comment.cardId !== cardId) return null

  const pad = Math.min(depth, 8) * 10

  return (
    <div className="border-l border-slate-200" style={{ paddingLeft: pad > 0 ? pad : 12 }}>
      <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
        {comment.deleted ? (
          <p className="text-sm italic text-slate-400">Comment removed</p>
        ) : editing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="text-sm"
              aria-label="Edit comment"
            />
            <div className="flex gap-2">
              <Button type="button" onClick={saveEdit}>
                Save
              </Button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">{comment.author}</span>
              <time className="text-xs text-slate-400" dateTime={comment.createdAt}>
                {new Date(comment.updatedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
              </time>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{comment.text}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReplyOpen((v) => !v)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Reply
              </button>
              <button type="button" onClick={startEdit} className="text-xs font-medium text-slate-600 hover:underline">
                Edit
              </button>
              <button type="button" onClick={onDelete} className="text-xs font-medium text-red-600 hover:underline">
                Delete
              </button>
            </div>
          </>
        )}

        {replyOpen && !comment.deleted && (
          <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              className="text-sm"
              aria-label="Reply text"
            />
            <div className="flex gap-2">
              <Button type="button" onClick={submitReply}>
                Post reply
              </Button>
              <button
                type="button"
                onClick={() => setReplyOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map((childId) => (
            <CommentBranch
              key={childId}
              commentId={childId}
              cardId={cardId}
              depth={depth + 1}
              childMap={childMap}
            />
          ))}
        </div>
      )}
    </div>
  )
})

type CardCommentsProps = {
  cardId: string
}

function CardCommentsInner({ cardId }: CardCommentsProps) {
  const comments = useWorkspaceStore(
    useShallow((s): Comment[] => selectAllCommentsForCard(s, cardId))
  )
  const addComment = useWorkspaceStore((s) => s.addComment)

  const childMap = useMemo(() => buildCommentChildMap(comments), [comments])
  const rootIds = childMap.get(null) ?? []

  const [authorName, setAuthorName] = useState(readAuthor)
  const [topText, setTopText] = useState("")

  const postTop = useCallback(() => {
    const t = topText.trim()
    if (!t) return
    const author = authorName.trim() || "Guest"
    writeAuthor(author)
    addComment(cardId, { author, text: t, parentId: null })
    setTopText("")
  }, [topText, authorName, cardId, addComment])

  return (
    <section className="border-t border-slate-200 pt-4" aria-label="Comments">
      <h3 className="text-sm font-medium text-slate-500">Comments</h3>
      <p className="mt-1 text-xs text-slate-400">
        Threaded replies (nested). Data lives in a normalized comment map for efficient updates.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor={`comment-author-${cardId}`} className="sr-only">
            Your name
          </label>
          <Input
            id={`comment-author-${cardId}`}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            onBlur={() => writeAuthor(authorName)}
            placeholder="Your name"
            className="text-sm"
            aria-label="Your name"
          />
        </div>
      </div>
      <div className="mt-2">
        <Textarea
          value={topText}
          onChange={(e) => setTopText(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="text-sm"
          aria-label="New comment"
        />
        <Button type="button" className="mt-2" onClick={postTop}>
          Comment
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {rootIds.length === 0 ? (
          <p className="text-sm text-slate-400">No comments yet.</p>
        ) : (
          rootIds.map((rid) => (
            <CommentBranch key={rid} commentId={rid} cardId={cardId} depth={0} childMap={childMap} />
          ))
        )}
      </div>
    </section>
  )
}

const CardComments = memo(CardCommentsInner)
export default CardComments
