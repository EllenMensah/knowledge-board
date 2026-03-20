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
  const [filter, setFilter] = useState<"az" | "za" | "newest" | "oldest">("newest")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const boards = useWorkspaceStore(useShallow(selectBoardsList))
  const createBoard = useWorkspaceStore((s) => s.createBoard)
  const deleteBoard = useWorkspaceStore((s) => s.deleteBoard)

  // ✅ FILTER + SEARCH + SORT
  const filteredBoards = boards
    .filter((board) => {
      const q = search.trim().toLowerCase()
      if (!q) return true

      return (
        board.title.toLowerCase().includes(q) ||
        board.description.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      switch (filter) {
        case "az":
          return a.title.localeCompare(b.title)

        case "za":
          return b.title.localeCompare(a.title)

        case "newest":
          return (
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
          )

        case "oldest":
          return (
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
          )

        default:
          return 0
      }
    })

  const handleCreateBoard = useCallback(() => {
    const t = title.trim()
    if (!t) return

    createBoard({
      title: t,
      description: description.trim(),
    })

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
    <main
      className="min-h-screen bg-[#CDCDCD]"
      role="main"
      aria-label="Workspace dashboard"
    >
      <AppNavbar
        subtitle="Workspace dashboard"
        showSearch
        searchPlaceholder="Search boards…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="mx-auto max-w-5xl px-6 py-8">

        {/* ✅ CREATE BOARD */}
        <section aria-labelledby="create-board-heading" className="mb-10">
          <h2 id="create-board-heading" className="sr-only">
            Create new board
          </h2>

          <div className="flex flex-wrap items-end gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <div className="min-w-0 flex-1 basis-48">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Board title
              </label>
              <Input
                placeholder="e.g. Product backlog"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="min-w-0 flex-1 basis-48">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <Input
                placeholder="Short description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button onClick={handleCreateBoard}>
              Create Board
            </Button>
          </div>
        </section>

        {/* ✅ HEADER + FILTER */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">
            Your boards
          </h2>

          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "az" | "za" | "newest" | "oldest")
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>

        {/* ✅ BOARD LIST */}
        <section>
          {filteredBoards.length === 0 ? (
            <p className="rounded-xl bg-white py-12 text-center text-slate-500 shadow-sm ring-1 ring-slate-200/60">
              {boards.length === 0
                ? "No boards yet. Create your first board above."
                : "No boards match your search."}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* ✅ DELETE MODAL */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={handleCancelDelete}
        title="Delete board?"
        titleId="delete-board-modal-title"
      >
        <p className="mt-2 text-slate-600">
          This will permanently delete the board and all its columns and cards.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={handleCancelDelete}>Cancel</Button>

          <button
            onClick={handleConfirmDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete board
          </button>
        </div>
      </Modal>
    </main>
  )
}