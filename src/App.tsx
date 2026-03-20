import { useEffect } from "react"
import Router from "./app/router"
import { wsClient } from "./store/wsClient"

function App() {
  useEffect(() => {
    wsClient.connect()
    return () => wsClient.disconnect()
  }, [])

  return <Router />
}

export default App
