import { memo, useState, useCallback, useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import type { WorkspaceStore } from "../../store"
import { useWorkspaceStore, selectCardsForColumn } from "../../store"
import type { Card } from "../../types"
import BoardCard from "./BoardCard"
import Button from "../ui/Button"
import Input from "../ui/Input"
import Textarea from "../ui/Textarea"
import Modal from "../ui/Modal"

type BoardColumnProps = {
  columnId: string
}

function BoardColumnInner({ columnId }: BoardColumnProps) {
  const column = useWorkspaceStore((s: WorkspaceStore) => s.columns.byId[columnId])
  const cards = useWorkspaceStore(useShallow((s: WorkspaceStore) => selectCardsForColumn(s, columnId)))
  const updateColumn = useWorkspaceStore((s: WorkspaceStore) => s.updateColumn)
  const deleteColumn = useWorkspaceStore((s: WorkspaceStore) => s.deleteColumn)
  const createCard = useWorkspaceStore((s: WorkspaceStore) => s.createCard)
  const moveCard = useWorkspaceStore((s: WorkspaceStore) => s.moveCard)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(column?.title ?? "")
  const [showCreateCardModal, setShowCreateCardModal] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createTags, setCreateTags] = useState<string[]>([])
  const [createTagInput, setCreateTagInput] = useState("")
  const [createDueDate, setCreateDueDate] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Drag & Drop state
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const cardListRef = useRef<HTMLDivElement>(null)

  const handleSaveTitle = useCallback(() => {
    const t = editTitle.trim()
    if (t && t !== column?.title) {
      updateColumn(columnId, { title: t })
    }
    setIsEditingTitle(false)
  }, [columnId, column?.title, editTitle, updateColumn])

  const handleAddCreateTag = useCallback(() => {
    const t = createTagInput.trim()
    if (t && !createTags.includes(t)) {
      setCreateTags((prev) => [...prev, t])
      setCreateTagInput("")
    }
  }, [createTagInput, createTags])

  const handleRemoveCreateTag = useCallback((tag: string) => {
    setCreateTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleCreateCard = useCallback(() => {
    const title = createTitle.trim()
    if (!title) return
    createCard(columnId, {
      title,
      description: createDescription.trim() || undefined,
      tags: createTags.length > 0 ? createTags : undefined,
      dueDate: createDueDate ? `${createDueDate}T23:59:59.000Z` : null,
    })
    setCreateTitle("")
    setCreateDescription("")
    setCreateTags([])
    setCreateTagInput("")
    setCreateDueDate("")
    setShowCreateCardModal(false)
  }, [columnId, createTitle, createDescription, createTags, createDueDate, createCard])

  const closeCreateCardModal = useCallback(() => {
    setShowCreateCardModal(false)
    setCreateTitle("")
    setCreateDescription("")
    setCreateTags([])
    setCreateTagInput("")
    setCreateDueDate("")
  }, [])

  const handleDeleteColumn = useCallback(() => {
    deleteColumn(columnId)
    setDeleteConfirm(false)
  }, [columnId, deleteColumn])

  /* ─── Drag & Drop handlers ─── */

  /**
   * Computes which gap the cursor is closest to.
   * Returns an index from 0 (before first card) to cards.length (after last card).
   */
  const computeDropIndex = useCallback(
    (clientY: number): number => {
      if (!cardListRef.current) return cards.length

      const cardElements = cardListRef.current.querySelectorAll<HTMLElement>("[data-card-id]")
      if (cardElements.length === 0) return 0

      for (let i = 0; i < cardElements.length; i++) {
        const rect = cardElements[i].getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        if (clientY < midY) return i
      }

      return cardElements.length
    },
    [cards.length]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      setIsDragOver(true)
      setDropIndicatorIndex(computeDropIndex(e.clientY))
    },
    [computeDropIndex]
  )

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if we've truly left the column (not just entered a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropIndicatorIndex(null)
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDropIndicatorIndex(null)
      setIsDragOver(false)

      try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"))
        const { cardId } = data as { cardId: string; columnId: string }
        const dropIndex = computeDropIndex(e.clientY)
        moveCard(cardId, columnId, dropIndex)
      } catch {
        // Invalid drag data — ignore
      }
    },
    [columnId, computeDropIndex, moveCard]
  )

  if (!column) return null

  return (
    <section
      className="flex h-fit w-72 flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80 shadow-sm"
      aria-labelledby={`column-${columnId}-title`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white/80 px-4 py-3 rounded-t-xl">
        {isEditingTitle ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle()
                if (e.key === "Escape") {
                  setEditTitle(column.title)
                  setIsEditingTitle(false)
                }
              }}
              aria-label="Edit column name"
              className="text-sm font-semibold"
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              className="rounded p-1 text-slate-600 hover:bg-slate-200"
              aria-label="Save column name"
            >
              ✓
            </button>
          </div>
        ) : (
          <h2
            id={`column-${columnId}-title`}
            className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800"
          >
            {column.title}
          </h2>
        )}
        <div className="flex items-center gap-1">
          {!isEditingTitle && (
            <button
              type="button"
              onClick={() => { setIsEditingTitle(true); setEditTitle(column.title) }}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              aria-label={`Edit column "${column.title}"`}
            >
              ✎
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete column "${column.title}"`}
          >
            ×
          </button>
        </div>
      </div>

      <div
        ref={cardListRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto p-3 min-h-[120px] transition-colors ${isDragOver ? "bg-blue-50/50" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {cards.map((card: Card, i: number) => (
          <div key={card.id}>
            {dropIndicatorIndex === i && (
              <div className="drop-indicator" />
            )}
            <BoardCard cardId={card.id} />
          </div>
        ))}
        {/* Indicator after the last card */}
        {dropIndicatorIndex === cards.length && (
          <div className="drop-indicator" />
        )}

        {/* Empty state message when dragging over an empty column */}
        {cards.length === 0 && isDragOver && (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-blue-300 py-6 text-sm text-blue-400">
            Drop here
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowCreateCardModal(true)}
          className="rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:border-slate-400 hover:bg-white/60 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Add card"
        >
          + Add card
        </button>
      </div>

      <Modal
        isOpen={showCreateCardModal}
        onClose={closeCreateCardModal}
        title="Create card"
        titleId="create-card-modal-title"
      >
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="create-card-title" className="block text-sm font-medium text-slate-700">Title</label>
            <Input
              id="create-card-title"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Card title"
              className="mt-1"
              aria-label="Card title"
            />
          </div>
          <div>
            <label htmlFor="create-card-desc" className="block text-sm font-medium text-slate-700">Description (Markdown)</label>
            <Textarea
              id="create-card-desc"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Supports **bold**, *italic*, lists, etc."
              rows={4}
              className="mt-1 font-mono text-sm"
              aria-label="Card description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Tags</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {createTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-sm text-slate-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveCreateTag(tag)}
                    className="rounded hover:bg-slate-200"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <span className="flex items-center gap-1">
                <Input
                  value={createTagInput}
                  onChange={(e) => setCreateTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCreateTag())}
                  placeholder="Add tag"
                  className="w-28"
                  aria-label="Add tag"
                />
                <Button type="button" onClick={handleAddCreateTag}>Add</Button>
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="create-card-due" className="block text-sm font-medium text-slate-700">Due date</label>
            <Input
              id="create-card-due"
              type="date"
              value={createDueDate}
              onChange={(e) => setCreateDueDate(e.target.value)}
              className="mt-1"
              aria-label="Due date"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" onClick={closeCreateCardModal}>Cancel</Button>
            <Button type="button" onClick={handleCreateCard}>Create card</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete column?"
        titleId="delete-column-modal"
      >
        <p className="mt-2 text-slate-600">
          This will delete the column &quot;{column.title}&quot; and all cards inside it.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          <button
            type="button"
            onClick={handleDeleteColumn}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </Modal>
    </section>
  )
}

const BoardColumn = memo(BoardColumnInner)
export default BoardColumn
