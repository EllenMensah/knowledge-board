import { memo, useState, useCallback } from "react"
import type { WorkspaceStore } from "../../store"
import { useWorkspaceStore, selectCardById } from "../../store"
import Markdown from "../ui/Markdown"
import Modal from "../ui/Modal"
import Input from "../ui/Input"
import Textarea from "../ui/Textarea"
import Button from "../ui/Button"

type BoardCardProps = {
  cardId: string
}

function BoardCardInner({ cardId }: BoardCardProps) {
  const card = useWorkspaceStore((s: WorkspaceStore) => selectCardById(s, cardId))
  const updateCard = useWorkspaceStore((s: WorkspaceStore) => s.updateCard)
  const deleteCard = useWorkspaceStore((s: WorkspaceStore) => s.deleteCard)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editTags, setEditTags] = useState<string[]>([])
  const [editTagInput, setEditTagInput] = useState("")
  const [editDueDate, setEditDueDate] = useState("")

  const openModal = useCallback(() => {
    if (!card) return
    setEditTitle(card.title)
    setEditDescription(card.description)
    setEditTags([...card.tags])
    setEditDueDate(card.dueDate ? card.dueDate.slice(0, 10) : "")
    setEditTagInput("")
    setIsEditing(false)
    setIsModalOpen(true)
  }, [card])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handleSave = useCallback(() => {
    if (!card) return
    updateCard(cardId, {
      title: editTitle.trim(),
      description: editDescription,
      tags: editTags,
      dueDate: editDueDate ? `${editDueDate}T23:59:59.000Z` : null,
    })
    setIsEditing(false)
  }, [cardId, editTitle, editDescription, editTags, editDueDate, updateCard])

  const handleDelete = useCallback(() => {
    deleteCard(cardId)
    closeModal()
  }, [cardId, deleteCard, closeModal])

  const addTag = useCallback(() => {
    const t = editTagInput.trim()
    if (t && !editTags.includes(t)) {
      setEditTags((prev) => [...prev, t])
      setEditTagInput("")
    }
  }, [editTagInput, editTags])

  const removeTag = useCallback((tag: string) => {
    setEditTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  if (!card) return null

  const dueLabel = card.dueDate
    ? new Date(card.dueDate).toLocaleDateString(undefined, { dateStyle: "short" })
    : null

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="group w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-label={`Open card: ${card.title}`}
      >
        <h3 className="font-medium text-slate-900 line-clamp-2">{card.title}</h3>
        {card.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
            {card.description.replace(/#|\*|_|`/g, "").slice(0, 80)}
            {card.description.length > 80 ? "…" : ""}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {card.tags.slice(0, 3).map((tag: string) => (
            <span
              key={tag}
              className="inline rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 3 && (
            <span className="text-xs text-slate-400">+{card.tags.length - 3}</span>
          )}
          {dueLabel && (
            <span className="text-xs text-slate-500" title="Due date">
              📅 {dueLabel}
            </span>
          )}
        </div>
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit card" : card.title}
        titleId="card-modal-title"
      >
        <div className="mt-4 space-y-4">
          {isEditing ? (
            <>
              <div>
                <label htmlFor="card-edit-title" className="block text-sm font-medium text-slate-700">Title</label>
                <Input
                  id="card-edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1"
                  aria-label="Card title"
                />
              </div>
              <div>
                <label htmlFor="card-edit-desc" className="block text-sm font-medium text-slate-700">Description (Markdown)</label>
                <Textarea
                  id="card-edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={5}
                  className="mt-1 font-mono text-sm"
                  aria-label="Card description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tags</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {editTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-sm text-slate-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded hover:bg-slate-200"
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <span className="flex items-center gap-1">
                    <Input
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="Add tag"
                      className="w-24"
                      aria-label="Add tag"
                    />
                    <Button onClick={addTag}>Add</Button>
                  </span>
                </div>
              </div>
              <div>
                <label htmlFor="card-edit-due" className="block text-sm font-medium text-slate-700">Due date</label>
                <Input
                  id="card-edit-due"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="mt-1"
                  aria-label="Due date"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-medium text-slate-500">Description</h3>
                <div className="mt-1 min-h-8">
                  {card.description ? (
                    <Markdown source={card.description} className="markdown-content" />
                  ) : (
                    <p className="text-slate-400 italic">No description</p>
                  )}
                </div>
              </div>
              {card.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Tags</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {card.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-100 px-2 py-0.5 text-sm text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {card.dueDate && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500">Due date</h3>
                  <p className="mt-1 text-slate-700">
                    <time dateTime={card.dueDate}>
                      {new Date(card.dueDate).toLocaleDateString(undefined, { dateStyle: "long" })}
                    </time>
                  </p>
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                <Button onClick={() => setIsEditing(true)} aria-label="Edit card">
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Delete card"
                >
                  Delete card
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}

const BoardCard = memo(BoardCardInner)
export default BoardCard
