import { useCallback, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import { useWorkspaceStore, selectBoardById, selectColumnsForBoard } from "../store"
import BoardColumn from "../components/board/BoardColumn"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"

export default function BoardPage() {
  const { id: boardId } = useParams<{ id: string }>()
  const [newColumnTitle, setNewColumnTitle] = useState("")
  const [showAddColumn, setShowAddColumn] = useState(false)

  const board = useWorkspaceStore((s) => (boardId ? selectBoardById(s, boardId) : undefined))
  const columns = useWorkspaceStore(useShallow((s) => (boardId ? selectColumnsForBoard(s, boardId) : [])))
  const createColumn = useWorkspaceStore((s) => s.createColumn)

  const handleAddColumn = useCallback(() => {
    const title = newColumnTitle.trim()
    if (!boardId || !title) return
    createColumn(boardId, { title })
    setNewColumnTitle("")
    setShowAddColumn(false)
  }, [boardId, newColumnTitle, createColumn])

  if (!boardId) {
    return (
      <main className="min-h-screen bg-[#CDCDCD] p-8">
        <p className="text-slate-600">Missing board ID.</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Back to dashboard</Link>
      </main>
    )
  }

  if (!board) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <p className="text-slate-600">Board not found.</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Back to dashboard</Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100" role="main" aria-label={`Board: ${board.title}`}>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              to="/"
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Back to workspace dashboard"
            >
              <span aria-hidden="true">←</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-900">{board.title}</h1>
              {board.description && (
                <p className="truncate text-sm text-slate-500">{board.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] px-6 py-6">
        <div className="flex gap-4 overflow-x-auto pb-4" role="list">
          {columns.map((column) => (
            <BoardColumn key={column.id} columnId={column.id} />
          ))}

          {showAddColumn ? (
            <div className="flex h-fit w-72 flex-shrink-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">New column</h2>
              <Input
                placeholder="Column name"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                aria-label="Column name"
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={handleAddColumn}>Add</Button>
                <button
                  type="button"
                  onClick={() => { setShowAddColumn(false); setNewColumnTitle("") }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddColumn(true)}
              className="flex h-fit w-72 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/50 py-8 text-slate-500 transition hover:border-slate-400 hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Add column"
            >
              + Add column
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
