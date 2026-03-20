# Collaboration, comments, and undo/redo

This document covers the three assignment areas: real-time multi-session behavior, threaded comments, and command-history undo/redo.

## 2. Real-time update simulation (WebSocket)

### Transport

- A small Node `ws` server (`server/ws-server.ts`) holds authoritative in-memory state.
- The client opens a WebSocket on load (`App.tsx` → `wsClient.connect()`).
- On connect, the server sends `INIT` with a full snapshot. After every mutation, it broadcasts `FULL_STATE` to all connected clients.
- The Zustand store applies **optimistic updates** first (instant UI), then sends the same intent to the server. When `FULL_STATE` arrives, `setFullState` replaces boards, columns, cards, and comments so every session matches the server.

### Conflict resolution: what if two users edit the same card?

**What wins:** The **last mutation applied on the server** wins for each field, in the sense that the next `FULL_STATE` snapshot is the truth for everyone.

**Why:** The server processes messages **sequentially** in arrival order. There is no merge of concurrent edits at the field level—each `UPDATE_CARD` replaces the prior card row with `{ ...card, ...patch }`. So if User A and User B both change the title, whichever `UPDATE_CARD` reaches the server **second** determines the title all clients see after the following broadcast.

**Reconciliation:** Optimistic UI may briefly show a local value; the next `FULL_STATE` overwrites local state, so all tabs converge to the same data.

### Undo stack vs. broadcasts

- Command history is **cleared on `INIT`** (first load / reconnect).
- It is **not** cleared on every `FULL_STATE`, so undo/redo for card create/delete/move still works after your own action echoes from the server.
- If another user changes the board while you have undo entries, those entries can become **stale** (e.g. undo delete after someone else recreated conflicting state). This is an accepted tradeoff without per-client operational transforms.

---

## 3. Comment system (threaded, normalized)

### Data model

- Comments are **not** nested arrays on `Card`. They live in a normalized slice: `comments.byId` + `comments.allId`.
- Each row has `cardId`, `parentId` (`null` for top-level), `author`, `text`, timestamps, and `deleted` (soft delete).
- **Threading** is derived at render time: `buildCommentChildMap` builds `parentId → child id[]` so React state stays flat and large trees do not deep-clone nested objects.

### Behaviors

- Top-level comments and **nested replies** (unlimited depth; assignment asks for at least two levels—reply-to-reply is supported).
- **Edit** updates `text` and `updatedAt` (`UPDATE_COMMENT` on the wire).
- **Delete** is soft: `deleted: true`, text cleared (`DELETE_COMMENT`).

---

## 4. Undo / redo (command / action history)

### Approach

We use an **action history** (paired undo/redo messages), **not** snapshots of the entire workspace.

- Each user-triggered **card create**, **card delete**, or **card move** pushes one `HistoryEntry`: `{ undo: HistoryMessage, redo: HistoryMessage }`.
- **Undo** pops the last entry from the `past` stack, applies `undo` (optimistic + WebSocket), and moves the entry to `future`.
- **Redo** pops from `future`, applies `redo`, and pushes back to `past`.

Message kinds:

| User action | Undo message | Redo message |
|-------------|--------------|--------------|
| Create card | `DELETE_CARD` | `CREATE_CARD` (full payload, stable client `id`) |
| Delete card | `RESTORE_CARD` (card + all comment rows) | `DELETE_CARD` |
| Move card   | `MOVE_CARD` (back to source column/index) | `MOVE_CARD` (to destination) |

`RESTORE_CARD` re-inserts the card and normalized comments on the server and all clients.

### Why not clone full state?

Copying the whole store on every step is expensive and couples undo to unrelated data. Storing **small inverse commands** keeps memory bounded and matches how collaborative tools often separate “document truth” from “local history.”

### Scope

- Undo/redo applies to **card creation, deletion, and movement** only (as required). Board/column/comment actions are outside this stack.

---

## Running the WebSocket server

From `knowledge-board/`:

```bash
npm install
npm run ws
```

In another terminal:

```bash
npm run dev
```

Open two browser tabs on the same board to verify live card moves, comments, and convergence after edits.
