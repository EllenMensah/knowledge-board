import { useState, useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
import { useWorkspaceStore, selectBoardsList } from "../store"
import BoardItem from "../components/dashboard/BoardItem"
import Input from "../components/ui/Input"
import Button from "../components/ui/Button"
import Modal from "../components/ui/Modal"
import AppNavbar from "../components/layout/AppNavbar"

export default function DashboardPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [search, setSearch] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const boards = useWorkspaceStore(useShallow(selectBoardsList))
  const createBoard = useWorkspaceStore((s) => s.createBoard)
  const deleteBoard = useWorkspaceStore((s) => s.deleteBoard)

  const filteredBoards = boards.filter((board) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      board.title.toLowerCase().includes(q) ||
      board.description.toLowerCase().includes(q)
    )
  })

  const handleCreateBoard = useCallback(() => {
    const t = title.trim()
    if (!t) return
    createBoard({ title: t, description: description.trim() })
    setTitle("")
    setDescription("")
  }, [title, description, createBoard])

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteConfirmId(id)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      deleteBoard(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }, [deleteConfirmId, deleteBoard])

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null)
  }, [])

  return (
    <main className="min-h-screen bg-[#CDCDCD]" role="main" aria-label="Workspace dashboard">
      <AppNavbar
        subtitle="Workspace dashboard"
        showSearch
        searchPlaceholder="Search boards…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="mx-auto max-w-5xl px-6 py-8">

        <section aria-labelledby="create-board-heading" className="mb-10">
          <h2 id="create-board-heading" className="sr-only">
            Create new board
          </h2>
          <div className="flex flex-wrap items-end gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <div className="min-w-0 flex-1 basis-48">
              <label htmlFor="board-title" className="mb-1 block text-sm font-medium text-slate-700">
                Board title
              </label>
              <Input
                id="board-title"
                placeholder="e.g. Product backlog"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Board title"
              />
            </div>
            <div className="min-w-0 flex-1 basis-48">
              <label htmlFor="board-description" className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <Input
                id="board-description"
                placeholder="Short description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-label="Board description"
              />
            </div>
            <Button onClick={handleCreateBoard} aria-label="Create board">
              Create Board
            </Button>
          </div>
        </section>

        <section aria-labelledby="boards-list-heading">
          <h2 id="boards-list-heading" className="mb-4 text-xl font-semibold text-slate-800">
            Your boards
          </h2>
          {filteredBoards.length === 0 ? (
            <p className="rounded-xl bg-white py-12 text-center text-slate-500 shadow-sm ring-1 ring-slate-200/60">
              {boards.length === 0
                ? "No boards yet. Create your first board above."
                : "No boards match your search."}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
              {filteredBoards.map((board) => (
                <li key={board.id}>
                  <BoardItem
                    {...board}
                    onDelete={() => handleDeleteClick(board.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={handleCancelDelete}
        title="Delete board?"
        titleId="delete-board-modal-title"
      >
        <p id="delete-board-description" className="mt-2 text-slate-600">
          This will permanently delete the board and all its columns and cards. This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" onClick={handleCancelDelete}>Cancel</Button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-describedby="delete-board-description"
          >
            Delete board
          </button>
        </div>
      </Modal>
    </main>
  )
}
