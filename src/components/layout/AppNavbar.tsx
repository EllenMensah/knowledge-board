import { Link } from "react-router-dom"
import Input from "../ui/Input"

type AppNavbarProps = {
  title?: string
  subtitle?: string
  showSearch?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
}

export default function AppNavbar({
  title = "Collaborative Knowledge Board",
  subtitle,
  showSearch = false,
  searchPlaceholder = "Search…",
  searchValue,
  onSearchChange,
}: AppNavbarProps) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Go to workspace dashboard"
          >
            KB
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {showSearch && onSearchChange && (
            <div className="hidden min-w-[220px] md:block">
              <label htmlFor="navbar-search" className="sr-only">
                {searchPlaceholder}
              </label>
              <Input
                id="navbar-search"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Open profile menu"
          >
            <span className="select-none">ME</span>
          </button>
        </div>
      </div>
    </header>
  )
}

