import { memo } from "react"
import { Link } from "react-router-dom"

type BoardItemProps = {
  id: string
  title: string
  description: string
  createdAt: string
  onDelete: () => void
}

function BoardItem({ id, title, description, createdAt, onDelete }: BoardItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault()
      onDelete()
    }
  }

  const createdLabel = new Date(createdAt).toLocaleDateString(undefined, {
    dateStyle: "medium",
  })

  return (
    <article
      className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
      aria-labelledby={`board-${id}-title`}
    >
      <Link
        to={`/board/${id}`}
        className="block after:absolute after:inset-0"
        aria-label={`Open board: ${title}`}
      >
        <h2 id={`board-${id}-title`} className="text-lg font-semibold text-slate-900 pr-8">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{description}</p>
        ) : (
          <p className="mt-1 text-sm text-slate-400 italic">No description</p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          <time dateTime={createdAt}>{createdLabel}</time>
        </p>
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        onKeyDown={handleKeyDown}
        className="absolute right-3 top-3 rounded p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 group-hover:opacity-100"
        aria-label={`Delete board: ${title}`}
      >
        <span aria-hidden="true">×</span>
      </button>
    </article>
  )
}

export default memo(BoardItem)
