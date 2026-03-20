/**
 * Small status badge showing the WebSocket connection state.
 * Rendered in the app shell so users know if real-time sync is active.
 */

import { useState, useEffect } from "react"
import { wsClient } from "../../store/wsClient"

type Status = "connecting" | "connected" | "disconnected"

const labels: Record<Status, string> = {
  connecting: "Connecting…",
  connected: "Live",
  disconnected: "Offline",
}

const colors: Record<Status, string> = {
  connecting: "bg-amber-400",
  connected: "bg-emerald-500",
  disconnected: "bg-red-500",
}

export default function ConnectionStatus() {
  const [status, setStatus] = useState<Status>(wsClient.getStatus())

  useEffect(() => {
    const unsub = wsClient.onStatusChange(setStatus)
    return unsub
  }, [])

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm"
      title={`WebSocket: ${status}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${colors[status]} ${
          status === "connecting" ? "animate-pulse" : ""
        }`}
        aria-hidden="true"
      />
      {labels[status]}
    </span>
  )
}
