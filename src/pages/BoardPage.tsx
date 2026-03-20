import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useShallow } from "zustand/react/shallow"
import { useWorkspaceStore, selectBoardById, selectColumnsForBoard } from "../store"
import { useCommandHistory } from "../store/historyStore"
import BoardColumn from "../components/board/BoardColumn"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import AppNavbar from "../components/layout/AppNavbar"

export default function BoardPage() {
  const { id: boardId } = useParams<{ id: string }>()
  const [newColumnTitle, setNewColumnTitle] = useState("")
  const [showAddColumn, setShowAddColumn] = useState(false)

  const board = useWorkspaceStore((s) => (boardId ? selectBoardById(s, boardId) : undefined))
  const columns = useWorkspaceStore(useShallow((s) => (boardId ? selectColumnsForBoard(s, boardId) : [])))
  const createColumn = useWorkspaceStore((s) => s.createColumn)
  const undo = useWorkspaceStore((s) => s.undo)
  const redo = useWorkspaceStore((s) => s.redo)
  const canUndo = useCommandHistory((s) => s.past.length > 0)
  const canRedo = useCommandHistory((s) => s.future.length > 0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== "z") return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo])

  const handleAddColumn = useCallback(() => {
    const title = newColumnTitle.trim()
    if (!boardId || !title) return
    createColumn(boardId, { title })
    setNewColumnTitle("")
    setShowAddColumn(false)
  }, [boardId, newColumnTitle, createColumn])

  if (!boardId) {
    return (
      <main className="min-h-screen bg-[#CDCDCD]">
        <AppNavbar subtitle="Board not found" />
        <div className="mx-auto max-w-[1800px] px-6 py-8">
          <p className="text-slate-600">Missing board ID.</p>
        </div>
      </main>
    )
  }

  if (!board) {
    return (
      <main className="min-h-screen bg-[#CDCDCD]">
        <AppNavbar subtitle="Board not found" />
        <div className="mx-auto max-w-[1800px] px-6 py-8">
          <p className="text-slate-600">Board not found.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100" role="main" aria-label={`Board: ${board.title}`}>
      <AppNavbar title={board.title} subtitle={board.description || "Board"} />

      <div className="mx-auto max-w-[1800px] px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Card history</span>
          <button
            type="button"
            onClick={() => undo()}
            disabled={!canUndo}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Undo last card action"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => redo()}
            disabled={!canRedo}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Redo card action"
          >
            Redo
          </button>
          <span className="text-xs text-slate-400">Ctrl+Z / Ctrl+Shift+Z</span>
        </div>
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
