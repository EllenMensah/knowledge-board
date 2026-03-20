# Collaborative Knowledge Board

Production-grade collaborative workspace: boards, columns, and cards with normalized state, WebSocket sync, threaded comments, command-history undo/redo for cards, accessibility, and performance considerations.

**Stack:** React 19, Vite, TypeScript, Tailwind CSS. Drag-and-drop for cards between columns.

**Collaboration / undo / comments:** See [docs/COLLABORATION.md](docs/COLLABORATION.md).

**Real-time server:** In a second terminal run `npm run ws` (requires Node). The Vite app connects to `ws://localhost:4000` on load.

---

## Folder structure

```
src/
├── app/
│   └── router.tsx           # Routes + lazy-loaded Board page
├── components/
│   ├── board/
│   │   ├── BoardCard.tsx     # Card tile + detail/edit modal (markdown, tags, due date)
│   │   └── BoardColumn.tsx   # Column with CRUD, card list, add-card form
│   ├── dashboard/
│   │   └── BoardItem.tsx     # Board list item (link + delete)
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Markdown.tsx      # Renders card description via marked
│       ├── Modal.tsx        # Focus trap, Escape, aria
│       └── Textarea.tsx
├── pages/
│   ├── DashboardPage.tsx     # Board list, create, delete
│   └── BoardPage.tsx         # Single board: columns + add column
├── store/
│   ├── index.ts              # Zustand store + selectors
│   └── types.ts              # Normalized state shape
├── types/
│   └── index.ts              # Board, Column, Card domain types
├── App.tsx
├── main.tsx
└── index.css
```

- **Domain** lives in `types/` and `store/` (normalized entities).
- **UI state** (modals, form values, edit mode) stays in components so the store stays serializable and ready for real-time sync later.
- **Reusable UI** is in `components/ui/`; **feature components** in `board/` and `dashboard/`.

---

## State architecture

### Rationale

- **Normalized store** so we avoid deep nesting and can update a single board/column/card by id without touching the rest of the tree. This scales to real-time (Stage 2): patches can be applied by id.
- **UI state out of the store** so the store is pure domain data and can be synced/serialized; modals and form state stay local.
- **Zustand** for minimal boilerplate, clear selectors, and no prop drilling. One store makes it easy to add persistence or a real-time layer later.

### Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     WorkspaceStore (Zustand)                      │
├─────────────────────────────────────────────────────────────────┤
│  boards:   { byId: Record<id, Board>,   allIds: id[] }           │
│  columns:  { byId: Record<id, Column>,  allIds: id[] }           │
│  cards:    { byId: Record<id, Card>,    allIds: id[] }           │
│  comments: { byId: Record<id, Comment>, allIds: id[] }             │
├─────────────────────────────────────────────────────────────────┤
│  Board    → id, title, description, createdAt                    │
│  Column   → id, boardId, title, order                            │
│  Card     → id, columnId, title, description, tags[], dueDate   │
│  Comment  → id, cardId, parentId, author, text, deleted          │
└─────────────────────────────────────────────────────────────────┘
         │
         │  selectors (no prop drilling)
         ▼
┌──────────────────────┐   ┌──────────────────────┐
│ selectBoardsList()   │   │ selectBoardById()    │
│ selectColumnsForBoard() │ selectCardsForColumn() │
│ selectCardById()     │   │                      │
└──────────────────────┘   └──────────────────────┘
         │
         │  components subscribe via useWorkspaceStore(selector)
         ▼
   DashboardPage, BoardPage, BoardColumn, BoardCard
```

- **Relations:** `Column.boardId` → Board; `Card.columnId` → Column. Delete board cascades to its columns and their cards; delete column cascades to its cards.
- **Order:** `Column.order` and `Card.order` used for deterministic sort when rendering lists.

---

## Performance strategy

1. **Lazy loading**  
   Board page is loaded via `React.lazy(() => import("../pages/BoardPage"))` and wrapped in `<Suspense>`, so the board bundle is split and only fetched when navigating to `/board/:id`.

2. **Memoization**  
   - `BoardItem` and `BoardCard` are wrapped in `memo()` so list re-renders don’t re-render every sibling when one item changes.  
   - Handlers passed to list items (e.g. `onDelete`) are created with `useCallback` in the parent so references stay stable.

3. **Selectors**  
   Components use narrow selectors (e.g. `(s) => selectCardsForColumn(s, columnId)`) so Zustand can skip re-renders when unrelated slices change. Each column subscribes only to its own cards.

4. **Rendering cost**  
   - Markdown is parsed with `marked` inside a `useMemo` keyed by `source` so we don’t re-parse on every render.  
   - Modal content is not mounted when `isOpen` is false.

---

## Key engineering decisions

| Decision | Reason |
|----------|--------|
| **Zustand over Context + useReducer** | Less boilerplate, built-in selector pattern, single store easy to extend with middleware (e.g. persistence, real-time). |
| **Normalized byId + allIds** | Fast lookups by id; easy to apply remote patches; delete cascades are straightforward. |
| **No drag-and-drop in Stage 1** | Per spec; order is still stored (`Column.order`, `Card.order`) so DnD can be added later without changing the model. |
| **Markdown with `marked`** | Lightweight, synchronous API; description is stored as raw markdown and rendered in the card detail view. |
| **Modal: focus trap + Escape** | Meets a11y requirements: keyboard-only users can close and navigate without leaving the dialog. |
| **Semantic HTML + ARIA** | `main`, `section`, `article`, `header`, labels, `aria-label` / `aria-labelledby` where needed for screen readers. |

---

## Accessibility

- **Semantic structure:** `<main>`, `<header>`, `<section>`, `<article>`, `<h1>`–`<h2>` hierarchy, `<time dateTime>` for dates.
- **Modals:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (or `aria-label`), focus moved to first focusable element on open; Tab cycles only inside the dialog; Escape closes.
- **Forms:** `<label>` + `id`/`htmlFor` or `aria-label` on inputs; primary actions are buttons with clear labels.
- **Links/buttons:** Delete and navigation actions have `aria-label` where the visible text isn’t sufficient (e.g. “Delete board: …”).

---

## Run & build

```bash
npm install
npm run ws     # WebSocket server (terminal 1)
npm run dev    # Vite dev server (terminal 2)
npm run build  # production build
npm run preview  # preview production build
```

---

## Deliverables checklist

- [x] Workspace dashboard: list boards, create, delete; title, description, created date per board  
- [x] Board view: create/edit/delete columns; create/edit/delete cards  
- [x] Cards: title, description (markdown), tags (multiple), due date; markdown parsed and rendered  
- [x] Normalized state; UI state separate; scalable for real-time  
- [x] Memoization and code splitting (lazy Board page)  
- [x] Semantic HTML, aria-labels, keyboard modal, focus management  
- [x] Clean layout and spacing (Tailwind, no template-style UI)
