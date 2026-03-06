import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import DashboardPage from "../pages/DashboardPage"

const BoardPage = lazy(() => import("../pages/BoardPage"))

function BoardPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-live="polite">
      <p className="text-slate-500">Loading board…</p>
    </div>
  )
}

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route
          path="/board/:id"
          element={
            <Suspense fallback={<BoardPageFallback />}>
              <BoardPage />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default Router