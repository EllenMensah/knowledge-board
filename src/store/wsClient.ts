/**
 * WebSocket client singleton for real-time collaboration.
 *
 * Connects to the WS server, sends mutations, and receives
 * authoritative state updates (FULL_STATE / INIT) to reconcile
 * the local Zustand store via a registered callback (avoids circular imports).
 *
 * Auto-reconnects on disconnect.
 */

import type { WorkspaceState } from "./types"

const WS_URL = "ws://localhost:4000"
const RECONNECT_DELAY_MS = 2000

type ConnectionStatus = "connecting" | "connected" | "disconnected"
type StatusListener = (status: ConnectionStatus) => void

type ServerStateHandler = (state: WorkspaceState, source: "INIT" | "FULL_STATE") => void

let onServerWorkspaceState: ServerStateHandler | null = null

/** Called once from the workspace store module after create(). */
export function registerServerStateHandler(handler: ServerStateHandler): void {
  onServerWorkspaceState = handler
}

let ws: WebSocket | null = null
let statusListeners: StatusListener[] = []
let currentStatus: ConnectionStatus = "disconnected"

function setStatus(s: ConnectionStatus) {
  currentStatus = s
  statusListeners.forEach((fn) => fn(s))
}

export const wsClient = {
  onStatusChange(listener: StatusListener): () => void {
    statusListeners.push(listener)
    listener(currentStatus)
    return () => {
      statusListeners = statusListeners.filter((l) => l !== listener)
    }
  },

  getStatus(): ConnectionStatus {
    return currentStatus
  },

  connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    setStatus("connecting")
    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      console.info("[wsClient] connected")
      setStatus("connected")
    }

    ws.onmessage = (event) => {
      let msg: { type: string; state?: WorkspaceState }
      try {
        msg = JSON.parse(event.data as string)
      } catch {
        return
      }

      if ((msg.type === "INIT" || msg.type === "FULL_STATE") && msg.state && onServerWorkspaceState) {
        onServerWorkspaceState(msg.state, msg.type as "INIT" | "FULL_STATE")
      }
    }

    ws.onclose = () => {
      console.info("[wsClient] disconnected, reconnecting in", RECONNECT_DELAY_MS, "ms")
      setStatus("disconnected")
      ws = null
      setTimeout(() => wsClient.connect(), RECONNECT_DELAY_MS)
    }

    ws.onerror = (err) => {
      console.error("[wsClient] error:", err)
    }
  },

  send(type: string, payload: Record<string, unknown>) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[wsClient] not connected, queuing skipped for:", type)
      return
    }
    ws.send(JSON.stringify({ type, payload }))
  },

  disconnect() {
    if (ws) {
      ws.onclose = null
      ws.close()
      ws = null
      setStatus("disconnected")
    }
  },
}
